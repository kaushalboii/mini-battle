import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Vehicle, MAX_SPEED } from "../game/racing/Vehicle";
import { FollowCamera } from "../game/racing/Camera";
import { Controls } from "../game/racing/Controls";
import { buildTrack, type TrackData } from "../game/racing/Track";
import { DriftMarks } from "../game/racing/DriftMarks";
import { SmokeTrails } from "../game/racing/Particles";
import { GameAudio } from "../game/racing/Audio";
import { LapTimer, formatLapTime, type LapState } from "../game/racing/LapTimer";
import "../styles/racing.css";

export default function RacingGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lapInfo, setLapInfo] = useState<LapState>({
    lap: 1,
    currentLapTime: 0,
    lastLapTime: null,
    bestLapTime: null,
    isNewBest: false,
    flashColor: null,
  });
  const [speedKmh, setSpeedKmh] = useState(0);
  const [gear, setGear] = useState(1);
  const controlsRef = useRef<Controls | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    let disposed = false;
    let animationFrame = 0;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xadb2ba);
    scene.fog = new THREE.Fog(0xadb2ba, 35, 75);

    const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 300);
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    // 2. Lighting (Sun & Hemisphere Fill)
    const hemiLight = new THREE.HemisphereLight(0xc8d8e8, 0x7a8a5a, 1.25);
    scene.add(hemiLight);

    const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
    sun.position.set(11.4, 20, -5.3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -35;
    sun.shadow.camera.right = 35;
    sun.shadow.camera.top = 35;
    sun.shadow.camera.bottom = -35;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 90;
    sun.shadow.bias = -0.0004;
    scene.add(sun);

    // 3. Track, Vehicle, Camera
    const trackGroup = new THREE.Group();
    scene.add(trackGroup);
    const track: TrackData = buildTrack(trackGroup);

    const vehicle = new Vehicle();
    vehicle.position.set(-6, 0, 30); // Spawn behind finish line
    vehicle.yaw = Math.PI / 2; // Facing east
    scene.add(vehicle.container);

    const followCamera = new FollowCamera(camera);
    const controls = new Controls();
    controlsRef.current = controls;

    const driftMarks = new DriftMarks(scene);
    const particles = new SmokeTrails(scene);

    const audio = new GameAudio();
    const unlockAudio = () => {
      audio.unlock();
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("pointerdown", unlockAudio);
    };
    window.addEventListener("keydown", unlockAudio);
    window.addEventListener("pointerdown", unlockAudio);

    const lapTimer = new LapTimer(track);

    // 4. Resize Handling
    const onResize = () => {
      if (!canvasRef.current) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    // 5. Game Loop
    let lastTime = performance.now();
    let hudTimer = 0;

    const tick = () => {
      if (disposed) return;
      animationFrame = requestAnimationFrame(tick);

      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 1 / 30);
      lastTime = now;

      const input = controls.update();

      // Wall Collisions
      for (const wall of track.walls) {
        if (
          vehicle.position.x >= wall.min.x &&
          vehicle.position.x <= wall.max.x &&
          vehicle.position.z >= wall.min.y &&
          vehicle.position.z <= wall.max.y
        ) {
          // Rebound
          const impactSpeed = Math.abs(vehicle.linearSpeed);
          audio.playImpact(impactSpeed);
          vehicle.linearSpeed = -vehicle.linearSpeed * 0.45;
          vehicle.position.x -= Math.sin(vehicle.yaw) * 0.35;
          vehicle.position.z -= Math.cos(vehicle.yaw) * 0.35;
          break;
        }
      }

      vehicle.update(dt, input);

      // Sun follows vehicle
      sun.position.set(vehicle.position.x + 11.4, 20, vehicle.position.z - 5.3);
      sun.target.position.set(vehicle.position.x, 0, vehicle.position.z);
      sun.target.updateMatrixWorld();

      followCamera.update(dt, vehicle.position, vehicle.modelVelocity);

      // Drift Marks & Smoke Trails
      const wheels = vehicle.getWheelWorldPositions();
      driftMarks.update(wheels.left, wheels.right, vehicle.linearSpeed, vehicle.driftIntensity);
      particles.update(dt, wheels.left, wheels.right, vehicle.driftIntensity);

      // Audio Engine
      audio.update(dt, vehicle.linearSpeed / MAX_SPEED, input.z, vehicle.driftIntensity);

      // Lap Timer
      const hasInput = input.touchActive || Math.abs(input.x) > 0.05 || Math.abs(input.z) > 0.05;
      const currentLapState = lapTimer.update(dt, vehicle.position, hasInput);

      // Update UI 15 times/sec to save React re-renders
      hudTimer += dt;
      if (hudTimer > 0.066) {
        hudTimer = 0;
        setLapInfo({ ...currentLapState });
        setSpeedKmh(Math.round(Math.abs(vehicle.linearSpeed) * 3.6));
        const absSpd = Math.abs(vehicle.linearSpeed) / MAX_SPEED;
        setGear(absSpd < 0.33 ? 1 : absSpd < 0.68 ? 2 : 3);
      }

      renderer.render(scene, camera);
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("pointerdown", unlockAudio);
      controls.destroy();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="racing-root">
      <canvas ref={canvasRef} className="racing-canvas" />

      {/* 2D Lap Timer HUD (Matching PixiJS LapTimer) */}
      <div className="racing-hud">
        <div className="racing-hud-row">
          <span>LAP</span>
          <b>{lapInfo.lap}</b>
        </div>
        <div
          className="racing-current-time"
          style={{ color: lapInfo.flashColor || "#ffffff" }}
        >
          {formatLapTime(lapInfo.currentLapTime)}
        </div>
        <div className="racing-hud-divider" />
        <div className="racing-hud-row">
          <span>LAST</span>
          <b>{formatLapTime(lapInfo.lastLapTime)}</b>
        </div>
        <div className="racing-hud-row">
          <span>BEST</span>
          <b>{formatLapTime(lapInfo.bestLapTime)}</b>
        </div>
      </div>

      {/* Speedometer & Gear */}
      <div className="racing-speedo">
        <div className="racing-speedo-val">
          {speedKmh}
          <small>KM/H</small>
        </div>
        <div className="racing-gear-tag">GEAR {gear}</div>
      </div>

      {/* Desktop Controls Hint */}
      <div className="racing-controls-guide">
        WASD / Arrows to Drive · Space to Drift · Gamepad / Touch Supported
      </div>

      {/* Mobile Touch Controls */}
      <div className="racing-touch-controls">
        <div className="racing-touch-cluster">
          <button
            className="racing-touch-btn"
            onTouchStart={() => {
              if (controlsRef.current) {
                controlsRef.current.touchX = -1;
                controlsRef.current.touchActive = true;
              }
            }}
            onTouchEnd={() => {
              if (controlsRef.current) {
                controlsRef.current.touchX = 0;
                controlsRef.current.touchActive = false;
              }
            }}
          >
            ◀
          </button>
          <button
            className="racing-touch-btn"
            onTouchStart={() => {
              if (controlsRef.current) {
                controlsRef.current.touchX = 1;
                controlsRef.current.touchActive = true;
              }
            }}
            onTouchEnd={() => {
              if (controlsRef.current) {
                controlsRef.current.touchX = 0;
                controlsRef.current.touchActive = false;
              }
            }}
          >
            ▶
          </button>
        </div>

        <div className="racing-touch-cluster">
          <button
            className="racing-touch-btn racing-touch-btn-drift"
            onTouchStart={() => {
              if (controlsRef.current) controlsRef.current.touchDrift = true;
            }}
            onTouchEnd={() => {
              if (controlsRef.current) controlsRef.current.touchDrift = false;
            }}
          >
            DRIFT
          </button>
          <button
            className="racing-touch-btn"
            onTouchStart={() => {
              if (controlsRef.current) {
                controlsRef.current.touchZ = -1;
                controlsRef.current.touchActive = true;
              }
            }}
            onTouchEnd={() => {
              if (controlsRef.current) {
                controlsRef.current.touchZ = 0;
                controlsRef.current.touchActive = false;
              }
            }}
          >
            BRAKE
          </button>
          <button
            className="racing-touch-btn"
            style={{ background: "rgba(42, 157, 143, 0.7)" }}
            onTouchStart={() => {
              if (controlsRef.current) {
                controlsRef.current.touchZ = 1;
                controlsRef.current.touchActive = true;
              }
            }}
            onTouchEnd={() => {
              if (controlsRef.current) {
                controlsRef.current.touchZ = 0;
                controlsRef.current.touchActive = false;
              }
            }}
          >
            GAS
          </button>
        </div>
      </div>
    </div>
  );
}
