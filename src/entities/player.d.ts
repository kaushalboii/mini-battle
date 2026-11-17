import * as THREE from "three";

export class Player {
  constructor(scene: THREE.Scene, world: any);
  scene: THREE.Scene;
  world: any;
  position: THREE.Vector3;
  hp: number;
  maxHp: number;
  yaw: number;
  elevation: number;
  power: number;
  recoilOffset: number;
  tiltAngle: number;
  group: THREE.Group;
  raftGroup: THREE.Group;
  cannonBase: THREE.Group;
  cannonBarrelPivot: THREE.Group;
  muzzleTip: THREE.Object3D;
  trajectoryLine: THREE.Line;
  hpCanvas: HTMLCanvasElement;
  hpCtx: CanvasRenderingContext2D;
  hpTexture: THREE.CanvasTexture;
  hpSprite: THREE.Sprite;

  createModel(): void;
  createTrajectoryLine(): void;
  createHealthBar(): void;
  updateHealthBarUI(): void;
  takeDamage(amount: number): boolean;
  applyRecoil(): void;
  getMuzzleWorldPosition(): THREE.Vector3;
  getLaunchVelocity(): THREE.Vector3;
  updateTrajectory(wind: THREE.Vector3): void;
  update(time: number, delta: number, wind: THREE.Vector3): void;
  setTrajectoryVisible(visible: boolean): void;
  reset(): void;
}