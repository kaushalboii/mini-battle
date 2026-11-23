/**
 * RevSector 3D - Modular Circuit & Environmental Grid
 * Instantiates the circuit segments, environmental forest canopy, trackside paddock, and rigid physics colliders.
 * Engineered by Kaushal.
 */

import { Container3D, Model3D, Quaternion, Vector3 } from '@pixi/3d';

const ORIENT_DEG = { 0: 0, 10: 180, 16: 90, 22: 270 };

const CELL_RAW = 9.99;
const GRID_SCALE = 0.75;

const TRACK_CELLS = [
  // --- Sector 1: Main Pit Straight & Curva Grande ---
  [0, 0, 'track-finish', 0],      // Start/Finish Line & Timing Gantry
  [0, 1, 'track-straight', 0],    // Pit Straight Acceleration
  [0, 2, 'track-straight', 0],    // Main Straight DRS Speed Trap
  [0, 3, 'track-corner', 22],     // Turn 1: Hard Braking into Right Curve
  [-1, 3, 'track-straight', 16],  // Curva Grande High-Speed Arc
  [-2, 3, 'track-straight', 16],  // Curva Grande Apex
  [-3, 3, 'track-straight', 16],  // Curva Grande Exit
  [-4, 3, 'track-corner', 10],    // Turn 2: Sweeping Hairpin into Sector 2

  // --- Sector 2: High-Velocity Back Straight ---
  [-4, 2, 'track-straight', 0],   // Back Straight DRS Zone
  [-4, 1, 'track-straight', 0],   // Full Throttle Run
  [-4, 0, 'track-straight', 0],   // Sector 2 Speed Trap
  [-4, -1, 'track-straight', 0],  // High-Speed Straightaway
  [-4, -2, 'track-straight', 0],  // Heavy Braking Zone

  // --- Sector 3: Ascari Chicane & Parabolica ---
  [-4, -3, 'track-corner', 16],   // Turn 3: Ascari Chicane Entry
  [-3, -3, 'track-straight', 16], // Chicane High-Speed Transition
  [-2, -3, 'track-corner', 0],    // Turn 4: Chicane Apex into Infield
  [-2, -2, 'track-straight', 0],  // Infield Stadium Straight
  [-2, -1, 'track-corner', 10],   // Turn 5: Technical S-Curve
  [-1, -1, 'track-straight', 16], // Parabolica Approach
  [0, -1, 'track-corner', 0],     // Final Turn: Parabolica onto Main Straight
];

const DECO_CELLS = [
  // Team Paddock Tents along Main Straight Pitlane
  [1, 0, 'decoration-tents', 22],
  [1, 1, 'decoration-tents', 22],
  [1, 2, 'decoration-tents', 22],

  // Infield Paddock & Festival Area
  [-1, 1, 'decoration-tents', 0],
  [-2, 1, 'decoration-tents', 16],
  [-3, 1, 'decoration-tents', 10],
  [-3, 0, 'decoration-tents', 0],

  // Infield Green Spaces
  [-1, 0, 'decoration-empty', 0],
  [-1, 2, 'decoration-empty', 0],
  [-2, 0, 'decoration-empty', 0],
  [-2, 2, 'decoration-empty', 0],
  [-3, -1, 'decoration-empty', 0],
  [-3, -2, 'decoration-empty', 0],
  [-3, 2, 'decoration-empty', 0],
];

const NPC_TRUCKS = [
  { key: 'vehicle-truck-green', x: 8.5, y: -0.01, z: 8.0, rotDeg: 180.0 },
  { key: 'vehicle-truck-purple', x: -14.0, y: -0.14, z: 7.5, rotDeg: 90.0 },
  { key: 'vehicle-truck-red', x: -28.5, y: -0.15, z: 0.0, rotDeg: 270.0 },
];

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

export function buildTrack(parent, sources) {
  const trackGroup = new Container3D();

  trackGroup.scale.set(GRID_SCALE, GRID_SCALE, GRID_SCALE);
  trackGroup.position.set(0, -0.5, 0);
  parent.addChild(trackGroup);

  for (const [gx, gz, key, orient] of TRACK_CELLS) {
    const source = sources[key];

    if (!source) continue;

    const px = (gx + 0.5) * CELL_RAW;
    const pz = (gz + 0.5) * CELL_RAW;
    const yaw = ((ORIENT_DEG[orient] ?? 0) * Math.PI) / 180;

    placeModel(source, trackGroup, px, 0.5, pz, yaw);
  }

  // Decorations
  const occupied = new Set();
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const [gx, gz] of TRACK_CELLS) {
    occupied.add(`${gx},${gz}`);
    if (gx < minX) minX = gx;
    if (gx > maxX) maxX = gx;
    if (gz < minZ) minZ = gz;
    if (gz > maxZ) maxZ = gz;
  }

  for (const [gx, gz, key, orient] of DECO_CELLS) {
    occupied.add(`${gx},${gz}`);
    if (gx < minX) minX = gx;
    if (gx > maxX) maxX = gx;
    if (gz < minZ) minZ = gz;
    if (gz > maxZ) maxZ = gz;

    const source = sources[key];

    if (!source) continue;

    const px = (gx + 0.5) * CELL_RAW;
    const pz = (gz + 0.5) * CELL_RAW;
    const yaw = ((ORIENT_DEG[orient] ?? 0) * Math.PI) / 180;

    placeModel(source, trackGroup, px, 0.5, pz, yaw);
  }

  const pad = 3;

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

  // Parked trucks go in `parent`, outside the scaled track group
  for (const npc of NPC_TRUCKS) {
    const source = sources[npc.key];

    if (!source) continue;

    const npcRoot = placeModel(
      source,
      parent,
      npc.x,
      npc.y,
      npc.z,
      ((npc.rotDeg + 180) * Math.PI) / 180,
    );

    npcRoot.scale.set(0.5, 0.5, 0.5);
  }

  // Walls
  const walls = buildWallColliders();

  // Finish line frame for lap detection (matches `track-finish` cell at gx=0, gz=0)
  const finishCell = TRACK_CELLS.find(([, , key]) => key === 'track-finish');
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

  for (const [gx, gz, key] of TRACK_CELLS) {
    if (key !== 'track-finish') requiredCellKeys.add(`${gx},${gz}`);
  }

  return {
    walls,
    finishCenter,
    finishForward,
    finishRight,
    requiredCellKeys,
    cellSize: CELL_RAW * GRID_SCALE,
  };
}

function pseudoHash(gx, gz) {
  let h = gx * 374761393 + gz * 668265263;

  h = (h ^ (h >> 13)) * 1274126177;

  return (h ^ (h >> 16)) >>> 0;
}

function buildWallColliders() {
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

  for (const [gx, gz, key, orient] of TRACK_CELLS) {
    if (key === 'track-bump') continue;

    const cx = (gx + 0.5) * CELL_RAW * S;
    const cz = (gz + 0.5) * CELL_RAW * S;
    const deg = ORIENT_DEG[orient] ?? 0;
    const rad = (deg * Math.PI) / 180;
    const cr = Math.cos(rad);
    const sr = Math.sin(rad);

    if (key === 'track-straight' || key === 'track-finish') {
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
