import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { WorldScene } from "./scene";
import { Player } from "./entities/player";
import { EnemyFleet } from "./entities/enemy";
import { Projectile } from "./entities/projectile";
import { ParticleSystem } from "./fx/particles";
import { sound } from "./audio";
import "./styles.css";

type GameState =
  | "PLAYER_AIM"
  | "CHARGING"
  | "PROJECTILE_FLIGHT"
  | "RESOLVING"
  | "ENEMY_AIM"
  | "ENEMY_FLIGHT"
  | "ROUND_WON"
  | "GAME_OVER";

type WeaponType = "coconut" | "pineapple" | "watermelon";

interface EnemyData {
  id: string;
  name: string;
  mesh: THREE.Group;
  hp: number;
  maxHp: number;
  hitboxRadius: number;
  hitboxCenter: THREE.Vector3;
  hpCanvas?: HTMLCanvasElement;
  hpCtx?: CanvasRenderingContext2D;
  hpTexture?: THREE.CanvasTexture;
  hpSprite?: THREE.Sprite;
}

interface ProjectileResult {
  state: "inactive" | "flying" | "water_impact" | "split";
  position?: THREE.Vector3;
  isPlayerShot?: boolean;
  damage?: number;
  blastRadius?: number;
}

export default function KrakenQuay() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState>("PLAYER_AIM");
  const [round, setRound] = useState(1);
  const [maxRounds] = useState(3);
  const [wind, setWind] = useState({ x: 0, z: 0, speed: 0, direction: "" });
  const [currentWeapon, setCurrentWeapon] = useState<WeaponType>("coconut");
  const [ammo, setAmmo] = useState<Record<WeaponType, number>>({
    coconut: Infinity,
    pineapple: 3,
    watermelon: 2,
  });
  const [playerHp, setPlayerHp] = useState(100);
  const [playerMaxHp] = useState(100);
  const [enemyHp, setEnemyHp] = useState(80);
  const [enemyMaxHp, setEnemyMaxHp] = useState(80);
  const [enemyName, setEnemyName] = useState("");
  const [shotsFired, setShotsFired] = useState(0);
  const [hitsLanded, setHitsLanded] = useState(0);
  const [score, setScore] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [power, setPower] = useState(65);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<{
    icon: string;
    title: string;
    desc: string;
    btnText: string;
  } | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; text: string; color: string }>>([]);

  // Game instances
  const worldRef = useRef<WorldScene | null>(null);
  const playerRef = useRef<Player | null>(null);
  const enemyFleetRef = useRef<EnemyFleet | null>(null);
  const fxRef = useRef<ParticleSystem | null>(null);
  const activeProjectilesRef = useRef<Projectile[]>([]);
  const camTrackingTargetRef = useRef<Projectile | null>(null);
  const shakeIntensityRef = useRef(0);
  const chargeDirRef = useRef(1);
  const isPointerDraggingRef = useRef(false);
  const previousPointerPosRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number>(0);
  const toastIdRef = useRef(0);

  const roundNames = ["SCOUT SKIFF", "TWIN CORSAIR", "DREAD BOSS"];

  // Generate wind
  const generateWind = useCallback(() => {
    const zWind = (Math.random() - 0.5) * 6.0;
    const speed = Math.abs(zWind).toFixed(1);
    const arrow = zWind >= 0 ? "➔ (South)" : "⬅ (North)";
    setWind({ x: 0, z: zWind, speed: parseFloat(speed), direction: arrow });
  }, []);

  // Show toast
  const showToast = useCallback((text: string, color = "#ffffff") => {
    const id = toastIdRef.current++;
    setToasts((prev) => [...prev, { id, text, color }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 1300);
  }, []);

  // Trigger camera shake
  const triggerCameraShake = useCallback((amount: number) => {
    shakeIntensityRef.current = Math.max(shakeIntensityRef.current, amount);
  }, []);

  // Update health UI
  const updateHealthUI = useCallback(() => {
    if (playerRef.current) {
      setPlayerHp(playerRef.current.hp);
    }
    if (enemyFleetRef.current && enemyFleetRef.current.enemies.length > 0) {
      const enemy = enemyFleetRef.current.enemies[0];
      setEnemyHp(enemy.hp);
      setEnemyMaxHp(enemy.maxHp);
      setEnemyName(enemy.name.toUpperCase());
    }
  }, []);

  // Update ammo UI
  const updateAmmoUI = useCallback(() => {
    setAmmo((prev) => ({ ...prev }));
  }, []);

  // Start round
  const startRound = useCallback((roundNumber: number) => {
    setRound(roundNumber);
    if (enemyFleetRef.current) {
      enemyFleetRef.current.setupRound(roundNumber);
    }
    if (playerRef.current) {
      playerRef.current.reset();
    }
    generateWind();

    activeProjectilesRef.current = [];
    camTrackingTargetRef.current = null;

    setAmmo({ coconut: Infinity, pineapple: 3, watermelon: 2 });
    setGameState("PLAYER_AIM");
    setIsCharging(false);

    setEnemyName(roundNames[roundNumber - 1]);
    updateHealthUI();
    showToast(`ROUND ${roundNumber} START!`, "#00d2ff");
  }, [generateWind, updateHealthUI, showToast]);

  // Reset game
  const resetGame = useCallback(() => {
    setShowModal(false);
    setModalData(null);
    setShotsFired(0);
    setHitsLanded(0);
    setScore(0);
    startRound(1);
  }, [startRound]);

  // Set turn
  const setTurn = useCallback((turn: "PLAYER" | "ENEMY") => {
    if (turn === "PLAYER") {
      setGameState("PLAYER_AIM");
      setIsCharging(false);
      if (playerRef.current) playerRef.current.setTrajectoryVisible(true);
      camTrackingTargetRef.current = null;
    } else {
      setGameState("ENEMY_AIM");
      if (playerRef.current) playerRef.current.setTrajectoryVisible(false);
      setTimeout(() => {
        executeEnemyTurn();
      }, 1400);
    }
  }, []);

  // Player fires weapon
  const firePlayerWeapon = useCallback(() => {
    if (gameState !== "PLAYER_AIM" && gameState !== "CHARGING") return;
    if (ammo[currentWeapon] <= 0) {
      showToast("Out of ammo!", "#ff7675");
      setCurrentWeapon("coconut");
      return;
    }

    if (currentWeapon !== "coconut") {
      setAmmo((prev) => ({ ...prev, [currentWeapon]: prev[currentWeapon] - 1 }));
    }

    setGameState("PROJECTILE_FLIGHT");
    setIsCharging(false);
    setShotsFired((prev) => prev + 1);
    if (playerRef.current) playerRef.current.setTrajectoryVisible(false);

    const muzzlePos = playerRef.current?.getMuzzleWorldPosition();
    const velocity = playerRef.current?.getLaunchVelocity();

    if (!muzzlePos || !velocity) return;

    if (fxRef.current) fxRef.current.createMuzzleFlash(muzzlePos, velocity.clone().normalize());
    if (playerRef.current) playerRef.current.applyRecoil();
    sound.playCannonFire();
    triggerCameraShake(0.35);

    const proj = new Projectile(
      worldRef.current!.scene,
      worldRef.current!,
      currentWeapon,
      muzzlePos,
      velocity,
      true
    );

    activeProjectilesRef.current.push(proj);
    camTrackingTargetRef.current = proj;
  }, [gameState, currentWeapon, ammo, showToast, triggerCameraShake]);

  // Enemy AI turn
  const executeEnemyTurn = useCallback(() => {
    if (!playerRef.current || !enemyFleetRef.current || enemyFleetRef.current.enemies.length === 0) return;

    const targetPos = playerRef.current.position.clone();
    const shotData = enemyFleetRef.current.calculateAIShot(targetPos, new THREE.Vector3(wind.x, 0, wind.z));

    if (fxRef.current) fxRef.current.createMuzzleFlash(shotData.origin, shotData.velocity.clone().normalize());
    sound.playCannonFire();
    triggerCameraShake(0.3);

    const proj = new Projectile(
      worldRef.current!.scene,
      worldRef.current!,
      "enemy_ball",
      shotData.origin,
      shotData.velocity,
      false
    );

    activeProjectilesRef.current.push(proj);
    camTrackingTargetRef.current = proj;
    setGameState("ENEMY_FLIGHT");
  }, [wind, triggerCameraShake]);

  // Handle watermelon split
  const splitWatermelon = useCallback((pos: THREE.Vector3, vel: THREE.Vector3) => {
    sound.playSplitSound();
    for (let i = -1; i <= 1; i++) {
      const spreadVel = vel.clone();
      spreadVel.z += i * 3.5;
      spreadVel.x += (Math.random() - 0.5) * 2;
      const sub = new Projectile(
        worldRef.current!.scene,
        worldRef.current!,
        "watermelon",
        pos.clone(),
        spreadVel,
        true
      );
      sub.hasSplit = true;
      activeProjectilesRef.current.push(sub);
    }
  }, []);

  // Resolve impact
  const resolveImpact = useCallback((result: ProjectileResult, proj: Projectile) => {
    const impactPos = result.position!;

    if (result.isPlayerShot) {
      let hit = false;
      const enemy = enemyFleetRef.current?.enemies[0];

      if (enemy) {
        const dist = impactPos.distanceTo(enemy.hitboxCenter);
        if (dist <= enemy.hitboxRadius + (result.blastRadius || 0)) {
          hit = true;
          setHitsLanded((prev) => prev + 1);

          const isCritical = dist < enemy.hitboxRadius * 0.45;
          const finalDamage = Math.round((result.damage || 0) * (isCritical ? 1.5 : 1.0));

          if (fxRef.current) fxRef.current.createExplosion(impactPos, isCritical);
          sound.playImpactHit(isCritical);
          triggerCameraShake(isCritical ? 0.7 : 0.45);

          enemyFleetRef.current?.takeDamage(finalDamage, impactPos);
          updateHealthUI();

          const toastText = isCritical ? `💥 CRITICAL HIT! -${finalDamage}` : `🎯 HIT! -${finalDamage}`;
          showToast(toastText, isCritical ? "#ff1744" : "#ffea00");
          setScore((prev) => prev + (isCritical ? 250 : 150));

          if (enemy.hp <= 0) {
            setTimeout(() => handleRoundWon(), 1200);
            return;
          }
        }
      }

      if (!hit) {
        if (fxRef.current) fxRef.current.createWaterSplash(impactPos);
        sound.playWaterSplash();
        showToast("💦 SPLASH MISS!", "#48dbfb");
      }

      setTimeout(() => {
        if (gameState !== "ROUND_WON") {
          generateWind();
          setTurn("ENEMY");
        }
      }, 1600);
    } else {
      if (!playerRef.current) return;
      const dist = impactPos.distanceTo(playerRef.current.position);
      if (dist <= 3.8 + (result.blastRadius || 0)) {
        const isDead = playerRef.current.takeDamage(result.damage || 0);
        if (fxRef.current) fxRef.current.createExplosion(impactPos, true);
        sound.playImpactHit(true);
        triggerCameraShake(0.65);
        updateHealthUI();
        showToast(`💥 YOU WERE HIT! -${result.damage}`, "#ff4d4d");

        if (isDead) {
          setTimeout(() => handleGameOver(), 1200);
          return;
        }
      } else {
        if (fxRef.current) fxRef.current.createWaterSplash(impactPos);
        sound.playWaterSplash();
        showToast("🛡️ PIRATE SHOT MISSED!", "#00e676");
      }

      setTimeout(() => {
        if (gameState !== "GAME_OVER") {
          generateWind();
          setTurn("PLAYER");
        }
      }, 1600);
    }
  }, [gameState, generateWind, setTurn, updateHealthUI, showToast, triggerCameraShake]);

  // Handle round won
  const handleRoundWon = useCallback(() => {
    setGameState("ROUND_WON");
    sound.playVictory();
    triggerCameraShake(0.5);

    const accuracy = shotsFired > 0 ? Math.round((hitsLanded / shotsFired) * 100) : 100;

    if (round < maxRounds) {
      setModalData({
        icon: "🏆",
        title: `ROUND ${round} CLEARED!`,
        desc: "The pirate vessel was destroyed! Prepare for an escalating challenge in the next reef!",
        btnText: `CONTINUE TO ROUND ${round + 1} ➔`,
      });
    } else {
      setModalData({
        icon: "👑",
        title: "TREASURE REEF LIBERATED!",
        desc: "Captain Dread-Beard and his entire pirate fleet have been sent to the ocean depths! You are the champion of the reef!",
        btnText: "PLAY AGAIN 🔄",
      });
    }
    setShowModal(true);
  }, [round, maxRounds, shotsFired, hitsLanded, triggerCameraShake]);

  // Handle game over
  const handleGameOver = useCallback(() => {
    setGameState("GAME_OVER");
    sound.playDefeat();
    triggerCameraShake(0.8);

    const accuracy = shotsFired > 0 ? Math.round((hitsLanded / shotsFired) * 100) : 0;

    setModalData({
      icon: "💀",
      title: "YOUR RAFT WAS SUNK!",
      desc: "The pirate cannons breached your float tube. The tropical reef has fallen to the pirates!",
      btnText: "TRY AGAIN 🔄",
    });
    setShowModal(true);
  }, [shotsFired, hitsLanded, triggerCameraShake]);

  // Modal action
  const handleModalNext = useCallback(() => {
    setShowModal(false);
    setModalData(null);
    if (round < maxRounds) {
      startRound(round + 1);
    } else {
      resetGame();
    }
  }, [round, maxRounds, startRound, resetGame]);

  // Camera update
  const updateCamera = useCallback((delta: number) => {
    if (!worldRef.current) return;
    const cam = worldRef.current.camera;

    if (camTrackingTargetRef.current && camTrackingTargetRef.current.active) {
      const projPos = camTrackingTargetRef.current.position;
      const targetCamPos = projPos.clone().add(new THREE.Vector3(-14, 7, 0));
      cam.position.lerp(targetCamPos, delta * 5.0);
      cam.lookAt(projPos.clone().add(new THREE.Vector3(6, 0, 0)));
    } else {
      cam.position.lerp(worldRef.current.defaultCamPos, delta * 3.5);
      cam.lookAt(worldRef.current.defaultLookTarget);
    }

    if (shakeIntensityRef.current > 0) {
      const shakeOffset = new THREE.Vector3(
        (Math.random() - 0.5) * shakeIntensityRef.current,
        (Math.random() - 0.5) * shakeIntensityRef.current,
        (Math.random() - 0.5) * shakeIntensityRef.current
      );
      cam.position.add(shakeOffset);
      shakeIntensityRef.current = Math.max(0, shakeIntensityRef.current - delta * 4.5);
    }
  }, []);

  // Main animation loop
  const animate = useCallback(() => {
    animationFrameRef.current = requestAnimationFrame(animate);

    if (!worldRef.current) return;
    const delta = Math.min(worldRef.current.clock.getDelta(), 0.1);
    const time = worldRef.current.clock.getElapsedTime();

    // Power meter charge update
    if (isCharging && gameState === "CHARGING") {
      const newPower = power + chargeDirRef.current * 75 * delta;
      if (newPower >= 100) {
        setPower(100);
        chargeDirRef.current = -1;
      } else if (newPower <= 15) {
        setPower(15);
        chargeDirRef.current = 1;
      } else {
        setPower(newPower);
      }
      sound.playChargeTick((power / 100));
    }

    // Update entities & water
    worldRef.current.updateWater(time);
    worldRef.current.updateClouds(delta);
    playerRef.current?.update(time, delta, new THREE.Vector3(wind.x, 0, wind.z));
    enemyFleetRef.current?.update(time, delta);
    fxRef.current?.update(delta);

    // Update active projectiles
    for (let i = activeProjectilesRef.current.length - 1; i >= 0; i--) {
      const p = activeProjectilesRef.current[i];
      const result = p.update(delta, new THREE.Vector3(wind.x, 0, wind.z), splitWatermelon);

      if (result.state === "water_impact") {
        p.destroy();
        activeProjectilesRef.current.splice(i, 1);
        resolveImpact(result, p);
      } else if (result.state === "split") {
        activeProjectilesRef.current.splice(i, 1);
      }
    }

    // Update camera
    updateCamera(delta);

    // Render Scene
    worldRef.current.renderer.render(worldRef.current.scene, worldRef.current.camera);
  }, [gameState, isCharging, power, wind, splitWatermelon, resolveImpact, updateCamera]);

  // Start charging
  const startCharge = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    sound.ensureContext();
    if (gameState !== "PLAYER_AIM") return;
    setIsCharging(true);
    setGameState("CHARGING");
  }, [gameState]);

  // Release charge
  const releaseCharge = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (gameState === "CHARGING") {
      setIsCharging(false);
      firePlayerWeapon();
    }
  }, [gameState, firePlayerWeapon]);

  // Canvas drag to aim
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isPointerDraggingRef.current = true;
    previousPointerPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    isPointerDraggingRef.current = true;
    const touch = e.touches[0];
    previousPointerPosRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPointerDraggingRef.current || gameState !== "PLAYER_AIM") return;
    if (!playerRef.current) return;
    const dx = e.clientX - previousPointerPosRef.current.x;
    const dy = e.clientY - previousPointerPosRef.current.y;

    playerRef.current.yaw = THREE.MathUtils.clamp(playerRef.current.yaw - dx * 0.25, -35, 35);
    playerRef.current.elevation = THREE.MathUtils.clamp(playerRef.current.elevation - dy * 0.2, 12, 65);

    previousPointerPosRef.current = { x: e.clientX, y: e.clientY };
  }, [gameState]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPointerDraggingRef.current || gameState !== "PLAYER_AIM") return;
    if (!playerRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - previousPointerPosRef.current.x;
    const dy = touch.clientY - previousPointerPosRef.current.y;

    playerRef.current.yaw = THREE.MathUtils.clamp(playerRef.current.yaw - dx * 0.25, -35, 35);
    playerRef.current.elevation = THREE.MathUtils.clamp(playerRef.current.elevation - dy * 0.2, 12, 65);

    previousPointerPosRef.current = { x: touch.clientX, y: touch.clientY };
  }, [gameState]);

  const onMouseUp = useCallback(() => {
    isPointerDraggingRef.current = false;
  }, []);

  const onTouchEnd = useCallback(() => {
    isPointerDraggingRef.current = false;
  }, []);

  // Initialize game
  useEffect(() => {
    if (!containerRef.current) return;

    sound.ensureContext();

    worldRef.current = new WorldScene(containerRef.current);
    fxRef.current = new ParticleSystem(worldRef.current.scene);
    playerRef.current = new Player(worldRef.current.scene, worldRef.current);
    enemyFleetRef.current = new EnemyFleet(worldRef.current.scene, worldRef.current);

    startRound(1);

    // Global mouse up for drag and charge release
    const handleMouseUp = (e: MouseEvent) => {
      onMouseUp();
      if (gameState === "CHARGING") {
        releaseCharge(e as any);
      }
    };
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchend", handleMouseUp as any);

    animate();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchend", handleMouseUp as any);
      worldRef.current?.renderer.dispose();
      fxRef.current?.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Weapon select
  const selectWeapon = (weapon: WeaponType) => {
    if (ammo[weapon] > 0) {
      setCurrentWeapon(weapon);
      sound.ensureContext();
    } else {
      showToast("Out of ammo for this weapon!", "#ff7675");
    }
  };

  return (
    <div className="krakens-quay" ref={containerRef}>
      {/* Top Bar */}
      <header className="kq-topbar">
        <div className="kq-title">KRAKEN'S QUAY: SPLASH & SHOT</div>
        <div className="kq-round-badge">ROUND {round}/{maxRounds}: {roundNames[round - 1]}</div>
        <button className="kq-btn-sound" onClick={() => {
          const muted = sound.toggleMute();
          showToast(muted ? "Muted" : "Unmuted");
        }}>
          {sound.muted ? "🔇" : "🔊"}
        </button>
        <button className="kq-btn-restart" onClick={resetGame}>↻</button>
      </header>

      {/* Wind Indicator */}
      <div className="kq-wind">
        <span>WIND: {wind.speed} m/s {wind.direction}</span>
      </div>

      {/* Turn Banner */}
      <div className={`kq-turn-banner ${gameState === "PLAYER_AIM" || gameState === "CHARGING" ? "player-turn" : "enemy-turn"}`}>
        <span className="kq-turn-text">
          {gameState === "PLAYER_AIM" ? "YOUR TURN: AIM & FIRE" :
           gameState === "CHARGING" ? "CHARGING CANNON..." :
           gameState === "ENEMY_AIM" ? "PIRATES AIMING CANNON..." :
           gameState === "ENEMY_FLIGHT" ? "INCOMING FIRE!" :
           "RESOLVING..."}
        </span>
      </div>

      {/* Health Bars */}
      <div className="kq-health-bars">
        <div className="kq-health player">
          <div className="kq-health-label">HERO</div>
          <div className="kq-health-track">
            <div className="kq-health-fill" style={{ width: `${Math.max(0, (playerHp / playerMaxHp) * 100)}%` }} />
          </div>
          <div className="kq-health-value">{Math.round(playerHp)} / {playerMaxHp}</div>
        </div>
        <div className="kq-health enemy">
          <div className="kq-health-label">🏴‍☠️ {enemyName}</div>
          <div className="kq-health-track">
            <div className="kq-health-fill" style={{ width: `${Math.max(0, (enemyHp / enemyMaxHp) * 100)}%` }} />
          </div>
          <div className="kq-health-value">{Math.round(enemyHp)} / {enemyMaxHp}</div>
        </div>
      </div>

      {/* Aim Controls */}
      <div className="kq-aim-controls">
        <div className="kq-control-group">
          <label>ELEVATION <span id="val-elevation">{Math.round(playerRef.current?.elevation || 32)}°</span></label>
          <input
            type="range"
            id="slider-elevation"
            min="12"
            max="65"
            value={playerRef.current?.elevation || 32}
            onChange={(e) => { if (playerRef.current) playerRef.current.elevation = parseFloat(e.target.value); }}
            disabled={gameState !== "PLAYER_AIM" && gameState !== "CHARGING"}
          />
        </div>
        <div className="kq-control-group">
          <label>YAW <span id="val-yaw">{Math.round(playerRef.current?.yaw || 0)}°</span></label>
          <input
            type="range"
            id="slider-yaw"
            min="-35"
            max="35"
            value={playerRef.current?.yaw || 0}
            onChange={(e) => { if (playerRef.current) playerRef.current.yaw = parseFloat(e.target.value); }}
            disabled={gameState !== "PLAYER_AIM" && gameState !== "CHARGING"}
          />
        </div>
      </div>

      {/* Weapon Selector */}
      <div className="kq-weapon-selector">
        <button
          className={`kq-weapon-btn ${currentWeapon === "coconut" ? "active" : ""}`}
          onClick={() => selectWeapon("coconut")}
          disabled={gameState !== "PLAYER_AIM" && gameState !== "CHARGING"}
        >
          <span className="kq-weapon-icon">🥥</span>
          <span>COCONUT</span>
          <span className="kq-ammo-count">∞</span>
        </button>
        <button
          className={`kq-weapon-btn ${currentWeapon === "pineapple" ? "active" : ""}`}
          onClick={() => selectWeapon("pineapple")}
          disabled={gameState !== "PLAYER_AIM" && gameState !== "CHARGING" || ammo.pineapple <= 0}
        >
          <span className="kq-weapon-icon">🍍</span>
          <span>PINEAPPLE BOMB</span>
          <span className="kq-ammo-count">{ammo.pineapple}</span>
        </button>
        <button
          className={`kq-weapon-btn ${currentWeapon === "watermelon" ? "active" : ""}`}
          onClick={() => selectWeapon("watermelon")}
          disabled={gameState !== "PLAYER_AIM" && gameState !== "CHARGING" || ammo.watermelon <= 0}
        >
          <span className="kq-weapon-icon">🍉</span>
          <span>WATERMELON SPLIT</span>
          <span className="kq-ammo-count">{ammo.watermelon}</span>
        </button>
      </div>

      {/* Power Meter & Fire Button */}
      <div className="kq-fire-section">
        <div className="kq-power-meter">
          <div className="kq-power-label">POWER <span id="power-val">{Math.round(power)}%</span></div>
          <div className="kq-power-bar">
            <div className="kq-power-fill" style={{ width: `${power}%` }} />
          </div>
        </div>
        <button
          id="btn-fire"
          className={`kq-btn-fire ${isCharging ? "charging" : ""}`}
          onMouseDown={startCharge}
          onTouchStart={startCharge}
          onMouseUp={releaseCharge}
          onTouchEnd={releaseCharge}
          disabled={gameState !== "PLAYER_AIM" && gameState !== "CHARGING"}
        >
          {isCharging ? "⚡ CHARGING..." : "🚀 HOLD TO FIRE"}
        </button>
      </div>

      {/* Canvas for 3D drag-to-aim */}
      <div
        className="kq-canvas-area"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Three.js canvas is appended here by WorldScene */}
      </div>

      {/* Toasts */}
      <div className="kq-toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className="kq-toast" style={{ color: toast.color }}>
            {toast.text}
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && modalData && (
        <div className="kq-modal-overlay" onClick={handleModalNext}>
          <div className="kq-modal" onClick={(e) => e.stopPropagation()}>
            <div className="kq-modal-icon">{modalData.icon}</div>
            <h2 className="kq-modal-title">{modalData.title}</h2>
            <p className="kq-modal-desc">{modalData.desc}</p>
            <div className="kq-modal-stats">
              <div>Shots Fired: <strong>{shotsFired}</strong></div>
              <div>Accuracy: <strong>{shotsFired > 0 ? Math.round((hitsLanded / shotsFired) * 100) : 100}%</strong></div>
              <div>Score: <strong>{score + (gameState === "ROUND_WON" && round < maxRounds ? round * 500 : 0)}</strong></div>
            </div>
            <button className="kq-btn-modal-next" onClick={handleModalNext}>
              {modalData.btnText}
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="kq-instructions">
        <small>Drag on 3D view to aim · Hold FIRE to charge power · Release to shoot · Coconut: basic · Pineapple: explosive · Watermelon: splits mid-air</small>
      </div>
    </div>
  );
}