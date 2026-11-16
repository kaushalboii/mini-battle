import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.splashRings = [];
  }

  // Create expanding water ring and vertical droplet spray
  createWaterSplash(position) {
    // 1. Water Ring on surface
    const ringGeo = new THREE.RingGeometry(0.3, 0.6, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(position);
    ring.position.y += 0.05;
    ring.userData = { scale: 1, opacity: 0.9, maxScale: 5.5 };
    this.scene.add(ring);
    this.splashRings.push(ring);

    // 2. Water Droplets Spray
    const dropCount = 28;
    const dropGeo = new THREE.DodecahedronGeometry(0.18, 0);
    const dropMat = new THREE.MeshStandardMaterial({
      color: 0x9beeff,
      roughness: 0.1,
      metalness: 0.4,
      flatShading: true
    });

    for (let i = 0; i < dropCount; i++) {
      const drop = new THREE.Mesh(dropGeo, dropMat);
      drop.position.copy(position);
      const angle = Math.random() * Math.PI * 2;
      const speed = 3.5 + Math.random() * 5.5;
      const vy = 5.0 + Math.random() * 6.5;

      drop.userData = {
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed * 0.7,
          vy,
          Math.sin(angle) * speed * 0.7
        ),
        gravity: 19,
        life: 1.0,
        age: 0
      };
      this.scene.add(drop);
      this.particles.push(drop);
    }
  }

  // Fiery explosion, smoke, and wooden debris chunks
  createExplosion(position, isCritical = false) {
    const sparkCount = isCritical ? 35 : 22;
    const sparkMat = new THREE.MeshBasicMaterial({
      color: isCritical ? 0xff4500 : 0xffaa00
    });

    // Sparks
    for (let i = 0; i < sparkCount; i++) {
      const spark = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), sparkMat);
      spark.position.copy(position);
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      const speed = 6 + Math.random() * 9;

      spark.userData = {
        velocity: new THREE.Vector3(
          Math.cos(theta) * Math.cos(phi) * speed,
          Math.sin(phi) * speed + 5,
          Math.sin(theta) * Math.cos(phi) * speed
        ),
        gravity: 16,
        life: 0.7 + Math.random() * 0.4,
        age: 0
      };
      this.scene.add(spark);
      this.particles.push(spark);
    }

    // Wood splinters
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x6e4321,
      roughness: 0.9,
      flatShading: true
    });
    for (let j = 0; j < 12; j++) {
      const splinter = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.6, 0.15),
        woodMat
      );
      splinter.position.copy(position);
      splinter.userData = {
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          6 + Math.random() * 7,
          (Math.random() - 0.5) * 10
        ),
        rotationSpeed: new THREE.Vector3(
          Math.random() * 12,
          Math.random() * 12,
          Math.random() * 12
        ),
        gravity: 18,
        life: 1.2,
        age: 0
      };
      this.scene.add(splinter);
      this.particles.push(splinter);
    }
  }

  // Cannon muzzle blast flash and smoke ring
  createMuzzleFlash(position, direction) {
    // Flash
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xfff0aa });
    const flash = new THREE.Mesh(new THREE.SphereGeometry(0.65, 6, 6), flashMat);
    flash.position.copy(position);
    flash.userData = { life: 0.08, age: 0, scaleSpeed: 6 };
    this.scene.add(flash);
    this.particles.push(flash);

    // Smoke puffs
    const smokeMat = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      transparent: true,
      opacity: 0.7,
      roughness: 0.9,
      flatShading: true
    });

    for (let i = 0; i < 6; i++) {
      const smoke = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + i * 0.08, 0), smokeMat);
      smoke.position.copy(position);
      const spread = 0.8;
      smoke.userData = {
        velocity: new THREE.Vector3(
          direction.x * (4 + i * 1.2) + (Math.random() - 0.5) * spread,
          direction.y * (4 + i * 1.2) + Math.random() * 1.5,
          direction.z * (4 + i * 1.2) + (Math.random() - 0.5) * spread
        ),
        gravity: -1.2, // smoke drifts upward
        life: 0.6 + i * 0.1,
        age: 0,
        isSmoke: true
      };
      this.scene.add(smoke);
      this.particles.push(smoke);
    }
  }

  update(delta) {
    // Update splash rings
    for (let i = this.splashRings.length - 1; i >= 0; i--) {
      const ring = this.splashRings[i];
      ring.userData.scale += delta * 6;
      ring.scale.set(ring.userData.scale, ring.userData.scale, 1);
      ring.userData.opacity -= delta * 1.4;
      ring.material.opacity = Math.max(0, ring.userData.opacity);

      if (ring.userData.opacity <= 0 || ring.userData.scale >= ring.userData.maxScale) {
        this.scene.remove(ring);
        ring.geometry.dispose();
        ring.material.dispose();
        this.splashRings.splice(i, 1);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.userData.age += delta;

      if (p.userData.age >= p.userData.life) {
        this.scene.remove(p);
        p.geometry.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      if (p.userData.velocity) {
        p.position.addScaledVector(p.userData.velocity, delta);
        if (p.userData.gravity) {
          p.userData.velocity.y -= p.userData.gravity * delta;
        }
      }

      if (p.userData.rotationSpeed) {
        p.rotation.x += p.userData.rotationSpeed.x * delta;
        p.rotation.y += p.userData.rotationSpeed.y * delta;
        p.rotation.z += p.userData.rotationSpeed.z * delta;
      }

      if (p.userData.isSmoke) {
        p.scale.multiplyScalar(1 + delta * 1.8);
      }
    }
  }
}

