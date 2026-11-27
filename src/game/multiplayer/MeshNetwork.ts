import Peer, { type DataConnection } from 'peerjs';

export interface MeshPlayerState {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  isBoosting?: boolean;
  lap: number;
  bestLap: number | null;
  pingMs: number;
  isHost: boolean;
  isSelf: boolean;
  lastSeen: number;
}

export interface ConsoleEntry {
  id: number;
  time: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

export interface MeshStateSnapshot {
  status: 'offline' | 'connecting' | 'hosting' | 'connected' | 'error';
  roomCode: string;
  isHost: boolean;
  localId: string;
  driverName: string;
  trackId: string;
  players: MeshPlayerState[];
  logs: ConsoleEntry[];
  error: string | null;
  failedRoomCode: string | null;
}

type Packet =
  | { type: 'hello'; senderId: string; name: string; color: string; lap: number; bestLap: number | null }
  | { type: 'pose'; senderId: string; x: number; y: number; z: number; yaw: number; speed: number; isBoosting?: boolean; color: string; lap: number; bestLap: number | null; name: string }
  | { type: 'room-sync'; senderId: string; trackId: string; players: Array<Omit<MeshPlayerState, 'isSelf' | 'lastSeen'>> }
  | { type: 'ping'; senderId: string; ts: number }
  | { type: 'pong'; senderId: string; ts: number }
  | { type: 'leave'; senderId: string };

const ROOM_PREFIX = 'minibattle-wifi-';
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const PEER_CONFIG = {
  debug: 0,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
    ],
  },
};

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

/**
 * Cross-tab / Localhost zero-latency message bus using standard BroadcastChannel.
 * Guarantees 100% reliable local multi-tab and split-screen testing without NAT or firewall issues.
 */
class MeshBroadcastTransport {
  private bc: BroadcastChannel | null = null;
  private onMessage: (pkt: Packet) => void;

  constructor(roomCode: string, onMessage: (pkt: Packet) => void) {
    this.onMessage = onMessage;
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      try {
        this.bc = new BroadcastChannel(`minibattle-mesh-${roomCode}`);
        this.bc.onmessage = (ev) => {
          if (ev.data && typeof ev.data === 'object' && ev.data.type) {
            this.onMessage(ev.data as Packet);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel init error:', e);
      }
    }
  }

  send(pkt: Packet) {
    try {
      this.bc?.postMessage(pkt);
    } catch {
      // ignore
    }
  }

  close() {
    try {
      this.bc?.close();
    } catch {
      // ignore
    }
    this.bc = null;
  }
}

export class MeshNetworkManager {
  private peer: Peer | null = null;
  private hostConn: DataConnection | null = null;
  private clientConns = new Map<string, DataConnection>();
  private bc: MeshBroadcastTransport | null = null;

  private players = new Map<string, MeshPlayerState>();
  private logs: ConsoleEntry[] = [];
  private logSeq = 1;

  private status: MeshStateSnapshot['status'] = 'offline';
  private roomCode = '';
  private isHost = false;
  private localId = '';
  private driverName = 'RACER-1';
  private trackId = 'level-1';
  private error: string | null = null;
  private failedRoomCode: string | null = null;

  private onStateChange?: (snap: MeshStateSnapshot) => void;
  private onTrackSync?: (trackId: string) => void;

  private pingTimer: number | null = null;
  private syncTimer: number | null = null;
  private cleanupTimer: number | null = null;
  private connectProbeTimer: number | null = null;

  private selfPose = {
    x: 3.5,
    y: 0,
    z: 5,
    yaw: 0,
    speed: 0,
    isBoosting: false,
    color: 'vehicle-truck-yellow',
    lap: 1,
    bestLap: null as number | null,
  };

  constructor(
    onStateChange?: (snap: MeshStateSnapshot) => void,
    onTrackSync?: (trackId: string) => void,
  ) {
    this.onStateChange = onStateChange;
    this.onTrackSync = onTrackSync;

    try {
      const savedName = localStorage.getItem('miniBattle.driverName');
      if (savedName) this.driverName = savedName;
      else this.driverName = `RACER-${Math.floor(100 + Math.random() * 899)}`;
    } catch {
      this.driverName = 'RACER-1';
    }

    this.addLog('info', 'Wi-Fi & Cross-Tab Mesh ready. Host a room or join a code to race live.');
  }

  private addLog(level: ConsoleEntry['level'], message: string) {
    this.logs = [
      ...this.logs.slice(-39),
      { id: this.logSeq++, time: nowTime(), level, message },
    ];
    this.emitState();
  }

  setDriverName(name: string) {
    const clean = name.trim().toUpperCase().slice(0, 14) || 'RACER-1';
    this.driverName = clean;
    try {
      localStorage.setItem('miniBattle.driverName', clean);
    } catch {
      // ignore
    }
    const self = this.players.get(this.localId);
    if (self) {
      self.name = clean;
    }
    this.emitState();
  }

  setTrackId(trackId: string) {
    this.trackId = trackId;
    if (this.isHost) {
      this.broadcastFromHost();
      this.addLog('info', `Track synced to all racers: ${trackId.toUpperCase()}`);
    }
    this.emitState();
  }

  updateLocalPose(pose: {
    x: number;
    y: number;
    z: number;
    yaw: number;
    speed: number;
    isBoosting?: boolean;
    color: string;
    lap: number;
    bestLap: number | null;
  }) {
    this.selfPose = { ...this.selfPose, ...pose };
    const self = this.players.get(this.localId);
    if (self) {
      Object.assign(self, {
        ...pose,
        name: this.driverName,
        lastSeen: Date.now(),
      });
    }

    if (this.status === 'connected') {
      const pkt: Packet = {
        type: 'pose',
        senderId: this.localId,
        ...pose,
        name: this.driverName,
      };
      if (this.hostConn?.open) {
        this.hostConn.send(pkt);
      }
      this.bc?.send(pkt);
    }
  }

  getRemotePlayers(): MeshPlayerState[] {
    const out: MeshPlayerState[] = [];
    for (const p of this.players.values()) {
      if (!p.isSelf) out.push(p);
    }
    return out;
  }

  getSnapshot(): MeshStateSnapshot {
    return {
      status: this.status,
      roomCode: this.roomCode,
      isHost: this.isHost,
      localId: this.localId,
      driverName: this.driverName,
      trackId: this.trackId,
      players: Array.from(this.players.values()),
      logs: this.logs,
      error: this.error,
      failedRoomCode: this.failedRoomCode,
    };
  }

  clearError() {
    this.error = null;
    this.failedRoomCode = null;
    if (this.status === 'error') {
      this.status = 'offline';
    }
    this.emitState(true);
  }

  private lastEmitTime = 0;
  private lastEmitKey = '';

  private emitState(force = false) {
    const now = Date.now();
    const key = `${this.status}-${this.trackId}-${this.error}-${this.players.size}`;
    if (force || key !== this.lastEmitKey || now - this.lastEmitTime >= 250) {
      this.lastEmitTime = now;
      this.lastEmitKey = key;
      this.onStateChange?.(this.getSnapshot());
    }
  }

  /**
   * Smart auto-connect: Joins if a room exists, or automatically hosts the room code.
   * Guarantees zero friction when clicking invite links or testing.
   */
  autoConnect(code: string) {
    this.joinRoom(code, true);
  }

  /**
   * Host a room with a specific or random room code.
   * If allowAutoJoin is true and another host already holds the code, automatically joins their session!
   */
  hostRoom(trackId: string, customCode?: string, allowAutoJoin = true) {
    this.disconnect(true);
    const code = (customCode || generateRoomCode()).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || generateRoomCode();
    const peerId = `${ROOM_PREFIX}${code}`;

    this.status = 'connecting';
    this.isHost = true;
    this.roomCode = code;
    this.trackId = trackId;
    this.error = null;
    this.failedRoomCode = null;
    this.localId = peerId;

    this.addLog('info', `Opening Wi-Fi & Tab Mesh Room [${code}]...`);

    // Setup local BroadcastChannel for instant same-browser / multi-tab discovery
    this.bc = new MeshBroadcastTransport(code, (pkt) => this.handleBroadcastPacket(pkt));

    const peer = new Peer(peerId, PEER_CONFIG);
    this.peer = peer;

    peer.on('open', (id) => {
      this.localId = id;
      this.status = 'hosting';
      this.players.clear();
      this.players.set(id, {
        id,
        name: this.driverName,
        ...this.selfPose,
        pingMs: 0,
        isHost: true,
        isSelf: true,
        lastSeen: Date.now(),
      });
      this.addLog('success', `Room [${code}] LIVE! Share code or link with friends.`);
      this.startTimers();
      this.broadcastFromHost();
      this.emitState(true);
    });

    peer.on('connection', (conn) => {
      this.setupHostClientConn(conn);
    });

    peer.on('error', (err: any) => {
      const isTaken = err?.type === 'unavailable-id';
      if (isTaken && allowAutoJoin) {
        this.addLog('info', `Room [${code}] host already active! Joining existing session...`);
        this.joinRoom(code, false);
        return;
      }

      const msg = isTaken
        ? `Room [${code}] is already active with another host.`
        : err?.message || 'Host network error';
      this.status = 'error';
      this.failedRoomCode = isTaken ? code : null;
      this.error = msg;
      this.addLog('error', `Host notice: ${msg}`);
      this.emitState(true);
    });
  }

  /**
   * Connect to an existing room.
   * If allowAutoHost is true and no host is active yet, automatically claims and hosts the room!
   */
  joinRoom(codeInput: string, allowAutoHost = true) {
    const code = codeInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (code.length < 3) {
      this.error = 'Enter a valid 4-character Room Code.';
      this.failedRoomCode = null;
      this.addLog('warn', this.error);
      this.emitState(true);
      return;
    }

    this.disconnect(true);
    this.status = 'connecting';
    this.isHost = false;
    this.roomCode = code;
    this.error = null;
    this.failedRoomCode = null;
    this.localId = `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    this.addLog('info', `Connecting to Room [${code}]...`);

    // Setup local BroadcastChannel for zero-latency same-machine communication
    this.bc = new MeshBroadcastTransport(code, (pkt) => this.handleBroadcastPacket(pkt));

    // Send immediate local announcement on BroadcastChannel
    this.bc.send({
      type: 'hello',
      senderId: this.localId,
      name: this.driverName,
      color: this.selfPose.color,
      lap: this.selfPose.lap,
      bestLap: this.selfPose.bestLap,
    });

    // 4.2-second probe: If no host responds and allowAutoHost is enabled, promote to host seamlessly!
    if (this.connectProbeTimer) window.clearTimeout(this.connectProbeTimer);
    this.connectProbeTimer = window.setTimeout(() => {
      if (this.status === 'connecting') {
        if (allowAutoHost) {
          this.addLog('info', `No active host for [${code}] found yet. Promoting to Room Host...`);
          this.hostRoom(this.trackId, code, true);
        } else {
          this.status = 'error';
          this.failedRoomCode = code;
          this.error = `Could not reach Room [${code}]. Host is offline.`;
          this.addLog('error', this.error);
          this.emitState(true);
        }
      }
    }, 4200);

    const peer = new Peer(PEER_CONFIG);
    this.peer = peer;

    peer.on('open', (id) => {
      this.localId = id;
      const targetId = `${ROOM_PREFIX}${code}`;
      const conn = peer.connect(targetId);
      this.hostConn = conn;

      conn.on('open', () => {
        if (this.connectProbeTimer) window.clearTimeout(this.connectProbeTimer);
        this.status = 'connected';
        this.error = null;
        this.failedRoomCode = null;
        this.addLog('success', `Connected to Host Room [${code}]!`);

        conn.send({
          type: 'hello',
          senderId: this.localId,
          name: this.driverName,
          color: this.selfPose.color,
          lap: this.selfPose.lap,
          bestLap: this.selfPose.bestLap,
        } satisfies Packet);

        this.startTimers();
        this.emitState(true);
      });

      conn.on('data', (raw: any) => {
        this.handleClientPacket(raw as Packet);
      });

      conn.on('close', () => {
        if (this.connectProbeTimer) window.clearTimeout(this.connectProbeTimer);
        this.addLog('warn', `Host left Room [${code}]. Promoting to new Host...`);
        this.hostRoom(this.trackId, code, true);
      });

      conn.on('error', (err: any) => {
        if (this.connectProbeTimer) window.clearTimeout(this.connectProbeTimer);
        if (allowAutoHost) {
          this.addLog('info', `Room [${code}] host not found. Automatically claiming room as Host...`);
          this.hostRoom(this.trackId, code, true);
        } else {
          this.status = 'error';
          this.failedRoomCode = code;
          this.error = err?.message || 'Connection failed';
          this.addLog('error', `Link error: ${this.error}`);
          this.emitState(true);
        }
      });
    });

    peer.on('error', (err: any) => {
      if (this.connectProbeTimer) window.clearTimeout(this.connectProbeTimer);
      const isUnavailable = err?.type === 'peer-unavailable';
      if (isUnavailable && allowAutoHost) {
        this.addLog('info', `No host active for [${code}]. Claiming room as Host...`);
        this.hostRoom(this.trackId, code, true);
        return;
      }

      const msg = isUnavailable
        ? `Room [${code}] host is offline or not found.`
        : err?.message || 'Peer network error';
      this.status = 'error';
      this.failedRoomCode = code;
      this.error = msg;
      this.addLog('error', msg);
      this.emitState(true);
    });
  }

  private handleBroadcastPacket(pkt: Packet) {
    if (!pkt || pkt.senderId === this.localId) return;

    if (this.isHost && this.status === 'hosting') {
      const entry = this.players.get(pkt.senderId);

      if (pkt.type === 'hello') {
        this.players.set(pkt.senderId, {
          id: pkt.senderId,
          name: pkt.name || `RACER-${pkt.senderId.slice(-3).toUpperCase()}`,
          color: pkt.color || 'vehicle-truck-red',
          x: 3.5,
          y: 0,
          z: 5,
          yaw: 0,
          speed: 0,
          isBoosting: false,
          lap: pkt.lap ?? 1,
          bestLap: pkt.bestLap ?? null,
          pingMs: 1,
          isHost: false,
          isSelf: false,
          lastSeen: Date.now(),
        });
        this.addLog('success', `Racer joined (Local Tab): ${pkt.name || pkt.senderId.slice(-4)}`);
        this.broadcastFromHost();
        this.emitState(true);
      } else if (pkt.type === 'pose' && entry) {
        entry.x = pkt.x;
        entry.y = pkt.y;
        entry.z = pkt.z;
        entry.yaw = pkt.yaw;
        entry.speed = pkt.speed;
        entry.isBoosting = pkt.isBoosting;
        entry.color = pkt.color;
        entry.lap = pkt.lap;
        entry.bestLap = pkt.bestLap;
        entry.name = pkt.name || entry.name;
        entry.lastSeen = Date.now();
      } else if (pkt.type === 'ping') {
        this.bc?.send({ type: 'pong', senderId: this.localId, ts: pkt.ts });
      } else if (pkt.type === 'leave') {
        this.players.delete(pkt.senderId);
        this.broadcastFromHost();
        this.emitState(true);
      }
    } else {
      // Client role handling Broadcast packets from Host
      if (pkt.type === 'room-sync') {
        this.handleClientPacket(pkt);
      } else if (pkt.type === 'pong') {
        const rtt = Math.max(1, Math.round(performance.now() - pkt.ts));
        const self = this.players.get(this.localId);
        if (self) self.pingMs = rtt;
      }
    }
  }

  private setupHostClientConn(conn: DataConnection) {
    conn.on('open', () => {
      this.clientConns.set(conn.peer, conn);
      this.players.set(conn.peer, {
        id: conn.peer,
        name: `DRIVER-${conn.peer.slice(-3).toUpperCase()}`,
        color: 'vehicle-truck-red',
        x: 3.5,
        y: 0,
        z: 5,
        yaw: 0,
        speed: 0,
        isBoosting: false,
        lap: 1,
        bestLap: null,
        pingMs: 15,
        isHost: false,
        isSelf: false,
        lastSeen: Date.now(),
      });
      this.addLog('success', `Racer connected: ${conn.peer.slice(-6).toUpperCase()}`);
      this.broadcastFromHost();
      this.emitState(true);
    });

    conn.on('data', (raw: any) => {
      const pkt = raw as Packet;
      const entry = this.players.get(conn.peer);
      if (!entry) return;

      if (pkt.type === 'hello') {
        entry.name = pkt.name || entry.name;
        entry.color = pkt.color || entry.color;
        entry.lap = pkt.lap ?? 1;
        entry.bestLap = pkt.bestLap ?? null;
        entry.lastSeen = Date.now();
        this.addLog('info', `Driver identified: ${entry.name}`);
        this.broadcastFromHost();
        this.emitState(true);
      } else if (pkt.type === 'pose') {
        entry.x = pkt.x;
        entry.y = pkt.y;
        entry.z = pkt.z;
        entry.yaw = pkt.yaw;
        entry.speed = pkt.speed;
        entry.isBoosting = pkt.isBoosting;
        entry.color = pkt.color;
        entry.lap = pkt.lap;
        entry.bestLap = pkt.bestLap;
        entry.name = pkt.name || entry.name;
        entry.lastSeen = Date.now();
      } else if (pkt.type === 'ping') {
        conn.send({ type: 'pong', senderId: this.localId, ts: pkt.ts } satisfies Packet);
      }
    });

    conn.on('close', () => {
      const left = this.players.get(conn.peer);
      this.clientConns.delete(conn.peer);
      this.players.delete(conn.peer);
      this.addLog('warn', `Driver left: ${left?.name || conn.peer.slice(-6)}`);
      this.broadcastFromHost();
      this.emitState(true);
    });
  }

  private handleClientPacket(pkt: Packet) {
    if (pkt.type === 'room-sync') {
      if (this.status === 'connecting') {
        if (this.connectProbeTimer) window.clearTimeout(this.connectProbeTimer);
        this.status = 'connected';
        this.error = null;
        this.failedRoomCode = null;
        this.addLog('success', `Connected to Host Room [${this.roomCode}]!`);
        this.startTimers();
      }

      if (pkt.trackId && pkt.trackId !== this.trackId) {
        this.trackId = pkt.trackId;
        this.addLog('info', `Host switched circuit to ${pkt.trackId.toUpperCase()}`);
        this.onTrackSync?.(pkt.trackId);
      }

      const nextMap = new Map<string, MeshPlayerState>();
      for (const p of pkt.players) {
        const isSelf = p.id === this.localId;
        if (isSelf) {
          nextMap.set(p.id, {
            ...p,
            ...this.selfPose,
            id: this.localId,
            name: this.driverName,
            isSelf: true,
            lastSeen: Date.now(),
          });
        } else {
          nextMap.set(p.id, {
            ...p,
            isSelf: false,
            lastSeen: Date.now(),
          });
        }
      }
      this.players = nextMap;
      this.emitState();
    } else if (pkt.type === 'pong') {
      const rtt = Math.max(1, Math.round(performance.now() - pkt.ts));
      const self = this.players.get(this.localId);
      if (self) self.pingMs = rtt;
    }
  }

  private broadcastFromHost() {
    if (!this.isHost || this.status !== 'hosting') return;
    const payload: Packet = {
      type: 'room-sync',
      senderId: this.localId,
      trackId: this.trackId,
      players: Array.from(this.players.values()).map(({ isSelf: _s, lastSeen: _l, ...rest }) => rest),
    };
    for (const conn of this.clientConns.values()) {
      if (conn.open) {
        conn.send(payload);
      }
    }
    this.bc?.send(payload);
  }

  private startTimers() {
    this.stopTimers();

    if (this.isHost) {
      this.syncTimer = window.setInterval(() => {
        this.broadcastFromHost();
      }, 50);

      // Clean up ghost peers that haven't sent poses in 6 seconds
      this.cleanupTimer = window.setInterval(() => {
        const now = Date.now();
        let changed = false;
        for (const [id, p] of this.players.entries()) {
          if (!p.isSelf && now - p.lastSeen > 6500) {
            this.players.delete(id);
            this.clientConns.delete(id);
            changed = true;
          }
        }
        if (changed) {
          this.broadcastFromHost();
          this.emitState(true);
        }
      }, 2500);
    } else {
      this.pingTimer = window.setInterval(() => {
        const pingPkt: Packet = { type: 'ping', senderId: this.localId, ts: performance.now() };
        if (this.hostConn?.open) {
          this.hostConn.send(pingPkt);
        }
        this.bc?.send(pingPkt);
      }, 1500);
    }
  }

  private stopTimers() {
    if (this.syncTimer !== null) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.cleanupTimer !== null) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    if (this.connectProbeTimer !== null) {
      clearTimeout(this.connectProbeTimer);
      this.connectProbeTimer = null;
    }
  }

  disconnect(silent = false) {
    this.stopTimers();

    if (this.localId) {
      const leavePkt: Packet = { type: 'leave', senderId: this.localId };
      if (this.hostConn?.open) {
        try { this.hostConn.send(leavePkt); } catch {}
      }
      this.bc?.send(leavePkt);
    }

    if (this.bc) {
      this.bc.close();
      this.bc = null;
    }

    if (this.hostConn) {
      try { this.hostConn.close(); } catch {}
      this.hostConn = null;
    }

    for (const conn of this.clientConns.values()) {
      try { conn.close(); } catch {}
    }
    this.clientConns.clear();

    if (this.peer) {
      try { this.peer.destroy(); } catch {}
      this.peer = null;
    }

    this.players.clear();
    this.status = 'offline';
    this.isHost = false;
    this.roomCode = '';
    this.localId = '';
    this.error = null;
    this.failedRoomCode = null;

    if (!silent) {
      this.addLog('info', 'Left multiplayer mesh room.');
    } else {
      this.emitState(true);
    }
  }
}
