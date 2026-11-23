/**
 * RevSector 3D - Modular Circuit Registry & Environmental Grid
 * Multi-circuit generator with dynamic wall collision mesh, racing-line waypoint extraction,
 * and environmental decor generation for Monza, Silverstone, and Marina Bay.
 * Engineered by Kaushal.
 */

import { Container3D, Model3D, Quaternion, Vector3 } from '@pixi/3d';

export const ORIENT_DEG: Record<number, number> = { 0: 0, 10: 180, 16: 90, 22: 270 };

export const CELL_RAW = 9.99;
export const GRID_SCALE = 1.05;
export const CELL_SIZE = CELL_RAW * GRID_SCALE; // 10.49m per cell (expanded scale!)

export type TrackCell = [number, number, string, number];

// ==========================================
// CIRCUIT 1: MONZA SPEED RING (Italy)
// Massive, sprawling Grand Prix circuit with 70m Main Pit Straight,
// high-speed Curva Grande, 120m Serraglio Back Straight, and Parabolica
// ==========================================
const MONZA_CELLS: TrackCell[] = [
  // Sector 1: Main Pit Straight Acceleration & Curva Grande
  [0, 0, 'track-finish', 0],      // Start/Finish Line & Electronic Gantry
  [0, 1, 'track-straight', 0],    // Pit Straight Acceleration
  [0, 2, 'track-straight', 0],    // Pit Lane Speed Trap
  [0, 3, 'track-straight', 0],    // DRS Zone 1 Activation
  [0, 4, 'track-straight', 0],    // Full Throttle Run
  [0, 5, 'track-straight', 0],    // High-Speed Straightaway
  [0, 6, 'track-straight', 0],    // Turn 1 Braking Board
  [0, 7, 'track-corner', 22],     // Turn 1: Curva Grande Entry (SW)
  [-1, 7, 'track-straight', 16],  // Curva Grande High-Speed Arc
  [-2, 7, 'track-straight', 16],  // Curva Grande Apex
  [-3, 7, 'track-straight', 16],  // Curva Grande Midpoint
  [-4, 7, 'track-straight', 16],  // High-G Sweeper
  [-5, 7, 'track-straight', 16],  // Curva Grande Arc
  [-6, 7, 'track-straight', 16],  // Roggia Approach
  [-7, 7, 'track-straight', 16],  // Heavy Braking Zone
  [-8, 7, 'track-corner', 10],    // Turn 2: Variante della Roggia (SE)

  // Sector 2: Super-Long Serraglio Back Straight
  [-8, 6, 'track-straight', 0],   // Back Straight DRS Zone
  [-8, 5, 'track-straight', 0],   // Full Throttle Run
  [-8, 4, 'track-straight', 0],   // High-Velocity Straightaway
  [-8, 3, 'track-straight', 0],   // Serraglio Speed Trap
  [-8, 2, 'track-straight', 0],   // High-Speed DRS Run
  [-8, 1, 'track-straight', 0],   // Sector 2 Midpoint
  [-8, 0, 'track-straight', 0],   // Lesmo Exit Run
  [-8, -1, 'track-straight', 0],  // Full Power Straight
  [-8, -2, 'track-straight', 0],  // Ascari Approach
  [-8, -3, 'track-straight', 0],  // 150m Braking Board
  [-8, -4, 'track-straight', 0],  // 100m Braking Board
  [-8, -5, 'track-corner', 16],   // Turn 3: Variante Ascari Entry (NE)

  // Sector 3: Ascari Chicane, Infield Stadium & Parabolica
  [-7, -5, 'track-straight', 16], // Ascari High-Speed Transition
  [-6, -5, 'track-straight', 16], // Chicane Apex
  [-5, -5, 'track-straight', 16], // Chicane Exit
  [-4, -5, 'track-corner', 0],    // Turn 4: Infield Stadium Apex (NW)
  [-4, -4, 'track-straight', 0],  // Stadium Straight
  [-4, -3, 'track-straight', 0],  // Stadium Infield Section
  [-4, -2, 'track-straight', 0],  // S-Curve Approach
  [-4, -1, 'track-corner', 10],   // Turn 5: Technical S-Curve (SE)
  [-3, -1, 'track-straight', 16], // Parabolica Approach Run
  [-2, -1, 'track-straight', 16], // Parabolica High-Speed Arc
  [-1, -1, 'track-straight', 16], // Parabolica Sweeper
  [0, -1, 'track-corner', 0],     // Turn 6: Parabolica curve onto Start/Finish (NW)
];

const MONZA_DECO: TrackCell[] = [
  // Pit Straight Grandstands & Paddock Tents
  [1, 0, 'decoration-tents', 22],
  [1, 1, 'decoration-tents', 22],
  [1, 2, 'decoration-tents', 22],
  [1, 3, 'decoration-tents', 22],
  [1, 4, 'decoration-tents', 22],
  [1, 5, 'decoration-tents', 22],
  [1, 6, 'decoration-tents', 22],

  // Infield Forest Canopy & Paddock Festival Area
  [-1, 1, 'decoration-tents', 0],
  [-2, 1, 'decoration-tents', 16],
  [-3, 1, 'decoration-tents', 10],
  [-1, 3, 'decoration-tents', 0],
  [-2, 3, 'decoration-tents', 16],
  [-3, 3, 'decoration-tents', 10],
  [-5, 1, 'decoration-tents', 0],
  [-6, 1, 'decoration-tents', 16],
  [-7, 1, 'decoration-tents', 10],
  [-5, 3, 'decoration-tents', 0],
  [-6, 3, 'decoration-tents', 16],
  [-7, 3, 'decoration-tents', 10],

  // Infield Green Spaces
  [-1, 0, 'decoration-empty', 0],
  [-2, 0, 'decoration-empty', 0],
  [-3, 0, 'decoration-empty', 0],
  [-1, 2, 'decoration-empty', 0],
  [-2, 2, 'decoration-empty', 0],
  [-3, 2, 'decoration-empty', 0],
  [-1, 4, 'decoration-empty', 0],
  [-2, 4, 'decoration-empty', 0],
  [-3, 4, 'decoration-empty', 0],
  [-1, 5, 'decoration-empty', 0],
  [-2, 5, 'decoration-empty', 0],
  [-3, 5, 'decoration-empty', 0],
  [-5, 0, 'decoration-empty', 0],
  [-6, 0, 'decoration-empty', 0],
  [-7, 0, 'decoration-empty', 0],
  [-5, 2, 'decoration-empty', 0],
  [-6, 2, 'decoration-empty', 0],
  [-7, 2, 'decoration-empty', 0],
  [-5, 4, 'decoration-empty', 0],
  [-6, 4, 'decoration-empty', 0],
  [-7, 4, 'decoration-empty', 0],
  [-5, 5, 'decoration-empty', 0],
  [-6, 5, 'decoration-empty', 0],
  [-7, 5, 'decoration-empty', 0],
];

// ==========================================
// CIRCUIT 2: SILVERSTONE GP (United Kingdom)
// Maggotts-Becketts chicane, Wellington straight, Vale braking zone, Woodcote
// ==========================================
const SILVERSTONE_CELLS: TrackCell[] = [
  [0, 0, 'track-finish', 0],     // Hamilton Straight / S/F Line
  [0, 1, 'track-straight', 0],   // Abbey Acceleration
  [0, 2, 'track-corner', 22],    // Turn 1: Copse Corner (SW)
  [-1, 2, 'track-straight', 16], // Maggotts Approach
  [-2, 2, 'track-corner', 16],   // Becketts Chicane (NE)
  [-2, 3, 'track-corner', 22],   // Chapel Exit (SW)
  [-3, 3, 'track-straight', 16], // Hangar Straight DRS
  [-4, 3, 'track-straight', 16], // High-Speed Run
  [-5, 3, 'track-corner', 10],   // Turn 4: Stowe Corner (SE)
  [-5, 2, 'track-straight', 0],  // Vale Braking Zone
  [-5, 1, 'track-straight', 0],  // Club Chicane
  [-5, 0, 'track-corner', 16],   // Turn 6: Farm Curve (NE)
  [-4, 0, 'track-corner', 22],   // Infield Loop Hairpin (SW)
  [-4, -1, 'track-corner', 16],  // Aintree Apex (NE)
  [-3, -1, 'track-straight', 16],// Wellington Straight DRS
  [-2, -1, 'track-straight', 16],// Brooklands Entry
  [-1, -1, 'track-straight', 16],// Luffield Complex
  [0, -1, 'track-corner', 0],    // Turn 10: Woodcote onto Straight (NW)
];

const SILVERSTONE_DECO: TrackCell[] = [
  [1, 0, 'decoration-tents', 22],
  [1, 1, 'decoration-tents', 22],
  [-1, 1, 'decoration-tents', 0],
  [-3, 2, 'decoration-tents', 16],
  [-3, 1, 'decoration-tents', 10],
  [-1, 0, 'decoration-empty', 0],
  [-2, 1, 'decoration-empty', 0],
  [-3, 0, 'decoration-empty', 0],
  [-4, 2, 'decoration-empty', 0],
  [-4, 1, 'decoration-empty', 0],
  [-2, 0, 'decoration-empty', 0],
];

// ==========================================
// CIRCUIT 3: MARINA BAY STREET CIRCUIT (Singapore)
// Tight 90° corners, close Armco barriers, night street racing, drift multiplier
// ==========================================
const MARINA_CELLS: TrackCell[] = [
  [0, 0, 'track-finish', 0],     // S/F: Padang Grandstand Straight
  [0, 1, 'track-straight', 0],   // DRS Acceleration
  [0, 2, 'track-straight', 0],   // Turn 1 Heavy Braking
  [0, 3, 'track-corner', 22],    // Turn 1: Sheares Curve (SW)
  [-1, 3, 'track-straight', 16], // Republic Boulevard
  [-2, 3, 'track-corner', 10],   // Turn 3: Esplanade Apex (SE)
  [-2, 2, 'track-straight', 0],  // City Street Run
  [-2, 1, 'track-corner', 0],    // Turn 5: Stamford Chicane (NW)
  [-3, 1, 'track-straight', 16], // Raffles Avenue DRS
  [-4, 1, 'track-corner', 10],   // Turn 7: Memorial Hairpin (SE)
  [-4, 0, 'track-straight', 0],  // Waterfront Straight
  [-4, -1, 'track-corner', 16],  // Turn 9: Singapore Flyer (NE)
  [-3, -1, 'track-straight', 16],// Bayfront Avenue
  [-2, -1, 'track-straight', 16],// Helix Bridge Straight
  [-1, -1, 'track-straight', 16],// Marina Pit Entry
  [0, -1, 'track-corner', 0],    // Turn 12: Anderson Bridge onto S/F (NW)
];

const MARINA_DECO: TrackCell[] = [
  [1, 0, 'decoration-tents', 22],
  [1, 1, 'decoration-tents', 22],
  [-1, 2, 'decoration-tents', 16],
  [-1, 1, 'decoration-empty', 0],
  [-3, 2, 'decoration-empty', 0],
  [-3, 0, 'decoration-empty', 0],
  [-2, 0, 'decoration-empty', 0],
  [-1, 0, 'decoration-empty', 0],
];

export interface CircuitDefinition {
  id: string;
  name: string;
  location: string;
  country: string;
  flag: string;
  tag: string;
  difficulty: 'High Speed' | 'Technical GP' | 'Drift & Agility';
  description: string;
  sectorsCount: number;
  drsZones: number;
  benchmarkLap: number;
  recommendedTheme: 'day' | 'sunset' | 'night';
  cells: TrackCell[];
  decoCells: TrackCell[];
}

export const CIRCUITS: Record<string, CircuitDefinition> = {
  monza: {
    id: 'monza',
    name: 'Monza Speed Ring',
    location: 'Autodromo Nazionale Monza',
    country: 'Italy',
    flag: '🇮🇹',
    tag: 'Temple of Speed',
    difficulty: 'High Speed',
    description: 'Expanded Grand Prix circuit with 70m Pit Straight, high-G Curva Grande, 120m Back Straight, and Parabolica.',
    sectorsCount: 38,
    drsZones: 3,
    benchmarkLap: 38.5,
    recommendedTheme: 'day',
    cells: MONZA_CELLS,
    decoCells: MONZA_DECO,
  },
  silverstone: {
    id: 'silverstone',
    name: 'Silverstone GP',
    location: 'Silverstone Circuit',
    country: 'United Kingdom',
    flag: '🇬🇧',
    tag: 'Home of Motor Racing',
    difficulty: 'Technical GP',
    description: 'Technical Maggotts-Becketts esses, Hangar straight, Club chicane, and Woodcote.',
    sectorsCount: 18,
    drsZones: 2,
    benchmarkLap: 20.8,
    recommendedTheme: 'sunset',
    cells: SILVERSTONE_CELLS,
    decoCells: SILVERSTONE_DECO,
  },
  marina: {
    id: 'marina',
    name: 'Marina Bay Street Circuit',
    location: 'Marina Bay City Circuit',
    country: 'Singapore',
    flag: '🇸🇬',
    tag: 'Night City Grand Prix',
    difficulty: 'Drift & Agility',
    description: 'Glamorous night circuit with 90° corners, tight walls, and intense drift multiplier zones.',
    sectorsCount: 16,
    drsZones: 2,
    benchmarkLap: 18.5,
    recommendedTheme: 'night',
    cells: MARINA_CELLS,
    decoCells: MARINA_DECO,
  },
};

export function pieceWorldPosition(gx: number, gz: number) {
  return {
    x: (gx + 0.5) * CELL_RAW * GRID_SCALE,
    z: (gz + 0.5) * CELL_RAW * GRID_SCALE,
  };
}

const _q = new Quaternion();
const _yAxis = new Vector3(0, 1, 0);

function placeModel(source: any, parent: any, x: number, y: number, z: number, yawRad: number) {
  const root = new Model3D(source);
  root.position.set(x, y, z);
  _q.setFromAxisAngle(_yAxis, yawRad);
  root.quaternion.copyFrom(_q);
  parent.addChild(root);
  return root;
}

export function buildTrack(parent: any, sources: Record<string, any>, circuitId: string = 'monza') {
  const circuit = CIRCUITS[circuitId] || CIRCUITS.monza;
  const trackCells = circuit.cells;
  const decoCells = circuit.decoCells;

  const trackGroup = new Container3D();
  trackGroup.scale.set(GRID_SCALE, GRID_SCALE, GRID_SCALE);
  trackGroup.position.set(0, -0.5, 0);
  parent.addChild(trackGroup);

  for (const [gx, gz, key, orient] of trackCells) {
    const source = sources[key];
    if (!source) continue;

    const px = (gx + 0.5) * CELL_RAW;
    const pz = (gz + 0.5) * CELL_RAW;
    const yaw = ((ORIENT_DEG[orient] ?? 0) * Math.PI) / 180;

    placeModel(source, trackGroup, px, 0.5, pz, yaw);
  }

  // Environmental Deco
  const occupied = new Set<string>();
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

  for (const [gx, gz, key, orient] of decoCells) {
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

  // Rigid physics wall colliders
  const walls = buildWallColliders(trackCells);

  // Finish line frame for lap detection (matches `track-finish` cell at gx=0, gz=0)
  const finishCell = trackCells.find(([, , key]) => key === 'track-finish') || trackCells[0];
  const finishOrient = finishCell[3];
  const finishYaw = ((ORIENT_DEG[finishOrient] ?? 0) * Math.PI) / 180;
  const finishWorld = pieceWorldPosition(finishCell[0], finishCell[1]);
  const finishCenter = new Vector3(finishWorld.x, 0, finishWorld.z);
  const finishForward = new Vector3(Math.sin(finishYaw), 0, Math.cos(finishYaw));
  const finishRight = new Vector3(finishForward.z, 0, -finishForward.x);

  const requiredCellKeys = new Set<string>();
  for (const [gx, gz, key] of trackCells) {
    if (key !== 'track-finish') requiredCellKeys.add(`${gx},${gz}`);
  }

  // Waypoints for AI rival racecars and remote player interpolation
  const waypoints = generateWaypoints(trackCells);

  return {
    trackGroup,
    walls,
    finishCenter,
    finishForward,
    finishRight,
    requiredCellKeys,
    cellSize: CELL_SIZE,
    waypoints,
    circuitId,
    circuit,
  };
}

function pseudoHash(gx: number, gz: number) {
  let h = gx * 374761393 + gz * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return (h ^ (h >> 16)) >>> 0;
}

export function generateWaypoints(cells: Array<[number, number, string, number]>) {
  const points: Array<{ x: number; z: number; isCorner: boolean }> = [];

  for (let i = 0; i < cells.length; i++) {
    const [gx, gz, key] = cells[i];
    const center = pieceWorldPosition(gx, gz);
    points.push({
      x: center.x,
      z: center.z,
      isCorner: key === 'track-corner',
    });
  }

  return points;
}

function buildWallColliders(trackCells: Array<[number, number, string, number]>) {
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
  walls: any[],
  wcx: number,
  wcz: number,
  arcStart: number,
  radius: number,
  numSeg: number,
  segHalfLen: number,
  hThick: number,
  hHeight: number,
  arcSpan: number,
  scale: number,
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
