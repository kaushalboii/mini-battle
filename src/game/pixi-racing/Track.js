import { Container3D, Model3D, Quaternion, Vector3 } from '@pixi/3d';

const ORIENT_DEG = { 0: 0, 10: 180, 16: 90, 22: 270 };

const CELL_RAW = 9.99;
const GRID_SCALE = 0.75;

/**
 * 5 Progressive Large Circuits (Level 1 -> Level 5).
 * Every track starts cleanly at [0, 0, 'track-finish', 0] heading South (+Z)
 * and closes into a mathematically continuous loop.
 */
export const TRACK_DEFINITIONS = {
  'level-1': {
    id: 'level-1',
    level: 1,
    name: 'Level 1 • Rookie Speedway',
    shortName: 'LVL 1: ROOKIE',
    difficulty: 'ROOKIE',
    lengthLabel: '1.65 KM',
    corners: 6,
    bumps: 0,
    targetLapSec: 22,
    desc: 'Wide sweeping bends and long twin straights to push straight up through all 6 gears.',
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
    name: 'Level 2 • Twin-Jump Arena',
    shortName: 'LVL 2: TWIN-JUMP',
    difficulty: 'AMATEUR',
    lengthLabel: '1.80 KM',
    corners: 6,
    bumps: 4,
    targetLapSec: 24,
    desc: 'High-speed dual straightaways packed with 4 suspension bump ramps and a technical mid-track kink.',
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
      [-1, -3, 'track-bump', 22],
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
    bumps: 4,
    targetLapSec: 30,
    desc: 'Rapid consecutive S-chicanes demanding smooth throttle feathering, followed by an explosive 6th-gear North sprint.',
    cells: [
      [0, 0, 'track-finish', 0],
      [0, 1, 'track-straight', 0],
      [0, 2, 'track-bump', 0],
      [0, 3, 'track-straight', 0],
      [0, 4, 'track-corner', 22],
      [-1, 4, 'track-straight', 16],
      [-2, 4, 'track-corner', 10],
      [-2, 3, 'track-corner', 0],
      [-3, 3, 'track-straight', 16],
      [-4, 3, 'track-corner', 10],
      [-4, 2, 'track-corner', 0],
      [-5, 2, 'track-straight', 16],
      [-6, 2, 'track-straight', 16],
      [-7, 2, 'track-corner', 10],
      [-7, 1, 'track-straight', 10],
      [-7, 0, 'track-bump', 10],
      [-7, -1, 'track-straight', 10],
      [-7, -2, 'track-straight', 10],
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
    bumps: 6,
    targetLapSec: 39,
    desc: 'Extended East-West & North-South Grand Prix circuit with an inner hairpin pocket and high-speed bump complexes.',
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
    name: 'Level 5 • Apex Marathon',
    shortName: 'LVL 5: APEX GP',
    difficulty: 'MASTER',
    lengthLabel: '3.75 KM',
    corners: 12,
    bumps: 9,
    targetLapSec: 50,
    desc: 'Massive 50-sector endurance championship loop spanning the entire valley with triple-bump straights and technical hairpins.',
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

function placeModel(source, parent, x, y, z, yawRad) {
  const root = new Model3D(source);

  root.position.set(x, y, z);
  _q.setFromAxisAngle(_yAxis, yawRad);
  root.quaternion.copyFrom(_q);
  parent.addChild(root);

  return root;
}

export function buildTrack(parent, sources, trackId = 'level-1') {
  const def = TRACK_DEFINITIONS[trackId] || TRACK_DEFINITIONS['level-1'];
  const trackCells = def.cells;

  const trackGroup = new Container3D();
  trackGroup.scale.set(GRID_SCALE, GRID_SCALE, GRID_SCALE);
  trackGroup.position.set(0, -0.5, 0);
  parent.addChild(trackGroup);

  const waypoints = [];

  for (const [gx, gz, key, orient] of trackCells) {
    const wp = pieceWorldPosition(gx, gz);
    waypoints.push({ x: wp.x, z: wp.z, key, orient });

    const source = sources[key];
    if (!source) continue;

    const px = (gx + 0.5) * CELL_RAW;
    const pz = (gz + 0.5) * CELL_RAW;
    const yaw = ((ORIENT_DEG[orient] ?? 0) * Math.PI) / 180;

    placeModel(source, trackGroup, px, 0.5, pz, yaw);
  }

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

    placeModel(source, trackGroup, px, 0.5, pz, yaw);
  }

  // Keep padding at 2 on larger tracks to preserve crisp 60 FPS performance
  const pad = trackCells.length >= 28 ? 2 : 3;

  for (let gz = minZ - pad; gz <= maxZ + pad; gz++) {
    for (let gx = minX - pad; gx <= maxX + pad; gx++) {
      if (occupied.has(`${gx},${gz}`)) continue;

      const distX = gx < minX ? minX - gx : gx > maxX ? gx - maxX : 0;
      const distZ = gz < minZ ? minZ - gz : gz > maxZ ? gz - maxZ : 0;
      const dist = Math.max(distX, distZ);

      const px = (gx + 0.5) * CELL_RAW;
      const pz = (gz + 0.5) * CELL_RAW;

      let key = 'decoration-forest';
      let yawQuarters = 0;

      if (dist <= 1) {
        const h = pseudoHash(gx, gz);

        if (h % 8 === 0) {
          key = 'decoration-tents';
          yawQuarters = h % 4;
        } else {
          key = 'decoration-empty';
        }
      }

      const source = sources[key];
      if (!source) continue;

      placeModel(source, trackGroup, px, 0.5, pz, (yawQuarters * Math.PI) / 2);
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

function buildWallColliders(trackCells) {
  const S = GRID_SCALE;
  const CELL_HALF = CELL_RAW / 2;
  const WALL_HALF_THICK = 0.25;
  const WALL_X = 4.75;
  const WALL_HALF_H = 1.5;

  const wallY = (0.5 + WALL_HALF_H) * S - 0.5;
  const hThick = WALL_HALF_THICK * S;
  const hHeight = WALL_HALF_H * S;
  const hLen = CELL_HALF * S;

  const ARC_SPAN = -Math.PI / 2;
  const ARC_CENTER_X = -CELL_HALF;
  const ARC_CENTER_Z = CELL_HALF;
  const OUTER_R = 2 * CELL_HALF - WALL_HALF_THICK;
  const OUTER_SEG = 8;
  const OUTER_SEG_HALF_LEN = ((OUTER_R * (Math.PI / 2)) / OUTER_SEG / 2) * S;
  const INNER_R = WALL_HALF_THICK;
  const INNER_SEG = 3;
  const INNER_SEG_HALF_LEN = ((INNER_R * (Math.PI / 2)) / INNER_SEG / 2) * S;

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
        });
      }

      if (key === 'track-bump') {
        walls.push({
          halfExtents: [3.8 * S, 0.055, 0.42],
          position: [cx, -0.125 + 0.055, cz],
          quaternion: [0, Math.sin(rad / 2), 0, Math.cos(rad / 2)],
          friction: 3.5,
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
    const wallY = (0.5 + 1.5) * scale - 0.5;
    const halfAng = -aMid / 2;

    walls.push({
      halfExtents: [hThick, hHeight, segHalfLen],
      position: [wx, wallY, wz],
      quaternion: [0, Math.sin(halfAng), 0, Math.cos(halfAng)],
    });
  }
}
