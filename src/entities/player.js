import * as THREE from 'three';

export class Player {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;

    this.position = new THREE.Vector3(-24, 0, 0);
    this.hp = 100;
    this.maxHp = 100;

    // Aim angles (degrees)
    this.yaw = 0;        // Left/Right (-35 to 35 deg)
    this.elevation = 32; // Up/Down (12 to 65 deg)
    this.power = 65;     // Power percentage (15 to 100)

    // Recoil and tilt dynamics
    this.recoilOffset = 0;
    this.tiltAngle = 0;

    this.group = new THREE.Group();
    this.createModel();
    this.createTrajectoryLine();
    this.createHealthBar();

    this.scene.add(this.group);
  }

  createModel() {
    this.group.position.copy(this.position);

    // 1. Wooden Raft (Logs bound together)
    this.raftGroup = new THREE.Group();
    const logMat = new THREE.MeshStandardMaterial({
      color: 0x8b5a2b,
      roughness: 0.85,
      flatShading: true
    });
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xddc085, roughness: 0.9 });

    for (let i = -2; i <= 2; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 6.2, 7), logMat);
      log.rotation.z = Math.PI / 2;
      log.position.set(0, 0, i * 0.95);
      log.castShadow = true;
      log.receiveShadow = true;
      this.raftGroup.add(log);
    }

    // Cross planks
    const plankMat = new THREE.MeshStandardMaterial({ color: 0x6e431f, roughness: 0.8 });
    const plank1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 4.8), plankMat);
    plank1.position.set(2.0, 0.45, 0);
    const plank2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 4.8), plankMat);
    plank2.position.set(-2.0, 0.45, 0);
    this.raftGroup.add(plank1, plank2);

    this.group.add(this.raftGroup);

    // 2. Tube-Riding Hero (sitting on raft)
    const heroGroup = new THREE.Group();
    heroGroup.position.set(-1.2, 0.7, 0.8);

    // Rubber Swim Tube (Striped Torus)
    const tubeGeo = new THREE.TorusGeometry(0.85, 0.35, 12, 24);
    tubeGeo.rotateX(Math.PI / 2);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0xff3b30,
      roughness: 0.3,
      metalness: 0.1
    });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    heroGroup.add(tube);

    // Hero Body
    const bodyGeo = new THREE.CylinderGeometry(0.35, 0.3, 0.9, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x00c7be, roughness: 0.6 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.5;
    heroGroup.add(body);

    // Hero Head
    const headGeo = new THREE.SphereGeometry(0.38, 8, 8);
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfcc79d, roughness: 0.6 });
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.15;
    heroGroup.add(head);

    // Sun Visor / Hat
    const hatMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.5 });
    const visorGeo = new THREE.CylinderGeometry(0.55, 0.4, 0.15, 8);
    const visor = new THREE.Mesh(visorGeo, hatMat);
    visor.position.y = 1.45;
    heroGroup.add(visor);

    // Cool Sunglasses
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.5), glassMat);
    glass.position.set(0.32, 1.18, 0);
    heroGroup.add(glass);

    this.group.add(heroGroup);

    // 3. Aimable Swivel Cannon
    this.cannonBase = new THREE.Group();
    this.cannonBase.position.set(1.0, 0.5, 0);

    // Pedestal Mount
    const mountMat = new THREE.MeshStandardMaterial({
      color: 0x3a3f47,
      roughness: 0.4,
      metalness: 0.8
    });
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 0.6, 12), mountMat);
    this.cannonBase.add(pedestal);

    // Cannon Barrel Pivot Group
    this.cannonBarrelPivot = new THREE.Group();
    this.cannonBarrelPivot.position.set(0, 0.45, 0);

    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x22262c,
      roughness: 0.3,
      metalness: 0.85
    });

    // Tapered Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.45, 2.2, 12), barrelMat);
    barrel.rotation.z = -Math.PI / 2;
    barrel.position.set(0.9, 0, 0);
    barrel.castShadow = true;
    this.cannonBarrelPivot.add(barrel);

    // Gold Muzzle Ring
    const muzzleRingMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.2
    });
    const muzzleRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.08, 8, 16),
      muzzleRingMat
    );
    muzzleRing.rotation.y = Math.PI / 2;
    muzzleRing.position.set(2.0, 0, 0);
    this.cannonBarrelPivot.add(muzzleRing);

    // Muzzle tip marker (where ball spawns)
    this.muzzleTip = new THREE.Object3D();
    this.muzzleTip.position.set(2.2, 0, 0);
    this.cannonBarrelPivot.add(this.muzzleTip);

    this.cannonBase.add(this.cannonBarrelPivot);
    this.group.add(this.cannonBase);
  }

  createTrajectoryLine() {
    const pointCount = 45;
    const points = [];
    for (let i = 0; i < pointCount; i++) {
      points.push(new THREE.Vector3(0, 0, 0));
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineDashedMaterial({
      color: 0xffea00,
      dashSize: 0.45,
      gapSize: 0.25,
      linewidth: 3,
      transparent: true,
      opacity: 0.85
    });

    this.trajectoryLine = new THREE.Line(geo, mat);
    this.trajectoryLine.computeLineDistances();
    this.scene.add(this.trajectoryLine);
  }

  createHealthBar() {
    // 3D Canvas sprite for overhead HP
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 48;
    this.hpCanvas = canvas;
    this.hpCtx = canvas.getContext('2d');

    this.hpTexture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: this.hpTexture, transparent: true });
    this.hpSprite = new THREE.Sprite(spriteMat);
    this.hpSprite.scale.set(4.5, 0.85, 1);
    this.hpSprite.position.set(0, 3.8, 0);
    this.group.add(this.hpSprite);
    this.updateHealthBarUI();
  }

  updateHealthBarUI() {
    if (!this.hpCtx) return;
    const ctx = this.hpCtx;
    const w = 256;
    const h = 48;

    ctx.clearRect(0, 0, w, h);

    // Background pill
    ctx.fillStyle = 'rgba(10, 20, 30, 0.85)';
    ctx.beginPath();
    ctx.roundRect(4, 4, w - 8, h - 8, 12);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // HP fill
    const fillRatio = Math.max(0, this.hp / this.maxHp);
    const grad = ctx.createLinearGradient(10, 0, w - 20, 0);
    if (fillRatio > 0.45) {
      grad.addColorStop(0, '#00e676');
      grad.addColorStop(1, '#00b0ff');
    } else {
      grad.addColorStop(0, '#ff1744');
      grad.addColorStop(1, '#ff9100');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(10, 10, (w - 20) * fillRatio, h - 20, 8);
    ctx.fill();

    // Label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`HERO: ${Math.max(0, Math.round(this.hp))}%`, w / 2, h / 2);

    this.hpTexture.needsUpdate = true;
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this.updateHealthBarUI();
    // Rock raft violently on impact
    this.tiltAngle = 0.35;
    return this.hp <= 0;
  }

  applyRecoil() {
    this.recoilOffset = 0.65;
    this.tiltAngle = 0.22;
  }

  getMuzzleWorldPosition() {
    const pos = new THREE.Vector3();
    this.muzzleTip.getWorldPosition(pos);
    return pos;
  }

  getLaunchVelocity() {
    // Calculate direction vector from cannon angles
    const yawRad = (this.yaw * Math.PI) / 180;
    const elevRad = (this.elevation * Math.PI) / 180;

    // Base speed scaled by power meter
    const speed = 12 + (this.power / 100) * 26; // ~16 to 38 m/s

    const vx = Math.cos(elevRad) * Math.cos(yawRad) * speed;
    const vy = Math.sin(elevRad) * speed;
    const vz = -Math.cos(elevRad) * Math.sin(yawRad) * speed;

    return new THREE.Vector3(vx, vy, vz);
  }

  updateTrajectory(wind) {
    if (!this.trajectoryLine || this.hp <= 0) return;

    const startPos = this.getMuzzleWorldPosition();
    const velocity = this.getLaunchVelocity().clone();
    const gravity = new THREE.Vector3(0, -18.0, 0);

    const positions = this.trajectoryLine.geometry.attributes.position;
    const dt = 0.055;
    const current = startPos.clone();
    const vel = velocity.clone();

    for (let i = 0; i < positions.count; i++) {
      positions.setXYZ(i, current.x, current.y, current.z);

      // Simple ballistic physics integration
      vel.addScaledVector(gravity, dt);
      vel.addScaledVector(wind, dt * 0.4);
      current.addScaledVector(vel, dt);

      // Stop arc preview below water surface
      if (current.y < -0.2) {
        for (let j = i + 1; j < positions.count; j++) {
          positions.setXYZ(j, current.x, -0.2, current.z);
        }
        break;
      }
    }

    positions.needsUpdate = true;
    this.trajectoryLine.computeLineDistances();
  }

  update(time, delta, wind) {
    // 1. Water Buoyancy
    const waveY = this.world.getWaterHeightAt(this.position.x, this.position.z, time);
    const waveSlopeX = (this.world.getWaterHeightAt(this.position.x + 1, this.position.z, time) - waveY);
    const waveSlopeZ = (this.world.getWaterHeightAt(this.position.x, this.position.z + 1, time) - waveY);

    this.group.position.y = waveY + 0.35;

    // Recoil recovery
    this.recoilOffset = THREE.MathUtils.lerp(this.recoilOffset, 0, delta * 6);
    this.tiltAngle = THREE.MathUtils.lerp(this.tiltAngle, 0, delta * 5);

    this.raftGroup.position.x = -this.recoilOffset;
    this.raftGroup.rotation.z = waveSlopeX * 0.5 - this.tiltAngle;
    this.raftGroup.rotation.x = waveSlopeZ * 0.5;

    // 2. Cannon orientation
    this.cannonBase.rotation.y = (this.yaw * Math.PI) / 180;
    this.cannonBarrelPivot.rotation.z = (this.elevation * Math.PI) / 180;

    // 3. Trajectory Update
    this.updateTrajectory(wind);
  }

  setTrajectoryVisible(visible) {
    if (this.trajectoryLine) {
      this.trajectoryLine.visible = visible;
    }
  }

  reset() {
    this.hp = this.maxHp;
    this.updateHealthBarUI();
    this.recoilOffset = 0;
    this.tiltAngle = 0;
    this.setTrajectoryVisible(true);
  }
}

