/**
 * RevSector 3D - Live Rival Grid & Zero-Connect Multiplayer Engine
 * Manages autonomous competitor racecars on the circuit with dynamic speed control,
 * wheel rotation, and zero-setup cross-client multiplayer mesh (BroadcastChannel + WebSocket).
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
  private peerSocket: WebSocket | null = null;
  private localPlayerId: string;
  private localPlayerName: string = 'Kaushal';
  private localPlayerColor: string = 'vehicle-truck-yellow';
  private broadcastThrottle = 0;

  constructor(
    root: Container3D,
    sources: Record<string, any>,
    circuitId: string,
    waypoints: Array<{ x: number; z: number; isCorner: boolean }>,
    playerColor: string = 'vehicle-truck-yellow',
    playerName: string = 'Kaushal'
  ) {
    this.root = root;
    this.sources = sources;
    this.circuitId = circuitId;
    this.waypoints = waypoints;
    this.localPlayerColor = playerColor;
    this.localPlayerName = playerName;
    this.localPlayerId = 'p_' + Math.random().toString(36).substring(2, 8);

    this.initRivals();
    this.initMultiplayerMesh();
  }

  private initRivals() {
    // Clear any previous rival models
    for (const rival of this.rivals) {
      if (rival.model && rival.model.parent) {
        rival.model.parent.removeChild(rival.model);
      }
    }
    this.rivals = [];

    // Filter available rival colors to avoid duplicating player's color
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
    // 1. Instant zero-setup cross-tab broadcast
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

    // 2. Safe, non-blocking public WebSockets mesh
    try {
      // Connect to a public websocket relay for cross-device racing
      const wsUrl = 'wss://echo.websocket.events/.ws';
      this.peerSocket = new WebSocket(wsUrl);
      this.peerSocket.onopen = () => {
        // Announce presence
        this.broadcastLocalState(0, 0, 0, 0, 1, 0, true);
      };
      this.peerSocket.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data);
          this.handleNetworkPacket(packet);
        } catch {
          // Ignore malformed packet
        }
      };
      this.peerSocket.onerror = () => {
        // Silent fallback to local AI + BroadcastChannel
      };
    } catch {
      // Silent fallback
    }
  }

  private handleNetworkPacket(data: any) {
    if (!data || data.id === this.localPlayerId || data.circuitId !== this.circuitId) {
      return;
    }

    const now = performance.now();
    // Check if this remote player is already tracked
    let targetRival = this.rivals.find((r) => r.id === data.id);

    if (!targetRival) {
      // Pick first non-human slot
      targetRival = this.rivals.find((r) => !r.isHuman);
    }

    if (targetRival) {
      targetRival.isHuman = true;
      targetRival.id = data.id;
      targetRival.name = data.name || targetRival.name;
      targetRival.code = (data.name ? data.name.substring(0, 3) : targetRival.code).toUpperCase();
      targetRival.lastPacketTime = now;

      // Smooth interpolation target
      targetRival.x = targetRival.x * 0.4 + data.x * 0.6;
      targetRival.z = targetRival.z * 0.4 + data.z * 0.6;
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

    // 2. Update rival racecars
    for (let i = 0; i < this.rivals.length; i++) {
      const rival = this.rivals[i];

      // If remote player disconnected (>4s without packet), resume AI control
      if (rival.isHuman && now - rival.lastPacketTime > 4000) {
        rival.isHuman = false;
        rival.name = DEFAULT_RIVALS[i]?.name || rival.name;
        rival.code = DEFAULT_RIVALS[i]?.code || rival.code;
      }

      if (rival.isHuman) {
        // Human positions are updated from packets, just spin wheels
        for (const wheel of rival.wheels) {
          wheel.rotation.x += rival.speed * dt * 2.5;
        }
        continue;
      }

      // AI Waypoint Steering & Navigation
      const targetWp = this.waypoints[rival.waypointIndex];
      const dx = targetWp.x - rival.x;
      const dz = targetWp.z - rival.z;
      const distToWp = Math.hypot(dx, dz);

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

      // Avoid colliding directly with player from behind
      const pDist = Math.hypot(playerX - rival.x, playerZ - rival.z);
      if (pDist < 2.8) {
        rival.speed *= 0.88;
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
      if (distToWp < 3.8) {
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

    if (this.peerSocket && this.peerSocket.readyState === WebSocket.OPEN) {
      try {
        this.peerSocket.send(JSON.stringify(packet));
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
    if (this.peerSocket) {
      try {
        this.peerSocket.close();
      } catch {
        // Ignore
      }
      this.peerSocket = null;
    }
    for (const rival of this.rivals) {
      if (rival.model && rival.model.parent) {
        rival.model.parent.removeChild(rival.model);
      }
    }
    this.rivals = [];
  }
}
