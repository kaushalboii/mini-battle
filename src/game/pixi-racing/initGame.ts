import { View3D, DirectionalLight, Material3D, Mesh3D, PlaneGeometry, Vector3 } from '@pixi/3d';
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
  nitro: number;
  isBoosting: boolean;
  airTime: number;
  driftScore: number;
  currentDriftPoints: number;
  position: number;
  totalRacers: number;
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

const TRACK_ATMOSPHERES: Record<string, {
  sunColor: number;
  sunIntensity: number;
  skyColor: number;
  groundColor: number;
  fogColor: number;
  groundBaseColor: number;
}> = {
  'level-1': {
    sunColor: 0xfff4e0,
    sunIntensity: 2.0,
    skyColor: 0xc8d8e8,
    groundColor: 0x7a8a5a,
    fogColor: 0xadb2ba,
    groundBaseColor: 0x6b7268,
  },
  'level-2': {
    sunColor: 0xfb923c,
    sunIntensity: 2.2,
    skyColor: 0xfcd34d,
    groundColor: 0x92400e,
    fogColor: 0xf59e0b,
    groundBaseColor: 0x78350f,
  },
  'level-3': {
    sunColor: 0xe2e8f0,
    sunIntensity: 1.8,
    skyColor: 0x94a3b8,
    groundColor: 0x475569,
    fogColor: 0x64748b,
    groundBaseColor: 0x334155,
  },
  'level-4': {
    sunColor: 0xa5b4fc,
    sunIntensity: 1.5,
    skyColor: 0x4338ca,
    groundColor: 0x1e1b4b,
    fogColor: 0x312e81,
    groundBaseColor: 0x1e1b4b,
  },
  'level-5': {
    sunColor: 0x38bdf8,
    sunIntensity: 1.3,
    skyColor: 0x0f172a,
    groundColor: 0x020617,
    fogColor: 0x0b1120,
    groundBaseColor: 0x090d16,
  },
};

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

  // Keep View3D shadow & fog fast & cohesive (horizon blends before outer tiles)
  const view3d = new View3D({
    autoResize: true,
    shadowQuality: 'medium',
    toneMapping: 'aces',
    exposure: 1.0,
    environment: { skyColor: 0xc8d8e8, groundColor: 0x7a8a5a, intensity: 1 },
    background: 0xadb2ba,
    fog: { type: 'linear', color: 0xadb2ba, near: 26, far: 52 },
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
      maxDistance: 45,
      cascades: 2,
      lambda: 0.6,
    },
  });

  sun.position.set(11.4, 15, -5.3);
  sun.lookAt({ x: 0, y: 0, z: 0 });
  view3d.root.addChild(sun);

  // Expanded Ground plane matching meadow tones under all 5 levels
  const ground = new Mesh3D({
    geometry: new PlaneGeometry({ width: 340, height: 340 }),
    material: new Material3D({
      baseColor: 0x6b7268,
      metallic: 0.0,
      roughness: 0.9,
    }),
    castShadow: false,
    receiveShadow: true,
  });

  ground.rotation.set(-Math.PI / 2, 0, 0);
  ground.position.set(-30, -0.13, 0);
  view3d.root.addChild(ground);

  const applyAtmosphere = (trackId: string) => {
    const atmo = TRACK_ATMOSPHERES[trackId] || TRACK_ATMOSPHERES['level-1'];
    sun.color = atmo.sunColor;
    sun.intensity = atmo.sunIntensity;
    view3d.background = atmo.skyColor;
    (view3d as any).environment = {
      skyColor: atmo.skyColor,
      groundColor: atmo.groundColor,
      intensity: 1.0,
    };
    (view3d as any).fog = {
      type: 'linear',
      color: atmo.fogColor,
      near: trackId === 'level-3' ? 18 : 26,
      far: trackId === 'level-3' ? 44 : 52,
    };
    ground.material.baseColor = atmo.groundBaseColor;
  };

  // Track (defaults to Level 1)
  let currentTrackId = 'level-1';
  let track = buildTrack(view3d.root, sources, currentTrackId);
  applyAtmosphere(currentTrackId);

  // Physics covering huge multi-level terrain
  const physics = new PhysicsWorld(new Vector3(track.spawn[0], track.spawn[1], track.spawn[2]));
  physics.addStaticGround([-30, -0.125, 0], [170, 0.01, 170]);
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

  // Vehicle
  let currentColorKey = 'vehicle-truck-yellow';
  const vehicle = new Vehicle(sources[currentColorKey], physics, track.spawn, track.spawnYaw);
  vehicle.setTrack(track);
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

    rivalsManager.syncRemotePlayers(pendingRemotePlayers, dt);

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
      vehicle.isBoosting,
      vehicle.justLanded,
    );

    driftMarks.update(dt, vehicle);
    particles.update(app.ticker, vehicle);
    audio.update(
      dt,
      vehicle.linearSpeed / MAX_SPEED,
      input.z,
      vehicle.driftIntensity,
      vehicle.isBoosting,
    );

    if (vehicle.justLanded) {
      audio.playImpact(1.4);
    }

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
      applyAtmosphere(trackId);
      physics.rebuildWalls(track.walls);
      vehicle.setTrack(track);
      vehicle.setSpawn(track.spawn, track.spawnYaw);
      audio.resetGearbox();
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
      audio.resetGearbox();
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
      const maxSpd = vehicle.isBoosting ? MAX_SPEED * 1.30 : MAX_SPEED;
      const speedRatio = Math.min(1.28, Math.abs(vehicle.linearSpeed || 0) / MAX_SPEED);
      const mph = Math.round(speedRatio * 138);
      const kmh = Math.round(speedRatio * 222);
      const lapStats = lapTimer.getStats();

      // Live race position calculation
      const playerProgress = (lapStats.lap || 1) * 1000 + (lapStats.progressRatio * 1000);
      let rank = 1;
      let total = 1;

      // Compare against AI rivals
      const aiRanks = rivalsManager.getAiRanks?.() || [];
      if (rivalsManager._mode === 'ai') {
        total += aiRanks.length;
        const totalWps = track.waypoints.length || 1;
        for (const ai of aiRanks) {
          const aiProg = 1000 + (ai.wpIndex / totalWps) * 1000;
          if (aiProg > playerProgress) rank++;
        }
      }

      // Compare against multiplayer peers
      if (pendingRemotePlayers.length > 0) {
        total += pendingRemotePlayers.length;
        const totalWps = track.waypoints.length || 1;
        for (const p of pendingRemotePlayers) {
          let bestIdx = 0;
          let bestDistSq = Infinity;
          for (let i = 0; i < totalWps; i++) {
            const wp = track.waypoints[i];
            const dx = p.x - wp.x;
            const dz = p.z - wp.z;
            const dSq = dx * dx + dz * dz;
            if (dSq < bestDistSq) {
              bestDistSq = dSq;
              bestIdx = i;
            }
          }
          const pProg = (p.lap || 1) * 1000 + (bestIdx / totalWps) * 1000;
          if (pProg > playerProgress) rank++;
        }
      }

      return {
        speedNormalized: Math.min(1, Math.abs(vehicle.linearSpeed || 0) / maxSpd),
        mph,
        kmh,
        gear: mph <= 1 ? 0 : audio.getGear(),
        rpm: audio.getRpm(),
        nitro: vehicle.nitro,
        isBoosting: vehicle.isBoosting,
        airTime: vehicle.airTime,
        driftScore: vehicle.driftScore,
        currentDriftPoints: Math.round(vehicle.currentDriftPoints),
        position: rank,
        totalRacers: total,
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
