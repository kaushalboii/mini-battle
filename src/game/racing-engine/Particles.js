/**
 * RevSector 3D - Particle FX Systems
 * Manages tire smoke plumes during slides and electric-cyan nitrous flame exhaust.
 * Engineered by Kaushal.
 */

import { Vector3 } from '@pixi/3d';
import { ConeShape, ParticleSystem3D } from '@pixi/3d/extras';

const BASE_SIZE = Math.tan((40 * Math.PI) / 180 / 2); // ≈ 0.364
const EMIT_THRESHOLD = 0.7;
const PER_WHEEL = 3;
const Y_OFFSET = 0.05;

const _wheelPos = new Vector3();

/**
 * Tire smoke trails emitted during power drifts.
 */
export class SmokeTrails {
  _system;

  constructor(parent, smokeTexture) {
    this._system = new ParticleSystem3D({
      texture: smokeTexture,
      capacity: 1280,
      autoUpdate: false,
      emitRate: 0,
      shape: new ConeShape({ angle: 25, radius: 0.09 }),
      life: 2.5,
      speed: [0.5, 1],
      size: [BASE_SIZE * 0.25, BASE_SIZE * 0.5],
      sizeEnd: [BASE_SIZE * 1.5, BASE_SIZE * 3],
      alpha: 0.25,
      alphaEnd: 0,
      color: 0xb8bcc4,
      drag: 1,
    });

    parent.addChild(this._system);
  }

  update(ticker, vehicle) {
    if (vehicle.driftIntensity > EMIT_THRESHOLD) {
      const groundY = vehicle.container.position.y + Y_OFFSET;

      for (const wheel of [vehicle.wheelBL, vehicle.wheelBR]) {
        if (!wheel) continue;

        wheel.worldTransform.extractPosition(_wheelPos);
        _wheelPos.y = groundY;

        this._system.spawn(PER_WHEEL, { position: _wheelPos });
      }
    }

    this._system.update(ticker);
  }
}

/**
 * High-velocity Nitrous Flame exhaust particles.
 */
export class NitroTrails {
  _system;

  constructor(parent, smokeTexture) {
    this._system = new ParticleSystem3D({
      texture: smokeTexture,
      capacity: 640,
      autoUpdate: false,
      emitRate: 0,
      shape: new ConeShape({ angle: 15, radius: 0.06 }),
      life: 0.35,
      speed: [3.5, 6.0],
      size: [BASE_SIZE * 0.35, BASE_SIZE * 0.6],
      sizeEnd: [BASE_SIZE * 0.08, BASE_SIZE * 0.15],
      alpha: 0.9,
      alphaEnd: 0,
      color: 0x38bdf8, // Electric cyan nitro flame
      drag: 0.4,
    });

    parent.addChild(this._system);
  }

  update(ticker, vehicle) {
    if (vehicle.isBoosting) {
      const exhaustY = vehicle.container.position.y + 0.22;

      for (const wheel of [vehicle.wheelBL, vehicle.wheelBR]) {
        if (!wheel) continue;

        wheel.worldTransform.extractPosition(_wheelPos);
        _wheelPos.y = exhaustY;

        this._system.spawn(5, { position: _wheelPos });
      }
    }

    this._system.update(ticker);
  }
}
