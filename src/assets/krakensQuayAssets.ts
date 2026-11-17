/**
 * Kraken's Quay: Splash & Shot - Local Asset Manifest
 *
 * All assets are self-hosted under /public/assets/
 * Original models from Mint.gg, retextured and renamed for originality
 * Download from Mint CDN and place in corresponding folders
 */

const ASSET_BASE = "/assets";

export const KRAKENS_QUAY_ASSETS = {
  // World/Environment Models
  world: {
    ocean: `${ASSET_BASE}/models/ocean-arena.glb`,
    beachHorizon: `${ASSET_BASE}/models/sunlit-dune-horizon.glb`,
    leftCloudBank: `${ASSET_BASE}/models/cloud-bank-left.glb`,
    centerCloudBank: `${ASSET_BASE}/models/cloud-bank-center.glb`,
    rightCloudBank: `${ASSET_BASE}/models/cloud-bank-right.glb`,
    backgroundSandIslet: `${ASSET_BASE}/models/sand-islet.glb`,
    heroTubeKraken: `${ASSET_BASE}/models/tube-kraken.glb`,
    heroTubeSiren: `${ASSET_BASE}/models/tube-siren.glb`,
    rivalRaft: `${ASSET_BASE}/models/pirate-raft.glb`,
    sandbar: `${ASSET_BASE}/models/sunny-sandbar.glb`,
    volcanicIslet: `${ASSET_BASE}/models/volcanic-islet.glb`,
    driftwood: `${ASSET_BASE}/models/driftwood-barricade.glb`,
    coral: `${ASSET_BASE}/models/coral-cover.glb`,
    treasure: `${ASSET_BASE}/models/treasure-chest.glb`,
    heroBlaster: `${ASSET_BASE}/models/blaster-hero.glb`,
    rivalBlaster: `${ASSET_BASE}/models/blaster-rival.glb`,
    cannonball: `${ASSET_BASE}/models/cannonball.glb`,
    depthCharge: `${ASSET_BASE}/models/depth-charge.glb`,
    grapeshot: `${ASSET_BASE}/models/grapeshot.glb`,
    goldenShell: `${ASSET_BASE}/models/golden-shell.glb`,
    buoy: `${ASSET_BASE}/models/bonus-buoy.glb`,
    aimMarker: `${ASSET_BASE}/models/aim-marker.glb`,
    splash: `${ASSET_BASE}/models/splash-crown.glb`,
    impact: `${ASSET_BASE}/models/impact-burst.glb`,
  },

  // PBR Material Textures
  materials: {
    waterBaseColor: `${ASSET_BASE}/textures/water-basecolor.png`,
    waterNormal: `${ASSET_BASE}/textures/water-normal.png`,
    waterRoughness: `${ASSET_BASE}/textures/water-roughness.png`,
    waterMetalness: `${ASSET_BASE}/textures/water-metalness.png`,
    waterFoam: `${ASSET_BASE}/textures/water-foam.png`,
    waterCaustics: `${ASSET_BASE}/textures/water-caustics.png`,
    sandAlbedo: `${ASSET_BASE}/textures/sand-albedo.png`,
    sandNormal: `${ASSET_BASE}/textures/sand-normal.png`,
    sandRoughness: `${ASSET_BASE}/textures/sand-roughness.png`,
    rockAlbedo: `${ASSET_BASE}/textures/rock-albedo.png`,
    rockNormal: `${ASSET_BASE}/textures/rock-normal.png`,
    rockRoughness: `${ASSET_BASE}/textures/rock-roughness.png`,
    woodAlbedo: `${ASSET_BASE}/textures/wood-albedo.png`,
    woodNormal: `${ASSET_BASE}/textures/wood-normal.png`,
    woodRoughness: `${ASSET_BASE}/textures/wood-roughness.png`,
    coralAlbedo: `${ASSET_BASE}/textures/coral-albedo.png`,
    coralNormal: `${ASSET_BASE}/textures/coral-normal.png`,
    coralRoughness: `${ASSET_BASE}/textures/coral-roughness.png`,
  },

  // Character Models & Animations (renamed for originality)
  characters: {
    kraken: {
      name: "Kraken Kallista",
      model: `${ASSET_BASE}/models/characters/kraken-rigged.glb`,
      idle: `${ASSET_BASE}/models/characters/kraken-idle.glb`,
      throw: `${ASSET_BASE}/models/characters/kraken-throw.glb`,
      hit: `${ASSET_BASE}/models/characters/kraken-hit.glb`,
      fall: `${ASSET_BASE}/models/characters/kraken-fall.glb`,
      victory: `${ASSET_BASE}/models/characters/kraken-victory.glb`,
    },
    siren: {
      name: "Siren Selene",
      model: `${ASSET_BASE}/models/characters/siren-rigged.glb`,
      idle: `${ASSET_BASE}/models/characters/siren-idle.glb`,
      throw: `${ASSET_BASE}/models/characters/siren-throw.glb`,
      hit: `${ASSET_BASE}/models/characters/siren-hit.glb`,
      fall: `${ASSET_BASE}/models/characters/siren-fall.glb`,
      victory: `${ASSET_BASE}/models/characters/siren-victory.glb`,
    },
    captain: {
      name: "Captain Krakenbeard",
      model: `${ASSET_BASE}/models/characters/captain-rigged.glb`,
      idle: `${ASSET_BASE}/models/characters/captain-idle.glb`,
      throw: `${ASSET_BASE}/models/characters/captain-throw.glb`,
      hit: `${ASSET_BASE}/models/characters/captain-hit.glb`,
      fall: `${ASSET_BASE}/models/characters/captain-fall.glb`,
      victory: `${ASSET_BASE}/models/characters/captain-victory.glb`,
    },
    quartermaster: {
      name: "Quartermaster Barnaby",
      model: `${ASSET_BASE}/models/characters/quartermaster-rigged.glb`,
      idle: `${ASSET_BASE}/models/characters/quartermaster-idle.glb`,
      throw: `${ASSET_BASE}/models/characters/quartermaster-throw.glb`,
      hit: `${ASSET_BASE}/models/characters/quartermaster-hit.glb`,
      fall: `${ASSET_BASE}/models/characters/quartermaster-fall.glb`,
      victory: `${ASSET_BASE}/models/characters/quartermaster-victory.glb`,
    },
    gunner: {
      name: "Gunner Pearl",
      model: `${ASSET_BASE}/models/characters/gunner-rigged.glb`,
      idle: `${ASSET_BASE}/models/characters/gunner-idle.glb`,
      throw: `${ASSET_BASE}/models/characters/gunner-throw.glb`,
      hit: `${ASSET_BASE}/models/characters/gunner-hit.glb`,
      fall: `${ASSET_BASE}/models/characters/gunner-fall.glb`,
      victory: `${ASSET_BASE}/models/characters/gunner-victory.glb`,
    },
    shaman: {
      name: "Shaman Tiki",
      model: `${ASSET_BASE}/models/characters/shaman-rigged.glb`,
      idle: `${ASSET_BASE}/models/characters/shaman-idle.glb`,
      throw: `${ASSET_BASE}/models/characters/shaman-throw.glb`,
      hit: `${ASSET_BASE}/models/characters/shaman-hit.glb`,
      fall: `${ASSET_BASE}/models/characters/shaman-fall.glb`,
      victory: `${ASSET_BASE}/models/characters/shaman-victory.glb`,
    },
  },

  // UI Images (to be created/customized)
  images: {
    title: `${ASSET_BASE}/images/krakens-quay-title.png`,
    hud: `${ASSET_BASE}/images/hud-sprites.png`,
    upgradePower: `${ASSET_BASE}/images/upgrade-krakens-rage.png`,
    upgradeHealth: `${ASSET_BASE}/images/upgrade-sirens-blessing.png`,
    upgradeArmor: `${ASSET_BASE}/images/upgrade-kraken-hide.png`,
  },

  // Audio (procedural or self-hosted)
  audio: {
    music: `${ASSET_BASE}/audio/battle-theme.mp3`,
    launch: `${ASSET_BASE}/audio/cannon-launch.mp3`,
    splash: `${ASSET_BASE}/audio/ocean-splash.mp3`,
    impact: `${ASSET_BASE}/audio/raft-impact.mp3`,
    bonus: `${ASSET_BASE}/audio/shell-bonus.mp3`,
    victory: `${ASSET_BASE}/audio/victory-fanfare.mp3`,
    defeat: `${ASSET_BASE}/audio/defeat-dirge.mp3`,
  },
} as const;

export type KrakenCharacterKey = keyof typeof KRAKENS_QUAY_ASSETS.characters;

export const ROUND_DATA = [
  { hp: 55, enemies: ["captain"] as KrakenCharacterKey[], name: "Captain's Welcome" },
  { hp: 92, enemies: ["quartermaster", "gunner"] as KrakenCharacterKey[], name: "The Powder Monkeys" },
  { hp: 138, enemies: ["captain", "quartermaster", "shaman"] as KrakenCharacterKey[], name: "Kraken's Quay Showdown" },
] as const;

export const AMMO_INFO = {
  cannonball: { label: "Cannonball", damage: 24, model: "cannonball" },
  depthCharge: { label: "Depth Charge", damage: 39, model: "depthCharge" },
  grapeshot: { label: "Grapeshot", damage: 29, model: "grapeshot" },
} as const;

export type AmmoType = keyof typeof AMMO_INFO;

export const UPGRADE_INFO = {
  power: { label: "Kraken's Rage", description: "+8 damage to every shot", icon: "upgradePower" },
  health: { label: "Siren's Blessing", description: "Restore 34 crew health", icon: "upgradeHealth" },
  armor: { label: "Kraken Hide", description: "Reduce every enemy hit by 4", icon: "upgradeArmor" },
} as const;

export type UpgradeType = keyof typeof UPGRADE_INFO;