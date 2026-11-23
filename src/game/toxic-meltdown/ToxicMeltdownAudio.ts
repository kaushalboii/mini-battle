/**
 * Toxic Meltdown® 3D - Arcade Web Audio Synthesizer
 * Procedural retro/arcade audio synthesis for the sweeper motor, arm whoosh,
 * jump springs, duck whooshes, collision thwacks, inflatable bounces, and sirens.
 * Engineered by Kaushal.
 */

export class ToxicMeltdownAudio {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private motorOsc: OscillatorNode | null = null;
  private motorGain: GainNode | null = null;
  private isRunning: boolean = false;

  constructor() {
    // AudioContext will be lazily initialized on first user interaction
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.motorGain && this.ctx) {
      this.motorGain.gain.setValueAtTime(muted ? 0 : 0.08, this.ctx.currentTime);
    }
  }

  public startMotor() {
    this.initCtx();
    if (!this.ctx || this.motorOsc) return;

    try {
      this.motorOsc = this.ctx.createOscillator();
      this.motorGain = this.ctx.createGain();

      this.motorOsc.type = 'sawtooth';
      this.motorOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

      // Low-pass filter to make it sound like a heavy industrial electric motor
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, this.ctx.currentTime);

      this.motorGain.gain.setValueAtTime(this.isMuted ? 0 : 0.06, this.ctx.currentTime);

      this.motorOsc.connect(filter);
      filter.connect(this.motorGain);
      this.motorGain.connect(this.ctx.destination);

      this.motorOsc.start();
      this.isRunning = true;
    } catch {
      // Audio autoplay may be restricted until user gesture
    }
  }

  public updateMotorSpeed(speedRatio: number) {
    if (!this.ctx || !this.motorOsc || this.isMuted) return;
    try {
      // Pitch goes from 40Hz up to 130Hz as sweeper accelerates
      const targetFreq = 42 + Math.min(speedRatio * 55, 95);
      this.motorOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
    } catch {}
  }

  public stopMotor() {
    if (this.motorOsc) {
      try {
        this.motorOsc.stop();
        this.motorOsc.disconnect();
      } catch {}
      this.motorOsc = null;
      this.motorGain = null;
      this.isRunning = false;
    }
  }

  /**
   * Jump Boing / Spring sound
   */
  public playJump() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      const now = this.ctx.currentTime;

      // Frequency rises rapidly like a cartoon spring
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.18);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }

  /**
   * Duck Swoosh / Whoosh sound
   */
  public playDuck() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      const now = this.ctx.currentTime;

      // Frequency descends quickly
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.16);

      gain.gain.setValueAtTime(0.20, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch {}
  }

  /**
   * Sweeper Arm Whoosh (when arm slices close to the camera/player)
   */
  public playArmWhoosh() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Filtered white noise puff
      const bufferSize = this.ctx.sampleRate * 0.15;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(350, now);
      filter.Q.setValueAtTime(2.0, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
    } catch {}
  }

  /**
   * Heavy Impact THWACK! When arm collides with a character
   */
  public playImpact() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // Punchy sub-bass thump
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.25);

      oscGain.gain.setValueAtTime(0.40, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.28);

      // Noise crack on impact
      const bufSize = Math.floor(this.ctx.sampleRate * 0.08);
      const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.25));
      }
      const crack = this.ctx.createBufferSource();
      crack.buffer = buf;
      const crackGain = this.ctx.createGain();
      crackGain.gain.setValueAtTime(0.35, now);
      crack.connect(crackGain);
      crackGain.connect(this.ctx.destination);
      crack.start(now);
    } catch {}
  }

  /**
   * Bouncy Inflatable Floor Splat / Boing
   */
  public playFloorBounce() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.35);

      gain.gain.setValueAtTime(0.30, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);
    } catch {}
  }

  /**
   * Warning Siren / Klaxon (on reversal or speed burst)
   */
  public playWarningSiren() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.setValueAtTime(880, now + 0.12);
      osc.frequency.setValueAtTime(650, now + 0.24);
      osc.frequency.setValueAtTime(880, now + 0.36);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.48);
    } catch {}
  }

  /**
   * Victory Fanfare for the last survivor standing
   */
  public playVictoryFanfare() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C4, E4, G4, C5, E5, G5
      const now = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gain.gain.setValueAtTime(0, now + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.20, now + idx * 0.1 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.45);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.5);
      });
    } catch {}
  }
}
