/**
 * RevSector 3D - Three.js Active Rival Grid & Zero-Connect Multiplayer Engine
 * Supports Pure Live Peer Mode (blank track by default, real humans only) and
 * AI Practice Mode (3 independent sparring bots that never stack or stop when player stops).
 * Full car-to-car collision detection and restitution impulse physics.
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
  velocity: THREE.Vector3;
  yaw: number;
  speed: number;
  targetSpeed: number;
  topSpeed: number;
  cornerSpeed: number;
  lateralOffset: number; // Different lane so bots don't stack on top of each other
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

export interface CrashEvent {
  hasImpact: boolean;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  intensity: number;
}

const DEFAULT_PRACTICE_BOTS = [
  {
    id: 'bot_ver',
    name: 'Max Verstappen',
    code: 'VER',
    team: 'Red Bull Racing',
    colorHex: '#ef4444',
    tire: 'M' as const,
    topSpeed: 45.0,
    cornerSpeed: 26.0,
    lateralOffset: -1.8,
    startWpOffset: 25,
  },
  {
    id: 'bot_ham',
    name: 'Lewis Hamilton',
    code: 'HAM',
    team: 'Mercedes AMG',
    colorHex: '#10b981',
    tire: 'S' as const,
    topSpeed: 43.5,
    cornerSpeed: 25.5,
    lateralOffset: 2.2,
    startWpOffset: 55,
  },
  {
    id: 'bot_nor',
    name: 'Lando Norris',
    code: 'NOR',
    team: 'McLaren F1',
    colorHex: '#8b5cf6',
    tire: 'H' as const,
    topSpeed: 42.0,
    cornerSpeed: 26.5,
    lateralOffset: -3.5,
    startWpOffset: 85,
  },
];

export class RivalManager {
  private scene: THREE.Scene;
  private waypoints: CircuitWaypoint[];
  public isPracticeMode: boolean = false; // Default: Live Peer only (pure track!)

  private rivals: RivalDriverState[] = [];
  private broadcastChannel: BroadcastChannel | null = null;
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
    playerName: string = 'Kaushal',
    initialPracticeMode: boolean = false
  ) {
    this.scene = scene;
    this.waypoints = waypoints;
    this.circuitId = circuitId;
    this.localPlayerColor = playerColor;
    this.localPlayerName = playerName;
    this.isPracticeMode = initialPracticeMode;
    this.localPlayerId = 'p_' + Math.random().toString(36).substring(2, 8);

    this.rebuildRoster();
    this.initMultiplayerMesh();
  }

  public setPracticeMode(active: boolean) {
    this.isPracticeMode = active;
    this.rebuildRoster();
  }

  public getActiveRivalsCount(): number {
    return this.rivals.length;
  }

  public getLivePeersCount(): number {
    return this.rivals.filter((r) => r.isHuman).length;
  }

  private rebuildRoster() {
    // Remove existing meshes from scene
    for (const r of this.rivals) {
      if (r.car.root.parent) {
        r.car.root.parent.remove(r.car.root);
      }
    }
    this.rivals = [];

    // In Practice Mode: Spawn the 3 independent sparring bots
    if (this.isPracticeMode && this.waypoints.length > 0) {
      DEFAULT_PRACTICE_BOTS.forEach((cfg) => {
        const wpIdx = cfg.startWpOffset % this.waypoints.length;
        const wp = this.waypoints[wpIdx];
        const initialPos = new THREE.Vector3(
          wp.x + wp.normalX * cfg.lateralOffset,
          0,
          wp.z + wp.normalZ * cfg.lateralOffset
        );

        const car = createProceduralF1Car(cfg.colorHex, false);
        car.root.position.copy(initialPos);
        const yaw = Math.atan2(wp.tangentX, wp.tangentZ);
        car.root.rotation.set(0, yaw, 0);
        this.scene.add(car.root);

        this.rivals.push({
          ...cfg,
          isHuman: false,
          car,
          position: initialPos,
          velocity: new THREE.Vector3(0, 0, 0),
          yaw,
          speed: 28.0,
          targetSpeed: cfg.topSpeed,
          waypointIndex: wpIdx,
          lap: 1,
          lapProgress: wpIdx / this.waypoints.length,
          lastPacketTime: 0,
        });
      });
    }
  }

  private initMultiplayerMesh() {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.broadcastChannel = new BroadcastChannel('revsector_live_mesh');
        this.broadcastChannel.onmessage = (event) => {
          this.handleNetworkPacket(event.data);
        };
      }
    } catch {}
  }

  private handleNetworkPacket(data: any) {
    if (!data || data.id === this.localPlayerId || data.circuitId !== this.circuitId) return;

    const now = performance.now();
    let target = this.rivals.find((r) => r.id === data.id);

    // If new real peer joined
    if (!target) {
      const peerColor = data.color || '#ef4444';
      const car = createProceduralF1Car(peerColor, false);
      const peerPos = new THREE.Vector3(data.x, 0, data.z);
      car.root.position.copy(peerPos);
      car.root.rotation.set(0, data.yaw || 0, 0);
      this.scene.add(car.root);

      target = {
        id: data.id,
        name: data.name || 'Racer ' + data.id.substring(0, 3),
        code: (data.name ? data.name.substring(0, 3) : 'RCR').toUpperCase(),
        team: 'Live Challenger',
        colorHex: peerColor,
        tire: 'S',
        isHuman: true,
        car,
        position: peerPos,
        velocity: new THREE.Vector3(0, 0, 0),
        yaw: data.yaw || 0,
        speed: data.speed || 0,
        targetSpeed: 45.0,
        topSpeed: 50.0,
        cornerSpeed: 25.0,
        lateralOffset: 0,
        waypointIndex: 0,
        lap: data.lap || 1,
        lapProgress: data.lapProgress || 0,
        lastPacketTime: now,
      };

      this.rivals.push(target);
    } else {
      // Update existing peer
      target.lastPacketTime = now;
      target.position.x = target.position.x * 0.35 + data.x * 0.65;
      target.position.z = target.position.z * 0.35 + data.z * 0.65;
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
    this.rebuildRoster();
  }

  public setPlayerConfig(colorHex: string, name: string) {
    this.localPlayerColor = colorHex;
    this.localPlayerName = name;
  }

  public resetGrid() {
    this.rebuildRoster();
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

    // Prune stale peer connections (>4.5s without packet)
    for (let i = this.rivals.length - 1; i >= 0; i--) {
      const r = this.rivals[i];
      if (r.isHuman && now - r.lastPacketTime > 4500) {
        if (r.car.root.parent) {
          r.car.root.parent.remove(r.car.root);
        }
        this.rivals.splice(i, 1);
      }
    }

    if (!this.waypoints || this.waypoints.length === 0) return;

    // Update active practice bots or live peers
    for (let i = 0; i < this.rivals.length; i++) {
      const rival = this.rivals[i];

      if (rival.isHuman) {
        rival.car.update(dt, rival.speed, 0, false, false, isNight);
        continue;
      }

      // Independent AI Practice Bot Steering (Never stops just because player stops!)
      const targetWp = this.waypoints[rival.waypointIndex];
      const targetX = targetWp.x + targetWp.normalX * rival.lateralOffset;
      const targetZ = targetWp.z + targetWp.normalZ * rival.lateralOffset;

      const dx = targetX - rival.position.x;
      const dz = targetZ - rival.position.z;
      const dist = Math.hypot(dx, dz);

      const targetAngle = Math.atan2(dx, dz);
      let angleDiff = (targetAngle - rival.yaw) % (Math.PI * 2);
      if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      rival.yaw += angleDiff * dt * 5.0;

      // Independent Speed Control
      if (targetWp.isCorner) {
        rival.targetSpeed = rival.cornerSpeed;
      } else {
        rival.targetSpeed = rival.topSpeed;
      }

      if (rival.speed < rival.targetSpeed) {
        rival.speed = Math.min(rival.targetSpeed, rival.speed + dt * 16.0);
      } else {
        rival.speed = Math.max(rival.targetSpeed, rival.speed - dt * 20.0);
      }

      // Position Integration
      rival.position.x += Math.sin(rival.yaw) * rival.speed * dt;
      rival.position.z += Math.cos(rival.yaw) * rival.speed * dt;

      rival.car.root.position.copy(rival.position);
      rival.car.root.rotation.set(0, rival.yaw, 0);

      const wheelSteer = -angleDiff * 0.45;
      rival.car.update(dt, rival.speed, wheelSteer, rival.speed < rival.targetSpeed - 2.0, false, isNight);

      // Advance waypoint
      if (dist < 6.0) {
        rival.waypointIndex = (rival.waypointIndex + 1) % this.waypoints.length;
        if (rival.waypointIndex === 0) {
          rival.lap += 1;
        }
      }

      rival.lapProgress = (rival.lap - 1) + (rival.waypointIndex / this.waypoints.length);
    }
  }

  /**
   * Real Car-to-Car Crash Physics
   * Detects physical collision between player and any active peer or practice bot.
   * Calculates restitution bounce, push-apart impulse, and returns crash event.
   */
  public checkCarCollisions(
    playerPos: THREE.Vector3,
    playerVel: THREE.Vector3
  ): CrashEvent {
    const CAR_RADIUS = 1.35; // Car collision bounding circle
    const MIN_DIST = CAR_RADIUS * 2.0; // 2.7m distance threshold

    for (const rival of this.rivals) {
      const dx = playerPos.x - rival.position.x;
      const dz = playerPos.z - rival.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist < MIN_DIST && dist > 0.001) {
        // Collision detected!
        const normal = new THREE.Vector3(dx / dist, 0, dz / dist);
        const overlap = MIN_DIST - dist;

        // 1. Separate cars so they never overlap
        playerPos.addScaledVector(normal, overlap * 0.6);
        rival.position.addScaledVector(normal, -overlap * 0.4);
        rival.car.root.position.copy(rival.position);

        // 2. Physical Momentum & Restitution Impulse
        const relSpeed = playerVel.length() + rival.speed;
        const impulseMag = Math.max(8.0, relSpeed * 0.4);

        playerVel.addScaledVector(normal, impulseMag);
        if (!rival.isHuman) {
          rival.speed *= 0.75;
          rival.yaw += (Math.random() - 0.5) * 0.35;
        }

        const crashPoint = new THREE.Vector3(
          (playerPos.x + rival.position.x) / 2,
          0.35,
          (playerPos.z + rival.position.z) / 2
        );

        return {
          hasImpact: true,
          point: crashPoint,
          normal,
          intensity: Math.min(3.5, relSpeed / 8.0),
        };
      }
    }

    return {
      hasImpact: false,
      point: new THREE.Vector3(),
      normal: new THREE.Vector3(0, 1, 0),
      intensity: 0,
    };
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
    for (const r of this.rivals) {
      if (r.car.root.parent) {
        r.car.root.parent.remove(r.car.root);
      }
    }
    this.rivals = [];
  }
}
