# 🦑 Kraken's Quay: Splash & Shot

> A rich 3D tropical turn-based projectile battle game built with **Three.js**, **React 19**, and WebGL.

[![Play Live](https://img.shields.io/badge/Play-Live-brightgreen?style=for-the-badge&logo=github)](https://kaushalboii.github.io/mini-battle/)
[![Release](https://img.shields.io/github/v/release/kaushalboii/mini-battle?style=for-the-badge)](https://github.com/kaushalboii/mini-battle/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge)](LICENSE)

---

## 🎮 Play Live

**👉 [https://kaushalboii.github.io/mini-battle/](https://kaushalboii.github.io/mini-battle/)**

---

## 🌴 Overview

Take command of the Tide Guard on a tropical inner-tube and wooden raft! Across the turquoise lagoon, Captain Brinebeard's armada is encroaching on Kraken's Quay. Aim your trajectory, set your power, account for drift, and blast the pirate crew overboard across 3 escalating rounds!

---

## ✨ Features

* 🎯 **Dynamic Ballistics & 3D Aiming**: Adjust elevation angle ($15^\circ$ to $76^\circ$) and launch velocity ($35\%$ to $100\%$) with real-time aim marker tracking.
* 🍍 **Specialized Tropical Arsenal**:
  * 🥥 **Coconut Cannonball**: High velocity, steady direct hit damage (infinite ammo).
  * 🍍 **Explosive Pineapple**: High blast radius, destructive damage (bonus per round).
  * 🪨 **Pebble Volley**: Triple spread volley for multi-target hits.
* 🏴‍☠️ **Rigged Animated 3D Characters**:
  * **Kai Tide** & **Nia Tide** (Player team)
  * **Captain Brinebeard**, **Patch Deckhand**, **Pearl Poacher**, & **Tiki Tom** (Kraken crew)
  * Real skeletal animations for `idle`, `throw`, `hit`, `fall` overboard, and `victory` cheer!
* 🏝️ **3D Tropical Lagoon Environment**:
  * PBR water with dynamic ripple animation and wave displacement.
  * Dune beach horizon, drifting puffy clouds, volcanic islets, and coral cover.
* 🔊 **Arcade Audio**:
  * Caribbean pirate battle loop, launch thumps, ocean splashes, and victory fanfare.

---

## 📁 Clean Architecture

```text
src/
├── assets/
│   └── krakensQuayAssets.ts  # Central 3D GLTF models, audio, textures & images
├── components/
│   └── KrakensQuay.tsx       # Main 3D Game Canvas & controller component
├── game/
│   ├── types.ts              # TypeScript interfaces (Phase, Ammo, Upgrade, UiState)
│   └── constants.ts          # Round configs, weapon damage balance & initial state
├── styles/
│   └── krakens-quay.css      # Responsive arcade HUD, modals & health styling
├── main.tsx                  # React entry point
└── vite-env.d.ts
```

---

## ⚡ Development

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Build production bundle into /dist
npm run build

# Preview production build locally
npm run preview
```
