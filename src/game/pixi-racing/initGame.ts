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
import { TouchJoystick } from './TouchJoystick';
import { buildTrack } from './Track';
import { MAX_SPEED, Vehicle } from './Vehicle';
import { MultiplayerMesh, type PeerRacerInfo } from './MultiplayerMesh';

export interface GameInstance {
  app: Application;
  audio: GameAudio;
  vehicle: Vehicle;
  camera: FollowCamera;
  multiplayerMesh: MultiplayerMesh;
  setVehicleColor: (colorKey: string) => void;
  setDriverName: (name: string) => void;
  setRoomCode: (room: string) => void;
  getPeersList: () => PeerRacerInfo[];
  getConnectedCount: () => number;
  setCameraMode: (mode: string) => void;
  cycleCameraMode: () => string;
  resetPosition: () => void;
  destroy: () => void;
}

export async function initRacingGame(
  canvas: HTMLCanvasElement,
  onProgress?: (progress: number, label: string) => void,
  onPeersUpdated?: (peers: PeerRacerInfo[]) => void,
  initialDriverName = 'Kaushal',
  initialColorKey = 'vehicle-truck-yellow',
  initialRoomCode = 'WIFI-MESH'
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
  const track = buildTrack(view3d.root, sources);

  // Physics
  const physics = new PhysicsWorld(new Vector3(3.5, 0.5, 5));
  physics.addStaticGround([0, -0.125, 0], [50, 0.01, 50]);

  for (const wall of track.walls) {
    physics.addStaticBox(wall);
  }

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

      audio.playImpact(impactVelocity);
    },
  };

  // HUD
  const hudLayer = new Container();
  app.stage.addChild(hudLayer);

  const lapTimer = new LapTimer(track);
  hudLayer.addChild(lapTimer.container);

  const joystick = new TouchJoystick(app.screen.width, app.screen.height);
  hudLayer.addChild(joystick as any);

  const controls = new Controls(joystick as any);

  // FX
  const driftMarks = new DriftMarks(view3d.root);
  const particles = new SmokeTrails(view3d.root, smokeTexture);

  // Same-Wi-Fi Multiplayer Mesh
  const multiplayerMesh = new MultiplayerMesh(
    view3d.root,
    sources,
    initialDriverName,
    currentKey,
    initialRoomCode
  );
  if (onPeersUpdated) {
    multiplayerMesh.onPeersUpdated = onPeersUpdated;
  }

  let meshBroadcastTimer = 0;

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
    particles.update(app.ticker, vehicle);
    audio.update(
      dt,
      vehicle.linearSpeed / MAX_SPEED,
      input.z,
      vehicle.driftIntensity,
    );

    const hasInput =
      input.touchActive || Math.abs(input.x) > 0.05 || Math.abs(input.z) > 0.05;

    lapTimer.update(dt, vehicle.container.position, hasInput);

    // Broadcast local state across mesh at ~25Hz
    meshBroadcastTimer += dt;
    if (meshBroadcastTimer >= 0.04) {
      meshBroadcastTimer = 0;
      const lt = lapTimer as any;
      multiplayerMesh.broadcastLocalState(
        vehicle.container.position,
        vehicle.yaw,
        vehicle.linearSpeed,
        lt._lap || 1,
        lt._currentLapTime || 0,
        lt._bestLap ?? null
      );
    }

    // Animate & interpolate remote players
    multiplayerMesh.update(dt);
  };

  app.ticker.add(tickerFn);

  onProgress?.(1.0, 'Ready!');

  return {
    app,
    audio,
    vehicle,
    camera: followCamera,
    multiplayerMesh,
    setVehicleColor(newKey: string) {
      if (!sources[newKey] || newKey === currentKey) return;
      currentKey = newKey;
      view3d.root.removeChild(vehicle.container);
      const oldYaw = vehicle.yaw;
      vehicle = new Vehicle(sources[newKey], physics);
      vehicle.yaw = oldYaw;
      view3d.root.addChild(vehicle.container);
      multiplayerMesh.setVehicleColor(newKey);
    },
    setDriverName(name: string) {
      multiplayerMesh.setDriverName(name);
    },
    setRoomCode(room: string) {
      multiplayerMesh.setRoomCode(room);
    },
    getPeersList() {
      const lt = lapTimer as any;
      return multiplayerMesh.getPeersList(
        lt._lap || 1,
        lt._currentLapTime || 0,
        lt._bestLap ?? null,
        vehicle.linearSpeed
      );
    },
    getConnectedCount() {
      return multiplayerMesh.getConnectedCount();
    },
    setCameraMode(mode: string) {
      followCamera.setMode(mode);
    },
    cycleCameraMode() {
      return followCamera.cycleMode();
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
      multiplayerMesh.destroy();
      app.destroy(true, { children: true });
    },
  };
}
