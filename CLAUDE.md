# CLAUDE.md - Developer Guide for Reef Rivals: Treasure Tide

This repository contains the exact **Reef Rivals: Treasure Tide** experience from [`mintdotgg/mint-playground/experiences/reef-rivals`](https://github.com/mintdotgg/mint-playground/tree/main/experiences/reef-rivals).

---

## 🌴 Project Architecture

* **Framework**: React 19 + TypeScript + Vite + Three.js
* **3D Assets & Rigged Characters**: Loaded dynamically via `https://cdn.mint.gg/`
  * Characters: **Kai Tide**, **Nia Tide**, **Brinebeard**, **Patch**, **Pearl**, **Tiki**
  * GLTF Skeletal Animations: `idle`, `throw`, `hit`, `fall`, `victory`
  * Environment: Ocean arena, sunlit dune beach horizon, puffy clouds, volcanic islet, sand islet, driftwood, coral
  * Weapons & Effects: Coconut, Pineapple bomb, Pebble volley, Splash crowns, Impact bursts
* **Audio**: Original Mint audio clips (music, launch, splash, impact, bonus, victory, defeat)

---

## 📁 File Structure

```text
mini-battle/
├── index.html                   # HTML entry mount point
├── package.json                 # React, Three.js, Vite dependencies
├── tsconfig.json                # TypeScript bundler configuration
├── vite.config.ts               # Vite configuration (base: "./")
├── CLAUDE.md                    # Instructions for Claude and AI agents
├── README.md                    # User guide and live links
├── .github/workflows/deploy.yml # GitHub Pages build & automated release workflow
└── src/
    ├── main.tsx                 # React DOM root entry
    ├── ReefRivals.tsx           # Full 3D game logic, Three.js scene, physics & UI
    ├── reefRivalsMintAssets.ts  # Mint.gg CDN model, animation & audio URLs
    ├── styles.css               # Arcade tropical HUD styling
    └── vite-env.d.ts            # Vite client types
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

## 🎮 Game Logic & Extension Guide for Claude

* **Game State (`ReefRivals.tsx`)**:
  - `Phase`: `"loading"` | `"menu"` | `"player"` | `"projectile"` | `"enemy"` | `"upgrade"` | `"won"` | `"lost"`
  - `Round`: 1 (Brinebeard), 2 (Pearl & Patch), 3 (Showdown)
  - `Ammo`: `"coconut"` (24 dmg), `"pineapple"` (39 dmg), `"volley"` (29 dmg)
  - `Upgrades`: `"power"` (+15% dmg), `"patch"` (+40 HP), `"armor"` (reduces damage taken)
* **Animation Mixer**:
  - Uses `three/addons/utils/SkeletonUtils.js` (`cloneSkeleton`) to clone rigged characters with separate animation mixers.
  - Characters transition smoothly between `idle`, `throw`, `hit`, `fall`, and `victory` clips.
