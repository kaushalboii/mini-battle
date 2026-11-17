/**
 * RevSector 3D - Bespoke Three.js Real-Time Circuit Racing Engine
 * Full WebGL 3D simulator featuring procedural Formula 1 racecars, curved asphalt circuits,
 * dynamic Xenon headlights, FIA rear brake lights, active rival AI, and zero-connect multiplayer mesh.
 * Engineered and authored entirely by Kaushal.
 */

import * as THREE from 'three';
import { createProceduralF1Car, type CarInstance } from './ProceduralCar';
import { buildProceduralTrack, type GeneratedTrack } from './TrackGenerator';
import { VehicleController } from './VehicleController';
import { RivalManager, type GridStanding } from './RivalManager';
import { EngineAudio } from './EngineAudio';

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
}

export interface GameInstance {
  setVehicleColor: (colorKey: string) => void;
  setDriverName: (name: string) => void;
  setCircuit: (circuitId: string) => void;
  setCameraMode: (mode: string) => void;
  cycleCameraMode: () => string;
  setLightingTheme: (theme: 'day' | 'sunset' | 'night') => void;
  setSteer: (val: number) => void;
  setThrottle: (val: number) => void;
  setNitro: (active: boolean) => void;
  setMuted: (muted: boolean) => void;
  resetPosition: () => void;
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
  initialPlayerName: string = 'Kaushal'
): Promise<GameInstance> {
  onProgress?.(0.2, 'Initializing Three.js WebGL Engine...');

  // 1. Three.js Scene, Camera & WebGL Renderer
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x60a5fa);
  scene.fog = new THREE.Fog(0x7cb5ec, 45, 120);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    400
  );

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  onProgress?.(0.4, 'Setting up Grand Prix Lighting...');

  // 2. Dynamic Lighting Rig
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xfffaed, 2.2);
  sunLight.position.set(40, 60, -30);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 5;
  sunLight.shadow.camera.far = 160;
  sunLight.shadow.camera.left = -60;
  sunLight.shadow.camera.right = 60;
  sunLight.shadow.camera.top = 60;
  sunLight.shadow.camera.bottom = -60;
  scene.add(sunLight);

  onProgress?.(0.6, 'Generating Grand Prix Circuit Geometry...');

  // 3. Procedural Circuit Track
  let currentCircuitId = initialCircuitId || 'monza';
  let track: GeneratedTrack = buildProceduralTrack(scene, currentCircuitId);

  onProgress?.(0.8, 'Assembling Procedural Formula Racecar...');

  // 4. Player Formula 1 Racecar & Controller
  let playerColorHex = 0xf59e0b;
  let playerName = initialPlayerName || 'Kaushal';
  let playerCar: CarInstance = createProceduralF1Car(playerColorHex, true);
  scene.add(playerCar.root);

  const vehicle = new VehicleController(playerCar, track.waypoints, track.startPosition);

  // 5. Active Rival Competitors & Zero-Connect Mesh
  const rivalManager = new RivalManager(
    scene,
    track.waypoints,
    currentCircuitId,
    '#f59e0b',
    playerName
  );

  // 6. Procedural WebAudio Engine
  const audio = new EngineAudio();

  // Input State
  const input = {
    steer: 0,
    throttle: 0,
    nitro: false,
  };

  // Keyboard Event Listeners
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

  const updateKeyboardInput = () => {
    let s = 0;
    let t = 0;
    if (keysPressed.has('KeyA') || keysPressed.has('ArrowLeft')) s += 1;
    if (keysPressed.has('KeyD') || keysPressed.has('ArrowRight')) s -= 1;
    if (keysPressed.has('KeyW') || keysPressed.has('ArrowUp')) t += 1;
    if (keysPressed.has('KeyS') || keysPressed.has('ArrowDown')) t -= 1;
    const n = keysPressed.has('Space') || keysPressed.has('ShiftLeft') || keysPressed.has('ShiftRight');

    // Only override if no touch active
    if (!touchActive) {
      input.steer = s;
      input.throttle = t;
      input.nitro = n;
    }
  };

  let touchActive = false;
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

  // Camera Settings
  let currentCameraMode: string = 'chase';
  const cameraOffset = new THREE.Vector3(0, 3.2, -6.8);
  const cameraTarget = new THREE.Vector3();
  const currentCamPos = new THREE.Vector3().copy(vehicle.position).add(cameraOffset);

  // Lighting Themes
  let currentTheme: 'day' | 'sunset' | 'night' = 'day';

  function applyLightingTheme(theme: 'day' | 'sunset' | 'night') {
    currentTheme = theme;
    if (theme === 'night') {
      scene.background = new THREE.Color(0x070b14);
      scene.fog = new THREE.Fog(0x070b14, 30, 80);
      ambientLight.color.setHex(0x1e293b);
      ambientLight.intensity = 0.35;
      sunLight.color.setHex(0x3b82f6);
      sunLight.intensity = 0.6;
    } else if (theme === 'sunset') {
      scene.background = new THREE.Color(0x4c1d95);
      scene.fog = new THREE.Fog(0x581c87, 40, 95);
      ambientLight.color.setHex(0xf97316);
      ambientLight.intensity = 0.65;
      sunLight.color.setHex(0xff7722);
      sunLight.intensity = 2.4;
    } else {
      scene.background = new THREE.Color(0x60a5fa);
      scene.fog = new THREE.Fog(0x7cb5ec, 45, 120);
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
  let hasCrossedFinishOnce = false;

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

    // 1. Vehicle Physics Update
    const isNight = currentTheme === 'night' || currentTheme === 'sunset';
    vehicle.update(dt, input.steer, input.throttle, input.nitro, isNight);

    // 2. Audio Update
    audio.update(
      dt,
      vehicle.speed / vehicle.TOP_FORWARD_SPEED,
      input.throttle,
      vehicle.driftIntensity,
      vehicle.isBoosting
    );

    // 3. Rival Racecars Update
    rivalManager.update(
      dt,
      vehicle.position,
      vehicle.yaw,
      vehicle.speed,
      vehicle.lap,
      vehicle.lapProgress,
      isNight
    );

    // 4. Lap Timing & Sector Calculation
    if (Math.abs(vehicle.speed) > 0.5) {
      currentLapTime += dt;
    }

    // Checkpoint distance to S/F (x=3.5, z=5.0)
    const distToSF = Math.hypot(vehicle.position.x - 3.5, vehicle.position.z - 5.0);
    if (distToSF < 4.5) {
      if (currentLapTime > 12.0) {
        lastLapTime = currentLapTime;
        if (!bestLapTime || currentLapTime < bestLapTime) {
          bestLapTime = currentLapTime;
          isNewBest = true;
        } else {
          isNewBest = false;
        }
        isFlash = true;
        flashTimer = 2.2;
        vehicle.lap += 1;
        currentLapTime = 0;
      }
      hasCrossedFinishOnce = true;
    }

    if (flashTimer > 0) {
      flashTimer -= dt;
      if (flashTimer <= 0) isFlash = false;
    }

    // Sector breakdown (3 sectors)
    const progressFrac = vehicle.lapProgress % 1;
    if (progressFrac < 0.33) currentSector = 1;
    else if (progressFrac < 0.66) currentSector = 2;
    else currentSector = 3;

    // 5. Follow Camera Positioning
    const forwardX = Math.sin(vehicle.yaw);
    const forwardZ = Math.cos(vehicle.yaw);

    if (currentCameraMode === 'cockpit') {
      camera.position.set(
        vehicle.position.x + forwardX * 0.2,
        vehicle.position.y + 0.68,
        vehicle.position.z + forwardZ * 0.2
      );
      cameraTarget.set(
        vehicle.position.x + forwardX * 20,
        vehicle.position.y + 0.6,
        vehicle.position.z + forwardZ * 20
      );
    } else if (currentCameraMode === 'hood') {
      camera.position.set(
        vehicle.position.x + forwardX * 1.6,
        vehicle.position.y + 0.42,
        vehicle.position.z + forwardZ * 1.6
      );
      cameraTarget.set(
        vehicle.position.x + forwardX * 20,
        vehicle.position.y + 0.35,
        vehicle.position.z + forwardZ * 20
      );
    } else if (currentCameraMode === 'drone') {
      camera.position.set(vehicle.position.x, 26, vehicle.position.z - 12);
      cameraTarget.copy(vehicle.position);
    } else if (currentCameraMode === 'orbit') {
      const angle = now * 0.0008;
      camera.position.set(
        vehicle.position.x + Math.sin(angle) * 8.5,
        vehicle.position.y + 3.8,
        vehicle.position.z + Math.cos(angle) * 8.5
      );
      cameraTarget.copy(vehicle.position);
    } else {
      // Dynamic Chase Camera (Default)
      const targetCamPos = new THREE.Vector3(
        vehicle.position.x - forwardX * 6.2,
        vehicle.position.y + 2.8 + (vehicle.isBoosting ? -0.3 : 0),
        vehicle.position.z - forwardZ * 6.2
      );
      currentCamPos.lerp(targetCamPos, dt * 7.5);
      camera.position.copy(currentCamPos);

      cameraTarget.set(
        vehicle.position.x + forwardX * 5.0,
        vehicle.position.y + 1.1,
        vehicle.position.z + forwardZ * 5.0
      );
    }

    camera.lookAt(cameraTarget);

    // 6. WebGL Render Frame
    renderer.render(scene, camera);

    // 7. Telemetry Dispatch (~30 Hz)
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
    setCircuit(newCircuitId: string) {
      if (newCircuitId === currentCircuitId) return;
      currentCircuitId = newCircuitId;

      // Remove existing track group
      scene.remove(track.group);

      // Build new circuit
      track = buildProceduralTrack(scene, newCircuitId);
      vehicle.setWaypoints(track.waypoints, track.startPosition);
      rivalManager.setWaypoints(track.waypoints, newCircuitId);

      // Reset timer
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
    },
    destroy() {
      isRunning = false;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointerdown', unlockAudioOnTouch);
      window.removeEventListener('resize', onResize);
      audio.destroy();
      rivalManager.destroy();
      renderer.dispose();
    },
  };
}
