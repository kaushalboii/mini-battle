/**
 * Audio module exports - Compatibility layer for KrakenQuay
 */
import { getAudioEngine, initializeAudio } from "./AudioEngine";

const enginePromise = initializeAudio();

export const sound = {
  get muted(): boolean {
    return getAudioEngine().isMuted();
  },

  toggleMute(): boolean {
    return getAudioEngine().toggleMute();
  },

  isMuted(): boolean {
    return getAudioEngine().isMuted();
  },

  ensureContext(): void {
    getAudioEngine().resume();
  },

  playCannonFire(): void {
    getAudioEngine().play("cannon-launch", { category: "sfx", volume: 0.7 });
  },

  playChargeTick(ratio: number): void {
    getAudioEngine().play("charge-up", { category: "sfx", volume: 0.08 * ratio });
  },

  playWaterSplash(): void {
    getAudioEngine().play("ocean-splash", { category: "sfx", volume: 0.6 });
  },

  playImpactHit(isCritical: boolean): void {
    getAudioEngine().play(isCritical ? "raft-impact" : "cannon-launch", {
      category: "sfx",
      volume: isCritical ? 0.75 : 0.5,
      pitch: isCritical ? 1.2 : 1.0,
    });
  },

  playSplitSound(): void {
    getAudioEngine().play("shell-bonus", { category: "sfx", volume: 0.6 });
  },

  playVictory(): void {
    getAudioEngine().play("victory-fanfare", { category: "music", volume: 0.5 });
  },

  playDefeat(): void {
    getAudioEngine().play("defeat-dirge", { category: "music", volume: 0.5 });
  },
};

export * from "./AudioEngine";
export { getAudioEngine, initializeAudio };