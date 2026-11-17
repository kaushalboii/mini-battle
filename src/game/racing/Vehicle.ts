import * as THREE from "three";
import type { InputState } from "./Controls";

export const MAX_SPEED = 28.0;
const ACCELERATION = 26.0;
const BRAKE_DECEL = 38.0;
const REVERSE_ACCEL = 14.0;
const MAX_REVERSE = 9.0;
const DRAG = 0.985;
const STEER_SPEED = 3.6;
const MAX_STEER = 0.58;

export class Vehicle {
  container = new THREE.Group();

  position = new THREE.Vector3(0, 0, 0);
  velocity = new THREE.Vector3(0, 0, 0);
  modelVelocity = new THREE.Vector3(0, 0, 0);

  yaw = 0;
  steering = 0;
  linearSpeed = 0;
  driftIntensity = 0;

  wheelFL!: THREE.Group;
  wheelFR!: THREE.Group;
  wheelBL!: THREE.Group;
  wheelBR!: THREE.Group;

  wheelMeshFL!: THREE.Mesh;
  wheelMeshFR!: THREE.Mesh;
  wheelMeshBL!: THREE.Mesh;
  wheelMeshBR!: THREE.Mesh;

  private _bodyGroup = new THREE.Group();
  private _suspensionRoll = 0;
  private _suspensionPitch = 0;

  constructor() {
    this._buildTruckModel();
    this.container.add(this._bodyGroup);
  }

  private _buildTruckModel() {
    // 1. Materials
    const yellowPaint = new THREE.MeshStandardMaterial({
      color: 0xf5a623,
      roughness: 0.25,
      metalness: 0.15,
    });
    const darkCab = new THREE.MeshStandardMaterial({
      color: 0x222629,
      roughness: 0.5,
      metalness: 0.2,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x1b2838,
      roughness: 0.1,
      metalness: 0.9,
    });
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x151719,
      roughness: 0.85,
      metalness: 0.05,
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xe0e6ed,
      roughness: 0.3,
      metalness: 0.8,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.15,
      metalness: 0.95,
    });
    const redLight = new THREE.MeshBasicMaterial({ color: 0xff2222 });
    const whiteLight = new THREE.MeshBasicMaterial({ color: 0xfff9e6 });

    // 2. Chassis Base
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 2.8), darkCab);
    chassis.position.y = 0.3;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    this._bodyGroup.add(chassis);

    // Front Bumper
    const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.22, 0.28), chromeMat);
    frontBumper.position.set(0, 0.28, 1.48);
    frontBumper.castShadow = true;
    this._bodyGroup.add(frontBumper);

    // Headlights
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.05), whiteLight);
    hlL.position.set(-0.48, 0.44, 1.42);
    const hlR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.05), whiteLight);
    hlR.position.set(0.48, 0.44, 1.42);
    this._bodyGroup.add(hlL, hlR);

    // Taillights
    const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.05), redLight);
    tlL.position.set(-0.52, 0.44, -1.42);
    const tlR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.05), redLight);
    tlR.position.set(0.52, 0.44, -1.42);
    this._bodyGroup.add(tlL, tlR);

    // 3. Cabin & Hood (Yellow Paint)
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.35, 1.05), yellowPaint);
    hood.position.set(0, 0.55, 0.85);
    hood.castShadow = true;
    hood.receiveShadow = true;
    this._bodyGroup.add(hood);

    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.65, 0.95), yellowPaint);
    cab.position.set(0, 0.9, -0.05);
    cab.castShadow = true;
    cab.receiveShadow = true;
    this._bodyGroup.add(cab);

    // Windshield (Front Glass)
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.45, 0.08), glassMat);
    windshield.position.set(0, 0.92, 0.44);
    windshield.rotation.x = -0.25;
    this._bodyGroup.add(windshield);

    // Side Windows
    const sideGlassL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.65), glassMat);
    sideGlassL.position.set(-0.66, 0.95, -0.05);
    const sideGlassR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.65), glassMat);
    sideGlassR.position.set(0.66, 0.95, -0.05);
    this._bodyGroup.add(sideGlassL, sideGlassR);

    // 4. Pickup Bed & Rollbar
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.4, 1.0), yellowPaint);
    bed.position.set(0, 0.52, -0.95);
    bed.castShadow = true;
    bed.receiveShadow = true;
    this._bodyGroup.add(bed);

    const rollbar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2), chromeMat);
    rollbar.rotation.z = Math.PI / 2;
    rollbar.position.set(0, 1.15, -0.55);
    this._bodyGroup.add(rollbar);

    // 5. Wheels
    const makeWheel = (isLeft: boolean) => {
      const g = new THREE.Group();
      const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12);
      const rimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.29, 8);

      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;

      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.z = Math.PI / 2;

      g.add(tire, rim);
      return { group: g, tire };
    };

    const wFL = makeWheel(true);
    this.wheelFL = new THREE.Group();
    this.wheelFL.position.set(-0.76, 0.36, 0.9);
    this.wheelFL.add(wFL.group);
    this.wheelMeshFL = wFL.tire;

    const wFR = makeWheel(false);
    this.wheelFR = new THREE.Group();
    this.wheelFR.position.set(0.76, 0.36, 0.9);
    this.wheelFR.add(wFR.group);
    this.wheelMeshFR = wFR.tire;

    const wBL = makeWheel(true);
    this.wheelBL = new THREE.Group();
    this.wheelBL.position.set(-0.76, 0.36, -0.85);
    this.wheelBL.add(wBL.group);
    this.wheelMeshBL = wBL.tire;

    const wBR = makeWheel(false);
    this.wheelBR = new THREE.Group();
    this.wheelBR.position.set(0.76, 0.36, -0.85);
    this.wheelBR.add(wBR.group);
    this.wheelMeshBR = wBR.tire;

    this.container.add(this.wheelFL, this.wheelFR, this.wheelBL, this.wheelBR);
  }

  getWheelWorldPositions(): { left: THREE.Vector3; right: THREE.Vector3 } {
    const left = new THREE.Vector3();
    const right = new THREE.Vector3();
    this.wheelBL.getWorldPosition(left);
    this.wheelBR.getWorldPosition(right);
    return { left, right };
  }

  update(dt: number, input: InputState) {
    // 1. Steering with smoothing and auto-center
    const targetSteer = -input.x * MAX_STEER;
    this.steering = THREE.MathUtils.lerp(this.steering, targetSteer, dt * 10);
    this.wheelFL.rotation.y = this.steering;
    this.wheelFR.rotation.y = this.steering;

    // 2. Throttle & Braking
    const forwardX = Math.sin(this.yaw);
    const forwardZ = Math.cos(this.yaw);

    if (input.z > 0.05) {
      if (this.linearSpeed < 0) {
        this.linearSpeed += BRAKE_DECEL * dt;
      } else {
        this.linearSpeed += ACCELERATION * input.z * dt;
      }
    } else if (input.z < -0.05) {
      if (this.linearSpeed > 0) {
        this.linearSpeed -= BRAKE_DECEL * dt;
      } else {
        this.linearSpeed -= REVERSE_ACCEL * Math.abs(input.z) * dt;
      }
    } else {
      this.linearSpeed *= Math.pow(DRAG, dt * 60);
      if (Math.abs(this.linearSpeed) < 0.1) this.linearSpeed = 0;
    }

    if (input.drift) {
      this.linearSpeed *= Math.pow(0.97, dt * 60);
    }

    this.linearSpeed = THREE.MathUtils.clamp(this.linearSpeed, -MAX_REVERSE, MAX_SPEED);

    // 3. Turning Physics
    const speedFactor = Math.min(1, Math.abs(this.linearSpeed) / 10);
    const turnRate = this.steering * STEER_SPEED * Math.sign(this.linearSpeed || 1) * speedFactor;
    this.yaw += turnRate * dt;

    // Drift intensity (sliding sideways when turning hard at speed or holding handbrake)
    const lateralG = Math.abs(this.steering * (this.linearSpeed / 12));
    const handbrakeBoost = input.drift ? 1.4 : 0.0;
    this.driftIntensity = THREE.MathUtils.lerp(this.driftIntensity, lateralG + handbrakeBoost, dt * 8);

    // 4. Velocity integration
    const actualHeading = this.yaw + (input.drift ? this.steering * 0.4 : 0);
    this.velocity.x = Math.sin(actualHeading) * this.linearSpeed;
    this.velocity.z = Math.cos(actualHeading) * this.linearSpeed;

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.container.position.copy(this.position);
    this.container.rotation.y = this.yaw;

    this.modelVelocity.copy(this.velocity);

    // 5. Wheel Spin Animation
    const rollAngle = (this.linearSpeed / 0.36) * dt;
    this.wheelMeshFL.rotation.x += rollAngle;
    this.wheelMeshFR.rotation.x += rollAngle;
    this.wheelMeshBL.rotation.x += rollAngle;
    this.wheelMeshBR.rotation.x += rollAngle;

    // 6. Body suspension tilt & roll
    const targetRoll = -this.steering * (this.linearSpeed / MAX_SPEED) * 0.14;
    const targetPitch = (input.z > 0 ? -0.04 : input.z < 0 ? 0.07 : 0) * (Math.abs(this.linearSpeed) / MAX_SPEED);
    this._suspensionRoll = THREE.MathUtils.lerp(this._suspensionRoll, targetRoll, dt * 6);
    this._suspensionPitch = THREE.MathUtils.lerp(this._suspensionPitch, targetPitch, dt * 6);

    this._bodyGroup.rotation.z = this._suspensionRoll;
    this._bodyGroup.rotation.x = this._suspensionPitch;
  }
}
