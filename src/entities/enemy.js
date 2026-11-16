import * as THREE from 'three';

export class EnemyFleet {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;

    this.round = 1;
    this.group = new THREE.Group();
    this.enemies = []; // Individual pirate targets

    this.recoilOffset = 0;
    this.tiltAngle = 0;

    this.scene.add(this.group);
    this.setupRound(1);
  }

  setupRound(roundNumber) {
    this.round = roundNumber;

    // Clear old meshes
    while (this.group.children.length > 0) {
      const obj = this.group.children[0];
      this.group.remove(obj);
    }
    this.enemies = [];

    if (roundNumber === 1) {
      this.buildRound1();
    } else if (roundNumber === 2) {
      this.buildRound2();
    } else {
      this.buildRound3();
    }
  }

  // Round 1: Pirate Scout ("Pegleg Pete")
  buildRound1() {
    this.basePosition = new THREE.Vector3(22, 0, 0);
    this.group.position.copy(this.basePosition);

    // Scout Raft
    const raft = this.createRaftMesh(4, 5.0, 0x7c471c);
    this.group.add(raft);

    // Pirate 1
    const pirate = this.createPirateMesh('Pete', 0xd32f2f, false);
    pirate.position.set(0.8, 0.7, 0.6);
    this.group.add(pirate);

    // Cannon
    const cannon = this.createCannonMesh();
    cannon.position.set(-1.0, 0.45, 0);
    cannon.rotation.y = Math.PI; // Face player
    this.group.add(cannon);
    this.cannonObj = cannon;

    this.enemies.push({
      id: 'scout',
      name: 'Pegleg Pete',
      mesh: pirate,
      hp: 80,
      maxHp: 80,
      hitboxRadius: 2.2,
      hitboxCenter: new THREE.Vector3(22, 1.2, 0)
    });

    this.createHealthBar(this.enemies[0]);
  }

  // Round 2: Corsair Twin Gunners ("Barnaby & Bones")
  buildRound2() {
    this.basePosition = new THREE.Vector3(25, 0, 0);
    this.group.position.copy(this.basePosition);

    // Larger catamaran raft
    const raft = this.createRaftMesh(6, 6.8, 0x613612);
    this.group.add(raft);

    // Spiked shields
    const shield1 = this.createShieldMesh();
    shield1.position.set(-2.2, 0.6, -1.8);
    const shield2 = this.createShieldMesh();
    shield2.position.set(-2.2, 0.6, 1.8);
    this.group.add(shield1, shield2);

    // Pirate 1 & 2
    const pirate1 = this.createPirateMesh('Barnaby', 0x1976d2, false);
    pirate1.position.set(1.0, 0.7, -1.4);
    const pirate2 = this.createPirateMesh('Bones', 0x388e3c, false);
    pirate2.position.set(1.0, 0.7, 1.4);
    this.group.add(pirate1, pirate2);

    // Cannon
    const cannon = this.createCannonMesh();
    cannon.position.set(-1.2, 0.45, 0);
    cannon.rotation.y = Math.PI;
    this.group.add(cannon);
    this.cannonObj = cannon;

    this.enemies.push({
      id: 'corsair_1',
      name: 'Barnaby & Bones',
      mesh: this.group,
      hp: 140,
      maxHp: 140,
      hitboxRadius: 3.2,
      hitboxCenter: new THREE.Vector3(25, 1.4, 0)
    });

    this.createHealthBar(this.enemies[0]);
  }

  // Round 3: Dread Boss ("Captain Dread-Beard")
  buildRound3() {
    this.basePosition = new THREE.Vector3(27, 0, 0);
    this.group.position.copy(this.basePosition);

    // Heavy Armored War-Raft
    const raft = this.createRaftMesh(7, 8.5, 0x3e230d);
    this.group.add(raft);

    // Pirate Jolly Roger Flagpole
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.2, 7.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x221307 })
    );
    mast.position.set(2.4, 3.8, 0);
    this.group.add(mast);

    // Black Flag
    const flagGeo = new THREE.PlaneGeometry(2.5, 1.6);
    const flagMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.9,
      side: THREE.DoubleSide
    });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(1.1, 6.2, 0);
    flag.rotation.y = Math.PI / 2;
    this.group.add(flag);

    // Boss Pirate (Captain with Bicorne Hat)
    const boss = this.createPirateMesh('Dread-Beard', 0x800020, true);
    boss.position.set(1.2, 0.8, 0);
    boss.scale.set(1.25, 1.25, 1.25);
    this.group.add(boss);

    // Dual Heavy Cannons
    const cannon1 = this.createCannonMesh();
    cannon1.position.set(-1.8, 0.5, -1.5);
    cannon1.rotation.y = Math.PI;

    const cannon2 = this.createCannonMesh();
    cannon2.position.set(-1.8, 0.5, 1.5);
    cannon2.rotation.y = Math.PI;

    this.group.add(cannon1, cannon2);
    this.cannonObj = cannon1;

    this.enemies.push({
      id: 'boss',
      name: 'Captain Dread-Beard',
      mesh: this.group,
      hp: 220,
      maxHp: 220,
      hitboxRadius: 4.0,
      hitboxCenter: new THREE.Vector3(27, 1.6, 0)
    });

    this.createHealthBar(this.enemies[0]);
  }

  createRaftMesh(logCount, length, colorHex) {
    const raft = new THREE.Group();
    const logMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.9,
      flatShading: true
    });

    const spacing = 1.0;
    const startZ = -((logCount - 1) * spacing) / 2;

    for (let i = 0; i < logCount; i++) {
      const log = new THREE.Mesh(
        new THREE.CylinderGeometry(0.58, 0.58, length, 7),
        logMat
      );
      log.rotation.z = Math.PI / 2;
      log.position.set(0, 0, startZ + i * spacing);
      log.castShadow = true;
      log.receiveShadow = true;
      raft.add(log);
    }
    return raft;
  }

  createPirateMesh(name, coatColor, isCaptain = false) {
    const pirate = new THREE.Group();

    // Body
    const coatMat = new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.7 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.32, 1.0, 8), coatMat);
    body.position.y = 0.5;
    pirate.add(body);

    // Head
    const headMat = new THREE.MeshStandardMaterial({ color: 0xebb487, roughness: 0.6 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 8), headMat);
    head.position.y = 1.2;
    pirate.add(head);

    // Beard
    const beardMat = new THREE.MeshStandardMaterial({ color: isCaptain ? 0x111111 : 0x4a2a10, roughness: 0.9 });
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.45, 6), beardMat);
    beard.rotation.x = Math.PI;
    beard.position.set(-0.25, 1.05, 0);
    pirate.add(beard);

    // Eye Patch
    const patchMat = new THREE.MeshStandardMaterial({ color: 0x050505 });
    const patch = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.12), patchMat);
    patch.position.set(-0.32, 1.25, -0.12);
    pirate.add(patch);

    if (isCaptain) {
      // Captain Bicorne Hat
      const hatMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
      const hatGeo = new THREE.BoxGeometry(0.9, 0.45, 1.4);
      const hat = new THREE.Mesh(hatGeo, hatMat);
      hat.position.y = 1.6;
      pirate.add(hat);

      // Gold Skull trim
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8 });
      const trim = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 5), goldMat);
      trim.position.set(-0.46, 1.6, 0);
      pirate.add(trim);
    } else {
      // Pirate Red/Striped Bandana
      const bandanaMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.6 });
      const bandana = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 6), bandanaMat);
      bandana.scale.set(1.02, 0.5, 1.02);
      bandana.position.y = 1.4;
      pirate.add(bandana);
    }

    return pirate;
  }

  createCannonMesh() {
    const cannon = new THREE.Group();
    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x22262a,
      roughness: 0.4,
      metalness: 0.85
    });

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.48, 2.3, 10), ironMat);
    barrel.rotation.z = -Math.PI / 2.3;
    barrel.position.set(0.9, 0.6, 0);
    barrel.castShadow = true;
    cannon.add(barrel);

    // Base
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.6, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x543317, roughness: 0.9 })
    );
    base.position.y = 0.3;
    cannon.add(base);

    return cannon;
  }

  createShieldMesh() {
    const shieldGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.15, 8);
    shieldGeo.rotateX(Math.PI / 2);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x4a2a12,
      roughness: 0.8,
      metalness: 0.3
    });
    const shield = new THREE.Mesh(shieldGeo, shieldMat);
    shield.rotation.y = Math.PI / 2;
    return shield;
  }

  createHealthBar(enemy) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 48;
    enemy.hpCanvas = canvas;
    enemy.hpCtx = canvas.getContext('2d');

    enemy.hpTexture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: enemy.hpTexture, transparent: true });
    enemy.hpSprite = new THREE.Sprite(spriteMat);
    enemy.hpSprite.scale.set(4.8, 0.9, 1);
    enemy.hpSprite.position.set(0, 4.6, 0);
    this.group.add(enemy.hpSprite);

    this.updateHealthBarUI(enemy);
  }

  updateHealthBarUI(enemy) {
    if (!enemy.hpCtx) return;
    const ctx = enemy.hpCtx;
    const w = 256;
    const h = 48;

    ctx.clearRect(0, 0, w, h);

    // Background pill
    ctx.fillStyle = 'rgba(25, 10, 10, 0.85)';
    ctx.beginPath();
    ctx.roundRect(4, 4, w - 8, h - 8, 12);
    ctx.fill();
    ctx.strokeStyle = '#ff3b30';
    ctx.lineWidth = 3;
    ctx.stroke();

    // HP fill
    const fillRatio = Math.max(0, enemy.hp / enemy.maxHp);
    const grad = ctx.createLinearGradient(10, 0, w - 20, 0);
    grad.addColorStop(0, '#ff1744');
    grad.addColorStop(1, '#ff9100');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(10, 10, (w - 20) * fillRatio, h - 20, 8);
    ctx.fill();

    // Label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${enemy.name.toUpperCase()}: ${Math.max(0, Math.round(enemy.hp))}`, w / 2, h / 2);

    enemy.hpTexture.needsUpdate = true;
  }

  takeDamage(amount, hitPoint) {
    if (this.enemies.length === 0) return { defeated: true, currentHp: 0 };

    const target = this.enemies[0];
    target.hp = Math.max(0, target.hp - amount);
    this.updateHealthBarUI(target);

    // Violent raft rocking
    this.tiltAngle = 0.4;

    const defeated = target.hp <= 0;
    return {
      defeated,
      currentHp: target.hp,
      maxHp: target.maxHp,
      enemyName: target.name
    };
  }

  // Calculate AI shot towards player
  calculateAIShot(playerPos, wind) {
    const enemyPos = this.basePosition.clone();
    enemyPos.y += 1.5;

    // Displacement to player
    const dx = playerPos.x - enemyPos.x;
    const dz = playerPos.z - enemyPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Base elevation around 35-45 degrees
    const elevation = 35 + Math.random() * 8;
    const elevRad = (elevation * Math.PI) / 180;
    const g = 18.0;

    // Ballistic formula for initial speed needed: v = sqrt((g * dist) / sin(2 * theta))
    const sin2Theta = Math.sin(2 * elevRad);
    let idealSpeed = Math.sqrt((g * dist) / Math.max(0.1, sin2Theta));

    // Dynamic AI inaccuracy based on round
    // Round 1: High error (80-120% variance)
    // Round 2: Moderate error (90-110% variance)
    // Round 3: Deadly accurate (96-104% variance)
    let accuracySpread = 0.22;
    if (this.round === 2) accuracySpread = 0.12;
    if (this.round === 3) accuracySpread = 0.05;

    const errorFactor = 1.0 + (Math.random() - 0.5) * accuracySpread;
    const speed = idealSpeed * errorFactor;

    // Direction vector towards player
    const dir = new THREE.Vector3(dx, 0, dz).normalize();

    // Wind compensation attempt (Boss AI compensates for wind, Scouts don't!)
    if (this.round === 3) {
      dir.z -= (wind.z * 0.04);
      dir.normalize();
    }

    const vx = dir.x * Math.cos(elevRad) * speed;
    const vy = Math.sin(elevRad) * speed;
    const vz = dir.z * Math.cos(elevRad) * speed;

    return {
      origin: enemyPos.clone().add(new THREE.Vector3(-1.5, 0.4, 0)),
      velocity: new THREE.Vector3(vx, vy, vz)
    };
  }

  update(time, delta) {
    if (!this.basePosition) return;

    // Water Buoyancy
    const waveY = this.world.getWaterHeightAt(this.basePosition.x, this.basePosition.z, time);
    const waveSlopeX = (this.world.getWaterHeightAt(this.basePosition.x + 1, this.basePosition.z, time) - waveY);
    const waveSlopeZ = (this.world.getWaterHeightAt(this.basePosition.x, this.basePosition.z + 1, time) - waveY);

    this.group.position.y = waveY + 0.35;

    // Tilt recovery
    this.tiltAngle = THREE.MathUtils.lerp(this.tiltAngle, 0, delta * 4);
    this.group.rotation.z = waveSlopeX * 0.4 + this.tiltAngle;
    this.group.rotation.x = waveSlopeZ * 0.4;
  }
}

