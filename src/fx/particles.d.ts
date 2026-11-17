import * as THREE from "three";

export class ParticleSystem {
  constructor(scene: THREE.Scene);
  scene: THREE.Scene;
  particles: THREE.Mesh[];
  splashRings: THREE.Mesh[];

  createWaterSplash(position: THREE.Vector3): void;
  createExplosion(position: THREE.Vector3, isCritical: boolean): void;
  createMuzzleFlash(position: THREE.Vector3, direction: THREE.Vector3): void;
  update(delta: number): void;
  dispose(): void;
}