# 🏎️ Apex Drift 3D • Grand Prix Circuit

> A high-octane 3D arcade racer built with **PixiJS 3D**, **WebGPU/WebGL**, and real-time rigid body physics.

[![Play Live](https://img.shields.io/badge/Play-Live-brightgreen?style=for-the-badge&logo=github)](https://kaushalboii.github.io/mini-battle/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge)](LICENSE)

---

## 🎮 Play Live

**👉 [https://kaushalboii.github.io/mini-battle/](https://kaushalboii.github.io/mini-battle/)**

---

## 🚀 Key Features

* 🏎️ **Dynamic Behind-the-Car Follow Cam**: Fluid third-person chase camera that dynamically rotates with your steering yaw, delivering intuitive driving and cornering.
* ⚡ **Nitrous Boost (NOS)**: Tap or hold <kbd>Shift</kbd> / <kbd>Space</kbd> or click the on-screen **NOS** button for a 1.55x speed surge, speed streak warp lines, and electric-cyan exhaust flames!
* 💨 **Dynamic Tire Smoke & Rubber Skid Ribbons**: Real-time continuous GPU vertex buffer ribbons left on the asphalt, with world-space drift smoke puffs.
* 🔥 **Drift Score & Combo Multiplier**: Real-time drift point accumulation (`+350 DRIFT!`, `COMBO x2.5`) that rewards skillful power slides.
* 📷 **5 Multi-Perspective Cameras**:
  * **Chase View** (Default third-person follow cam)
  * **Close Follow** (Bumper cam for precision apex clips)
  * **Hood Cam** (First-person immersive cockpit bonnet view)
  * **Isometric** (High-angle tactical overview)
  * **Aerial** (Overhead GPS bird's-eye tracker)
* 🌅 **Dynamic Atmosphere & Lighting**: Switch in real-time between **Daylight ☀️**, **Golden Sunset 🌅**, and **Neon Night 🌙** environments.
* 🔊 **Multi-Gear WebAudio Sound Engine**: Synthesized engine RPM curves, 3-speed transmission shifts, throttle lowpass filters, and tire screech audio.
* 📊 **High-Tech Digital Dashboard**: Real-time speedometer (KM/H), gear/NOS state, and dynamic nitrous tank charge meter.
* 🎨 **Paddock Vehicle Palette**: Switch instantly between Golden Fury, Crimson Blaze, Viper Green, and Neon Phantom trucks.

---

## 🎮 Controls

| Action | Keyboard | Touch / Gamepad |
| :--- | :--- | :--- |
| **Accelerate** | <kbd>W</kbd> or <kbd>↑</kbd> | Joystick Up / RT Trigger |
| **Reverse / Brake** | <kbd>S</kbd> or <kbd>↓</kbd> | Joystick Down / LT Trigger |
| **Steer** | <kbd>A</kbd> / <kbd>D</kbd> or <kbd>←</kbd> / <kbd>→</kbd> | Joystick Left/Right / Left Stick |
| **Nitro Boost (NOS)** | <kbd>Shift</kbd> or <kbd>Space</kbd> | On-screen NOS Button / Gamepad A / RB |
| **Switch Camera** | <kbd>C</kbd> | Camera Button |
| **Toggle Atmosphere** | <kbd>T</kbd> | Atmosphere Button |
| **Mute / Unmute Audio** | <kbd>M</kbd> | Sound Button |
| **Respawn Vehicle** | <kbd>R</kbd> | Respawn Button |

---

## 🛠️ Tech Stack

* **Rendering Engine**: [PixiJS v8](https://pixijs.com/) + `@pixi/3d` (WebGPU with WebGL2 fallback)
* **Physics Engine**: `crashcat` (Continuous rigid body sphere and box collider simulation)
* **UI Framework**: React 19 + TypeScript + Vite
* **Deployment**: GitHub Pages CI/CD workflow with automatic asset optimization

---

## 🏁 Local Development

```bash
# Clone the repository
git clone https://github.com/kaushalboii/mini-battle.git
cd mini-battle

# Install dependencies
npm install

# Start Vite local development server
npm run dev

# Build for production
npm run build
```
