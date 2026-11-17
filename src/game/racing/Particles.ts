import * as THREE from "three";

interface SmokeParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  life: number;
  size: number;
  maxSize: number;
  alpha: number;
  active: boolean;
}

const MAX_PARTICLES = 300;

export class SmokeTrails {
  private _particles: SmokeParticle[] = [];
  private _mesh: THREE.InstancedMesh;
  private _dummy = new THREE.Object3D();

  constructor(parent: THREE.Object3D) {
    const geo = new THREE.SphereGeometry(0.18, 5, 5);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xcfd6dc,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });

    this._mesh = new THREE.InstancedMesh(geo, mat, MAX_PARTICLES);
    this._mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    parent.add(this._mesh);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this._particles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        age: 0,
        life: 1.2,
        size: 0.2,
        maxSize: 0.9,
        alpha: 0,
        active: false,
      });
      this._dummy.position.set(0, -999, 0);
      this._dummy.scale.set(0, 0, 0);
      this._dummy.updateMatrix();
      this._mesh.setMatrixAt(i, this._dummy.matrix);
    }
    this._mesh.instanceMatrix.needsUpdate = true;
  }

  spawn(pos: THREE.Vector3, count = 2) {
    let spawned = 0;
    for (const p of this._particles) {
      if (!p.active) {
        p.active = true;
        p.age = 0;
        p.life = 0.8 + Math.random() * 0.6;
        p.size = 0.2 + Math.random() * 0.15;
        p.maxSize = 0.8 + Math.random() * 0.5;
        p.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.05, (Math.random() - 0.5) * 0.2));
        p.velocity.set(
          (Math.random() - 0.5) * 0.8,
          0.4 + Math.random() * 0.6,
          (Math.random() - 0.5) * 0.8,
        );
        spawned++;
        if (spawned >= count) break;
      }
    }
  }

  update(dt: number, wheelL: THREE.Vector3, wheelR: THREE.Vector3, driftIntensity: number) {
    if (driftIntensity > 0.6) {
      this.spawn(wheelL, 2);
      this.spawn(wheelR, 2);
    }

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this._particles[i];
      if (p.active) {
        p.age += dt;
        if (p.age >= p.life) {
          p.active = false;
          this._dummy.position.set(0, -999, 0);
          this._dummy.scale.set(0, 0, 0);
          this._dummy.updateMatrix();
          this._mesh.setMatrixAt(i, this._dummy.matrix);
          continue;
        }

        const t = p.age / p.life;
        p.position.addScaledVector(p.velocity, dt);
        p.velocity.multiplyScalar(0.96); // air drag

        const currentScale = THREE.MathUtils.lerp(p.size, p.maxSize, t);
        this._dummy.position.copy(p.position);
        this._dummy.scale.setScalar(currentScale);
        this._dummy.updateMatrix();
        this._mesh.setMatrixAt(i, this._dummy.matrix);
      }
    }
    this._mesh.instanceMatrix.needsUpdate = true;
  }
}
