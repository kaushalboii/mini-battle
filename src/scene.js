import * as THREE from 'three';

export class WorldScene {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7ad7f0); // Bright tropical cyan sky
    this.scene.fog = new THREE.FogExp2(0x8ee0f7, 0.007);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      48,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.defaultCamPos = new THREE.Vector3(-36, 18, 0);
    this.defaultLookTarget = new THREE.Vector3(10, 2, 0);
    this.camera.position.copy(this.defaultCamPos);
    this.camera.lookAt(this.defaultLookTarget);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.clouds = [];
    this.waterMesh = null;

    this.setupLighting();
    this.createWater();
    this.createEnvironment();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupLighting() {
    // Warm tropical sunlight
    this.sunLight = new THREE.DirectionalLight(0xfff7db, 1.8);
    this.sunLight.position.set(-30, 45, 25);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 160;
    this.sunLight.shadow.camera.left = -55;
    this.sunLight.shadow.camera.right = 55;
    this.sunLight.shadow.camera.top = 40;
    this.sunLight.shadow.camera.bottom = -40;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    // Soft sky ambient & ground bounce
    const hemiLight = new THREE.HemisphereLight(0xdaf5ff, 0x1d5873, 0.85);
    this.scene.add(hemiLight);

    // Warm horizon fill light
    const fillLight = new THREE.DirectionalLight(0xffc278, 0.4);
    fillLight.position.set(40, 10, -30);
    this.scene.add(fillLight);
  }

  createWater() {
    // Low-poly ocean plane with dynamic wave displacement
    const waterGeo = new THREE.PlaneGeometry(240, 240, 64, 64);
    waterGeo.rotateX(-Math.PI / 2);

    this.waterPositions = waterGeo.attributes.position.array;
    this.baseWaterVertices = Float32Array.from(this.waterPositions);

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x15a7cf,
      roughness: 0.15,
      metalness: 0.25,
      flatShading: true,
      transparent: true,
      opacity: 0.92
    });

    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.receiveShadow = true;
    this.scene.add(this.waterMesh);

    // Underwater seabed floor (creates nice depth tint)
    const seaBedGeo = new THREE.PlaneGeometry(260, 260);
    seaBedGeo.rotateX(-Math.PI / 2);
    const seaBedMat = new THREE.MeshStandardMaterial({
      color: 0x0c4b69,
      roughness: 0.9
    });
    const seaBed = new THREE.Mesh(seaBedGeo, seaBedMat);
    seaBed.position.y = -7;
    this.scene.add(seaBed);
  }

  // Returns water wave elevation at given world coordinate
  getWaterHeightAt(x, z, time = 0) {
    const wave1 = Math.sin(x * 0.12 + time * 2.2) * 0.35;
    const wave2 = Math.cos(z * 0.15 + time * 1.8) * 0.3;
    const wave3 = Math.sin((x + z) * 0.08 + time * 1.4) * 0.2;
    return wave1 + wave2 + wave3;
  }

  updateWater(time) {
    if (!this.waterMesh) return;
    const pos = this.waterMesh.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = this.baseWaterVertices[i * 3];
      const z = this.baseWaterVertices[i * 3 + 2];
      pos.setY(i, this.getWaterHeightAt(x, z, time));
    }
    pos.needsUpdate = true;
    this.waterMesh.geometry.computeVertexNormals();
  }

  createEnvironment() {
    // 1. Distant Sand Atolls / Reef Islands
    this.createIsland(-32, -45, 18, 4);
    this.createIsland(38, -50, 22, 5);
    this.createIsland(48, 42, 20, 4);
    this.createIsland(-42, 45, 16, 3.5);

    // 2. Low-poly fluffy clouds
    for (let i = 0; i < 14; i++) {
      const cloud = this.createCloud();
      cloud.position.set(
        (Math.random() - 0.5) * 220,
        28 + Math.random() * 16,
        (Math.random() - 0.5) * 200
      );
      cloud.userData.speed = 0.8 + Math.random() * 1.2;
      this.scene.add(cloud);
      this.clouds.push(cloud);
    }

    // 3. Reef Rocks scattered around
    this.createReefRock(-10, -22, 2.2);
    this.createReefRock(2, 26, 2.8);
    this.createReefRock(15, -28, 3.4);
    this.createReefRock(-18, 18, 1.8);
  }

  createIsland(x, z, radius, height) {
    const islandGroup = new THREE.Group();
    islandGroup.position.set(x, 0, z);

    // Sand mound
    const sandGeo = new THREE.ConeGeometry(radius, height, 9);
    sandGeo.translate(0, height / 2 - 0.8, 0);
    const sandMat = new THREE.MeshStandardMaterial({
      color: 0xf4d59e,
      roughness: 0.9,
      flatShading: true
    });
    const sand = new THREE.Mesh(sandGeo, sandMat);
    sand.receiveShadow = true;
    islandGroup.add(sand);

    // Lush greenery cap
    const grassGeo = new THREE.ConeGeometry(radius * 0.72, height * 0.65, 8);
    grassGeo.translate(0, height * 0.75 - 0.5, 0);
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x48b84d,
      roughness: 0.8,
      flatShading: true
    });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.receiveShadow = true;
    islandGroup.add(grass);

    // Add 1-2 palm trees
    const palm = this.createPalmTree();
    palm.position.set(radius * 0.2, height * 0.85, 0);
    islandGroup.add(palm);

    this.scene.add(islandGroup);
  }

  createPalmTree() {
    const palm = new THREE.Group();

    // Curved Trunk
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x8a5d3b,
      roughness: 0.85,
      flatShading: true
    });

    let currentY = 0;
    let currentX = 0;
    for (let i = 0; i < 5; i++) {
      const segmentGeo = new THREE.CylinderGeometry(0.28 - i * 0.03, 0.35 - i * 0.03, 1.1, 6);
      const segment = new THREE.Mesh(segmentGeo, trunkMat);
      currentX += Math.sin(i * 0.3) * 0.15;
      segment.position.set(currentX, currentY + 0.55, 0);
      segment.rotation.z = -0.08 * i;
      segment.castShadow = true;
      palm.add(segment);
      currentY += 1.0;
    }

    // Palm Leaves
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x2e8f3c,
      roughness: 0.6,
      side: THREE.DoubleSide,
      flatShading: true
    });

    for (let j = 0; j < 6; j++) {
      const angle = (j / 6) * Math.PI * 2;
      const leafGeo = new THREE.ConeGeometry(0.65, 2.6, 4);
      leafGeo.rotateX(Math.PI / 2.3);
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.set(currentX, currentY, 0);
      leaf.rotation.y = angle;
      leaf.castShadow = true;
      palm.add(leaf);
    }

    // Coconuts
    const nutMat = new THREE.MeshStandardMaterial({ color: 0x4d2e14, roughness: 0.9 });
    for (let k = 0; k < 3; k++) {
      const nut = new THREE.Mesh(new THREE.SphereGeometry(0.25, 5, 5), nutMat);
      const kAngle = (k / 3) * Math.PI * 2;
      nut.position.set(currentX + Math.cos(kAngle) * 0.28, currentY - 0.2, Math.sin(kAngle) * 0.28);
      palm.add(nut);
    }

    return palm;
  }

  createReefRock(x, z, scale) {
    const rockGeo = new THREE.DodecahedronGeometry(scale, 1);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x5b6d7a,
      roughness: 0.9,
      flatShading: true
    });
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.set(x, scale * 0.3, z);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.scale.set(1, 0.75 + Math.random() * 0.5, 1);
    rock.castShadow = true;
    rock.receiveShadow = true;
    this.scene.add(rock);
  }

  createCloud() {
    const cloud = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      flatShading: true,
      transparent: true,
      opacity: 0.9
    });

    const puffs = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < puffs; i++) {
      const radius = 3.2 + Math.random() * 3.5;
      const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(radius, 1), cloudMat);
      puff.position.set((i - puffs / 2) * 3.4, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 2.2);
      cloud.add(puff);
    }
    return cloud;
  }

  updateClouds(delta) {
    this.clouds.forEach(cloud => {
      cloud.position.x += cloud.userData.speed * delta * 2.5;
      if (cloud.position.x > 120) {
        cloud.position.x = -120;
      }
    });
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

