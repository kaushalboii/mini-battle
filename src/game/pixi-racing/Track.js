import { Container3D, Model3D, Quaternion, Vector3 } from '@pixi/3d';

const ORIENT_DEG = { 0: 0, 10: 180, 16: 90, 22: 270 };

const CELL_RAW = 9.99;
const GRID_SCALE = 0.75;

/**
 * Closed-loop track definitions ordered sequentially along the driving direction
 * so `waypoints` trace the exact centerline of each circuit cleanly.
 */
export const TRACK_DEFINITIONS = {
  classic: {
    id: 'classic',
    name: 'Kenney GP Speedway',
    subtitle: 'Original Stock Circuit',
    difficulty: 'BALANCED',
    lengthLabel: '0.85 KM',
    corners: 6,
    desc: 'The classic Kenney Starter Kit circuit featuring fast straights, wide drift corners, and a rhythmic S-chicane.',
    cells: [
      [0, 0, 'track-finish', 0],
      [0, 1, 'track-straight', 0],
      [0, 2, 'track-corner', 22],
      [-1, 2, 'track-straight', 16],
      [-2, 2, 'track-corner', 10],
      [-2, 1, 'track-straight', 10],
      [-2, 0, 'track-straight', 10],
      [-2, -1, 'track-corner', 0],
      [-3, -1, 'track-corner', 10],
      [-3, -2, 'track-straight', 0],
      [-3, -3, 'track-corner', 16],
      [-2, -3, 'track-straight', 22],
      [-1, -3, 'track-straight', 22],
      [0, -3, 'track-corner', 0],
      [0, -2, 'track-straight', 0],
      [0, -1, 'track-straight', 0],
    ],
    extraDecos: [
      [-4, -2, 'decoration-tents', 10],
      [-1, -4, 'decoration-tents', 22],
      [-1, 1, 'decoration-tents', 22],
    ],
  },
  'bump-oval': {
    id: 'bump-oval',
    name: 'Turbo Jump Oval',
    subtitle: 'High-Speed Stunt Loop',
    difficulty: 'FAST',
    lengthLabel: '0.78 KM',
    corners: 4,
    desc: 'High-velocity oval circuit fitted with dual speed-bump ramps for mid-air suspension hops and sweeping power slides.',
    cells: [
      [0, 0, 'track-finish', 0],
      [0, 1, 'track-straight', 0],
      [0, 2, 'track-corner', 22],
      [-1, 2, 'track-bump', 16],
      [-2, 2, 'track-straight', 16],
      [-3, 2, 'track-corner', 10],
      [-3, 1, 'track-straight', 10],
      [-3, 0, 'track-bump', 10],
      [-3, -1, 'track-straight', 10],
      [-3, -2, 'track-corner', 16],
      [-2, -2, 'track-straight', 22],
      [-1, -2, 'track-bump', 22],
      [0, -2, 'track-corner', 0],
      [0, -1, 'track-straight', 0],
    ],
    extraDecos: [
      [-4, 0, 'decoration-tents', 16],
      [-1, 0, 'decoration-tents', 0],
      [-2, 0, 'decoration-tents', 10],
      [-1, -3, 'decoration-tents', 22],
    ],
  },
  technical: {
    id: 'technical',
    name: 'Hairpin Grand Prix',
    subtitle: 'Technical S-Chicane Circuit',
    difficulty: 'PRO',
    lengthLabel: '1.15 KM',
    corners: 8,
    desc: 'Longer technical endurance layout combining tight hairpins, dual S-curves, and triple suspension bump sections.',
    cells: [
      [0, 0, 'track-finish', 0],
      [0, 1, 'track-straight', 0],
      [0, 2, 'track-straight', 0],
      [0, 3, 'track-corner', 22],
      [-1, 3, 'track-bump', 16],
      [-2, 3, 'track-corner', 10],
      [-2, 2, 'track-corner', 0],
      [-3, 2, 'track-straight', 16],
      [-4, 2, 'track-corner', 10],
      [-4, 1, 'track-straight', 10],
      [-4, 0, 'track-bump', 10],
      [-4, -1, 'track-straight', 10],
      [-4, -2, 'track-corner', 16],
      [-3, -2, 'track-corner', 22],
      [-3, -3, 'track-corner', 16],
      [-2, -3, 'track-straight', 22],
      [-1, -3, 'track-bump', 22],
      [0, -3, 'track-corner', 0],
      [0, -2, 'track-straight', 0],
      [0, -1, 'track-straight', 0],
    ],
    extraDecos: [
      [-1, 0, 'decoration-tents', 16],
      [-2, 0, 'decoration-tents', 0],
      [-5, 0, 'decoration-tents', 16],
      [-1, -4, 'decoration-tents', 22],
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

export function buildTrack(parent, sources, trackId = 'classic') {
  const def = TRACK_DEFINITIONS[trackId] || TRACK_DEFINITIONS.classic;
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

  // Track occupied cells & bounds
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

  const pad = 4;

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

        if (h % 7 === 0) {
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

  // Walls + subtle physical bumps
  const walls = buildWallColliders(trackCells);

  // Finish line frame for lap detection
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

      // Gentle physical ridge across bump pieces for realistic suspension hop
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
