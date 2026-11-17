import * as THREE from "three";

const _desired = new THREE.Vector3();
const _delta = new THREE.Vector3();
const _lookPoint = new THREE.Vector3();

export class FollowCamera {
  camera: THREE.PerspectiveCamera;
  offset = new THREE.Vector3(9.27, 9.18, 9.27);

  camRightXZ = new THREE.Vector3();
  camForwardXZ = new THREE.Vector3();

  leadFactor = 3.0;
  cameraSmoothing = 2.5;
  deadzoneRadius = 4.5;
  screenShiftUp = 1.2;

  private _smoothedDesired = new THREE.Vector3();
  private _initialized = false;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.camera.fov = 42;
    this.camera.near = 0.1;
    this.camera.far = 300;
    this.camera.updateProjectionMatrix();

    this.camera.position.copy(this.offset);

    this.camRightXZ.set(this.offset.z, 0, -this.offset.x).normalize();
    this.camForwardXZ.set(-this.offset.x, 0, -this.offset.z).normalize();
  }

  update(dt: number, target: THREE.Vector3, velocity: THREE.Vector3) {
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
      .copy(target)
      .addScaledVector(this.camRightXZ, leadX)
      .addScaledVector(this.camForwardXZ, leadY);

    const alpha = this._initialized ? 1 - Math.exp(-dt * this.cameraSmoothing) : 1;
    const inv = 1 - alpha;

    this._smoothedDesired.x = this._smoothedDesired.x * inv + _desired.x * alpha;
    this._smoothedDesired.y = this._smoothedDesired.y * inv + _desired.y * alpha;
    this._smoothedDesired.z = this._smoothedDesired.z * inv + _desired.z * alpha;
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
      .copy(this._smoothedDesired)
      .addScaledVector(this.camForwardXZ, -this.screenShiftUp);

    this.camera.position.set(
      _lookPoint.x + this.offset.x,
      _lookPoint.y + this.offset.y,
      _lookPoint.z + this.offset.z,
    );
    this.camera.lookAt(_lookPoint);
  }
}
