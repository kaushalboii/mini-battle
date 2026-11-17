import * as THREE from "three";

export interface WallCollider {
  min: THREE.Vector2;
  max: THREE.Vector2;
}

export interface TrackData {
  root: THREE.Group;
  walls: WallCollider[];
  finishCenter: THREE.Vector3;
  finishForward: THREE.Vector3;
  checkpoints: THREE.Vector3[];
}

export function buildTrack(scene: THREE.Group): TrackData {
  const root = new THREE.Group();
  scene.add(root);

  const walls: WallCollider[] = [];

  // 1. Materials
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x33373d,
    roughness: 0.85,
    metalness: 0.1,
  });
  const curbRedMat = new THREE.MeshStandardMaterial({
    color: 0xd90429,
    roughness: 0.6,
  });
  const curbWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8f9fa,
    roughness: 0.6,
  });
  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x588157,
    roughness: 0.95,
  });
  const barrierMat = new THREE.MeshStandardMaterial({
    color: 0x2b2d42,
    roughness: 0.7,
  });
  const archMat = new THREE.MeshStandardMaterial({
    color: 0xffd166,
    metalness: 0.3,
    roughness: 0.4,
  });

  // 2. Infield / Ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), grassMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  root.add(ground);

  // 3. Track Layout (Circuit around an oval/S-curve loop)
  // Track width = 8 units
  const createRoadSegment = (x: number, z: number, w: number, h: number) => {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(w, h), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0.01, z);
    road.receiveShadow = true;
    root.add(road);

    // Curbs along edges
    const addCurb = (cx: number, cz: number, cw: number, ch: number) => {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.06, ch), (cx + cz) % 4 === 0 ? curbRedMat : curbWhiteMat);
      curb.position.set(cx, 0.03, cz);
      curb.receiveShadow = true;
      root.add(curb);
    };

    if (w > h) {
      addCurb(x, z - h / 2, w, 0.4);
      addCurb(x, z + h / 2, w, 0.4);
    } else {
      addCurb(x - w / 2, z, 0.4, h);
      addCurb(x + w / 2, z, 0.4, h);
    }
  };

  // Main Straight (Bottom): (0, 30) width 60, height 8
  createRoadSegment(0, 30, 60, 8);

  // Right Corner: (30, 15) width 8, height 38
  createRoadSegment(30, 15, 8, 38);

  // Top Straight (Top): (0, -4) width 60, height 8
  createRoadSegment(0, -4, 60, 8);

  // Left Corner: (-30, 15) width 8, height 38
  createRoadSegment(-30, 15, 8, 38);

  // Chicanes / Infield Loop
  createRoadSegment(0, 12, 8, 28);

  // 4. Outer & Inner Tire Barriers (and Colliders)
  const addBarrierBox = (x: number, z: number, w: number, d: number) => {
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, 0.85, d), barrierMat);
    box.position.set(x, 0.42, z);
    box.castShadow = true;
    box.receiveShadow = true;
    root.add(box);

    walls.push({
      min: new THREE.Vector2(x - w / 2 - 0.7, z - d / 2 - 0.7),
      max: new THREE.Vector2(x + w / 2 + 0.7, z + d / 2 + 0.7),
    });
  };

  // Outer boundary walls
  addBarrierBox(0, 35, 68, 1);
  addBarrierBox(0, -9, 68, 1);
  addBarrierBox(35, 13, 1, 46);
  addBarrierBox(-35, 13, 1, 46);

  // Inner infield island walls
  addBarrierBox(-14, 21, 24, 1);
  addBarrierBox(-14, 4, 24, 1);
  addBarrierBox(14, 21, 24, 1);
  addBarrierBox(14, 4, 24, 1);

  // 5. Checkered Finish Line & Arch
  const finishCenter = new THREE.Vector3(0, 0, 30);
  const finishForward = new THREE.Vector3(1, 0, 0); // Racing east

  // Checkered pattern on road
  const checkerTex = new THREE.CanvasTexture(createCheckeredCanvas());
  checkerTex.wrapS = THREE.RepeatWrapping;
  checkerTex.wrapT = THREE.RepeatWrapping;
  checkerTex.repeat.set(4, 2);
  const finishLine = new THREE.Mesh(
    new THREE.PlaneGeometry(3, 7.8),
    new THREE.MeshBasicMaterial({ map: checkerTex }),
  );
  finishLine.rotation.x = -Math.PI / 2;
  finishLine.position.set(0, 0.03, 30);
  root.add(finishLine);

  // Overhead Arch
  const pL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 0.6), archMat);
  pL.position.set(0, 2.5, 25.8);
  pL.castShadow = true;
  const pR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 0.6), archMat);
  pR.position.set(0, 2.5, 34.2);
  pR.castShadow = true;
  const crossbar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 9), archMat);
  crossbar.position.set(0, 4.8, 30);
  crossbar.castShadow = true;
  root.add(pL, pR, crossbar);

  // 6. Trees and Props around the circuit
  const makeTree = (tx: number, tz: number) => {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.3, 1.8, 6),
      new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 }),
    );
    trunk.position.set(tx, 0.9, tz);
    trunk.castShadow = true;

    const foliage = new THREE.Mesh(
      new THREE.ConeGeometry(1.4, 2.6, 7),
      new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.8 }),
    );
    foliage.position.set(tx, 2.8, tz);
    foliage.castShadow = true;
    root.add(trunk, foliage);
  };

  makeTree(-18, 12);
  makeTree(-12, 13);
  makeTree(12, 12);
  makeTree(18, 13);
  makeTree(-38, 38);
  makeTree(38, 38);
  makeTree(-38, -12);
  makeTree(38, -12);

  // Checkpoints for a complete lap around the circuit
  const checkpoints = [
    new THREE.Vector3(15, 0, 30),
    new THREE.Vector3(30, 20, 0),
    new THREE.Vector3(30, 0, 0),
    new THREE.Vector3(15, 0, -4),
    new THREE.Vector3(-15, 0, -4),
    new THREE.Vector3(-30, 0, 0),
    new THREE.Vector3(-30, 20, 0),
    new THREE.Vector3(-15, 0, 30),
  ];

  return { root, walls, finishCenter, finishForward, checkpoints };
}

function createCheckeredCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const rows = 4;
  const cols = 8;
  const cw = 128 / cols;
  const ch = 64 / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? "#ffffff" : "#111111";
      ctx.fillRect(c * cw, r * ch, cw, ch);
    }
  }
  return canvas;
}
