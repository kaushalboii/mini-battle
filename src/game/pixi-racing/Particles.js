import { Vector3 } from '@pixi/3d';
import { ConeShape, ParticleSystem3D } from '@pixi/3d/extras';

// Sizes are matched to the racer this demo was ported from, whose point
// sprites had a pixel size decoupled from the field of view. PixiJS 3D particles
// are world-space diameters, so the base size is tan(fov/2) at the racing
// camera's 40°: the same pixel footprint, with proper FOV behaviour on top.
const BASE_SIZE = Math.tan((40 * Math.PI) / 180 / 2); // ≈ 0.364

const EMIT_THRESHOLD = 0.7;
const PER_WHEEL = 3;
const Y_OFFSET = 0.05;

const _wheelPos = new Vector3();

/**
 * Drift smoke. One {@link ParticleSystem3D} shared by both rear wheels — a
 * single draw call and a single streaming buffer — with the puffs left behind
 * in world space as the car drives away from them.
 *
 * Emission is manual: the car only smokes while it's actually sliding, so
 * `emitRate` stays at 0 and the drift check spawns at each wheel instead. The
 * cone shape supplies the scatter around the given point.
 */
export class SmokeTrails {
  _system;
  _nitroSystem;

  constructor(parent, smokeTexture) {
    this._system = new ParticleSystem3D({
      texture: smokeTexture,
      capacity: 1280,
      autoUpdate: false,
      emitRate: 0,
      shape: new ConeShape({ angle: 25, radius: 0.09 }),
      life: 2.2,
      speed: [0.5, 1],
      size: [BASE_SIZE * 0.25, BASE_SIZE * 0.5],
      sizeEnd: [BASE_SIZE * 1.5, BASE_SIZE * 3],
      alpha: 0.25,
      alphaEnd: 0,
      color: 0xb8bcc4,
      drag: 1,
    });

    // Electric Cyan Nitro Flame Particle System
    this._nitroSystem = new ParticleSystem3D({
      texture: smokeTexture,
      capacity: 640,
      autoUpdate: false,
      emitRate: 0,
      shape: new ConeShape({ angle: 12, radius: 0.05 }),
      life: 0.35,
      speed: [1.8, 3.2],
      size: [BASE_SIZE * 0.3, BASE_SIZE * 0.6],
      sizeEnd: [BASE_SIZE * 0.9, BASE_SIZE * 1.5],
      alpha: 0.75,
      alphaEnd: 0,
      color: 0x00e5ff,
      drag: 0.5,
    });

    parent.addChild(this._system);
    parent.addChild(this._nitroSystem);
  }

  update(ticker, vehicle) {
    const groundY = vehicle.container.position.y + Y_OFFSET;

    // 1. Drift smoke trails
    if (vehicle.driftIntensity > EMIT_THRESHOLD) {
      for (const wheel of [vehicle.wheelBL, vehicle.wheelBR]) {
        if (!wheel) continue;

        wheel.worldTransform.extractPosition(_wheelPos);
        _wheelPos.y = groundY;

        this._system.spawn(PER_WHEEL, { position: _wheelPos });
      }
    }

    // 2. Jump landing dust puff
    if (vehicle.justLanded) {
      for (const wheel of [vehicle.wheelBL, vehicle.wheelBR]) {
        if (!wheel) continue;
        wheel.worldTransform.extractPosition(_wheelPos);
        _wheelPos.y = groundY;
        this._system.spawn(8, { position: _wheelPos });
      }
    }

    // 3. Nitro boost dual exhaust flames
    if (vehicle.isBoosting) {
      for (const wheel of [vehicle.wheelBL, vehicle.wheelBR]) {
        if (!wheel) continue;
        wheel.worldTransform.extractPosition(_wheelPos);
        _wheelPos.y = groundY + 0.12;
        this._nitroSystem.spawn(4, { position: _wheelPos });
      }
    }

    this._system.update(ticker);
    this._nitroSystem.update(ticker);
  }
}
