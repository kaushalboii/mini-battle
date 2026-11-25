import { Container3D, Model3D, Quaternion, Vector3 } from '@pixi/3d';
import { lerp } from './MathUtils';

const _up = new Vector3(0, 1, 0);
const _xAxis = new Vector3(1, 0, 0);
const _zAxis = new Vector3(0, 0, 1);
const _q = new Quaternion();
const _qSpin = new Quaternion();
const _qRoll = new Quaternion();
const _qBodyTmp = new Quaternion();

function lerpAngle(a, b, t) {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

class VisualTruck {
  container;
  root;
  bodyNode = null;
  wheels = [];
  _bodyInitQuat = new Quaternion();
  _spin = 0;
  _roll = 0;
  x = 0;
  y = -0.13;
  z = 0;
  yaw = 0;
  modelKey;
  _ownsMaterials = false;

  constructor(source, modelKey, parent, alpha = 1) {
    this.modelKey = modelKey;
    this._ownsMaterials = alpha < 1;
    this.container = new Container3D();

    const root =
      alpha < 1
        ? new Model3D({
            source,
            castShadow: false,
            materials: (material) =>
              material.clone({ alphaMode: 'blend', alpha }),
          })
        : new Model3D(source);
    root.scale.set(0.5, 0.5, 0.5);
    this.container.addChild(root);
    this.root = root;

    this.bodyNode = root.getChildByLabel('body', true);
    if (this.bodyNode) this.bodyNode.quaternion.copyTo(this._bodyInitQuat);

    for (const label of [
      'wheel-front-left',
      'wheel-front-right',
      'wheel-back-left',
      'wheel-back-right',
    ]) {
      const w = root.getChildByLabel(label, true);
      if (w) this.wheels.push(w);
    }

    parent.addChild(this.container);
  }

  setPose(x, y, z, yaw, speed = 0, steerAmount = 0, dt = 0.016) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.yaw = yaw;

    this.container.position.set(x, y, z);
    _q.setFromAxisAngle(_up, yaw);
    this.container.quaternion.copyFrom(_q);

    this._spin += speed * dt * 12;
    _qSpin.setFromAxisAngle(_xAxis, this._spin);
    for (const w of this.wheels) {
      w.quaternion.copyFrom(_qSpin);
    }

    if (this.bodyNode) {
      this._roll = lerp(this._roll, -steerAmount * 0.14, Math.min(1, dt * 6));
      _qRoll.setFromAxisAngle(_zAxis, this._roll);
      _qBodyTmp.copyFrom(this._bodyInitQuat).multiply(_qRoll);
      this.bodyNode.quaternion.copyFrom(_qBodyTmp);
    }
  }

  destroy(parent) {
    parent.removeChild(this.container);
    this.container.destroy({ children: true, material: this._ownsMaterials });
  }
}

/**
 * Manages AI Rivals, Time Trial Best-Lap Ghost, and Remote Multiplayer Trucks.
 */
export class RivalsAndGhostManager {
  _parent;
  _sources;
  _track;
  _mode = 'solo'; // 'solo' | 'ghost' | 'ai'

  // AI State
  _aiAgents = [];

  // Time Trial Ghost State
  _ghostTruck = null;
  _recordingFrames = [];
  _recordTimer = 0;
  _bestLapFrames = null;
  _ghostTime = 0;
  _playerColor = 'vehicle-truck-yellow';

  // Remote Multiplayer Trucks
  _remoteTrucks = new Map();

  constructor(parent, sources, track) {
    this._parent = parent;
    this._sources = sources;
    this._track = track;
  }

  setTrack(track) {
    this._track = track;
    this._bestLapFrames = null;
    this.resetRecording();
    if (this._mode === 'ai') {
      this._spawnAiAgents();
    } else if (this._ghostTruck) {
      this._ghostTruck.container.visible = false;
    }
  }

  setMode(mode, playerColor = 'vehicle-truck-yellow') {
    this._mode = mode;
    this._playerColor = playerColor;
    this._clearAi();

    if (this._ghostTruck) {
      this._ghostTruck.destroy(this._parent);
      this._ghostTruck = null;
    }

    if (mode === 'ai') {
      this._spawnAiAgents();
    } else if (mode === 'ghost') {
      this._ghostTime = 0;
      if (this._bestLapFrames && this._bestLapFrames.length > 2) {
        this._ensureGhostTruck();
      }
    }
  }

  setPlayerColor(colorKey) {
    this._playerColor = colorKey;
    if (this._mode === 'ai') {
      this._spawnAiAgents();
    } else if (this._mode === 'ghost' && this._ghostTruck) {
      this._ghostTruck.destroy(this._parent);
      this._ghostTruck = null;
      if (this._bestLapFrames && this._bestLapFrames.length > 2) {
        this._ensureGhostTruck();
      }
    }
  }

  resetRecording() {
    this._recordingFrames = [];
    this._recordTimer = 0;
    this._ghostTime = 0;
  }

  onPlayerLapComplete(isBest) {
    if (isBest && this._recordingFrames.length > 10) {
      this._bestLapFrames = this._recordingFrames.slice();
      if (this._mode === 'ghost') {
        this._ensureGhostTruck();
      }
    }
    this.resetRecording();
  }

  _ensureGhostTruck() {
    if (this._ghostTruck || !this._sources[this._playerColor]) return;
    this._ghostTruck = new VisualTruck(
      this._sources[this._playerColor],
      this._playerColor,
      this._parent,
      0.42,
    );
  }

  _clearAi() {
    for (const a of this._aiAgents) {
      a.truck.destroy(this._parent);
    }
    this._aiAgents = [];
  }

  _spawnAiAgents() {
    this._clearAi();
    const wps = this._track.waypoints;
    if (!wps || wps.length < 3) return;

    const allKeys = [
      'vehicle-truck-red',
      'vehicle-truck-green',
      'vehicle-truck-purple',
      'vehicle-truck-yellow',
    ].filter((k) => k !== this._playerColor && this._sources[k]);

    const specs = [
      { speed: 9.2, laneOffset: -0.95, progressOffset: -1 },
      { speed: 8.5, laneOffset: 0.95, progressOffset: -2 },
      { speed: 7.8, laneOffset: -0.35, progressOffset: -3 },
    ];

    allKeys.slice(0, 3).forEach((key, idx) => {
      const spec = specs[idx];
      const truck = new VisualTruck(this._sources[key], key, this._parent, 1);

      const startIdx = (wps.length + Math.floor(spec.progressOffset)) % wps.length;
      const wp0 = wps[startIdx];
      const wp1 = wps[(startIdx + 1) % wps.length];
      const heading = Math.atan2(wp1.x - wp0.x, wp1.z - wp0.z);

      truck.setPose(wp0.x, -0.12, wp0.z, heading, 0, 0, 0.016);

      this._aiAgents.push({
        truck,
        wpIndex: (startIdx + 1) % wps.length,
        x: wp0.x,
        z: wp0.z,
        yaw: heading,
        baseSpeed: spec.speed,
        laneOffset: spec.laneOffset,
        phase: idx * 1.9,
      });
    });
  }

  resetAiToGrid() {
    if (this._mode === 'ai') {
      this._spawnAiAgents();
    }
    this.resetRecording();
  }

  update(dt, playerVehicle, playerIsDriving, elapsedTime) {
    // 1. Record current lap poses for Time Trial Ghost
    if (playerIsDriving) {
      this._recordTimer += dt;
      this._ghostTime += dt;
      if (this._recordTimer >= 0.05) {
        this._recordTimer = 0;
        this._recordingFrames.push({
          t: this._ghostTime,
          x: playerVehicle.container.position.x,
          y: playerVehicle.container.position.y,
          z: playerVehicle.container.position.z,
          yaw: playerVehicle.yaw,
          speed: playerVehicle.linearSpeed,
        });
      }
    }

    // 2. Update Ghost Replay Truck
    if (this._mode === 'ghost' && this._bestLapFrames && this._bestLapFrames.length > 2) {
      this._ensureGhostTruck();
      if (this._ghostTruck) {
        const frames = this._bestLapFrames;
        const duration = frames[frames.length - 1].t || 1;
        const loopT = this._ghostTime % duration;

        let idx = 0;
        while (idx < frames.length - 2 && frames[idx + 1].t < loopT) {
          idx++;
        }
        const f0 = frames[idx];
        const f1 = frames[idx + 1];
        const span = Math.max(0.001, f1.t - f0.t);
        const alpha = Math.max(0, Math.min(1, (loopT - f0.t) / span));

        this._ghostTruck.container.visible = true;
        this._ghostTruck.setPose(
          lerp(f0.x, f1.x, alpha),
          lerp(f0.y, f1.y, alpha),
          lerp(f0.z, f1.z, alpha),
          lerpAngle(f0.yaw, f1.yaw, alpha),
          lerp(f0.speed, f1.speed, alpha),
          0,
          dt,
        );
      }
    }

    // 3. Update AI Rivals
    if (this._mode === 'ai') {
      const wps = this._track.waypoints;
      for (const ai of this._aiAgents) {
        const targetWp = wps[ai.wpIndex];
        const prevWp = wps[(ai.wpIndex - 1 + wps.length) % wps.length];

        // Compute lane-offset target perpendicular to segment
        const segDx = targetWp.x - prevWp.x;
        const segDz = targetWp.z - prevWp.z;
        const segLen = Math.hypot(segDx, segDz) || 1;
        const rightX = segDz / segLen;
        const rightZ = -segDx / segLen;

        const tx = targetWp.x + rightX * ai.laneOffset;
        const tz = targetWp.z + rightZ * ai.laneOffset;

        const dx = tx - ai.x;
        const dz = tz - ai.z;
        const dist = Math.hypot(dx, dz);

        if (dist < 1.35) {
          ai.wpIndex = (ai.wpIndex + 1) % wps.length;
        }

        const desiredYaw = Math.atan2(dx, dz);
        let yawDiff = desiredYaw - ai.yaw;
        while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
        while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;

        ai.yaw = lerpAngle(ai.yaw, desiredYaw, Math.min(1, dt * 6.5));

        const cornerSlowdown = Math.max(0.58, 1 - Math.abs(yawDiff) * 0.45);
        const rubberBand = 1 + Math.sin(elapsedTime * 0.7 + ai.phase) * 0.08;
        const speed = ai.baseSpeed * cornerSlowdown * rubberBand;

        ai.x += Math.sin(ai.yaw) * speed * dt;
        ai.z += Math.cos(ai.yaw) * speed * dt;

        ai.truck.setPose(ai.x, -0.12, ai.z, ai.yaw, speed * 0.16, Math.max(-1, Math.min(1, yawDiff * 1.8)), dt);
      }
    }
  }

  /**
   * Syncs and interpolates remote multiplayer vehicles onto the 3D track.
   */
  syncRemotePlayers(playersList, dt) {
    const activeIds = new Set();
    for (const p of playersList) {
      if (p.isSelf) continue;
      activeIds.add(p.id);

      let entry = this._remoteTrucks.get(p.id);
      if (!entry || entry.color !== p.color) {
        if (entry) entry.truck.destroy(this._parent);
        const key = this._sources[p.color] ? p.color : 'vehicle-truck-red';
        const truck = new VisualTruck(this._sources[key], key, this._parent, 1);
        truck.setPose(p.x, p.y ?? -0.12, p.z, p.yaw ?? 0, p.speed ?? 0, 0, dt);
        entry = {
          truck,
          color: p.color,
          renderX: p.x,
          renderY: p.y ?? -0.12,
          renderZ: p.z,
          renderYaw: p.yaw ?? 0,
        };
        this._remoteTrucks.set(p.id, entry);
      } else {
        const smooth = Math.min(1, dt * 14);
        entry.renderX = lerp(entry.renderX, p.x, smooth);
        entry.renderY = lerp(entry.renderY, p.y ?? -0.12, smooth);
        entry.renderZ = lerp(entry.renderZ, p.z, smooth);
        entry.renderYaw = lerpAngle(entry.renderYaw, p.yaw ?? 0, smooth);
        entry.truck.setPose(
          entry.renderX,
          entry.renderY,
          entry.renderZ,
          entry.renderYaw,
          p.speed ?? 0,
          0,
          dt,
        );
      }
    }

    for (const [id, entry] of this._remoteTrucks.entries()) {
      if (!activeIds.has(id)) {
        entry.truck.destroy(this._parent);
        this._remoteTrucks.delete(id);
      }
    }
  }

  clearRemotePlayers() {
    for (const entry of this._remoteTrucks.values()) {
      entry.truck.destroy(this._parent);
    }
    this._remoteTrucks.clear();
  }

  destroy() {
    this._clearAi();
    this.clearRemotePlayers();
    if (this._ghostTruck) {
      this._ghostTruck.destroy(this._parent);
      this._ghostTruck = null;
    }
  }
}
