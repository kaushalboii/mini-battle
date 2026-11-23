/**
 * RevSector 3D - Modular Circuit Registry & Environmental Grid
 * Multi-level circuit generator with dynamic wall collision mesh, racing-line waypoint extraction,
 * obstacle disturbances (speed bumps & hazard blocks), and environmental decor.
 * Engineered by Kaushal.
 */

import { Container3D, CubeGeometry, Material3D, Mesh3D, Model3D, Quaternion, Vector3 } from '@pixi/3d';

export const ORIENT_DEG: Record<number, number> = { 0: 0, 10: 180, 16: 90, 22: 270 };

export const CELL_RAW = 9.99;
export const GRID_SCALE = 1.15; // +15% bigger & wider road dimensions!
export const CELL_SIZE = CELL_RAW * GRID_SCALE; // 11.49m per cell

export type TrackCell = [number, number, string, number];

export interface CircuitDefinition {
  id: string;
  level: number;
  name: string;
  location: string;
  country: string;
  flag: string;
  tag: string;
  difficulty: string;
  hasObstacles: boolean;
  description: string;
  sectorsCount: number;
  drsZones: number;
  benchmarkLap: number;
  recommendedTheme: 'day' | 'sunset' | 'night';
  cells: TrackCell[];
  decoCells: TrackCell[];
  obstacles?: Array<{ gx: number; gz: number; laneOffset: number }>;
}

// ==========================================
// LEVEL 1: MONZA MEGA SPEED RING (Italy)
// Enormous 44-cell Grand Prix speedway with 100m Pit Straight,
// high-speed Curva Grande, 140m Serraglio Back Straight, and Parabolica
// ==========================================
const MONZA_CELLS: TrackCell[] = [
  // Sector 1: Massive Main Pit Straight & Curva Grande Sweep
  [0, 0, 'track-finish', 0],       // Start/Finish Line
  [0, 1, 'track-straight', 0],     // Pit Straight Launch
  [0, 2, 'track-straight', 0],     // Pit Lane Speed Trap
  [0, 3, 'track-straight', 0],     // DRS Zone 1 Activation
  [0, 4, 'track-straight', 0],     // Full Power Acceleration
  [0, 5, 'track-straight', 0],     // High-Speed Straightaway
  [0, 6, 'track-straight', 0],     // Sector 1 Speed Trap
  [0, 7, 'track-straight', 0],     // 200m Braking Board
  [0, 8, 'track-straight', 0],     // 100m Turn 1 Board
  [0, 9, 'track-corner', 22],      // Turn 1: Curva Grande Entry (SW)
  [-1, 9, 'track-straight', 16],   // Curva Grande High-Speed Sweep
  [-2, 9, 'track-straight', 16],   // Curva Grande Apex
  [-3, 9, 'track-straight', 16],   // High-G Sweeper
  [-4, 9, 'track-straight', 16],   // Curva Grande Midpoint
  [-5, 9, 'track-straight', 16],   // Arc Exit
  [-6, 9, 'track-straight', 16],   // Variante della Roggia Run
  [-7, 9, 'track-straight', 16],   // Heavy Braking Zone
  [-8, 9, 'track-corner', 10],     // Turn 2: Roggia Chicane (SE)

  // Sector 2: Ultra-Long Serraglio Back Straight
  [-8, 8, 'track-straight', 0],    // Back Straight Launch
  [-8, 7, 'track-straight', 0],    // DRS Zone 2 Activation
  [-8, 6, 'track-straight', 0],    // Full Throttle Run
  [-8, 5, 'track-straight', 0],    // High-Velocity Straightaway
  [-8, 4, 'track-straight', 0],    // Serraglio Speed Trap
  [-8, 3, 'track-straight', 0],    // DRS Max Velocity
  [-8, 2, 'track-straight', 0],    // Lesmo Exit Run
  [-8, 1, 'track-straight', 0],    // Midpoint Straight
  [-8, 0, 'track-straight', 0],    // Full Power Straight
  [-8, -1, 'track-straight', 0],   // Sector 2 Speed Trap
  [-8, -2, 'track-straight', 0],   // Ascari Approach Run
  [-8, -3, 'track-straight', 0],   // 150m Braking Board
  [-8, -4, 'track-straight', 0],   // 100m Braking Board
  [-8, -5, 'track-corner', 16],    // Turn 3: Variante Ascari (NE)

  // Sector 3: Ascari Chicane, Stadium Infield & Parabolica Sweeper
  [-7, -5, 'track-straight', 16],  // Ascari High-Speed Transition
  [-6, -5, 'track-straight', 16],  // Ascari Chicane Apex
  [-5, -5, 'track-straight', 16],  // Chicane Exit Run
  [-4, -5, 'track-corner', 0],     // Turn 4: Stadium Infield Entry (NW)
  [-4, -4, 'track-straight', 0],   // Stadium Straight
  [-4, -3, 'track-straight', 0],   // Grandstand Run
  [-4, -2, 'track-straight', 0],   // S-Curve Approach
  [-4, -1, 'track-corner', 10],    // Turn 5: Technical S-Curve (SE)
  [-3, -1, 'track-straight', 16],  // Parabolica Approach Run
  [-2, -1, 'track-straight', 16],  // Parabolica High-Speed Arc
  [-1, -1, 'track-straight', 16],  // Parabolica Sweeper
  [0, -1, 'track-corner', 0],      // Turn 6: Parabolica onto Main Straight (NW)
];

const MONZA_DECO: TrackCell[] = [
  // Pit Straight Grandstands & Paddock
  [1, 0, 'decoration-tents', 22],
  [1, 1, 'decoration-tents', 22],
  [1, 2, 'decoration-tents', 22],
  [1, 3, 'decoration-tents', 22],
  [1, 4, 'decoration-tents', 22],
  [1, 5, 'decoration-tents', 22],
  [1, 6, 'decoration-tents', 22],
  [1, 7, 'decoration-tents', 22],

  // Infield Forest Canopy
  [-1, 1, 'decoration-forest', 0],
  [-2, 1, 'decoration-forest', 16],
  [-3, 1, 'decoration-forest', 10],
  [-1, 3, 'decoration-forest', 0],
  [-2, 3, 'decoration-forest', 16],
  [-3, 3, 'decoration-forest', 10],
  [-5, 1, 'decoration-forest', 0],
  [-6, 1, 'decoration-forest', 16],
  [-7, 1, 'decoration-forest', 10],
  [-5, 3, 'decoration-forest', 0],
  [-6, 3, 'decoration-forest', 16],
  [-7, 3, 'decoration-forest', 10],
];

// ==========================================
// LEVEL 2: SILVERSTONE GP (United Kingdom)
// 24-Cell Technical Grand Prix with Maggotts-Becketts, Hangar Straight & Vale
// ==========================================
const SILVERSTONE_CELLS: TrackCell[] = [
  [0, 0, 'track-finish', 0],       // Hamilton Straight
  [0, 1, 'track-straight', 0],     // Abbey Launch
  [0, 2, 'track-straight', 0],     // Farm Curve
  [0, 3, 'track-corner', 22],      // Turn 1: Copse Corner (SW)
  [-1, 3, 'track-straight', 16],   // Maggotts Entry
  [-2, 3, 'track-corner', 16],     // Becketts Esses (NE)
  [-2, 4, 'track-corner', 22],     // Chapel Apex (SW)
  [-3, 4, 'track-straight', 16],   // Hangar Straight DRS 1
  [-4, 4, 'track-straight', 16],   // Full Velocity Run
  [-5, 4, 'track-straight', 16],   // Stowe Approach
  [-6, 4, 'track-corner', 10],     // Turn 4: Stowe Corner (SE)
  [-6, 3, 'track-straight', 0],    // Vale Braking Zone
  [-6, 2, 'track-straight', 0],    // Club Chicane
  [-6, 1, 'track-straight', 0],    // Hamilton Infield
  [-6, 0, 'track-corner', 16],     // Turn 6: The Loop (NE)
  [-5, 0, 'track-corner', 22],     // Aintree Apex (SW)
  [-5, -1, 'track-corner', 16],    // Wellington Entry (NE)
  [-4, -1, 'track-straight', 16],  // Wellington Straight DRS 2
  [-3, -1, 'track-straight', 16],  // Brooklands Run
  [-2, -1, 'track-straight', 16],  // Luffield Complex
  [-1, -1, 'track-straight', 16],  // Woodcote Sweeper
  [0, -1, 'track-corner', 0],      // Woodcote onto Hamilton Straight (NW)
];

const SILVERSTONE_DECO: TrackCell[] = [
  [1, 0, 'decoration-tents', 22],
  [1, 1, 'decoration-tents', 22],
  [-1, 2, 'decoration-forest', 0],
  [-2, 2, 'decoration-tents', 16],
  [-4, 2, 'decoration-forest', 10],
  [-5, 2, 'decoration-forest', 0],
];

// ==========================================
// LEVEL 3: MARINA BAY STREET HAZARD CIRCUIT (Singapore)
// Intense obstacle disturbances: physical track bumps, jumps, and hazard barriers to dodge!
// ==========================================
const MARINA_CELLS: TrackCell[] = [
  [0, 0, 'track-finish', 0],       // Padang S/F Straight
  [0, 1, 'track-straight', 0],     // DRS Acceleration
  [0, 2, 'track-bump', 0],         // OBSTACLE DISTURBANCE 1: Physical Speed Bump & Jump!
  [0, 3, 'track-straight', 0],     // Sheares Approach
  [0, 4, 'track-corner', 22],      // Turn 1: Sheares Curve (SW)
  [-1, 4, 'track-straight', 16],   // Republic Boulevard
  [-2, 4, 'track-corner', 10],     // Turn 3: Esplanade (SE)
  [-2, 3, 'track-straight', 0],    // City Street Run
  [-2, 2, 'track-bump', 0],        // OBSTACLE DISTURBANCE 2: Speed Bump Jump!
  [-2, 1, 'track-corner', 0],      // Turn 5: Stamford Chicane (NW)
  [-3, 1, 'track-straight', 16],   // Raffles Avenue DRS
  [-4, 1, 'track-bump', 16],       // OBSTACLE DISTURBANCE 3: Raffles High-Speed Jump!
  [-5, 1, 'track-corner', 10],     // Turn 7: Memorial Hairpin (SE)
  [-5, 0, 'track-straight', 0],    // Waterfront Straight
  [-5, -1, 'track-corner', 16],    // Turn 9: Singapore Flyer (NE)
  [-4, -1, 'track-straight', 16],  // Bayfront Avenue
  [-3, -1, 'track-straight', 16],  // Helix Bridge Straight
  [-2, -1, 'track-bump', 16],      // OBSTACLE DISTURBANCE 4: Marina Bay Jump!
  [-1, -1, 'track-straight', 16],  // Marina Pit Entry
  [0, -1, 'track-corner', 0],      // Anderson Bridge onto S/F (NW)
];

const MARINA_DECO: TrackCell[] = [
  [1, 0, 'decoration-tents', 22],
  [1, 1, 'decoration-tents', 22],
  [-1, 3, 'decoration-tents', 16],
  [-3, 0, 'decoration-empty', 0],
  [-1, 0, 'decoration-empty', 0],
];

// Obstacle hazard blocks placed on Marina Bay road lanes (must be dodged!)
const MARINA_OBSTACLES: Array<{ gx: number; gz: number; laneOffset: number }> = [
  { gx: 0, gz: 1, laneOffset: -1.2 },  // Slalom Left Block on Main Straight
  { gx: -1, gz: 4, laneOffset: 1.1 },  // Slalom Right Hazard on Republic Blvd
  { gx: -2, gz: 3, laneOffset: -1.0 }, // Infield City Hazard Block
  { gx: -3, gz: 1, laneOffset: 1.2 },  // High-Speed Raffles Chicane Barrier
  { gx: -5, gz: 0, laneOffset: -1.1 }, // Waterfront Hazard Block
  { gx: -3, gz: -1, laneOffset: 1.0 }, // Bayfront Bridge Slalom Hazard
];

// ==========================================
// LEVEL 4: THUNDER CANYON SUPER SPEEDWAY (USA)
// High-banked ultra-speedway with massive sweeping turns and non-stop top speed
// ==========================================
const THUNDER_CELLS: TrackCell[] = [
  [0, 0, 'track-finish', 0],
  [0, 1, 'track-straight', 0],
  [0, 2, 'track-straight', 0],
  [0, 3, 'track-straight', 0],
  [0, 4, 'track-straight', 0],
  [0, 5, 'track-straight', 0],
  [0, 6, 'track-corner', 22],
  [-1, 6, 'track-straight', 16],
  [-2, 6, 'track-straight', 16],
  [-3, 6, 'track-straight', 16],
  [-4, 6, 'track-corner', 10],
  [-4, 5, 'track-straight', 0],
  [-4, 4, 'track-straight', 0],
  [-4, 3, 'track-straight', 0],
  [-4, 2, 'track-straight', 0],
  [-4, 1, 'track-straight', 0],
  [-4, 0, 'track-straight', 0],
  [-4, -1, 'track-straight', 0],
  [-4, -2, 'track-corner', 16],
  [-3, -2, 'track-straight', 16],
  [-2, -2, 'track-straight', 16],
  [-1, -2, 'track-straight', 16],
  [0, -2, 'track-corner', 0],
  [0, -1, 'track-straight', 0],
];

const THUNDER_DECO: TrackCell[] = [
  [1, 0, 'decoration-tents', 22],
  [1, 1, 'decoration-tents', 22],
  [1, 2, 'decoration-tents', 22],
  [-1, 2, 'decoration-forest', 0],
  [-2, 2, 'decoration-forest', 16],
  [-3, 2, 'decoration-forest', 10],
];

export const CIRCUITS: Record<string, CircuitDefinition> = {
  monza: {
    id: 'monza',
    level: 1,
    name: 'Monza Mega Speedway',
    location: 'Autodromo Nazionale Monza',
    country: 'Italy',
    flag: '🇮🇹',
    tag: 'Level 1 • High Speed',
    difficulty: 'High Speed Mega GP',
    hasObstacles: false,
    description: 'Massive 44-cell circuit with 100m Pit Straight, high-G Curva Grande, and 140m Serraglio Straight.',
    sectorsCount: 44,
    drsZones: 3,
    benchmarkLap: 42.5,
    recommendedTheme: 'day',
    cells: MONZA_CELLS,
    decoCells: MONZA_DECO,
  },
  silverstone: {
    id: 'silverstone',
    level: 2,
    name: 'Silverstone Grand Prix',
    location: 'Silverstone Circuit',
    country: 'United Kingdom',
    flag: '🇬🇧',
    tag: 'Level 2 • Technical GP',
    difficulty: 'Technical High-G Esses',
    hasObstacles: false,
    description: 'Technical Maggotts-Becketts esses, Hangar straight DRS, Club chicane, and Woodcote curve.',
    sectorsCount: 22,
    drsZones: 2,
    benchmarkLap: 24.2,
    recommendedTheme: 'sunset',
    cells: SILVERSTONE_CELLS,
    decoCells: SILVERSTONE_DECO,
  },
  marina: {
    id: 'marina',
    level: 3,
    name: 'Marina Bay Obstacle Run',
    location: 'Marina Bay City Circuit',
    country: 'Singapore',
    flag: '🇸🇬',
    tag: 'Level 3 • Obstacle Course',
    difficulty: 'Obstacles Disturbance & Slalom',
    hasObstacles: true,
    description: 'Intense obstacle course with track bumps, high-speed jumps, and hazard barriers to weave and dodge!',
    sectorsCount: 20,
    drsZones: 2,
    benchmarkLap: 22.8,
    recommendedTheme: 'night',
    cells: MARINA_CELLS,
    decoCells: MARINA_DECO,
    obstacles: MARINA_OBSTACLES,
  },
  thunder: {
    id: 'thunder',
    level: 4,
    name: 'Thunder Canyon Speedway',
    location: 'Thunder Canyon Raceway',
    country: 'United States',
    flag: '🇺🇸',
    tag: 'Level 4 • Super Speedway',
    difficulty: 'Drafting & Slipstream Oval',
    hasObstacles: false,
    description: 'High-speed 24-cell super speedway designed for continuous top speed, slipstreaming, and high-G drifting.',
    sectorsCount: 24,
    drsZones: 2,
    benchmarkLap: 21.0,
    recommendedTheme: 'sunset',
    cells: THUNDER_CELLS,
    decoCells: THUNDER_DECO,
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

  // Generate lush surrounding pine forest & festival tents around the track
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

  // Spawn Obstacle Hazard Blocks (for circuits with obstacles like Marina Bay Level 3)
  if (circuit.obstacles && circuit.obstacles.length > 0) {
    const obsGeo = new CubeGeometry({ width: 0.9, height: 0.85, depth: 0.9 });
    const obsMat = new Material3D({
      baseColor: 0xf59e0b, // High-visibility hazard amber
      metallic: 0.2,
      roughness: 0.5,
    });

    for (const obs of circuit.obstacles) {
      const worldCenter = pieceWorldPosition(obs.gx, obs.gz);
      // Place hazard cube in track lane
      const obsMesh = new Mesh3D({
        geometry: obsGeo,
        material: obsMat,
        castShadow: true,
      });
      obsMesh.position.set(obs.laneOffset, 0.42, 0);

      // Container positioned at world coordinates
      const obsContainer = new Container3D();
      obsContainer.position.set(worldCenter.x, 0, worldCenter.z);
      obsContainer.addChild(obsMesh);
      parent.addChild(obsContainer);

      // Add solid box collider to physics world
      walls.push({
        halfExtents: [0.55 * GRID_SCALE, 0.6 * GRID_SCALE, 0.55 * GRID_SCALE],
        position: [worldCenter.x + obs.laneOffset * GRID_SCALE, 0.35, worldCenter.z],
        quaternion: [0, 0, 0, 1],
      });
    }
  }

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
