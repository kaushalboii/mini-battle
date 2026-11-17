/**
 * Kraken's Quay: Splash & Shot - Premium Audio Engine
 *
 * Features:
 * - Web Audio API procedural synthesis (no external files needed)
 * - Spatial audio with distance attenuation
 * - Dynamic music layers
 * - Sound pooling for performance
 * - Master volume control
 * - Audio context suspension handling
 */

type AudioCategory = "master" | "music" | "sfx" | "ui" | "ambience";

interface AudioClip {
  buffer: AudioBuffer;
  volume: number;
  loop: boolean;
  category: AudioCategory;
}

interface SoundInstance {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  pannerNode: PannerNode | null;
  clip: AudioClip;
  playing: boolean;
}

interface AudioSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  uiVolume: number;
  ambienceVolume: number;
  maxConcurrentSounds: number;
  distanceModel: string;
  rolloffFactor: number;
  refDistance: number;
  maxDistance: number;
}

const AUDIO_SETTINGS: AudioSettings = {
  masterVolume: 0.7,
  musicVolume: 0.5,
  sfxVolume: 0.8,
  uiVolume: 0.6,
  ambienceVolume: 0.4,
  maxConcurrentSounds: 32,
  distanceModel: "exponential",
  rolloffFactor: 1.2,
  refDistance: 1,
  maxDistance: 50,
};

class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private categoryGains: Map<AudioCategory, GainNode> = new Map();
  private clips: Map<string, AudioClip> = new Map();
  private activeSounds: SoundInstance[] = [];
  private soundPool: SoundInstance[] = [];
  private suspended: boolean = false;
  private musicSource: AudioBufferSourceNode | null = null;
  private musicGain: GainNode | null = null;
  private musicPanner: PannerNode | null = null;
  private initialized: boolean = false;

  // Procedural sound definitions
  private proceduralSounds: Map<string, () => AudioBuffer> = new Map();

  constructor() {
    this.setupProceduralSounds();
  }

  private setupProceduralSounds(): void {
    // These will be generated when context is available
    this.proceduralSounds.set("cannon-launch", () => this.createCannonLaunch());
    this.proceduralSounds.set("ocean-splash", () => this.createOceanSplash());
    this.proceduralSounds.set("raft-impact", () => this.createRaftImpact());
    this.proceduralSounds.set("shell-bonus", () => this.createShellBonus());
    this.proceduralSounds.set("victory-fanfare", () => this.createVictoryFanfare());
    this.proceduralSounds.set("defeat-dirge", () => this.createDefeatDirge());
    this.proceduralSounds.set("battle-theme", () => this.createBattleTheme());
    this.proceduralSounds.set("ui-click", () => this.createUIClick());
    this.proceduralSounds.set("ui-hover", () => this.createUIHover());
    this.proceduralSounds.set("charge-up", () => this.createChargeUp());
    this.proceduralSounds.set("depth-charge-launch", () => this.createDepthChargeLaunch());
    this.proceduralSounds.set("grapeshot-launch", () => this.createGrapeshotLaunch());
    this.proceduralSounds.set("enemy-taunt", () => this.createEnemyTaunt());
    this.proceduralSounds.set("wave-ambience", () => this.createWaveAmbience());
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Create master gain
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = AUDIO_SETTINGS.masterVolume;
    this.masterGain.connect(this.context.destination);

    // Create category gains
    const categories: AudioCategory[] = ["music", "sfx", "ui", "ambience"];
    for (const cat of categories) {
      const gain = this.context.createGain();
      const key = `${cat}Volume` as keyof AudioSettings;
      gain.gain.value = AUDIO_SETTINGS[key] as number;
      gain.connect(this.masterGain);
      this.categoryGains.set(cat, gain);
    }

    // Generate procedural sounds
    for (const [name, generator] of this.proceduralSounds) {
      try {
        const buffer = generator();
        this.clips.set(name, {
          buffer,
          volume: 1.0,
          loop: name === "battle-theme" || name === "wave-ambience",
          category: this.getCategoryForSound(name),
        });
      } catch (e) {
        console.warn(`Failed to generate sound: ${name}`, e);
      }
    }

    // Handle context suspension
    this.context.onstatechange = () => {
      if (this.context?.state === "running") {
        this.suspended = false;
      }
    };

    // Resume on user interaction
    const resume = async () => {
      if (this.context?.state === "suspended") {
        await this.context.resume();
        this.suspended = false;
      }
      document.removeEventListener("click", resume);
      document.removeEventListener("keydown", resume);
    };
    document.addEventListener("click", resume);
    document.addEventListener("keydown", resume);

    this.initialized = true;
  }

  private getCategoryForSound(name: string): AudioCategory {
    if (name.includes("theme") || name.includes("ambience")) return "ambience";
    if (name.includes("music") || name === "victory-fanfare" || name === "defeat-dirge") return "music";
    if (name.includes("ui")) return "ui";
    return "sfx";
  }

  // ==========================================
  // Procedural Sound Generators
  // ==========================================

  private createCannonLaunch(): AudioBuffer {
    const ctx = this.context!;
    const duration = 0.8;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(duration * sampleRate);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const progress = t / duration;

      // Low frequency thump
      const thump = Math.sin(2 * Math.PI * 60 * t * (1 - progress * 0.5)) *
                    Math.exp(-t * 8) * (1 - progress);

      // Air pressure release
      const pressure = (Math.random() * 2 - 1) * Math.exp(-t * 15) * 0.3;

      // High frequency crack
      const crack = Math.sin(2 * Math.PI * 800 * t * (1 + progress * 2)) *
                    Math.exp(-t * 20) * 0.15;

      data[i] = (thump + pressure + crack) * 0.7;
    }
    return buffer;
  }

  private createDepthChargeLaunch(): AudioBuffer {
    const ctx = this.context!;
    const duration = 1.0;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(duration * sampleRate);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const progress = t / duration;

      // Deeper, heavier thump
      const thump = Math.sin(2 * Math.PI * 40 * t * (1 - progress * 0.3)) *
                    Math.exp(-t * 5) * (1 - progress * 0.5);

      // Water displacement
      const water = (Math.random() * 2 - 1) * Math.exp(-t * 8) * 0.4;

      data[i] = (thump + water) * 0.8;
    }
    return buffer;
  }

  private createGrapeshotLaunch(): AudioBuffer {
    const ctx = this.context!;
    const duration = 0.6;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(duration * sampleRate);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const progress = t / duration;

      // Multiple small projectiles
      let sum = 0;
      for (let p = 0; p < 5; p++) {
        const offset = p * 0.03;
        if (t > offset) {
          sum += Math.sin(2 * Math.PI * (200 + p * 50) * (t - offset)) *
                 Math.exp(-(t - offset) * 30) * 0.1;
        }
      }

      // Main launch
      const launch = Math.sin(2 * Math.PI * 120 * t) * Math.exp(-t * 12) * 0.3;

      data[i] = (sum + launch) * 0.7;
    }
    return buffer;
  }

  private createOceanSplash(): AudioBuffer {
    const ctx = this.context!;
    const duration = 1.2;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(duration * sampleRate);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const progress = t / duration;

      // Water impact noise
      const impact = (Math.random() * 2 - 1) * Math.exp(-t * 6) * (1 - progress * 0.5);

      // Bubble resonance
      const bubbles = Math.sin(2 * Math.PI * (180 + Math.sin(t * 50) * 40) * t) *
                      Math.exp(-t * 4) * 0.3;

      // Water settling
      const settle = Math.sin(2 * Math.PI * 60 * t) * Math.exp(-t * 3) * 0.2;

      data[i] = (impact + bubbles + settle) * 0.6;
    }
    return buffer;
  }

  private createRaftImpact(): AudioBuffer {
    const ctx = this.context!;
    const duration = 0.9;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(duration * sampleRate);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const progress = t / duration;

      // Wood crack
      const crack = (Math.random() * 2 - 1) * Math.exp(-t * 25) * 0.6;

      // Low resonance
      const resonance = Math.sin(2 * Math.PI * 80 * t) * Math.exp(-t * 10) * 0.4;

      // Debris
      const debris = (Math.random() * 2 - 1) * Math.exp(-t * 15) * 0.2;

      data[i] = (crack + resonance + debris) * 0.75;
    }
    return buffer;
  }

  private createShellBonus(): AudioBuffer {
    const ctx = this.context!;
    const duration = 0.7;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(duration * sampleRate);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;

      // Magical chime
      const chime1 = Math.sin(2 * Math.PI * 880 * t) * Math.exp(-t * 3) * 0.4;
      const chime2 = Math.sin(2 * Math.PI * 1320 * t) * Math.exp(-t * 4) * 0.3;
      const chime3 = Math.sin(2 * Math.PI * 1760 * t) * Math.exp(-t * 5) * 0.2;

      // Sparkle
      const sparkle = (Math.random() * 2 - 1) * Math.exp(-t * 20) * 0.1;

      data[i] = (chime1 + chime2 + chime3 + sparkle) * 0.6;
    }
    return buffer;
  }

  private createVictoryFanfare(): AudioBuffer {
    const ctx = this.context!;
    const duration = 3.0;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(duration * sampleRate);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    const notes = [
      { freq: 523.25, time: 0.0, dur: 0.4 },   // C5
      { freq: 659.25, time: 0.3, dur: 0.4 },   // E5
      { freq: 783.99, time: 0.6, dur: 0.4 },   // G5
      { freq: 1046.5, time: 1.0, dur: 0.6 },   // C6
      { freq: 783.99, time: 1.6, dur: 0.4 },   // G5
      { freq: 1046.5, time: 2.0, dur: 1.0 },   // C6
    ];

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let sum = 0;

      for (const note of notes) {
        if (t >= note.time && t < note.time + note.dur) {
          const noteProgress = (t - note.time) / note.dur;
          const env = Math.exp(-noteProgress * 3) * (1 - noteProgress * 0.3);
          sum += Math.sin(2 * Math.PI * note.freq * (t - note.time)) * env * 0.3;
          // Harmonics
          sum += Math.sin(2 * Math.PI * note.freq * 2 * (t - note.time)) * env * 0.15;
          sum += Math.sin(2 * Math.PI * note.freq * 3 * (t - note.time)) * env * 0.08;
        }
      }

      data[i] = sum * 0.5;
    }
    return buffer;
  }

  private createDefeatDirge(): AudioBuffer {
    const ctx = this.context!;
    const duration = 2.5;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(duration * sampleRate);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    const notes = [
      { freq: 293.66, time: 0.0, dur: 0.8 },   // D4
      { freq: 261.63, time: 0.7, dur: 0.8 },   // C4
      { freq: 246.94, time: 1.4, dur: 1.1 },   // B3
    ];

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let sum = 0;

      for (const note of notes) {
        if (t >= note.time && t < note.time + note.dur) {
          const noteProgress = (t - note.time) / note.dur;
          const env = Math.exp(-noteProgress * 2) * (1 - noteProgress * 0.2);
          sum += Math.sin(2 * Math.PI * note.freq * (t - note.time)) * env * 0.25;
          sum += Math.sin(2 * Math.PI * note.freq * 0.5 * (t - note.time)) * env * 0.15;
        }
      }

      // Low drone
      sum += Math.sin(2 * Math.PI * 65.41 * t) * Math.exp(-t * 0.5) * 0.1;

      data[i] = sum * 0.5;
    }
    return buffer;
  }

  private createBattleTheme(): AudioBuffer {
    const ctx = this.context!;
    const duration = 30.0; // 30 second loop
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(duration * sampleRate);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // Simple procedural music - tropical pirate battle theme
    const tempo = 110; // BPM
    const beatDuration = 60 / tempo;
    const measureDuration = beatDuration * 4;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const measure = Math.floor(t / measureDuration);
      const beat = (t % measureDuration) / beatDuration;
      const beatPhase = beat - Math.floor(beat);

      let sum = 0;

      // Bass line (every measure)
      const bassNote = measure % 8;
      const bassFreqs = [87.31, 87.31, 73.42, 87.31, 98.00, 87.31, 73.42, 82.41]; // F#2, F#2, D#2, F#2, G#2, F#2, D#2, F2
      const bassFreq = bassFreqs[bassNote];
      const bassPhase = (t * bassFreq * 2 * Math.PI) % (2 * Math.PI);
      sum += Math.sin(bassPhase) * 0.15 * (beatPhase < 0.1 ? 1 : Math.exp(-beatPhase * 8));

      // Percussion - kick on 1 and 3
      if (beatPhase < 0.02 && (Math.floor(beat) % 2 === 0)) {
        sum += Math.sin(2 * Math.PI * 60 * t) * Math.exp(-t * 20) * 0.3;
      }

      // Snare on 2 and 4
      if (beatPhase < 0.015 && (Math.floor(beat) % 2 === 1)) {
        sum += (Math.random() * 2 - 1) * Math.exp(-t * 50) * 0.2;
      }

      // Hi-hat on every 8th
      const eighthPhase = (t % (beatDuration / 2)) / (beatDuration / 2);
      if (eighthPhase < 0.01) {
        sum += (Math.random() * 2 - 1) * Math.exp(-t * 100) * 0.08;
      }

      // Melody (simple)
      const melodyMeasure = measure % 16;
      if (melodyMeasure < 8) {
        const melodyNotes = [659.25, 783.99, 659.25, 587.33, 523.25, 587.33, 659.25, 523.25];
        const noteIndex = Math.floor((t % measureDuration) / (measureDuration / 4));
        if (noteIndex < melodyNotes.length) {
          const melodyFreq = melodyNotes[noteIndex];
          const melodyPhase = (t * melodyFreq * 2 * Math.PI) % (2 * Math.PI);
          const env = Math.exp(-((t % measureDuration) / (measureDuration / 4)) * 4) * 0.1;
          sum += Math.sin(melodyPhase) * env;
        }
      }

      // Pad chord
      const chordNotes = [349.23, 415.30, 493.88]; // F#4, A4, B4
      for (const freq of chordNotes) {
        sum += Math.sin(2 * Math.PI * freq * t) * 0.02 * (0.5 + 0.5 * Math.sin(t * 0.5));
      }

      data[i] = sum * 0.4;
    }
    return buffer;
  }

  private createUIClick(): AudioBuffer {
    const ctx = this.context!;
    const duration = 0.1;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(duration * sampleRate);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const progress = t / duration;
      data[i] = Math.sin(2 * Math.PI * (800 - progress * 400) * t) * Math.exp(-t * 30) * 0.3;
    }
    return buffer;
  }

  private createUIHover(): AudioBuffer {
    const ctx = this.context!;
    const duration = 0.08;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(duration * sampleRate);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      data[i] = Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 40) * 0.15;
    }
    return buffer;
  }

  private createChargeUp(): AudioBuffer {
    const ctx = this.context!;
    const duration = 1.5;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(duration * sampleRate);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const progress = t / duration;

      // Rising pitch
      const freq = 100 + progress * 400;
      const tone = Math.sin(2 * Math.PI * freq * t) * progress * 0.3;

      // Energy buildup
      const energy = (Math.random() * 2 - 1) * progress * progress * 0.1;

      data[i] = tone + energy;
    }
    return buffer;
  }

  private createEnemyTaunt(): AudioBuffer {
    const ctx = this.context!;
    const duration = 0.5;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(duration * sampleRate);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // Grunt-like sound
      const freq = 180 + Math.sin(t * 30) * 40;
      data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 4) * 0.3;
    }
    return buffer;
  }

  private createWaveAmbience(): AudioBuffer {
    const ctx = this.context!;
    const duration = 10.0;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(duration * sampleRate);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;

      // Ocean wave noise
      let sum = 0;
      for (let octave = 0; octave < 4; octave++) {
        const freq = 0.1 * Math.pow(2, octave);
        const amp = 1 / Math.pow(2, octave);
        sum += Math.sin(2 * Math.PI * freq * t + Math.sin(t * 0.3) * 2) * amp;
      }

      // Filter to sound like water
      data[i] = sum * 0.05 * (0.5 + 0.5 * Math.sin(t * 0.15));
    }
    return buffer;
  }

  // ==========================================
  // Public API
  // ==========================================

  play(name: string, options?: {
    volume?: number;
    loop?: boolean;
    position?: THREE.Vector3;
    category?: AudioCategory;
    pitch?: number;
  }): SoundInstance | null {
    if (!this.context || !this.initialized) return null;

    const clip = this.clips.get(name);
    if (!clip) {
      console.warn(`Sound not found: ${name}`);
      return null;
    }

    // Reuse from pool or create new
    let instance = this.soundPool.pop() || this.createSoundInstance(clip);

    instance.clip = clip;
    instance.source = this.context.createBufferSource();
    instance.source.buffer = clip.buffer;
    instance.source.loop = options?.loop ?? clip.loop;
    instance.source.playbackRate.value = options?.pitch ?? 1.0;

    // Set up gain
    instance.gainNode.gain.value = (options?.volume ?? 1.0) * clip.volume;

    // Set up spatial audio if position provided
    if (options?.position && this.context.listener) {
      if (!instance.pannerNode) {
        instance.pannerNode = this.context.createPanner();
        instance.pannerNode.panningModel = "HRTF";
        instance.pannerNode.distanceModel = AUDIO_SETTINGS.distanceModel as DistanceModelType;
        instance.pannerNode.rolloffFactor = AUDIO_SETTINGS.rolloffFactor;
        instance.pannerNode.refDistance = AUDIO_SETTINGS.refDistance;
        instance.pannerNode.maxDistance = AUDIO_SETTINGS.maxDistance;
      }
      instance.pannerNode.positionX.setValueAtTime(options.position.x, this.context.currentTime);
      instance.pannerNode.positionY.setValueAtTime(options.position.y, this.context.currentTime);
      instance.pannerNode.positionZ.setValueAtTime(options.position.z, this.context.currentTime);

      instance.source.connect(instance.pannerNode);
      instance.pannerNode.connect(instance.gainNode);
    } else {
      instance.source.connect(instance.gainNode);
    }

    instance.gainNode.connect(this.categoryGains.get(options?.category ?? clip.category) ?? this.masterGain!);

    instance.playing = true;
    instance.source.start(0);

    // Handle end
    instance.source.onended = () => {
      instance.playing = false;
      this.returnToPool(instance);
    };

    this.activeSounds.push(instance);
    return instance;
  }

  private createSoundInstance(clip: AudioClip): SoundInstance {
    const gainNode = this.context!.createGain();
    return {
      source: this.context!.createBufferSource(),
      gainNode,
      pannerNode: null,
      clip,
      playing: false,
    };
  }

  private returnToPool(instance: SoundInstance): void {
    instance.source.disconnect();
    instance.gainNode.disconnect();
    if (instance.pannerNode) instance.pannerNode.disconnect();
    instance.playing = false;
    this.soundPool.push(instance);
    this.activeSounds = this.activeSounds.filter(s => s !== instance);
  }

  stopAll(): void {
    for (const instance of this.activeSounds) {
      try { instance.source.stop(); } catch {}
      this.returnToPool(instance);
    }
    this.activeSounds = [];
  }

  stopMusic(): void {
    if (this.musicSource) {
      try { this.musicSource.stop(); } catch {}
      this.musicSource = null;
    }
  }

  playMusic(name: string, fadeIn: number = 1.0): void {
    this.stopMusic();
    const instance = this.play(name, { loop: true, category: "music", volume: 0 });
    if (instance) {
      this.musicSource = instance.source;
      this.musicGain = instance.gainNode;
      // Fade in
      const targetVolume = AUDIO_SETTINGS.musicVolume;
      const startTime = this.context!.currentTime;
      const animateFade = () => {
        const elapsed = this.context!.currentTime - startTime;
        const progress = Math.min(1, elapsed / fadeIn);
        if (this.musicGain) {
          this.musicGain.gain.value = targetVolume * progress;
        }
        if (progress < 1) requestAnimationFrame(animateFade);
      };
      animateFade();
    }
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
      AUDIO_SETTINGS.masterVolume = volume;
    }
  }

  setCategoryVolume(category: AudioCategory, volume: number): void {
    const gain = this.categoryGains.get(category);
    if (gain) {
      gain.gain.value = Math.max(0, Math.min(1, volume));
      (AUDIO_SETTINGS as any)[`${category}Volume`] = volume;
    }
  }

  getCategoryVolume(category: AudioCategory): number {
    const key = `${category}Volume` as keyof AudioSettings;
    return AUDIO_SETTINGS[key] as number;
  }

  toggleMute(): boolean {
    if (this.masterGain) {
      const muted = this.masterGain.gain.value === 0;
      this.masterGain.gain.value = muted ? AUDIO_SETTINGS.masterVolume : 0;
      return !muted;
    }
    return true;
  }

  isMuted(): boolean {
    return this.masterGain?.gain.value === 0;
  }

  setListenerPosition(position: THREE.Vector3, orientation?: { forward: THREE.Vector3; up: THREE.Vector3 }): void {
    if (this.context?.listener) {
      this.context.listener.positionX.setValueAtTime(position.x, this.context.currentTime);
      this.context.listener.positionY.setValueAtTime(position.y, this.context.currentTime);
      this.context.listener.positionZ.setValueAtTime(position.z, this.context.currentTime);

      if (orientation) {
        this.context.listener.forwardX.setValueAtTime(orientation.forward.x, this.context.currentTime);
        this.context.listener.forwardY.setValueAtTime(orientation.forward.y, this.context.currentTime);
        this.context.listener.forwardZ.setValueAtTime(orientation.forward.z, this.context.currentTime);
        this.context.listener.upX.setValueAtTime(orientation.up.x, this.context.currentTime);
        this.context.listener.upY.setValueAtTime(orientation.up.y, this.context.currentTime);
        this.context.listener.upZ.setValueAtTime(orientation.up.z, this.context.currentTime);
      }
    }
  }

  suspend(): void {
    if (this.context?.state === "running") {
      this.context.suspend();
      this.suspended = true;
    }
  }

  resume(): void {
    if (this.context?.state === "suspended") {
      this.context.resume();
      this.suspended = false;
    }
  }

  dispose(): void {
    this.stopAll();
    this.stopMusic();
    if (this.context) {
      this.context.close();
      this.context = null;
    }
    this.clips.clear();
    this.soundPool.length = 0;
    this.initialized = false;
  }
}

// Singleton instance
let audioEngineInstance: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!audioEngineInstance) {
    audioEngineInstance = new AudioEngine();
  }
  return audioEngineInstance;
}

export async function initializeAudio(): Promise<AudioEngine> {
  const engine = getAudioEngine();
  await engine.initialize();
  return engine;
}

// Import THREE for Vector3 in options
import * as THREE from "three";