export const sound: {
  ctx: AudioContext | null;
  muted: boolean;
  masterGain: GainNode | null;
  ambientGain: GainNode | null;
  initialized: boolean;
  init(): void;
  ensureContext(): void;
  toggleMute(): boolean;
  playCannonFire(): void;
  playChargeTick(ratio: number): void;
  playWaterSplash(): void;
  playImpactHit(isCritical: boolean): void;
  playSplitSound(): void;
  playVictory(): void;
  playDefeat(): void;
};