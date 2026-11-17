import * as THREE from "three";

export class WorldScene {
  constructor(canvasContainer: HTMLElement);
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  clock: THREE.Clock;
  defaultCamPos: THREE.Vector3;
  defaultLookTarget: THREE.Vector3;
  clouds: THREE.Group[];
  waterMesh: THREE.Mesh | null;
  waterPositions: Float32Array;
  baseWaterVertices: Float32Array;
  sunLight: THREE.DirectionalLight;
  container: HTMLElement;

  getWaterHeightAt(x: number, z: number, time?: number): number;
  updateWater(time: number): void;
  updateClouds(delta: number): void;
  onWindowResize(): void;
}