/**
 * Starter Kit Racing 3D - Same-Wi-Fi Mesh Multiplayer Engine
 * Zero-config peer-to-peer multiplayer mesh utilizing BroadcastChannel (local tabs)
 * and PeerJS WebRTC DataChannels (phones, laptops, and tablets on same Wi-Fi).
 * Engineered by Kaushal.
 */

import { Container3D, Model3D, Quaternion, Vector3 } from '@pixi/3d';
import Peer, { type DataConnection } from 'peerjs';

export interface RemotePlayerPacket {
  type: 'state' | 'join' | 'leave' | 'ping';
  id: string;
  name: string;
  colorKey: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  lap: number;
  lapTime: number;
  bestTime: number | null;
  timestamp: number;
}

export interface RemotePlayerRacer {
  id: string;
  name: string;
  colorKey: string;
  colorHex: string;
  container: Container3D;
  model: Model3D | null;
  wheels: any[];
  wheelSpin: number;
  targetPos: Vector3;
  targetYaw: number;
  speed: number;
  lap: number;
  lapTime: number;
  bestTime: number | null;
  lastPacketTime: number;
  ping: number;
}

export interface PeerRacerInfo {
  id: string;
  name: string;
  colorKey: string;
  colorHex: string;
  isLocal: boolean;
  lap: number;
  lapTime: number;
  bestTime: number | null;
  speedKmh: number;
  ping: number;
}

const COLOR_MAP: Record<string, string> = {
  'vehicle-truck-yellow': '#facc15',
  'vehicle-truck-red': '#ef4444',
  'vehicle-truck-green': '#22c55e',
  'vehicle-truck-purple': '#a855f7',
};

const _q = new Quaternion();
const _up = new Vector3(0, 1, 0);

function lerpAngle(a: number, b: number, t: number): number {
  let diff = (b - a) % (Math.PI * 2);
  if (diff < -Math.PI) diff += Math.PI * 2;
  if (diff > Math.PI) diff -= Math.PI * 2;
  return a + diff * t;
}

export class MultiplayerMesh {
  public localId: string;
  public localName: string;
  public localColorKey: string;
  public roomCode: string;

  private sceneRoot: Container3D;
  private sources: Record<string, any>;
  private broadcastChannel: BroadcastChannel | null = null;
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private remoteRacers: Map<string, RemotePlayerRacer> = new Map();

  private isHost = false;
  private isDestroyed = false;
  private broadcastTimer = 0;
  public onPeersUpdated?: (peers: PeerRacerInfo[]) => void;

  constructor(
    sceneRoot: Container3D,
    sources: Record<string, any>,
    initialName = 'Kaushal',
    initialColorKey = 'vehicle-truck-yellow',
    initialRoom = 'WIFI-MESH'
  ) {
    this.sceneRoot = sceneRoot;
    this.sources = sources;
    this.localId = 'racer_' + Math.random().toString(36).substring(2, 7);
    this.localName = initialName;
    this.localColorKey = initialColorKey;
    this.roomCode = initialRoom.toUpperCase();

    this.initBroadcastChannel();
    this.initPeerMesh();
  }

  public setDriverName(name: string) {
    this.localName = name || 'Driver';
    this.notifyPeers();
  }

  public setVehicleColor(colorKey: string) {
    this.localColorKey = colorKey;
    this.notifyPeers();
  }

  public setRoomCode(newRoom: string) {
    const cleanRoom = (newRoom || 'WIFI-MESH').trim().toUpperCase();
    if (cleanRoom === this.roomCode) return;
    this.roomCode = cleanRoom;
    this.cleanupPeer();
    this.initPeerMesh();
  }

  public getConnectedCount(): number {
    return 1 + this.remoteRacers.size;
  }

  public getPeersList(localLap = 1, localLapTime = 0, localBest: number | null = null, localSpeed = 0): PeerRacerInfo[] {
    const list: PeerRacerInfo[] = [
      {
        id: this.localId,
        name: this.localName,
        colorKey: this.localColorKey,
        colorHex: COLOR_MAP[this.localColorKey] || '#facc15',
        isLocal: true,
        lap: localLap,
        lapTime: localLapTime,
        bestTime: localBest,
        speedKmh: Math.round(localSpeed * 75),
        ping: 0,
      },
    ];

    for (const remote of this.remoteRacers.values()) {
      list.push({
        id: remote.id,
        name: remote.name,
        colorKey: remote.colorKey,
        colorHex: remote.colorHex,
        isLocal: false,
        lap: remote.lap,
        lapTime: remote.lapTime,
        bestTime: remote.bestTime,
        speedKmh: Math.round(remote.speed * 75),
        ping: remote.ping,
      });
    }

    return list;
  }

  /* -------------------------------------------------------------
   * 1. BroadcastChannel (Same-Device / Cross-Tab Ultra-Low Latency)
   * ------------------------------------------------------------- */
  private initBroadcastChannel() {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.broadcastChannel = new BroadcastChannel(`skr3d_mesh_${this.roomCode}`);
        this.broadcastChannel.onmessage = (event) => {
          this.handleIncomingPacket(event.data);
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported or blocked:', e);
    }
  }

  /* -------------------------------------------------------------
   * 2. PeerJS WebRTC P2P Mesh (Cross-Device on Same Wi-Fi)
   * ------------------------------------------------------------- */
  private initPeerMesh() {
    if (this.isDestroyed) return;

    try {
      // Clean, normalized room identifier
      const cleanRoom = this.roomCode.toLowerCase().replace(/[^a-z0-9]/g, '');
      const hostId = `skr3d-${cleanRoom}-host`;
      const clientPeerId = `skr3d-${cleanRoom}-${this.localId}`;

      // First attempt: try connecting as a client to the room's host peer
      this.peer = new Peer(clientPeerId, {
        debug: 0,
      });

      this.peer.on('open', () => {
        if (this.isDestroyed) return;
        this.connectToHost(hostId);
      });

      this.peer.on('connection', (conn) => {
        this.setupConnection(conn);
      });

      this.peer.on('error', (err: any) => {
        if (err.type === 'unavailable-id') {
          // If ID exists, regenerate a random peer ID
          this.peer?.destroy();
          this.peer = new Peer({ debug: 0 });
          this.peer.on('open', () => this.connectToHost(hostId));
          this.peer.on('connection', (c) => this.setupConnection(c));
        } else if (err.type === 'peer-unavailable') {
          // No host in this room yet — become the room host!
          this.becomeHost(hostId);
        }
      });
    } catch (err) {
      console.warn('WebRTC PeerMesh initialization skipped:', err);
    }
  }

  private connectToHost(hostId: string) {
    if (!this.peer || this.peer.destroyed) return;
    const conn = this.peer.connect(hostId, { reliable: false });
    this.setupConnection(conn);
  }

  private becomeHost(hostId: string) {
    if (this.isDestroyed) return;
    this.cleanupPeer();

    try {
      this.peer = new Peer(hostId, { debug: 0 });
      this.isHost = true;

      this.peer.on('open', () => {
        // Host active for room
      });

      this.peer.on('connection', (conn) => {
        this.setupConnection(conn);
      });

      this.peer.on('error', () => {
        // If conflict, revert to client mode with fallback random ID
        this.isHost = false;
        this.cleanupPeer();
        this.peer = new Peer({ debug: 0 });
        this.peer.on('open', () => this.connectToHost(hostId));
        this.peer.on('connection', (c) => this.setupConnection(c));
      });
    } catch {}
  }

  private setupConnection(conn: DataConnection) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      // Greet newly connected peer
      const joinPacket: RemotePlayerPacket = {
        type: 'join',
        id: this.localId,
        name: this.localName,
        colorKey: this.localColorKey,
        x: 3.5,
        y: 0.5,
        z: 5.0,
        yaw: 0,
        speed: 0,
        lap: 1,
        lapTime: 0,
        bestTime: null,
        timestamp: performance.now(),
      };
      try {
        conn.send(joinPacket);
      } catch {}
      this.notifyPeers();
    });

    conn.on('data', (data: any) => {
      this.handleIncomingPacket(data);
      // If host, relay packet to all other connected peers (star-mesh topology)
      if (this.isHost && data && typeof data === 'object') {
        for (const [peerId, otherConn] of this.connections.entries()) {
          if (peerId !== conn.peer && otherConn.open) {
            try {
              otherConn.send(data);
            } catch {}
          }
        }
      }
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.notifyPeers();
    });

    conn.on('error', () => {
      this.connections.delete(conn.peer);
    });
  }

  /* -------------------------------------------------------------
   * 3. Packet Transmission & Reception
   * ------------------------------------------------------------- */
  public broadcastLocalState(
    pos: Vector3,
    yaw: number,
    speed: number,
    lap: number,
    lapTime: number,
    bestTime: number | null
  ) {
    const packet: RemotePlayerPacket = {
      type: 'state',
      id: this.localId,
      name: this.localName,
      colorKey: this.localColorKey,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      yaw,
      speed,
      lap,
      lapTime,
      bestTime,
      timestamp: performance.now(),
    };

    // 1. BroadcastChannel (local tabs)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(packet);
      } catch {}
    }

    // 2. WebRTC P2P DataChannels (Wi-Fi peers)
    for (const conn of this.connections.values()) {
      if (conn.open) {
        try {
          conn.send(packet);
        } catch {}
      }
    }
  }

  private handleIncomingPacket(data: any) {
    if (!data || typeof data !== 'object') return;
    const packet = data as RemotePlayerPacket;
    if (packet.id === this.localId) return;

    const now = performance.now();
    let racer = this.remoteRacers.get(packet.id);

    if (!racer) {
      // Spawn new remote player truck in PixiJS 3D scene
      racer = this.spawnRemoteTruck(packet);
      this.remoteRacers.set(packet.id, racer);
      this.notifyPeers();
    }

    // Update remote racer metadata
    racer.name = packet.name || racer.name;
    racer.lastPacketTime = now;
    racer.targetPos.set(packet.x, packet.y - 0.5, packet.z);
    racer.targetYaw = packet.yaw;
    racer.speed = packet.speed || 0;
    racer.lap = packet.lap || 1;
    racer.lapTime = packet.lapTime || 0;
    racer.bestTime = packet.bestTime ?? racer.bestTime;
    if (packet.timestamp) {
      racer.ping = Math.max(1, Math.min(250, Math.round(now - packet.timestamp)));
    }

    // If remote player switched their truck color, reload model
    if (packet.colorKey && packet.colorKey !== racer.colorKey && this.sources[packet.colorKey]) {
      this.updateRemoteTruckColor(racer, packet.colorKey);
    }
  }

  private spawnRemoteTruck(packet: RemotePlayerPacket): RemotePlayerRacer {
    const container = new Container3D();
    const colorKey = packet.colorKey || 'vehicle-truck-red';
    const source = this.sources[colorKey] || this.sources['vehicle-truck-red'];

    let model: Model3D | null = null;
    const wheels: any[] = [];

    if (source) {
      model = new Model3D(source);
      model.scale.set(0.5, 0.5, 0.5);
      container.addChild(model);

      const wheelFL = model.getChildByLabel('wheel-front-left', true);
      const wheelFR = model.getChildByLabel('wheel-front-right', true);
      const wheelBL = model.getChildByLabel('wheel-back-left', true);
      const wheelBR = model.getChildByLabel('wheel-back-right', true);
      if (wheelFL) wheels.push(wheelFL);
      if (wheelFR) wheels.push(wheelFR);
      if (wheelBL) wheels.push(wheelBL);
      if (wheelBR) wheels.push(wheelBR);
    }

    container.position.set(packet.x, packet.y - 0.5, packet.z);
    _q.setFromAxisAngle(_up, packet.yaw || 0);
    container.quaternion.copyFrom(_q);

    this.sceneRoot.addChild(container);

    return {
      id: packet.id,
      name: packet.name || 'Remote Racer',
      colorKey,
      colorHex: COLOR_MAP[colorKey] || '#ef4444',
      container,
      model,
      wheels,
      wheelSpin: 0,
      targetPos: new Vector3(packet.x, packet.y - 0.5, packet.z),
      targetYaw: packet.yaw || 0,
      speed: packet.speed || 0,
      lap: packet.lap || 1,
      lapTime: packet.lapTime || 0,
      bestTime: packet.bestTime ?? null,
      lastPacketTime: performance.now(),
      ping: 15,
    };
  }

  private updateRemoteTruckColor(racer: RemotePlayerRacer, newColorKey: string) {
    const source = this.sources[newColorKey];
    if (!source || !racer.container) return;

    if (racer.model) {
      racer.container.removeChild(racer.model);
    }
    racer.wheels = [];

    const newModel = new Model3D(source);
    newModel.scale.set(0.5, 0.5, 0.5);
    racer.container.addChild(newModel);
    racer.model = newModel;
    racer.colorKey = newColorKey;
    racer.colorHex = COLOR_MAP[newColorKey] || '#ef4444';

    const wheelFL = newModel.getChildByLabel('wheel-front-left', true);
    const wheelFR = newModel.getChildByLabel('wheel-front-right', true);
    const wheelBL = newModel.getChildByLabel('wheel-back-left', true);
    const wheelBR = newModel.getChildByLabel('wheel-back-right', true);
    if (wheelFL) racer.wheels.push(wheelFL);
    if (wheelFR) racer.wheels.push(wheelFR);
    if (wheelBL) racer.wheels.push(wheelBL);
    if (wheelBR) racer.wheels.push(wheelBR);
  }

  /* -------------------------------------------------------------
   * 4. Per-Frame Animation & Interpolation
   * ------------------------------------------------------------- */
  public update(dt: number) {
    const now = performance.now();

    // Broadcast position at ~25Hz
    this.broadcastTimer += dt;
    if (this.broadcastTimer >= 0.04) {
      this.broadcastTimer = 0;
      // Triggers from caller with vehicle state
    }

    // Interpolate remote trucks
    const staleTimeout = 5000;
    const toRemove: string[] = [];

    for (const [id, racer] of this.remoteRacers.entries()) {
      if (now - racer.lastPacketTime > staleTimeout) {
        toRemove.push(id);
        continue;
      }

      // Smooth position interpolation
      const t = Math.min(1.0, dt * 14);
      racer.container.position.x += (racer.targetPos.x - racer.container.position.x) * t;
      racer.container.position.y += (racer.targetPos.y - racer.container.position.y) * t;
      racer.container.position.z += (racer.targetPos.z - racer.container.position.z) * t;

      // Smooth heading (yaw) interpolation
      const currentYaw = Math.atan2(
        2 * (racer.container.quaternion.w * racer.container.quaternion.y),
        1 - 2 * (racer.container.quaternion.y * racer.container.quaternion.y)
      );
      const newYaw = lerpAngle(currentYaw, racer.targetYaw, t);
      _q.setFromAxisAngle(_up, newYaw);
      racer.container.quaternion.copyFrom(_q);

      // Spin wheels
      if (racer.wheels.length > 0 && Math.abs(racer.speed) > 0.05) {
        racer.wheelSpin += racer.speed * dt * 25;
        const spinQuat = new Quaternion();
        spinQuat.setFromAxisAngle(new Vector3(1, 0, 0), racer.wheelSpin);
        for (const w of racer.wheels) {
          w.quaternion.copyFrom(spinQuat);
        }
      }
    }

    // Clean up disconnected peers
    for (const id of toRemove) {
      const racer = this.remoteRacers.get(id);
      if (racer) {
        this.sceneRoot.removeChild(racer.container);
        this.remoteRacers.delete(id);
      }
    }

    if (toRemove.length > 0) {
      this.notifyPeers();
    }
  }

  private notifyPeers() {
    this.onPeersUpdated?.(this.getPeersList());
  }

  private cleanupPeer() {
    for (const conn of this.connections.values()) {
      try {
        conn.close();
      } catch {}
    }
    this.connections.clear();

    if (this.peer && !this.peer.destroyed) {
      try {
        this.peer.destroy();
      } catch {}
    }
    this.peer = null;
    this.isHost = false;
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {}
      this.broadcastChannel = null;
    }
    this.cleanupPeer();

    for (const racer of this.remoteRacers.values()) {
      this.sceneRoot.removeChild(racer.container);
    }
    this.remoteRacers.clear();
  }
}
