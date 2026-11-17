/**
 * RevSector 3D - Scene Graph & Real-Time Engine Coordinator
 * Custom WebGPU/WebGL 3D engine with rigid body dynamics, tire smoke particles,
 * multi-angle follow cameras, procedural audio, and high-performance telemetry.
 * Developed by Kaushal.
 */

import {
  CubeGeometry,
  DirectionalLight,
  Material3D,
  Mesh3D,
  PlaneGeometry,
  SpotLight,
  Vector3,
  View3D,
} from '@pixi/3d';
import { Application, Assets, Container } from 'pixi.js';

import { rendererPreference } from './getPreference';
import { model, models, texture } from './manifest';
import { GameAudio } from './Audio';
import { FollowCamera } from './Camera';
import { Controls } from './Controls';
import { DriftMarks } from './DriftMarks';
import { LapTimer } from './LapTimer';
import { SmokeTrails, NitroTrails } from './Particles';
import { PhysicsWorld } from './Physics';
import { TouchJoystick } from './TouchJoystick';
import { buildTrack } from './Track';
import { MAX_SPEED, Vehicle } from './Vehicle';

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
}

export interface GameInstance {
  app: Application;
  audio: GameAudio;
  vehicle: Vehicle;
  camera: FollowCamera;
  setVehicleColor: (colorKey: string) => void;
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

export async function initRacingGame(
  canvas: HTMLCanvasElement,
  onProgress?: (progress: number, label: string) => void,
  onTelemetry?: (data: TelemetryData) => void
): Promise<GameInstance> {
  const app = new Application();

  await app.init({
    canvas,
    resizeTo: window,
    preference: rendererPreference,
    backgroundColor: 0xadb2ba,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });

  const MODEL_KEYS = Object.keys(models.racing);

  onProgress?.(0.1, 'Loading assets...');

  let loadedCount = 0;
  const totalAssets = 1 + MODEL_KEYS.length;

  const smokePromise = Assets.load(texture('racing.smoke')).then((res) => {
    loadedCount++;
    onProgress?.(0.1 + (loadedCount / totalAssets) * 0.7, 'Loading textures...');
    return res;
  });

  const modelPromises = MODEL_KEYS.map((key) =>
    Assets.load(model(`racing.${key}`)).then((res) => {
      loadedCount++;
      onProgress?.(0.1 + (loadedCount / totalAssets) * 0.7, `Loading ${key}...`);
      return res;
    })
  );

  const [smokeTexture, ...sourceList] = await Promise.all([
    smokePromise,
    ...modelPromises,
  ]);

  const sources: Record<string, any> = Object.create(null);
  MODEL_KEYS.forEach((key, i) => {
    sources[key] = sourceList[i];
  });

  onProgress?.(0.9, 'Building 3D world...');

  const view3d = new View3D({
    autoResize: true,
    shadowQuality: 'high',
    toneMapping: 'aces',
    exposure: 1.05,
    environment: { skyColor: 0x93c5fd, groundColor: 0x1c3a19, intensity: 1.15 },
    background: 0x60a5fa,
    fog: { type: 'linear', color: 0x7cb5ec, near: 45, far: 105 },
  });

  app.stage.addChild(view3d);

  const camera = view3d.camera;
  const followCamera = new FollowCamera(camera);

  // Directional Sun Light
  const sun = new DirectionalLight({
    color: 0xfffaed,
    intensity: 2.4,
    castShadow: true,
    shadow: {
      bias: 0.0008,
      normalBias: 0.05,
      maxDistance: 85,
      cascades: 3,
      lambda: 0.6,
    },
  });

  sun.position.set(11.4, 15, -5.3);
  sun.lookAt({ x: 0, y: 0, z: 0 });
  view3d.root.addChild(sun);

  // High-Contrast Grand Prix Circuit Grass
  const ground = new Mesh3D({
    geometry: new PlaneGeometry({ width: 350, height: 350 }),
    material: new Material3D({
      baseColor: 0x183317, // Deep Monza circuit turf
      metallic: 0.04,
      roughness: 0.88,
    }),
    castShadow: false,
    receiveShadow: true,
  });

  ground.rotation.set(-Math.PI / 2, 0, 0);
  ground.position.set(0, -0.13, 0);
  view3d.root.addChild(ground);

  // Formula 1 Track PBR Material Calibration (asphalt & grip)
  for (const source of Object.values(sources)) {
    const s = source as any;
    if (s?.materials) {
      for (const mat of s.materials) {
        if (mat.roughness !== undefined) {
          mat.roughness = 0.80;
          mat.metallic = 0.08;
        }
      }
    }
  }

  // F1 Starting Grid Boxes (P1 - P6 alternating slots on main straight)
  const gridGeo = new PlaneGeometry({ width: 1.3, height: 2.0 });
  const gridMat = new Material3D({
    baseColor: 0xffffff,
    metallic: 0.1,
    roughness: 0.4,
  });
  const gridSlots = [
    [2.8, 5.2],
    [4.6, 7.6],
    [2.8, 10.0],
    [4.6, 12.4],
    [2.8, 14.8],
    [4.6, 17.2],
  ];
  for (const [gx, gz] of gridSlots) {
    const slot = new Mesh3D({
      geometry: gridGeo,
      material: gridMat,
      castShadow: false,
      receiveShadow: true,
    });
    slot.rotation.set(-Math.PI / 2, 0, 0);
    slot.position.set(gx, -0.11, gz);
    view3d.root.addChild(slot);
  }

  // Formula 1 Start/Finish Electronic Timing Gantry
  const gantryMat = new Material3D({ baseColor: 0x18181b, metallic: 0.8, roughness: 0.25 });
  const pillarGeo = new CubeGeometry({ width: 0.35, height: 3.8, depth: 0.35 });

  const pillarLeft = new Mesh3D({ geometry: pillarGeo, material: gantryMat });
  pillarLeft.position.set(0.4, 1.8, 3.75);
  view3d.root.addChild(pillarLeft);

  const pillarRight = new Mesh3D({ geometry: pillarGeo, material: gantryMat });
  pillarRight.position.set(7.1, 1.8, 3.75);
  view3d.root.addChild(pillarRight);

  const beamGeo = new CubeGeometry({ width: 7.0, height: 0.5, depth: 0.4 });
  const crossBeam = new Mesh3D({ geometry: beamGeo, material: gantryMat });
  crossBeam.position.set(3.75, 3.6, 3.75);
  view3d.root.addChild(crossBeam);

  // Red RevSector FIA Timing Board
  const boardGeo = new CubeGeometry({ width: 4.8, height: 0.9, depth: 0.12 });
  const boardMat = new Material3D({ baseColor: 0xdc2626, metallic: 0.3, roughness: 0.5 });
  const timingBoard = new Mesh3D({ geometry: boardGeo, material: boardMat });
  timingBoard.position.set(3.75, 3.4, 3.75);
  view3d.root.addChild(timingBoard);

  // Pitlane Armco Barrier (separates main straight from paddock)
  const barrierGeo = new CubeGeometry({ width: 0.3, height: 0.65, depth: 22.0 });
  const barrierMat = new Material3D({ baseColor: 0x3f3f46, metallic: 0.6, roughness: 0.35 });
  const pitBarrier = new Mesh3D({ geometry: barrierGeo, material: barrierMat });
  pitBarrier.position.set(7.5, 0.25, 10.0);
  view3d.root.addChild(pitBarrier);

  // Track & Walls
  const track = buildTrack(view3d.root, sources);

  // Physics World
  const physics = new PhysicsWorld(new Vector3(3.5, 0.5, 5));
  physics.addStaticGround([0, -0.125, 0], [50, 0.01, 50]);

  for (const wall of track.walls) {
    physics.addStaticBox(wall);
  }

  // Audio Engine
  const audio = new GameAudio();
  void audio.load();

  let isAudioMuted = false;

  const unlockAudio = () => {
    audio.unlock();
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('pointerdown', unlockAudio);
  };

  window.addEventListener('keydown', unlockAudio);
  window.addEventListener('pointerdown', unlockAudio);

  // Vehicle
  let currentKey = 'vehicle-truck-yellow';
  let vehicle = new Vehicle(sources[currentKey], physics);
  view3d.root.addChild(vehicle.container);

  // High-Intensity Vehicle Headlight System (Night & Sunset Driving)
  const headlightBeam = new SpotLight({
    color: 0xfffaed,
    intensity: 0, // Inactive during bright daylight
    range: 48,
    coneAngle: 34,
    penumbra: 0.38,
    castShadow: false,
  });
  headlightBeam.position.set(0, 0.45, 0.85);
  headlightBeam.lookAt({ x: 0, y: 0.05, z: 25 });

  const lensGeo = new CubeGeometry({ width: 0.16, height: 0.10, depth: 0.04 });
  const headlightLensMat = new Material3D({
    baseColor: 0xd1d5db,
    metallic: 0.1,
    roughness: 0.2,
  });
  const lensLeft = new Mesh3D({ geometry: lensGeo, material: headlightLensMat });
  lensLeft.position.set(-0.35, 0.32, 0.96);

  const lensRight = new Mesh3D({ geometry: lensGeo, material: headlightLensMat });
  lensRight.position.set(0.35, 0.32, 0.96);

  const tailLensMat = new Material3D({
    baseColor: 0xdc2626,
    metallic: 0.2,
    roughness: 0.4,
  });
  const tailLeft = new Mesh3D({ geometry: lensGeo, material: tailLensMat });
  tailLeft.position.set(-0.35, 0.32, -0.96);

  const tailRight = new Mesh3D({ geometry: lensGeo, material: tailLensMat });
  tailRight.position.set(0.35, 0.32, -0.96);

  function attachVehicleLights(targetContainer: any) {
    targetContainer.addChild(headlightBeam);
    targetContainer.addChild(lensLeft);
    targetContainer.addChild(lensRight);
    targetContainer.addChild(tailLeft);
    targetContainer.addChild(tailRight);
  }

  attachVehicleLights(vehicle.container);

  (physics as any).listener = {
    onContactAdded(bodyA: any, bodyB: any) {
      if (bodyA !== physics.sphereBody && bodyB !== physics.sphereBody) return;

      const fx = Math.sin(vehicle.yaw);
      const fz = Math.cos(vehicle.yaw);
      const mv = vehicle.modelVelocity;
      const impactVelocity = Math.abs(mv.x * fx + mv.z * fz);

      if (!isAudioMuted) {
        audio.playImpact(impactVelocity);
      }
    },
  };

  // Pixi 2D HUD Layer
  const hudLayer = new Container();
  app.stage.addChild(hudLayer);

  const lapTimer = new LapTimer(track);
  hudLayer.addChild(lapTimer.container);

  const joystick = new TouchJoystick(app.screen.width, app.screen.height);
  hudLayer.addChild(joystick as any);

  const controls = new Controls(joystick as any);

  // Visual Effects
  const driftMarks = new DriftMarks(view3d.root);
  const smokeParticles = new SmokeTrails(view3d.root, smokeTexture);
  const nitroParticles = new NitroTrails(view3d.root, smokeTexture);

  let telemetryTimer = 0;

  const tickerFn = () => {
    joystick.resize(app.screen.width, app.screen.height);

    const dt = Math.min(app.ticker.deltaMS / 1000, 1 / 30);
    const input = controls.update();

    physics.step(dt);
    vehicle.update(dt, input);

    sun.position.set(vehicle.spherePos.x + 11.4, 15, vehicle.spherePos.z - 5.3);
    sun.lookAt({ x: vehicle.spherePos.x, y: 0, z: vehicle.spherePos.z });

    followCamera.update(
      dt,
      vehicle.container.position,
      vehicle.modelVelocity,
      vehicle.yaw,
      vehicle.linearSpeed
    );

    driftMarks.update(dt, vehicle);
    smokeParticles.update(app.ticker, vehicle);
    nitroParticles.update(app.ticker, vehicle);

    if (!isAudioMuted) {
      audio.update(
        dt,
        vehicle.linearSpeed / MAX_SPEED,
        input.z,
        vehicle.driftIntensity,
      );
    }

    const hasInput =
      input.touchActive || Math.abs(input.x) > 0.05 || Math.abs(input.z) > 0.05;

    lapTimer.resize(app.screen.width, app.screen.height);
    lapTimer.update(dt, vehicle.container.position, hasInput);

    const lapState = lapTimer.getState();

    // Telemetry dispatch at ~30Hz
    telemetryTimer += dt;
    if (telemetryTimer >= 0.033 && onTelemetry) {
      telemetryTimer = 0;
      const speedKmh = Math.round(Math.abs(vehicle.linearSpeed) * 85);
      let gear: string | number = (audio as any)._gear + 1;
      if (vehicle.isBoosting) {
        gear = 'NOS';
      } else if (vehicle.linearSpeed < -0.05) {
        gear = 'R';
      } else if (Math.abs(vehicle.linearSpeed) < 0.02 && input.z === 0) {
        gear = 'N';
      }

      const rpm = (audio as any)._rpm;

      onTelemetry({
        speedKmh,
        gear,
        rpm,
        nitro: Math.round(vehicle.nitroAmount),
        isBoosting: vehicle.isBoosting,
        driftIntensity: vehicle.driftIntensity,
        currentDriftPoints: vehicle.currentDriftPoints,
        totalDriftScore: vehicle.driftScore,
        lap: lapState.lap,
        currentLapTime: lapState.currentLapTime,
        lastLapTime: lapState.lastLapTime,
        bestLapTime: lapState.bestLapTime,
        isFlash: lapState.isFlash,
        isNewBest: lapState.isNewBest,
        sector: lapState.sector,
        trackProgress: lapState.trackProgress,
      });
    }
  };

  app.ticker.add(tickerFn);

  onProgress?.(1.0, 'Ready!');

  return {
    app,
    audio,
    vehicle,
    camera: followCamera,
    setVehicleColor(newKey: string) {
      if (!sources[newKey] || newKey === currentKey) return;
      currentKey = newKey;
      view3d.root.removeChild(vehicle.container);
      const oldYaw = vehicle.yaw;
      vehicle = new Vehicle(sources[newKey], physics);
      vehicle.yaw = oldYaw;
      attachVehicleLights(vehicle.container);
      view3d.root.addChild(vehicle.container);
    },
    setCameraMode(mode: string) {
      followCamera.setMode(mode);
    },
    cycleCameraMode() {
      return followCamera.cycleMode();
    },
    setLightingTheme(theme: 'day' | 'sunset' | 'night') {
      if (theme === 'sunset') {
        sun.color = 0xff9447;
        sun.intensity = 2.8;
        view3d.background = 0x581c87;
        view3d.fog = { type: 'linear', color: 0x8b5cf6, near: 40, far: 85 };
        view3d.environment = { skyColor: 0xf97316, groundColor: 0x2e1065, intensity: 1.3 };
        headlightBeam.intensity = 12;
        headlightLensMat.baseColor = 0xffffff;
      } else if (theme === 'night') {
        sun.color = 0xdbeafe;
        sun.intensity = 1.3;
        view3d.background = 0x070b14;
        view3d.fog = { type: 'linear', color: 0x070b14, near: 35, far: 70 };
        view3d.environment = { skyColor: 0x1e293b, groundColor: 0x020617, intensity: 0.85 };
        headlightBeam.intensity = 26; // High-Intensity Xenon Headlights at Night
        headlightLensMat.baseColor = 0xffffff;
      } else {
        // High-contrast Grand Prix Daylight
        sun.color = 0xfffaed;
        sun.intensity = 2.4;
        view3d.background = 0x60a5fa;
        view3d.fog = { type: 'linear', color: 0x7cb5ec, near: 45, far: 105 };
        view3d.environment = { skyColor: 0x93c5fd, groundColor: 0x1c3a19, intensity: 1.15 };
        headlightBeam.intensity = 0; // Headlights off during bright daylight
        headlightLensMat.baseColor = 0xd1d5db;
      }
    },
    setSteer(val: number) {
      controls.setSteer(val);
    },
    setThrottle(val: number) {
      controls.setThrottle(val);
    },
    setNitro(active: boolean) {
      controls.setNitro(active);
    },
    setMuted(muted: boolean) {
      isAudioMuted = muted;
      if (muted && (audio as any)._ctx?.state === 'running') {
        (audio as any)._ctx.suspend().catch(() => {});
      } else if (!muted && (audio as any)._ctx?.state === 'suspended') {
        (audio as any)._ctx.resume().catch(() => {});
      }
    },
    resetPosition() {
      vehicle.reset();
      lapTimer.reset();
    },
    destroy() {
      app.ticker.remove(tickerFn);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('pointerdown', unlockAudio);
      controls.destroy();
      audio.destroy();
      app.destroy(true, { children: true });
    },
  };
}
