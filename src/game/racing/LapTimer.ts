import * as THREE from "three";
import type { TrackData } from "./Track";

const STORAGE_KEY = "racing.bestLap.default";

export interface LapState {
  lap: number;
  currentLapTime: number;
  lastLapTime: number | null;
  bestLapTime: number | null;
  isNewBest: boolean;
  flashColor: string | null;
}

export class LapTimer {
  private _track: TrackData;
  private _lap = 1;
  private _bestLap: number | null = null;
  private _lastLap: number | null = null;
  private _currentLapTime = 0;
  private _running = false;

  private _prevFinishDist = 999;
  private _visitedCheckpoints = new Set<number>();
  private _flashTime = 0;
  private _flashColor: string | null = null;

  constructor(track: TrackData) {
    this._track = track;
    this._loadBest();
  }

  private _loadBest() {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      const n = v !== null ? Number(v) : NaN;
      this._bestLap = Number.isFinite(n) ? n : null;
    } catch {
      this._bestLap = null;
    }
  }

  private _saveBest(val: number) {
    try {
      localStorage.setItem(STORAGE_KEY, String(val));
    } catch {
      // ignore
    }
  }

  update(dt: number, carPos: THREE.Vector3, hasInput: boolean): LapState {
    if (!this._running && hasInput) {
      this._running = true;
    }

    if (this._running) {
      this._currentLapTime += dt;

      // Track checkpoints around circuit
      this._track.checkpoints.forEach((cp, idx) => {
        if (carPos.distanceTo(cp) < 9.0) {
          this._visitedCheckpoints.add(idx);
        }
      });

      // Finish line crossing check (near x=0, z=30)
      const distToFinish = carPos.distanceTo(this._track.finishCenter);
      const isCrossing = distToFinish < 4.5 && this._prevFinishDist >= 4.5;

      // Must have visited at least 70% of checkpoints to count as valid lap
      if (isCrossing && this._visitedCheckpoints.size >= Math.floor(this._track.checkpoints.length * 0.7)) {
        this._completeLap();
      }
      this._prevFinishDist = distToFinish;

      if (this._flashTime > 0) {
        this._flashTime -= dt;
        if (this._flashTime <= 0) {
          this._flashColor = null;
        }
      }
    }

    return {
      lap: this._lap,
      currentLapTime: this._currentLapTime,
      lastLapTime: this._lastLap,
      bestLapTime: this._bestLap,
      isNewBest: this._flashColor === "#5af168",
      flashColor: this._flashColor,
    };
  }

  private _completeLap() {
    const isBest = this._bestLap === null || this._currentLapTime < this._bestLap;
    this._lastLap = this._currentLapTime;
    if (isBest) {
      this._bestLap = this._currentLapTime;
      this._saveBest(this._bestLap);
      this._flashColor = "#5af168"; // green
    } else {
      this._flashColor = "#ff6e6e"; // red
    }
    this._flashTime = 1.4;

    this._lap += 1;
    this._currentLapTime = 0;
    this._visitedCheckpoints.clear();
  }
}

export function formatLapTime(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "--:--.--";
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}
