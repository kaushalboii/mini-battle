/**
 * RevSector 3D - Procedural Grand Prix Circuit & Environment Generator
 * Generates continuous curved asphalt circuits, alternating FIA red/white rumble kerbs,
 * Armco perimeter crash barriers, overhead electronic gantry, and stadium night lighting.
 * Engineered by Kaushal.
 */

import * as THREE from 'three';

export interface CircuitWaypoint {
  x: number;
  z: number;
  tangentX: number;
  tangentZ: number;
  normalX: number;
  normalZ: number;
  distance: number;
  isCorner: boolean;
}

export interface GeneratedTrack {
  group: THREE.Group;
  waypoints: CircuitWaypoint[];
  totalLength: number;
  circuitId: string;
  circuitInfo: {
    name: string;
    location: string;
    country: string;
    flag: string;
    difficulty: string;
    description: string;
    benchmarkLap: number;
    sectorsCount: number;
    recommendedTheme: 'day' | 'sunset' | 'night';
  };
  startPosition: THREE.Vector3;
  startRotationY: number;
}

export interface CircuitMeta {
  id: string;
  name: string;
  location: string;
  country: string;
  flag: string;
  difficulty: string;
  description: string;
  benchmarkLap: number;
  sectorsCount: number;
  drsZones: number;
  recommendedTheme: 'day' | 'sunset' | 'night';
}

export const CIRCUITS_METADATA: Record<string, CircuitMeta> = {
  monza: {
    id: 'monza',
    name: 'Monza Speed Ring',
    location: 'Autodromo Nazionale Monza',
    country: 'Italy',
    flag: '🇮🇹',
    difficulty: 'High Speed',
    description: 'High-speed straights, Curva Grande, Ascari chicane, and the legendary Parabolica curve.',
    benchmarkLap: 22.4,
    sectorsCount: 20,
    drsZones: 3,
    recommendedTheme: 'day' as const,
  },
  silverstone: {
    id: 'silverstone',
    name: 'Silverstone GP',
    location: 'Silverstone Circuit',
    country: 'United Kingdom',
    flag: '🇬🇧',
    difficulty: 'Technical GP',
    description: 'Technical Maggotts-Becketts chicane complex, Hangar straight, and stadium complex.',
    benchmarkLap: 20.8,
    sectorsCount: 18,
    drsZones: 2,
    recommendedTheme: 'sunset' as const,
  },
  marina: {
    id: 'marina',
    name: 'Marina Bay Street Circuit',
    location: 'Marina Bay City Circuit',
    country: 'Singapore',
    flag: '🇸🇬',
    difficulty: 'Drift & Agility',
    description: 'Glamorous night city street circuit with 90° corners, close Armco walls, and high drift multipliers.',
    benchmarkLap: 18.5,
    sectorsCount: 16,
    drsZones: 2,
    recommendedTheme: 'night' as const,
  },
};

// Circuit Waypoint Control Nodes (Closed Spline loops)
const CIRCUIT_NODES: Record<string, {
  name: string;
  location: string;
  country: string;
  flag: string;
  difficulty: string;
  description: string;
  benchmarkLap: number;
  sectorsCount: number;
  recommendedTheme: 'day' | 'sunset' | 'night';
  nodes: Array<[number, number]>;
}> = {
  monza: {
    name: 'Monza Speed Ring',
    location: 'Autodromo Nazionale Monza',
    country: 'Italy',
    flag: '🇮🇹',
    difficulty: 'High Speed',
    description: 'High-speed straights, Curva Grande, Ascari chicane, and the legendary Parabolica curve.',
    benchmarkLap: 22.4,
    sectorsCount: 20,
    recommendedTheme: 'day',
    nodes: [
      [3.5, 5.0],      // Start/Finish Line & Gantry
      [3.5, 24.0],     // Pit Straight DRS
      [2.0, 36.0],     // Turn 1 Curva Grande Entry
      [-8.0, 42.0],    // Curva Grande High-Speed Arc
      [-22.0, 38.0],   // Curva Grande Apex
      [-32.0, 30.0],   // Varianta della Roggia Hairpin
      [-32.0, 10.0],   // Back Straight DRS Zone
      [-32.0, -15.0],  // Serraglio Run
      [-32.0, -32.0],  // Heavy Braking Zone
      [-26.0, -40.0],  // Ascari Chicane Entry
      [-16.0, -38.0],  // Ascari Apex
      [-10.0, -28.0],  // Infield Straight
      [-8.0, -14.0],   // Technical Chicane
      [-4.0, -18.0],   // Parabolica Approach
      [1.0, -22.0],    // Parabolica Apex
      [3.5, -8.0],     // Final Turn onto Pit Straight
    ],
  },
  silverstone: {
    name: 'Silverstone GP',
    location: 'Silverstone Circuit',
    country: 'United Kingdom',
    flag: '🇬🇧',
    difficulty: 'Technical GP',
    description: 'Technical Maggotts-Becketts chicane complex, Hangar straight, and stadium complex.',
    benchmarkLap: 20.8,
    sectorsCount: 18,
    recommendedTheme: 'sunset',
    nodes: [
      [3.5, 5.0],      // Hamilton Straight / S/F
      [3.5, 22.0],     // Abbey Acceleration
      [0.0, 32.0],     // Farm Curve
      [-10.0, 36.0],   // Maggotts Approach
      [-20.0, 38.0],   // Becketts Chicane
      [-28.0, 32.0],   // Chapel Exit
      [-38.0, 24.0],   // Hangar Straight DRS
      [-42.0, 8.0],    // Stowe Corner Apex
      [-40.0, -8.0],   // Vale Braking Zone
      [-32.0, -18.0],  // Club Corner
      [-22.0, -22.0],  // Farm Loop
      [-12.0, -18.0],  // Wellington Straight
      [-6.0, -10.0],   // Brooklands
      [-1.0, -15.0],   // Luffield Complex
      [3.5, -6.0],     // Woodcote onto Straight
    ],
  },
  marina: {
    name: 'Marina Bay Street Circuit',
    location: 'Marina Bay City Circuit',
    country: 'Singapore',
    flag: '🇸🇬',
    difficulty: 'Drift & Agility',
    description: 'Glamorous night city street circuit with 90° corners, close Armco walls, and high drift multipliers.',
    benchmarkLap: 18.5,
    sectorsCount: 16,
    recommendedTheme: 'night',
    nodes: [
      [3.5, 5.0],      // Padang S/F Straight
      [3.5, 20.0],     // Republic Boulevard
      [0.0, 28.0],     // Sheares Curve (90° Left)
      [-12.0, 28.0],   // Raffles Avenue
      [-18.0, 22.0],   // Esplanade Turn (90° Left)
      [-18.0, 10.0],   // City Center Run
      [-26.0, 10.0],   // Stamford Road Chicane
      [-32.0, 4.0],    // Memorial Hairpin
      [-32.0, -12.0],  // Waterfront Straight
      [-24.0, -20.0],  // Singapore Flyer Curve
      [-14.0, -20.0],  // Bayfront Avenue
      [-6.0, -14.0],   // Helix Bridge Straight
      [-1.0, -18.0],   // Anderson Bridge
      [3.5, -6.0],     // Pit Entry onto S/F
    ],
  },
};

export function buildProceduralTrack(
  scene: THREE.Scene,
  circuitId: string = 'monza'
): GeneratedTrack {
  const group = new THREE.Group();
  scene.add(group);

  const config = CIRCUIT_NODES[circuitId] || CIRCUIT_NODES.monza;
  const nodes = config.nodes;

  // 1. Create Smooth Continuous CatmullRom Spline
  const curvePoints = nodes.map(([x, z]) => new THREE.Vector3(x, 0.05, z));
  const trackCurve = new THREE.CatmullRomCurve3(curvePoints, true, 'centripetal', 0.25);

  const numSamples = 160;
  const sampledPoints = trackCurve.getSpacedPoints(numSamples);
  const trackWidth = 8.8; // 8.8 meters wide circuit
  const halfW = trackWidth / 2;

  // Materials
  const asphaltMat = new THREE.MeshStandardMaterial({
    color: 0x1f2229,
    roughness: 0.85,
    metalness: 0.15,
  });

  const curbRedMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.5,
    metalness: 0.1,
  });

  const curbWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf4f4f5,
    roughness: 0.5,
    metalness: 0.1,
  });

  const whiteLineMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });

  const barrierMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.35,
    metalness: 0.85,
  });

  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a1f,
    roughness: 0.95,
    metalness: 0.05,
  });

  // Infield Grass Terrain
  const groundGeo = new THREE.PlaneGeometry(280, 280);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMesh = new THREE.Mesh(groundGeo, grassMat);
  groundMesh.position.y = -0.01;
  groundMesh.receiveShadow = true;
  group.add(groundMesh);

  // 2. Generate Road Ribbon Geometry
  const roadPositions: number[] = [];
  const roadNormals: number[] = [];
  const roadIndices: number[] = [];

  const leftEdgeLine: THREE.Vector3[] = [];
  const rightEdgeLine: THREE.Vector3[] = [];

  const waypoints: CircuitWaypoint[] = [];
  let accumulatedDistance = 0;

  for (let i = 0; i < sampledPoints.length; i++) {
    const p = sampledPoints[i];
    const u = i / sampledPoints.length;
    const tangent = trackCurve.getTangentAt(u).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    // Inner & Outer edges
    const pLeft = p.clone().addScaledVector(normal, -halfW);
    const pRight = p.clone().addScaledVector(normal, halfW);

    roadPositions.push(pLeft.x, pLeft.y, pLeft.z);
    roadNormals.push(0, 1, 0);

    roadPositions.push(pRight.x, pRight.y, pRight.z);
    roadNormals.push(0, 1, 0);

    leftEdgeLine.push(pLeft.clone().addScaledVector(normal, 0.2).add(new THREE.Vector3(0, 0.02, 0)));
    rightEdgeLine.push(pRight.clone().addScaledVector(normal, -0.2).add(new THREE.Vector3(0, 0.02, 0)));

    if (i > 0) {
      accumulatedDistance += p.distanceTo(sampledPoints[i - 1]);
    }

    // Curvature check
    const nextTangent = trackCurve.getTangentAt((i + 1) / sampledPoints.length).normalize();
    const dot = tangent.dot(nextTangent);
    const isCorner = dot < 0.985;

    waypoints.push({
      x: p.x,
      z: p.z,
      tangentX: tangent.x,
      tangentZ: tangent.z,
      normalX: normal.x,
      normalZ: normal.z,
      distance: accumulatedDistance,
      isCorner,
    });
  }

  for (let i = 0; i < sampledPoints.length - 1; i++) {
    const idx = i * 2;
    roadIndices.push(idx, idx + 1, idx + 2);
    roadIndices.push(idx + 1, idx + 3, idx + 2);
  }

  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
  roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(roadNormals, 3));
  roadGeo.setIndex(roadIndices);

  const roadMesh = new THREE.Mesh(roadGeo, asphaltMat);
  roadMesh.receiveShadow = true;
  group.add(roadMesh);

  // 3. FIA Rumble Kerbs (Alternating Red and White Segments at Corners)
  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    if (wp.isCorner) {
      const isRed = i % 2 === 0;
      const curbMat = isRed ? curbRedMat : curbWhiteMat;
      const curbGeo = new THREE.BoxGeometry(0.7, 0.12, 1.4);
      const curbMesh = new THREE.Mesh(curbGeo, curbMat);
      curbMesh.position.set(wp.x + wp.normalX * (halfW + 0.35), 0.06, wp.z + wp.normalZ * (halfW + 0.35));
      curbMesh.lookAt(wp.x + wp.normalX * halfW + wp.tangentX, 0.06, wp.z + wp.normalZ * halfW + wp.tangentZ);
      curbMesh.receiveShadow = true;
      group.add(curbMesh);
    }
  }

  // 4. Armco Metal Crash Barriers along Outer Perimeter
  const barrierPositions: number[] = [];
  const barrierIndices: number[] = [];

  for (let i = 0; i < sampledPoints.length; i++) {
    const wp = waypoints[i];
    const bx = wp.x + wp.normalX * (halfW + 1.2);
    const bz = wp.z + wp.normalZ * (halfW + 1.2);

    barrierPositions.push(bx, 0.0, bz);
    barrierPositions.push(bx, 0.75, bz);
  }

  for (let i = 0; i < sampledPoints.length - 1; i++) {
    const idx = i * 2;
    barrierIndices.push(idx, idx + 1, idx + 2);
    barrierIndices.push(idx + 1, idx + 3, idx + 2);
  }

  const barrierGeo = new THREE.BufferGeometry();
  barrierGeo.setAttribute('position', new THREE.Float32BufferAttribute(barrierPositions, 3));
  barrierGeo.computeVertexNormals();
  barrierGeo.setIndex(barrierIndices);

  const barrierMesh = new THREE.Mesh(barrierGeo, barrierMat);
  barrierMesh.castShadow = true;
  group.add(barrierMesh);

  // 5. Formula 1 Start/Finish Electronic Timing Gantry
  const gantryMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.85, roughness: 0.25 });
  const gantryPillarGeo = new THREE.BoxGeometry(0.4, 4.2, 0.4);

  const gantryLeft = new THREE.Mesh(gantryPillarGeo, gantryMat);
  gantryLeft.position.set(3.5 - halfW - 0.5, 2.1, 5.0);
  gantryLeft.castShadow = true;
  group.add(gantryLeft);

  const gantryRight = new THREE.Mesh(gantryPillarGeo, gantryMat);
  gantryRight.position.set(3.5 + halfW + 0.5, 2.1, 5.0);
  gantryRight.castShadow = true;
  group.add(gantryRight);

  const gantryBeamGeo = new THREE.BoxGeometry(trackWidth + 1.8, 0.6, 0.5);
  const gantryBeam = new THREE.Mesh(gantryBeamGeo, gantryMat);
  gantryBeam.position.set(3.5, 4.0, 5.0);
  gantryBeam.castShadow = true;
  group.add(gantryBeam);

  // Red FIA Timing Header
  const timingHeaderGeo = new THREE.BoxGeometry(5.2, 0.8, 0.15);
  const timingHeaderMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35, metalness: 0.4 });
  const timingHeader = new THREE.Mesh(timingHeaderGeo, timingHeaderMat);
  timingHeader.position.set(3.5, 3.8, 5.25);
  group.add(timingHeader);

  // 5 Red Starting Lights
  const lightHousingGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12);
  lightHousingGeo.rotateX(Math.PI / 2);
  const redLightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

  for (let l = -2; l <= 2; l++) {
    const lamp = new THREE.Mesh(lightHousingGeo, redLightMat);
    lamp.position.set(3.5 + l * 0.6, 3.8, 5.35);
    group.add(lamp);
  }

  // Checkered Start/Finish Line on Track Surface
  const finishGeo = new THREE.PlaneGeometry(trackWidth, 1.2);
  finishGeo.rotateX(-Math.PI / 2);
  const finishMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const finishLine = new THREE.Mesh(finishGeo, finishMat);
  finishLine.position.set(3.5, 0.06, 5.0);
  group.add(finishLine);

  // 6. Stadium Floodlight Towers (For Night & Sunset Racing)
  const floodlightPoleGeo = new THREE.CylinderGeometry(0.15, 0.22, 9.0, 8);
  const floodlightHeadGeo = new THREE.BoxGeometry(1.4, 0.6, 0.8);
  const floodlightMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.7 });

  const floodlightPoints = [
    [-15.0, 44.0],
    [-34.0, 15.0],
    [-30.0, -36.0],
    [-8.0, -26.0],
    [5.0, 20.0],
  ];

  for (const [fx, fz] of floodlightPoints) {
    const pole = new THREE.Mesh(floodlightPoleGeo, floodlightMat);
    pole.position.set(fx, 4.5, fz);
    pole.castShadow = true;
    group.add(pole);

    const head = new THREE.Mesh(floodlightHeadGeo, floodlightMat);
    head.position.set(fx, 8.8, fz);
    group.add(head);

    // Stadium Spotlight
    const spot = new THREE.SpotLight(0xfffaed, 0, 50, Math.PI / 4, 0.45, 1.0);
    spot.position.set(fx, 8.8, fz);
    const targetObj = new THREE.Object3D();
    targetObj.position.set(fx * 0.5, 0, fz * 0.5);
    group.add(targetObj);
    spot.target = targetObj;
    group.add(spot);
  }

  // 7. Low-Poly Environmental Pine Trees & Paddock Tents
  const trunkGeo = new THREE.CylinderGeometry(0.15, 0.25, 1.2, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9 });
  const foliageGeo = new THREE.ConeGeometry(1.1, 2.4, 6);
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1e3a1f, roughness: 0.85 });

  for (let t = 0; t < 28; t++) {
    const angle = (t / 28) * Math.PI * 2;
    const radius = 26 + (t % 7) * 8;
    const tx = Math.cos(angle) * radius - 12;
    const tz = Math.sin(angle) * radius;

    // Check distance from road to avoid placing on track
    let minDist = Infinity;
    for (let s = 0; s < sampledPoints.length; s += 8) {
      const d = Math.hypot(sampledPoints[s].x - tx, sampledPoints[s].z - tz);
      if (d < minDist) minDist = d;
    }

    if (minDist > halfW + 3.0) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.6;
      tree.add(trunk);

      const foliage = new THREE.Mesh(foliageGeo, foliageMat);
      foliage.position.y = 2.2;
      foliage.castShadow = true;
      tree.add(foliage);

      tree.position.set(tx, 0, tz);
      group.add(tree);
    }
  }

  return {
    group,
    waypoints,
    totalLength: accumulatedDistance,
    circuitId,
    circuitInfo: {
      name: config.name,
      location: config.location,
      country: config.country,
      flag: config.flag,
      difficulty: config.difficulty,
      description: config.description,
      benchmarkLap: config.benchmarkLap,
      sectorsCount: config.sectorsCount,
      recommendedTheme: config.recommendedTheme,
    },
    startPosition: new THREE.Vector3(3.5, 0, 5.0),
    startRotationY: 0,
  };
}
