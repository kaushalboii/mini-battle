function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(x: number, y: number, t: number): number {
  return (1 - t) * x + t * y;
}

function remap(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return outMin + ((outMax - outMin) * (value - inMin)) / (inMax - inMin);
}

const NUM_GEARS = 3;
const UPSHIFT_RPM = 0.92;
const DOWNSHIFT_RPM = 0.35;
const SHIFT_COOLDOWN = 0.35;

const PITCH_LOW = [1.05, 1.25, 1.4];
const PITCH_HIGH = [3.5, 2.9, 2.3];

const FILTER_CUTOFF_MIN = 700;
const FILTER_CUTOFF_MAX = 7000;

interface Voice {
  source: AudioBufferSourceNode | null;
  gain: GainNode;
  filter: BiquadFilterNode | null;
  buffer: AudioBuffer | null;
  currentVolume: number;
  currentPitch: number;
}

export class GameAudio {
  private _ctx: AudioContext | null = null;
  private _engine: Voice | null = null;
  private _engineLayer: Voice | null = null;
  private _skid: Voice | null = null;
  private _impactBuffer: AudioBuffer | null = null;

  private _ready = false;
  private _unlocked = false;
  private _started = false;

  private _rpm = 0;
  private _gear = 0;
  private _shiftCooldown = 0;

  constructor() {
    // Lazy AudioContext initialization on first user interaction
  }

  private _initCtx() {
    if (this._ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this._ctx = new AudioCtx();

    this._engine = this._makeVoice(true);
    this._engineLayer = this._makeVoice(false);
    this._skid = this._makeVoice(false);

    this._buildProceduralBuffers();
  }

  private _makeVoice(withFilter: boolean): Voice {
    if (!this._ctx) throw new Error("No AudioContext");
    const gain = this._ctx.createGain();
    gain.gain.value = 0;

    let filter: BiquadFilterNode | null = null;
    let head: AudioNode = gain;

    if (withFilter) {
      filter = this._ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.Q.value = 0.7;
      filter.frequency.value = FILTER_CUTOFF_MIN;
      gain.connect(filter);
      head = filter;
    }

    head.connect(this._ctx.destination);

    return {
      source: null,
      gain,
      filter,
      buffer: null,
      currentVolume: 0,
      currentPitch: 1,
    };
  }

  private _buildProceduralBuffers() {
    if (!this._ctx) return;
    const sampleRate = this._ctx.sampleRate;

    // 1. Procedural Engine Rumble Buffer (1 second looping rich sawtooth/triangle mix)
    const engineDuration = 1.0;
    const engineFrames = Math.floor(sampleRate * engineDuration);
    const engineBuf = this._ctx.createBuffer(1, engineFrames, sampleRate);
    const engineData = engineBuf.getChannelData(0);
    const baseFreq = 58; // 58 Hz base idle rumble
    for (let i = 0; i < engineFrames; i++) {
      const t = i / sampleRate;
      const wave1 = Math.sin(2 * Math.PI * baseFreq * t);
      const wave2 = 0.5 * Math.sin(2 * Math.PI * (baseFreq * 2) * t);
      const wave3 = 0.25 * ((t * baseFreq * 4) % 1 - 0.5);
      const noise = (Math.random() - 0.5) * 0.15;
      engineData[i] = (wave1 + wave2 + wave3 + noise) * 0.5;
    }

    // 2. Procedural Tire Skid Buffer (1.5 seconds friction screech)
    const skidDuration = 1.5;
    const skidFrames = Math.floor(sampleRate * skidDuration);
    const skidBuf = this._ctx.createBuffer(1, skidFrames, sampleRate);
    const skidData = skidBuf.getChannelData(0);
    for (let i = 0; i < skidFrames; i++) {
      const t = i / sampleRate;
      const screech = Math.sin(2 * Math.PI * 1850 * t + Math.sin(2 * Math.PI * 120 * t) * 4);
      const whiteNoise = (Math.random() - 0.5) * 0.85;
      skidData[i] = screech * 0.45 + whiteNoise * 0.55;
    }

    // 3. Procedural Impact Buffer (0.4s crunchy thud)
    const impactDuration = 0.4;
    const impactFrames = Math.floor(sampleRate * impactDuration);
    const impactBuf = this._ctx.createBuffer(1, impactFrames, sampleRate);
    const impactData = impactBuf.getChannelData(0);
    for (let i = 0; i < impactFrames; i++) {
      const t = i / sampleRate;
      const decay = Math.exp(-t * 14);
      const lowThud = Math.sin(2 * Math.PI * 90 * t);
      const crunchNoise = (Math.random() - 0.5) * Math.exp(-t * 22);
      impactData[i] = (lowThud * 0.7 + crunchNoise * 0.8) * decay;
    }

    if (this._engine) this._engine.buffer = engineBuf;
    if (this._engineLayer) this._engineLayer.buffer = engineBuf;
    if (this._skid) this._skid.buffer = skidBuf;
    this._impactBuffer = impactBuf;

    this._ready = true;
    if (this._unlocked) this._start();
  }

  unlock() {
    if (this._unlocked) return;
    this._initCtx();
    this._unlocked = true;

    if (this._ctx && this._ctx.state === "suspended") {
      void this._ctx.resume();
    }

    if (this._ready) this._start();
  }

  private _start() {
    if (this._started) return;
    this._started = true;

    if (this._engine) this._startVoice(this._engine);
    if (this._engineLayer) this._startVoice(this._engineLayer);
    if (this._skid) this._startVoice(this._skid);
  }

  private _startVoice(voice: Voice) {
    if (!this._ctx || !voice.buffer) return;

    const src = this._ctx.createBufferSource();
    src.buffer = voice.buffer;
    src.loop = true;
    src.playbackRate.value = 1;
    src.connect(voice.gain);
    src.start();
    voice.source = src;
  }

  update(dt: number, speed: number, throttle: number, driftIntensity: number) {
    if (!this._started || !this._ctx || !this._engine || !this._engineLayer || !this._skid) return;

    const absSpeed = clamp(Math.abs(speed), 0, 1);
    const load = clamp(Math.max(0, throttle), 0, 1);

    const gearWindow = 1 / NUM_GEARS;
    const gearStart = this._gear * gearWindow;
    const inGear = clamp((absSpeed - gearStart) / gearWindow, 0, 1);

    let targetRpm = inGear * 0.85 + load * 0.2;
    targetRpm = clamp(targetRpm, 0, 1.05);

    const riseRate = 4;
    const fallRate = 4;
    const rate = targetRpm > this._rpm ? riseRate * (0.3 + load) : fallRate;

    this._rpm = lerp(this._rpm, targetRpm, Math.min(1, dt * rate));
    this._shiftCooldown = Math.max(0, this._shiftCooldown - dt);

    if (this._shiftCooldown === 0) {
      if (this._rpm > UPSHIFT_RPM && this._gear < NUM_GEARS - 1 && load > 0.1) {
        this._gear++;
        this._rpm = 0.45;
        this._shiftCooldown = SHIFT_COOLDOWN;
      } else if (this._rpm < DOWNSHIFT_RPM && this._gear > 0) {
        this._gear--;
        this._rpm = 0.78;
        this._shiftCooldown = SHIFT_COOLDOWN;
      }
    }

    const targetVol = remap(absSpeed + load * 0.5, 0, 1.5, 0.04, 0.28);
    this._engine.currentVolume = lerp(this._engine.currentVolume, targetVol, dt * 5);
    this._engine.gain.gain.value = this._engine.currentVolume;

    this._engineLayer.currentVolume = this._engine.currentVolume * 0.4;
    this._engineLayer.gain.gain.value = this._engineLayer.currentVolume;

    const pitch = lerp(PITCH_LOW[this._gear], PITCH_HIGH[this._gear], this._rpm);
    if (this._engine.source) this._engine.source.playbackRate.value = pitch;
    if (this._engineLayer.source) this._engineLayer.source.playbackRate.value = pitch * 0.5;

    if (this._engine.filter) {
      const targetCutoff = remap(load, 0, 1, FILTER_CUTOFF_MIN, FILTER_CUTOFF_MAX);
      this._engine.filter.frequency.setTargetAtTime(targetCutoff, this._ctx.currentTime, 0.05);
    }

    let skidVol = 0;
    if (driftIntensity > 0.5) {
      skidVol = remap(clamp(driftIntensity, 0.5, 2.5), 0.5, 2.5, 0.05, 0.32);
    }

    this._skid.currentVolume = lerp(this._skid.currentVolume, skidVol, dt * 10);
    this._skid.gain.gain.value = this._skid.currentVolume;

    const skidPitch = clamp(Math.abs(speed) * 1.5, 0.8, 2.4);
    this._skid.currentPitch = lerp(this._skid.currentPitch, skidPitch, 0.1);
    if (this._skid.source) this._skid.source.playbackRate.value = this._skid.currentPitch;
  }

  playImpact(impactVelocity: number) {
    if (!this._ctx || !this._unlocked || !this._impactBuffer) return;

    const src = this._ctx.createBufferSource();
    src.buffer = this._impactBuffer;

    const gain = this._ctx.createGain();
    const volume = clamp(remap(impactVelocity, 0, 6, 0.1, 0.85), 0.1, 0.85);
    gain.gain.value = volume;

    src.connect(gain);
    gain.connect(this._ctx.destination);
    src.start();
  }
}
