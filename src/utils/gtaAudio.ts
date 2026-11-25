/**
 * Mini Battle UI Sound Synthesizer using Web Audio API.
 * Synthesizes crisp menu hover ticks, select chimes, and back tones with zero external assets.
 */

const STORAGE_MUTED = 'miniBattle.sfxMuted';
const STORAGE_VOLUME = 'miniBattle.sfxVolume';

let audioCtx: AudioContext | null = null;
let _muted = false;
let _volume = 0.8;

try {
  _muted = localStorage.getItem(STORAGE_MUTED) === 'true';
  const storedVol = localStorage.getItem(STORAGE_VOLUME);
  if (storedVol !== null) {
    const parsed = Number(storedVol);
    if (Number.isFinite(parsed)) _volume = Math.max(0, Math.min(1, parsed));
  }
} catch {
  // Ignore storage restrictions
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export const GtaAudio = {
  isMuted(): boolean {
    return _muted;
  },

  setMuted(muted: boolean) {
    _muted = Boolean(muted);
    try {
      localStorage.setItem(STORAGE_MUTED, String(_muted));
    } catch {
      // Ignore
    }
  },

  getVolume(): number {
    return _volume;
  },

  setVolume(vol: number) {
    _volume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem(STORAGE_VOLUME, String(_volume));
    } catch {
      // Ignore
    }
  },

  playHover() {
    if (_muted || _volume <= 0.01) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.035);

      gain.gain.setValueAtTime(0.08 * _volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {
      // Ignore if audio locked
    }
  },

  playSelect() {
    if (_muted || _volume <= 0.01) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.setValueAtTime(1320, now + 0.04);

      gain1.gain.setValueAtTime(0.085 * _volume, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.12);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(440, now);
      gain2.gain.setValueAtTime(0.055 * _volume, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now);
      osc2.stop(now + 0.09);
    } catch {
      // Ignore if audio locked
    }
  },

  playBack() {
    if (_muted || _volume <= 0.01) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.06);

      gain.gain.setValueAtTime(0.075 * _volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch {
      // Ignore if audio locked
    }
  },

  playTabSwitch() {
    if (_muted || _volume <= 0.01) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.linearRampToValueAtTime(1600, now + 0.05);

      gain.gain.setValueAtTime(0.065 * _volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch {
      // Ignore
    }
  },
};
