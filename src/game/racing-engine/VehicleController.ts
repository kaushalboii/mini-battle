/**
 * RevSector 3D - Three.js Grand Prix Vehicle Dynamics & Physics Engine
 * High-performance racing dynamics with forward acceleration up to 230 km/h, disc braking,
 * smooth reverse transmission, continuous drift angle calculation, nitrous injection, and crash impacts.
 * Engineered by Kaushal.
 */

import * as THREE from 'three';
import { type CarInstance } from './ProceduralCar';
import { type CircuitWaypoint } from './TrackGenerator';

export class VehicleController {
  public car: CarInstance;
  public position: THREE.Vector3 = new THREE.Vector3(-2.8, 0, 12.0);
  public velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public yaw: number = 0;
  public speed: number = 0; // m/s (positive = forward, negative = reverse)
  public angularVelocity: number = 0;

  // Nitro System & Drift Power
  public nitro: number = 100;
  public isBoosting: boolean = false;
  public driftIntensity: number = 0;
  public currentDriftPoints: number = 0;
  public totalDriftScore: number = 0;

  // Transmission & Telemetry
  public gear: number | string = 1;
  public rpm: number = 0.2;

  // Grand Scale Speeds
  public readonly TOP_FORWARD_SPEED = 52.0;  // ~187 km/h base
  public readonly TOP_BOOST_SPEED = 64.0;    // ~230 km/h with nitro
  public readonly TOP_REVERSE_SPEED = -14.0; // ~50 km/h reverse

  private waypoints: CircuitWaypoint[];
  private currentWaypointIndex: number = 0;
  public lap: number = 1;
  public lapProgress: number = 0;
  private trackWidthHalf: number = 6.75; // 13.5m total width

  constructor(car: CarInstance, waypoints: CircuitWaypoint[], startPos: THREE.Vector3) {
    this.car = car;
    this.waypoints = waypoints;
    this.position.copy(startPos);
    this.car.root.position.copy(this.position);
  }

  public reset(startPos: THREE.Vector3 = new THREE.Vector3(-2.8, 0, 12.0)) {
    this.position.copy(startPos);
    this.velocity.set(0, 0, 0);
    this.yaw = 0;
    this.speed = 0;
    this.angularVelocity = 0;
    this.nitro = 100;
    this.isBoosting = false;
    this.driftIntensity = 0;
    this.currentDriftPoints = 0;
    this.gear = 1;
    this.rpm = 0.2;
    this.currentWaypointIndex = 0;
    this.lap = 1;
    this.lapProgress = 0;

    this.car.root.position.copy(this.position);
    this.car.root.rotation.set(0, 0, 0);
  }

  public setWaypoints(waypoints: CircuitWaypoint[], startPos: THREE.Vector3) {
    this.waypoints = waypoints;
    this.reset(startPos);
  }

  public update(
    dt: number,
    steerInput: number, // -1 (left), +1 (right)
    throttleInput: number, // +1 (forward), -1 (brake / reverse)
    nitroInput: boolean,
    isNight: boolean
  ): { hasBarrierCrash: boolean; point: THREE.Vector3; normal: THREE.Vector3; intensity: number } {
    let barrierCrash = {
      hasBarrierCrash: false,
      point: new THREE.Vector3(),
      normal: new THREE.Vector3(0, 1, 0),
      intensity: 0,
    };

    // 1. Nitrous Boost Logic
    const wantsNitro = nitroInput && this.nitro > 5 && throttleInput > 0;
    this.isBoosting = wantsNitro;

    if (wantsNitro) {
      this.nitro = Math.max(0, this.nitro - dt * 26);
    } else {
      this.nitro = Math.min(100, this.nitro + dt * 10);
    }

    // 2. Throttle, High-Friction Braking & Instant Reverse Transmission
    const targetTopSpeed = wantsNitro ? this.TOP_BOOST_SPEED : this.TOP_FORWARD_SPEED;

    if (throttleInput > 0) {
      // Forward Acceleration
      const accelRate = wantsNitro ? 26.0 : 18.0;
      this.speed = THREE.MathUtils.lerp(this.speed, targetTopSpeed * throttleInput, dt * (accelRate / targetTopSpeed));
    } else if (throttleInput < 0) {
      if (this.speed > 0.8) {
        // High-friction disc braking while moving forward
        this.speed = Math.max(0, this.speed - dt * 36.0);
      } else {
        // Direct, instant, responsive reverse gear acceleration
        this.speed = Math.max(this.TOP_REVERSE_SPEED, this.speed - dt * 18.0);
      }
    } else {
      // Natural Engine Braking / Rolling Resistance
      this.speed = THREE.MathUtils.lerp(this.speed, 0, dt * 1.8);
    }

    // 3. Directional Steering & Counter-Steer
    // Natural, consistent steering (no abrupt inversion that snaps the car)
    const isReversing = this.speed < -0.2;
    const speedRatio = Math.min(1.0, Math.abs(this.speed) / this.TOP_FORWARD_SPEED);
    const steeringSens = isReversing
      ? 0.85 // Smooth, predictable steering when backing up
      : THREE.MathUtils.clamp(1.45 - speedRatio * 0.40, 0.65, 1.45);

    const targetAngularVel = -steerInput * steeringSens * 2.8;

    this.angularVelocity = THREE.MathUtils.lerp(this.angularVelocity, targetAngularVel, dt * 9.0);
    this.yaw += this.angularVelocity * dt;

    // 4. Position & Velocity Integration
    const forwardX = Math.sin(this.yaw);
    const forwardZ = Math.cos(this.yaw);

    this.velocity.set(forwardX * this.speed, 0, forwardZ * this.speed);
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    // 5. Track Boundary Constraints & Physical Barrier Collision
    if (this.waypoints.length > 0) {
      const nearest = this.getNearestWaypoint();
      const dx = this.position.x - nearest.x;
      const dz = this.position.z - nearest.z;
      const lateralDist = dx * nearest.normalX + dz * nearest.normalZ;

      const maxLateral = this.trackWidthHalf + 1.2;
      if (Math.abs(lateralDist) > maxLateral) {
        const sign = Math.sign(lateralDist);
        const pushBack = (Math.abs(lateralDist) - maxLateral);
        this.position.x -= nearest.normalX * pushBack * sign;
        this.position.z -= nearest.normalZ * pushBack * sign;

        const impactSpeed = Math.abs(this.speed);
        if (impactSpeed > 8.0) {
          barrierCrash = {
            hasBarrierCrash: true,
            point: new THREE.Vector3(this.position.x, 0.4, this.position.z),
            normal: new THREE.Vector3(-nearest.normalX * sign, 0, -nearest.normalZ * sign),
            intensity: Math.min(3.0, impactSpeed / 12.0),
          };
        }

        this.speed *= 0.72;
        this.angularVelocity += (Math.random() - 0.5) * 0.4;
      }
    }

    // 6. Drift Dynamics & Drift Points Accumulation
    const lateralSpeed = Math.abs(this.angularVelocity * this.speed);
    if (lateralSpeed > 1.4 && Math.abs(this.speed) > 12.0) {
      this.driftIntensity = THREE.MathUtils.clamp((lateralSpeed - 1.4) / 5.0, 0, 1.0);
      const points = Math.round(this.driftIntensity * 320 * dt);
      this.currentDriftPoints += points;
      this.totalDriftScore += points;
    } else {
      this.driftIntensity = THREE.MathUtils.lerp(this.driftIntensity, 0, dt * 4.5);
      if (this.currentDriftPoints > 0) {
        this.currentDriftPoints = 0;
      }
    }

    // 7. Suspension Pitch & Body Roll
    let pitchAngle = 0;
    if (throttleInput > 0 && this.speed >= 0) {
      pitchAngle = 0.025; // Slight squat on acceleration
    } else if (throttleInput < 0 && this.speed > 0.8) {
      pitchAngle = -0.045; // Nose-dive under heavy braking
    } else if (this.speed < -0.2) {
      pitchAngle = 0.02; // Reverse weight transfer
    }
    const rollAngle = THREE.MathUtils.clamp(-steerInput * speedRatio * 0.07, -0.07, 0.07);

    // 8. Update 3D Mesh
    this.car.root.position.copy(this.position);
    this.car.root.rotation.set(pitchAngle, this.yaw, rollAngle);

    const wheelVisualSteer = -steerInput * 0.45;
    const isBraking = throttleInput < 0 && this.speed > 0.8;

    this.car.update(dt, this.speed, wheelVisualSteer, isBraking, this.isBoosting, isNight);

    // 9. Gear & RPM Synthesis
    if (this.isBoosting) {
      this.gear = 'NOS';
      this.rpm = 0.96;
    } else if (this.speed < -0.1) {
      this.gear = 'R';
      this.rpm = Math.min(0.85, Math.abs(this.speed) / 14.0);
    } else if (Math.abs(this.speed) < 0.2 && throttleInput === 0) {
      this.gear = 'N';
      this.rpm = 0.15;
    } else {
      const spdKmh = Math.abs(this.speed) * 3.6;
      if (spdKmh < 35) this.gear = 1;
      else if (spdKmh < 68) this.gear = 2;
      else if (spdKmh < 105) this.gear = 3;
      else if (spdKmh < 145) this.gear = 4;
      else if (spdKmh < 185) this.gear = 5;
      else if (spdKmh < 215) this.gear = 6;
      else this.gear = 7;

      const gearBase = typeof this.gear === 'number' ? (this.gear - 1) * 32 : 0;
      const gearFraction = (spdKmh - gearBase) / 36;
      this.rpm = THREE.MathUtils.clamp(0.25 + gearFraction * 0.7, 0.2, 0.98);
    }

    // 10. Track Progression & Lap Detection
    this.updateLapProgress();

    return barrierCrash;
  }

  private getNearestWaypoint(): CircuitWaypoint {
    let nearest = this.waypoints[this.currentWaypointIndex];
    let minDist = this.position.distanceToSquared(new THREE.Vector3(nearest.x, 0, nearest.z));

    for (let offset = 1; offset <= 6; offset++) {
      const idx = (this.currentWaypointIndex + offset) % this.waypoints.length;
      const wp = this.waypoints[idx];
      const dist = this.position.distanceToSquared(new THREE.Vector3(wp.x, 0, wp.z));
      if (dist < minDist) {
        minDist = dist;
        nearest = wp;
        this.currentWaypointIndex = idx;
      }
    }

    return nearest;
  }

  private updateLapProgress() {
    if (this.waypoints.length === 0) return;
    const wpRatio = this.currentWaypointIndex / this.waypoints.length;
    this.lapProgress = (this.lap - 1) + wpRatio;
  }
}
