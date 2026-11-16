import * as THREE from 'three';

export class Projectile {
  constructor(scene, world, type, origin, velocity, isPlayerShot = true) {
    this.scene = scene;
    this.world = world;
    this.type = type; // 'coconut' | 'pineapple' | 'watermelon' | 'enemy_ball'
    this.position = origin.clone();
    this.velocity = velocity.clone();
    this.isPlayerShot = isPlayerShot;

    this.active = true;
    this.exploded = false;
    this.gravity = 18.0;
    this.hasSplit = false;

    // Damage & blast stats
    this.damage = 40;
    this.blastRadius = 2.5;

    if (this.type === 'pineapple') {
      this.damage = 58;
      this.blastRadius = 4.0;
    } else if (this.type === 'watermelon') {
      this.damage = 25; // per sub-melon
      this.blastRadius = 2.0;
    } else if (this.type === 'enemy_ball') {
      this.damage = 28;
      this.blastRadius = 2.5;
    }

    this.mesh = this.createMesh();
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);

    // Trail smoke points
    this.trailPoints = [];
    this.lastTrailTime = 0;
  }

  createMesh() {
    const group = new THREE.Group();

    if (this.type === 'coconut') {
      // Fuzzy brown coconut with 3 dimple spots
      const mat = new THREE.MeshStandardMaterial({ color: 0x4d2911, roughness: 0.9 });
      const sphere = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 1), mat);
      sphere.castShadow = true;
      group.add(sphere);

      // Spots
      const spotMat = new THREE.MeshBasicMaterial({ color: 0x221005 });
      for (let i = 0; i < 3; i++) {
        const spot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 4, 4), spotMat);
        const a = (i / 3) * Math.PI * 2;
        spot.position.set(Math.cos(a) * 0.45, 0.35, Math.sin(a) * 0.45);
        group.add(spot);
      }
    } else if (this.type === 'pineapple') {
      // Golden prickly body + green crown
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.7,
        flatShading: true
      });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 0.95, 8), bodyMat);
      body.castShadow = true;
      group.add(body);

      const crownMat = new THREE.MeshStandardMaterial({
        color: 0x16a34a,
        roughness: 0.6,
        flatShading: true
      });
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.8, 6), crownMat);
      crown.position.y = 0.75;
      group.add(crown);

      // Sizzling bomb fuse spark
      const fuse = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.3, 4),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      fuse.position.y = 1.2;
      group.add(fuse);
    } else if (this.type === 'watermelon') {
      // Striped green watermelon
      const melonMat = new THREE.MeshStandardMaterial({
        color: 0x15803d,
        roughness: 0.4,
        flatShading: true
      });
      const melon = new THREE.Mesh(new THREE.SphereGeometry(0.65, 8, 8), melonMat);
      melon.scale.set(1.2, 0.9, 0.9);
      melon.castShadow = true;
      group.add(melon);
    } else {
      // Enemy Heavy Iron Cannonball
      const ironMat = new THREE.MeshStandardMaterial({
        color: 0x18181b,
        roughness: 0.3,
        metalness: 0.9
      });
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.52, 10, 10), ironMat);
      ball.castShadow = true;
      group.add(ball);
    }

    return group;
  }

  // Update physics step
  update(delta, wind, onSplitCallback) {
    if (!this.active) return { state: 'inactive' };

    // Physics integration
    this.velocity.y -= this.gravity * delta;
    this.velocity.x += wind.x * delta * 0.4;
    this.velocity.z += wind.z * delta * 0.4;

    this.position.addScaledVector(this.velocity, delta);
    this.mesh.position.copy(this.position);

    // Tumble rotation
    this.mesh.rotation.x += delta * 7;
    this.mesh.rotation.y += delta * 5;
    this.mesh.rotation.z += delta * 6;

    // Watermelon split check: split when starting to fall downwards (vy < -1)
    if (this.type === 'watermelon' && !this.hasSplit && this.velocity.y < -1.5 && this.position.y > 6) {
      this.hasSplit = true;
      if (onSplitCallback) {
        onSplitCallback(this.position, this.velocity);
      }
      this.destroy();
      return { state: 'split' };
    }

    // Water collision check
    const waterY = this.world.getWaterHeightAt(this.position.x, this.position.z);
    if (this.position.y <= waterY) {
      this.active = false;
      return {
        state: 'water_impact',
        position: new THREE.Vector3(this.position.x, waterY, this.position.z),
        isPlayerShot: this.isPlayerShot,
        damage: this.damage,
        blastRadius: this.blastRadius
      };
    }

    return { state: 'flying', position: this.position };
  }

  destroy() {
    this.active = false;
    if (this.mesh && this.mesh.parent) {
      this.scene.remove(this.mesh);
    }
  }
}

