/**
 * RevSector 3D - Sector Timing & Lap Telemetry Core
 * Precision track sector validation, checkpoint forward-projection, and local record persistence.
 * Engineered by Kaushal.
 */

import { Container } from 'pixi.js';

const STORAGE_PREFIX = 'revsector.bestLap.';

function loadBest(key) {
  try {
    const v = localStorage.getItem(key);
    const n = v !== null ? Number(v) : NaN;
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function saveBest(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Storage may be unavailable (e.g. private browsing); silently ignore.
  }
}

export class LapTimer {
  container;

  _track;
  _storageKey = `${STORAGE_PREFIX}circuit`;

  _lap = 1;
  _bestLap;
  _lastLap = null;
  _currentLapTime = 0;
  _running = false;

  _prevForwardProj = null;
  _visited = new Set();

  _flashTime = 0;
  _isNewBest = false;

  constructor(track) {
    this._track = track;
    this._bestLap = loadBest(this._storageKey);
    // Lightweight container to maintain pipeline compatibility
    this.container = new Container();
  }

  resize(_width, _height) {
    // Canvas sizing handled by WebGPU viewport; HTML HUD scales natively
  }

  update(dt, position, hasInput) {
    if (!this._running && !hasInput) return;
    this._running = true;

    this._currentLapTime += dt;

    const cellSize = this._track.cellSize;
    const gx = Math.floor(position.x / cellSize);
    const gz = Math.floor(position.z / cellSize);
    const key = `${gx},${gz}`;

    if (this._track.requiredCellKeys.has(key)) {
      this._visited.add(key);
    }

    const dx = position.x - this._track.finishCenter.x;
    const dz = position.z - this._track.finishCenter.z;

    const forwardProj =
      dx * this._track.finishForward.x + dz * this._track.finishForward.z;
    const lateralProj = Math.abs(
      dx * this._track.finishRight.x + dz * this._track.finishRight.z,
    );

    if (this._prevForwardProj !== null) {
      const onLine = lateralProj <= cellSize * 0.5;
      const noTeleport = Math.abs(forwardProj - this._prevForwardProj) < 5;
      const crossedForward = this._prevForwardProj < 0 && forwardProj >= 0;

      if (onLine && noTeleport && crossedForward) {
        if (this._visited.size === this._track.requiredCellKeys.size) {
          this._completeLap();
        }
        this._visited.clear();
      }
    }

    this._prevForwardProj = forwardProj;

    if (this._flashTime > 0) {
      this._flashTime = Math.max(0, this._flashTime - dt);
    }
  }

  _completeLap() {
    const isBest =
      this._bestLap === null || this._currentLapTime < this._bestLap;

    this._lastLap = this._currentLapTime;
    if (isBest) {
      this._bestLap = this._currentLapTime;
      saveBest(this._storageKey, this._bestLap);
    }

    this._lap += 1;
    this._currentLapTime = 0;
    this._flashTime = 1.5;
    this._isNewBest = isBest;
  }

  getState() {
    return {
      lap: this._lap,
      currentLapTime: this._currentLapTime,
      lastLapTime: this._lastLap,
      bestLapTime: this._bestLap,
      isRunning: this._running,
      isFlash: this._flashTime > 0,
      isNewBest: this._isNewBest,
    };
  }
}
