/**
 * RevSector 3D - Live Rival Grid & Zero-Connect Multiplayer Engine
 * Manages autonomous competitor racecars on the circuit with dynamic speed control,
 * independent racing lines (no overlapping), smart overtaking, realistic car crash physics,
 * and zero-setup cross-client multiplayer mesh (BroadcastChannel).
 * Engineered by Kaushal.
 */

import { Container3D, Model3D, Quaternion, Vector3 } from '@pixi/3d';

export interface RivalDriver {
  id: string;
  name: string;
  code: string;
  team: string;
  colorKey: string;
  colorHex: string;
  tireCompound: 'S' | 'M' | 'H';
  isHuman: boolean;
  laneOffset: number; // Lateral offset perpendicular to track (prevents cars from overlapping!)
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  targetSpeed: number;
  topSpeed: number;
  cornerSpeed: number;
  waypointIndex: number;
  lap: number;
  lapProgress: number;
  model: Model3D | null;
  wheels: any[];
  lastPacketTime: number;
}

export interface GridStanding {
  position: number;
  name: string;
  code: string;
  team: string;
  color: string;
  gap: string;
  tire: 'S' | 'M' | 'H';
  isPlayer: boolean;
  lap: number;
  speedKmh: number;
}

const DEFAULT_RIVALS: Array<Omit<RivalDriver, 'model' | 'wheels' | 'lastPacketTime' | 'x' | 'y' | 'z' | 'yaw' | 'speed' | 'targetSpeed' | 'waypointIndex' | 'lap' | 'lapProgress'>> = [
  {
    id: 'rival_ver',
    name: 'Max Verstappen',
    code: 'VER',
    team: 'Red Bull Racing',
    colorKey: 'vehicle-truck-red',
    colorHex: '#ef4444',
    tireCompound: 'M',
    isHuman: false,
    laneOffset: -0.75, // Inside line
    topSpeed: 21.5,
    cornerSpeed: 12.0,
  },
  {
    id: 'rival_ham',
    name: 'Lewis Hamilton',
    code: 'HAM',
    team: 'Mercedes AMG',
    colorKey: 'vehicle-truck-green',
    colorHex: '#10b981',
    tireCompound: 'S',
    isHuman: false,
    laneOffset: 0.0, // Center line
    topSpeed: 20.8,
    cornerSpeed: 11.5,
  },
  {
    id: 'rival_nor',
    name: 'Lando Norris',
    code: 'NOR',
    team: 'McLaren F1',
    colorKey: 'vehicle-truck-purple',
    colorHex: '#8b5cf6',
    tireCompound: 'H',
    isHuman: false,
    laneOffset: 0.75, // Outside line
    topSpeed: 20.2,
    cornerSpeed: 11.8,
  },
];

const GRID_START_SLOTS = [
  { x: 4.6, z: 7.6, yaw: 0 },   // P2
  { x: 2.8, z: 10.0, yaw: 0 },  // P3
  { x: 4.6, z: 12.4, yaw: 0 },  // P4
];

const _q = new Quaternion();
const _yAxis = new Vector3(0, 1, 0);

function angleLerp(current: number, target: number, t: number): number {
  let diff = (target - current) % (Math.PI * 2);
  if (diff < -Math.PI) diff += Math.PI * 2;
  if (diff > Math.PI) diff -= Math.PI * 2;
  return current + diff * t;
}

export class RivalGrid {
  private root: Container3D;
  private sources: Record<string, any>;
  private circuitId: string;
  private waypoints: Array<{ x: number; z: number; isCorner: boolean }>;
  private rivals: RivalDriver[] = [];
  private broadcastChannel: BroadcastChannel | null = null;
  private localPlayerId: string;
  public isPracticeMode: boolean = false;
  private localPlayerName: string = 'Kaushal';
  private localPlayerColor: string = 'vehicle-truck-yellow';
  private broadcastThrottle = 0;

  constructor(
    root: Container3D,
    sources: Record<string, any>,
    circuitId: string,
    waypoints: Array<{ x: number; z: number; isCorner: boolean }>,
    playerColor: string = 'vehicle-truck-yellow',
    playerName: string = 'Kaushal',
    initialPracticeMode: boolean = false
  ) {
    this.root = root;
    this.sources = sources;
    this.circuitId = circuitId;
    this.waypoints = waypoints;
    this.localPlayerColor = playerColor;
    this.localPlayerName = playerName;
    this.isPracticeMode = initialPracticeMode;
    this.localPlayerId = 'p_' + Math.random().toString(36).substring(2, 8);

    this.initRivals();
    this.initMultiplayerMesh();
  }

  public setPracticeMode(active: boolean) {
    this.isPracticeMode = active;
    this.initRivals();
  }

  private initRivals() {
    // Clear any previous rival models
    for (const rival of this.rivals) {
      if (rival.model && rival.model.parent) {
        rival.model.parent.removeChild(rival.model);
      }
    }
    this.rivals = [];

    // In Live mode: keep track completely blank unless peer humans connect!
    if (!this.isPracticeMode) {
      return;
    }

    // In Practice mode: spawn 3 distinct AI rivals with non-overlapping lines
    const availableColors = ['vehicle-truck-red', 'vehicle-truck-green', 'vehicle-truck-purple', 'vehicle-truck-yellow']
      .filter((c) => c !== this.localPlayerColor);

    DEFAULT_RIVALS.forEach((cfg, index) => {
      const slot = GRID_START_SLOTS[index % GRID_START_SLOTS.length];
      const colorKey = availableColors[index % availableColors.length] || cfg.colorKey;
      const source = this.sources[colorKey];

      let model: Model3D | null = null;
      const wheels: any[] = [];

      if (source) {
        model = new Model3D(source);
        model.scale.set(0.5, 0.5, 0.5);
        model.position.set(slot.x, -0.15, slot.z);
        _q.setFromAxisAngle(_yAxis, slot.yaw);
        model.quaternion.copyFrom(_q);
        this.root.addChild(model);

        // Find wheel meshes for spinning animation
        model.traverse((child: any) => {
          if (child.name && child.name.toLowerCase().includes('wheel')) {
            wheels.push(child);
          }
        });
      }

      this.rivals.push({
        ...cfg,
        colorKey,
        x: slot.x,
        y: -0.15,
        z: slot.z,
        yaw: slot.yaw,
        speed: 0,
        targetSpeed: cfg.topSpeed,
        waypointIndex: 0,
        lap: 1,
        lapProgress: 0,
        model,
        wheels,
        lastPacketTime: 0,
      });
    });
  }

  private initMultiplayerMesh() {
    // Instant zero-setup cross-tab broadcast (Peer mesh)
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.broadcastChannel = new BroadcastChannel('revsector_live_mesh');
        this.broadcastChannel.onmessage = (event) => {
          this.handleNetworkPacket(event.data);
        };
      }
    } catch {
      // Ignore if BroadcastChannel restricted
    }
  }

  private handleNetworkPacket(data: any) {
    if (!data || data.id === this.localPlayerId || data.circuitId !== this.circuitId) {
      return;
    }

    const now = performance.now();
    let targetRival = this.rivals.find((r) => r.id === data.id);

    // If not found, dynamically spawn this remote human car!
    if (!targetRival) {
      const colorKey = data.color || 'vehicle-truck-red';
      const source = this.sources[colorKey] || this.sources['vehicle-truck-red'];
      let model: Model3D | null = null;
      const wheels: any[] = [];

      if (source) {
        model = new Model3D(source);
        model.scale.set(0.5, 0.5, 0.5);
        model.position.set(data.x, -0.15, data.z);
        _q.setFromAxisAngle(_yAxis, data.yaw || 0);
        model.quaternion.copyFrom(_q);
        this.root.addChild(model);

        model.traverse((child: any) => {
          if (child.name && child.name.toLowerCase().includes('wheel')) {
            wheels.push(child);
          }
        });
      }

      targetRival = {
        id: data.id,
        name: data.name || 'Live Peer',
        code: (data.name ? data.name.substring(0, 3) : 'PEE').toUpperCase(),
        team: 'Live Peer Mesh',
        colorKey,
        colorHex: data.color === 'vehicle-truck-green' ? '#10b981' : data.color === 'vehicle-truck-purple' ? '#8b5cf6' : '#ef4444',
        tireCompound: 'S',
        isHuman: true,
        laneOffset: 0,
        x: data.x,
        y: -0.15,
        z: data.z,
        yaw: data.yaw || 0,
        speed: data.speed || 0,
        targetSpeed: 21.0,
        topSpeed: 21.0,
        cornerSpeed: 12.0,
        waypointIndex: 0,
        lap: data.lap || 1,
        lapProgress: data.lapProgress || 0,
        model,
        wheels,
        lastPacketTime: now,
      };
      this.rivals.push(targetRival);
    } else {
      targetRival.lastPacketTime = now;
      targetRival.x = targetRival.x * 0.35 + data.x * 0.65;
      targetRival.z = targetRival.z * 0.35 + data.z * 0.65;
      targetRival.yaw = data.yaw;
      targetRival.speed = data.speed;
      targetRival.lap = data.lap || targetRival.lap;
      targetRival.lapProgress = data.lapProgress || targetRival.lapProgress;

      if (targetRival.model) {
        targetRival.model.position.set(targetRival.x, -0.15, targetRival.z);
        _q.setFromAxisAngle(_yAxis, targetRival.yaw);
        targetRival.model.quaternion.copyFrom(_q);
      }
    }
  }

  public setCircuit(
    circuitId: string,
    waypoints: Array<{ x: number; z: number; isCorner: boolean }>
  ) {
    this.circuitId = circuitId;
    this.waypoints = waypoints;
    this.initRivals();
  }

  public setPlayerConfig(colorKey: string, playerName: string) {
    this.localPlayerColor = colorKey;
    this.localPlayerName = playerName;
  }

  public resetGrid() {
    this.initRivals();
  }

  /**
   * High-Impact Car-to-Car Crash Reaction
   * Triggers realistic deflection, momentum transfer, suspension shock, audio impact, and camera shake
   */
  public checkVehicleCollisions(vehicle: any, audio: any, camera: any) {
    if (!vehicle || !vehicle.container) return;

    const pX = vehicle.container.position.x;
    const pZ = vehicle.container.position.z;
    const COLLISION_RADIUS = 1.45;

    for (const rival of this.rivals) {
      const dx = pX - rival.x;
      const dz = pZ - rival.z;
      const dist = Math.hypot(dx, dz);

      if (dist < COLLISION_RADIUS && dist > 0.01) {
        // Car Crash Reaction!
        const penetration = COLLISION_RADIUS - dist;
        const nx = dx / dist;
        const nz = dz / dist;

        // 1. Deflect player away along impact normal
        vehicle.spherePos.x += nx * penetration * 0.65;
        vehicle.spherePos.z += nz * penetration * 0.65;
        vehicle.container.position.x = vehicle.spherePos.x;
        vehicle.container.position.z = vehicle.spherePos.z;

        // 2. Deflect rival away in opposite direction
        rival.x -= nx * penetration * 0.65;
        rival.z -= nz * penetration * 0.65;
        if (rival.model) {
          rival.model.position.set(rival.x, -0.15, rival.z);
        }

        // 3. Momentum loss from impact
        const relSpeed = Math.abs(vehicle.linearSpeed * 20 - rival.speed) + 4;
        vehicle.linearSpeed *= 0.72; // Player loses momentum
        rival.speed *= 0.70;         // Rival knocked back

        // 4. Violent chassis disturbance (pitch & roll shock)
        vehicle._bodyRoll = (vehicle._bodyRoll || 0) + (nx * 0.35);
        vehicle._bodyPitch = (vehicle._bodyPitch || 0) + 0.30;

        // 5. Rival swerve
        rival.yaw += (-nx * 0.35);

        // 6. Impact audio
        if (audio && typeof audio.playImpact === 'function') {
          audio.playImpact(Math.max(6, relSpeed));
        }

        // 7. Screen/camera shake
        if (camera && typeof camera.triggerShake === 'function') {
          camera.triggerShake(Math.min(0.8, relSpeed * 0.05 + 0.25));
        }
      }
    }
  }

  public update(
    dt: number,
    playerX: number,
    playerZ: number,
    playerYaw: number,
    playerSpeed: number,
    playerLap: number,
    playerProgress: number
  ) {
    const now = performance.now();

    // 1. Broadcast local player position (~20 Hz throttled)
    this.broadcastThrottle += dt;
    if (this.broadcastThrottle >= 0.05) {
      this.broadcastThrottle = 0;
      this.broadcastLocalState(playerX, playerZ, playerYaw, playerSpeed, playerLap, playerProgress);
    }

    if (!this.waypoints || this.waypoints.length === 0) return;

    // 2. Handle remote player timeouts
    for (let i = this.rivals.length - 1; i >= 0; i--) {
      const rival = this.rivals[i];
      if (rival.isHuman && now - rival.lastPacketTime > 4000) {
        if (!this.isPracticeMode) {
          // Despawn disconnected human: remove model and remove from array so track remains blank
          if (rival.model && rival.model.parent) {
            rival.model.parent.removeChild(rival.model);
          }
          this.rivals.splice(i, 1);
          continue;
        } else {
          // In practice mode, revert to AI bot
          rival.isHuman = false;
          rival.name = DEFAULT_RIVALS[i]?.name || rival.name;
          rival.code = DEFAULT_RIVALS[i]?.code || rival.code;
        }
      }
    }

    // 3. Update rival racecars
    for (let i = 0; i < this.rivals.length; i++) {
      const rival = this.rivals[i];

      if (rival.isHuman) {
        // Human positions are updated from packets, just spin wheels
        for (const wheel of rival.wheels) {
          wheel.rotation.x += rival.speed * dt * 2.5;
        }
        continue;
      }

      // AI Waypoint Steering & Navigation with distinct Lane Offsets (no overlapping!)
      const targetWp = this.waypoints[rival.waypointIndex];
      const nextWp = this.waypoints[(rival.waypointIndex + 1) % this.waypoints.length];

      const segX = nextWp.x - targetWp.x;
      const segZ = nextWp.z - targetWp.z;
      const segLen = Math.hypot(segX, segZ) || 1;
      const normX = -segZ / segLen;
      const normZ = segX / segLen;

      let targetX = targetWp.x + normX * rival.laneOffset;
      let targetZ = targetWp.z + normZ * rival.laneOffset;

      // Smart Overtaking: When player stops, bots DO NOT stop! They steer around and zoom past!
      const toPlayerX = playerX - rival.x;
      const toPlayerZ = playerZ - rival.z;
      const distToPlayer = Math.hypot(toPlayerX, toPlayerZ);
      const forwardDot = toPlayerX * Math.sin(rival.yaw) + toPlayerZ * Math.cos(rival.yaw);

      if (distToPlayer < 5.0 && forwardDot > 0) {
        if (playerSpeed < 0.25) {
          // Player is stopped or very slow — steer into the open lane and accelerate past!
          const lateralToPlayer = -toPlayerX * Math.cos(rival.yaw) + toPlayerZ * Math.sin(rival.yaw);
          const overtakeSide = lateralToPlayer >= 0 ? -1 : 1;
          targetX += normX * overtakeSide * 1.5;
          targetZ += normZ * overtakeSide * 1.5;
          rival.targetSpeed = rival.topSpeed;
        } else if (distToPlayer < 2.2) {
          // Player is moving forward right in front, ease off slightly to avoid rear-ending
          rival.speed *= 0.92;
        }
      }

      // Inter-Rival Distance-Keeping: prevent AI bots from clipping/overlapping each other
      for (let j = 0; j < this.rivals.length; j++) {
        if (i === j) continue;
        const other = this.rivals[j];
        const rdx = rival.x - other.x;
        const rdz = rival.z - other.z;
        const rDist = Math.hypot(rdx, rdz);

        if (rDist < 1.7 && rDist > 0.001) {
          const rnx = rdx / rDist;
          const rnz = rdz / rDist;
          const push = (1.7 - rDist) * 0.45;
          rival.x += rnx * push;
          rival.z += rnz * push;
          other.x -= rnx * push;
          other.z -= rnz * push;

          if (rival.speed > other.speed) {
            rival.speed *= 0.90;
          }
        }
      }

      const dx = targetX - rival.x;
      const dz = targetZ - rival.z;
      const distToWp = Math.hypot(targetWp.x - rival.x, targetWp.z - rival.z);

      // Target steering angle
      const targetAngle = Math.atan2(dx, dz);
      rival.yaw = angleLerp(rival.yaw, targetAngle, dt * 5.0);

      // Speed regulation: accelerate on straights, brake into turns
      if (targetWp.isCorner) {
        rival.targetSpeed = rival.cornerSpeed;
      } else {
        rival.targetSpeed = rival.topSpeed;
      }

      // Acceleration / Braking curve
      if (rival.speed < rival.targetSpeed) {
        rival.speed = Math.min(rival.targetSpeed, rival.speed + dt * 6.5);
      } else {
        rival.speed = Math.max(rival.targetSpeed, rival.speed - dt * 8.0);
      }

      // Move car
      rival.x += Math.sin(rival.yaw) * rival.speed * dt;
      rival.z += Math.cos(rival.yaw) * rival.speed * dt;

      // Update 3D model
      if (rival.model) {
        rival.model.position.set(rival.x, -0.15, rival.z);
        _q.setFromAxisAngle(_yAxis, rival.yaw);
        rival.model.quaternion.copyFrom(_q);

        // Spin wheels realistically
        for (const wheel of rival.wheels) {
          wheel.rotation.x += rival.speed * dt * 2.5;
        }
      }

      // Check waypoint progression
      if (distToWp < 4.0) {
        rival.waypointIndex = (rival.waypointIndex + 1) % this.waypoints.length;
        if (rival.waypointIndex === 0) {
          rival.lap += 1;
        }
      }

      rival.lapProgress = (rival.lap - 1) + (rival.waypointIndex / this.waypoints.length);
    }
  }

  private broadcastLocalState(
    x: number,
    z: number,
    yaw: number,
    speed: number,
    lap: number,
    progress: number,
    isInit: boolean = false
  ) {
    const packet = {
      id: this.localPlayerId,
      name: this.localPlayerName,
      color: this.localPlayerColor,
      circuitId: this.circuitId,
      x: Math.round(x * 100) / 100,
      z: Math.round(z * 100) / 100,
      yaw: Math.round(yaw * 100) / 100,
      speed: Math.round(speed * 10) / 10,
      lap,
      lapProgress: Math.round(progress * 1000) / 1000,
      isInit,
    };

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(packet);
      } catch {
        // Ignore
      }
    }
  }

  public getStandings(
    playerLap: number,
    playerProgress: number,
    playerSpeedKmh: number
  ): GridStanding[] {
    const list: Array<{
      score: number;
      name: string;
      code: string;
      team: string;
      color: string;
      tire: 'S' | 'M' | 'H';
      isPlayer: boolean;
      lap: number;
      speedKmh: number;
    }> = [
      {
        score: playerLap * 100 + playerProgress,
        name: this.localPlayerName,
        code: this.localPlayerName.substring(0, 3).toUpperCase(),
        team: 'Player Team',
        color: '#f59e0b',
        tire: 'S',
        isPlayer: true,
        lap: playerLap,
        speedKmh: Math.round(playerSpeedKmh),
      },
    ];

    for (const rival of this.rivals) {
      list.push({
        score: rival.lap * 100 + rival.lapProgress,
        name: rival.name,
        code: rival.code,
        team: rival.team,
        color: rival.colorHex,
        tire: rival.tireCompound,
        isPlayer: false,
        lap: rival.lap,
        speedKmh: Math.round(rival.speed * 3.6),
      });
    }

    // Sort descending by circuit progress
    list.sort((a, b) => b.score - a.score);

    const leaderScore = list[0]?.score || 1;

    return list.map((item, idx) => {
      let gap = 'LEADER';
      if (idx > 0) {
        const diff = Math.max(0.1, (leaderScore - item.score) * 1.8);
        gap = `+${diff.toFixed(3)}s`;
      }

      return {
        position: idx + 1,
        name: item.name,
        code: item.code,
        team: item.team,
        color: item.color,
        gap,
        tire: item.tire,
        isPlayer: item.isPlayer,
        lap: item.lap,
        speedKmh: item.speedKmh,
      };
    });
  }

  public destroy() {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {
        // Ignore
      }
      this.broadcastChannel = null;
    }
    for (const rival of this.rivals) {
      if (rival.model && rival.model.parent) {
        rival.model.parent.removeChild(rival.model);
      }
    }
    this.rivals = [];
  }
}
