import type { UiState, KrakensCharacterKey, Ammo } from "./types";
import { KRAKENS_QUAY_ASSETS as ASSETS } from "../assets/krakensQuayAssets";

export const INITIAL_UI: UiState = {
  phase: "loading",
  round: 1,
  playerHp: 100,
  enemyHp: 55,
  enemyMax: 55,
  angle: 35,
  power: 68,
  ammo: "coconut",
  pineapple: 0,
  volley: 0,
  shells: 0,
  status: "Loading Kraken's Quay…",
  loading: "Calling in the Fleet…",
  sound: true,
};

export const ROUND_DATA = [
  {
    hp: 55,
    enemies: ["captain"] as KrakensCharacterKey[],
    name: "Brinebeard's Welcome Party",
  },
  {
    hp: 92,
    enemies: ["patch", "pearl"] as KrakensCharacterKey[],
    name: "The Pearl Poachers",
  },
  {
    hp: 138,
    enemies: ["captain", "patch", "tiki"] as KrakensCharacterKey[],
    name: "Kraken's Quay Showdown",
  },
] as const;

export const AMMO_INFO: Record<
  Ammo,
  { label: string; damage: number; model: keyof typeof ASSETS.world }
> = {
  coconut: { label: "Coconut", damage: 24, model: "coconut" },
  pineapple: { label: "Pineapple", damage: 39, model: "pineapple" },
  volley: { label: "Pebble Volley", damage: 29, model: "volley" },
};

