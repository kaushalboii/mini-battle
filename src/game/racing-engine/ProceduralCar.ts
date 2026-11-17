/**
 * RevSector 3D - Procedural Formula 1 / GT Racecar Generator
 * High-craft aerodynamic 3D vehicle constructed entirely in Three.js with PBR materials,
 * steerable front wheels, spinning tires, dual Xenon headlights, FIA rear brake light, and nitro flames.
 * Engineered by Kaushal.
 */

import * as THREE from 'three';

export interface CarInstance {
  root: THREE.Group;
  bodyMesh: THREE.Mesh;
  frontWing: THREE.Mesh;
  rearWing: THREE.Mesh;
  wheels: {
    fl: THREE.Group;
    fr: THREE.Group;
    rl: THREE.Group;
    rr: THREE.Group;
  };
  headlights: {
    leftBeam: THREE.SpotLight;
    rightBeam: THREE.SpotLight;
    leftLens: THREE.Mesh;
    rightLens: THREE.Mesh;
  };
  brakeLight: {
    mesh: THREE.Mesh;
    glow: THREE.PointLight;
  };
  nitroFlames: {
    left: THREE.Mesh;
    right: THREE.Mesh;
    glow: THREE.PointLight;
  };
  materials: {
    body: THREE.MeshStandardMaterial;
    carbon: THREE.MeshStandardMaterial;
    tire: THREE.MeshStandardMaterial;
    rim: THREE.MeshStandardMaterial;
    brakeDisc: THREE.MeshStandardMaterial;
    helmet: THREE.MeshStandardMaterial;
    glowRed: THREE.MeshBasicMaterial;
    glowCyan: THREE.MeshBasicMaterial;
    headlightLens: THREE.MeshStandardMaterial;
  };
  setColor: (colorHex: number | string) => void;
  update: (dt: number, speed: number, steerAngle: number, isBraking: boolean, isBoosting: boolean, isNight: boolean) => void;
}

export function createProceduralF1Car(
  primaryColor: number | string = 0xf59e0b,
  isPlayer: boolean = true
): CarInstance {
  const root = new THREE.Group();

  // Materials
  const hexNum = typeof primaryColor === 'string' ? parseInt(primaryColor.replace('#', ''), 16) : primaryColor;

  const bodyMat = new THREE.MeshStandardMaterial({
    color: hexNum,
    roughness: 0.25,
    metalness: 0.75,
  });

  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x111317,
    roughness: 0.45,
    metalness: 0.85,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.90,
    metalness: 0.10,
  });

  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    roughness: 0.20,
    metalness: 0.95,
  });

  const brakeDiscMat = new THREE.MeshStandardMaterial({
    color: 0x71717a,
    roughness: 0.35,
    metalness: 0.90,
  });

  const helmetMat = new THREE.MeshStandardMaterial({
    color: isPlayer ? 0xfacc15 : 0xe11d48,
    roughness: 0.15,
    metalness: 0.50,
  });

  const glowRedMat = new THREE.MeshBasicMaterial({
    color: 0xff1e1e,
  });

  const glowCyanMat = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
  });

  const headlightLensMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.1,
    metalness: 0.2,
    emissive: 0x000000,
  });

  // 1. Aerodynamic Main Monocoque & Nosecone
  const chassisGroup = new THREE.Group();
  root.add(chassisGroup);

  // Central Cockpit Section
  const cockpitGeo = new THREE.BoxGeometry(0.85, 0.42, 1.6);
  const cockpitMesh = new THREE.Mesh(cockpitGeo, bodyMat);
  cockpitMesh.position.set(0, 0.35, 0);
  cockpitMesh.castShadow = true;
  chassisGroup.add(cockpitMesh);

  // Slender Tapered Nosecone (pointed forward)
  const noseGeo = new THREE.ConeGeometry(0.42, 1.4, 4);
  noseGeo.rotateY(Math.PI / 4);
  noseGeo.rotateX(Math.PI / 2);
  const noseMesh = new THREE.Mesh(noseGeo, bodyMat);
  noseMesh.position.set(0, 0.28, 1.4);
  noseMesh.scale.set(1.0, 0.55, 1.0);
  noseMesh.castShadow = true;
  chassisGroup.add(noseMesh);

  // Driver Cockpit Interior & Helmet
  const seatGeo = new THREE.BoxGeometry(0.5, 0.25, 0.55);
  const seatMesh = new THREE.Mesh(seatGeo, carbonMat);
  seatMesh.position.set(0, 0.45, 0.1);
  chassisGroup.add(seatMesh);

  const helmetGeo = new THREE.SphereGeometry(0.18, 16, 16);
  const helmetMesh = new THREE.Mesh(helmetGeo, helmetMat);
  helmetMesh.position.set(0, 0.65, 0.1);
  helmetMesh.castShadow = true;
  chassisGroup.add(helmetMesh);

  // Halo Safety Ring
  const haloGeo = new THREE.TorusGeometry(0.28, 0.04, 8, 16, Math.PI);
  haloGeo.rotateX(Math.PI / 2);
  const haloMesh = new THREE.Mesh(haloGeo, carbonMat);
  haloMesh.position.set(0, 0.72, 0.22);
  chassisGroup.add(haloMesh);

  // 2. Aerodynamic Sidepods (cooling radiators on left and right)
  const sidepodGeo = new THREE.BoxGeometry(0.38, 0.32, 1.2);
  const leftSidepod = new THREE.Mesh(sidepodGeo, bodyMat);
  leftSidepod.position.set(-0.55, 0.30, -0.05);
  leftSidepod.castShadow = true;
  chassisGroup.add(leftSidepod);

  const rightSidepod = new THREE.Mesh(sidepodGeo, bodyMat);
  rightSidepod.position.set(0.55, 0.30, -0.05);
  rightSidepod.castShadow = true;
  chassisGroup.add(rightSidepod);

  // 3. Multi-Element Front Wing & Endplates
  const frontWingGeo = new THREE.BoxGeometry(1.85, 0.06, 0.45);
  const frontWingMesh = new THREE.Mesh(frontWingGeo, bodyMat);
  frontWingMesh.position.set(0, 0.15, 2.0);
  frontWingMesh.castShadow = true;
  chassisGroup.add(frontWingMesh);

  // Vertical Endplates (Left & Right)
  const endplateGeo = new THREE.BoxGeometry(0.04, 0.22, 0.52);
  const leftEndplate = new THREE.Mesh(endplateGeo, carbonMat);
  leftEndplate.position.set(-0.92, 0.20, 2.0);
  chassisGroup.add(leftEndplate);

  const rightEndplate = new THREE.Mesh(endplateGeo, carbonMat);
  rightEndplate.position.set(0.92, 0.20, 2.0);
  chassisGroup.add(rightEndplate);

  // 4. Rear Wing with DRS Flap
  const rearWingPillarsGeo = new THREE.BoxGeometry(0.06, 0.55, 0.15);
  const leftPillar = new THREE.Mesh(rearWingPillarsGeo, carbonMat);
  leftPillar.position.set(-0.25, 0.65, -1.05);
  chassisGroup.add(leftPillar);

  const rightPillar = new THREE.Mesh(rearWingPillarsGeo, carbonMat);
  rightPillar.position.set(0.25, 0.65, -1.05);
  chassisGroup.add(rightPillar);

  const rearWingMainGeo = new THREE.BoxGeometry(1.5, 0.08, 0.42);
  const rearWingMesh = new THREE.Mesh(rearWingMainGeo, bodyMat);
  rearWingMesh.position.set(0, 0.90, -1.15);
  rearWingMesh.castShadow = true;
  chassisGroup.add(rearWingMesh);

  const rearEndplateGeo = new THREE.BoxGeometry(0.04, 0.36, 0.5);
  const leftRearEndplate = new THREE.Mesh(rearEndplateGeo, carbonMat);
  leftRearEndplate.position.set(-0.75, 0.90, -1.15);
  chassisGroup.add(leftRearEndplate);

  const rightRearEndplate = new THREE.Mesh(rearEndplateGeo, carbonMat);
  rightRearEndplate.position.set(0.75, 0.90, -1.15);
  chassisGroup.add(rightRearEndplate);

  // Rear Diffuser
  const diffuserGeo = new THREE.BoxGeometry(0.95, 0.18, 0.4);
  const diffuserMesh = new THREE.Mesh(diffuserGeo, carbonMat);
  diffuserMesh.position.set(0, 0.18, -0.95);
  chassisGroup.add(diffuserMesh);

  // 5. High-Detail Wheels (Front Left, Front Right, Rear Left, Rear Right)
  function createWheelMesh(width: number, radius: number) {
    const wheelGroup = new THREE.Group();

    // Tire rubber
    const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 24);
    tireGeo.rotateZ(Math.PI / 2);
    const tireMesh = new THREE.Mesh(tireGeo, tireMat);
    tireMesh.castShadow = true;
    wheelGroup.add(tireMesh);

    // Rim alloy
    const rimGeo = new THREE.CylinderGeometry(radius * 0.65, radius * 0.65, width * 1.02, 16);
    rimGeo.rotateZ(Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    wheelGroup.add(rimMesh);

    // Center Hub & Brake Disc
    const discGeo = new THREE.CylinderGeometry(radius * 0.48, radius * 0.48, width * 0.8, 12);
    discGeo.rotateZ(Math.PI / 2);
    const discMesh = new THREE.Mesh(discGeo, brakeDiscMat);
    wheelGroup.add(discMesh);

    return { wheelGroup, tireMesh };
  }

  // Front Wheels (Steerable)
  const flWheelData = createWheelMesh(0.32, 0.34);
  const flPivot = new THREE.Group();
  flPivot.position.set(-0.85, 0.34, 1.25);
  flPivot.add(flWheelData.wheelGroup);
  root.add(flPivot);

  const frWheelData = createWheelMesh(0.32, 0.34);
  const frPivot = new THREE.Group();
  frPivot.position.set(0.85, 0.34, 1.25);
  frPivot.add(frWheelData.wheelGroup);
  root.add(frPivot);

  // Rear Wheels (Wide Drive Tires)
  const rlWheelData = createWheelMesh(0.42, 0.36);
  const rlGroup = new THREE.Group();
  rlGroup.position.set(-0.88, 0.36, -0.85);
  rlGroup.add(rlWheelData.wheelGroup);
  root.add(rlGroup);

  const rrWheelData = createWheelMesh(0.42, 0.36);
  const rrGroup = new THREE.Group();
  rrGroup.position.set(0.88, 0.36, -0.85);
  rrGroup.add(rrWheelData.wheelGroup);
  root.add(rrGroup);

  // 6. High-Luminance Xenon Headlights
  const lensGeo = new THREE.BoxGeometry(0.14, 0.08, 0.04);
  const leftLens = new THREE.Mesh(lensGeo, headlightLensMat);
  leftLens.position.set(-0.35, 0.32, 2.02);
  chassisGroup.add(leftLens);

  const rightLens = new THREE.Mesh(lensGeo, headlightLensMat);
  rightLens.position.set(0.35, 0.32, 2.02);
  chassisGroup.add(rightLens);

  // Dynamic Headlight SpotLight Beams
  const leftBeam = new THREE.SpotLight(0xfffaed, 0, 75, Math.PI / 4.2, 0.45, 1.0);
  leftBeam.position.set(-0.35, 0.38, 2.05);
  const leftTarget = new THREE.Object3D();
  leftTarget.position.set(-0.35, 0.0, 18);
  root.add(leftTarget);
  leftBeam.target = leftTarget;
  root.add(leftBeam);

  const rightBeam = new THREE.SpotLight(0xfffaed, 0, 75, Math.PI / 4.2, 0.45, 1.0);
  rightBeam.position.set(0.35, 0.38, 2.05);
  const rightTarget = new THREE.Object3D();
  rightTarget.position.set(0.35, 0.0, 18);
  root.add(rightTarget);
  rightBeam.target = rightTarget;
  root.add(rightBeam);

  // Forward Asphalt Road-Wash Light (Illuminates track in front of vehicle at night)
  const forwardRoadWash = new THREE.PointLight(0xdbeafe, 0, 28.0, 1.2);
  forwardRoadWash.position.set(0, 0.45, 3.5);
  root.add(forwardRoadWash);

  // 7. Authentic Single Central FIA Rain & Brake Light Unit
  // In Formula 1 racing, there is ONE central LED rain/brake light under the rear wing/diffuser
  const fiaHousingGeo = new THREE.BoxGeometry(0.24, 0.12, 0.06);
  const fiaHousing = new THREE.Mesh(fiaHousingGeo, carbonMat);
  fiaHousing.position.set(0, 0.28, -1.05);
  chassisGroup.add(fiaHousing);

  const brakeLightGeo = new THREE.BoxGeometry(0.18, 0.08, 0.04);
  const brakeLightMesh = new THREE.Mesh(brakeLightGeo, glowRedMat);
  brakeLightMesh.position.set(0, 0.28, -1.08);
  chassisGroup.add(brakeLightMesh);

  const brakeGlow = new THREE.PointLight(0xff2222, 0, 8.0, 1.2);
  brakeGlow.position.set(0, 0.28, -1.18);
  root.add(brakeGlow);

  // 8. Nitro Boost Flame Cones & Glow
  const flameGeo = new THREE.ConeGeometry(0.08, 0.45, 8);
  flameGeo.rotateX(-Math.PI / 2);
  const leftFlame = new THREE.Mesh(flameGeo, glowCyanMat);
  leftFlame.position.set(-0.16, 0.34, -1.15);
  leftFlame.visible = false;
  chassisGroup.add(leftFlame);

  const rightFlame = new THREE.Mesh(flameGeo, glowCyanMat);
  rightFlame.position.set(0.16, 0.34, -1.15);
  rightFlame.visible = false;
  chassisGroup.add(rightFlame);

  const nitroGlow = new THREE.PointLight(0x06b6d4, 0, 8.0);
  nitroGlow.position.set(0, 0.34, -1.25);
  root.add(nitroGlow);

  let spinAngle = 0;

  const setColor = (newColor: number | string) => {
    const num = typeof newColor === 'string' ? parseInt(newColor.replace('#', ''), 16) : newColor;
    bodyMat.color.setHex(num);
  };

  const update = (
    dt: number,
    speed: number,
    steerAngle: number,
    isBraking: boolean,
    isBoosting: boolean,
    isNight: boolean
  ) => {
    // 1. Front wheels steering rotation (around Y axis)
    flPivot.rotation.y = steerAngle;
    frPivot.rotation.y = steerAngle;

    // 2. All 4 wheels rolling spin (around X axis)
    const wheelRadius = 0.34;
    const distanceTraveled = speed * dt;
    spinAngle += distanceTraveled / wheelRadius;

    flWheelData.tireMesh.rotation.x = spinAngle;
    frWheelData.tireMesh.rotation.x = spinAngle;
    rlWheelData.tireMesh.rotation.x = spinAngle;
    rrWheelData.tireMesh.rotation.x = spinAngle;

    // 3. Headlights intensity at night
    if (isNight) {
      leftBeam.intensity = 140;
      rightBeam.intensity = 140;
      forwardRoadWash.intensity = 32;
      headlightLensMat.emissive.setHex(0xe0f2fe);
      headlightLensMat.emissiveIntensity = 2.5;
    } else {
      leftBeam.intensity = 0;
      rightBeam.intensity = 0;
      forwardRoadWash.intensity = 0;
      headlightLensMat.emissive.setHex(0x000000);
      headlightLensMat.emissiveIntensity = 0;
    }

    // 4. Single FIA central rear brake & rain light
    if (isBraking) {
      brakeGlow.intensity = 26;
      brakeLightMesh.scale.set(1.35, 1.35, 1.35);
      glowRedMat.color.setHex(0xff0000);
    } else if (isNight) {
      // FIA rain strobe pattern at night
      const strobe = Math.sin(Date.now() * 0.015) > 0;
      brakeGlow.intensity = strobe ? 6.0 : 1.5;
      brakeLightMesh.scale.set(1.0, 1.0, 1.0);
      glowRedMat.color.setHex(0xef4444);
    } else {
      brakeGlow.intensity = 0;
      brakeLightMesh.scale.set(1.0, 1.0, 1.0);
    }

    // 5. Nitro flames & cyan glow
    if (isBoosting) {
      leftFlame.visible = true;
      rightFlame.visible = true;
      const jitter = 0.8 + Math.random() * 0.45;
      leftFlame.scale.set(jitter, jitter, jitter * 1.3);
      rightFlame.scale.set(jitter, jitter, jitter * 1.3);
      nitroGlow.intensity = 22;
    } else {
      leftFlame.visible = false;
      rightFlame.visible = false;
      nitroGlow.intensity = 0;
    }
  };

  return {
    root,
    bodyMesh: cockpitMesh,
    frontWing: frontWingMesh,
    rearWing: rearWingMesh,
    wheels: {
      fl: flPivot,
      fr: frPivot,
      rl: rlGroup,
      rr: rrGroup,
    },
    headlights: {
      leftBeam,
      rightBeam,
      leftLens,
      rightLens,
    },
    brakeLight: {
      mesh: brakeLightMesh,
      glow: brakeGlow,
    },
    nitroFlames: {
      left: leftFlame,
      right: rightFlame,
      glow: nitroGlow,
    },
    materials: {
      body: bodyMat,
      carbon: carbonMat,
      tire: tireMat,
      rim: rimMat,
      brakeDisc: brakeDiscMat,
      helmet: helmetMat,
      glowRed: glowRedMat,
      glowCyan: glowCyanMat,
      headlightLens: headlightLensMat,
    },
    setColor,
    update,
  };
}
