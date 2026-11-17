# 🥥 Reef Rivals: Mini-Battle

> A vibrant 3D tropical turn-based projectile battler built with **Three.js** and WebGL, inspired by [Reef Rivals: Treasure Tide](https://github.com/mintdotgg/mint-playground/tree/main/experiences/reef-rivals) from `mintdotgg/mint-playground`.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Three.js](https://img.shields.io/badge/Three.js-v0.187.0-brightgreen.svg)
![Zero Assets Required](https://img.shields.io/badge/Assets-100%25%20Procedural-orange.svg)

---

## 🌊 Overview

Take command of a tube-riding hero on a tropical wooden raft! Across the coral lagoon, a pirate armada is encroaching on your peaceful waters. Aim your swivel cannon, charge up your launch power, account for tropical crosswinds, and blast the pirate rafts into the ocean across 3 escalating rounds!

---

## ✨ Features & Improvements

* 🎯 **Dynamic Ballistics & 3D Trajectory**: Real-time parabolic arc preview that updates as you adjust elevation, yaw, power, and crosswinds.
* 🍍 **Specialized Tropical Arsenal**:
  * 🥥 **Coconut Cannonball**: High velocity, steady direct hit damage (infinite ammo).
  * 🍍 **Explosive Pineapple**: High blast radius, destructive splash damage (3 uses).
  * 🍉 **Watermelon Cluster**: Splits mid-air into 3 sub-munitions for multi-target hits (2 uses).
* 🏴‍☠️ **3 Escalating Enemy Rounds**:
  * **Round 1 (Scout Skiff)**: *Pegleg Pete* on a light raft with basic cannon.
  * **Round 2 (Corsair Catamaran)**: *Barnaby & Bones* on a dual-hull raft with shields.
  * **Round 3 (Boss Flagship)**: *Captain Dread-Beard* on a heavily armored war-raft with skull flag and twin cannons.
* 🎥 **Cinematic Action Camera**:
  * Seamlessly transitions from player aiming perspective to dynamic chase cam tracking projectiles in flight.
  * Screen shake and slow-motion impacts on hits.
* 🔊 **Procedural Web Audio Engine**:
  * 100% generated with the Web Audio API — cannon thumps, flying whooshes, water splashes, explosive wood crunches, and victory fanfare without needing external `.mp3` or `.wav` files.
* 🌴 **Procedural 3D Environment**:
  * Animated low-poly vertex ocean waves, sand atolls, palm trees, reef rocks, and drifting clouds.
  * Realistic raft buoyancy and tilt physics synchronized with the water waves.

---

## 🕹️ Controls & How to Play

| Action | Control |
| :--- | :--- |
| **Aim Yaw & Elevation** | Drag on the 3D scene **OR** use the Elevation & Yaw sliders |
| **Charge Power & Fire** | **Hold** the `HOLD TO FIRE` button to charge up power, then **release** to shoot |
| **Quick Fire** | Click `HOLD TO FIRE` directly to fire at the current power level |
| **Switch Weapon** | Click on 🥥 Coconut, 🍍 Pineapple, or 🍉 Watermelon |
| **Sound Toggle** | Click the 🔊 button in the top-right corner |
| **Restart Game** | Click the 🔄 button in the top-right corner |

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v16 or higher)

### Run Locally
```bash
# Clone the repository
git clone https://github.com/kaushalboii/mini-battle.git
cd mini-battle

# Install dependencies
npm install

# Start local server
npm start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to play!

---

## 🤖 Linking with Claude & AI Coding Agents

This project contains a comprehensive [CLAUDE.md](file:///Users/kaushal/Downloads/mini-battle/CLAUDE.md) file in the root directory. Claude Code, Cursor, or any coding agent can immediately understand the architecture, physics constants, entity models, and extension patterns.

---

## 📜 License

MIT License. Built for fun and learning!

