import * as THREE from "three";

interface EnemyData {
  id: string;
  name: string;
  mesh: THREE.Group;
  hp: number;
  maxHp: number;
  hitboxRadius: number;
  hitboxCenter: THREE.Vector3;
  hpCanvas?: HTMLCanvasElement;
  hpCtx?: CanvasRenderingContext2D;
  hpTexture?: THREE.CanvasTexture;
  hpSprite?: THREE.Sprite;
}

export class EnemyFleet {
  constructor(scene: THREE.Scene, world: any);
  scene: THREE.Scene;
  world: any;
  round: number;
  group: THREE.Group;
  enemies: EnemyData[];
  recoilOffset: number;
  tiltAngle: number;
  basePosition: THREE.Vector3;
  cannonObj: THREE.Group | null;

  setupRound(roundNumber: number): void;
  buildRound1(): void;
  buildRound2(): void;
  buildRound3(): void;
  createRaftMesh(logCount: number, length: number, colorHex: number): THREE.Group;
  createPirateMesh(name: string, coatColor: number, isCaptain: boolean): THREE.Group;
  createCannonMesh(): THREE.Group;
  createShieldMesh(): THREE.Group;
  createHealthBar(enemy: EnemyData): void;
  updateHealthBarUI(enemy: EnemyData): void;
  takeDamage(amount: number, hitPoint: THREE.Vector3): { defeated: boolean; currentHp: number; maxHp: number; enemyName: string };
  calculateAIShot(playerPos: THREE.Vector3, wind: THREE.Vector3): { origin: THREE.Vector3; velocity: THREE.Vector3 };
  update(time: number, delta: number): void;
}