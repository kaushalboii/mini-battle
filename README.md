# 🦑 Kraken's Quay: Splash & Shot

**Premium 4K Tropical Turn-Based Projectile Battle Game**

[![Play Live](https://img.shields.io/badge/Play-Live-brightgreen?style=for-the-badge&logo=github)](https://kaushalboii.github.io/mini-battle/)
[![Release](https://img.shields.io/github/v/release/kaushalboii/mini-battle?style=for-the-badge)](https://github.com/kaushalboii/mini-battle/releases)
[![License](https://img.shields.io/github/license/kaushalboii/mini-battle?style=for-the-badge)](LICENSE)

---

## 🎮 Play Now

**[▶️ https://kaushalboii.github.io/mini-battle/](https://kaushalboii.github.io/mini-battle/)**

---

## 🌊 Game Overview

Command your raft in a tactical turn-based cannon duel against the Kraken's pirate fleet. Set your angle, charge your shot, account for wind, and sink enemy vessels across 3 escalating rounds.

### ✨ Features

| Feature | Description |
|---------|-------------|
| **Three Weapons** | 🥥 Coconut (∞ basic) · 🍍 Pineapple Bomb (3× explosive) · 🍉 Watermelon Split (2× cluster) |
| **Power Charging** | Hold FIRE to charge power meter, release for precise velocity |
| **Drag-to-Aim** | Intuitive 3D canvas drag + slider fine-tuning |
| **Dynamic Wind** | Crosswind affects every projectile trajectory |
| **3 Rounds** | Scout Skiff → Twin Corsair → Dread Boss |
| **Procedural Audio** | Web Audio API synthesis (zero external files) |
| **Premium Visuals** | PBR materials, Gerstner waves, particles, camera shake |
| **Responsive** | Mobile-friendly, landscape & portrait support |

---

## 🎯 Controls

| Input | Action |
|-------|--------|
| **Drag on 3D view** | Aim cannon |
| **Elevation / Yaw sliders** | Fine-tune aim |
| **1 / 2 / 3 keys** | Select weapon |
| **Hold SPACE / FIRE** | Charge power |
| **Release SPACE / FIRE** | Shoot |

---

## 🛠️ Development

### Prerequisites
- Node.js 20+
- npm 10+

### Install
```bash
npm install
```

### Commands
```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Production build to ./dist
npm run preview  # Preview production build
npm run lint     # ESLint check
npm run format   # Prettier format
```

---

## 📁 Project Structure

```
mini-battle/
├── .github/workflows/deploy.yml   # GitHub Pages + Release workflow
├── index.html                      # HTML entry point
├── package.json                    # Dependencies & scripts
├── package-lock.json               # Locked dependencies
├── tsconfig.json                   # TypeScript config
├── vite.config.ts                  # Vite config (base: "./")
├── CLAUDE.md                       # AI agent instructions
├── LICENSE                         # MIT License
├── README.md                       # This file
└── src/
    ├── main.tsx                    # React DOM entry (renders KrakenQuay)
    ├── KrakenQuay.tsx              # Main game component (React + Three.js)
    ├── styles.css                  # Complete game styling
    ├── vite-env.d.ts               # Vite type declarations
    ├── audio.d.ts                  # Audio engine types
    ├── scene.d.ts                  # WorldScene types
    ├── scene.js                    # Three.js scene, water, lighting, environment
    ├── entities/
    │   ├── player.js               # Player raft, cannon, trajectory, health
    │   ├── player.d.ts
    │   ├── enemy.js                # Enemy fleet (3 rounds), AI targeting
    │   ├── enemy.d.ts
    │   ├── projectile.js           # Physics projectiles, split logic
    │   └── projectile.d.ts
    ├── fx/
    │   ├── particles.js            # Splash, explosion, muzzle flash
    │   └── particles.d.ts
    ├── audio/
    │   ├── AudioEngine.ts          # Procedural Web Audio synthesis
    │   └── index.ts
    ├── rendering/
    │   ├── PremiumRenderer.ts      # HDR, Bloom, SSAO, FXAA, Color Grading
    │   ├── WaterShader.ts          # Gerstner waves, caustics, foam, Fresnel
    │   ├── ParticleSystem.ts       # GPU InstancedMesh particles
    │   └── index.ts
    └── assets/
        └── krakensQuayAssets.ts    # Local asset manifest (self-hosted)
```

---

## 🚀 Deployment

### Automatic (GitHub Pages)
Push to `main` branch → GitHub Actions builds & deploys:
1. `npm ci` → `npm run build`
2. Upload `./dist` to GitHub Pages
3. Create Release `v2.0.<run_number>`

**Live URL**: https://kaushalboii.github.io/mini-battle/

### Manual
```bash
npm run build
# Deploy ./dist to any static host (Netlify, Vercel, Cloudflare Pages, etc.)
```

---

## 🔧 Tech Stack

- **React 19** + **TypeScript** + **Vite**
- **Three.js r185** (WebGL 3D)
- **Web Audio API** (procedural synthesis)
- **Custom Shaders** (GLSL water, post-processing)
- **GitHub Actions** (CI/CD)

---

## 📝 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🤝 Credits

- Built with [Claude Code](https://claude.com/claude-code)
- Inspired by [Mint Playground](https://mint.gg) Reef Rivals
- Three.js by [mrdoob](https://github.com/mrdoob/three.js)

---

**Enjoy the battle!** 🦑💥