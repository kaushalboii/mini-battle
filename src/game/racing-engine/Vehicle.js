/**
 * Apex Drift 3D - Vehicle Dynamics & Physics Controller
 * Handles arcade chassis dynamics, steering grip, nitrous injection, wheel rotation, and suspension roll.
 */

import { Container3D, Model3D, Quaternion, Vector3 } from '@pixi/3d';
import { rigidBody } from 'crashcat';
import { clamp, lerp } from './MathUtils';

const LINEAR_DAMP = 0.1;
export const MAX_SPEED = 1.5;

const SPAWN = [3.5, 0.5, 5];

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

  // Nitro System & Drift Points
  nitroAmount = 100;
  isBoosting = false;
  driftScore = 0;
  currentDriftPoints = 0;
  lastBankedDrift = 0;

  spherePos = new Vector3(SPAWN[0], SPAWN[1], SPAWN[2]);
  sphereVel = new Vector3();
  modelVelocity = new Vector3();
  _prevModelPos = new Vector3();

  inputX = 0;
  inputZ = 0;
  driftIntensity = 0;

  physics;

  constructor(source, physics) {
    this.physics = physics;
    this.container = new Container3D();

    const root = new Model3D(source);
    root.scale.set(0.5, 0.5, 0.5);
    this.container.addChild(root);

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

    this.container.position.set(SPAWN[0], SPAWN[1] - 0.5, SPAWN[2]);
    this._prevModelPos.set(SPAWN[0], 0, SPAWN[2]);
  }

  reset() {
    const body = this.physics.sphereBody;
    rigidBody.setPosition(this.physics.world, body, SPAWN, false);
    rigidBody.setLinearVelocity(this.physics.world, body, [0, 0, 0]);
    rigidBody.setAngularVelocity(this.physics.world, body, [0, 0, 0]);
    this.spherePos.set(SPAWN[0], SPAWN[1], SPAWN[2]);
    this.sphereVel.set(0, 0, 0);
    this.linearSpeed = 0;
    this.angularSpeed = 0;
    this.acceleration = 0;
    this.yaw = 0;
    this.isBoosting = false;
    this.currentDriftPoints = 0;
    this.driftScore = 0;
    this.nitroAmount = 100;
    this.container.position.set(SPAWN[0], SPAWN[1] - 0.5, SPAWN[2]);
    this._prevModelPos.set(SPAWN[0], 0, SPAWN[2]);
  }

  update(dt, input) {
    this.inputX = input.x;
    this.inputZ = input.z;

    const wantsNitro = Boolean(input.nitro) && this.nitroAmount > 5 && this.inputZ > 0;
    this.isBoosting = wantsNitro;

    if (wantsNitro) {
      this.nitroAmount = Math.max(0, this.nitroAmount - dt * 26);
    } else {
      this.nitroAmount = Math.min(100, this.nitroAmount + dt * 10);
    }

    // Direction & Steering Dynamics
    // When moving forward: direction = 1; when reversing: direction = -1
    let direction = 1;
    if (this.linearSpeed < -0.05) {
      direction = -1;
    }

    // Steering grip scales with speed, with minimum response when stationary
    const speedRatio = Math.abs(this.linearSpeed) / MAX_SPEED;
    const steeringGrip = clamp(speedRatio * 1.2, 0.35, 1.0);
    const targetAngular = -this.inputX * steeringGrip * 3.8 * direction;

    this.angularSpeed = lerp(this.angularSpeed, targetAngular, dt * 6);
    this.yaw += this.angularSpeed * dt;

    // Unified Forward, Braking & Reversing Physics
    const topForwardSpeed = wantsNitro ? MAX_SPEED * 1.55 : MAX_SPEED;
    const topReverseSpeed = -MAX_SPEED * 0.45; // Smooth reverse ratio (~38 km/h)

    if (this.inputZ > 0) {
      // Accelerating Forward
      const accelRate = wantsNitro ? dt * 3.8 : dt * 1.8;
      this.linearSpeed = lerp(this.linearSpeed, this.inputZ * topForwardSpeed, accelRate);
    } else if (this.inputZ < 0) {
      // Braking while moving forward, or accelerating backwards into reverse
      if (this.linearSpeed > 0.05) {
        // High-friction disc braking
        this.linearSpeed = lerp(this.linearSpeed, 0, dt * 9.0);
      } else {
        // Smoothly drive backwards in reverse
        this.linearSpeed = lerp(this.linearSpeed, topReverseSpeed, dt * 2.8);
      }
    } else {
      // Coasting / Neutral Engine Braking
      this.linearSpeed = lerp(this.linearSpeed, 0, dt * 2.2);
    }

    this.linearSpeed *= Math.max(0, 1 - LINEAR_DAMP * dt);

    // Drive rolling sphere
    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);
    const drivePower = wantsNitro ? 140 : 100;
    const drive = this.linearSpeed * drivePower * dt;
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

    // Drift scoring & Nitro bonus
    if (this.driftIntensity > 0.65 && Math.abs(this.linearSpeed) > 0.2) {
      this.nitroAmount = Math.min(100, this.nitroAmount + dt * 22);
      this.currentDriftPoints += Math.round(dt * 380 * this.driftIntensity);
    } else {
      if (this.currentDriftPoints > 30) {
        this.driftScore += this.currentDriftPoints;
        this.lastBankedDrift = this.currentDriftPoints;
      }
      this.currentDriftPoints = 0;
    }
  }

  _updateBody(dt) {
    if (!this.bodyNode) return;

    this._bodyPitch = lerpAngle(
      this._bodyPitch,
      -(this.linearSpeed - this.acceleration) / 6,
      dt * 12,
    );

    const rollT = clamp(Math.abs(this.linearSpeed) / 0.5, 0, 1);
    const targetRoll = this.angularSpeed * 0.05 * rollT;

    this._bodyRoll = lerpAngle(this._bodyRoll, targetRoll, dt * 12);

    _qPitch.setFromAxisAngle(_xAxis, this._bodyPitch);
    _qRoll.setFromAxisAngle(_zAxis, this._bodyRoll);
    _qBodyTmp.multiply(_qPitch, _qRoll);
    this.bodyNode.quaternion.multiply(this._bodyInitQuat, _qBodyTmp);
  }

  _updateWheels(dt) {
    const wheelRotSpeed = this.linearSpeed / 0.5;

    for (let i = 0; i < 4; i++) {
      this._wheelSpinAngle[i] += wheelRotSpeed * dt * 20;
    }

    const steerTarget = -this.inputX * 0.45;

    this._wheelSteerAngle.fl = lerp(
      this._wheelSteerAngle.fl,
      steerTarget,
      dt * 15,
    );
    this._wheelSteerAngle.fr = lerp(
      this._wheelSteerAngle.fr,
      steerTarget,
      dt * 15,
    );

    const frontWheels = [
      [this.wheelFL, this._wheelSpinAngle[0], this._wheelSteerAngle.fl],
      [this.wheelFR, this._wheelSpinAngle[1], this._wheelSteerAngle.fr],
    ];

    for (const [wheel, spin, steer] of frontWheels) {
      if (!wheel) continue;
      _qSteer.setFromAxisAngle(_up, steer);
      _qSpin.setFromAxisAngle(_xAxis, spin);
      wheel.quaternion.multiply(_qSteer, _qSpin);
    }

    const rearWheels = [
      [this.wheelBL, this._wheelSpinAngle[2]],
      [this.wheelBR, this._wheelSpinAngle[3]],
    ];

    for (const [wheel, spin] of rearWheels) {
      if (!wheel) continue;
      _qSpin.setFromAxisAngle(_xAxis, spin);
      wheel.quaternion.copyFrom(_qSpin);
    }
  }
}
