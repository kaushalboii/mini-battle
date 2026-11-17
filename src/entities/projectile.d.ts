import * as THREE from "three";

export class Projectile {
  constructor(scene: THREE.Scene, world: any, type: string, origin: THREE.Vector3, velocity: THREE.Vector3, isPlayerShot: boolean);
  scene: THREE.Scene;
  world: any;
  type: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  isPlayerShot: boolean;
  active: boolean;
  exploded: boolean;
  gravity: number;
  hasSplit: boolean;
  damage: number;
  blastRadius: number;
  mesh: THREE.Group;
  trailPoints: THREE.Vector3[];
  lastTrailTime: number;

  createMesh(): THREE.Group;
  update(delta: number, wind: THREE.Vector3, onSplitCallback: (pos: THREE.Vector3, vel: THREE.Vector3) => void): {
    state: "inactive" | "flying" | "water_impact" | "split";
    position?: THREE.Vector3;
    isPlayerShot?: boolean;
    damage?: number;
    blastRadius?: number;
  };
  destroy(): void;
}