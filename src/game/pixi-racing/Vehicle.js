import { Container3D, Model3D, Quaternion, Vector3 } from '@pixi/3d';
import { rigidBody } from 'crashcat';

import { clamp, lerp } from './MathUtils';

const LINEAR_DAMP = 0.09;
export const MAX_SPEED = 1.75;

const DEFAULT_SPAWN = [3.5, 0.5, 5];

const _forward = new Vector3();
const _up = new Vector3(0, 1, 0);
const _xAxis = new Vector3(1, 0, 0);
const _zAxis = new Vector3(0, 0, 1);
const _q = new Quaternion();
const _qSteer = new Quaternion();
const _qSpin = new Quaternion();
const _qPitch = new Quaternion();
const _qRoll = new Quaternion();
const _qBodyTmp = new Quaternion();

function lerpAngle(a, b, t) {
  let diff = b - a;

  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;

  return a + diff * t;
}

export class Vehicle {
  container;
  root = null;

  bodyNode = null;
  wheels = [];
  wheelFL = null;
  wheelFR = null;
  wheelBL = null;
  wheelBR = null;

  _wheelSpinAngle = [0, 0, 0, 0];
  _wheelSteerAngle = { fl: 0, fr: 0 };
  _bodyPitch = 0;
  _bodyRoll = 0;
  _bodyInitQuat = new Quaternion();

  linearSpeed = 0;
  angularSpeed = 0;
  acceleration = 0;
  yaw = 0;

  spawn = [...DEFAULT_SPAWN];
  spawnYaw = 0;

  spherePos = new Vector3(DEFAULT_SPAWN[0], DEFAULT_SPAWN[1], DEFAULT_SPAWN[2]);
  sphereVel = new Vector3();
  modelVelocity = new Vector3();
  _prevModelPos = new Vector3();

  inputX = 0;
  inputZ = 0;
  driftIntensity = 0;

  physics;
  trackWaypoints = null;

  constructor(source, physics, spawn = DEFAULT_SPAWN, spawnYaw = 0) {
    this.physics = physics;
    this.spawn = [...spawn];
    this.spawnYaw = spawnYaw;
    this.yaw = spawnYaw;

    this.container = new Container3D();
    this.setSource(source);

    this.spherePos.set(this.spawn[0], this.spawn[1], this.spawn[2]);
    this.container.position.set(this.spawn[0], this.spawn[1] - 0.5, this.spawn[2]);
    this._prevModelPos.set(this.spawn[0], 0, this.spawn[2]);
    _q.setFromAxisAngle(_up, this.yaw);
    this.container.quaternion.copyFrom(_q);
  }

  /**
   * Swaps the visual truck 3D model without replacing the Vehicle instance
   * or resetting physics position, velocity, or steering state.
   */
  setSource(source) {
    if (this.root) {
      this.container.removeChild(this.root);
      this.root.destroy?.({ children: true });
      this.root = null;
    }

    this.wheels = [];
    this.bodyNode = null;
    this.wheelFL = null;
    this.wheelFR = null;
    this.wheelBL = null;
    this.wheelBR = null;

    const root = new Model3D(source);
    root.scale.set(0.5, 0.5, 0.5);
    this.container.addChild(root);
    this.root = root;

    this.bodyNode = root.getChildByLabel('body', true);
    if (this.bodyNode) this.bodyNode.quaternion.copyTo(this._bodyInitQuat);

    const wheelFL = root.getChildByLabel('wheel-front-left', true);
    const wheelFR = root.getChildByLabel('wheel-front-right', true);
    const wheelBL = root.getChildByLabel('wheel-back-left', true);
    const wheelBR = root.getChildByLabel('wheel-back-right', true);

    this.wheelFL = wheelFL;
    this.wheelFR = wheelFR;
    this.wheelBL = wheelBL;
    this.wheelBR = wheelBR;

    if (wheelFL) this.wheels.push(wheelFL);
    if (wheelFR) this.wheels.push(wheelFR);
    if (wheelBL) this.wheels.push(wheelBL);
    if (wheelBR) this.wheels.push(wheelBR);
  }

  setTrack(track) {
    this.trackWaypoints = track?.waypoints || null;
  }

  setSpawn(spawnPos, yaw = 0) {
    this.spawn = [...spawnPos];
    this.spawnYaw = yaw;
    this.reset();
  }

  reset() {
    const body = this.physics.sphereBody;
    rigidBody.setPosition(this.physics.world, body, this.spawn, false);
    rigidBody.setLinearVelocity(this.physics.world, body, [0, 0, 0]);
    rigidBody.setAngularVelocity(this.physics.world, body, [0, 0, 0]);
    this.spherePos.set(this.spawn[0], this.spawn[1], this.spawn[2]);
    this.sphereVel.set(0, 0, 0);
    this.modelVelocity.set(0, 0, 0);
    this.linearSpeed = 0;
    this.angularSpeed = 0;
    this.acceleration = 0;
    this.driftIntensity = 0;
    this.yaw = this.spawnYaw;
    this.container.position.set(this.spawn[0], this.spawn[1] - 0.5, this.spawn[2]);
    this._prevModelPos.set(this.spawn[0], 0, this.spawn[2]);
    _q.setFromAxisAngle(_up, this.yaw);
    this.container.quaternion.copyFrom(_q);
  }

  update(dt, input) {
    this.inputX = input.x;
    this.inputZ = input.z;

    if (input.touchActive && (this.inputX !== 0 || this.inputZ !== 0)) {
      const targetAngle = Math.atan2(this.inputX, this.inputZ);
      const slerpT = 1 - Math.exp(-3 * dt);

      this.yaw = lerpAngle(this.yaw, targetAngle, slerpT);

      _forward.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      const cross = _forward.x * this.inputZ - _forward.z * this.inputX;

      this.inputX = clamp(-cross * 2, -1, 1);
      this.linearSpeed = lerp(this.linearSpeed, MAX_SPEED, dt * 1.35);
    } else {
      let direction = Math.sign(this.linearSpeed);

      if (direction === 0)
        direction = Math.abs(this.inputZ) > 0.1 ? Math.sign(this.inputZ) : 1;

      const steeringGrip = clamp(Math.abs(this.linearSpeed), 0.2, 1.0);
      const targetAngular = -this.inputX * steeringGrip * 4 * direction;

      this.angularSpeed = lerp(this.angularSpeed, targetAngular, dt * 4);
      this.yaw += this.angularSpeed * dt;

      const targetSpeed = this.inputZ;

      if (targetSpeed < 0 && this.linearSpeed > 0.01) {
        this.linearSpeed = lerp(this.linearSpeed, 0, dt * 8);
      } else if (targetSpeed < 0) {
        this.linearSpeed = lerp(this.linearSpeed, targetSpeed * 0.55, dt * 2.2);
      } else {
        // Snappy launch & progressive pull up through all 6 gears
        const speedNorm = clamp(this.linearSpeed / MAX_SPEED, 0, 1);
        const accelRate = lerp(2.25, 1.35, speedNorm);
        this.linearSpeed = lerp(
          this.linearSpeed,
          targetSpeed * MAX_SPEED,
          dt * accelRate,
        );
      }
    }

    this.linearSpeed *= Math.max(0, 1 - LINEAR_DAMP * dt);

    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);
    const drive = this.linearSpeed * 100 * dt;
    const body = this.physics.sphereBody;
    const angvel = body.motionProperties.angularVelocity;

    rigidBody.setAngularVelocity(this.physics.world, body, [
      angvel[0] + rightX * drive,
      angvel[1],
      angvel[2] + rightZ * drive,
    ]);

    this.spherePos.set(body.position[0], body.position[1], body.position[2]);

    const linvel = body.motionProperties.linearVelocity;

    this.sphereVel.set(linvel[0], linvel[1], linvel[2]);

    this.acceleration = lerp(
      this.acceleration,
      this.linearSpeed + 0.25 * this.linearSpeed * Math.abs(this.linearSpeed),
      dt,
    );

    this._enforceTrackContainment(dt);

    if (this.spherePos.y < -10) {
      this.reset();
    }

    this.container.position.set(
      this.spherePos.x,
      this.spherePos.y - 0.5,
      this.spherePos.z,
    );

    _q.setFromAxisAngle(_up, this.yaw);
    this.container.quaternion.copyFrom(_q);

    if (dt > 0) {
      this.modelVelocity.set(
        (this.container.position.x - this._prevModelPos.x) / dt,
        (this.container.position.y - this._prevModelPos.y) / dt,
        (this.container.position.z - this._prevModelPos.z) / dt,
      );
      this._prevModelPos.set(
        this.container.position.x,
        this.container.position.y,
        this.container.position.z,
      );
    }

    this._updateBody(dt);
    this._updateWheels(dt);

    this.driftIntensity =
      Math.abs(this.linearSpeed - this.acceleration) +
      Math.abs(this._bodyRoll) * 2;
  }

  _updateBody(dt) {
    if (!this.bodyNode) return;

    this._bodyPitch = lerpAngle(
      this._bodyPitch,
      -(this.linearSpeed - this.acceleration) / 7,
      dt * 10,
    );
    const cappedSpeed = clamp(this.linearSpeed, -1.5, 1.5);
    this._bodyRoll = lerpAngle(
      this._bodyRoll,
      -(this.inputX / 5) * cappedSpeed,
      dt * 5,
    );

    _qPitch.setFromAxisAngle(_xAxis, this._bodyPitch);
    _qRoll.setFromAxisAngle(_zAxis, this._bodyRoll);
    _qBodyTmp.copyFrom(this._bodyInitQuat).multiply(_qPitch).multiply(_qRoll);
    this.bodyNode.quaternion.copyFrom(_qBodyTmp);

    this.bodyNode.position.y = lerp(this.bodyNode.position.y, 0.3, dt * 5);
  }

  _updateWheels(dt) {
    for (let i = 0; i < this.wheels.length; i++) {
      this._wheelSpinAngle[i] += this.acceleration;
    }

    const targetSteer = -this.inputX / 1.5;

    if (this.wheelFL) {
      this._wheelSteerAngle.fl = lerpAngle(
        this._wheelSteerAngle.fl,
        targetSteer,
        dt * 10,
      );
      this._applyWheelTransform(
        this.wheelFL,
        this._wheelSpinAngle[0],
        this._wheelSteerAngle.fl,
      );
    }
    if (this.wheelFR) {
      this._wheelSteerAngle.fr = lerpAngle(
        this._wheelSteerAngle.fr,
        targetSteer,
        dt * 10,
      );
      this._applyWheelTransform(
        this.wheelFR,
        this._wheelSpinAngle[1],
        this._wheelSteerAngle.fr,
      );
    }
    if (this.wheelBL) {
      this._applyWheelTransform(this.wheelBL, this._wheelSpinAngle[2], 0);
    }
    if (this.wheelBR) {
      this._applyWheelTransform(this.wheelBR, this._wheelSpinAngle[3], 0);
    }
  }

  _applyWheelTransform(wheel, spin, steer) {
    _qSteer.setFromAxisAngle(_up, steer);
    _qSpin.setFromAxisAngle(_xAxis, spin);
    _qSteer.multiply(_qSpin);
    wheel.quaternion.copyFrom(_qSteer);
  }

  /**
   * 3-Layer Track Containment:
   * Keeps the car strictly within the asphalt boundaries.
   * If the car grazes the outer wall, it is mathematically clamped and deflected back.
   * If collision velocity abruptly halts against a barrier/obstacle, linearSpeed decelerates.
   * If any extreme physics anomaly occurs, the vehicle instantly snaps to the centerline.
   */
  _enforceTrackContainment(dt) {
    if (!this.trackWaypoints || this.trackWaypoints.length < 3) return;

    const px = this.spherePos.x;
    const pz = this.spherePos.z;
    const wps = this.trackWaypoints;
    const len = wps.length;

    let minDistSq = Infinity;
    let closestX = px;
    let closestZ = pz;
    let segDirX = 0;
    let segDirZ = 1;

    for (let i = 0; i < len; i++) {
      const p1 = wps[i];
      const p2 = wps[(i + 1) % len];
      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const segLenSq = dx * dx + dz * dz;

      let qx, qz;
      if (segLenSq < 1e-6) {
        qx = p1.x;
        qz = p1.z;
      } else {
        const t = Math.max(0, Math.min(1, ((px - p1.x) * dx + (pz - p1.z) * dz) / segLenSq));
        qx = p1.x + t * dx;
        qz = p1.z + t * dz;
      }

      const distSq = (px - qx) * (px - qx) + (pz - qz) * (pz - qz);
      if (distSq < minDistSq) {
        minDistSq = distSq;
        closestX = qx;
        closestZ = qz;
        segDirX = dx;
        segDirZ = dz;
      }
    }

    const dist = Math.sqrt(minDistSq);
    // Road half-width is 3.75m. Safe limit for sphere center is 3.25m.
    const MAX_ROAD_DIST = 3.25;
    const body = this.physics.sphereBody;

    // Smooth boundary containment (keeps car on the road)
    if (dist > MAX_ROAD_DIST && dist > 1e-4) {
      const nx = (px - closestX) / dist;
      const nz = (pz - closestZ) / dist;

      const clampedX = closestX + nx * MAX_ROAD_DIST;
      const clampedZ = closestZ + nz * MAX_ROAD_DIST;

      this.spherePos.x = clampedX;
      this.spherePos.z = clampedZ;
      rigidBody.setPosition(this.physics.world, body, [clampedX, this.spherePos.y, clampedZ], false);

      const linvel = body.motionProperties.linearVelocity;
      const normalVel = linvel[0] * nx + linvel[2] * nz;
      if (normalVel > 0) {
        const bounce = 1.05;
        const newVx = linvel[0] - normalVel * nx * bounce;
        const newVz = linvel[2] - normalVel * nz * bounce;
        rigidBody.setLinearVelocity(this.physics.world, body, [newVx, linvel[1], newVz]);
        this.sphereVel.set(newVx, linvel[1], newVz);
      }

      this.linearSpeed *= 0.985;
    }

    // Failsafe auto-recovery: if car is ever knocked far away or flying wildly
    if (dist > 5.8 || this.spherePos.y < -0.4 || this.spherePos.y > 6.0) {
      const segMag = Math.hypot(segDirX, segDirZ) || 1;
      const targetYaw = Math.atan2(segDirX / segMag, segDirZ / segMag);

      this.spherePos.set(closestX, 0.5, closestZ);
      this.yaw = targetYaw;
      this.linearSpeed = Math.min(this.linearSpeed, 0.5);

      rigidBody.setPosition(this.physics.world, body, [closestX, 0.5, closestZ], false);
      rigidBody.setLinearVelocity(this.physics.world, body, [0, 0, 0]);
      rigidBody.setAngularVelocity(this.physics.world, body, [0, 0, 0]);
    }
  }
}
