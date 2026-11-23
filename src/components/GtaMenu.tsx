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

export type MenuTab = "GAME" | "VEHICLES" | "CAMERA" | "CONTROLS" | "SETTINGS";

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
    topSpeed: 85,
    accel: 88,
    handling: 90,
    braking: 80,
    classType: "SUPER TRUCK • AWD",
    desc: "Tuned Los Santos lightweight trophy truck. High downforce, rapid drift recovery, and balanced torque.",
  },
  "vehicle-truck-red": {
    topSpeed: 92,
    accel: 90,
    handling: 84,
    braking: 85,
    classType: "RACING TRUCK • RWD",
    desc: "Crimson speed variant with upgraded turbo intake. Aggressive straight-line pace and responsive drift angles.",
  },
  "vehicle-truck-green": {
    topSpeed: 82,
    accel: 84,
    handling: 94,
    braking: 88,
    classType: "DRIFT SPEC • MID-ENGINE",
    desc: "Emerald agile build with heavy steering lock and increased asphalt grip for sharp hairpins.",
  },
  "vehicle-truck-purple": {
    topSpeed: 95,
    accel: 93,
    handling: 86,
    braking: 90,
    classType: "PHANTOM PROTOTYPE • AWD",
    desc: "Custom high-revving experimental build. Maximum top-end speed with wide rear tire profile.",
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
  const [activeTab, setActiveTab] = useState<MenuTab>("GAME");
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [timeStr, setTimeStr] = useState("16:20");

  const tabs: MenuTab[] = ["GAME", "VEHICLES", "CAMERA", "CONTROLS", "SETTINGS"];

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

  if (activeTab === "GAME") {
    menuItems = [
      {
        id: "start",
        label: "START RACE / RESUME",
        badge: "ENTER",
        action: () => {
          GtaAudio.playSelect();
          onStartRace();
        },
      },
      {
        id: "reset",
        label: "RESPAWN VEHICLE",
        badge: "R",
        action: () => {
          GtaAudio.playSelect();
          onResetVehicle();
          onClose();
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
        label: "CHANGE CAMERA ANGLE",
        badge: "›",
        action: () => {
          GtaAudio.playTabSwitch();
          setActiveTab("CAMERA");
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
  } else if (activeTab === "CONTROLS") {
    menuItems = [
      {
        id: "c-steer",
        label: "STEERING / DRIVE",
        badge: "W A S D / ARROWS",
        action: () => GtaAudio.playHover(),
      },
      {
        id: "c-camera",
        label: "CYCLE CAMERA",
        badge: "C",
        action: () => GtaAudio.playHover(),
      },
      {
        id: "c-respawn",
        label: "RESPAWN CAR",
        badge: "R",
        action: () => GtaAudio.playHover(),
      },
      {
        id: "c-menu",
        label: "TOGGLE GTA MENU",
        badge: "ESC",
        action: () => GtaAudio.playHover(),
      },
      {
        id: "c-touch",
        label: "MOBILE TOUCH JOYSTICK",
        badge: "DRAG ANYWHERE",
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
        label: "QUICK RESPAWN TRUCK",
        badge: "R",
        action: () => {
          GtaAudio.playSelect();
          onResetVehicle();
        },
      },
      {
        id: "back-game",
        label: "BACK TO RACE",
        badge: "ESC",
        action: () => {
          GtaAudio.playBack();
          onClose();
        },
      },
    ];
  }

  // Keyboard navigation within the GTA menu
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

  // Selected item information for the GTA Detail card
  const currentItem = menuItems[selectedIdx] || menuItems[0];
  const activeVehicleKey =
    activeTab === "VEHICLES" && currentItem ? currentItem.id : selectedColor;
  const currentVehicleStat = VEHICLE_STATS[activeVehicleKey] || VEHICLE_STATS["vehicle-truck-yellow"];
  const currentCameraInfo =
    CAMERA_MODES.find((m) => m.key === (activeTab === "CAMERA" ? currentItem?.id : selectedCamera)) ||
    CAMERA_MODES[0];

  return (
    <div className="gta-menu-overlay">
      {/* Background vignette & scanlines */}
      <div className="gta-backdrop-vignette" />

      {/* Top Header Bar */}
      <header className="gta-header-bar">
        <div className="gta-header-left">
          <div className="gta-logo-container">
            <span className="gta-logo-main">GRAND THEFT RACING</span>
            <span className="gta-logo-sub">MINI-BATTLE // LOS SANTOS</span>
          </div>
          <div className="gta-header-pill">ARCADE CIRCUIT EDITION</div>
        </div>

        {/* Top GTA Tabs */}
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

        {/* Top Right GTA Status (Wanted Stars & Bank Balance) */}
        <div className="gta-header-right">
          <div className="gta-wanted-stars" title="Wanted Level: 5 Stars">
            <span className="star active">★</span>
            <span className="star active">★</span>
            <span className="star active">★</span>
            <span className="star active">★</span>
            <span className="star active pulse">★</span>
          </div>
          <div className="gta-cash-display">$2,450,000</div>
          <div className="gta-header-meta">
            <span>{timeStr}</span>
            <span className="gta-dot">•</span>
            <span>DEL PERRO LS</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="gta-menu-content">
        {/* Left Side: Vertical Menu Items List */}
        <div className="gta-menu-list-wrapper">
          <div className="gta-menu-list-header">
            <h3>{activeTab} SELECTION</h3>
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
            <span>KENNEY RACING ENGINE • PIXI 3D</span>
          </div>
        </div>

        {/* Right Side: Detail / Preview Card (GTA V Style) */}
        <div className="gta-detail-card">
          {activeTab === "VEHICLES" || activeTab === "GAME" ? (
            <div className="gta-vehicle-preview-box">
              <div className="gta-card-header">
                <h4>
                  {vehicleOptions.find((v) => v.key === activeVehicleKey)?.label.toUpperCase() ||
                    "STOCK RACER"}
                </h4>
                <span className="gta-badge-pill">{currentVehicleStat.classType}</span>
              </div>

              {/* Color Preview Block */}
              <div
                className="gta-car-color-preview"
                style={{
                  background: `linear-gradient(135deg, ${
                    vehicleOptions.find((v) => v.key === activeVehicleKey)?.color || "#facc15"
                  } 0%, #111 100%)`,
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
                  <span>FACTORY COAT</span>
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
                  <span className="stat-label">HANDLING / DRIFT</span>
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
                <span className="gta-badge-pill">FOV MODE</span>
              </div>
              <div className="gta-info-box">
                <div className="gta-camera-icon">📷</div>
                <h5>{currentCameraInfo.desc}</h5>
                <p>
                  Dynamically tracks the vehicle's yaw and linear velocity. Features speed-based
                  FOV extension for intense sense of speed and high-speed drift angles.
                </p>
                <div className="gta-badge-keys">
                  <span>SHORTCUT IN RACE:</span>
                  <kbd>C</kbd>
                </div>
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
                  <span>RESPAWN VEHICLE</span>
                </div>
                <div className="gta-key-card">
                  <kbd>ESC</kbd>
                  <span>PAUSE / GTA MENU</span>
                </div>
              </div>
              <p className="gta-controls-note">
                Mobile & Tablet users can touch anywhere on screen to use the floating dynamic
                joystick.
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
                  <strong>Renderer:</strong> WebGPU with WebGL2 fallback
                </p>
                <p>
                  <strong>Physics:</strong> Crashcat Continuous Collision Detection
                </p>
                <p>
                  <strong>Audio:</strong> 3-Speed Procedural Engine Synthesizer & Drift Skid Screech
                </p>
                <p>
                  <strong>Resolution:</strong> Dynamic Hi-DPI Scaling (1x-2x)
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom GTA Action Legend Bar */}
      <footer className="gta-action-legend">
        <div className="legend-item" onClick={() => menuItems[selectedIdx]?.action()}>
          <span className="legend-badge">ENTER</span>
          <span className="legend-label">SELECT</span>
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
          <span className="legend-label">START RACE</span>
        </div>
        <div className="legend-item" onClick={onResetVehicle}>
          <span className="legend-badge">R</span>
          <span className="legend-label">RESPAWN</span>
        </div>
      </footer>
    </div>
  );
}

