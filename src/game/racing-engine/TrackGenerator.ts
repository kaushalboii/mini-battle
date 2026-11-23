/**
 * RevSector 3D - Grand Prix Circuit & Environment Generator (Grand Scale)
 * Massive 1.5km - 2.0km racing circuits with 300m+ full-throttle straights, 13.5m wide asphalt ribbon,
 * 3D FIA red/white apex rumble kerbs, 150m/100m/50m corner braking boards, and overhead gantry.
 * Engineered and authored by Kaushal.
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
  circuitInfo: CircuitMeta;
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
    description: 'The Temple of Speed. Massive 360m straights, high-speed Curva Grande, Ascari chicane, and Parabolica.',
    benchmarkLap: 46.5,
    sectorsCount: 20,
    drsZones: 3,
    recommendedTheme: 'day',
  },
  silverstone: {
    id: 'silverstone',
    name: 'Silverstone GP',
    location: 'Silverstone Circuit',
    country: 'United Kingdom',
    flag: '🇬🇧',
    difficulty: 'Technical GP',
    description: 'Iconic Maggotts-Becketts chicane complex, 340m Hangar straight, Stowe corner, and Club stadium section.',
    benchmarkLap: 42.0,
    sectorsCount: 18,
    drsZones: 2,
    recommendedTheme: 'sunset',
  },
  marina: {
    id: 'marina',
    name: 'Marina Bay Street Circuit',
    location: 'Marina Bay City Circuit',
    country: 'Singapore',
    flag: '🇸🇬',
    difficulty: 'Drift & Agility',
    description: 'Night street racing under floodlights. 90° street chicanes, close barriers, and intense drift zones.',
    benchmarkLap: 38.5,
    sectorsCount: 16,
    drsZones: 2,
    recommendedTheme: 'night',
  },
};

// Grand Scale Spline Control Nodes
const CIRCUIT_NODES: Record<string, Array<[number, number]>> = {
  monza: [
    [0, 0],         // Start/Finish Line & Electronic Gantry
    [0, 120],       // Pit Straight DRS Zone
    [0, 280],       // End of Main Straight - 280m full-throttle acceleration!
    [-30, 390],     // Curva Grande Entry
    [-110, 460],    // Curva Grande Sweeper
    [-230, 420],    // Curva Grande Apex
    [-330, 310],    // Curva Grande Exit
    [-360, 190],    // Roggia Hairpin Approach
    [-360, 20],     // High-Speed Back Straight 1
    [-360, -160],   // Serraglio DRS Run (280m straight!)
    [-360, -310],   // Heavy Braking Zone for Ascari
    [-270, -380],   // Ascari Chicane Left Entry
    [-160, -360],   // Ascari Transition Right
    [-80, -240],    // Infield Stadium Section
    [-45, -120],    // Parabolica Approach
    [15, -200],     // Parabolica Entry
    [65, -130],     // Parabolica Apex
    [35, -45],      // Parabolica Exit onto Pit Straight
  ],
  silverstone: [
    [0, 0],         // Hamilton Straight / S/F Line
    [0, 170],       // Abbey Acceleration
    [-35, 280],     // Farm Curve Apex
    [-120, 350],    // Maggotts Entry
    [-220, 370],    // Becketts Chicane
    [-310, 300],    // Chapel Exit
    [-390, 190],    // Hangar Straight Entry
    [-450, 0],      // Hangar Straight DRS Trap (360m straight!)
    [-450, -160],   // Stowe Corner Braking
    [-380, -280],   // Vale Chicane
    [-260, -320],   // Club Corner
    [-150, -260],   // Infield Loop
    [-80, -150],    // Wellington Straight
    [-25, -65],     // Brooklands & Luffield Complex
  ],
  marina: [
    [0, 0],         // Padang Grandstand Straight
    [0, 190],       // Republic Boulevard DRS Run
    [-45, 280],     // Turn 1 Sheares Curve (90° Street Corner)
    [-155, 280],    // Raffles Avenue DRS
    [-240, 215],    // Turn 3 Esplanade Hairpin
    [-240, 70],     // City Center Run
    [-325, 70],     // Stamford Road Chicane
    [-390, -25],    // Memorial Corner
    [-390, -195],   // Waterfront Straight
    [-280, -280],   // Singapore Flyer Curve
    [-165, -260],   // Bayfront Avenue
    [-70, -175],    // Helix Bridge High-Speed Straight
    [-15, -90],     // Anderson Bridge onto Pit Straight
  ],
};

export function buildProceduralTrack(
  scene: THREE.Scene,
  circuitId: string = 'monza'
): GeneratedTrack {
  const group = new THREE.Group();
  scene.add(group);

  const meta = CIRCUITS_METADATA[circuitId] || CIRCUITS_METADATA.monza;
  const nodes = CIRCUIT_NODES[circuitId] || CIRCUIT_NODES.monza;

  // 1. CatmullRom Spline Curve (Grand Scale)
  const curvePoints = nodes.map(([x, z]) => new THREE.Vector3(x, 0.05, z));
  const trackCurve = new THREE.CatmullRomCurve3(curvePoints, true, 'centripetal', 0.22);

  const numSamples = 280;
  const sampledPoints = trackCurve.getSpacedPoints(numSamples);
  const trackWidth = 13.5; // 13.5 meters wide F1 track
  const halfW = trackWidth / 2;

  // Materials
  const asphaltMat = new THREE.MeshStandardMaterial({
    color: 0x1b1d22,
    roughness: 0.88,
    metalness: 0.12,
  });

  const curbRedMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.45,
    metalness: 0.1,
  });

  const curbWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf4f4f5,
    roughness: 0.45,
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
    color: 0x1a331c,
    roughness: 0.95,
    metalness: 0.05,
  });

  // Massive Infield / Outfield Grass Plain (1,400m x 1,400m)
  const groundGeo = new THREE.PlaneGeometry(1400, 1400);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMesh = new THREE.Mesh(groundGeo, grassMat);
  groundMesh.position.y = -0.02;
  groundMesh.receiveShadow = true;
  group.add(groundMesh);

  // 2. Generate Road Ribbon Mesh
  const roadPositions: number[] = [];
  const roadNormals: number[] = [];
  const roadIndices: number[] = [];

  const waypoints: CircuitWaypoint[] = [];
  let accumulatedDistance = 0;

  for (let i = 0; i < sampledPoints.length; i++) {
    const p = sampledPoints[i];
    const u = i / sampledPoints.length;
    const tangent = trackCurve.getTangentAt(u).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    const pLeft = p.clone().addScaledVector(normal, -halfW);
    const pRight = p.clone().addScaledVector(normal, halfW);

    roadPositions.push(pLeft.x, pLeft.y, pLeft.z);
    roadNormals.push(0, 1, 0);

    roadPositions.push(pRight.x, pRight.y, pRight.z);
    roadNormals.push(0, 1, 0);

    if (i > 0) {
      accumulatedDistance += p.distanceTo(sampledPoints[i - 1]);
    }

    const nextTangent = trackCurve.getTangentAt((i + 1) / sampledPoints.length).normalize();
    const dot = tangent.dot(nextTangent);
    const isCorner = dot < 0.992;

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

  // 3. 3D Alternating Red & White Rumble Curbs at Corner Apexes
  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    if (wp.isCorner) {
      const isRed = i % 2 === 0;
      const curbMat = isRed ? curbRedMat : curbWhiteMat;
      const curbGeo = new THREE.BoxGeometry(0.85, 0.16, 2.2);
      const curbMesh = new THREE.Mesh(curbGeo, curbMat);
      curbMesh.position.set(wp.x + wp.normalX * (halfW + 0.42), 0.08, wp.z + wp.normalZ * (halfW + 0.42));
      curbMesh.lookAt(wp.x + wp.normalX * halfW + wp.tangentX, 0.08, wp.z + wp.normalZ * halfW + wp.tangentZ);
      curbMesh.receiveShadow = true;
      group.add(curbMesh);
    }
  }

  // 4. Perimeter Armco Crash Barriers
  const barrierPositions: number[] = [];
  const barrierIndices: number[] = [];

  for (let i = 0; i < sampledPoints.length; i++) {
    const wp = waypoints[i];
    const bx = wp.x + wp.normalX * (halfW + 1.6);
    const bz = wp.z + wp.normalZ * (halfW + 1.6);

    barrierPositions.push(bx, 0.0, bz);
    barrierPositions.push(bx, 0.9, bz);
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

  // 5. 150m, 100m, 50m Braking Marker Boards before Major Corners
  const boardMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const boardPoleGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.0, 8);
  const boardSignGeo = new THREE.BoxGeometry(0.8, 0.5, 0.08);

  for (let i = 10; i < waypoints.length; i += 24) {
    const wp = waypoints[i];
    if (wp.isCorner) {
      // Place marker 30m before corner
      const prevWp = waypoints[Math.max(0, i - 8)];
      const bx = prevWp.x + prevWp.normalX * (halfW + 1.2);
      const bz = prevWp.z + prevWp.normalZ * (halfW + 1.2);

      const marker = new THREE.Group();
      const pole = new THREE.Mesh(boardPoleGeo, barrierMat);
      pole.position.y = 1.0;
      marker.add(pole);

      const sign = new THREE.Mesh(boardSignGeo, boardMat);
      sign.position.y = 1.8;
      marker.add(sign);

      marker.position.set(bx, 0, bz);
      group.add(marker);
    }
  }

  // 6. Formula 1 Start/Finish Electronic Timing Gantry
  const gantryMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.85, roughness: 0.25 });
  const gantryPillarGeo = new THREE.BoxGeometry(0.6, 6.2, 0.6);

  const gantryLeft = new THREE.Mesh(gantryPillarGeo, gantryMat);
  gantryLeft.position.set(-halfW - 1.2, 3.1, 0);
  gantryLeft.castShadow = true;
  group.add(gantryLeft);

  const gantryRight = new THREE.Mesh(gantryPillarGeo, gantryMat);
  gantryRight.position.set(halfW + 1.2, 3.1, 0);
  gantryRight.castShadow = true;
  group.add(gantryRight);

  const gantryBeamGeo = new THREE.BoxGeometry(trackWidth + 3.2, 0.8, 0.7);
  const gantryBeam = new THREE.Mesh(gantryBeamGeo, gantryMat);
  gantryBeam.position.set(0, 5.8, 0);
  gantryBeam.castShadow = true;
  group.add(gantryBeam);

  // Red FIA RevSector Header Board
  const timingHeaderGeo = new THREE.BoxGeometry(trackWidth - 1.5, 1.1, 0.2);
  const timingHeaderMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35, metalness: 0.4 });
  const timingHeader = new THREE.Mesh(timingHeaderGeo, timingHeaderMat);
  timingHeader.position.set(0, 5.5, 0.4);
  group.add(timingHeader);

  // 5 Red Starting Lamps
  const lightHousingGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 16);
  lightHousingGeo.rotateX(Math.PI / 2);
  const redLightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

  for (let l = -2; l <= 2; l++) {
    const lamp = new THREE.Mesh(lightHousingGeo, redLightMat);
    lamp.position.set(l * 1.1, 5.5, 0.55);
    group.add(lamp);
  }

  // Checkered Start/Finish Strip
  const finishGeo = new THREE.PlaneGeometry(trackWidth, 2.0);
  finishGeo.rotateX(-Math.PI / 2);
  const finishMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const finishLine = new THREE.Mesh(finishGeo, finishMat);
  finishLine.position.set(0, 0.06, 0);
  group.add(finishLine);

  // 7. Staggered F1 Grid Slots on Main Straight
  const gridSlotGeo = new THREE.PlaneGeometry(2.4, 4.2);
  gridSlotGeo.rotateX(-Math.PI / 2);
  const gridSlotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 });

  for (let g = 1; g <= 8; g++) {
    const slotMesh = new THREE.Mesh(gridSlotGeo, gridSlotMat);
    const lateralOffset = g % 2 === 1 ? -2.8 : 2.8;
    const forwardOffset = g * 12.0;
    slotMesh.position.set(lateralOffset, 0.06, forwardOffset);
    group.add(slotMesh);
  }

  // 8. Stadium Floodlight Towers (High-Powered Night Lighting)
  const floodlightPoleGeo = new THREE.CylinderGeometry(0.25, 0.38, 16.0, 8);
  const floodlightHeadGeo = new THREE.BoxGeometry(2.4, 0.9, 1.2);
  const floodlightMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.7 });

  const floodlightInterval = Math.floor(waypoints.length / 8);
  for (let f = 0; f < waypoints.length; f += floodlightInterval) {
    const wp = waypoints[f];
    const fx = wp.x + wp.normalX * (halfW + 6.0);
    const fz = wp.z + wp.normalZ * (halfW + 6.0);

    const pole = new THREE.Mesh(floodlightPoleGeo, floodlightMat);
    pole.position.set(fx, 8.0, fz);
    pole.castShadow = true;
    group.add(pole);

    const head = new THREE.Mesh(floodlightHeadGeo, floodlightMat);
    head.position.set(fx, 15.8, fz);
    group.add(head);

    const spot = new THREE.SpotLight(0xfffaed, 0, 120, Math.PI / 3.5, 0.45, 1.1);
    spot.position.set(fx, 15.8, fz);
    const targetObj = new THREE.Object3D();
    targetObj.position.set(wp.x, 0, wp.z);
    group.add(targetObj);
    spot.target = targetObj;
    group.add(spot);
  }

  return {
    group,
    waypoints,
    totalLength: accumulatedDistance,
    circuitId,
    circuitInfo: meta,
    startPosition: new THREE.Vector3(-2.8, 0, 12.0), // P1 Starting Slot
    startRotationY: 0,
  };
}
