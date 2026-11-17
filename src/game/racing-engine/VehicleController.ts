/**
 * RevSector 3D - Three.js Vehicle Dynamics & Physics Engine
 * High-performance racing dynamics with forward acceleration, disc braking, smooth reverse transmission,
 * continuous drift angle calculation, nitrous injection, and collision bounds.
 * Engineered by Kaushal.
 */

import * as THREE from 'three';
import { type CarInstance } from './ProceduralCar';
import { type CircuitWaypoint } from './TrackGenerator';

export class VehicleController {
  public car: CarInstance;
  public position: THREE.Vector3 = new THREE.Vector3(3.5, 0, 5.0);
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

  // Constants
  public readonly TOP_FORWARD_SPEED = 38.0; // ~137 km/h base
  public readonly TOP_BOOST_SPEED = 50.0;   // ~180 km/h with nitro
  public readonly TOP_REVERSE_SPEED = -12.5; // ~45 km/h reverse

  private waypoints: CircuitWaypoint[];
  private currentWaypointIndex: number = 0;
  public lap: number = 1;
  public lapProgress: number = 0;
  private trackWidthHalf: number = 4.4;

  constructor(car: CarInstance, waypoints: CircuitWaypoint[], startPos: THREE.Vector3) {
    this.car = car;
    this.waypoints = waypoints;
    this.position.copy(startPos);
    this.car.root.position.copy(this.position);
  }

  public reset(startPos: THREE.Vector3 = new THREE.Vector3(3.5, 0, 5.0)) {
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
  ) {
    // 1. Nitrous Boost Logic
    const wantsNitro = nitroInput && this.nitro > 5 && throttleInput > 0;
    this.isBoosting = wantsNitro;

    if (wantsNitro) {
      this.nitro = Math.max(0, this.nitro - dt * 28);
    } else {
      this.nitro = Math.min(100, this.nitro + dt * 10);
    }

    // 2. Throttle, High-Friction Braking & Reverse Transmission
    const targetTopSpeed = wantsNitro ? this.TOP_BOOST_SPEED : this.TOP_FORWARD_SPEED;

    if (throttleInput > 0) {
      // Forward Acceleration
      const accelRate = wantsNitro ? 22.0 : 14.0;
      this.speed = THREE.MathUtils.lerp(this.speed, targetTopSpeed * throttleInput, dt * (accelRate / targetTopSpeed));
    } else if (throttleInput < 0) {
      if (this.speed > 0.5) {
        // High-friction disc braking while moving forward
        this.speed = THREE.MathUtils.lerp(this.speed, 0, dt * 8.5);
      } else {
        // Smoothly accelerate in reverse
        this.speed = THREE.MathUtils.lerp(this.speed, this.TOP_REVERSE_SPEED, dt * 2.2);
      }
    } else {
      // Natural Engine Braking / Rolling Resistance
      this.speed = THREE.MathUtils.lerp(this.speed, 0, dt * 1.5);
    }

    // 3. Directional Steering & Counter-Steer
    // Invert steering direction when moving in reverse so backing up is natural
    let steerDir = 1;
    if (this.speed < -0.2) {
      steerDir = -1;
    }

    // High-speed downforce increases stability; low-speed allows agile turning
    const speedRatio = Math.abs(this.speed) / this.TOP_FORWARD_SPEED;
    const steeringSens = THREE.MathUtils.clamp(1.4 - speedRatio * 0.45, 0.6, 1.4);
    const targetAngularVel = -steerInput * steeringSens * 2.6 * steerDir;

    this.angularVelocity = THREE.MathUtils.lerp(this.angularVelocity, targetAngularVel, dt * 8.0);
    this.yaw += this.angularVelocity * dt;

    // 4. Position & Velocity Integration
    const forwardX = Math.sin(this.yaw);
    const forwardZ = Math.cos(this.yaw);

    this.velocity.set(forwardX * this.speed, 0, forwardZ * this.speed);
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    // 5. Track Boundary Constraints & Soft Barrier Collisions
    if (this.waypoints.length > 0) {
      const nearest = this.getNearestWaypoint();
      const dx = this.position.x - nearest.x;
      const dz = this.position.z - nearest.z;
      const lateralDist = dx * nearest.normalX + dz * nearest.normalZ;

      const maxLateral = this.trackWidthHalf + 0.8;
      if (Math.abs(lateralDist) > maxLateral) {
        // Soft barrier collision: bounce back and dampen speed
        const pushBack = (Math.abs(lateralDist) - maxLateral) * Math.sign(lateralDist);
        this.position.x -= nearest.normalX * pushBack * 0.8;
        this.position.z -= nearest.normalZ * pushBack * 0.8;
        this.speed *= 0.82;
      }
    }

    // 6. Drift Dynamics & Drift Points Accumulation
    const lateralSpeed = Math.abs(this.angularVelocity * this.speed);
    if (lateralSpeed > 1.2 && Math.abs(this.speed) > 10.0) {
      this.driftIntensity = THREE.MathUtils.clamp((lateralSpeed - 1.2) / 4.0, 0, 1.0);
      const points = Math.round(this.driftIntensity * 280 * dt);
      this.currentDriftPoints += points;
      this.totalDriftScore += points;
    } else {
      this.driftIntensity = THREE.MathUtils.lerp(this.driftIntensity, 0, dt * 4.0);
      if (this.currentDriftPoints > 0) {
        this.currentDriftPoints = 0; // Banked
      }
    }

    // 7. Suspension Pitch & Body Roll
    const pitchAngle = THREE.MathUtils.clamp((throttleInput < 0 && this.speed > 0 ? -0.05 : 0.03 * throttleInput), -0.06, 0.04);
    const rollAngle = THREE.MathUtils.clamp(-steerInput * speedRatio * 0.08, -0.08, 0.08);

    // 8. Update 3D Mesh
    this.car.root.position.copy(this.position);
    this.car.root.rotation.set(pitchAngle, this.yaw, rollAngle);

    // Front wheels steering visual angle
    const wheelVisualSteer = -steerInput * 0.45;
    const isBraking = (throttleInput < 0 && this.speed > 0) || this.speed < -0.1;

    this.car.update(dt, this.speed, wheelVisualSteer, isBraking, this.isBoosting, isNight);

    // 9. Gear & RPM Synthesis for Cockpit Telemetry
    if (this.isBoosting) {
      this.gear = 'NOS';
      this.rpm = 0.95;
    } else if (this.speed < -0.1) {
      this.gear = 'R';
      this.rpm = Math.min(0.85, Math.abs(this.speed) / 12.0);
    } else if (Math.abs(this.speed) < 0.2 && throttleInput === 0) {
      this.gear = 'N';
      this.rpm = 0.15;
    } else {
      const spdKmh = Math.abs(this.speed) * 3.6;
      if (spdKmh < 30) this.gear = 1;
      else if (spdKmh < 55) this.gear = 2;
      else if (spdKmh < 85) this.gear = 3;
      else if (spdKmh < 115) this.gear = 4;
      else if (spdKmh < 145) this.gear = 5;
      else if (spdKmh < 170) this.gear = 6;
      else this.gear = 7;

      const gearBase = typeof this.gear === 'number' ? (this.gear - 1) * 28 : 0;
      const gearFraction = (spdKmh - gearBase) / 32;
      this.rpm = THREE.MathUtils.clamp(0.25 + gearFraction * 0.7, 0.2, 0.98);
    }

    // 10. Track Progression & Lap Detection
    this.updateLapProgress();
  }

  private getNearestWaypoint(): CircuitWaypoint {
    let nearest = this.waypoints[this.currentWaypointIndex];
    let minDist = this.position.distanceToSquared(new THREE.Vector3(nearest.x, 0, nearest.z));

    // Check forward 5 waypoints
    for (let offset = 1; offset <= 5; offset++) {
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

    const wp = this.getNearestWaypoint();
    const wpRatio = this.currentWaypointIndex / this.waypoints.length;
    this.lapProgress = (this.lap - 1) + wpRatio;

    // Finish line crossing detection
    if (this.currentWaypointIndex === 0 && wpRatio < 0.05) {
      // Near S/F
    }
  }
}
