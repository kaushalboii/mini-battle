import { Vector3 } from '@pixi/3d';
import { clamp, lerp } from './MathUtils';

export const CAMERA_MODES = [
  { key: 'chase', label: 'Chase View', desc: 'Behind Vehicle (Default)' },
  { key: 'chase-close', label: 'Close Follow', desc: 'Tight Bumper Cam' },
  { key: 'hood', label: 'Hood View', desc: 'First-Person Hood Cam' },
  { key: 'isometric', label: 'Isometric', desc: 'Top-Down Angled (Original)' },
  { key: 'aerial', label: 'Aerial View', desc: 'Bird’s-Eye Overhead' },
];

const _desired = new Vector3();
const _delta = new Vector3();
const _lookPoint = new Vector3();

function lerpAngle(a, b, t) {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

export class FollowCamera {
  camera;
  mode = 'chase';

  // Isometric mode defaults
  offset = new Vector3(9.27, 9.18, 9.27);
  camRightXZ = new Vector3();
  camForwardXZ = new Vector3();
  leadFactor = 3.0;
  cameraSmoothing = 2.0;
  deadzoneRadius = 5.0;
  screenShiftUp = 1.0;
  _smoothedDesired = new Vector3();

  // Chase mode tracking
  _smoothedYaw = 0;
  _smoothedCamPos = new Vector3();
  _smoothedLookPos = new Vector3();
  _initialized = false;
  _shakeAmount = 0;

  constructor(camera) {
    this.camera = camera;
    this.camera.fov = 48;
    this.camera.near = 0.1;
    this.camera.far = 200;

    this.camRightXZ.set(this.offset.z, 0, -this.offset.x).normalize();
    this.camForwardXZ.set(-this.offset.x, 0, -this.offset.z).normalize();
  }

  triggerShake(amount = 0.5) {
    this._shakeAmount = Math.max(this._shakeAmount, amount);
  }

  setMode(newMode) {
    if (this.mode === newMode) return;
    this.mode = newMode;
    this._initialized = false;
  }

  cycleMode() {
    const keys = CAMERA_MODES.map((m) => m.key);
    const idx = keys.indexOf(this.mode);
    const nextKey = keys[(idx + 1) % keys.length];
    this.setMode(nextKey);
    return nextKey;
  }

  getModeInfo() {
    return CAMERA_MODES.find((m) => m.key === this.mode) || CAMERA_MODES[0];
  }

  update(dt, target, velocity, yaw = 0, speed = 0) {
    if (this.mode === 'isometric') {
      this._updateIsometric(dt, target, velocity);
    } else if (this.mode === 'aerial') {
      this._updateAerial(dt, target, yaw);
    } else if (this.mode === 'hood') {
      this._updateHood(dt, target, yaw, speed);
    } else if (this.mode === 'chase-close') {
      this._updateChase(dt, target, velocity, yaw, speed, 3.0, 1.4, 52, 2.5, 0.4);
    } else {
      // Default: chase
      this._updateChase(dt, target, velocity, yaw, speed, 4.4, 2.1, 48, 2.0, 0.5);
    }

    if (this._shakeAmount > 0.01) {
      this.camera.position.x += (Math.random() - 0.5) * this._shakeAmount;
      this.camera.position.y += (Math.random() - 0.5) * this._shakeAmount;
      this.camera.position.z += (Math.random() - 0.5) * this._shakeAmount;
      this._shakeAmount = Math.max(0, this._shakeAmount - dt * 3.5);
    }
  }

  _updateChase(dt, target, velocity, yaw, speed, dist, height, baseFov, lookAhead, lookY) {
    // Dynamic FOV with speed
    const targetFov = baseFov + clamp(Math.abs(speed), 0, 1.5) * 6;
    this.camera.fov = lerp(this.camera.fov, targetFov, Math.min(1, dt * 4));

    // Smoothly track vehicle heading (yaw)
    const yawAlpha = this._initialized ? 1 - Math.exp(-dt * 6.5) : 1;
    this._smoothedYaw = lerpAngle(this._smoothedYaw, yaw, yawAlpha);

    const backX = -Math.sin(this._smoothedYaw);
    const backZ = -Math.cos(this._smoothedYaw);
    const forwardX = Math.sin(this._smoothedYaw);
    const forwardZ = Math.cos(this._smoothedYaw);

    const desiredX = target.x + backX * dist;
    const desiredY = target.y + height;
    const desiredZ = target.z + backZ * dist;

    const desiredLookX = target.x + forwardX * lookAhead;
    const desiredLookY = target.y + lookY;
    const desiredLookZ = target.z + forwardZ * lookAhead;

    if (!this._initialized) {
      this._smoothedCamPos.set(desiredX, desiredY, desiredZ);
      this._smoothedLookPos.set(desiredLookX, desiredLookY, desiredLookZ);
      this._smoothedYaw = yaw;
      this._initialized = true;
    } else {
      const posAlpha = 1 - Math.exp(-dt * 10);
      this._smoothedCamPos.x = lerp(this._smoothedCamPos.x, desiredX, posAlpha);
      this._smoothedCamPos.y = lerp(this._smoothedCamPos.y, desiredY, posAlpha);
      this._smoothedCamPos.z = lerp(this._smoothedCamPos.z, desiredZ, posAlpha);

      const lookAlpha = 1 - Math.exp(-dt * 12);
      this._smoothedLookPos.x = lerp(this._smoothedLookPos.x, desiredLookX, lookAlpha);
      this._smoothedLookPos.y = lerp(this._smoothedLookPos.y, desiredLookY, lookAlpha);
      this._smoothedLookPos.z = lerp(this._smoothedLookPos.z, desiredLookZ, lookAlpha);
    }

    this.camera.position.copyFrom(this._smoothedCamPos);
    this.camera.lookAt(this._smoothedLookPos);
  }

  _updateHood(dt, target, yaw, speed) {
    const targetFov = 62 + clamp(Math.abs(speed), 0, 1.5) * 8;
    this.camera.fov = lerp(this.camera.fov, targetFov, Math.min(1, dt * 4));

    this._smoothedYaw = yaw;
    const forwardX = Math.sin(yaw);
    const forwardZ = Math.cos(yaw);

    // Mounted on hood
    const camX = target.x + forwardX * 0.2;
    const camY = target.y + 0.65;
    const camZ = target.z + forwardZ * 0.2;

    const lookX = target.x + forwardX * 6.0;
    const lookY = target.y + 0.5;
    const lookZ = target.z + forwardZ * 6.0;

    if (!this._initialized) {
      this._smoothedCamPos.set(camX, camY, camZ);
      this._smoothedLookPos.set(lookX, lookY, lookZ);
      this._initialized = true;
    } else {
      const posAlpha = 1 - Math.exp(-dt * 16);
      this._smoothedCamPos.x = lerp(this._smoothedCamPos.x, camX, posAlpha);
      this._smoothedCamPos.y = lerp(this._smoothedCamPos.y, camY, posAlpha);
      this._smoothedCamPos.z = lerp(this._smoothedCamPos.z, camZ, posAlpha);

      this._smoothedLookPos.set(lookX, lookY, lookZ);
    }

    this.camera.position.copyFrom(this._smoothedCamPos);
    this.camera.lookAt(this._smoothedLookPos);
  }

  _updateAerial(dt, target, yaw) {
    this.camera.fov = 44;
    const targetHeight = 16.0;

    const desiredX = target.x;
    const desiredY = target.y + targetHeight;
    const desiredZ = target.z;

    const forwardX = Math.sin(yaw);
    const forwardZ = Math.cos(yaw);

    // Look slightly ahead of car
    const lookX = target.x + forwardX * 1.5;
    const lookY = target.y;
    const lookZ = target.z + forwardZ * 1.5;

    if (!this._initialized) {
      this._smoothedCamPos.set(desiredX, desiredY, desiredZ);
      this._smoothedLookPos.set(lookX, lookY, lookZ);
      this._initialized = true;
    } else {
      const posAlpha = 1 - Math.exp(-dt * 8);
      this._smoothedCamPos.x = lerp(this._smoothedCamPos.x, desiredX, posAlpha);
      this._smoothedCamPos.y = lerp(this._smoothedCamPos.y, desiredY, posAlpha);
      this._smoothedCamPos.z = lerp(this._smoothedCamPos.z, desiredZ, posAlpha);

      this._smoothedLookPos.set(lookX, lookY, lookZ);
    }

    this.camera.position.copyFrom(this._smoothedCamPos);
    this.camera.lookAt(this._smoothedLookPos);
  }

  _updateIsometric(dt, target, velocity) {
    this.camera.fov = 40;
    const radius = this.deadzoneRadius;
    const radiusSq = radius * radius;

    let leadX =
      (velocity.x * this.camRightXZ.x +
        velocity.y * this.camRightXZ.y +
        velocity.z * this.camRightXZ.z) *
      this.leadFactor;
    let leadY =
      (velocity.x * this.camForwardXZ.x +
        velocity.y * this.camForwardXZ.y +
        velocity.z * this.camForwardXZ.z) *
      this.leadFactor;

    const leadLenSq = leadX * leadX + leadY * leadY;

    if (leadLenSq > radiusSq) {
      const k = radius / Math.sqrt(leadLenSq);
      leadX *= k;
      leadY *= k;
    }

    _desired
      .copyFrom(target)
      .addScaledVector(this.camRightXZ, leadX)
      .addScaledVector(this.camForwardXZ, leadY);

    const alpha = this._initialized
      ? 1 - Math.exp(-dt * this.cameraSmoothing)
      : 1;
    const inv = 1 - alpha;

    this._smoothedDesired.x =
      this._smoothedDesired.x * inv + _desired.x * alpha;
    this._smoothedDesired.y =
      this._smoothedDesired.y * inv + _desired.y * alpha;
    this._smoothedDesired.z =
      this._smoothedDesired.z * inv + _desired.z * alpha;
    this._initialized = true;

    _delta.set(
      target.x - this._smoothedDesired.x,
      target.y - this._smoothedDesired.y,
      target.z - this._smoothedDesired.z,
    );

    const offsetX =
      _delta.x * this.camRightXZ.x +
      _delta.y * this.camRightXZ.y +
      _delta.z * this.camRightXZ.z;
    const offsetY =
      _delta.x * this.camForwardXZ.x +
      _delta.y * this.camForwardXZ.y +
      _delta.z * this.camForwardXZ.z;
    const offsetLenSq = offsetX * offsetX + offsetY * offsetY;

    if (offsetLenSq > radiusSq) {
      const offsetLen = Math.sqrt(offsetLenSq);
      const k = (offsetLen - radius) / offsetLen;

      this._smoothedDesired.addScaledVector(this.camRightXZ, offsetX * k);
      this._smoothedDesired.addScaledVector(this.camForwardXZ, offsetY * k);
    }

    _lookPoint
      .copyFrom(this._smoothedDesired)
      .addScaledVector(this.camForwardXZ, -this.screenShiftUp);

    this.camera.position.set(
      _lookPoint.x + this.offset.x,
      _lookPoint.y + this.offset.y,
      _lookPoint.z + this.offset.z,
    );
    this.camera.lookAt(_lookPoint);
  }
}
