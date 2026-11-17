/**
 * RevSector 3D - Three.js Active Rival Grid & Zero-Connect Multiplayer Engine
 * Manages 3 competitor racecars in the scene with waypoint AI, wheel spinning,
 * live overtake logic, and zero-setup peer sync (BroadcastChannel + WebSocket).
 * Engineered by Kaushal.
 */

import * as THREE from 'three';
import { createProceduralF1Car, type CarInstance } from './ProceduralCar';
import { type CircuitWaypoint } from './TrackGenerator';

export interface RivalDriverState {
  id: string;
  name: string;
  code: string;
  team: string;
  colorHex: string;
  tire: 'S' | 'M' | 'H';
  isHuman: boolean;
  car: CarInstance;
  position: THREE.Vector3;
  yaw: number;
  speed: number;
  targetSpeed: number;
  topSpeed: number;
  cornerSpeed: number;
  waypointIndex: number;
  lap: number;
  lapProgress: number;
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

const DEFAULT_RIVAL_CONFIGS = [
  {
    id: 'rival_ver',
    name: 'Max Verstappen',
    code: 'VER',
    team: 'Red Bull Racing',
    colorHex: '#ef4444',
    tire: 'M' as const,
    topSpeed: 35.0,
    cornerSpeed: 21.0,
  },
  {
    id: 'rival_ham',
    name: 'Lewis Hamilton',
    code: 'HAM',
    team: 'Mercedes AMG',
    colorHex: '#10b981',
    tire: 'S' as const,
    topSpeed: 34.2,
    cornerSpeed: 20.5,
  },
  {
    id: 'rival_nor',
    name: 'Lando Norris',
    code: 'NOR',
    team: 'McLaren F1',
    colorHex: '#8b5cf6',
    tire: 'H' as const,
    topSpeed: 33.5,
    cornerSpeed: 21.2,
  },
];

const GRID_SLOTS = [
  new THREE.Vector3(4.6, 0, 7.6),   // P2
  new THREE.Vector3(2.8, 0, 10.0),  // P3
  new THREE.Vector3(4.6, 0, 12.4),  // P4
];

export class RivalManager {
  private scene: THREE.Scene;
  private waypoints: CircuitWaypoint[];
  private rivals: RivalDriverState[] = [];
  private broadcastChannel: BroadcastChannel | null = null;
  private peerSocket: WebSocket | null = null;
  private localPlayerId: string;
  private localPlayerName: string = 'Kaushal';
  private localPlayerColor: string = '#f59e0b';
  private circuitId: string = 'monza';
  private broadcastThrottle: number = 0;

  constructor(
    scene: THREE.Scene,
    waypoints: CircuitWaypoint[],
    circuitId: string = 'monza',
    playerColor: string = '#f59e0b',
    playerName: string = 'Kaushal'
  ) {
    this.scene = scene;
    this.waypoints = waypoints;
    this.circuitId = circuitId;
    this.localPlayerColor = playerColor;
    this.localPlayerName = playerName;
    this.localPlayerId = 'p_' + Math.random().toString(36).substring(2, 8);

    this.initRivals();
    this.initMultiplayerMesh();
  }

  private initRivals() {
    // Clear existing
    for (const r of this.rivals) {
      if (r.car.root.parent) {
        r.car.root.parent.remove(r.car.root);
      }
    }
    this.rivals = [];

    const availableColors = ['#ef4444', '#10b981', '#8b5cf6', '#f59e0b']
      .filter((c) => c !== this.localPlayerColor);

    DEFAULT_RIVAL_CONFIGS.forEach((cfg, idx) => {
      const slot = GRID_SLOTS[idx % GRID_SLOTS.length].clone();
      const color = availableColors[idx % availableColors.length] || cfg.colorHex;
      const car = createProceduralF1Car(color, false);
      car.root.position.copy(slot);
      this.scene.add(car.root);

      this.rivals.push({
        ...cfg,
        colorHex: color,
        isHuman: false,
        car,
        position: slot,
        yaw: 0,
        speed: 0,
        targetSpeed: cfg.topSpeed,
        waypointIndex: 0,
        lap: 1,
        lapProgress: 0,
        lastPacketTime: 0,
      });
    });
  }

  private initMultiplayerMesh() {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.broadcastChannel = new BroadcastChannel('revsector_live_mesh');
        this.broadcastChannel.onmessage = (event) => {
          this.handleNetworkPacket(event.data);
        };
      }
    } catch {
      // Ignore
    }

    try {
      const wsUrl = 'wss://echo.websocket.events/.ws';
      this.peerSocket = new WebSocket(wsUrl);
      this.peerSocket.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data);
          this.handleNetworkPacket(packet);
        } catch {}
      };
    } catch {}
  }

  private handleNetworkPacket(data: any) {
    if (!data || data.id === this.localPlayerId || data.circuitId !== this.circuitId) return;

    const now = performance.now();
    let target = this.rivals.find((r) => r.id === data.id);
    if (!target) {
      target = this.rivals.find((r) => !r.isHuman);
    }

    if (target) {
      target.isHuman = true;
      target.id = data.id;
      target.name = data.name || target.name;
      target.code = (data.name ? data.name.substring(0, 3) : target.code).toUpperCase();
      target.lastPacketTime = now;

      // Smooth interpolation
      target.position.x = target.position.x * 0.4 + data.x * 0.6;
      target.position.z = target.position.z * 0.4 + data.z * 0.6;
      target.yaw = data.yaw;
      target.speed = data.speed;
      target.lap = data.lap || target.lap;
      target.lapProgress = data.lapProgress || target.lapProgress;

      target.car.root.position.copy(target.position);
      target.car.root.rotation.set(0, target.yaw, 0);
    }
  }

  public setWaypoints(waypoints: CircuitWaypoint[], circuitId: string) {
    this.waypoints = waypoints;
    this.circuitId = circuitId;
    this.initRivals();
  }

  public setPlayerConfig(colorHex: string, name: string) {
    this.localPlayerColor = colorHex;
    this.localPlayerName = name;
  }

  public resetGrid() {
    this.initRivals();
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    playerYaw: number,
    playerSpeed: number,
    playerLap: number,
    playerProgress: number,
    isNight: boolean
  ) {
    const now = performance.now();

    // Broadcast local player at ~20 Hz
    this.broadcastThrottle += dt;
    if (this.broadcastThrottle >= 0.05) {
      this.broadcastThrottle = 0;
      this.broadcastLocalState(playerPos.x, playerPos.z, playerYaw, playerSpeed, playerLap, playerProgress);
    }

    if (!this.waypoints || this.waypoints.length === 0) return;

    for (let i = 0; i < this.rivals.length; i++) {
      const rival = this.rivals[i];

      // Disconnect timeout (>4s)
      if (rival.isHuman && now - rival.lastPacketTime > 4000) {
        rival.isHuman = false;
        rival.name = DEFAULT_RIVAL_CONFIGS[i]?.name || rival.name;
        rival.code = DEFAULT_RIVAL_CONFIGS[i]?.code || rival.code;
      }

      if (rival.isHuman) {
        rival.car.update(dt, rival.speed, 0, false, false, isNight);
        continue;
      }

      // AI Waypoint Navigation
      const targetWp = this.waypoints[rival.waypointIndex];
      const dx = targetWp.x - rival.position.x;
      const dz = targetWp.z - rival.position.z;
      const dist = Math.hypot(dx, dz);

      const targetAngle = Math.atan2(dx, dz);
      let angleDiff = (targetAngle - rival.yaw) % (Math.PI * 2);
      if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      rival.yaw += angleDiff * dt * 5.5;

      // Speed regulation
      if (targetWp.isCorner) {
        rival.targetSpeed = rival.cornerSpeed;
      } else {
        rival.targetSpeed = rival.topSpeed;
      }

      // Acceleration / Braking
      if (rival.speed < rival.targetSpeed) {
        rival.speed = Math.min(rival.targetSpeed, rival.speed + dt * 14.0);
      } else {
        rival.speed = Math.max(rival.targetSpeed, rival.speed - dt * 18.0);
      }

      // Player proximity avoidance
      const distToPlayer = rival.position.distanceTo(playerPos);
      if (distToPlayer < 3.2) {
        rival.speed *= 0.88;
      }

      // Advance Position
      rival.position.x += Math.sin(rival.yaw) * rival.speed * dt;
      rival.position.z += Math.cos(rival.yaw) * rival.speed * dt;

      rival.car.root.position.copy(rival.position);
      rival.car.root.rotation.set(0, rival.yaw, 0);

      const wheelSteer = -angleDiff * 0.4;
      rival.car.update(dt, rival.speed, wheelSteer, rival.speed < rival.targetSpeed - 2.0, false, isNight);

      // Advance waypoint
      if (dist < 4.2) {
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
    progress: number
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
    };

    if (this.broadcastChannel) {
      try { this.broadcastChannel.postMessage(packet); } catch {}
    }
    if (this.peerSocket && this.peerSocket.readyState === WebSocket.OPEN) {
      try { this.peerSocket.send(JSON.stringify(packet)); } catch {}
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
        color: this.localPlayerColor,
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
        tire: rival.tire,
        isPlayer: false,
        lap: rival.lap,
        speedKmh: Math.round(rival.speed * 3.6),
      });
    }

    list.sort((a, b) => b.score - a.score);

    const leaderScore = list[0]?.score || 1;

    return list.map((item, idx) => {
      let gap = 'LEADER';
      if (idx > 0) {
        const diff = Math.max(0.12, (leaderScore - item.score) * 1.6);
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
      try { this.broadcastChannel.close(); } catch {}
      this.broadcastChannel = null;
    }
    if (this.peerSocket) {
      try { this.peerSocket.close(); } catch {}
      this.peerSocket = null;
    }
    for (const r of this.rivals) {
      if (r.car.root.parent) {
        r.car.root.parent.remove(r.car.root);
      }
    }
    this.rivals = [];
  }
}
