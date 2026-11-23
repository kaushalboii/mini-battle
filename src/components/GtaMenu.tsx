import { useState, useEffect } from "react";
import { GtaAudio } from "../utils/gtaAudio";
import { CAMERA_MODES } from "../game/pixi-racing/Camera";

export interface GtaMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRace: () => void;
  onResetVehicle: () => void;
  selectedColor: string;
  onSelectColor: (key: string) => void;
  selectedCamera: string;
  onSelectCamera: (modeKey: string) => void;
  toggleFullscreen: () => void;
  vehicleOptions: Array<{ key: string; label: string; color: string }>;
}

export type MenuTab = "HOME" | "VEHICLES" | "CAMERA" | "TRACK" | "CONTROLS" | "SETTINGS";

interface VehicleStat {
  topSpeed: number;
  accel: number;
  handling: number;
  braking: number;
  classType: string;
  desc: string;
}

const VEHICLE_STATS: Record<string, VehicleStat> = {
  "vehicle-truck-yellow": {
    topSpeed: 86,
    accel: 88,
    handling: 90,
    braking: 82,
    classType: "SUPER TRUCK • AWD",
    desc: "Kenney factory trophy truck with balanced weight distribution, high downforce aerodynamics, and rapid drift stabilization.",
  },
  "vehicle-truck-red": {
    topSpeed: 93,
    accel: 91,
    handling: 85,
    braking: 84,
    classType: "SPEED SPEC • RWD",
    desc: "Crimson racing edition with high-revving gearing. Dominant straight-line acceleration and aggressive counter-steering response.",
  },
  "vehicle-truck-green": {
    topSpeed: 83,
    accel: 85,
    handling: 95,
    braking: 89,
    classType: "DRIFT SPEC • MID-CHASSIS",
    desc: "Emerald agile build featuring high steering lock angle and increased tire slip control for precision apex turns.",
  },
  "vehicle-truck-purple": {
    topSpeed: 96,
    accel: 94,
    handling: 87,
    braking: 91,
    classType: "PHANTOM PROTOTYPE • AWD",
    desc: "Custom high-displacement prototype truck. Maximum top-end velocity with wide racing slick footprint.",
  },
};

export default function GtaMenu({
  isOpen,
  onClose,
  onStartRace,
  onResetVehicle,
  selectedColor,
  onSelectColor,
  selectedCamera,
  onSelectCamera,
  toggleFullscreen,
  vehicleOptions,
}: GtaMenuProps) {
  const [activeTab, setActiveTab] = useState<MenuTab>("HOME");
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [timeStr, setTimeStr] = useState("14:45");

  const tabs: MenuTab[] = ["HOME", "VEHICLES", "CAMERA", "TRACK", "CONTROLS", "SETTINGS"];

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeStr(
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 30000);
    return () => clearInterval(timer);
  }, []);

  // Compute items for the active tab
  let menuItems: Array<{
    id: string;
    label: string;
    badge?: string;
    action: () => void;
  }> = [];

  if (activeTab === "HOME") {
    menuItems = [
      {
        id: "start",
        label: "▶ PLAY NOW / START RACE",
        badge: "ENTER",
        action: () => {
          GtaAudio.playSelect();
          onStartRace();
        },
      },
      {
        id: "goto-vehicles",
        label: "SELECT VEHICLE COLOR",
        badge: "›",
        action: () => {
          GtaAudio.playTabSwitch();
          setActiveTab("VEHICLES");
          setSelectedIdx(0);
        },
      },
      {
        id: "goto-camera",
        label: "CHANGE CAMERA VIEW",
        badge: "›",
        action: () => {
          GtaAudio.playTabSwitch();
          setActiveTab("CAMERA");
          setSelectedIdx(0);
        },
      },
      {
        id: "goto-track",
        label: "CIRCUIT & TRACK TELEMETRY",
        badge: "›",
        action: () => {
          GtaAudio.playTabSwitch();
          setActiveTab("TRACK");
          setSelectedIdx(0);
        },
      },
      {
        id: "goto-controls",
        label: "HOW TO PLAY & CONTROLS",
        badge: "›",
        action: () => {
          GtaAudio.playTabSwitch();
          setActiveTab("CONTROLS");
          setSelectedIdx(0);
        },
      },
      {
        id: "reset",
        label: "↺ RESPAWN VEHICLE",
        badge: "R",
        action: () => {
          GtaAudio.playSelect();
          onResetVehicle();
          onClose();
        },
      },
    ];
  } else if (activeTab === "VEHICLES") {
    menuItems = vehicleOptions.map((opt) => ({
      id: opt.key,
      label: opt.label.toUpperCase(),
      badge: selectedColor === opt.key ? "ACTIVE" : "",
      action: () => {
        GtaAudio.playSelect();
        onSelectColor(opt.key);
      },
    }));
  } else if (activeTab === "CAMERA") {
    menuItems = CAMERA_MODES.map((mode) => ({
      id: mode.key,
      label: mode.label.toUpperCase(),
      badge: selectedCamera === mode.key ? "ACTIVE" : "",
      action: () => {
        GtaAudio.playSelect();
        onSelectCamera(mode.key);
      },
    }));
  } else if (activeTab === "TRACK") {
    menuItems = [
      {
        id: "t-name",
        label: "CIRCUIT: KENNEY GP SPEEDWAY",
        badge: "1.2 KM",
        action: () => GtaAudio.playHover(),
      },
      {
        id: "t-surface",
        label: "SURFACE: ASPHALT & KERBS",
        badge: "DRY",
        action: () => GtaAudio.playHover(),
      },
      {
        id: "t-laps",
        label: "MODE: CONTINUOUS TIME ATTACK",
        badge: "LIVE HUD",
        action: () => GtaAudio.playHover(),
      },
      {
        id: "t-physics",
        label: "PHYSICS: CONTINUOUS CCD COLLIDERS",
        badge: "CRASHCAT",
        action: () => GtaAudio.playHover(),
      },
    ];
  } else if (activeTab === "CONTROLS") {
    menuItems = [
      {
        id: "c-steer",
        label: "STEERING / THROTTLE / BRAKE",
        badge: "W A S D / ARROWS",
        action: () => GtaAudio.playHover(),
      },
      {
        id: "c-camera",
        label: "CYCLE CAMERA MODES",
        badge: "C",
        action: () => GtaAudio.playHover(),
      },
      {
        id: "c-respawn",
        label: "RESPAWN AT STARTING LINE",
        badge: "R",
        action: () => GtaAudio.playHover(),
      },
      {
        id: "c-menu",
        label: "TOGGLE HOME / PAUSE MENU",
        badge: "ESC",
        action: () => GtaAudio.playHover(),
      },
      {
        id: "c-touch",
        label: "DYNAMIC TOUCH JOYSTICK",
        badge: "DRAG SCREEN",
        action: () => GtaAudio.playHover(),
      },
    ];
  } else if (activeTab === "SETTINGS") {
    menuItems = [
      {
        id: "fullscreen",
        label: "TOGGLE FULLSCREEN",
        badge: "⛶",
        action: () => {
          GtaAudio.playSelect();
          toggleFullscreen();
        },
      },
      {
        id: "respawn-setting",
        label: "RESET VEHICLE TO START",
        badge: "R",
        action: () => {
          GtaAudio.playSelect();
          onResetVehicle();
        },
      },
      {
        id: "back-game",
        label: "RETURN TO RACE",
        badge: "ESC",
        action: () => {
          GtaAudio.playBack();
          onClose();
        },
      },
    ];
  }

  // Keyboard navigation within the Menu
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault();
        setSelectedIdx((prev) => {
          const next = (prev + 1) % menuItems.length;
          GtaAudio.playHover();
          return next;
        });
      } else if (e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        setSelectedIdx((prev) => {
          const next = (prev - 1 + menuItems.length) % menuItems.length;
          GtaAudio.playHover();
          return next;
        });
      } else if (e.code === "ArrowRight" || e.code === "KeyD") {
        e.preventDefault();
        const curTabIdx = tabs.indexOf(activeTab);
        const nextTab = tabs[(curTabIdx + 1) % tabs.length];
        GtaAudio.playTabSwitch();
        setActiveTab(nextTab);
        setSelectedIdx(0);
      } else if (e.code === "ArrowLeft" || e.code === "KeyA") {
        e.preventDefault();
        const curTabIdx = tabs.indexOf(activeTab);
        const prevTab = tabs[(curTabIdx - 1 + tabs.length) % tabs.length];
        GtaAudio.playTabSwitch();
        setActiveTab(prevTab);
        setSelectedIdx(0);
      } else if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        if (menuItems[selectedIdx]) {
          menuItems[selectedIdx].action();
        }
      } else if (e.code === "Escape") {
        e.preventDefault();
        GtaAudio.playBack();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activeTab, selectedIdx, menuItems]);

  if (!isOpen) return null;

  // Selected item information for the Detail card
  const currentItem = menuItems[selectedIdx] || menuItems[0];
  const activeVehicleKey =
    activeTab === "VEHICLES" && currentItem ? currentItem.id : selectedColor;
  const currentVehicleStat =
    VEHICLE_STATS[activeVehicleKey] || VEHICLE_STATS["vehicle-truck-yellow"];
  const currentCameraInfo =
    CAMERA_MODES.find(
      (m) => m.key === (activeTab === "CAMERA" ? currentItem?.id : selectedCamera)
    ) || CAMERA_MODES[0];

  return (
    <div className="gta-menu-overlay">
      {/* Background vignette & subtle scanlines */}
      <div className="gta-backdrop-vignette" />

      {/* Top Header Bar */}
      <header className="gta-header-bar">
        <div className="gta-header-left">
          <div className="gta-logo-container">
            <span className="gta-logo-main">MINI BATTLE</span>
            <span className="gta-logo-sub">3D RACING // ARCADE SPEEDWAY</span>
          </div>
          <div className="gta-header-pill">CIRCUIT EDITION</div>
        </div>

        {/* Top Navigation Tabs */}
        <nav className="gta-tabs-nav">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`gta-tab-btn ${activeTab === tab ? "active" : ""}`}
              onClick={() => {
                GtaAudio.playTabSwitch();
                setActiveTab(tab);
                setSelectedIdx(0);
              }}
              onMouseEnter={() => GtaAudio.playHover()}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* Top Right Track Telemetry & Clock (No stars, clean racing header!) */}
        <div className="gta-header-right">
          <div className="gta-track-status-badge">
            <span className="track-status-dot" />
            <span className="track-status-text">KENNEY GP CIRCUIT</span>
          </div>
          <div className="gta-header-meta">
            <span>{timeStr}</span>
            <span className="gta-dot">•</span>
            <span>CLEAR 78°F</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="gta-menu-content">
        {/* Left Side: Vertical Menu Items List */}
        <div className="gta-menu-list-wrapper">
          <div className="gta-menu-list-header">
            <h3>{activeTab} DIRECTORY</h3>
            <span>
              {selectedIdx + 1} / {menuItems.length}
            </span>
          </div>

          <div className="gta-menu-items">
            {menuItems.map((item, idx) => {
              const isSelected = selectedIdx === idx;
              return (
                <div
                  key={item.id}
                  className={`gta-menu-item ${isSelected ? "selected" : ""}`}
                  onMouseEnter={() => {
                    if (selectedIdx !== idx) {
                      GtaAudio.playHover();
                      setSelectedIdx(idx);
                    }
                  }}
                  onClick={() => item.action()}
                >
                  <span className="gta-item-text">{item.label}</span>
                  {item.badge && <span className="gta-item-badge">{item.badge}</span>}
                </div>
              );
            })}
          </div>

          <div className="gta-menu-list-footer">
            <span>OFFICIAL PIXI 3D RACING ENGINE • CRASHCAT PHYSICS</span>
          </div>
        </div>

        {/* Right Side: Detail / Preview Card */}
        <div className="gta-detail-card">
          {activeTab === "VEHICLES" || activeTab === "HOME" ? (
            <div className="gta-vehicle-preview-box">
              <div className="gta-card-header">
                <h4>
                  {vehicleOptions.find((v) => v.key === activeVehicleKey)?.label.toUpperCase() ||
                    "STOCK TROPHY TRUCK"}
                </h4>
                <span className="gta-badge-pill">{currentVehicleStat.classType}</span>
              </div>

              {/* Color Preview Block */}
              <div
                className="gta-car-color-preview"
                style={{
                  background: `linear-gradient(135deg, ${
                    vehicleOptions.find((v) => v.key === activeVehicleKey)?.color || "#facc15"
                  } 0%, #0d1117 100%)`,
                }}
              >
                <div className="gta-color-chip">
                  <div
                    className="chip-circle"
                    style={{
                      backgroundColor:
                        vehicleOptions.find((v) => v.key === activeVehicleKey)?.color || "#facc15",
                    }}
                  />
                  <span>FACTORY FINISH</span>
                </div>
                <div className="gta-wireframe-text">3D MESH READY</div>
              </div>

              {/* Performance Bars */}
              <div className="gta-stats-container">
                <div className="gta-stat-row">
                  <span className="stat-label">TOP SPEED</span>
                  <div className="stat-bar-track">
                    <div
                      className="stat-bar-fill speed"
                      style={{ width: `${currentVehicleStat.topSpeed}%` }}
                    />
                  </div>
                  <span className="stat-val">{currentVehicleStat.topSpeed}</span>
                </div>

                <div className="gta-stat-row">
                  <span className="stat-label">ACCELERATION</span>
                  <div className="stat-bar-track">
                    <div
                      className="stat-bar-fill accel"
                      style={{ width: `${currentVehicleStat.accel}%` }}
                    />
                  </div>
                  <span className="stat-val">{currentVehicleStat.accel}</span>
                </div>

                <div className="gta-stat-row">
                  <span className="stat-label">HANDLING & DRIFT</span>
                  <div className="stat-bar-track">
                    <div
                      className="stat-bar-fill handling"
                      style={{ width: `${currentVehicleStat.handling}%` }}
                    />
                  </div>
                  <span className="stat-val">{currentVehicleStat.handling}</span>
                </div>

                <div className="gta-stat-row">
                  <span className="stat-label">BRAKING</span>
                  <div className="stat-bar-track">
                    <div
                      className="stat-bar-fill braking"
                      style={{ width: `${currentVehicleStat.braking}%` }}
                    />
                  </div>
                  <span className="stat-val">{currentVehicleStat.braking}</span>
                </div>
              </div>

              <p className="gta-vehicle-desc">{currentVehicleStat.desc}</p>
            </div>
          ) : activeTab === "CAMERA" ? (
            <div className="gta-camera-preview-box">
              <div className="gta-card-header">
                <h4>{currentCameraInfo.label.toUpperCase()}</h4>
                <span className="gta-badge-pill">DYNAMIC FOV</span>
              </div>
              <div className="gta-info-box">
                <div className="gta-camera-icon">📷</div>
                <h5>{currentCameraInfo.desc}</h5>
                <p>
                  Dynamically interpolates yaw, pitch, and linear velocity with speed-based
                  field-of-view expansion for an intense sense of velocity and high-speed drift angles.
                </p>
                <div className="gta-badge-keys">
                  <span>SHORTCUT IN RACE:</span>
                  <kbd>C</kbd>
                </div>
              </div>
            </div>
          ) : activeTab === "TRACK" ? (
            <div className="gta-track-preview-box">
              <div className="gta-card-header">
                <h4>KENNEY GRAND PRIX SPEEDWAY</h4>
                <span className="gta-badge-pill">CIRCUIT OVERVIEW</span>
              </div>
              <div className="gta-track-stats-grid">
                <div className="track-stat-tile">
                  <span className="tile-label">TRACK LENGTH</span>
                  <span className="tile-value">1.25 KM</span>
                </div>
                <div className="track-stat-tile">
                  <span className="tile-label">TOTAL TURNS</span>
                  <span className="tile-value">12 CORNERS</span>
                </div>
                <div className="track-stat-tile">
                  <span className="tile-label">SURFACE GRIP</span>
                  <span className="tile-value">OPTIMAL ASPHALT</span>
                </div>
                <div className="track-stat-tile">
                  <span className="tile-label">LAP TIMING</span>
                  <span className="tile-value">REAL-TIME HUD</span>
                </div>
              </div>
              <div className="gta-info-box">
                <h5>CONTINUOUS TIME ATTACK</h5>
                <p>
                  Cross the checkered finish line to clock your lap times. The in-game 2D HUD tracks
                  current lap time, last lap, and your persistent all-time best record.
                </p>
              </div>
            </div>
          ) : activeTab === "CONTROLS" ? (
            <div className="gta-controls-preview-box">
              <div className="gta-card-header">
                <h4>DRIVER CONTROLS</h4>
                <span className="gta-badge-pill">KEYBOARD & JOYSTICK</span>
              </div>
              <div className="gta-controls-grid">
                <div className="gta-key-card">
                  <kbd>W / ↑</kbd>
                  <span>THROTTLE (ACCELERATE)</span>
                </div>
                <div className="gta-key-card">
                  <kbd>S / ↓</kbd>
                  <span>BRAKE & REVERSE</span>
                </div>
                <div className="gta-key-card">
                  <kbd>A / D</kbd>
                  <span>STEERING & DRIFTING</span>
                </div>
                <div className="gta-key-card">
                  <kbd>C</kbd>
                  <span>SWITCH CAMERA ANGLE</span>
                </div>
                <div className="gta-key-card">
                  <kbd>R</kbd>
                  <span>RESPAWN TRUCK</span>
                </div>
                <div className="gta-key-card">
                  <kbd>ESC</kbd>
                  <span>TOGGLE HOME / MENU</span>
                </div>
              </div>
              <p className="gta-controls-note">
                Touch anywhere on mobile or tablet to use the dynamic floating on-screen joystick.
              </p>
            </div>
          ) : (
            <div className="gta-settings-preview-box">
              <div className="gta-card-header">
                <h4>SETTINGS & SYSTEM</h4>
                <span className="gta-badge-pill">PIXI 3D CONFIG</span>
              </div>
              <div className="gta-info-box">
                <p>
                  <strong>Renderer:</strong> PixiJS 3D with WebGPU & WebGL2 fallback
                </p>
                <p>
                  <strong>Physics:</strong> Crashcat Continuous Collision Detection (CCD)
                </p>
                <p>
                  <strong>Audio:</strong> 3-Speed Procedural Engine Synthesizer & Drift Skid Screech
                </p>
                <p>
                  <strong>Resolution:</strong> Dynamic Hi-DPI Auto-density Scaling (1x-2x)
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Action Legend Bar */}
      <footer className="gta-action-legend">
        <div className="legend-item" onClick={() => menuItems[selectedIdx]?.action()}>
          <span className="legend-badge">ENTER</span>
          <span className="legend-label">SELECT / PLAY</span>
        </div>
        <div className="legend-item" onClick={onClose}>
          <span className="legend-badge">ESC</span>
          <span className="legend-label">CLOSE / RESUME</span>
        </div>
        <div className="legend-item">
          <span className="legend-badge">↑ ↓</span>
          <span className="legend-label">NAVIGATE</span>
        </div>
        <div className="legend-item">
          <span className="legend-badge">← →</span>
          <span className="legend-label">SWITCH TAB</span>
        </div>
        <div className="legend-item" onClick={onStartRace}>
          <span className="legend-badge">SPACE</span>
          <span className="legend-label">PLAY NOW</span>
        </div>
        <div className="legend-item" onClick={onResetVehicle}>
          <span className="legend-badge">R</span>
          <span className="legend-label">RESPAWN</span>
        </div>
      </footer>
    </div>
  );
}
