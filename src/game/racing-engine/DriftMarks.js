import { Material3D, Geometry3D, Mesh3D, Vector3 } from '@pixi/3d';
import { Buffer as PixiBuffer, BufferUsage } from 'pixi.js';
import { clamp } from './MathUtils';

const MAX_SEGMENTS = 4096;
const VERTS_PER_SEGMENT = 6;
const TOTAL_VERTS = MAX_SEGMENTS * VERTS_PER_SEGMENT;
const FLOATS_PER_POSITION = 3;
const FLOATS_PER_COLOR = 4;
const POSITION_FLOATS_PER_SEGMENT = VERTS_PER_SEGMENT * FLOATS_PER_POSITION;
const COLOR_FLOATS_PER_SEGMENT = VERTS_PER_SEGMENT * FLOATS_PER_COLOR;
const POSITION_BYTES_PER_SEGMENT = POSITION_FLOATS_PER_SEGMENT * 4;
const COLOR_BYTES_PER_SEGMENT = COLOR_FLOATS_PER_SEGMENT * 4;

const WIDTH = 0.22;
const MIN_SEGMENT_LENGTH = 0.02;
const INTENSITY_MIN = 0.2;
const INTENSITY_MAX = 1.8;
const INV_INTENSITY_RANGE = 1 / (INTENSITY_MAX - INTENSITY_MIN);

const _wheelPos = new Vector3();

/**
 * Dynamic streamed tire mark mesh generator utilizing continuous GPU vertex buffers
 * and alpha gradient deposition for realistic asphalt rubber burn marks.
 */
class DriftTrail {
  mesh;

  _positions;
  _colors;
  _positionsBuffer;
  _colorsBuffer;

  _prev = new Vector3();
  _segmentIndex = 0;
  _active = false;

  constructor(parent, material) {
    this._positions = new Float32Array(
      MAX_SEGMENTS * POSITION_FLOATS_PER_SEGMENT,
    );
    this._colors = new Float32Array(MAX_SEGMENTS * COLOR_FLOATS_PER_SEGMENT);

    // RGB stays at dark charcoal rubber tint for lifetime of trail
    for (let i = 0; i < TOTAL_VERTS; i++) {
      const o = i * FLOATS_PER_COLOR;
      this._colors[o] = 0.12;
      this._colors[o + 1] = 0.12;
      this._colors[o + 2] = 0.12;
      this._colors[o + 3] = 0.0;
    }

    this._positionsBuffer = new PixiBuffer({
      data: this._positions,
      usage: BufferUsage.VERTEX | BufferUsage.COPY_DST,
      label: 'driftTrail-positions',
      shrinkToFit: false,
    });

    this._colorsBuffer = new PixiBuffer({
      data: this._colors,
      usage: BufferUsage.VERTEX | BufferUsage.COPY_DST,
      label: 'driftTrail-colors',
      shrinkToFit: false,
    });

    const geometry = new Geometry3D({
      attributes: {
        aPosition: {
          buffer: this._positionsBuffer,
          format: 'float32x3',
          stride: FLOATS_PER_POSITION * 4,
          offset: 0,
        },
        aColor: {
          buffer: this._colorsBuffer,
          format: 'float32x4',
          stride: FLOATS_PER_COLOR * 4,
          offset: 0,
        },
      },
      topology: 'triangle-list',
      dynamic: true,
    });

    this.mesh = new Mesh3D({
      geometry,
      material,
      castShadow: false,
      receiveShadow: false,
    });

    parent.addChild(this.mesh);
  }

  track(curr, intensity, emit) {
    if (emit && this._active) {
      const alpha = clamp(
        0.35 + (intensity - INTENSITY_MIN) * INV_INTENSITY_RANGE * 0.55,
        0.25,
        0.90,
      );

      this._writeSegment(this._prev, curr, alpha);
    }

    this._prev.copyFrom(curr);
    this._active = emit;
  }

  _writeSegment(prev, curr, alpha) {
    const dx = curr.x - prev.x;
    const dz = curr.z - prev.z;
    const len = Math.hypot(dx, dz);

    if (len < MIN_SEGMENT_LENGTH) return;

    const invLen = 1 / len;
    const dirX = dx * invLen;
    const dirZ = dz * invLen;

    // Perpendicular in the XZ plane, scaled to half-width.
    const sideX = dirZ * WIDTH;
    const sideZ = -dirX * WIDTH;

    const pLx = prev.x + sideX;
    const pLz = prev.z + sideZ;
    const pRx = prev.x - sideX;
    const pRz = prev.z - sideZ;
    const cLx = curr.x + sideX;
    const cLz = curr.z + sideZ;
    const cRx = curr.x - sideX;
    const cRz = curr.z - sideZ;

    const py = prev.y;
    const cy = curr.y;

    const segmentIndex = this._segmentIndex;
    const positions = this._positions;
    const positionOffset = segmentIndex * POSITION_FLOATS_PER_SEGMENT;

    // Two triangles, CCW from above: (pL, pR, cL) (pR, cR, cL).
    positions[positionOffset + 0] = pLx;
    positions[positionOffset + 1] = py;
    positions[positionOffset + 2] = pLz;

    positions[positionOffset + 3] = pRx;
    positions[positionOffset + 4] = py;
    positions[positionOffset + 5] = pRz;

    positions[positionOffset + 6] = cLx;
    positions[positionOffset + 7] = cy;
    positions[positionOffset + 8] = cLz;

    positions[positionOffset + 9] = pRx;
    positions[positionOffset + 10] = py;
    positions[positionOffset + 11] = pRz;

    positions[positionOffset + 12] = cRx;
    positions[positionOffset + 13] = cy;
    positions[positionOffset + 14] = cRz;

    positions[positionOffset + 15] = cLx;
    positions[positionOffset + 16] = cy;
    positions[positionOffset + 17] = cLz;

    const colors = this._colors;
    const colorOffset = segmentIndex * COLOR_FLOATS_PER_SEGMENT;

    for (let i = 0; i < VERTS_PER_SEGMENT; i++) {
      colors[colorOffset + i * FLOATS_PER_COLOR + 3] = alpha;
    }

    this._positionsBuffer.update(
      POSITION_BYTES_PER_SEGMENT,
      positionOffset * 4,
    );
    this._colorsBuffer.update(COLOR_BYTES_PER_SEGMENT, colorOffset * 4);

    this._segmentIndex = (segmentIndex + 1) % MAX_SEGMENTS;
  }
}

export class DriftMarks {
  _trails;
  _material;

  constructor(parent) {
    this._material = new Material3D({
      baseColor: [0.08, 0.08, 0.08, 0.88],
      alphaMode: 'blend',
      doubleSided: true,
      roughness: 0.95,
      metallic: 0.05,
    });

    this._trails = [
      new DriftTrail(parent, this._material),
      new DriftTrail(parent, this._material),
    ];
  }

  update(_dt, vehicle) {
    if (!vehicle || !vehicle.container) return;

    // Detect drifting, hard steering, or active boost slip
    const speed = Math.abs(vehicle.linearSpeed);
    const isSlipping =
      (Math.abs(vehicle.angularSpeed) > 0.30 ||
       Math.abs(vehicle.inputX) > 0.20 ||
       vehicle.driftIntensity > 0.20 ||
       vehicle.isBoosting) &&
      speed > 0.12;

    const emit = isSlipping;
    const intensity = Math.max(0.6, vehicle.driftIntensity + Math.abs(vehicle.angularSpeed) * 0.5);

    // World road height: road tiles sit at Y=0.5
    const groundY = 0.512;

    const cx = vehicle.container.position.x;
    const cz = vehicle.container.position.z;
    const yaw = vehicle.yaw;

    // Rear axle vector (-0.65m behind vehicle center)
    const backX = -Math.sin(yaw) * 0.65;
    const backZ = -Math.cos(yaw) * 0.65;

    // Lateral tire separation vector (+/- 0.44m from vehicle centerline)
    const rightX = Math.cos(yaw) * 0.44;
    const rightZ = -Math.sin(yaw) * 0.44;

    // Left Rear Tire Contact Point
    _wheelPos.set(cx + backX - rightX, groundY, cz + backZ - rightZ);
    this._trails[0].track(_wheelPos, intensity, emit);

    // Right Rear Tire Contact Point
    _wheelPos.set(cx + backX + rightX, groundY, cz + backZ + rightZ);
    this._trails[1].track(_wheelPos, intensity, emit);
  }
}
