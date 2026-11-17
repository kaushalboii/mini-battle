# CLAUDE.md - Developer Guide for Kraken's Quay: Splash & Shot

Rich 3D turn-based arcade projectile battle built with React 19, TypeScript, Vite, and Three.js.

---

## 🌴 Project Architecture

* **Framework**: React 19 + TypeScript + Vite + Three.js
* **3D Rigged Characters & GLTF Animations**:
  * Characters: **Kai Tide**, **Nia Tide**, **Captain Brinebeard**, **Patch Deckhand**, **Pearl Poacher**, **Tiki Tom**
  * Skeletal Animation Clips: `idle`, `throw`, `hit`, `fall`, `victory` (handled via `AnimationMixer` & `SkeletonUtils.clone`)
  * Environment: Ocean arena, sunlit dune beach horizon, puffy clouds, volcanic islet, sand islet, driftwood, coral
  * Weapons & Effects: Coconut, Pineapple bomb, Pebble volley, Splash crowns, Impact bursts
* **Audio**: High-energy Caribbean battle music, coconut launch, splash, impact, bonus, victory, and defeat sound clips.

---

## 📁 File Structure

```text
mini-battle/
├── .github/
│   └── workflows/
│       └── deploy.yml            # Automated GitHub Pages deploy & release workflow
├── src/
│   ├── assets/
│   │   └── krakensQuayAssets.ts  # Central GLTF 3D models, audio, textures & images
│   ├── components/
│   │   └── KrakensQuay.tsx       # Main 3D Game Canvas, Three.js loop, camera & HUD
│   ├── game/
│   │   ├── types.ts              # TypeScript interfaces (Phase, Ammo, Upgrade, UiState)
│   │   └── constants.ts          # Round configs, weapon damage balance & initial state
│   ├── styles/
│   │   └── krakens-quay.css      # Responsive arcade HUD, modals & health styling
│   ├── main.tsx                  # React DOM root entry
│   └── vite-env.d.ts             # Vite client types
├── index.html                    # HTML mount point
├── package.json                  # Scripts and dependencies
├── tsconfig.json                 # TypeScript compiler config
├── vite.config.ts                # Vite config (base: "./")
├── CLAUDE.md                     # AI agent developer guide
└── README.md                     # Documentation & live links
```

---

## ⚡ Development Commands

```bash
# Start local development server
npm run dev

# Build production bundle into /dist
npm run build

# Preview production build locally
npm run preview
```

---

## 🎮 Game Logic & Extension Guide

* **Game State (`src/game/types.ts`)**:
  - `Phase`: `"loading"` | `"menu"` | `"player"` | `"projectile"` | `"enemy"` | `"upgrade"` | `"won"` | `"lost"`
  - `Round`: 1 (Brinebeard's Welcome), 2 (Pearl Poachers), 3 (Kraken's Quay Showdown)
  - `Ammo`: `"coconut"` (24 dmg), `"pineapple"` (39 dmg), `"volley"` (29 dmg)
  - `Upgrades`: `"power"` (+8 dmg), `"patch"` (+34 HP), `"armor"` (-4 enemy dmg)
* **Animation Mixer**:
  - Uses `three/addons/utils/SkeletonUtils.js` (`clone`) to clone rigged characters with separate animation mixers.
  - Characters transition smoothly between `idle`, `throw`, `hit`, `fall`, and `victory` clips.
