# 🏎️ RevSector 3D • Grand Prix Racing

> A custom real-time 3D circuit racing simulator engineered by **Kaushal** with modern WebGPU & WebGL hardware acceleration, rigid body physics, nitrous injection, active tire smoke, and sector telemetry.

[![Play Live](https://img.shields.io/badge/Play-Live-brightgreen?style=for-the-badge&logo=github)](https://kaushalboii.github.io/mini-battle/)
[![Developer](https://img.shields.io/badge/Developer-Kaushal-amber?style=for-the-badge)](https://github.com/kaushalboii)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge)](LICENSE)

---

## 🎮 Play Live

**👉 [https://kaushalboii.github.io/mini-battle/](https://kaushalboii.github.io/mini-battle/)**

---

## 🚀 Key Features

* 🏎️ **Dynamic Chase & Cockpit Cameras**: Multi-perspective 3D camera system (Chase, Close Bumper, Hood Cockpit, Isometric, and Aerial GPS tracker).
* ⚡ **Nitrous Boost (NOS)**: Tap or hold <kbd>Shift</kbd> / <kbd>Space</kbd> or touch the on-screen **NOS** core for a 1.55x speed surge with radial focus compression and cyan exhaust trails.
* 💨 **Dynamic Tire Smoke & Asphalt Skid Marks**: Real-time continuous GPU vertex buffer ribbons left on the asphalt, with world-space drift smoke simulation.
* 📊 **Unified Digital Telemetry & Sector Timing**:
  * Precision digital lap stopwatch with lap counter (`LAP 1`), previous lap, and all-time record persistence.
  * 12-segment RPM LED gauge with authentic green/amber/redline shift indicators.
  * Digital speedometer in km/h with tabular numerals and gear indicator.
  * Nitrous reservoir fuel gauge.
* 📱 **Mobile Landscape First Architecture**:
  * Handheld console ergonomics with dedicated left thumb steering paddles (`◀`, `▶`).
  * Right thumb drive accelerator pedal, brake pedal, and circular NOS booster.
  * Full multi-touch support for simultaneous steering and acceleration.
  * Safe-area inset aware (`env(safe-area-inset-*)`) for phone notches and edge gestures.
* 🌅 **Real-Time Atmospheric Lighting**: Switch dynamically between **Daylight**, **Dusk**, and **Neon Night** lighting models.
* 🔊 **Procedural WebAudio Synthesis**: Dynamic engine RPM curves, 3-speed transmission shifts, throttle lowpass filtering, and tire screech sound synthesis.
* 🎨 **Paddock Team Selection**: Switch between Amber Team, Crimson Team, Emerald Team, and Cobalt Team.

---

## 🎮 Controls

| Action | Keyboard | Touch / Mobile Landscape |
| :--- | :--- | :--- |
| **Accelerate** | <kbd>W</kbd> or <kbd>↑</kbd> | Drive Pedal |
| **Brake / Reverse** | <kbd>S</kbd> or <kbd>↓</kbd> | Brake Pedal |
| **Steer Left / Right** | <kbd>A</kbd> / <kbd>D</kbd> or <kbd>←</kbd> / <kbd>→</kbd> | Left / Right Steering Paddles |
| **Nitrous Boost** | <kbd>Shift</kbd> or <kbd>Space</kbd> | On-screen NOS Button |
| **Switch Camera** | <kbd>C</kbd> | Camera Button |
| **Cycle Atmosphere** | <kbd>T</kbd> | Atmosphere Button |
| **Toggle Audio** | <kbd>M</kbd> | Audio Button |
| **Reset Vehicle** | <kbd>R</kbd> | Reset Button |

---

## 🛠️ Engine Architecture

* **Game & Engine Title**: RevSector 3D
* **Author / Developer**: Kaushal
* **Graphics Pipeline**: Custom WebGPU / WebGL2 Real-Time 3D Rendering
* **Physics Simulator**: Continuous rigid body sphere and box collider dynamics
* **UI Framework**: React 19 + TypeScript + Vite
* **Design Philosophy**: Engineered following `unslop` principles — 4px grid, graphite neutral ramp, zero slop glow, authentic motorsport telemetry.

---

## 🏁 Local Development

```bash
git clone https://github.com/kaushalboii/mini-battle.git
cd mini-battle
npm install
npm run dev
```

Build for production:
```bash
npm run build
```
