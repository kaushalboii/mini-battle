/**
 * RevSector 3D - Procedural WebAudio Formula 1 Sound Synthesizer
 * Synthesizes dynamic V6 Turbo engine harmonics, transmission gear shifts, turbo blowoff,
 * tire skid screeching, and collision impacts purely with WebAudio oscillators and noise.
 * Engineered by Kaushal.
 */

export class EngineAudio {
  private ctx: AudioContext | null = null;
  private isUnlocked: boolean = false;
  private isMuted: boolean = false;

  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private subOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  private skidGain: GainNode | null = null;
  private skidFilter: BiquadFilterNode | null = null;

  constructor() {
    // Initialized on user interaction unlock
  }

  public unlock() {
    if (this.isUnlocked) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      this.initEngineVoice();
      this.initSkidVoice();
      this.isUnlocked = true;
    } catch {
      // Audio not permitted
    }
  }

  private initEngineVoice() {
    if (!this.ctx) return;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.0;

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 800;

    this.engineGain.connect(this.engineFilter);
    this.engineFilter.connect(this.ctx.destination);

    // Primary V6 fundamental oscillator (Sawtooth for racing rasp)
    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'sawtooth';
    this.osc1.frequency.value = 75;
    this.osc1.connect(this.engineGain);
    this.osc1.start();

    // Secondary harmonic oscillator (Square for turbo induction bite)
    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'square';
    this.osc2.frequency.value = 150;
    this.osc2.connect(this.engineGain);
    this.osc2.start();

    // Sub-bass rumble oscillator
    this.subOsc = this.ctx.createOscillator();
    this.subOsc.type = 'triangle';
    this.subOsc.frequency.value = 38;
    this.subOsc.connect(this.engineGain);
    this.subOsc.start();
  }

  private initSkidVoice() {
    if (!this.ctx) return;

    // Procedural white noise buffer for tire friction and turbo hiss
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    this.skidFilter = this.ctx.createBiquadFilter();
    this.skidFilter.type = 'bandpass';
    this.skidFilter.frequency.value = 1800;
    this.skidFilter.Q.value = 4.0;

    this.skidGain = this.ctx.createGain();
    this.skidGain.gain.value = 0.0;

    whiteNoise.connect(this.skidFilter);
    this.skidFilter.connect(this.skidGain);
    this.skidGain.connect(this.ctx.destination);

    whiteNoise.start();
  }

  public update(dt: number, speedRatio: number, throttle: number, driftIntensity: number, isBoosting: boolean) {
    if (!this.ctx || !this.isUnlocked || this.isMuted) return;

    // Pitch mapping (RPM curve)
    const baseFreq = 70 + Math.abs(speedRatio) * 190 + (throttle > 0 ? 50 : 0) + (isBoosting ? 65 : 0);
    if (this.osc1) this.osc1.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.06);
    if (this.osc2) this.osc2.frequency.setTargetAtTime(baseFreq * 1.5, this.ctx.currentTime, 0.06);
    if (this.subOsc) this.subOsc.frequency.setTargetAtTime(baseFreq * 0.5, this.ctx.currentTime, 0.06);

    // Filter cutoff (opens up on throttle)
    const cutoff = 600 + Math.abs(speedRatio) * 3200 + (throttle > 0 ? 1800 : 0);
    if (this.engineFilter) this.engineFilter.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.06);

    // Volume gain
    const targetVol = Math.min(0.24, 0.06 + Math.abs(speedRatio) * 0.14 + (throttle !== 0 ? 0.06 : 0));
    if (this.engineGain) this.engineGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.05);

    // Tire skid sound
    if (this.skidGain) {
      const skidVol = driftIntensity > 0.15 ? Math.min(0.28, driftIntensity * 0.28) : 0;
      this.skidGain.gain.setTargetAtTime(skidVol, this.ctx.currentTime, 0.04);
    }
  }

  public playImpact(intensity: number) {
    if (!this.ctx || !this.isUnlocked || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      // 1. Low-end chassis boom
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(25, t + 0.35);

      const vol = Math.min(0.65, 0.2 + intensity * 0.04);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.42);

      // 2. High-frequency metal crunch / body crumple noise
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.18);
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, t);
      filter.Q.value = 2.0;

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(Math.min(0.55, 0.15 + intensity * 0.03), t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(t);
    } catch {}
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(muted ? 0 : 0.12, this.ctx.currentTime, 0.05);
    }
  }

  public destroy() {
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
  }
}
