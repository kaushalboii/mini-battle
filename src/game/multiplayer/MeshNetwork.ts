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
}

type Packet =
  | { type: 'hello'; name: string; color: string; lap: number; bestLap: number | null }
  | { type: 'pose'; x: number; y: number; z: number; yaw: number; speed: number; color: string; lap: number; bestLap: number | null; name: string }
  | { type: 'room-sync'; trackId: string; players: Array<Omit<MeshPlayerState, 'isSelf' | 'lastSeen'>> }
  | { type: 'ping'; ts: number }
  | { type: 'pong'; ts: number };

const ROOM_PREFIX = 'minibattle-wifi-';
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

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

export class MeshNetworkManager {
  private peer: Peer | null = null;
  private hostConn: DataConnection | null = null;
  private clientConns = new Map<string, DataConnection>();
  private players = new Map<string, MeshPlayerState>();
  private logs: ConsoleEntry[] = [];
  private logSeq = 1;

  private status: MeshStateSnapshot['status'] = 'offline';
  private roomCode = '';
  private isHost = false;
  private localId = '';
  private driverName = 'RACER-1';
  private trackId = 'classic';
  private error: string | null = null;

  private onStateChange?: (snap: MeshStateSnapshot) => void;
  private onTrackSync?: (trackId: string) => void;

  private pingTimer: number | null = null;
  private syncTimer: number | null = null;

  private selfPose = {
    x: 3.5,
    y: 0,
    z: 5,
    yaw: 0,
    speed: 0,
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

    this.addLog('info', 'Mesh network standby. Share a Room Code on the same Wi-Fi to race live.');
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
      this.addLog('info', `Track synced to all peers: ${trackId.toUpperCase()}`);
    }
    this.emitState();
  }

  updateLocalPose(pose: {
    x: number;
    y: number;
    z: number;
    yaw: number;
    speed: number;
    color: string;
    lap: number;
    bestLap: number | null;
  }) {
    this.selfPose = pose;
    const self = this.players.get(this.localId);
    if (self) {
      Object.assign(self, {
        ...pose,
        name: this.driverName,
        lastSeen: Date.now(),
      });
    }

    if (this.status === 'connected' && this.hostConn?.open) {
      this.hostConn.send({
        type: 'pose',
        ...pose,
        name: this.driverName,
      } satisfies Packet);
    } else if (this.status === 'hosting') {
      // Host broadcasts aggregated snapshot at 20Hz via syncTimer,
      // or immediately if called slowly. Kept lightweight here.
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
    };
  }

  private emitState() {
    this.onStateChange?.(this.getSnapshot());
  }

  hostRoom(trackId: string, customCode?: string) {
    this.disconnect(true);
    const code = (customCode || generateRoomCode()).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || generateRoomCode();
    const peerId = `${ROOM_PREFIX}${code}`;

    this.status = 'connecting';
    this.isHost = true;
    this.roomCode = code;
    this.trackId = trackId;
    this.error = null;
    this.addLog('info', `Opening Wi-Fi Mesh Room [${code}]...`);

    const peer = new Peer(peerId, {
      debug: 0,
    });
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
      this.addLog('success', `Room [${code}] LIVE! Ready for friends on Wi-Fi.`);
      this.startTimers();
      this.emitState();
    });

    peer.on('connection', (conn) => {
      this.setupHostClientConn(conn);
    });

    peer.on('error', (err: any) => {
      const msg = err?.type === 'unavailable-id'
        ? `Room code ${code} is already taken. Try generating a fresh room.`
        : err?.message || 'Host network error';
      this.status = 'error';
      this.error = msg;
      this.addLog('error', `Host error: ${msg}`);
      this.emitState();
    });
  }

  joinRoom(codeInput: string) {
    const code = codeInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 3) {
      this.error = 'Enter a valid 4-character Room Code.';
      this.addLog('warn', this.error);
      this.emitState();
      return;
    }

    this.disconnect(true);
    this.status = 'connecting';
    this.isHost = false;
    this.roomCode = code;
    this.error = null;
    this.addLog('info', `Connecting to Room [${code}]...`);

    const peer = new Peer({ debug: 0 });
    this.peer = peer;

    peer.on('open', (id) => {
      this.localId = id;
      const targetId = `${ROOM_PREFIX}${code}`;
      const conn = peer.connect(targetId, { reliable: false });
      this.hostConn = conn;

      const timeout = window.setTimeout(() => {
        if (this.status === 'connecting') {
          this.status = 'error';
          this.error = `Could not reach Room [${code}]. Check Room Code & Wi-Fi.`;
          this.addLog('error', this.error);
          this.emitState();
        }
      }, 9000);

      conn.on('open', () => {
        window.clearTimeout(timeout);
        this.status = 'connected';
        this.error = null;
        this.addLog('success', `Connected to Host Room [${code}]!`);

        conn.send({
          type: 'hello',
          name: this.driverName,
          color: this.selfPose.color,
          lap: this.selfPose.lap,
          bestLap: this.selfPose.bestLap,
        } satisfies Packet);

        this.startTimers();
        this.emitState();
      });

      conn.on('data', (raw: any) => {
        this.handleClientPacket(raw as Packet);
      });

      conn.on('close', () => {
        window.clearTimeout(timeout);
        this.addLog('warn', `Disconnected from Room [${code}].`);
        this.disconnect(true);
      });

      conn.on('error', (err: any) => {
        window.clearTimeout(timeout);
        this.status = 'error';
        this.error = err?.message || 'Connection failed';
        this.addLog('error', `Link error: ${this.error}`);
        this.emitState();
      });
    });

    peer.on('error', (err: any) => {
      const msg = err?.type === 'peer-unavailable'
        ? `Room [${code}] not found.`
        : err?.message || 'Peer network error';
      this.status = 'error';
      this.error = msg;
      this.addLog('error', msg);
      this.emitState();
    });
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
        lap: 1,
        bestLap: null,
        pingMs: 0,
        isHost: false,
        isSelf: false,
        lastSeen: Date.now(),
      });
      this.addLog('success', `Peer joined: ${conn.peer.slice(-6).toUpperCase()}`);
      this.broadcastFromHost();
      this.emitState();
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
        this.emitState();
      } else if (pkt.type === 'pose') {
        entry.x = pkt.x;
        entry.y = pkt.y;
        entry.z = pkt.z;
        entry.yaw = pkt.yaw;
        entry.speed = pkt.speed;
        entry.color = pkt.color;
        entry.lap = pkt.lap;
        entry.bestLap = pkt.bestLap;
        entry.name = pkt.name || entry.name;
        entry.lastSeen = Date.now();
      } else if (pkt.type === 'ping') {
        conn.send({ type: 'pong', ts: pkt.ts } satisfies Packet);
      }
    });

    conn.on('close', () => {
      const left = this.players.get(conn.peer);
      this.clientConns.delete(conn.peer);
      this.players.delete(conn.peer);
      this.addLog('warn', `Driver left: ${left?.name || conn.peer.slice(-6)}`);
      this.broadcastFromHost();
      this.emitState();
    });
  }

  private handleClientPacket(pkt: Packet) {
    if (pkt.type === 'room-sync') {
      if (pkt.trackId && pkt.trackId !== this.trackId) {
        this.trackId = pkt.trackId;
        this.addLog('info', `Host switched track to ${pkt.trackId.toUpperCase()}`);
        this.onTrackSync?.(pkt.trackId);
      }

      const nextMap = new Map<string, MeshPlayerState>();
      for (const p of pkt.players) {
        const isSelf = p.id === this.localId;
        nextMap.set(p.id, {
          ...p,
          isSelf,
          lastSeen: Date.now(),
        });
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
      trackId: this.trackId,
      players: Array.from(this.players.values()).map(({ isSelf: _s, lastSeen: _l, ...rest }) => rest),
    };
    for (const conn of this.clientConns.values()) {
      if (conn.open) {
        conn.send(payload);
      }
    }
  }

  private startTimers() {
    this.stopTimers();

    if (this.isHost) {
      this.syncTimer = window.setInterval(() => {
        this.broadcastFromHost();
      }, 50);
    } else {
      this.pingTimer = window.setInterval(() => {
        if (this.hostConn?.open) {
          this.hostConn.send({ type: 'ping', ts: performance.now() } satisfies Packet);
        }
      }, 2000);
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
  }

  disconnect(silent = false) {
    this.stopTimers();
    if (this.hostConn) {
      try {
        this.hostConn.close();
      } catch {
        // ignore
      }
      this.hostConn = null;
    }
    for (const conn of this.clientConns.values()) {
      try {
        conn.close();
      } catch {
        // ignore
      }
    }
    this.clientConns.clear();
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // ignore
      }
      this.peer = null;
    }
    this.players.clear();
    this.status = 'offline';
    this.isHost = false;
    this.roomCode = '';
    this.localId = '';
    this.error = null;
    if (!silent) {
      this.addLog('info', 'Left multiplayer mesh room.');
    } else {
      this.emitState();
    }
  }
}
