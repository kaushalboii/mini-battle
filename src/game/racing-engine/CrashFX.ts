/**
 * RevSector 3D - Crash Spark & Tire Smoke Particle Engine
 * High-performance GPU particle bursts for car-to-car collisions, barrier impacts,
 * and authentic tire smoke trails during high-angle drifts.
 * Engineered by Kaushal.
 */

import * as THREE from 'three';

interface SparkParticle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
}

interface SmokeParticle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  opacity: number;
}

export class CrashFX {
  private scene: THREE.Scene;

  // Sparks
  private sparkParticles: SparkParticle[] = [];
  private sparkGeo: THREE.BufferGeometry;
  private sparkMat: THREE.PointsMaterial;
  private sparkPoints: THREE.Points;
  private maxSparks: number = 300;

  // Smoke
  private smokeParticles: SmokeParticle[] = [];
  private smokeGeo: THREE.BufferGeometry;
  private smokeMat: THREE.PointsMaterial;
  private smokePoints: THREE.Points;
  private maxSmoke: number = 200;

  // Camera Shake
  public cameraShakeIntensity: number = 0;
  public cameraShakeOffset: THREE.Vector3 = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // 1. Sparks Points Mesh
    this.sparkGeo = new THREE.BufferGeometry();
    const sparkPositions = new Float32Array(this.maxSparks * 3);
    const sparkColors = new Float32Array(this.maxSparks * 3);
    this.sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    this.sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkColors, 3));

    this.sparkMat = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.sparkPoints = new THREE.Points(this.sparkGeo, this.sparkMat);
    scene.add(this.sparkPoints);

    // 2. Smoke Points Mesh
    this.smokeGeo = new THREE.BufferGeometry();
    const smokePositions = new Float32Array(this.maxSmoke * 3);
    this.smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));

    this.smokeMat = new THREE.PointsMaterial({
      color: 0xd4d4d8,
      size: 1.8,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    this.smokePoints = new THREE.Points(this.smokeGeo, this.smokeMat);
    scene.add(this.smokePoints);
  }

  public triggerImpactSparks(point: THREE.Vector3, normal: THREE.Vector3, intensity: number = 1.0) {
    const count = Math.min(45, Math.floor(18 + intensity * 6));
    this.cameraShakeIntensity = Math.min(1.0, 0.25 + intensity * 0.12);

    for (let i = 0; i < count; i++) {
      if (this.sparkParticles.length >= this.maxSparks) {
        this.sparkParticles.shift();
      }

      // Random cone velocity around reflection normal
      const spread = 0.85;
      const vel = new THREE.Vector3(
        normal.x + (Math.random() - 0.5) * spread,
        Math.max(0.4, normal.y + Math.random() * spread),
        normal.z + (Math.random() - 0.5) * spread
      ).normalize().multiplyScalar(6.0 + Math.random() * 12.0 * Math.min(intensity, 2.5));

      this.sparkParticles.push({
        pos: point.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.2, (Math.random() - 0.5) * 0.3)),
        vel,
        life: 0,
        maxLife: 0.3 + Math.random() * 0.45,
        size: 0.25 + Math.random() * 0.25,
      });
    }
  }

  public emitDriftSmoke(rearLeft: THREE.Vector3, rearRight: THREE.Vector3, driftIntensity: number) {
    if (driftIntensity < 0.2) return;

    const count = Math.random() < 0.6 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      if (this.smokeParticles.length >= this.maxSmoke) {
        this.smokeParticles.shift();
      }

      const wheelPos = i % 2 === 0 ? rearLeft : rearRight;
      this.smokeParticles.push({
        pos: wheelPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.08, (Math.random() - 0.5) * 0.2)),
        vel: new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.4 + Math.random() * 0.6, (Math.random() - 0.5) * 0.4),
        life: 0,
        maxLife: 0.6 + Math.random() * 0.5,
        size: 0.8,
        opacity: Math.min(0.5, driftIntensity * 0.5),
      });
    }
  }

  public update(dt: number) {
    // 1. Update Camera Shake
    if (this.cameraShakeIntensity > 0) {
      const shakeMag = this.cameraShakeIntensity * 0.35;
      this.cameraShakeOffset.set(
        (Math.random() - 0.5) * shakeMag,
        (Math.random() - 0.5) * shakeMag,
        (Math.random() - 0.5) * shakeMag
      );
      this.cameraShakeIntensity = Math.max(0, this.cameraShakeIntensity - dt * 4.5);
    } else {
      this.cameraShakeOffset.set(0, 0, 0);
    }

    // 2. Update Sparks
    const sparkPos = this.sparkGeo.attributes.position.array as Float32Array;
    const sparkCol = this.sparkGeo.attributes.color.array as Float32Array;

    for (let i = this.sparkParticles.length - 1; i >= 0; i--) {
      const p = this.sparkParticles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.sparkParticles.splice(i, 1);
        continue;
      }

      // Gravity & Velocity
      p.vel.y -= 18.0 * dt;
      p.pos.addScaledVector(p.vel, dt);

      // Bounce off ground
      if (p.pos.y < 0.05) {
        p.pos.y = 0.05;
        p.vel.y *= -0.45;
        p.vel.x *= 0.75;
        p.vel.z *= 0.75;
      }
    }

    for (let i = 0; i < this.maxSparks; i++) {
      const idx = i * 3;
      if (i < this.sparkParticles.length) {
        const p = this.sparkParticles[i];
        sparkPos[idx] = p.pos.x;
        sparkPos[idx + 1] = p.pos.y;
        sparkPos[idx + 2] = p.pos.z;

        // Golden fiery gradient fading to red-orange
        const t = p.life / p.maxLife;
        sparkCol[idx] = 1.0;                 // Red
        sparkCol[idx + 1] = 0.85 * (1 - t);  // Green (fades to red)
        sparkCol[idx + 2] = 0.15 * (1 - t);  // Blue
      } else {
        sparkPos[idx] = 0;
        sparkPos[idx + 1] = -100;
        sparkPos[idx + 2] = 0;
      }
    }
    this.sparkGeo.attributes.position.needsUpdate = true;
    this.sparkGeo.attributes.color.needsUpdate = true;

    // 3. Update Smoke
    const smokePos = this.smokeGeo.attributes.position.array as Float32Array;
    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const s = this.smokeParticles[i];
      s.life += dt;
      if (s.life >= s.maxLife) {
        this.smokeParticles.splice(i, 1);
        continue;
      }
      s.pos.addScaledVector(s.vel, dt);
    }

    for (let i = 0; i < this.maxSmoke; i++) {
      const idx = i * 3;
      if (i < this.smokeParticles.length) {
        const s = this.smokeParticles[i];
        smokePos[idx] = s.pos.x;
        smokePos[idx + 1] = s.pos.y;
        smokePos[idx + 2] = s.pos.z;
      } else {
        smokePos[idx] = 0;
        smokePos[idx + 1] = -100;
        smokePos[idx + 2] = 0;
      }
    }
    this.smokeGeo.attributes.position.needsUpdate = true;
  }

  public destroy() {
    this.scene.remove(this.sparkPoints);
    this.scene.remove(this.smokePoints);
    this.sparkGeo.dispose();
    this.sparkMat.dispose();
    this.smokeGeo.dispose();
    this.smokeMat.dispose();
  }
}

