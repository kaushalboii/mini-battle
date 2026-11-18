/**
 * RevSector 3D - Scene Graph & Real-Time Engine Coordinator
 * Custom WebGPU/WebGL 3D engine with rigid body dynamics, multi-circuit grid generation,
 * active rival racecar AI, zero-connect live multiplayer mesh, and sector telemetry.
 * Developed by Kaushal.
 */

import {
  AmbientLight,
  CubeGeometry,
  DirectionalLight,
  Material3D,
  Mesh3D,
  PlaneGeometry,
  PointLight,
  SpotLight,
  Vector3,
  View3D,
} from '@pixi/3d';
import { Application, Assets, Container } from 'pixi.js';

import { rendererPreference } from './getPreference';
import { model, models, texture } from './manifest';
import { GameAudio } from './Audio';
import { FollowCamera, CAMERA_MODES } from './Camera';
import { Controls } from './Controls';
import { DriftMarks } from './DriftMarks';
import { LapTimer } from './LapTimer';
import { SmokeTrails, NitroTrails } from './Particles';
import { PhysicsWorld } from './Physics';
import { TouchJoystick } from './TouchJoystick';
import { buildTrack, CIRCUITS, type CircuitDefinition } from './Track';
import { RivalGrid, type GridStanding } from './RivalGrid';
import { MAX_SPEED, Vehicle } from './Vehicle';

export { CAMERA_MODES };

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
  circuit?: CircuitDefinition;
}

export interface GameInstance {
  app: Application;
  audio: GameAudio;
  vehicle: Vehicle;
  camera: FollowCamera;
  rivalGrid: RivalGrid;
  setVehicleColor: (colorKey: string) => void;
  setDriverName: (name: string) => void;
  setCircuit: (circuitId: string) => void;
  setGameMode: (mode: 'friends' | 'bots' | 'solo') => void;
  setPracticeMode: (active: boolean) => void;
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
  onTelemetry?: (data: TelemetryData) => void,
  initialCircuitId: string = 'monza',
  initialPlayerName: string = 'Kaushal'
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
  });
  view3d.background = 0x60a5fa;
  view3d.fog = {
    type: 'linear',
    color: 0x7cb5ec,
    near: 45,
    far: 105,
  };
  app.stage.addChild(view3d);

  const ambientLight = new AmbientLight({
    color: 0xffffff,
    intensity: 0.75,
  });
  view3d.root.addChild(ambientLight);

  const sun = new DirectionalLight({
    color: 0xfffaed,
    intensity: 2.4,
    castShadow: true,
  });
  view3d.root.addChild(sun);

  const followCamera = new FollowCamera(view3d.camera);

  // Calibrate PBR material responses
  for (const key of MODEL_KEYS) {
    const s = sources[key];
    if (s?.materials) {
      for (const mat of s.materials) {
        if (mat.roughness !== undefined) {
          mat.roughness = 0.80;
          mat.metallic = 0.08;
        }
      }
    }
  }

  // F1 Starting Grid Slots (P1 - P6 alternating slots on main straight)
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

  // Circuit Generator & Rigid Colliders
  let currentCircuitId = initialCircuitId || 'monza';
  let track = buildTrack(view3d.root, sources, currentCircuitId);

  // Physics World
  const physics = new PhysicsWorld(new Vector3(2.8, 0.5, 5.2));
  physics.addStaticGround([0, -0.125, 0], [100, 0.01, 100]);

  let wallBodies: any[] = [];
  function setupWallColliders(walls: any[]) {
    for (const body of wallBodies) {
      physics.removeBody(body);
    }
    wallBodies = [];
    for (const wall of walls) {
      const body = physics.addStaticBox(wall);
      if (body) wallBodies.push(body);
    }
  }
  setupWallColliders(track.walls);

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

  // Player Vehicle
  let currentKey = 'vehicle-truck-yellow';
  let currentDriverName = initialPlayerName || 'Kaushal';
  let vehicle = new Vehicle(sources[currentKey], physics);
  view3d.root.addChild(vehicle.container);

  // Vehicle Headlight System (Night & Sunset Driving)
  const headlightBeam = new SpotLight({
    color: 0xfffaed,
    intensity: 0, // Off during daylight
    range: 48,
    coneAngle: 34,
    penumbra: 0.38,
    castShadow: false,
  });
  headlightBeam.position.set(0, 0.45, 0.85);
  headlightBeam.lookAt({ x: 0, y: 0.05, z: 25 });

  // Dynamic Brake Light Glow (Flares red behind car when braking or reversing)
  const brakeLightGlow = new PointLight({
    color: 0xef4444,
    intensity: 0,
    range: 5.5,
  });
  brakeLightGlow.position.set(0, 0.35, -1.05);

  function attachVehicleLights(targetContainer: any) {
    targetContainer.addChild(headlightBeam);
    targetContainer.addChild(brakeLightGlow);
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

  // Rival Grid & Live Instant Multiplayer Mesh
  const rivalGrid = new RivalGrid(
    view3d.root,
    sources,
    currentCircuitId,
    track.waypoints,
    currentKey,
    currentDriverName
  );

  let currentLightingTheme: 'day' | 'sunset' | 'night' = 'day';
  let telemetryTimer = 0;

  const tickerFn = () => {
    joystick.resize(app.screen.width, app.screen.height);

    const dt = Math.min(app.ticker.deltaMS / 1000, 1 / 30);
    const input = controls.update();

    physics.step(dt);
    vehicle.update(dt, input);

    // Update dynamic brake light glow
    const isBraking = input.z < 0 || vehicle.linearSpeed < -0.05;
    if (isBraking) {
      brakeLightGlow.intensity = 18;
    } else if (currentLightingTheme === 'night') {
      brakeLightGlow.intensity = 2.8;
    } else {
      brakeLightGlow.intensity = 0;
    }

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

    // Update Competitor / Multiplayer Grid
    rivalGrid.update(
      dt,
      vehicle.container.position.x,
      vehicle.container.position.z,
      vehicle.yaw,
      Math.abs(vehicle.linearSpeed),
      lapState.lap,
      lapState.trackProgress
    );

    // Car-to-Car Crash Physics: impulse deflection, momentum transfer, suspension shock, audio impact & screen shake
    rivalGrid.checkVehicleCollisions(vehicle, audio, followCamera);

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
      const standings = rivalGrid.getStandings(
        lapState.lap,
        lapState.trackProgress,
        speedKmh
      );

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
        standings,
        circuitId: currentCircuitId,
        circuit: track.circuit,
      });
    }
  };

  app.ticker.add(tickerFn);

  onProgress?.(1.0, 'Ready!');

  function applyLightingTheme(theme: 'day' | 'sunset' | 'night') {
    currentLightingTheme = theme;
    if (theme === 'sunset') {
      sun.color = 0xff9447;
      sun.intensity = 2.8;
      view3d.background = 0x581c87;
      view3d.fog = { type: 'linear', color: 0x8b5cf6, near: 40, far: 85 };
      view3d.environment = { skyColor: 0xf97316, groundColor: 0x2e1065, intensity: 1.3 };
      headlightBeam.intensity = 14;
    } else if (theme === 'night') {
      sun.color = 0xdbeafe;
      sun.intensity = 1.3;
      view3d.background = 0x070b14;
      view3d.fog = { type: 'linear', color: 0x070b14, near: 35, far: 70 };
      view3d.environment = { skyColor: 0x1e293b, groundColor: 0x020617, intensity: 0.85 };
      headlightBeam.intensity = 28; // High-Intensity Xenon Headlights at Night
    } else {
      // Grand Prix Daylight
      sun.color = 0xfffaed;
      sun.intensity = 2.4;
      view3d.background = 0x60a5fa;
      view3d.fog = { type: 'linear', color: 0x7cb5ec, near: 45, far: 105 };
      view3d.environment = { skyColor: 0x93c5fd, groundColor: 0x1c3a19, intensity: 1.15 };
      headlightBeam.intensity = 0; // Off during daylight
    }
  }

  return {
    app,
    audio,
    vehicle,
    camera: followCamera,
    rivalGrid,
    setVehicleColor(newKey: string) {
      if (!sources[newKey] || newKey === currentKey) return;
      currentKey = newKey;
      view3d.root.removeChild(vehicle.container);
      const oldYaw = vehicle.yaw;
      vehicle = new Vehicle(sources[newKey], physics);
      vehicle.yaw = oldYaw;
      attachVehicleLights(vehicle.container);
      view3d.root.addChild(vehicle.container);
      rivalGrid.setPlayerConfig(newKey, currentDriverName);
    },
    setDriverName(name: string) {
      currentDriverName = name;
      rivalGrid.setPlayerConfig(currentKey, name);
    },
    setCircuit(newCircuitId: string) {
      if (!CIRCUITS[newCircuitId] || newCircuitId === currentCircuitId) return;
      currentCircuitId = newCircuitId;

      // Remove existing 3D track mesh
      if (track.trackGroup && track.trackGroup.parent) {
        track.trackGroup.parent.removeChild(track.trackGroup);
      }

      // Build new circuit layout
      track = buildTrack(view3d.root, sources, newCircuitId);
      setupWallColliders(track.walls);

      // Reposition vehicle on starting grid
      vehicle.reset();
      lapTimer.setTrack(track);

      // Update rival waypoints
      rivalGrid.setCircuit(newCircuitId, track.waypoints);

      // If circuit has recommended lighting, auto-switch
      if (track.circuit?.recommendedTheme) {
        applyLightingTheme(track.circuit.recommendedTheme);
      }
    },
    setGameMode(mode: 'friends' | 'bots' | 'solo') {
      rivalGrid.setGameMode(mode);
    },
    setPracticeMode(active: boolean) {
      rivalGrid.setPracticeMode(active);
    },
    setCameraMode(mode: string) {
      followCamera.setMode(mode);
    },
    cycleCameraMode() {
      return followCamera.cycleMode();
    },
    setLightingTheme(theme: 'day' | 'sunset' | 'night') {
      applyLightingTheme(theme);
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
      rivalGrid.resetGrid();
    },
    destroy() {
      app.ticker.remove(tickerFn);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('pointerdown', unlockAudio);
      controls.destroy();
      audio.destroy();
      rivalGrid.destroy();
      app.destroy(true, { children: true });
    },
  };
}
