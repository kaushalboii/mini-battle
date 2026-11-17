import * as THREE from "three";

const MAX_SEGMENTS = 2048;
const VERTS_PER_SEGMENT = 6;
const FLOATS_PER_POS = 3;
const FLOATS_PER_COL = 4;
const WIDTH = 0.12;
const Y_OFFSET = 0.025;
const MIN_SEGMENT_LENGTH = 0.04;
const INTENSITY_MIN = 0.5;
const INTENSITY_MAX = 2.0;

class DriftTrail {
  mesh: THREE.Mesh;
  private _positions: Float32Array;
  private _colors: Float32Array;
  private _posAttr: THREE.BufferAttribute;
  private _colAttr: THREE.BufferAttribute;
  private _prev = new THREE.Vector3();
  private _segmentIndex = 0;
  private _active = false;

  constructor(parent: THREE.Object3D, material: THREE.Material) {
    this._positions = new Float32Array(MAX_SEGMENTS * VERTS_PER_SEGMENT * FLOATS_PER_POS);
    this._colors = new Float32Array(MAX_SEGMENTS * VERTS_PER_SEGMENT * FLOATS_PER_COL);

    // Dark rubber skid color: #111111 with per-segment alpha
    for (let i = 0; i < MAX_SEGMENTS * VERTS_PER_SEGMENT; i++) {
      const o = i * FLOATS_PER_COL;
      this._colors[o + 0] = 0.08;
      this._colors[o + 1] = 0.08;
      this._colors[o + 2] = 0.08;
      this._colors[o + 3] = 0.0;
    }

    const geometry = new THREE.BufferGeometry();
    this._posAttr = new THREE.BufferAttribute(this._positions, 3);
    this._colAttr = new THREE.BufferAttribute(this._colors, 4);

    geometry.setAttribute("position", this._posAttr);
    geometry.setAttribute("color", this._colAttr);

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false;
    parent.add(this.mesh);
  }

  track(curr: THREE.Vector3, intensity: number, emit: boolean) {
    if (emit && this._active) {
      const alpha = Math.min(1, Math.max(0, (intensity - INTENSITY_MIN) / (INTENSITY_MAX - INTENSITY_MIN)));
      this._writeSegment(this._prev, curr, alpha * 0.7);
    }
    this._prev.copy(curr);
    this._active = emit;
  }

  private _writeSegment(prev: THREE.Vector3, curr: THREE.Vector3, alpha: number) {
    const dx = curr.x - prev.x;
    const dz = curr.z - prev.z;
    const len = Math.hypot(dx, dz);
    if (len < MIN_SEGMENT_LENGTH) return;

    const invLen = 1 / len;
    const dirX = dx * invLen;
    const dirZ = dz * invLen;

    const sideX = dirZ * WIDTH;
    const sideZ = -dirX * WIDTH;

    const pLx = prev.x + sideX, pLz = prev.z + sideZ;
    const pRx = prev.x - sideX, pRz = prev.z - sideZ;
    const cLx = curr.x + sideX, cLz = curr.z + sideZ;
    const cRx = curr.x - sideX, cRz = curr.z - sideZ;

    const py = prev.y;
    const cy = curr.y;

    const seg = this._segmentIndex;
    const pos = this._positions;
    const pOff = seg * VERTS_PER_SEGMENT * FLOATS_PER_POS;

    // Triangle 1: pL, pR, cL
    pos[pOff + 0] = pLx; pos[pOff + 1] = py; pos[pOff + 2] = pLz;
    pos[pOff + 3] = pRx; pos[pOff + 4] = py; pos[pOff + 5] = pRz;
    pos[pOff + 6] = cLx; pos[pOff + 7] = cy; pos[pOff + 8] = cLz;

    // Triangle 2: pR, cR, cL
    pos[pOff + 9] = pRx; pos[pOff + 10] = py; pos[pOff + 11] = pRz;
    pos[pOff + 12] = cRx; pos[pOff + 13] = cy; pos[pOff + 14] = cRz;
    pos[pOff + 15] = cLx; pos[pOff + 16] = cy; pos[pOff + 17] = cLz;

    const col = this._colors;
    const cOff = seg * VERTS_PER_SEGMENT * FLOATS_PER_COL;
    for (let i = 0; i < VERTS_PER_SEGMENT; i++) {
      col[cOff + i * FLOATS_PER_COL + 3] = alpha;
    }

    this._posAttr.needsUpdate = true;
    this._colAttr.needsUpdate = true;

    this._segmentIndex = (seg + 1) % MAX_SEGMENTS;
  }
}

export class DriftMarks {
  private _trails: DriftTrail[];
  private _material: THREE.MeshBasicMaterial;

  constructor(parent: THREE.Object3D) {
    this._material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      side: THREE.DoubleSide,
    });

    this._trails = [
      new DriftTrail(parent, this._material),
      new DriftTrail(parent, this._material),
    ];
  }

  update(wheelLeftWorldPos: THREE.Vector3, wheelRightWorldPos: THREE.Vector3, speed: number, driftIntensity: number) {
    const emit = driftIntensity > 0.5 && Math.abs(speed) > 0.2;
    const posL = wheelLeftWorldPos.clone();
    posL.y = Y_OFFSET;
    const posR = wheelRightWorldPos.clone();
    posR.y = Y_OFFSET;

    this._trails[0].track(posL, driftIntensity, emit);
    this._trails[1].track(posR, driftIntensity, emit);
  }
}
