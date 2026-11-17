/**
 * Apex Drift 3D - Scene Graph & Engine Coordinator
 * Orchestrates PixiJS 3D rendering, crashcat physics, nitrous particle emitters,
 * multi-angle follow cameras, audio, and high-performance telemetry.
 */

import {
  DirectionalLight,
  Material3D,
  Mesh3D,
  PlaneGeometry,
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
  gear: number;
  rpm: number;
  nitro: number;
  isBoosting: boolean;
  driftIntensity: number;
  currentDriftPoints: number;
  totalDriftScore: number;
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
    exposure: 1.0,
    environment: { skyColor: 0xc8d8e8, groundColor: 0x7a8a5a, intensity: 1 },
    background: 0xadb2ba,
    fog: { type: 'linear', color: 0xadb2ba, near: 30, far: 55 },
  });

  app.stage.addChild(view3d);

  const camera = view3d.camera;
  const followCamera = new FollowCamera(camera);

  // Directional Sun Light
  const sun = new DirectionalLight({
    color: 0xfff4e0,
    intensity: 2,
    castShadow: true,
    shadow: {
      bias: 0.0008,
      normalBias: 0.05,
      maxDistance: 80,
      cascades: 3,
      lambda: 0.6,
    },
  });

  sun.position.set(11.4, 15, -5.3);
  sun.lookAt({ x: 0, y: 0, z: 0 });
  view3d.root.addChild(sun);

  // Ground plane
  const ground = new Mesh3D({
    geometry: new PlaneGeometry({ width: 200, height: 200 }),
    material: new Material3D({
      baseColor: 0x6b7268,
      metallic: 0.0,
      roughness: 0.9,
    }),
    castShadow: false,
    receiveShadow: true,
  });

  ground.rotation.set(-Math.PI / 2, 0, 0);
  ground.position.set(0, -0.13, 0);
  view3d.root.addChild(ground);

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

    lapTimer.update(dt, vehicle.container.position, hasInput);

    // Telemetry dispatch at ~30Hz
    telemetryTimer += dt;
    if (telemetryTimer >= 0.033 && onTelemetry) {
      telemetryTimer = 0;
      const speedKmh = Math.round(Math.abs(vehicle.linearSpeed) * 85);
      const gear = (audio as any)._gear + 1;
      const rpm = (audio as any)._rpm;

      onTelemetry({
        speedKmh,
        gear: vehicle.isBoosting ? 4 : gear,
        rpm,
        nitro: Math.round(vehicle.nitroAmount),
        isBoosting: vehicle.isBoosting,
        driftIntensity: vehicle.driftIntensity,
        currentDriftPoints: vehicle.currentDriftPoints,
        totalDriftScore: vehicle.driftScore,
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
        sun.color = 0xff9e54;
        sun.intensity = 2.6;
        view3d.background = 0x8b5cf6;
        view3d.fog = { type: 'linear', color: 0xc2410c, near: 35, far: 65 };
        view3d.environment = { skyColor: 0xfb923c, groundColor: 0x4c1d95, intensity: 1.2 };
      } else if (theme === 'night') {
        sun.color = 0x38bdf8;
        sun.intensity = 0.8;
        view3d.background = 0x0f172a;
        view3d.fog = { type: 'linear', color: 0x0f172a, near: 25, far: 50 };
        view3d.environment = { skyColor: 0x1e1b4b, groundColor: 0x0f172a, intensity: 0.6 };
      } else {
        // Day
        sun.color = 0xfff4e0;
        sun.intensity = 2.0;
        view3d.background = 0xadb2ba;
        view3d.fog = { type: 'linear', color: 0xadb2ba, near: 30, far: 55 };
        view3d.environment = { skyColor: 0xc8d8e8, groundColor: 0x7a8a5a, intensity: 1.0 };
      }
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
