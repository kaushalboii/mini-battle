/**
 * Toxic Meltdown® 3D - Interactive Inflatable Sweeper Engine
 * Built with Three.js WebGL.
 * Features an authentic 30ft octagonal inflatable arena, 2 rotating boom arms
 * (low arm to jump, high arm to duck), 8 athletic 3D characters, ragdoll bounce physics,
 * attendant speed controller, multiple camera angles, and Web Audio sound effects.
 * Engineered by Kaushal.
 */

import * as THREE from 'three';
import { ToxicMeltdownAudio } from './ToxicMeltdownAudio';

export interface MeltdownPlayerState {
  id: number;
  name: string;
  isHuman: boolean;
  color: string;
  secondaryColor: string;
  podiumIndex: number;
  podiumAngle: number;
  podiumPos: THREE.Vector3;
  meshGroup: THREE.Group;
  headMesh: THREE.Mesh;
  bodyMesh: THREE.Mesh;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  state: 'idle' | 'jumping' | 'ducking' | 'hit' | 'eliminated' | 'victory';
  jumpTimer: number;
  jumpVelocity: number;
  yOffset: number;
  isDucking: boolean;
  eliminatedTime: number | null;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  reactionSkill: number; // AI reaction skill 0.0 - 1.0
  fatigue: number;
}

export interface MeltdownEngineState {
  survivorsCount: number;
  totalPlayers: number;
  roundTime: number;
  currentRpm: number;
  speedLevel: string;
  direction: 1 | -1;
  isPlayerEliminated: boolean;
  playerRank: number | null;
  winnerName: string | null;
  isRoundOver: boolean;
  score: number;
  clearedJumps: number;
  clearedDucks: number;
}

export class ToxicMeltdownEngine {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private audio: ToxicMeltdownAudio;

  private onStateUpdate?: (state: MeltdownEngineState) => void;
  private onNotification?: (msg: string) => void;

  // Arena Dimensions
  private readonly ARENA_RADIUS = 4.85; // 9.7m diameter (~30ft octagon)
  private readonly PODIUM_RADIUS = 3.45;
  private readonly LOW_ARM_HEIGHT = 0.38; // Jump height requirement
  private readonly HIGH_ARM_HEIGHT = 1.35; // Head/chest level (Duck requirement)
  private readonly ARM_LENGTH = 4.15;

  // Three.js Scene Components
  private sweeperHub!: THREE.Group;
  private lowArmGroup!: THREE.Group;
  private highArmGroup!: THREE.Group;
  private players: MeltdownPlayerState[] = [];
  private confettiGroup: THREE.Group | null = null;

  // Textures
  private hazardTexture!: THREE.CanvasTexture;
  private floorTexture!: THREE.CanvasTexture;

  // Sweeper State
  private sweeperAngle: number = 0;
  private sweeperSpeed: number = 1.45; // rad/s (~14 RPM)
  private targetSpeed: number = 1.45;
  private sweeperDirection: 1 | -1 = 1;
  private nextEventTime: number = 8.0;

  // Game Progress
  private isRunning: boolean = false;
  private roundTime: number = 0;
  private score: number = 0;
  private clearedJumps: number = 0;
  private clearedDucks: number = 0;
  private cameraMode: 'action' | 'player' | 'operator' | 'topdown' = 'action';
  private cameraAngle: number = 0;

  // Animation Frame
  private animationFrameId: number | null = null;
  private lastTime: number = 0;

  constructor(
    canvas: HTMLCanvasElement,
    audio: ToxicMeltdownAudio,
    onStateUpdate?: (state: MeltdownEngineState) => void,
    onNotification?: (msg: string) => void
  ) {
    this.canvas = canvas;
    this.audio = audio;
    this.onStateUpdate = onStateUpdate;
    this.onNotification = onNotification;

    // 1. Initialize Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // 2. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a100d); // Deep dark toxic industrial background
    this.scene.fog = new THREE.FogExp2(0x0a100d, 0.025);

    this.camera = new THREE.PerspectiveCamera(
      48,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.updateCameraPlacement();

    // 3. Build Procedural Hazard & Inflatable Textures
    this.createProceduralTextures();

    // 4. Lighting & Environment
    this.setupLighting();

    // 5. Build Octagon Arena, Podiums & Sweeper
    this.buildOctagonInflatable();
    this.buildSweeperTower();
    this.buildOperatorConsole();

    // 6. Spawn 8 Players
    this.initPlayers();

    // 7. Event Listeners
    window.addEventListener('resize', this.handleResize);

    // 8. Start Loop
    this.lastTime = performance.now();
    this.animate();
  }

  private handleResize = () => {
    if (!this.canvas) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  /**
   * Generates procedural canvas textures for authentic black/yellow hazard warning stripes
   * and stitched toxic green inflatable vinyl air cushions.
   */
  private createProceduralTextures() {
    // 1. Hazard Warning Caution Stripes
    const hazardCanvas = document.createElement('canvas');
    hazardCanvas.width = 512;
    hazardCanvas.height = 512;
    const ctx = hazardCanvas.getContext('2d')!;

    ctx.fillStyle = '#f59e0b'; // Vibrant safety amber yellow
    ctx.fillRect(0, 0, 512, 512);

    ctx.fillStyle = '#18181b'; // Matte dark industrial black
    const stripeWidth = 64;
    for (let x = -512; x < 1024; x += stripeWidth * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + stripeWidth, 0);
      ctx.lineTo(x + stripeWidth + 512, 512);
      ctx.lineTo(x + 512, 512);
      ctx.closePath();
      ctx.fill();
    }

    this.hazardTexture = new THREE.CanvasTexture(hazardCanvas);
    this.hazardTexture.wrapS = THREE.RepeatWrapping;
    this.hazardTexture.wrapT = THREE.RepeatWrapping;
    this.hazardTexture.repeat.set(6, 1);

    // 2. Toxic Green Inflatable Air Cushion Floor
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 512;
    floorCanvas.height = 512;
    const fCtx = floorCanvas.getContext('2d')!;

    // Vibrant radioactive green vinyl
    fCtx.fillStyle = '#16a34a';
    fCtx.fillRect(0, 0, 512, 512);

    // Radial stitched baffles
    fCtx.strokeStyle = '#15803d';
    fCtx.lineWidth = 6;
    for (let r = 60; r < 260; r += 50) {
      fCtx.beginPath();
      fCtx.arc(256, 256, r, 0, Math.PI * 2);
      fCtx.stroke();
    }

    // 8 radial seam lines matching the 8 podium sectors
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      fCtx.beginPath();
      fCtx.moveTo(256, 256);
      fCtx.lineTo(256 + Math.cos(a) * 256, 256 + Math.sin(a) * 256);
      fCtx.stroke();
    }

    this.floorTexture = new THREE.CanvasTexture(floorCanvas);
    this.floorTexture.wrapS = THREE.RepeatWrapping;
    this.floorTexture.wrapT = THREE.RepeatWrapping;
  }

  private setupLighting() {
    // Ambient stadium glow
    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambient);

    // Main stadium sun / key light
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    keyLight.position.set(10, 16, 12);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 40;
    keyLight.shadow.camera.left = -8;
    keyLight.shadow.camera.right = 8;
    keyLight.shadow.camera.top = 8;
    keyLight.shadow.camera.bottom = -8;
    keyLight.shadow.bias = -0.0005;
    this.scene.add(keyLight);

    // Fill light with toxic lime tint
    const fillLight = new THREE.DirectionalLight(0x4ade80, 0.8);
    fillLight.position.set(-12, 10, -10);
    this.scene.add(fillLight);

    // Central hub accent spotlight
    const hubSpot = new THREE.SpotLight(0xfef08a, 2.5, 15, Math.PI / 4, 0.3);
    hubSpot.position.set(0, 7, 0);
    hubSpot.target.position.set(0, 0, 0);
    this.scene.add(hubSpot);
    this.scene.add(hubSpot.target);
  }

  /**
   * Builds the authentic 30ft Octagon Inflatable with:
   * - 8-sided cushioned inflatable floor
   * - 8 perimeter bumper cushions with black/yellow caution hazard stripes
   * - Front entrance step cutout
   * - 8 foam circular podium pads with dark "X" marks
   */
  private buildOctagonInflatable() {
    const arenaGroup = new THREE.Group();

    // 1. Inflatable Floor Base (8-sided polygon)
    const floorShape = new THREE.Shape();
    const R = this.ARENA_RADIUS;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 + Math.PI / 8;
      const x = Math.cos(angle) * R;
      const z = Math.sin(angle) * R;
      if (i === 0) floorShape.moveTo(x, z);
      else floorShape.lineTo(x, z);
    }
    floorShape.closePath();

    const floorGeo = new THREE.ShapeGeometry(floorShape);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e, // Radioactive green vinyl
      map: this.floorTexture,
      roughness: 0.45,
      metalness: 0.1,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0.05;
    floorMesh.receiveShadow = true;
    arenaGroup.add(floorMesh);

    // Floor air cushion bevel thickness
    const floorBaseGeo = new THREE.CylinderGeometry(R, R * 1.02, 0.25, 8);
    const floorBaseMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.6,
    });
    const floorBase = new THREE.Mesh(floorBaseGeo, floorBaseMat);
    floorBase.position.y = -0.08;
    floorBase.receiveShadow = true;
    arenaGroup.add(floorBase);

    // 2. 8 Perimeter Inflatable Bumper Cushion Walls
    // Top bumper has black/yellow hazard caution stripes
    const hazardMat = new THREE.MeshStandardMaterial({
      map: this.hazardTexture,
      roughness: 0.4,
      metalness: 0.05,
    });
    const wallBaseMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917, // Dark charcoal heavy-duty vinyl
      roughness: 0.7,
    });
    const yellowStripeMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.5,
    });

    const sideLen = 2 * R * Math.sin(Math.PI / 8);

    for (let i = 0; i < 8; i++) {
      // Skip the front entrance opening (i = 0)
      if (i === 0) {
        // Entrance steps with striped hazard pads
        const stepGeo = new THREE.BoxGeometry(sideLen * 0.75, 0.2, 0.7);
        const stepMesh = new THREE.Mesh(stepGeo, hazardMat);
        stepMesh.position.set(0, 0.1, R - 0.15);
        stepMesh.receiveShadow = true;
        arenaGroup.add(stepMesh);
        continue;
      }

      const angle = (i * Math.PI) / 4;
      const segGroup = new THREE.Group();

      // Lower bumper wall
      const wallGeo = new THREE.BoxGeometry(sideLen, 0.75, 0.45);
      const wallMesh = new THREE.Mesh(wallGeo, wallBaseMat);
      wallMesh.position.set(0, 0.38, 0);
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;
      segGroup.add(wallMesh);

      // Yellow accent waist stripe
      const waistGeo = new THREE.BoxGeometry(sideLen, 0.14, 0.48);
      const waistMesh = new THREE.Mesh(waistGeo, yellowStripeMat);
      waistMesh.position.set(0, 0.28, 0);
      segGroup.add(waistMesh);

      // Upper rounded cylindrical bumper roll with black & yellow hazard stripes
      const topRollGeo = new THREE.CylinderGeometry(0.24, 0.24, sideLen, 16);
      const topRollMesh = new THREE.Mesh(topRollGeo, hazardMat);
      topRollMesh.rotation.z = Math.PI / 2;
      topRollMesh.position.set(0, 0.82, 0);
      topRollMesh.castShadow = true;
      topRollMesh.receiveShadow = true;
      segGroup.add(topRollMesh);

      // Position segment along octagon perimeter
      const wallDist = R * Math.cos(Math.PI / 8);
      segGroup.position.set(
        Math.sin(angle) * wallDist,
        0,
        Math.cos(angle) * wallDist
      );
      segGroup.rotation.y = angle;
      arenaGroup.add(segGroup);
    }

    // 3. 8 Foam Circular Podiums with "X" Target Marks
    const podiumGeo = new THREE.CylinderGeometry(0.55, 0.60, 0.20, 24);
    const podiumMat = new THREE.MeshStandardMaterial({
      color: 0x15803d, // Dark toxic green foam
      roughness: 0.6,
      metalness: 0.1,
    });

    // "X" Target Decal
    const xShape = new THREE.Shape();
    const w = 0.08;
    const l = 0.38;
    // Cross lines for the "X"
    xShape.moveTo(-l, -w);
    xShape.lineTo(-w, -w);
    xShape.lineTo(-w, -l);
    xShape.lineTo(w, -l);
    xShape.lineTo(w, -w);
    xShape.lineTo(l, -w);
    xShape.lineTo(l, w);
    xShape.lineTo(w, w);
    xShape.lineTo(w, l);
    xShape.lineTo(-w, l);
    xShape.lineTo(-w, w);
    xShape.lineTo(-l, w);
    xShape.closePath();

    const xGeo = new THREE.ShapeGeometry(xShape);
    const xMat = new THREE.MeshBasicMaterial({ color: 0x052e16 }); // Dark contrast X

    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 + Math.PI / 8;
      const px = Math.cos(angle) * this.PODIUM_RADIUS;
      const pz = Math.sin(angle) * this.PODIUM_RADIUS;

      const pGroup = new THREE.Group();
      pGroup.position.set(px, 0.10, pz);

      const pMesh = new THREE.Mesh(podiumGeo, podiumMat);
      pMesh.castShadow = true;
      pMesh.receiveShadow = true;
      pGroup.add(pMesh);

      // Yellow border ring around the podium
      const ringGeo = new THREE.TorusGeometry(0.54, 0.025, 8, 24);
      const ringMesh = new THREE.Mesh(ringGeo, yellowStripeMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = 0.10;
      pGroup.add(ringMesh);

      // "X" Mark on top of podium
      const xMesh = new THREE.Mesh(xGeo, xMat);
      xMesh.rotation.x = -Math.PI / 2;
      xMesh.position.y = 0.105;
      pGroup.add(xMesh);

      arenaGroup.add(pGroup);
    }

    this.scene.add(arenaGroup);
  }

  /**
   * Builds the central rotating mechanical sweeper unit:
   * - Industrial black motor housing base
   * - Rotating upper hub
   * - Lower sweeper boom arm (requires JUMP)
   * - Upper sweeper boom arm (requires DUCK) with authentic diagonal yellow truss strut
   */
  private buildSweeperTower() {
    this.sweeperHub = new THREE.Group();

    // 1. Stationary Motor Pedestal
    const baseGeo = new THREE.CylinderGeometry(0.55, 0.65, 0.70, 24);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x18181b, // Industrial black steel
      roughness: 0.35,
      metalness: 0.6,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.35;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    this.scene.add(baseMesh);

    // Hazard ring on pedestal base
    const ringGeo = new THREE.CylinderGeometry(0.58, 0.62, 0.12, 24);
    const ringMat = new THREE.MeshStandardMaterial({
      map: this.hazardTexture,
      roughness: 0.4,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = 0.25;
    this.scene.add(ringMesh);

    // 2. Rotating Upper Collar & Hub
    const collarGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.85, 24);
    const collarMesh = new THREE.Mesh(collarGeo, baseMat);
    collarMesh.position.y = 0.95;
    collarMesh.castShadow = true;
    this.sweeperHub.add(collarMesh);

    // Sweeper Arm Foam Hazard Material
    const armHazardMat = new THREE.MeshStandardMaterial({
      map: this.hazardTexture,
      roughness: 0.45,
      metalness: 0.1,
    });
    const capMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.8,
    });

    // 3. ARM 1: LOW SWEEPER ARM (Requires JUMPING over!)
    // Height: ~0.38m above podium
    this.lowArmGroup = new THREE.Group();
    const lowArmLen = this.ARM_LENGTH;
    const armRadius = 0.12;

    const lowArmGeo = new THREE.CylinderGeometry(armRadius, armRadius, lowArmLen, 16);
    const lowArmMesh = new THREE.Mesh(lowArmGeo, armHazardMat);
    lowArmMesh.rotation.z = Math.PI / 2;
    lowArmMesh.position.set(lowArmLen / 2 + 0.3, 0, 0);
    lowArmMesh.castShadow = true;
    this.lowArmGroup.add(lowArmMesh);

    // Protective foam end cap
    const lowCapGeo = new THREE.SphereGeometry(armRadius * 1.05, 16, 16);
    const lowCapMesh = new THREE.Mesh(lowCapGeo, capMat);
    lowCapMesh.position.set(lowArmLen + 0.3, 0, 0);
    this.lowArmGroup.add(lowCapMesh);

    this.lowArmGroup.position.set(0, this.LOW_ARM_HEIGHT, 0);
    this.sweeperHub.add(this.lowArmGroup);

    // 4. ARM 2: HIGH SWEEPER ARM (Requires DUCKING under!)
    // Angle: 180 degrees opposite. Height: ~1.35m above podium
    this.highArmGroup = new THREE.Group();
    const highArmLen = this.ARM_LENGTH;

    const highArmGeo = new THREE.CylinderGeometry(armRadius, armRadius, highArmLen, 16);
    const highArmMesh = new THREE.Mesh(highArmGeo, armHazardMat);
    highArmMesh.rotation.z = Math.PI / 2;
    highArmMesh.position.set(highArmLen / 2 + 0.3, 0, 0);
    highArmMesh.castShadow = true;
    this.highArmGroup.add(highArmMesh);

    // High arm protective end cap
    const highCapMesh = new THREE.Mesh(lowCapGeo, capMat);
    highCapMesh.position.set(highArmLen + 0.3, 0, 0);
    this.highArmGroup.add(highCapMesh);

    // Authentic Diagonal Yellow Tubular Truss Strut (Exact match to Galaxy Multi Rides design!)
    const strutLen = Math.sqrt(Math.pow(highArmLen * 0.45, 2) + Math.pow(0.75, 2));
    const strutGeo = new THREE.CylinderGeometry(0.045, 0.045, strutLen, 12);
    const strutMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15, // High-vis yellow steel tube
      roughness: 0.3,
      metalness: 0.5,
    });
    const strutMesh = new THREE.Mesh(strutGeo, strutMat);
    strutMesh.position.set((highArmLen * 0.45) / 2 + 0.3, -0.38, 0);
    strutMesh.rotation.z = -Math.atan2(0.75, highArmLen * 0.45);
    strutMesh.castShadow = true;
    this.highArmGroup.add(strutMesh);

    this.highArmGroup.position.set(0, this.HIGH_ARM_HEIGHT, 0);
    this.highArmGroup.rotation.y = Math.PI; // 180 degrees opposite
    this.sweeperHub.add(this.highArmGroup);

    this.scene.add(this.sweeperHub);
  }

  /**
   * Galaxy Multi Rides Operator Console Pedestal outside the arena
   */
  private buildOperatorConsole() {
    const consoleGroup = new THREE.Group();
    consoleGroup.position.set(-2.8, 0, this.ARENA_RADIUS + 0.8);
    consoleGroup.rotation.y = Math.PI * 0.9;

    // Bright yellow steel pedestal cabinet
    const cabGeo = new THREE.BoxGeometry(0.65, 1.15, 0.45);
    const cabMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15, // Galaxy yellow
      roughness: 0.3,
      metalness: 0.4,
    });
    const cabMesh = new THREE.Mesh(cabGeo, cabMat);
    cabMesh.position.y = 0.58;
    cabMesh.castShadow = true;
    cabMesh.receiveShadow = true;
    consoleGroup.add(cabMesh);

    // Angled control panel top
    const panelGeo = new THREE.BoxGeometry(0.62, 0.05, 0.42);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x27272a, // Matte grey panel face
      roughness: 0.5,
      metalness: 0.3,
    });
    const panelMesh = new THREE.Mesh(panelGeo, panelMat);
    panelMesh.position.set(0, 1.18, 0.02);
    panelMesh.rotation.x = 0.25;
    consoleGroup.add(panelMesh);

    // Emergency Stop Red Mushroom Button
    const estopGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16);
    const estopMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
    const estopMesh = new THREE.Mesh(estopGeo, estopMat);
    estopMesh.position.set(0.18, 1.23, -0.05);
    consoleGroup.add(estopMesh);

    // Speed Control Rotary Dial & Joystick
    const joyGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8);
    const joyMat = new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 0.8 });
    const joyMesh = new THREE.Mesh(joyGeo, joyMat);
    joyMesh.position.set(-0.15, 1.25, 0.02);
    consoleGroup.add(joyMesh);

    this.scene.add(consoleGroup);
  }

  /**
   * Initializes the 8 athletic 3D characters (Player 1 + 7 AI Competitors)
   */
  private initPlayers() {
    this.players = [];

    const PLAYER_PROFILES = [
      { name: 'You (Kaushal)', isHuman: true, color: '#06b6d4', secondary: '#facc15', skill: 1.0 },
      { name: 'Toxic Toby', isHuman: false, color: '#10b981', secondary: '#18181b', skill: 0.85 },
      { name: 'Agile Alex', isHuman: false, color: '#ef4444', secondary: '#ffffff', skill: 0.95 },
      { name: 'Bouncing Ben', isHuman: false, color: '#3b82f6', secondary: '#f59e0b', skill: 0.75 },
      { name: 'Ducking Dana', isHuman: false, color: '#8b5cf6', secondary: '#ec4899', skill: 0.92 },
      { name: 'Slick Sam', isHuman: false, color: '#f97316', secondary: '#18181b', skill: 0.80 },
      { name: 'Jumpin\' Jack', isHuman: false, color: '#84cc16', secondary: '#06b6d4', skill: 0.88 },
      { name: 'Hazard Hank', isHuman: false, color: '#ec4899', secondary: '#ffffff', skill: 0.70 },
    ];

    for (let i = 0; i < 8; i++) {
      const profile = PLAYER_PROFILES[i];
      const angle = (i * Math.PI) / 4 + Math.PI / 8;
      const px = Math.cos(angle) * this.PODIUM_RADIUS;
      const pz = Math.sin(angle) * this.PODIUM_RADIUS;

      const pGroup = new THREE.Group();
      pGroup.position.set(px, 0.20, pz); // Stand on podium top
      // Face towards central sweeper tower
      pGroup.lookAt(0, 0.20, 0);

      const colorHex = parseInt(profile.color.replace('#', '0x'), 16);
      const secColorHex = parseInt(profile.secondary.replace('#', '0x'), 16);

      const jerseyMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.6,
      });
      const skinMat = new THREE.MeshStandardMaterial({
        color: 0xfbcfe8, // Fair athletic skin tone
        roughness: 0.7,
      });
      const shortsMat = new THREE.MeshStandardMaterial({
        color: secColorHex,
        roughness: 0.5,
      });
      const shoesMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.4,
      });

      // Character Rig:
      // 1. Torso / Jersey
      const torsoGeo = new THREE.BoxGeometry(0.36, 0.48, 0.22);
      const torsoMesh = new THREE.Mesh(torsoGeo, jerseyMat);
      torsoMesh.position.y = 0.74;
      torsoMesh.castShadow = true;
      pGroup.add(torsoMesh);

      // Player Number Stripe on Chest
      const numGeo = new THREE.PlaneGeometry(0.16, 0.16);
      const numMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const numMesh = new THREE.Mesh(numGeo, numMat);
      numMesh.position.set(0, 0.76, 0.115);
      pGroup.add(numMesh);

      // 2. Head with Sweatband
      const headGeo = new THREE.SphereGeometry(0.14, 16, 16);
      const headMesh = new THREE.Mesh(headGeo, skinMat);
      headMesh.position.y = 1.12;
      headMesh.castShadow = true;
      pGroup.add(headMesh);

      // Sweatband
      const bandGeo = new THREE.TorusGeometry(0.142, 0.025, 8, 16);
      const bandMat = new THREE.MeshBasicMaterial({ color: secColorHex });
      const bandMesh = new THREE.Mesh(bandGeo, bandMat);
      bandMesh.rotation.x = Math.PI / 2;
      bandMesh.position.y = 1.14;
      pGroup.add(bandMesh);

      // 3. Legs
      const legGeo = new THREE.BoxGeometry(0.12, 0.46, 0.14);
      const leftLeg = new THREE.Mesh(legGeo, shortsMat);
      leftLeg.position.set(-0.11, 0.30, 0);
      leftLeg.castShadow = true;
      pGroup.add(leftLeg);

      const rightLeg = new THREE.Mesh(legGeo, shortsMat);
      rightLeg.position.set(0.11, 0.30, 0);
      rightLeg.castShadow = true;
      pGroup.add(rightLeg);

      // Shoes
      const shoeGeo = new THREE.BoxGeometry(0.13, 0.10, 0.20);
      const leftShoe = new THREE.Mesh(shoeGeo, shoesMat);
      leftShoe.position.set(-0.11, 0.05, 0.03);
      leftShoe.castShadow = true;
      pGroup.add(leftShoe);

      const rightShoe = new THREE.Mesh(shoeGeo, shoesMat);
      rightShoe.position.set(0.11, 0.05, 0.03);
      rightShoe.castShadow = true;
      pGroup.add(rightShoe);

      // 4. Arms
      const armGeo = new THREE.BoxGeometry(0.09, 0.42, 0.09);
      const leftArm = new THREE.Mesh(armGeo, skinMat);
      leftArm.position.set(-0.24, 0.70, 0.05);
      leftArm.rotation.x = 0.2;
      leftArm.castShadow = true;
      pGroup.add(leftArm);

      const rightArm = new THREE.Mesh(armGeo, skinMat);
      rightArm.position.set(0.24, 0.70, 0.05);
      rightArm.rotation.x = 0.2;
      rightArm.castShadow = true;
      pGroup.add(rightArm);

      this.scene.add(pGroup);

      this.players.push({
        id: i,
        name: profile.name,
        isHuman: profile.isHuman,
        color: profile.color,
        secondaryColor: profile.secondary,
        podiumIndex: i,
        podiumAngle: angle,
        podiumPos: new THREE.Vector3(px, 0.20, pz),
        meshGroup: pGroup,
        headMesh,
        bodyMesh: torsoMesh,
        leftLeg,
        rightLeg,
        leftArm,
        rightArm,
        state: 'idle',
        jumpTimer: 0,
        jumpVelocity: 0,
        yOffset: 0,
        isDucking: false,
        eliminatedTime: null,
        velocity: new THREE.Vector3(),
        angularVelocity: new THREE.Vector3(),
        reactionSkill: profile.skill,
        fatigue: 0,
      });
    }
  }

  /**
   * Action trigger: Player JUMP
   */
  public triggerJump(playerIdx: number = 0) {
    const p = this.players[playerIdx];
    if (!p || p.state === 'eliminated' || p.state === 'hit') return;

    // Can only jump if grounded
    if (p.state !== 'jumping') {
      p.state = 'jumping';
      p.jumpVelocity = 5.2; // Initial upward velocity m/s
      p.jumpTimer = 0;
      this.audio.playJump();
    }
  }

  /**
   * Action trigger: Player DUCK / CROUCH
   */
  public setDucking(isDucking: boolean, playerIdx: number = 0) {
    const p = this.players[playerIdx];
    if (!p || p.state === 'eliminated' || p.state === 'hit') return;

    p.isDucking = isDucking;
    if (isDucking && p.state !== 'jumping') {
      if (p.state !== 'ducking') {
        this.audio.playDuck();
      }
      p.state = 'ducking';
    } else if (!isDucking && p.state === 'ducking') {
      p.state = 'idle';
    }
  }

  /**
   * Operator Console Controls: Set Sweeper Speed & Direction
   */
  public setOperatorSpeed(speedRatio: number) {
    // 0.8 rad/s to 5.8 rad/s
    this.targetSpeed = THREE.MathUtils.lerp(0.8, 5.8, speedRatio);
    this.audio.updateMotorSpeed(speedRatio);
  }

  public reverseDirection() {
    this.sweeperDirection = (this.sweeperDirection * -1) as (1 | -1);
    this.audio.playWarningSiren();
    this.onNotification?.('🔄 REVERSING SWEEPER MOTOR!');
  }

  public triggerSpeedBurst() {
    this.targetSpeed = Math.min(this.sweeperSpeed * 1.5, 6.2);
    this.audio.playWarningSiren();
    this.onNotification?.('⚡ OPERATOR SPEED BURST!');
    setTimeout(() => {
      this.targetSpeed = Math.max(1.5, this.sweeperSpeed * 0.7);
    }, 3200);
  }

  public setCameraMode(mode: 'action' | 'player' | 'operator' | 'topdown') {
    this.cameraMode = mode;
    this.updateCameraPlacement();
  }

  public cycleCameraMode(): string {
    const modes: Array<'action' | 'player' | 'operator' | 'topdown'> = [
      'action',
      'player',
      'operator',
      'topdown',
    ];
    const nextIdx = (modes.indexOf(this.cameraMode) + 1) % modes.length;
    this.setCameraMode(modes[nextIdx]);
    return modes[nextIdx];
  }

  public restartGame() {
    this.roundTime = 0;
    this.score = 0;
    this.clearedJumps = 0;
    this.clearedDucks = 0;
    this.sweeperSpeed = 1.45;
    this.targetSpeed = 1.45;
    this.sweeperDirection = 1;
    this.sweeperAngle = 0;
    this.nextEventTime = 10.0;

    // Reset all 8 players back to their podiums
    this.players.forEach((p) => {
      p.state = 'idle';
      p.jumpTimer = 0;
      p.jumpVelocity = 0;
      p.yOffset = 0;
      p.isDucking = false;
      p.eliminatedTime = null;
      p.velocity.set(0, 0, 0);
      p.angularVelocity.set(0, 0, 0);
      p.meshGroup.position.copy(p.podiumPos);
      p.meshGroup.rotation.set(0, 0, 0);
      p.meshGroup.lookAt(0, 0.20, 0);

      // Restore body transforms
      p.bodyMesh.scale.set(1, 1, 1);
      p.bodyMesh.position.y = 0.74;
      p.headMesh.position.y = 1.12;
      p.leftLeg.scale.set(1, 1, 1);
      p.rightLeg.scale.set(1, 1, 1);
    });

    if (this.confettiGroup) {
      this.scene.remove(this.confettiGroup);
      this.confettiGroup = null;
    }

    this.isRunning = true;
    this.audio.startMotor();
    this.onNotification?.('⚠️ ROUND STARTED: JUMP & DUCK TO SURVIVE!');
  }

  private updateCameraPlacement() {
    switch (this.cameraMode) {
      case 'player': {
        // Behind Player 1 over the shoulder facing central hub
        const p1 = this.players[0];
        if (p1) {
          const camOffset = new THREE.Vector3(
            Math.cos(p1.podiumAngle) * 1.5,
            1.2,
            Math.sin(p1.podiumAngle) * 1.5
          );
          this.camera.position.copy(p1.podiumPos).add(camOffset);
          this.camera.lookAt(0, 0.6, 0);
        }
        break;
      }
      case 'operator': {
        // Behind the yellow control console outside the arena looking in
        this.camera.position.set(-3.6, 1.85, this.ARENA_RADIUS + 1.8);
        this.camera.lookAt(0, 0.5, 0);
        break;
      }
      case 'topdown': {
        // Pure overhead tactical arena camera
        this.camera.position.set(0, 12.5, 0.01);
        this.camera.lookAt(0, 0, 0);
        break;
      }
      case 'action':
      default: {
        // Elevated cinematic 3/4 arena angle with gentle orbit
        this.camera.position.set(
          Math.sin(this.cameraAngle) * 9.5,
          6.5,
          Math.cos(this.cameraAngle) * 9.5
        );
        this.camera.lookAt(0, 0.4, 0);
        break;
      }
    }
  }

  /**
   * Main Simulation Loop
   */
  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    if (this.isRunning) {
      this.roundTime += dt;

      // 1. Escalating Difficulty: smoothly ramp speed as time progresses
      const speedRamp = 1.45 + (this.roundTime / 60) * 2.2;
      this.targetSpeed = Math.min(speedRamp, 5.5);
      this.sweeperSpeed = THREE.MathUtils.lerp(this.sweeperSpeed, this.targetSpeed, dt * 1.5);

      // 2. Attendant AI Events (Direction reversal, speed bursts)
      if (this.roundTime > this.nextEventTime) {
        this.triggerAttendantEvent();
      }

      // 3. Rotate Sweeper Hub & Boom Arms
      const deltaAngle = this.sweeperSpeed * this.sweeperDirection * dt;
      this.sweeperAngle = (this.sweeperAngle + deltaAngle) % (Math.PI * 2);
      if (this.sweeperAngle < 0) this.sweeperAngle += Math.PI * 2;
      this.sweeperHub.rotation.y = this.sweeperAngle;

      this.audio.updateMotorSpeed(this.sweeperSpeed / 5.5);

      // 4. Update Character Animations & AI Behaviors
      this.updatePlayers(dt);

      // 5. Collision Hit Detection (Sweeper Arms vs Players)
      this.checkArmCollisions();

      // 6. Confetti animation if victory
      if (this.confettiGroup) {
        this.confettiGroup.children.forEach((c) => {
          c.position.y -= dt * 2.5;
          c.rotation.x += dt * 4;
          c.rotation.y += dt * 3;
          if (c.position.y < 0.2) c.position.y = 6.0;
        });
      }

      // 7. Update Camera in Action Mode
      if (this.cameraMode === 'action') {
        this.cameraAngle += dt * 0.08;
        this.updateCameraPlacement();
      }

      // 8. Broadcast State to UI
      this.broadcastState();
    }

    this.renderer.render(this.scene, this.camera);
  };

  /**
   * Attendant AI triggers sudden reversals or surprises
   */
  private triggerAttendantEvent() {
    const roll = Math.random();
    if (roll < 0.45 && this.roundTime > 12) {
      // Reverse direction
      this.reverseDirection();
      this.nextEventTime = this.roundTime + 8 + Math.random() * 10;
    } else if (roll < 0.8) {
      // Speed surge
      this.triggerSpeedBurst();
      this.nextEventTime = this.roundTime + 6 + Math.random() * 8;
    } else {
      this.nextEventTime = this.roundTime + 7;
    }
  }

  /**
   * Updates player jumps, ducks, physics ragdoll tumbling, and AI reactions
   */
  private updatePlayers(dt: number) {
    this.players.forEach((p) => {
      // If AI, compute reactions to incoming boom arms
      if (!p.isHuman && p.state !== 'eliminated' && p.state !== 'hit') {
        this.updateAIPlayer(p, dt);
      }

      // Jump Physics: Gravity curve
      if (p.state === 'jumping') {
        p.jumpVelocity -= 14.5 * dt; // Gravity
        p.yOffset += p.jumpVelocity * dt;

        if (p.yOffset <= 0) {
          p.yOffset = 0;
          p.jumpVelocity = 0;
          p.state = p.isDucking ? 'ducking' : 'idle';
          this.audio.playFloorBounce();
        }

        p.meshGroup.position.y = p.podiumPos.y + p.yOffset;
        p.leftLeg.rotation.x = -0.6;
        p.rightLeg.rotation.x = -0.6;
      } else if (p.state === 'ducking') {
        // Deep crouch deformation
        p.yOffset = -0.22;
        p.meshGroup.position.y = p.podiumPos.y + p.yOffset;
        p.bodyMesh.scale.set(1.15, 0.65, 1.15);
        p.bodyMesh.position.y = 0.52;
        p.headMesh.position.y = 0.82;
        p.leftLeg.scale.set(1, 0.6, 1);
        p.rightLeg.scale.set(1, 0.6, 1);
      } else if (p.state === 'idle') {
        // Springy athletic bounce
        p.yOffset = Math.sin(this.roundTime * 6.5 + p.id) * 0.035;
        p.meshGroup.position.y = p.podiumPos.y + p.yOffset;
        p.bodyMesh.scale.set(1, 1, 1);
        p.bodyMesh.position.y = 0.74;
        p.headMesh.position.y = 1.12;
        p.leftLeg.scale.set(1, 1, 1);
        p.rightLeg.scale.set(1, 1, 1);
        p.leftLeg.rotation.x = 0;
        p.rightLeg.rotation.x = 0;
      } else if (p.state === 'hit') {
        // Ragdoll Physics: Fling backward off podium onto green air cushion
        p.velocity.y -= 12.0 * dt; // Gravity
        p.meshGroup.position.addScaledVector(p.velocity, dt);

        p.meshGroup.rotation.x += p.angularVelocity.x * dt;
        p.meshGroup.rotation.y += p.angularVelocity.y * dt;
        p.meshGroup.rotation.z += p.angularVelocity.z * dt;

        // Bounce on green air cushion floor (y = 0.20)
        if (p.meshGroup.position.y <= 0.18) {
          p.meshGroup.position.y = 0.18;
          p.velocity.y = -p.velocity.y * 0.45; // Inflatable bounce dampening
          p.velocity.x *= 0.65;
          p.velocity.z *= 0.65;
          p.angularVelocity.multiplyScalar(0.7);

          if (Math.abs(p.velocity.y) < 0.4) {
            p.state = 'eliminated';
            p.eliminatedTime = this.roundTime;
            this.audio.playFloorBounce();
          }
        }
      }
    });
  }

  /**
   * AI Competitors: Read incoming sweeper arms and trigger timed Jump or Duck
   */
  private updateAIPlayer(p: MeltdownPlayerState, _dt: number) {
    // Current arm angles: Low Arm is at sweeperAngle; High Arm is at sweeperAngle + PI
    const lowArmAngle = this.normalizeAngle(this.sweeperAngle);
    const highArmAngle = this.normalizeAngle(this.sweeperAngle + Math.PI);

    // Compute angular distance from each arm to this player's podium
    const pAngle = this.normalizeAngle(p.podiumAngle);

    const distLow = this.angleDiff(lowArmAngle, pAngle, this.sweeperDirection);
    const distHigh = this.angleDiff(highArmAngle, pAngle, this.sweeperDirection);

    const timeToLow = distLow / Math.max(0.1, this.sweeperSpeed);
    const timeToHigh = distHigh / Math.max(0.1, this.sweeperSpeed);

    // Fatigue increases mistake probability over time
    p.fatigue = Math.min(0.4, (this.roundTime / 70) * 0.35);
    const failChance = (1.0 - p.reactionSkill) * 0.25 + p.fatigue;

    // React to Low Arm -> Must JUMP!
    if (timeToLow > 0.08 && timeToLow < 0.28) {
      if (Math.random() > failChance) {
        if (p.state !== 'jumping') {
          this.triggerJump(p.id);
        }
      }
    }

    // React to High Arm -> Must DUCK!
    if (timeToHigh > 0.08 && timeToHigh < 0.30) {
      if (Math.random() > failChance) {
        this.setDucking(true, p.id);
      }
    } else if (p.isDucking && timeToHigh > 0.45) {
      this.setDucking(false, p.id);
    }
  }

  /**
   * Tests if the rotating sweeper boom arms collide with any active player
   */
  private checkArmCollisions() {
    const lowArmAngle = this.normalizeAngle(this.sweeperAngle);
    const highArmAngle = this.normalizeAngle(this.sweeperAngle + Math.PI);

    const HIT_ANGLE_TOLERANCE = 0.16; // Arm angular thickness threshold

    this.players.forEach((p) => {
      if (p.state === 'eliminated' || p.state === 'hit') return;

      const pAngle = this.normalizeAngle(p.podiumAngle);

      // 1. Check Collision with LOW SWEEPER ARM
      const diffLow = Math.abs(this.angularDistance(lowArmAngle, pAngle));
      if (diffLow < HIT_ANGLE_TOLERANCE) {
        // Safe only if player is JUMPING high enough!
        const playerClearanceY = p.yOffset;
        if (playerClearanceY >= 0.32) {
          // Success! Jumped over low arm
          if (p.isHuman) {
            this.clearedJumps++;
            this.score += 100;
          }
        } else {
          // HIT BY LOW ARM! Swept off podium!
          this.knockoutPlayer(p, 'low');
        }
      }

      // 2. Check Collision with HIGH SWEEPER ARM
      const diffHigh = Math.abs(this.angularDistance(highArmAngle, pAngle));
      if (diffHigh < HIT_ANGLE_TOLERANCE) {
        // Safe only if player is DUCKING / CROUCHING!
        if (p.state === 'ducking') {
          // Success! Ducked underneath high arm
          if (p.isHuman) {
            this.clearedDucks++;
            this.score += 100;
          }
        } else {
          // HIT BY HIGH ARM! Clipped in chest/head!
          this.knockoutPlayer(p, 'high');
        }
      }
    });

    // Check if only 1 survivor remains (WINNER!)
    const activeSurvivors = this.players.filter((p) => p.state !== 'eliminated' && p.state !== 'hit');
    if (activeSurvivors.length === 1 && this.players.length > 1) {
      const winner = activeSurvivors[0];
      if (winner.state !== 'victory') {
        winner.state = 'victory';
        this.audio.playVictoryFanfare();
        this.spawnVictoryConfetti(winner.podiumPos);
        this.onNotification?.(`🏆 ${winner.name.toUpperCase()} IS THE LAST STANDING CHAMPION!`);
      }
    }
  }

  /**
   * Applies physics impulse to fling knocked-out player off the podium
   */
  private knockoutPlayer(p: MeltdownPlayerState, armType: 'low' | 'high') {
    p.state = 'hit';
    this.audio.playImpact();

    // Tangential direction of the rotating arm
    const tangent = new THREE.Vector3(
      -Math.sin(p.podiumAngle) * this.sweeperDirection,
      0,
      Math.cos(p.podiumAngle) * this.sweeperDirection
    );

    // Radial outward push off the podium
    const outward = new THREE.Vector3(
      Math.cos(p.podiumAngle),
      0,
      Math.sin(p.podiumAngle)
    );

    const impulse = new THREE.Vector3()
      .addScaledVector(tangent, 3.8 * (this.sweeperSpeed / 2.0))
      .addScaledVector(outward, 2.2);

    // High arm hit produces stronger backward head snap
    impulse.y = armType === 'high' ? 2.4 : 3.8;

    p.velocity.copy(impulse);
    p.angularVelocity.set(
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 8
    );

    const hitMsg = armType === 'low'
      ? `💥 ${p.name} tripped over the low sweeper arm!`
      : `💥 ${p.name} was clipped by the high boom arm!`;

    this.onNotification?.(hitMsg);
  }

  private spawnVictoryConfetti(origin: THREE.Vector3) {
    if (this.confettiGroup) this.scene.remove(this.confettiGroup);
    this.confettiGroup = new THREE.Group();

    const colors = [0xfacc15, 0x22c55e, 0x06b6d4, 0xec4899, 0xffffff];
    const geo = new THREE.PlaneGeometry(0.12, 0.12);

    for (let i = 0; i < 75; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        origin.x + (Math.random() - 0.5) * 3,
        origin.y + 1.5 + Math.random() * 4,
        origin.z + (Math.random() - 0.5) * 3
      );
      this.confettiGroup.add(mesh);
    }

    this.scene.add(this.confettiGroup);
  }

  private broadcastState() {
    const activeCount = this.players.filter(
      (p) => p.state !== 'eliminated' && p.state !== 'hit'
    ).length;

    const p1 = this.players[0];
    const isP1Eliminated = p1 ? (p1.state === 'eliminated' || p1.state === 'hit') : false;

    // RPM: 1 rad/s = 9.55 RPM
    const rpm = Math.round(this.sweeperSpeed * 9.55);

    let speedLevel = 'WARMUP';
    if (this.sweeperSpeed > 4.8) speedLevel = 'TOXIC MELTDOWN!';
    else if (this.sweeperSpeed > 3.8) speedLevel = 'INSANE';
    else if (this.sweeperSpeed > 2.8) speedLevel = 'RAPID';
    else if (this.sweeperSpeed > 2.0) speedLevel = 'HAZARD';
    else if (this.sweeperSpeed > 1.5) speedLevel = 'CRUISING';

    const winner = activeCount === 1 ? this.players.find((p) => p.state === 'victory') : null;

    this.onStateUpdate?.({
      survivorsCount: activeCount,
      totalPlayers: 8,
      roundTime: this.roundTime,
      currentRpm: rpm,
      speedLevel,
      direction: this.sweeperDirection,
      isPlayerEliminated: isP1Eliminated,
      playerRank: isP1Eliminated ? 9 - activeCount : (activeCount === 1 ? 1 : null),
      winnerName: winner ? winner.name : null,
      isRoundOver: activeCount <= 1,
      score: this.score + Math.floor(this.roundTime * 15),
      clearedJumps: this.clearedJumps,
      clearedDucks: this.clearedDucks,
    });
  }

  private normalizeAngle(rad: number): number {
    rad = rad % (Math.PI * 2);
    if (rad < 0) rad += Math.PI * 2;
    return rad;
  }

  private angleDiff(from: number, to: number, direction: 1 | -1): number {
    if (direction === 1) {
      let d = to - from;
      if (d < 0) d += Math.PI * 2;
      return d;
    } else {
      let d = from - to;
      if (d < 0) d += Math.PI * 2;
      return d;
    }
  }

  private angularDistance(a1: number, a2: number): number {
    let diff = a1 - a2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    return diff;
  }

  public destroy() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.handleResize);
    this.audio.stopMotor();
    this.renderer.dispose();
  }
}
