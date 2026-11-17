export type Phase =
  | "loading"
  | "menu"
  | "player"
  | "projectile"
  | "enemy"
  | "upgrade"
  | "won"
  | "lost"
  | "error";

export type Ammo = "coconut" | "pineapple" | "volley";

export type Upgrade = "power" | "patch" | "armor";

export interface UiState {
  phase: Phase;
  round: number;
  playerHp: number;
  enemyHp: number;
  enemyMax: number;
  angle: number;
  power: number;
  ammo: Ammo;
  pineapple: number;
  volley: number;
  shells: number;
  status: string;
  loading: string;
  sound: boolean;
}

export interface GameController {
  start: () => void;
  fire: () => void;
  setAngle: (value: number) => void;
  setPower: (value: number) => void;
  setAmmo: (ammo: Ammo) => void;
  chooseUpgrade: (upgrade: Upgrade) => void;
  toggleSound: () => void;
}

export type KrakensCharacterKey =
  | "kai"
  | "nia"
  | "captain"
  | "patch"
  | "pearl"
  | "tiki";

export interface RoundConfig {
  hp: number;
  enemies: KrakensCharacterKey[];
  name: string;
}

export interface AmmoConfig {
  label: string;
  damage: number;
  model: string;
}

