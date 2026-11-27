import { sound } from './manifest';
import { clamp, lerp } from './MathUtils';

const NUM_GEARS = 6;
const GEAR_MIN = [0.0, 0.13, 0.26, 0.41, 0.57, 0.74];
const GEAR_MAX = [0.17, 0.31, 0.47, 0.63, 0.79, 0.96];

const UPSHIFT_RPM = 0.90;
const DOWNSHIFT_RPM = 0.33;
const SHIFT_COOLDOWN = 0.22;

const PITCH_LOW = [0.95, 1.08, 1.18, 1.26, 1.34, 1.42];
const PITCH_HIGH = [2.65, 2.52, 2.42, 2.34, 2.26, 2.18];

const FILTER_CUTOFF_MIN = 700;
const FILTER_CUTOFF_MAX = 7200;

function remap(value, inMin, inMax, outMin, outMax) {
  return outMin + ((outMax - outMin) * (value - inMin)) / (inMax - inMin);
}

export class GameAudio {
  _ctx;
  _masterGain;
  _engine;
  _engineLayer;
  _skid;
  _impactBuffers = [];
  _impactIndex = 0;

  _ready = false;
  _unlocked = false;
  _started = false;
  _muted = false;
  _volume = 0.8;

  _rpm = 0;
  _gear = 0;
  _shiftCooldown = 0;

  constructor() {
    const Ctx = window.AudioContext || window.webkitAudioContext;

    this._ctx = new Ctx();
    this._masterGain = this._ctx.createGain();
    this._masterGain.gain.value = this._volume;
    this._masterGain.connect(this._ctx.destination);

    this._engine = this._makeVoice(true);
    this._engineLayer = this._makeVoice(false);
    this._skid = this._makeVoice(false);
  }

  _makeVoice(withFilter) {
    const gain = this._ctx.createGain();

    gain.gain.value = 0;

    let filter = null;
    let head = gain;

    if (withFilter) {
      filter = this._ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 0.7;
      filter.frequency.value = FILTER_CUTOFF_MIN;
      gain.connect(filter);
      head = filter;
    }

    head.connect(this._masterGain);

    return {
      source: null,
      gain,
      filter,
      buffer: null,
      currentVolume: 0,
      currentPitch: 1,
    };
  }

  setMuted(muted) {
    this._muted = Boolean(muted);
    this._syncMasterGain();
  }

  setVolume(vol) {
    this._volume = clamp(vol, 0, 1);
    this._syncMasterGain();
  }

  _syncMasterGain() {
    if (!this._masterGain || !this._ctx) return;
    const target = this._muted ? 0 : this._volume;
    this._masterGain.gain.setTargetAtTime(target, this._ctx.currentTime, 0.03);
  }

  getGear() {
    return this._gear + 1;
  }

  getRpm() {
    return this._rpm;
  }

  async load() {
    const [engineBuf, skidBuf, impactBuf] = await Promise.all([
      this._fetchBuffer(sound('racing.engine')),
      this._fetchBuffer(sound('racing.skid')),
      this._fetchBuffer(sound('racing.impact')),
    ]);

    this._engine.buffer = engineBuf;
    this._engineLayer.buffer = engineBuf;
    this._skid.buffer = skidBuf;

    for (let i = 0; i < 3; i++) this._impactBuffers.push(impactBuf);

    this._ready = true;
    if (this._unlocked) this._start();
  }

  async _fetchBuffer(url) {
    const res = await fetch(url);
    const arr = await res.arrayBuffer();

    return this._ctx.decodeAudioData(arr);
  }

  unlock() {
    if (this._unlocked) return;
    this._unlocked = true;

    if (this._ctx.state === 'suspended') {
      void this._ctx.resume();
    }

    if (this._ready) this._start();
  }

  _start() {
    if (this._started) return;
    this._started = true;

    this._startVoice(this._engine);
    this._startVoice(this._engineLayer);
    this._startVoice(this._skid);
  }

  _startVoice(voice) {
    if (!voice.buffer) return;

    const src = this._ctx.createBufferSource();

    src.buffer = voice.buffer;
    src.loop = true;
    src.playbackRate.value = 1;
    src.connect(voice.gain);
    src.start();
    voice.source = src;
  }

  silence() {
    if (!this._started) return;
    this._engine.currentVolume = 0;
    this._engine.gain.gain.value = 0;
    this._engineLayer.currentVolume = 0;
    this._engineLayer.gain.gain.value = 0;
    this._skid.currentVolume = 0;
    this._skid.gain.gain.value = 0;
  }

  resetGearbox() {
    this._gear = 0;
    this._rpm = 0;
    this._shiftCooldown = 0;
  }

  update(dt, speed, throttle, driftIntensity, isBoosting = false) {
    const absSpeed = clamp(Math.abs(speed), 0, isBoosting ? 1.35 : 1.05);
    const load = clamp(Math.max(0, throttle), 0, 1) + (isBoosting ? 0.35 : 0);

    // Always compute 6-gear transmission state even before audio unlock so HUD gears work 100%
    const gMin = GEAR_MIN[this._gear];
    const gMax = GEAR_MAX[this._gear];
    const inGear = clamp((absSpeed - gMin) / Math.max(0.05, gMax - gMin), 0, 1);

    let targetRpm = inGear * 0.86 + load * 0.18 + (isBoosting ? 0.15 : 0);
    targetRpm = clamp(targetRpm, 0.08, 1.15);

    const riseRate = 4.8;
    const fallRate = 4.2;
    const rate = targetRpm > this._rpm ? riseRate * (0.35 + load) : fallRate;

    this._rpm = lerp(this._rpm, targetRpm, Math.min(1, dt * rate));
    this._shiftCooldown = Math.max(0, this._shiftCooldown - dt);

    if (absSpeed < 0.02 && load < 0.05) {
      this._gear = 0;
    } else if (this._shiftCooldown === 0) {
      if (
        (this._rpm > UPSHIFT_RPM || absSpeed > gMax * 0.98) &&
        this._gear < NUM_GEARS - 1 &&
        load > 0.08
      ) {
        this._gear++;
        this._rpm = 0.46;
        this._shiftCooldown = SHIFT_COOLDOWN;
      } else if (
        (this._rpm < DOWNSHIFT_RPM || absSpeed < gMin * 0.88) &&
        this._gear > 0
      ) {
        this._gear--;
        this._rpm = 0.78;
        this._shiftCooldown = SHIFT_COOLDOWN;
      }
    }

    if (!this._started) return;

    const targetVol = remap(absSpeed + load * 0.5, 0, 1.5, 0.02, 0.25);

    this._engine.currentVolume = lerp(
      this._engine.currentVolume,
      targetVol,
      dt * 5,
    );
    this._engine.gain.gain.value = this._engine.currentVolume;
    this._engineLayer.currentVolume = this._engine.currentVolume * 0.4;
    this._engineLayer.gain.gain.value = this._engineLayer.currentVolume;

    const pitchBoost = isBoosting ? 0.22 : 0;
    const pitch =
      lerp(
        PITCH_LOW[this._gear],
        PITCH_HIGH[this._gear],
        clamp(this._rpm, 0, 1),
      ) + pitchBoost;

    if (this._engine.source) this._engine.source.playbackRate.value = pitch;
    if (this._engineLayer.source)
      this._engineLayer.source.playbackRate.value = pitch * 0.5;

    if (this._engine.filter) {
      const targetCutoff = remap(
        load,
        0,
        1,
        FILTER_CUTOFF_MIN,
        FILTER_CUTOFF_MAX,
      );

      this._engine.filter.frequency.setTargetAtTime(
        targetCutoff,
        this._ctx.currentTime,
        0.05,
      );
    }

    let skidVol = 0;

    if (driftIntensity > 0.5) {
      skidVol = remap(clamp(driftIntensity, 0.5, 2.5), 0.5, 2.5, 0.05, 0.3);
    }

    this._skid.currentVolume = lerp(this._skid.currentVolume, skidVol, dt * 10);
    this._skid.gain.gain.value = this._skid.currentVolume;

    const skidPitch = clamp(absSpeed * 2.2, 1, 3);

    this._skid.currentPitch = lerp(this._skid.currentPitch, skidPitch, 0.1);
    if (this._skid.source)
      this._skid.source.playbackRate.value = this._skid.currentPitch;
  }

  playImpact(impactVelocity) {
    if (!this._unlocked || this._muted || this._impactBuffers.length === 0) return;

    const buffer = this._impactBuffers[this._impactIndex];

    this._impactIndex = (this._impactIndex + 1) % this._impactBuffers.length;

    const src = this._ctx.createBufferSource();

    src.buffer = buffer;

    const gain = this._ctx.createGain();
    const volume = clamp(remap(impactVelocity, 0, 6, 0.01, 1.0), 0.01, 1.0);

    gain.gain.value = volume;
    src.connect(gain);
    gain.connect(this._masterGain);
    src.start();
  }

  destroy() {
    try {
      this._ctx.close();
    } catch {
      // ignore
    }
  }
}
