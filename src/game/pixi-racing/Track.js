import { Container3D, Model3D, Quaternion, Vector3 } from '@pixi/3d';

const ORIENT_DEG = { 0: 0, 10: 180, 16: 90, 22: 270 };

const CELL_RAW = 9.99;
const GRID_SCALE = 0.75;

/**
 * 5 Progressive Circuits (Level 1 -> Level 5) using natural track curves and bumps:
 * - Level 1: Pure smooth asphalt speedway. 0 bumps. Full speed mastery.
 * - Level 2: Ridge Speedway with 4 natural jump bumps on straights.
 * - Level 3: Canyon S-Bends with 6 natural rhythm jump bumps.
 * - Level 4: Serpent Grand Prix with 7 high-speed launch bumps and hairpins.
 * - Level 5: Apex Valley Marathon: 50-cell endurance championship with 10 jump bumps.
 */
export const TRACK_DEFINITIONS = {
  'level-1': {
    id: 'level-1',
    level: 1,
    name: 'Level 1 • Pure Grand Prix',
    shortName: 'LVL 1: PURE GP',
    difficulty: 'ROOKIE',
    lengthLabel: '1.65 KM',
    corners: 6,
    bumps: 0,
    targetLapSec: 22,
    desc: 'Pure, uninterrupted asphalt racing circuit with zero bumps and wide sweeping corners. Test top speeds and master smooth 6-speed gear transitions.',
    cells: [
      [0, 0, 'track-finish', 0],
      [0, 1, 'track-straight', 0],
      [0, 2, 'track-straight', 0],
      [0, 3, 'track-corner', 22],
      [-1, 3, 'track-straight', 16],
      [-2, 3, 'track-straight', 16],
      [-3, 3, 'track-corner', 10],
      [-3, 2, 'track-corner', 0],
      [-4, 2, 'track-straight', 16],
      [-5, 2, 'track-corner', 10],
      [-5, 1, 'track-straight', 10],
      [-5, 0, 'track-straight', 10],
      [-5, -1, 'track-straight', 10],
      [-5, -2, 'track-straight', 10],
      [-5, -3, 'track-corner', 16],
      [-4, -3, 'track-straight', 22],
      [-3, -3, 'track-straight', 22],
      [-2, -3, 'track-straight', 22],
      [-1, -3, 'track-straight', 22],
      [0, -3, 'track-corner', 0],
      [0, -2, 'track-straight', 0],
      [0, -1, 'track-straight', 0],
    ],
    extraDecos: [
      [-2, 0, 'decoration-tents', 10],
      [-3, 0, 'decoration-tents', 0],
      [1, 0, 'decoration-tents', 22],
    ],
  },
  'level-2': {
    id: 'level-2',
    level: 2,
    name: 'Level 2 • Ridge Speedway',
    shortName: 'LVL 2: RIDGE SPEED',
    difficulty: 'AMATEUR',
    lengthLabel: '1.80 KM',
    corners: 6,
    bumps: 4,
    targetLapSec: 24,
    desc: 'High-speed twin straightaways with 4 natural suspension jump bumps and a sweeping mid-circuit chicane.',
    cells: [
      [0, 0, 'track-finish', 0],
      [0, 1, 'track-straight', 0],
      [0, 2, 'track-bump', 0],
      [0, 3, 'track-corner', 22],
      [-1, 3, 'track-straight', 16],
      [-2, 3, 'track-bump', 16],
      [-3, 3, 'track-straight', 16],
      [-4, 3, 'track-straight', 16],
      [-5, 3, 'track-bump', 16],
      [-6, 3, 'track-corner', 10],
      [-6, 2, 'track-straight', 10],
      [-6, 1, 'track-straight', 10],
      [-6, 0, 'track-corner', 16],
      [-5, 0, 'track-corner', 22],
      [-5, -1, 'track-straight', 10],
      [-5, -2, 'track-straight', 10],
      [-5, -3, 'track-corner', 16],
      [-4, -3, 'track-bump', 22],
      [-3, -3, 'track-straight', 22],
      [-2, -3, 'track-straight', 22],
      [-1, -3, 'track-straight', 22],
      [0, -3, 'track-corner', 0],
      [0, -2, 'track-straight', 0],
      [0, -1, 'track-straight', 0],
    ],
    extraDecos: [
      [-3, 0, 'decoration-tents', 16],
      [-4, 0, 'decoration-tents', 0],
      [-1, -4, 'decoration-tents', 22],
    ],
  },
  'level-3': {
    id: 'level-3',
    level: 3,
    name: 'Level 3 • Canyon S-Bends',
    shortName: 'LVL 3: CANYON S',
    difficulty: 'PRO',
    lengthLabel: '2.25 KM',
    corners: 10,
    bumps: 6,
    targetLapSec: 30,
    desc: 'Technical consecutive S-bends with 6 natural rhythm jump bumps across fast braking zones and elevation drops.',
    cells: [
      [0, 0, 'track-finish', 0],
      [0, 1, 'track-straight', 0],
      [0, 2, 'track-bump', 0],
      [0, 3, 'track-straight', 0],
      [0, 4, 'track-corner', 22],
      [-1, 4, 'track-straight', 16],
      [-2, 4, 'track-corner', 10],
      [-2, 3, 'track-corner', 0],
      [-3, 3, 'track-bump', 16],
      [-4, 3, 'track-corner', 10],
      [-4, 2, 'track-corner', 0],
      [-5, 2, 'track-straight', 16],
      [-6, 2, 'track-straight', 16],
      [-7, 2, 'track-corner', 10],
      [-7, 1, 'track-straight', 10],
      [-7, 0, 'track-bump', 10],
      [-7, -1, 'track-straight', 10],
      [-7, -2, 'track-bump', 10],
      [-7, -3, 'track-corner', 16],
      [-6, -3, 'track-corner', 22],
      [-6, -4, 'track-corner', 16],
      [-5, -4, 'track-bump', 22],
      [-4, -4, 'track-straight', 22],
      [-3, -4, 'track-straight', 22],
      [-2, -4, 'track-straight', 22],
      [-1, -4, 'track-bump', 22],
      [0, -4, 'track-corner', 0],
      [0, -3, 'track-straight', 0],
      [0, -2, 'track-straight', 0],
      [0, -1, 'track-straight', 0],
    ],
    extraDecos: [
      [-3, -1, 'decoration-tents', 0],
      [-5, -1, 'decoration-tents', 10],
      [1, 1, 'decoration-tents', 22],
    ],
  },
  'level-4': {
    id: 'level-4',
    level: 4,
    name: 'Level 4 • Serpent Grand Prix',
    shortName: 'LVL 4: SERPENT GP',
    difficulty: 'EXPERT',
    lengthLabel: '2.92 KM',
    corners: 12,
    bumps: 7,
    targetLapSec: 38,
    desc: 'Extended East-West & North-South Grand Prix circuit featuring 7 high-speed launch bumps and technical hairpin complexes.',
    cells: [
      [0, 0, 'track-finish', 0],
      [0, 1, 'track-straight', 0],
      [0, 2, 'track-straight', 0],
      [0, 3, 'track-bump', 0],
      [0, 4, 'track-straight', 0],
      [0, 5, 'track-corner', 22],
      [-1, 5, 'track-straight', 16],
      [-2, 5, 'track-bump', 16],
      [-3, 5, 'track-straight', 16],
      [-4, 5, 'track-corner', 10],
      [-4, 4, 'track-straight', 10],
      [-4, 3, 'track-corner', 0],
      [-5, 3, 'track-straight', 16],
      [-6, 3, 'track-bump', 16],
      [-7, 3, 'track-straight', 16],
      [-8, 3, 'track-corner', 10],
      [-8, 2, 'track-straight', 10],
      [-8, 1, 'track-bump', 10],
      [-8, 0, 'track-straight', 10],
      [-8, -1, 'track-straight', 10],
      [-8, -2, 'track-corner', 16],
      [-7, -2, 'track-straight', 22],
      [-6, -2, 'track-corner', 22],
      [-6, -3, 'track-straight', 10],
      [-6, -4, 'track-straight', 10],
      [-6, -5, 'track-corner', 16],
      [-5, -5, 'track-bump', 22],
      [-4, -5, 'track-straight', 22],
      [-3, -5, 'track-straight', 22],
      [-2, -5, 'track-straight', 22],
      [-1, -5, 'track-bump', 22],
      [0, -5, 'track-straight', 22],
      [1, -5, 'track-straight', 22],
      [2, -5, 'track-corner', 0],
      [2, -4, 'track-straight', 0],
      [2, -3, 'track-bump', 0],
      [2, -2, 'track-corner', 22],
      [1, -2, 'track-straight', 16],
      [0, -2, 'track-corner', 16],
      [0, -1, 'track-straight', 0],
    ],
    extraDecos: [
      [-3, -2, 'decoration-tents', 16],
      [-5, 0, 'decoration-tents', 0],
      [1, 0, 'decoration-tents', 22],
    ],
  },
  'level-5': {
    id: 'level-5',
    level: 5,
    name: 'Level 5 • Apex Valley Marathon',
    shortName: 'LVL 5: APEX VALLEY',
    difficulty: 'MASTER',
    lengthLabel: '3.75 KM',
    corners: 12,
    bumps: 10,
    targetLapSec: 50,
    desc: 'Massive 50-sector endurance championship loop spanning the entire valley with 10 suspension jump bumps and high-speed sweeping curves.',
    cells: [
      [0, 0, 'track-finish', 0],
      [0, 1, 'track-straight', 0],
      [0, 2, 'track-bump', 0],
      [0, 3, 'track-straight', 0],
      [0, 4, 'track-straight', 0],
      [0, 5, 'track-bump', 0],
      [0, 6, 'track-corner', 22],
      [-1, 6, 'track-straight', 16],
      [-2, 6, 'track-bump', 16],
      [-3, 6, 'track-straight', 16],
      [-4, 6, 'track-straight', 16],
      [-5, 6, 'track-corner', 10],
      [-5, 5, 'track-straight', 10],
      [-5, 4, 'track-corner', 0],
      [-6, 4, 'track-straight', 16],
      [-7, 4, 'track-bump', 16],
      [-8, 4, 'track-straight', 16],
      [-9, 4, 'track-straight', 16],
      [-10, 4, 'track-corner', 10],
      [-10, 3, 'track-straight', 10],
      [-10, 2, 'track-bump', 10],
      [-10, 1, 'track-straight', 10],
      [-10, 0, 'track-straight', 10],
      [-10, -1, 'track-bump', 10],
      [-10, -2, 'track-straight', 10],
      [-10, -3, 'track-straight', 10],
      [-10, -4, 'track-corner', 16],
      [-9, -4, 'track-straight', 22],
      [-8, -4, 'track-corner', 22],
      [-8, -5, 'track-straight', 10],
      [-8, -6, 'track-corner', 16],
      [-7, -6, 'track-straight', 22],
      [-6, -6, 'track-bump', 22],
      [-5, -6, 'track-straight', 22],
      [-4, -6, 'track-straight', 22],
      [-3, -6, 'track-bump', 22],
      [-2, -6, 'track-straight', 22],
      [-1, -6, 'track-straight', 22],
      [0, -6, 'track-straight', 22],
      [1, -6, 'track-bump', 22],
      [2, -6, 'track-straight', 22],
      [3, -6, 'track-corner', 0],
      [3, -5, 'track-straight', 0],
      [3, -4, 'track-bump', 0],
      [3, -3, 'track-straight', 0],
      [3, -2, 'track-corner', 22],
      [2, -2, 'track-straight', 16],
      [1, -2, 'track-straight', 16],
      [0, -2, 'track-corner', 16],
      [0, -1, 'track-straight', 0],
    ],
    extraDecos: [
      [-4, 0, 'decoration-tents', 16],
      [-6, 0, 'decoration-tents', 0],
      [-3, -2, 'decoration-tents', 10],
      [1, 1, 'decoration-tents', 22],
    ],
  },
};

export const TRACK_LIST = Object.values(TRACK_DEFINITIONS);

function pieceWorldPosition(gx, gz) {
  return {
    x: (gx + 0.5) * CELL_RAW * GRID_SCALE,
    z: (gz + 0.5) * CELL_RAW * GRID_SCALE,
  };
}

const _q = new Quaternion();
const _yAxis = new Vector3(0, 1, 0);

function placeModel(
  source,
  parent,
  x,
  y,
  z,
  yawRad,
  castShadow = true,
  receiveShadow = true,
) {
  const root = new Model3D({
    source,
    castShadow,
    receiveShadow,
  });

  root.position.set(x, y, z);
  _q.setFromAxisAngle(_yAxis, yawRad);
  root.quaternion.copyFrom(_q);
  parent.addChild(root);

  return root;
}

/**
 * Computes subdivided centerline waypoints (including smooth arcs through corners)
 * so both the minimap SVG and AI rivals trace the real road geometry accurately.
 */
function buildSmoothWaypoints(trackCells) {
  const S = GRID_SCALE;
  const CELL_HALF = CELL_RAW / 2;
  const ARC_CENTER_X = -CELL_HALF;
  const ARC_CENTER_Z = CELL_HALF;
  const ARC_SPAN = -Math.PI / 2;
  const CENTER_R = CELL_HALF * S;

  const waypoints = [];

  for (let i = 0; i < trackCells.length; i++) {
    const [gx, gz, key, orient] = trackCells[i];
    const center = pieceWorldPosition(gx, gz);

    if (key !== 'track-corner') {
      waypoints.push({ x: center.x, z: center.z });
      continue;
    }

    const prevCell = trackCells[(i - 1 + trackCells.length) % trackCells.length];
    const prevCenter = pieceWorldPosition(prevCell[0], prevCell[1]);

    const deg = ORIENT_DEG[orient] ?? 0;
    const rad = (deg * Math.PI) / 180;
    const cr = Math.cos(rad);
    const sr = Math.sin(rad);

    const wcx = center.x + (ARC_CENTER_X * cr + ARC_CENTER_Z * sr) * S;
    const wcz = center.z + (-ARC_CENTER_X * sr + ARC_CENTER_Z * cr) * S;
    const arcStart = -rad;
    const arcEnd = arcStart + ARC_SPAN;

    const pStart = {
      x: wcx + CENTER_R * Math.cos(arcStart),
      z: wcz + CENTER_R * Math.sin(arcStart),
    };
    const pEnd = {
      x: wcx + CENTER_R * Math.cos(arcEnd),
      z: wcz + CENTER_R * Math.sin(arcEnd),
    };

    const dStart = Math.hypot(pStart.x - prevCenter.x, pStart.z - prevCenter.z);
    const dEnd = Math.hypot(pEnd.x - prevCenter.x, pEnd.z - prevCenter.z);

    const samples = dStart <= dEnd ? [0.22, 0.5, 0.78] : [0.78, 0.5, 0.22];
    for (const t of samples) {
      const a = arcStart + t * ARC_SPAN;
      waypoints.push({
        x: wcx + CENTER_R * Math.cos(a),
        z: wcz + CENTER_R * Math.sin(a),
      });
    }
  }

  return waypoints;
}

export function buildTrack(parent, sources, trackId = 'level-1') {
  const def = TRACK_DEFINITIONS[trackId] || TRACK_DEFINITIONS['level-1'];
  const trackCells = def.cells;

  const trackGroup = new Container3D();
  trackGroup.scale.set(GRID_SCALE, GRID_SCALE, GRID_SCALE);
  trackGroup.position.set(0, -0.5, 0);
  parent.addChild(trackGroup);

  for (const [gx, gz, key, orient] of trackCells) {
    const px = (gx + 0.5) * CELL_RAW;
    const pz = (gz + 0.5) * CELL_RAW;
    const yaw = ((ORIENT_DEG[orient] ?? 0) * Math.PI) / 180;

    if (key === 'track-bump') {
      // 1. Place the full 10x10 straight asphalt tile cleanly underneath
      if (sources['track-straight']) {
        placeModel(sources['track-straight'], trackGroup, px, 0.5, pz, yaw, false, true);
      }
      // 2. Seat the natural speed bump ramp mound directly on the asphalt surface
      if (sources['track-bump']) {
        const bump = placeModel(sources['track-bump'], trackGroup, px, 0.5, pz, yaw, true, true);
        bump.scale.set(2.2, 0.55, 0.85);
      }
      continue;
    }

    const source = sources[key];
    if (!source) continue;

    const casts = key === 'track-finish';
    placeModel(source, trackGroup, px, 0.5, pz, yaw, casts, true);
  }

  const waypoints = buildSmoothWaypoints(trackCells);

  const occupied = new Set();
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const [gx, gz] of trackCells) {
    occupied.add(`${gx},${gz}`);
    if (gx < minX) minX = gx;
    if (gx > maxX) maxX = gx;
    if (gz < minZ) minZ = gz;
    if (gz > maxZ) maxZ = gz;
  }

  for (const [gx, gz, key, orient] of def.extraDecos || []) {
    if (occupied.has(`${gx},${gz}`)) continue;
    occupied.add(`${gx},${gz}`);

    const source = sources[key];
    if (!source) continue;

    const px = (gx + 0.5) * CELL_RAW;
    const pz = (gz + 0.5) * CELL_RAW;
    const yaw = ((ORIENT_DEG[orient] ?? 0) * Math.PI) / 180;

    placeModel(source, trackGroup, px, 0.5, pz, yaw, true, true);
  }

  // Fill surrounding terrain cleanly up to fog boundary
  const pad = 4;

  for (let gz = minZ - pad; gz <= maxZ + pad; gz++) {
    for (let gx = minX - pad; gx <= maxX + pad; gx++) {
      if (occupied.has(`${gx},${gz}`)) continue;

      const distX = gx < minX ? minX - gx : gx > maxX ? gx - maxX : 0;
      const distZ = gz < minZ ? minZ - gz : gz > maxZ ? gz - maxZ : 0;
      const dist = Math.max(distX, distZ);

      const px = (gx + 0.5) * CELL_RAW;
      const pz = (gz + 0.5) * CELL_RAW;

      let key = 'decoration-empty';
      let yawQuarters = 0;
      let castShadow = false;

      if (dist <= 1) {
        const h = pseudoHash(gx, gz);
        if (h % 8 === 0) {
          key = 'decoration-tents';
          yawQuarters = h % 4;
          castShadow = true;
        } else {
          key = 'decoration-empty';
        }
      } else if (dist === 2 || dist === 3) {
        key = 'decoration-forest';
        castShadow = dist === 2;
      } else {
        key = 'decoration-empty';
      }

      const source = sources[key];
      if (!source) continue;

      placeModel(
        source,
        trackGroup,
        px,
        0.5,
        pz,
        (yawQuarters * Math.PI) / 2,
        castShadow,
        true,
      );
    }
  }

  const walls = buildWallColliders(trackCells);

  const finishCell = trackCells.find(([, , key]) => key === 'track-finish');
  const finishOrient = finishCell[3];
  const finishYaw = ((ORIENT_DEG[finishOrient] ?? 0) * Math.PI) / 180;
  const finishWorld = pieceWorldPosition(finishCell[0], finishCell[1]);
  const finishCenter = new Vector3(finishWorld.x, 0, finishWorld.z);
  const finishForward = new Vector3(
    Math.sin(finishYaw),
    0,
    Math.cos(finishYaw),
  );
  const finishRight = new Vector3(finishForward.z, 0, -finishForward.x);

  const requiredCellKeys = new Set();

  for (const [gx, gz, key] of trackCells) {
    if (key !== 'track-finish') requiredCellKeys.add(`${gx},${gz}`);
  }

  return {
    id: def.id,
    info: def,
    cells: trackCells,
    waypoints,
    bounds: {
      minX: minX * CELL_RAW * GRID_SCALE,
      maxX: (maxX + 1) * CELL_RAW * GRID_SCALE,
      minZ: minZ * CELL_RAW * GRID_SCALE,
      maxZ: (maxZ + 1) * CELL_RAW * GRID_SCALE,
    },
    walls,
    finishCenter,
    finishForward,
    finishRight,
    requiredCellKeys,
    cellSize: CELL_RAW * GRID_SCALE,
    spawn: [3.5, 0.5, 5],
    spawnYaw: finishYaw,
    destroy() {
      parent.removeChild(trackGroup);
      trackGroup.destroy({ children: true });
    },
  };
}

function pseudoHash(gx, gz) {
  let h = gx * 374761393 + gz * 668265263;

  h = (h ^ (h >> 13)) * 1274126177;

  return (h ^ (h >> 16)) >>> 0;
}

/**
 * Builds smooth boundary walls along track perimeter to contain the vehicle.
 * Wall friction is kept minimal so glancing contact guides the vehicle smoothly.
 */
function buildWallColliders(trackCells) {
  const S = GRID_SCALE;
  const CELL_HALF = CELL_RAW / 2;
  const WALL_HALF_THICK = 0.5;
  const WALL_X = 4.8;
  const WALL_HALF_H = 4.0;

  const wallY = (0.5 + WALL_HALF_H) * S - 0.5;
  const hThick = WALL_HALF_THICK * S;
  const hHeight = WALL_HALF_H * S;
  const hLen = CELL_HALF * S;

  const ARC_SPAN = -Math.PI / 2;
  const ARC_CENTER_X = -CELL_HALF;
  const ARC_CENTER_Z = CELL_HALF;
  const OUTER_R = 2 * CELL_HALF - WALL_HALF_THICK;
  const OUTER_SEG = 14;
  const OUTER_SEG_HALF_LEN = (((OUTER_R * (Math.PI / 2)) / OUTER_SEG / 2) * S) * 1.15;
  const INNER_R = WALL_HALF_THICK;
  const INNER_SEG = 6;
  const INNER_SEG_HALF_LEN = (((INNER_R * (Math.PI / 2)) / INNER_SEG / 2) * S) * 1.15;

  const walls = [];

  for (const [gx, gz, key, orient] of trackCells) {
    const cx = (gx + 0.5) * CELL_RAW * S;
    const cz = (gz + 0.5) * CELL_RAW * S;
    const deg = ORIENT_DEG[orient] ?? 0;
    const rad = (deg * Math.PI) / 180;
    const cr = Math.cos(rad);
    const sr = Math.sin(rad);

    if (key === 'track-straight' || key === 'track-finish' || key === 'track-bump') {
      for (const side of [-1, 1]) {
        const lx = side * WALL_X;
        const wx = cx + lx * cr * S;
        const wz = cz + -lx * sr * S;

        walls.push({
          halfExtents: [hThick, hHeight, hLen],
          position: [wx, wallY, wz],
          quaternion: [0, Math.sin(rad / 2), 0, Math.cos(rad / 2)],
          friction: 0.0,
          restitution: 0.1,
        });
      }

      // Natural speed bump jump ramp
      if (key === 'track-bump') {
        walls.push({
          halfExtents: [3.2 * S, 0.05, 0.65 * S],
          position: [cx, -0.125 + 0.05, cz],
          quaternion: [0, Math.sin(rad / 2), 0, Math.cos(rad / 2)],
          friction: 2.0,
          restitution: 0.25,
        });
      }
    } else if (key === 'track-corner') {
      const wcx = cx + (ARC_CENTER_X * cr + ARC_CENTER_Z * sr) * S;
      const wcz = cz + (-ARC_CENTER_X * sr + ARC_CENTER_Z * cr) * S;
      const arcStart = -rad;

      addArcWalls(
        walls,
        wcx,
        wcz,
        arcStart,
        OUTER_R,
        OUTER_SEG,
        OUTER_SEG_HALF_LEN,
        hThick,
        hHeight,
        ARC_SPAN,
        S,
      );
      addArcWalls(
        walls,
        wcx,
        wcz,
        arcStart,
        INNER_R,
        INNER_SEG,
        INNER_SEG_HALF_LEN,
        hThick,
        hHeight,
        ARC_SPAN,
        S,
      );
    }
  }

  return walls;
}

function addArcWalls(
  walls,
  wcx,
  wcz,
  arcStart,
  radius,
  numSeg,
  segHalfLen,
  hThick,
  hHeight,
  arcSpan,
  scale,
) {
  for (let i = 0; i < numSeg; i++) {
    const aMid = arcStart + ((i + 0.5) / numSeg) * arcSpan;
    const wx = wcx + radius * Math.cos(aMid) * scale;
    const wz = wcz + radius * Math.sin(aMid) * scale;
    const wallY = (0.5 + 4.0) * scale - 0.5;
    const halfAng = -aMid / 2;

    walls.push({
      halfExtents: [hThick, hHeight, segHalfLen],
      position: [wx, wallY, wz],
      quaternion: [0, Math.sin(halfAng), 0, Math.cos(halfAng)],
      friction: 0.0,
      restitution: 0.1,
    });
  }
}
