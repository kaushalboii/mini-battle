import { Container3D, Model3D, Mesh3D, CubeGeometry, Material3D, Quaternion, Vector3 } from '@pixi/3d';

const ORIENT_DEG = { 0: 0, 10: 180, 16: 90, 22: 270 };

const CELL_RAW = 9.99;
const GRID_SCALE = 0.75;

// Shared visual materials for 3D track barriers and hazards
const _cubeGeom = new CubeGeometry({ width: 1, height: 1, depth: 1 });
const _matConcrete = new Material3D({ baseColor: 0x272e39, roughness: 0.85 });
const _matHazardYellow = new Material3D({ baseColor: 0xfacc15, roughness: 0.35, metallic: 0.2 });
const _matHazardDark = new Material3D({ baseColor: 0x111827, roughness: 0.7 });
const _matHazardRed = new Material3D({ baseColor: 0xef4444, roughness: 0.4 });
const _matHazardWhite = new Material3D({ baseColor: 0xf9fafb, roughness: 0.4 });
const _matGuardrail = new Material3D({ baseColor: 0xc4cacf, metallic: 0.6, roughness: 0.3 });
const _matCurbRed = new Material3D({ baseColor: 0xd92626, roughness: 0.5 });
const _matCurbWhite = new Material3D({ baseColor: 0xf3f4f6, roughness: 0.5 });

/**
 * 5 Progressive Circuits (Level 1 -> Level 5):
 * - Level 1: Pure uninterrupted asphalt speedway. 0 bumps, 0 obstacles. Full speed mastery.
 * - Levels 2 to 5: Progressively packed with interruptions (suspension jump ramps, chicane blocks,
 *   narrowing obstacle gates, center concrete dividers) to make driving engaging and challenging.
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
    obstacles: 0,
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
    name: 'Level 2 • Speed Bumps & Chicanes',
    shortName: 'LVL 2: CHICANE JUMP',
    difficulty: 'AMATEUR',
    lengthLabel: '1.80 KM',
    corners: 6,
    bumps: 4,
    obstacles: 4,
    targetLapSec: 25,
    desc: 'High-speed straights interrupted with 4 suspension jump ramps and 4 chicane hazard barriers requiring sharp steering reflexes.',
    cells: [
      [0, 0, 'track-finish', 0],
      [0, 1, 'track-chicane-left', 0],
      [0, 2, 'track-bump', 0],
      [0, 3, 'track-corner', 22],
      [-1, 3, 'track-chicane-right', 16],
      [-2, 3, 'track-bump', 16],
      [-3, 3, 'track-straight', 16],
      [-4, 3, 'track-chicane-left', 16],
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
      [-3, -3, 'track-chicane-right', 22],
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
    name: 'Level 3 • Canyon Hazard Run',
    shortName: 'LVL 3: CANYON HAZARDS',
    difficulty: 'PRO',
    lengthLabel: '2.25 KM',
    corners: 10,
    bumps: 6,
    obstacles: 9,
    targetLapSec: 32,
    desc: 'Technical S-bends interrupted by 6 jump ramps, 9 staggered chicane barriers, and narrowing gates across rapid braking zones.',
    cells: [
      [0, 0, 'track-finish', 0],
      [0, 1, 'track-chicane-left', 0],
      [0, 2, 'track-bump', 0],
      [0, 3, 'track-barrier-gate', 0],
      [0, 4, 'track-corner', 22],
      [-1, 4, 'track-chicane-right', 16],
      [-2, 4, 'track-corner', 10],
      [-2, 3, 'track-corner', 0],
      [-3, 3, 'track-bump', 16],
      [-4, 3, 'track-corner', 10],
      [-4, 2, 'track-corner', 0],
      [-5, 2, 'track-chicane-left', 16],
      [-6, 2, 'track-hazard-center', 16],
      [-7, 2, 'track-corner', 10],
      [-7, 1, 'track-straight', 10],
      [-7, 0, 'track-bump', 10],
      [-7, -1, 'track-chicane-right', 10],
      [-7, -2, 'track-bump', 10],
      [-7, -3, 'track-corner', 16],
      [-6, -3, 'track-corner', 22],
      [-6, -4, 'track-corner', 16],
      [-5, -4, 'track-bump', 22],
      [-4, -4, 'track-barrier-gate', 22],
      [-3, -4, 'track-chicane-left', 22],
      [-2, -4, 'track-chicane-right', 22],
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
    name: 'Level 4 • The Gauntlet GP',
    shortName: 'LVL 4: THE GAUNTLET',
    difficulty: 'EXPERT',
    lengthLabel: '2.92 KM',
    corners: 12,
    bumps: 7,
    obstacles: 16,
    targetLapSec: 42,
    desc: 'Intense GP circuit featuring 7 high-velocity jump bumps and 16 slalom barriers, center concrete dividers, and narrow obstacle gates.',
    cells: [
      [0, 0, 'track-finish', 0],
      [0, 1, 'track-chicane-left', 0],
      [0, 2, 'track-barrier-gate', 0],
      [0, 3, 'track-bump', 0],
      [0, 4, 'track-chicane-right', 0],
      [0, 5, 'track-corner', 22],
      [-1, 5, 'track-hazard-center', 16],
      [-2, 5, 'track-bump', 16],
      [-3, 5, 'track-chicane-left', 16],
      [-4, 5, 'track-corner', 10],
      [-4, 4, 'track-straight', 10],
      [-4, 3, 'track-corner', 0],
      [-5, 3, 'track-chicane-right', 16],
      [-6, 3, 'track-bump', 16],
      [-7, 3, 'track-barrier-gate', 16],
      [-8, 3, 'track-corner', 10],
      [-8, 2, 'track-chicane-left', 10],
      [-8, 1, 'track-bump', 10],
      [-8, 0, 'track-hazard-center', 10],
      [-8, -1, 'track-chicane-right', 10],
      [-8, -2, 'track-corner', 16],
      [-7, -2, 'track-straight', 22],
      [-6, -2, 'track-corner', 22],
      [-6, -3, 'track-straight', 10],
      [-6, -4, 'track-straight', 10],
      [-6, -5, 'track-corner', 16],
      [-5, -5, 'track-bump', 22],
      [-4, -5, 'track-chicane-left', 22],
      [-3, -5, 'track-barrier-gate', 22],
      [-2, -5, 'track-chicane-right', 22],
      [-1, -5, 'track-bump', 22],
      [0, -5, 'track-hazard-center', 22],
      [1, -5, 'track-straight', 22],
      [2, -5, 'track-corner', 0],
      [2, -4, 'track-chicane-left', 0],
      [2, -3, 'track-bump', 0],
      [2, -2, 'track-corner', 22],
      [1, -2, 'track-chicane-right', 16],
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
    name: 'Level 5 • Apex Impossible Marathon',
    shortName: 'LVL 5: APEX MARATHON',
    difficulty: 'MASTER',
    lengthLabel: '3.75 KM',
    corners: 12,
    bumps: 10,
    obstacles: 23,
    targetLapSec: 56,
    desc: 'Massive endurance championship loop spanning the entire valley with 10 launch ramps, double jump mounds, and 23 heavy obstacle barriers.',
    cells: [
      [0, 0, 'track-finish', 0],
      [0, 1, 'track-chicane-left', 0],
      [0, 2, 'track-bump', 0],
      [0, 3, 'track-barrier-gate', 0],
      [0, 4, 'track-hazard-center', 0],
      [0, 5, 'track-bump', 0],
      [0, 6, 'track-corner', 22],
      [-1, 6, 'track-chicane-right', 16],
      [-2, 6, 'track-bump', 16],
      [-3, 6, 'track-barrier-gate', 16],
      [-4, 6, 'track-chicane-left', 16],
      [-5, 6, 'track-corner', 10],
      [-5, 5, 'track-straight', 10],
      [-5, 4, 'track-corner', 0],
      [-6, 4, 'track-chicane-right', 16],
      [-7, 4, 'track-bump', 16],
      [-8, 4, 'track-hazard-center', 16],
      [-9, 4, 'track-chicane-left', 16],
      [-10, 4, 'track-corner', 10],
      [-10, 3, 'track-barrier-gate', 10],
      [-10, 2, 'track-bump', 10],
      [-10, 1, 'track-chicane-right', 10],
      [-10, 0, 'track-hazard-center', 10],
      [-10, -1, 'track-bump', 10],
      [-10, -2, 'track-chicane-left', 10],
      [-10, -3, 'track-barrier-gate', 10],
      [-10, -4, 'track-corner', 16],
      [-9, -4, 'track-straight', 22],
      [-8, -4, 'track-corner', 22],
      [-8, -5, 'track-straight', 10],
      [-8, -6, 'track-corner', 16],
      [-7, -6, 'track-chicane-right', 22],
      [-6, -6, 'track-bump', 22],
      [-5, -6, 'track-hazard-center', 22],
      [-4, -6, 'track-barrier-gate', 22],
      [-3, -6, 'track-bump', 22],
      [-2, -6, 'track-chicane-left', 22],
      [-1, -6, 'track-chicane-right', 22],
      [0, -6, 'track-hazard-center', 22],
      [1, -6, 'track-bump', 22],
      [2, -6, 'track-barrier-gate', 22],
      [3, -6, 'track-corner', 0],
      [3, -5, 'track-chicane-left', 0],
      [3, -4, 'track-bump', 0],
      [3, -3, 'track-chicane-right', 0],
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
 * 3D Guardrail barriers along straight track borders.
 */
function createGuardrailsForStraight(parent, px, py, pz, yawRad) {
  const group = new Container3D();
  group.position.set(px, py, pz);
  _q.setFromAxisAngle(_yAxis, yawRad);
  group.quaternion.copyFrom(_q);

  for (const side of [-1, 1]) {
    const lx = side * 4.72;

    // Metallic guardrail beam
    const rail = new Mesh3D({ geometry: _cubeGeom, material: _matGuardrail });
    rail.scale.set(0.22, 0.65, 9.98);
    rail.position.set(lx, 0.42, 0);
    group.addChild(rail);

    // Red & white racing curb trim along bottom
    const curb = new Mesh3D({
      geometry: _cubeGeom,
      material: side === -1 ? _matCurbRed : _matCurbWhite,
    });
    curb.scale.set(0.38, 0.16, 9.98);
    curb.position.set(side * 4.54, 0.08, 0);
    group.addChild(curb);
  }

  parent.addChild(group);
}

/**
 * 3D Guardrail barriers along corner arcs (outer and inner edges).
 */
function createGuardrailsForCorner(parent, px, py, pz, yawRad) {
  const S = 1.0; // In trackGroup space
  const CELL_HALF = CELL_RAW / 2;
  const ARC_CENTER_X = -CELL_HALF;
  const ARC_CENTER_Z = CELL_HALF;
  const ARC_SPAN = -Math.PI / 2;

  const cr = Math.cos(yawRad);
  const sr = Math.sin(yawRad);
  const wcx = px + (ARC_CENTER_X * cr + ARC_CENTER_Z * sr);
  const wcz = pz + (-ARC_CENTER_X * sr + ARC_CENTER_Z * cr);
  const arcStart = -yawRad;

  // Outer guardrail
  const OUTER_R = 9.72;
  const outerSegs = 10;
  const outerLen = (OUTER_R * (Math.PI / 2) / outerSegs) * 1.15;

  for (let i = 0; i < outerSegs; i++) {
    const a = arcStart + ((i + 0.5) / outerSegs) * ARC_SPAN;
    const gx = wcx + OUTER_R * Math.cos(a);
    const gz = wcz + OUTER_R * Math.sin(a);
    const rail = new Mesh3D({ geometry: _cubeGeom, material: _matGuardrail });
    rail.scale.set(0.22, 0.65, outerLen);
    rail.position.set(gx, py + 0.42, gz);
    _q.setFromAxisAngle(_yAxis, -a + Math.PI / 2);
    rail.quaternion.copyFrom(_q);
    parent.addChild(rail);
  }

  // Inner apex curb
  const INNER_R = 0.32;
  const innerSegs = 4;
  const innerLen = (INNER_R * (Math.PI / 2) / innerSegs) * 1.4;

  for (let i = 0; i < innerSegs; i++) {
    const a = arcStart + ((i + 0.5) / innerSegs) * ARC_SPAN;
    const gx = wcx + INNER_R * Math.cos(a);
    const gz = wcz + INNER_R * Math.sin(a);
    const curb = new Mesh3D({ geometry: _cubeGeom, material: _matCurbRed });
    curb.scale.set(0.28, 0.35, innerLen);
    curb.position.set(gx, py + 0.18, gz);
    _q.setFromAxisAngle(_yAxis, -a + Math.PI / 2);
    curb.quaternion.copyFrom(_q);
    parent.addChild(curb);
  }
}

/**
 * Creates a chicane obstacle covering half the road width.
 * side = -1: Left chicane block (forces vehicle to right)
 * side = 1: Right chicane block (forces vehicle to left)
 */
function createChicaneBarrier(parent, side, px, py, pz, yawRad) {
  const group = new Container3D();
  group.position.set(px, py, pz);
  _q.setFromAxisAngle(_yAxis, yawRad);
  group.quaternion.copyFrom(_q);

  const lx = side * 2.45;

  // Solid concrete core
  const base = new Mesh3D({ geometry: _cubeGeom, material: _matConcrete });
  base.scale.set(4.5, 1.15, 1.75);
  base.position.set(lx, 0.58, 0);
  group.addChild(base);

  // Yellow hazard chevron stripes
  const stripes = new Mesh3D({ geometry: _cubeGeom, material: _matHazardYellow });
  stripes.scale.set(4.3, 0.35, 1.82);
  stripes.position.set(lx, 0.72, 0);
  group.addChild(stripes);

  // Flashing hazard pylon on tip towards centerline
  const pylon = new Mesh3D({ geometry: _cubeGeom, material: _matHazardRed });
  pylon.scale.set(0.4, 0.85, 0.4);
  pylon.position.set(side * 0.45, 1.45, 0);
  group.addChild(pylon);

  parent.addChild(group);
}

/**
 * Creates narrowing barrier gates on both sides, leaving a center passage.
 */
function createBarrierGate(parent, px, py, pz, yawRad) {
  const group = new Container3D();
  group.position.set(px, py, pz);
  _q.setFromAxisAngle(_yAxis, yawRad);
  group.quaternion.copyFrom(_q);

  for (const side of [-1, 1]) {
    const lx = side * 3.35;

    const base = new Mesh3D({ geometry: _cubeGeom, material: _matConcrete });
    base.scale.set(3.0, 1.15, 1.75);
    base.position.set(lx, 0.58, 0);
    group.addChild(base);

    const band = new Mesh3D({ geometry: _cubeGeom, material: _matHazardRed });
    band.scale.set(2.9, 0.35, 1.82);
    band.position.set(lx, 0.72, 0);
    group.addChild(band);

    const post = new Mesh3D({ geometry: _cubeGeom, material: _matHazardWhite });
    post.scale.set(0.35, 0.75, 0.35);
    post.position.set(side * 1.95, 1.45, 0);
    group.addChild(post);
  }

  parent.addChild(group);
}

/**
 * Creates a concrete crash divider obstacle in the center of the road.
 */
function createCenterHazard(parent, px, py, pz, yawRad) {
  const group = new Container3D();
  group.position.set(px, py, pz);
  _q.setFromAxisAngle(_yAxis, yawRad);
  group.quaternion.copyFrom(_q);

  const base = new Mesh3D({ geometry: _cubeGeom, material: _matConcrete });
  base.scale.set(1.8, 1.15, 2.7);
  base.position.set(0, 0.58, 0);
  group.addChild(base);

  const stripes = new Mesh3D({ geometry: _cubeGeom, material: _matHazardYellow });
  stripes.scale.set(1.86, 0.35, 2.5);
  stripes.position.set(0, 0.72, 0);
  group.addChild(stripes);

  parent.addChild(group);
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
      // 1. Place the FULL 10x10 straight asphalt tile cleanly underneath
      if (sources['track-straight']) {
        placeModel(sources['track-straight'], trackGroup, px, 0.5, pz, yaw, false, true);
      }
      // 2. Seat the speed bump obstacle directly on the asphalt surface
      if (sources['track-bump']) {
        const bump = placeModel(sources['track-bump'], trackGroup, px, 0.5, pz, yaw, true, true);
        bump.scale.set(2.2, 0.65, 0.95);
      }
      createGuardrailsForStraight(trackGroup, px, 0.5, pz, yaw);
      continue;
    }

    if (key === 'track-chicane-left') {
      if (sources['track-straight']) {
        placeModel(sources['track-straight'], trackGroup, px, 0.5, pz, yaw, false, true);
      }
      createChicaneBarrier(trackGroup, -1, px, 0.5, pz, yaw);
      createGuardrailsForStraight(trackGroup, px, 0.5, pz, yaw);
      continue;
    }

    if (key === 'track-chicane-right') {
      if (sources['track-straight']) {
        placeModel(sources['track-straight'], trackGroup, px, 0.5, pz, yaw, false, true);
      }
      createChicaneBarrier(trackGroup, 1, px, 0.5, pz, yaw);
      createGuardrailsForStraight(trackGroup, px, 0.5, pz, yaw);
      continue;
    }

    if (key === 'track-barrier-gate') {
      if (sources['track-straight']) {
        placeModel(sources['track-straight'], trackGroup, px, 0.5, pz, yaw, false, true);
      }
      createBarrierGate(trackGroup, px, 0.5, pz, yaw);
      createGuardrailsForStraight(trackGroup, px, 0.5, pz, yaw);
      continue;
    }

    if (key === 'track-hazard-center') {
      if (sources['track-straight']) {
        placeModel(sources['track-straight'], trackGroup, px, 0.5, pz, yaw, false, true);
      }
      createCenterHazard(trackGroup, px, 0.5, pz, yaw);
      createGuardrailsForStraight(trackGroup, px, 0.5, pz, yaw);
      continue;
    }

    const source = sources[key];
    if (!source) continue;

    // Only finish arch needs castShadow on track tiles; roads only receiveShadow
    const casts = key === 'track-finish';
    placeModel(source, trackGroup, px, 0.5, pz, yaw, casts, true);

    if (key === 'track-straight' || key === 'track-finish') {
      createGuardrailsForStraight(trackGroup, px, 0.5, pz, yaw);
    } else if (key === 'track-corner') {
      createGuardrailsForCorner(trackGroup, px, 0.5, pz, yaw);
    }
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
 * Builds heavy 9-meter tall, 1.3-meter thick collision walls
 * plus static box colliders for all chicane, gate, divider, and bump obstacles.
 */
function buildWallColliders(trackCells) {
  const S = GRID_SCALE;
  const CELL_HALF = CELL_RAW / 2;
  const WALL_HALF_THICK = 0.85;
  const WALL_X = 4.75;
  const WALL_HALF_H = 6.0;

  const wallY = (0.5 + WALL_HALF_H) * S - 0.5;
  const hThick = WALL_HALF_THICK * S;
  const hHeight = WALL_HALF_H * S;
  const hLen = CELL_HALF * S;

  const ARC_SPAN = -Math.PI / 2;
  const ARC_CENTER_X = -CELL_HALF;
  const ARC_CENTER_Z = CELL_HALF;
  const OUTER_R = 2 * CELL_HALF - WALL_HALF_THICK;
  const OUTER_SEG = 18;
  const OUTER_SEG_HALF_LEN = (((OUTER_R * (Math.PI / 2)) / OUTER_SEG / 2) * S) * 1.25;
  const INNER_R = WALL_HALF_THICK;
  const INNER_SEG = 10;
  const INNER_SEG_HALF_LEN = (((INNER_R * (Math.PI / 2)) / INNER_SEG / 2) * S) * 1.25;

  const walls = [];

  for (const [gx, gz, key, orient] of trackCells) {
    const cx = (gx + 0.5) * CELL_RAW * S;
    const cz = (gz + 0.5) * CELL_RAW * S;
    const deg = ORIENT_DEG[orient] ?? 0;
    const rad = (deg * Math.PI) / 180;
    const cr = Math.cos(rad);
    const sr = Math.sin(rad);

    const isStraightType =
      key === 'track-straight' ||
      key === 'track-finish' ||
      key === 'track-bump' ||
      key === 'track-chicane-left' ||
      key === 'track-chicane-right' ||
      key === 'track-barrier-gate' ||
      key === 'track-hazard-center';

    if (isStraightType) {
      // Outer border walls along both track sides
      for (const side of [-1, 1]) {
        const lx = side * WALL_X;
        const wx = cx + lx * cr * S;
        const wz = cz + -lx * sr * S;

        walls.push({
          halfExtents: [hThick, hHeight, hLen],
          position: [wx, wallY, wz],
          quaternion: [0, Math.sin(rad / 2), 0, Math.cos(rad / 2)],
          friction: 0.05,
          restitution: 0.15,
        });
      }

      // Suspension speed bump ramp
      if (key === 'track-bump') {
        walls.push({
          halfExtents: [3.2 * S, 0.08, 0.75 * S],
          position: [cx, -0.125 + 0.08, cz],
          quaternion: [0, Math.sin(rad / 2), 0, Math.cos(rad / 2)],
          friction: 3.5,
          restitution: 0.25,
        });
      }

      // Chicane Left Barrier
      if (key === 'track-chicane-left') {
        const localX = -2.45;
        const wx = cx + localX * cr * S;
        const wz = cz + -localX * sr * S;
        walls.push({
          halfExtents: [4.5 * S / 2, 1.2 * S / 2, 1.8 * S / 2],
          position: [wx, -0.125 + (1.2 * S / 2), wz],
          quaternion: [0, Math.sin(rad / 2), 0, Math.cos(rad / 2)],
          friction: 0.75,
          restitution: 0.2,
        });
      }

      // Chicane Right Barrier
      if (key === 'track-chicane-right') {
        const localX = 2.45;
        const wx = cx + localX * cr * S;
        const wz = cz + -localX * sr * S;
        walls.push({
          halfExtents: [4.5 * S / 2, 1.2 * S / 2, 1.8 * S / 2],
          position: [wx, -0.125 + (1.2 * S / 2), wz],
          quaternion: [0, Math.sin(rad / 2), 0, Math.cos(rad / 2)],
          friction: 0.75,
          restitution: 0.2,
        });
      }

      // Narrowing Barrier Gate
      if (key === 'track-barrier-gate') {
        for (const side of [-1, 1]) {
          const localX = side * 3.35;
          const wx = cx + localX * cr * S;
          const wz = cz + -localX * sr * S;
          walls.push({
            halfExtents: [3.0 * S / 2, 1.2 * S / 2, 1.8 * S / 2],
            position: [wx, -0.125 + (1.2 * S / 2), wz],
            quaternion: [0, Math.sin(rad / 2), 0, Math.cos(rad / 2)],
            friction: 0.75,
            restitution: 0.2,
          });
        }
      }

      // Center Concrete Hazard Divider
      if (key === 'track-hazard-center') {
        walls.push({
          halfExtents: [1.8 * S / 2, 1.2 * S / 2, 2.7 * S / 2],
          position: [cx, -0.125 + (1.2 * S / 2), cz],
          quaternion: [0, Math.sin(rad / 2), 0, Math.cos(rad / 2)],
          friction: 0.75,
          restitution: 0.2,
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
    const wallY = (0.5 + 6.0) * scale - 0.5;
    const halfAng = -aMid / 2;

    walls.push({
      halfExtents: [hThick, hHeight, segHalfLen],
      position: [wx, wallY, wz],
      quaternion: [0, Math.sin(halfAng), 0, Math.cos(halfAng)],
      friction: 0.05,
      restitution: 0.15,
    });
  }
}
