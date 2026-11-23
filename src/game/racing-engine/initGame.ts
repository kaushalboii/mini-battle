/**
 * RevSector 3D - Bespoke Three.js Real-Time Circuit Racing Engine
 * Full WebGL 3D simulator featuring procedural Formula 1 racecars, 2km curved asphalt circuits,
 * dynamic Xenon headlights, FIA rear brake lights, car-to-car crash physics, and zero-connect multiplayer.
 * Engineered and authored entirely by Kaushal.
 */

import * as THREE from 'three';
import { createProceduralF1Car, type CarInstance } from './ProceduralCar';
import { buildProceduralTrack, type GeneratedTrack, CIRCUITS_METADATA } from './TrackGenerator';
import { VehicleController } from './VehicleController';
import { RivalManager, type GridStanding } from './RivalManager';
import { EngineAudio } from './EngineAudio';
import { CrashFX } from './CrashFX';

export interface TelemetryData {
  speedKmh: number;
  gear: number | string;
  rpm: number;
  nitro: number;
  isBoosting: boolean;
  driftIntensity: number;
  currentDriftPoints: number;
  totalDriftScore: number;
  lap: number;
  currentLapTime: number;
  lastLapTime: number | null;
  bestLapTime: number | null;
  isFlash: boolean;
  isNewBest: boolean;
  sector: number;
  trackProgress: number;
  standings?: GridStanding[];
  circuitId?: string;
  circuit?: any;
  isPracticeMode?: boolean;
  livePeersCount?: number;
}

export interface GameInstance {
  setVehicleColor: (colorKey: string) => void;
  setDriverName: (name: string) => void;
  setCircuit: (circuitId: string) => void;
  setPracticeMode: (active: boolean) => void;
  setCameraMode: (mode: string) => void;
  cycleCameraMode: () => string;
  setLightingTheme: (theme: 'day' | 'sunset' | 'night') => void;
  setSteer: (val: number) => void;
  setThrottle: (val: number) => void;
  setNitro: (active: boolean) => void;
  setMuted: (muted: boolean) => void;
  resetPosition: () => void;
  playStartBeep: (isGo?: boolean) => void;
  playIgnition: () => void;
  unlockAudio: () => void;
  destroy: () => void;
}

export const CAMERA_MODES = [
  { key: 'chase', label: 'Dynamic Chase' },
  { key: 'cockpit', label: 'Cockpit View' },
  { key: 'hood', label: 'Nosecone Cam' },
  { key: 'drone', label: 'Tactical Drone' },
  { key: 'orbit', label: 'Cinematic Orbit' },
];

export async function initRacingGame(
  canvas: HTMLCanvasElement,
  onProgress?: (progress: number, label: string) => void,
  onTelemetry?: (data: TelemetryData) => void,
  initialCircuitId: string = 'monza',
  initialPlayerName: string = 'Kaushal',
  initialPracticeMode: boolean = false
): Promise<GameInstance> {
  onProgress?.(0.2, 'Initializing Three.js WebGL Engine...');

  // 1. Three.js Scene, Camera & WebGL Renderer
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x60a5fa);
  scene.fog = new THREE.Fog(0x7cb5ec, 80, 480);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.2,
    1200
  );

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  onProgress?.(0.4, 'Setting up Grand Prix Lighting...');

  // 2. Dynamic Lighting Rig
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xfffaed, 2.2);
  sunLight.position.set(120, 180, -90);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 600;
  sunLight.shadow.camera.left = -220;
  sunLight.shadow.camera.right = 220;
  sunLight.shadow.camera.top = 220;
  sunLight.shadow.camera.bottom = -220;
  scene.add(sunLight);

  onProgress?.(0.6, 'Generating 2km Grand Prix Circuit Geometry...');

  // 3. Grand Scale Procedural Circuit
  let currentCircuitId = initialCircuitId || 'monza';
  let track: GeneratedTrack = buildProceduralTrack(scene, currentCircuitId);

  onProgress?.(0.8, 'Assembling Procedural Formula Racecar...');

  // 4. Player Formula 1 Racecar & Controller
  let playerColorHex = 0xf59e0b;
  let playerName = initialPlayerName || 'Kaushal';
  let playerCar: CarInstance = createProceduralF1Car(playerColorHex, true);
  scene.add(playerCar.root);

  const vehicle = new VehicleController(playerCar, track.waypoints, track.startPosition);

  // 5. Active Rival Competitors & Zero-Connect Mesh (Default: Live Peer Only)
  let isPracticeMode = initialPracticeMode;
  const rivalManager = new RivalManager(
    scene,
    track.waypoints,
    currentCircuitId,
    '#f59e0b',
    playerName,
    isPracticeMode
  );

  // 6. Crash Sparks & Tire Smoke Particle Engine
  const crashFX = new CrashFX(scene);

  // 7. Procedural WebAudio Engine
  const audio = new EngineAudio();

  // Input State
  const input = {
    steer: 0,
    throttle: 0,
    nitro: false,
  };

  let touchActive = false;

  const updateKeyboardInput = () => {
    let s = 0;
    let t = 0;
    if (keysPressed.has('KeyA') || keysPressed.has('ArrowLeft')) s += 1;
    if (keysPressed.has('KeyD') || keysPressed.has('ArrowRight')) s -= 1;
    if (keysPressed.has('KeyW') || keysPressed.has('ArrowUp')) t += 1;
    if (keysPressed.has('KeyS') || keysPressed.has('ArrowDown')) t -= 1;
    const n = keysPressed.has('Space') || keysPressed.has('ShiftLeft') || keysPressed.has('ShiftRight');

    if (!touchActive) {
      input.steer = s;
      input.throttle = t;
      input.nitro = n;
    }
  };

  const keysPressed = new Set<string>();
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    audio.unlock();
    keysPressed.add(e.code);
    updateKeyboardInput();
  };

  const onKeyUp = (e: KeyboardEvent) => {
    keysPressed.delete(e.code);
    updateKeyboardInput();
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  const unlockAudioOnTouch = () => {
    audio.unlock();
    window.removeEventListener('pointerdown', unlockAudioOnTouch);
  };
  window.addEventListener('pointerdown', unlockAudioOnTouch);

  // Window Resize
  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  // Camera Settings
  let currentCameraMode: string = 'chase';
  const cameraTarget = new THREE.Vector3();
  const currentCamPos = new THREE.Vector3().copy(vehicle.position).add(new THREE.Vector3(0, 3.2, -6.8));

  // Lighting Themes
  let currentTheme: 'day' | 'sunset' | 'night' = 'day';

  function applyLightingTheme(theme: 'day' | 'sunset' | 'night') {
    currentTheme = theme;
    if (theme === 'night') {
      scene.background = new THREE.Color(0x070b14);
      scene.fog = new THREE.Fog(0x070b14, 60, 240);
      ambientLight.color.setHex(0x1e293b);
      ambientLight.intensity = 0.35;
      sunLight.color.setHex(0x3b82f6);
      sunLight.intensity = 0.6;
    } else if (theme === 'sunset') {
      scene.background = new THREE.Color(0x4c1d95);
      scene.fog = new THREE.Fog(0x581c87, 80, 320);
      ambientLight.color.setHex(0xf97316);
      ambientLight.intensity = 0.65;
      sunLight.color.setHex(0xff7722);
      sunLight.intensity = 2.4;
    } else {
      scene.background = new THREE.Color(0x60a5fa);
      scene.fog = new THREE.Fog(0x7cb5ec, 90, 480);
      ambientLight.color.setHex(0xffffff);
      ambientLight.intensity = 0.75;
      sunLight.color.setHex(0xfffaed);
      sunLight.intensity = 2.2;
    }
  }

  // Lap Timer & Sector Timing
  let currentLapTime = 0;
  let lastLapTime: number | null = null;
  let bestLapTime: number | null = null;
  let currentSector = 1;
  let isFlash = false;
  let isNewBest = false;
  let flashTimer = 0;

  // Render & Physics Loop
  let isRunning = true;
  let lastTime = performance.now();
  let telemetryThrottle = 0;

  const animate = () => {
    if (!isRunning) return;
    requestAnimationFrame(animate);

    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;

    // 1. Vehicle Physics & Barrier Collisions
    const isNight = currentTheme === 'night' || currentTheme === 'sunset';
    const barrierCrash = vehicle.update(dt, input.steer, input.throttle, input.nitro, isNight);

    if (barrierCrash.hasBarrierCrash) {
      crashFX.triggerImpactSparks(barrierCrash.point, barrierCrash.normal, barrierCrash.intensity);
      audio.playImpact(barrierCrash.intensity);
    }

    // 2. Car-to-Car Crash Physics
    const carCrash = rivalManager.checkCarCollisions(vehicle.position, vehicle.velocity);
    if (carCrash.hasImpact) {
      crashFX.triggerImpactSparks(carCrash.point, carCrash.normal, carCrash.intensity);
      audio.playImpact(carCrash.intensity);
    }

    // 3. Tire Smoke Drift Particles
    if (vehicle.driftIntensity > 0.25) {
      const leftWheelWorld = new THREE.Vector3();
      playerCar.wheels.rl.getWorldPosition(leftWheelWorld);
      const rightWheelWorld = new THREE.Vector3();
      playerCar.wheels.rr.getWorldPosition(rightWheelWorld);
      crashFX.emitDriftSmoke(leftWheelWorld, rightWheelWorld, vehicle.driftIntensity);
    }

    // 4. Update Particle Systems
    crashFX.update(dt);

    // 5. Audio Update
    audio.update(
      dt,
      vehicle.speed / vehicle.TOP_FORWARD_SPEED,
      input.throttle,
      vehicle.driftIntensity,
      vehicle.isBoosting
    );

    // 6. Rival Manager Update
    rivalManager.update(
      dt,
      vehicle.position,
      vehicle.yaw,
      vehicle.speed,
      vehicle.lap,
      vehicle.lapProgress,
      isNight
    );

    // 7. Lap Timing & Sector Calculation
    if (Math.abs(vehicle.speed) > 1.0) {
      currentLapTime += dt;
    }

    // Checkpoint distance to S/F
    const distToSF = Math.hypot(vehicle.position.x - 0, vehicle.position.z - 0);
    if (distToSF < 10.0 && currentLapTime > 20.0) {
      lastLapTime = currentLapTime;
      if (!bestLapTime || currentLapTime < bestLapTime) {
        bestLapTime = currentLapTime;
        isNewBest = true;
      } else {
        isNewBest = false;
      }
      isFlash = true;
      flashTimer = 2.4;
      vehicle.lap += 1;
      currentLapTime = 0;
    }

    if (flashTimer > 0) {
      flashTimer -= dt;
      if (flashTimer <= 0) isFlash = false;
    }

    const progressFrac = vehicle.lapProgress % 1;
    if (progressFrac < 0.33) currentSector = 1;
    else if (progressFrac < 0.66) currentSector = 2;
    else currentSector = 3;

    // 8. Follow Camera Positioning with Camera Shake
    const forwardX = Math.sin(vehicle.yaw);
    const forwardZ = Math.cos(vehicle.yaw);

    if (currentCameraMode === 'cockpit') {
      camera.position.set(
        vehicle.position.x + forwardX * 0.2,
        vehicle.position.y + 0.68,
        vehicle.position.z + forwardZ * 0.2
      );
      cameraTarget.set(
        vehicle.position.x + forwardX * 30,
        vehicle.position.y + 0.6,
        vehicle.position.z + forwardZ * 30
      );
    } else if (currentCameraMode === 'hood') {
      camera.position.set(
        vehicle.position.x + forwardX * 1.8,
        vehicle.position.y + 0.42,
        vehicle.position.z + forwardZ * 1.8
      );
      cameraTarget.set(
        vehicle.position.x + forwardX * 30,
        vehicle.position.y + 0.35,
        vehicle.position.z + forwardZ * 30
      );
    } else if (currentCameraMode === 'drone') {
      camera.position.set(vehicle.position.x, 38, vehicle.position.z - 18);
      cameraTarget.copy(vehicle.position);
    } else if (currentCameraMode === 'orbit') {
      const angle = now * 0.0006;
      camera.position.set(
        vehicle.position.x + Math.sin(angle) * 12.0,
        vehicle.position.y + 4.8,
        vehicle.position.z + Math.cos(angle) * 12.0
      );
      cameraTarget.copy(vehicle.position);
    } else {
      // Dynamic Chase Camera (Default)
      const targetCamPos = new THREE.Vector3(
        vehicle.position.x - forwardX * 7.5,
        vehicle.position.y + 3.2 + (vehicle.isBoosting ? -0.4 : 0),
        vehicle.position.z - forwardZ * 7.5
      );
      currentCamPos.lerp(targetCamPos, dt * 7.5);
      camera.position.copy(currentCamPos).add(crashFX.cameraShakeOffset);

      cameraTarget.set(
        vehicle.position.x + forwardX * 6.0,
        vehicle.position.y + 1.2,
        vehicle.position.z + forwardZ * 6.0
      );
    }

    camera.lookAt(cameraTarget);

    // 9. WebGL Render Frame
    renderer.render(scene, camera);

    // 10. Telemetry Dispatch (~30 Hz)
    telemetryThrottle += dt;
    if (telemetryThrottle >= 0.033 && onTelemetry) {
      telemetryThrottle = 0;
      const speedKmh = Math.round(Math.abs(vehicle.speed) * 3.6);
      const standings = rivalManager.getStandings(
        vehicle.lap,
        vehicle.lapProgress,
        speedKmh
      );

      onTelemetry({
        speedKmh,
        gear: vehicle.gear,
        rpm: vehicle.rpm,
        nitro: Math.round(vehicle.nitro),
        isBoosting: vehicle.isBoosting,
        driftIntensity: vehicle.driftIntensity,
        currentDriftPoints: vehicle.currentDriftPoints,
        totalDriftScore: vehicle.totalDriftScore,
        lap: vehicle.lap,
        currentLapTime,
        lastLapTime,
        bestLapTime,
        isFlash,
        isNewBest,
        sector: currentSector,
        trackProgress: vehicle.lapProgress % 1,
        standings,
        circuitId: currentCircuitId,
        circuit: track.circuitInfo,
        isPracticeMode,
        livePeersCount: rivalManager.getLivePeersCount(),
      });
    }
  };

  requestAnimationFrame(animate);
  onProgress?.(1.0, 'Ready to Race!');

  return {
    setVehicleColor(newColor: string) {
      playerCar.setColor(newColor);
      playerColorHex = typeof newColor === 'string' ? parseInt(newColor.replace('#', ''), 16) : newColor;
      rivalManager.setPlayerConfig(newColor, playerName);
    },
    setDriverName(name: string) {
      playerName = name;
      rivalManager.setPlayerConfig('#f59e0b', name);
    },
    setPracticeMode(active: boolean) {
      isPracticeMode = active;
      rivalManager.setPracticeMode(active);
    },
    setCircuit(newCircuitId: string) {
      if (newCircuitId === currentCircuitId) return;
      currentCircuitId = newCircuitId;

      scene.remove(track.group);
      track = buildProceduralTrack(scene, newCircuitId);
      vehicle.setWaypoints(track.waypoints, track.startPosition);
      rivalManager.setWaypoints(track.waypoints, newCircuitId);

      currentLapTime = 0;
      lastLapTime = null;

      if (track.circuitInfo.recommendedTheme) {
        applyLightingTheme(track.circuitInfo.recommendedTheme);
      }
    },
    setCameraMode(mode: string) {
      currentCameraMode = mode;
    },
    cycleCameraMode() {
      const keys = CAMERA_MODES.map((m) => m.key);
      const idx = (keys.indexOf(currentCameraMode) + 1) % keys.length;
      currentCameraMode = keys[idx];
      return currentCameraMode;
    },
    setLightingTheme(theme: 'day' | 'sunset' | 'night') {
      applyLightingTheme(theme);
    },
    setSteer(val: number) {
      touchActive = true;
      input.steer = val;
    },
    setThrottle(val: number) {
      touchActive = true;
      input.throttle = val;
    },
    setNitro(active: boolean) {
      touchActive = true;
      input.nitro = active;
    },
    setMuted(muted: boolean) {
      audio.setMuted(muted);
    },
    resetPosition() {
      vehicle.reset(track.startPosition);
      rivalManager.resetGrid();
      currentLapTime = 0;
      lastLapTime = null;
      currentSector = 1;
      isFlash = false;
    },
    playStartBeep(isGo: boolean = false) {
      audio.playStartBeep(isGo);
    },
    playIgnition() {
      audio.playIgnition();
    },
    unlockAudio() {
      audio.unlock();
    },
    destroy() {
      isRunning = false;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointerdown', unlockAudioOnTouch);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      audio.destroy();
      crashFX.destroy();
      rivalManager.destroy();
      renderer.dispose();
    },
  };
}
