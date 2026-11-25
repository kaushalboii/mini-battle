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
import { SmokeTrails } from './Particles';
import { PhysicsWorld } from './Physics';
import { RivalsAndGhostManager } from './RivalsAndGhost';
import { TouchJoystick } from './TouchJoystick';
import { buildTrack } from './Track';
import { MAX_SPEED, Vehicle } from './Vehicle';

export interface RaceTelemetry {
  speedNormalized: number;
  mph: number;
  kmh: number;
  gear: number;
  rpm: number;
  lap: number;
  currentLapTime: number;
  lastLapFormatted: string;
  bestLapFormatted: string;
  bestLap: number | null;
  x: number;
  y: number;
  z: number;
  yaw: number;
  trackId: string;
  waypoints: Array<{ x: number; z: number }>;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

export interface GameInstance {
  app: Application;
  audio: GameAudio;
  getVehicle: () => Vehicle;
  camera: FollowCamera;
  setVehicleColor: (colorKey: string) => void;
  setCameraMode: (mode: string) => void;
  cycleCameraMode: () => string;
  setTrack: (trackId: string) => void;
  setRaceMode: (mode: 'solo' | 'ghost' | 'ai') => void;
  setTouchMode: (mode: 'joystick' | 'pedals') => void;
  setAudioMuted: (muted: boolean) => void;
  setAudioVolume: (vol: number) => void;
  clearBestLap: () => void;
  resetPosition: () => void;
  setPaused: (paused: boolean) => void;
  getTelemetry: () => RaceTelemetry;
  syncRemotePlayers: (players: any[]) => void;
  destroy: () => void;
}

export async function initRacingGame(
  canvas: HTMLCanvasElement,
  onProgress?: (progress: number, label: string) => void,
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
    onProgress?.(0.1 + (loadedCount / totalAssets) * 0.7, 'Loading Kenney textures...');
    return res;
  });

  const modelPromises = MODEL_KEYS.map((key) =>
    Assets.load(model(`racing.${key}`)).then((res) => {
      loadedCount++;
      onProgress?.(0.1 + (loadedCount / totalAssets) * 0.7, `Loading ${key}...`);
      return res;
    }),
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

  // Lights
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

  // Track
  let currentTrackId = 'classic';
  let track = buildTrack(view3d.root, sources, currentTrackId);

  // Physics
  const physics = new PhysicsWorld(new Vector3(track.spawn[0], track.spawn[1], track.spawn[2]));
  physics.addStaticGround([0, -0.125, 0], [80, 0.01, 80]);
  physics.rebuildWalls(track.walls);

  // Audio
  const audio = new GameAudio();
  void audio.load();

  const unlockAudio = () => {
    audio.unlock();
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('pointerdown', unlockAudio);
  };

  window.addEventListener('keydown', unlockAudio);
  window.addEventListener('pointerdown', unlockAudio);

  // Vehicle (single persistent Vehicle instance whose Model3D swaps cleanly)
  let currentColorKey = 'vehicle-truck-yellow';
  const vehicle = new Vehicle(sources[currentColorKey], physics, track.spawn, track.spawnYaw);
  view3d.root.addChild(vehicle.container);

  (physics as any).listener = {
    onContactAdded(bodyA: any, bodyB: any) {
      if (bodyA !== physics.sphereBody && bodyB !== physics.sphereBody) return;

      const fx = Math.sin(vehicle.yaw);
      const fz = Math.cos(vehicle.yaw);
      const mv = vehicle.modelVelocity;
      const impactVelocity = Math.abs(mv.x * fx + mv.z * fz);

      audio.playImpact(impactVelocity);
    },
  };

  // HUD
  const hudLayer = new Container();
  app.stage.addChild(hudLayer);

  const lapTimer = new LapTimer(track, currentTrackId);
  hudLayer.addChild(lapTimer.container);

  const joystick = new TouchJoystick(app.screen.width, app.screen.height);
  hudLayer.addChild(joystick as any);

  const controls = new Controls(joystick as any);

  // Rivals & Best-Lap Ghost Manager
  const rivalsManager = new RivalsAndGhostManager(view3d.root, sources, track);
  (lapTimer as any).onLapCompleted = ({ isBest }: { isBest: boolean }) => {
    rivalsManager.onPlayerLapComplete(isBest);
  };

  // FX
  const driftMarks = new DriftMarks(view3d.root);
  const particles = new SmokeTrails(view3d.root, smokeTexture);

  let isGamePaused = false;
  let elapsedTime = 0;
  let pendingRemotePlayers: any[] = [];

  const tickerFn = () => {
    joystick.resize(app.screen.width, app.screen.height);

    const dt = Math.min(app.ticker.deltaMS / 1000, 1 / 30);
    elapsedTime += dt;

    if (pendingRemotePlayers.length > 0 || rivalsManager) {
      rivalsManager.syncRemotePlayers(pendingRemotePlayers, dt);
    }

    if (isGamePaused) {
      audio.silence();
      hudLayer.visible = false;
      sun.position.set(vehicle.spherePos.x + 11.4, 15, vehicle.spherePos.z - 5.3);
      sun.lookAt({ x: vehicle.spherePos.x, y: 0, z: vehicle.spherePos.z });
      followCamera.updateShowcase(dt, vehicle.container.position, vehicle.yaw);
      return;
    }

    hudLayer.visible = true;
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
      vehicle.linearSpeed,
    );

    driftMarks.update(dt, vehicle);
    particles.update(app.ticker, vehicle);
    audio.update(
      dt,
      vehicle.linearSpeed / MAX_SPEED,
      input.z,
      vehicle.driftIntensity,
    );

    const hasInput =
      input.touchActive || Math.abs(input.x) > 0.05 || Math.abs(input.z) > 0.05;

    rivalsManager.update(dt, vehicle, hasInput || Math.abs(vehicle.linearSpeed) > 0.05, elapsedTime);
    lapTimer.update(dt, vehicle.container.position, hasInput);
  };

  app.ticker.add(tickerFn);

  onProgress?.(1.0, 'Ready!');

  return {
    app,
    audio,
    getVehicle: () => vehicle,
    camera: followCamera,
    setVehicleColor(newKey: string) {
      if (!sources[newKey] || newKey === currentColorKey) return;
      currentColorKey = newKey;
      vehicle.setSource(sources[newKey]);
      rivalsManager.setPlayerColor(newKey);
    },
    setCameraMode(mode: string) {
      followCamera.setMode(mode);
    },
    cycleCameraMode() {
      return followCamera.cycleMode();
    },
    setTrack(trackId: string) {
      if (trackId === currentTrackId) return;
      track.destroy();
      currentTrackId = trackId;
      track = buildTrack(view3d.root, sources, trackId);
      physics.rebuildWalls(track.walls);
      vehicle.setSpawn(track.spawn, track.spawnYaw);
      driftMarks.clear();
      lapTimer.setTrack(track, trackId);
      rivalsManager.setTrack(track);
      followCamera.resetTracking();
    },
    setRaceMode(mode: 'solo' | 'ghost' | 'ai') {
      rivalsManager.setMode(mode, currentColorKey);
    },
    setTouchMode(mode: 'joystick' | 'pedals') {
      joystick.setMode(mode);
    },
    setAudioMuted(muted: boolean) {
      audio.setMuted(muted);
    },
    setAudioVolume(vol: number) {
      audio.setVolume(vol);
    },
    clearBestLap() {
      lapTimer.clearBest();
    },
    resetPosition() {
      vehicle.reset();
      lapTimer.resetCurrentLap();
      rivalsManager.resetAiToGrid();
      followCamera.resetTracking();
    },
    setPaused(paused: boolean) {
      const wasPaused = isGamePaused;
      isGamePaused = paused;
      (controls as any).enabled = !paused;
      if (paused) {
        (controls as any).reset?.();
        hudLayer.visible = false;
        audio.silence();
        if (!wasPaused) followCamera.resetTracking();
      } else {
        hudLayer.visible = true;
        if (wasPaused) followCamera.resetTracking();
      }
    },
    getTelemetry(): RaceTelemetry {
      const speedRatio = Math.min(1.1, Math.abs(vehicle.linearSpeed || 0) / MAX_SPEED);
      const mph = Math.round(speedRatio * 112);
      const kmh = Math.round(speedRatio * 180);
      const lapStats = lapTimer.getStats();

      return {
        speedNormalized: Math.min(1, speedRatio),
        mph,
        kmh,
        gear: mph <= 1 ? 0 : audio.getGear(),
        rpm: audio.getRpm(),
        lap: lapStats.lap,
        currentLapTime: lapStats.currentLapTime,
        lastLapFormatted: lapStats.lastLapFormatted,
        bestLapFormatted: lapStats.bestLapFormatted,
        bestLap: lapStats.bestLap,
        x: vehicle.container.position.x,
        y: vehicle.container.position.y,
        z: vehicle.container.position.z,
        yaw: vehicle.yaw,
        trackId: currentTrackId,
        waypoints: track.waypoints,
        bounds: track.bounds,
      };
    },
    syncRemotePlayers(players: any[]) {
      pendingRemotePlayers = players || [];
    },
    destroy() {
      app.ticker.remove(tickerFn);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('pointerdown', unlockAudio);
      rivalsManager.destroy();
      controls.destroy();
      audio.destroy();
      app.destroy(true, { children: true });
    },
  };
}
