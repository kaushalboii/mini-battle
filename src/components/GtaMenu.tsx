import { useState, useEffect } from "react";
import { GtaAudio } from "../utils/gtaAudio";
import { CAMERA_MODES } from "../game/pixi-racing/Camera";
import { TRACK_DEFINITIONS, TRACK_LIST } from "../game/pixi-racing/Track";
import type { MeshStateSnapshot } from "../game/multiplayer/MeshNetwork";

export interface GtaMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRace: () => void;
  onResetVehicle: () => void;
  selectedColor: string;
  onSelectColor: (key: string) => void;
  selectedCamera: string;
  onSelectCamera: (modeKey: string) => void;
  selectedTrack: string;
  onSelectTrack: (trackId: string) => void;
  raceMode: "solo" | "ghost" | "ai";
  onSelectRaceMode: (mode: "solo" | "ghost" | "ai") => void;
  bestLapFormatted: string;
  lastLapFormatted: string;
  onClearBestLap: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  audioVolume: number;
  onChangeVolume: (vol: number) => void;
  speedUnit: "MPH" | "KMH";
  onToggleSpeedUnit: () => void;
  touchMode: "joystick" | "pedals";
  onToggleTouchMode: () => void;
  showMinimap: boolean;
  onToggleMinimap: () => void;
  toggleFullscreen: () => void;
  vehicleOptions: Array<{ key: string; label: string; color: string }>;
  meshState: MeshStateSnapshot;
  initialTab?: MenuTab;
  initialRoomCode?: string;
  onHostRoom: () => void;
  onJoinRoom: (code: string) => void;
  onLeaveRoom: () => void;
  onChangeDriverName: (name: string) => void;
}

export type MenuTab =
  | "HOME"
  | "VEHICLES"
  | "TRACK"
  | "MULTIPLAYER"
  | "CONTROLS"
  | "SETTINGS";

interface VehicleSpec {
  classType: string;
  trim: string;
  desc: string;
}

const VEHICLE_SPECS: Record<string, VehicleSpec> = {
  "vehicle-truck-yellow": {
    classType: "TROPHY TRUCK • FACTORY",
    trim: "KENNEY SUNBURST YELLOW",
    desc: "Original stock Kenney racing trophy truck. Identical balanced physics, suspension roll stability, and responsive drift recovery.",
  },
  "vehicle-truck-red": {
    classType: "TROPHY TRUCK • CRIMSON",
    trim: "CRIMSON GP EDITION",
    desc: "Factory Crimson red chassis livery with classic high-contrast trim and crisp asphalt drift tire marks.",
  },
  "vehicle-truck-green": {
    classType: "TROPHY TRUCK • EMERALD",
    trim: "EMERALD TEAM SPEC",
    desc: "Vibrant Emerald racing finish built on the exact same tournament chassis and 3-speed gearbox.",
  },
  "vehicle-truck-purple": {
    classType: "TROPHY TRUCK • PHANTOM",
    trim: "MIDNIGHT VIOLET SPEC",
    desc: "Distinctive Deep Purple factory coat designed to stand out in Wi-Fi multiplayer rooms and AI packs.",
  },
};

function TrackMinimapSvg({ trackId }: { trackId: string }) {
  const def =
    TRACK_DEFINITIONS[trackId as keyof typeof TRACK_DEFINITIONS] ||
    TRACK_DEFINITIONS.classic;
  const cells = def.cells as Array<[number, number, string, number]>;
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (const [gx, gz] of cells) {
    if (gx < minX) minX = gx;
    if (gx > maxX) maxX = gx;
    if (gz < minZ) minZ = gz;
    if (gz > maxZ) maxZ = gz;
  }
  const pad = 0.8;
  const vbX = minX - pad;
  const vbY = minZ - pad;
  const vbW = maxX - minX + 1 + pad * 2;
  const vbH = maxZ - minZ + 1 + pad * 2;

  const points = cells.map(([gx, gz]) => `${gx + 0.5},${gz + 0.5}`).join(" ");
  const finish = cells.find(([, , key]) => key === "track-finish") || cells[0];
  const bumps = cells.filter(([, , key]) => key === "track-bump");

  return (
    <svg
      className="track-preview-svg"
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <polygon
        points={points}
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.65"
        strokeLinejoin="round"
      />
      <polygon
        points={points}
        fill="none"
        stroke="#facc15"
        strokeWidth="0.18"
        strokeLinejoin="round"
      />
      {bumps.map(([gx, gz], idx) => (
        <circle
          key={idx}
          cx={gx + 0.5}
          cy={gz + 0.5}
          r="0.22"
          fill="#00e5ff"
        />
      ))}
      <rect
        x={finish[0] + 0.25}
        y={finish[1] + 0.38}
        width="0.5"
        height="0.24"
        fill="#2ecc71"
      />
    </svg>
  );
}

export default function GtaMenu({
  isOpen,
  onClose,
  onStartRace,
  onResetVehicle,
  selectedColor,
  onSelectColor,
  selectedCamera,
  onSelectCamera,
  selectedTrack,
  onSelectTrack,
  raceMode,
  onSelectRaceMode,
  bestLapFormatted,
  lastLapFormatted,
  onClearBestLap,
  isMuted,
  onToggleMute,
  audioVolume,
  onChangeVolume,
  speedUnit,
  onToggleSpeedUnit,
  touchMode,
  onToggleTouchMode,
  showMinimap,
  onToggleMinimap,
  toggleFullscreen,
  vehicleOptions,
  meshState,
  initialTab = "HOME",
  initialRoomCode = "",
  onHostRoom,
  onJoinRoom,
  onLeaveRoom,
  onChangeDriverName,
}: GtaMenuProps) {
  const [activeTab, setActiveTab] = useState<MenuTab>(initialTab);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [timeStr, setTimeStr] = useState("14:50");
  const [roomInput, setRoomInput] = useState(initialRoomCode);
  const [nameInput, setNameInput] = useState(meshState.driverName);
  const [copiedLink, setCopiedLink] = useState(false);

  const tabs: MenuTab[] = [
    "HOME",
    "VEHICLES",
    "TRACK",
    "MULTIPLAYER",
    "CONTROLS",
    "SETTINGS",
  ];

  useEffect(() => {
    if (initialRoomCode) {
      setRoomInput(initialRoomCode);
      setActiveTab("MULTIPLAYER");
    }
  }, [initialRoomCode]);

  useEffect(() => {
    setNameInput(meshState.driverName);
  }, [meshState.driverName]);

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

  const currentTrackInfo =
    TRACK_DEFINITIONS[selectedTrack as keyof typeof TRACK_DEFINITIONS] ||
    TRACK_DEFINITIONS.classic;

  // Build list items for active tab
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
        badge: "SPACE",
        action: () => {
          GtaAudio.playSelect();
          onStartRace();
        },
      },
      {
        id: "goto-vehicles",
        label: "SELECT TRUCK LIVERY",
        badge: vehicleOptions.find((v) => v.key === selectedColor)?.label.split(" ")[0].toUpperCase() || "YELLOW",
        action: () => {
          GtaAudio.playTabSwitch();
          setActiveTab("VEHICLES");
          setSelectedIdx(0);
        },
      },
      {
        id: "goto-track",
        label: "CIRCUIT & RACE MODE",
        badge: `${raceMode.toUpperCase()} ›`,
        action: () => {
          GtaAudio.playTabSwitch();
          setActiveTab("TRACK");
          setSelectedIdx(0);
        },
      },
      {
        id: "goto-mp",
        label: "WI-FI MESH MULTIPLAYER",
        badge:
          meshState.status === "hosting" || meshState.status === "connected"
            ? `${meshState.players.length} ONLINE`
            : "LAN / P2P",
        action: () => {
          GtaAudio.playTabSwitch();
          setActiveTab("MULTIPLAYER");
          setSelectedIdx(0);
        },
      },
      {
        id: "goto-settings",
        label: "SETTINGS & AUDIO",
        badge: isMuted ? "MUTED" : "›",
        action: () => {
          GtaAudio.playTabSwitch();
          setActiveTab("SETTINGS");
          setSelectedIdx(0);
        },
      },
      {
        id: "goto-controls",
        label: "CONTROLS & MANUAL",
        badge: "›",
        action: () => {
          GtaAudio.playTabSwitch();
          setActiveTab("CONTROLS");
          setSelectedIdx(0);
        },
      },
      {
        id: "reset",
        label: "↺ RESPAWN AT START GRID",
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
      badge: selectedColor === opt.key ? "EQUIPPED" : "SELECT",
      action: () => {
        GtaAudio.playSelect();
        onSelectColor(opt.key);
      },
    }));
  } else if (activeTab === "TRACK") {
    const canSwitchTrack =
      meshState.status === "offline" || meshState.isHost || meshState.status === "error";

    menuItems = [
      ...TRACK_LIST.map((t) => ({
        id: `track-${t.id}`,
        label: `CIRCUIT: ${t.name.toUpperCase()}`,
        badge:
          selectedTrack === t.id
            ? "ACTIVE"
            : canSwitchTrack
            ? t.difficulty
            : "HOST ONLY",
        action: () => {
          if (!canSwitchTrack) {
            GtaAudio.playBack();
            return;
          }
          GtaAudio.playSelect();
          onSelectTrack(t.id);
        },
      })),
      {
        id: "mode-solo",
        label: "MODE: SOLO TIME ATTACK",
        badge: raceMode === "solo" ? "ACTIVE" : "SELECT",
        action: () => {
          GtaAudio.playSelect();
          onSelectRaceMode("solo");
        },
      },
      {
        id: "mode-ghost",
        label: "MODE: BEST-LAP GHOST",
        badge: raceMode === "ghost" ? "ACTIVE" : "SELECT",
        action: () => {
          GtaAudio.playSelect();
          onSelectRaceMode("ghost");
        },
      },
      {
        id: "mode-ai",
        label: "MODE: AI RIVALS (3 TRUCKS)",
        badge: raceMode === "ai" ? "ACTIVE" : "SELECT",
        action: () => {
          GtaAudio.playSelect();
          onSelectRaceMode("ai");
        },
      },
    ];
  } else if (activeTab === "MULTIPLAYER") {
    menuItems = [
      {
        id: "mp-host",
        label:
          meshState.status === "hosting"
            ? `HOSTING ROOM [${meshState.roomCode}]`
            : "HOST NEW WI-FI MESH ROOM",
        badge: meshState.status === "hosting" ? "LIVE" : "CREATE",
        action: () => {
          GtaAudio.playSelect();
          onHostRoom();
        },
      },
      {
        id: "mp-join",
        label: "JOIN FRIEND'S ROOM CODE",
        badge: roomInput ? roomInput : "ENTER CODE",
        action: () => {
          GtaAudio.playSelect();
          if (roomInput.trim()) onJoinRoom(roomInput);
        },
      },
      {
        id: "mp-play",
        label: "▶ DRIVE ON TRACK NOW",
        badge: "SPACE",
        action: () => {
          GtaAudio.playSelect();
          onStartRace();
        },
      },
      ...(meshState.status === "hosting" || meshState.status === "connected"
        ? [
            {
              id: "mp-leave",
              label: "DISCONNECT FROM ROOM",
              badge: "EXIT",
              action: () => {
                GtaAudio.playBack();
                onLeaveRoom();
              },
            },
          ]
        : []),
    ];
  } else if (activeTab === "CONTROLS") {
    menuItems = [
      {
        id: "play-from-controls",
        label: "▶ READY TO DRIVE (PLAY NOW)",
        badge: "SPACE",
        action: () => {
          GtaAudio.playSelect();
          onStartRace();
        },
      },
      ...CAMERA_MODES.map((m) => ({
        id: `cam-${m.key}`,
        label: `CAMERA: ${m.label.toUpperCase()}`,
        badge: selectedCamera === m.key ? "ACTIVE" : "SET",
        action: () => {
          GtaAudio.playSelect();
          onSelectCamera(m.key);
        },
      })),
    ];
  } else if (activeTab === "SETTINGS") {
    menuItems = [
      {
        id: "mute-toggle",
        label: "MASTER AUDIO",
        badge: isMuted ? "MUTED" : "ON",
        action: () => {
          onToggleMute();
          GtaAudio.playSelect();
        },
      },
      {
        id: "vol-cycle",
        label: "AUDIO VOLUME LEVEL",
        badge: `${Math.round(audioVolume * 100)}%`,
        action: () => {
          const steps = [0.25, 0.5, 0.8, 1.0];
          const next =
            steps.find((v) => v > audioVolume + 0.05) ?? steps[0];
          onChangeVolume(next);
          GtaAudio.playSelect();
        },
      },
      {
        id: "speed-unit",
        label: "SPEEDOMETER UNITS",
        badge: speedUnit,
        action: () => {
          GtaAudio.playSelect();
          onToggleSpeedUnit();
        },
      },
      {
        id: "touch-style",
        label: "TOUCH CONTROLS LAYOUT",
        badge: touchMode === "joystick" ? "JOYSTICK" : "PEDALS",
        action: () => {
          GtaAudio.playSelect();
          onToggleTouchMode();
        },
      },
      {
        id: "minimap-toggle",
        label: "HUD CORNER MINIMAP",
        badge: showMinimap ? "ON" : "OFF",
        action: () => {
          GtaAudio.playSelect();
          onToggleMinimap();
        },
      },
      {
        id: "fullscreen",
        label: "FULLSCREEN DISPLAY",
        badge: "F",
        action: () => {
          GtaAudio.playSelect();
          toggleFullscreen();
        },
      },
    ];
  }

  // Clamp selectedIdx when switching tabs
  useEffect(() => {
    if (selectedIdx >= menuItems.length) {
      setSelectedIdx(Math.max(0, menuItems.length - 1));
    }
  }, [activeTab, menuItems.length, selectedIdx]);

  // Menu keyboard shortcuts (strictly ignored when typing inside input fields)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

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
      } else if (e.code === "Enter") {
        e.preventDefault();
        if (menuItems[selectedIdx]) {
          menuItems[selectedIdx].action();
        }
      } else if (e.code === "Space") {
        e.preventDefault();
        GtaAudio.playSelect();
        onStartRace();
      } else if (e.code === "KeyR") {
        e.preventDefault();
        GtaAudio.playSelect();
        onResetVehicle();
        onClose();
      } else if (e.code === "KeyF") {
        e.preventDefault();
        GtaAudio.playSelect();
        toggleFullscreen();
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

  const currentItem = menuItems[selectedIdx] || menuItems[0];
  const activeVehicleKey =
    activeTab === "VEHICLES" && currentItem ? currentItem.id : selectedColor;
  const activeVehicleObj =
    vehicleOptions.find((v) => v.key === activeVehicleKey) || vehicleOptions[0];
  const currentSpec =
    VEHICLE_SPECS[activeVehicleKey] || VEHICLE_SPECS["vehicle-truck-yellow"];

  const previewTrackId =
    activeTab === "TRACK" && currentItem?.id.startsWith("track-")
      ? currentItem.id.replace("track-", "")
      : selectedTrack;
  const previewTrackInfo =
    TRACK_DEFINITIONS[previewTrackId as keyof typeof TRACK_DEFINITIONS] ||
    currentTrackInfo;

  const handleCopyInviteLink = () => {
    if (!meshState.roomCode) return;
    const base = window.location.href.split("?")[0];
    const url = `${base}?room=${meshState.roomCode}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedLink(true);
    GtaAudio.playSelect();
    setTimeout(() => setCopiedLink(false), 1800);
  };

  return (
    <div className="gta-menu-overlay">
      <div className="gta-backdrop-vignette" />

      {/* Header */}
      <header className="gta-header-bar">
        <div className="gta-header-left">
          <div className="gta-logo-container">
            <span className="gta-logo-main">MINI BATTLE</span>
            <span className="gta-logo-sub">3D RACING SPEEDWAY</span>
          </div>
          <div className="gta-header-pill">
            {meshState.status === "hosting" || meshState.status === "connected"
              ? `WI-FI MESH • ${meshState.roomCode}`
              : "OFFICIAL EDITION"}
          </div>
        </div>

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
              {tab === "TRACK" ? "TRACK & MODE" : tab}
            </button>
          ))}
        </nav>

        <div className="gta-header-right">
          <div className="gta-track-status-badge">
            <span className="track-status-dot" />
            <span className="track-status-text">
              {currentTrackInfo.name.toUpperCase()}
            </span>
          </div>
          <div className="gta-header-meta">
            <span>BEST {bestLapFormatted}</span>
            <span className="gta-dot">•</span>
            <span>{timeStr}</span>
          </div>
        </div>
      </header>

      {/* Main Two-Column Content */}
      <main className="gta-menu-content">
        {/* Left List */}
        <div className="gta-menu-list-wrapper">
          <div className="gta-menu-list-header">
            <h3>{activeTab === "TRACK" ? "CIRCUIT & MODE" : activeTab} DIRECTORY</h3>
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
                  {item.badge && (
                    <span className="gta-item-badge">{item.badge}</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="gta-menu-list-footer">
            <span>KENNEY 3D • CRASHCAT PHYSICS • WEBRTC MESH</span>
          </div>
        </div>

        {/* Right Panel */}
        <div className="gta-detail-card">
          {(activeTab === "HOME" || activeTab === "VEHICLES") && (
            <div className="gta-vehicle-preview-box">
              <div className="gta-card-header">
                <h4>{activeVehicleObj.label.toUpperCase()}</h4>
                <span className="gta-badge-pill">{currentSpec.classType}</span>
              </div>

              <div
                className="gta-car-color-preview"
                style={{
                  background: `linear-gradient(135deg, ${activeVehicleObj.color} 0%, #0d1117 100%)`,
                }}
              >
                <div className="gta-color-chip">
                  <div
                    className="chip-circle"
                    style={{ backgroundColor: activeVehicleObj.color }}
                  />
                  <span>{currentSpec.trim}</span>
                </div>
                <div className="gta-wireframe-text">LIVE 3D SHOWCASE</div>
              </div>

              {/* Real Current Session Telemetry Summary inside Menu */}
              <div className="gta-track-stats-grid">
                <div className="track-stat-tile">
                  <span className="tile-label">CIRCUIT</span>
                  <span className="tile-value">
                    {currentTrackInfo.name.toUpperCase()}
                  </span>
                </div>
                <div className="track-stat-tile">
                  <span className="tile-label">RACE MODE</span>
                  <span className="tile-value">
                    {raceMode === "ai"
                      ? "3 AI RIVALS"
                      : raceMode === "ghost"
                      ? "BEST LAP GHOST"
                      : "SOLO PRACTICE"}
                  </span>
                </div>
                <div className="track-stat-tile">
                  <span className="tile-label">BEST LAP RECORD</span>
                  <span className="tile-value">{bestLapFormatted}</span>
                </div>
                <div className="track-stat-tile">
                  <span className="tile-label">CAMERA VIEW</span>
                  <span className="tile-value">
                    {(
                      CAMERA_MODES.find((m) => m.key === selectedCamera)
                        ?.label || "Chase View"
                    ).toUpperCase()}
                  </span>
                </div>
              </div>

              <button
                className="gta-card-action-btn"
                onClick={() => {
                  GtaAudio.playSelect();
                  if (activeTab === "VEHICLES") {
                    onSelectColor(activeVehicleObj.key);
                  }
                  onStartRace();
                }}
              >
                ▶ DRIVE {activeVehicleObj.label.toUpperCase()} NOW (SPACE)
              </button>

              <p className="gta-vehicle-desc">{currentSpec.desc}</p>
            </div>
          )}

          {activeTab === "TRACK" && (
            <div className="gta-track-preview-box">
              <div className="gta-card-header">
                <h4>{previewTrackInfo.name.toUpperCase()}</h4>
                <span className="gta-badge-pill">
                  {previewTrackInfo.difficulty}
                </span>
              </div>

              <div className="track-svg-frame">
                <TrackMinimapSvg trackId={previewTrackId} />
                <div className="track-svg-legend">
                  <span className="legend-dot finish" /> FINISH
                  <span className="legend-dot bump" /> JUMP BUMP
                </div>
              </div>

              <div className="gta-track-stats-grid">
                <div className="track-stat-tile">
                  <span className="tile-label">DISTANCE</span>
                  <span className="tile-value">
                    {previewTrackInfo.lengthLabel}
                  </span>
                </div>
                <div className="track-stat-tile">
                  <span className="tile-label">TURNS</span>
                  <span className="tile-value">
                    {previewTrackInfo.corners} CORNERS
                  </span>
                </div>
                <div className="track-stat-tile">
                  <span className="tile-label">BEST LAP</span>
                  <span className="tile-value">{bestLapFormatted}</span>
                </div>
                <div className="track-stat-tile">
                  <span className="tile-label">LAST LAP</span>
                  <span className="tile-value">{lastLapFormatted}</span>
                </div>
              </div>

              <div className="gta-card-btn-pair">
                <button
                  className="gta-card-action-btn"
                  style={{ marginBottom: 0 }}
                  onClick={() => {
                    GtaAudio.playSelect();
                    onStartRace();
                  }}
                >
                  ▶ START RACE ON CIRCUIT
                </button>
                <button
                  className="gta-card-secondary-btn"
                  onClick={() => {
                    GtaAudio.playBack();
                    onClearBestLap();
                  }}
                >
                  CLEAR BEST
                </button>
              </div>

              <p className="gta-vehicle-desc" style={{ marginTop: 14 }}>
                {previewTrackInfo.desc}
              </p>
            </div>
          )}

          {activeTab === "MULTIPLAYER" && (
            <div className="mesh-console-box">
              <div className="gta-card-header">
                <h4>SAME-WI-FI MESH CONSOLE</h4>
                <span
                  className={`mesh-status-pill status-${meshState.status}`}
                >
                  {meshState.status === "hosting"
                    ? `HOSTING [${meshState.roomCode}]`
                    : meshState.status === "connected"
                    ? `ONLINE [${meshState.roomCode}]`
                    : meshState.status.toUpperCase()}
                </span>
              </div>

              {/* Driver Name & Room Join Controls */}
              <div className="mesh-form-grid">
                <div className="mesh-field">
                  <label>DRIVER CALLSIGN</label>
                  <div className="mesh-input-row">
                    <input
                      type="text"
                      maxLength={14}
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onBlur={() => onChangeDriverName(nameInput)}
                      placeholder="YOUR NAME"
                    />
                    <button
                      onClick={() => {
                        GtaAudio.playSelect();
                        onChangeDriverName(nameInput);
                      }}
                    >
                      SET
                    </button>
                  </div>
                </div>

                <div className="mesh-field">
                  <label>JOIN WITH ROOM CODE</label>
                  <div className="mesh-input-row">
                    <input
                      type="text"
                      maxLength={6}
                      value={roomInput}
                      onChange={(e) =>
                        setRoomInput(e.target.value.toUpperCase())
                      }
                      placeholder="E.G. K7P2"
                    />
                    <button
                      onClick={() => {
                        GtaAudio.playSelect();
                        onJoinRoom(roomInput);
                      }}
                    >
                      JOIN
                    </button>
                  </div>
                </div>
              </div>

              {/* Share & Room Actions */}
              {meshState.roomCode && (
                <div className="mesh-room-banner">
                  <div>
                    <span className="banner-label">ROOM CODE</span>
                    <strong className="banner-code">
                      {meshState.roomCode}
                    </strong>
                  </div>
                  <div className="mesh-banner-actions">
                    <button onClick={handleCopyInviteLink}>
                      {copiedLink ? "✓ LINK COPIED" : "COPY SHARE LINK"}
                    </button>
                    <button className="danger" onClick={onLeaveRoom}>
                      LEAVE
                    </button>
                  </div>
                </div>
              )}

              {meshState.error && (
                <div className="mesh-error-banner">{meshState.error}</div>
              )}

              {/* Connected Roster */}
              <div className="mesh-roster">
                <div className="mesh-section-title">
                  CONNECTED DRIVERS ({meshState.players.length})
                </div>
                {meshState.players.length === 0 ? (
                  <div className="mesh-empty-roster">
                    No active room. Click <strong>HOST NEW WI-FI MESH ROOM</strong>{" "}
                    or enter a friend&apos;s code.
                  </div>
                ) : (
                  <div className="mesh-roster-list">
                    {meshState.players.map((p) => {
                      const col =
                        vehicleOptions.find((v) => v.key === p.color)?.color ||
                        "#facc15";
                      return (
                        <div key={p.id} className="mesh-player-row">
                          <span
                            className="mesh-player-dot"
                            style={{ backgroundColor: col }}
                          />
                          <span className="mesh-player-name">
                            {p.name}
                            {p.isSelf ? " (YOU)" : ""}
                            {p.isHost ? " ★ HOST" : ""}
                          </span>
                          <span className="mesh-player-meta">
                            LAP {p.lap} • {p.isSelf && p.isHost ? "0ms" : `${p.pingMs}ms`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Event Console Log */}
              <div className="mesh-log-panel">
                <div className="mesh-section-title">CONSOLE TELEMETRY LOG</div>
                <div className="mesh-log-scroll">
                  {meshState.logs.map((entry) => (
                    <div
                      key={entry.id}
                      className={`mesh-log-line lvl-${entry.level}`}
                    >
                      <span className="log-time">[{entry.time}]</span>{" "}
                      <span>{entry.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "CONTROLS" && (
            <div className="gta-controls-preview-box">
              <div className="gta-card-header">
                <h4>DRIVER CONTROLS & CAMERAS</h4>
                <span className="gta-badge-pill">
                  {touchMode === "joystick" ? "JOYSTICK" : "PEDALS"}
                </span>
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
                  <span>STEER & DRIFT</span>
                </div>
                <div className="gta-key-card">
                  <kbd>C</kbd>
                  <span>SWITCH CAMERA VIEW</span>
                </div>
                <div className="gta-key-card">
                  <kbd>R</kbd>
                  <span>RESPAWN AT START</span>
                </div>
                <div className="gta-key-card">
                  <kbd>ESC</kbd>
                  <span>OPEN / CLOSE MENU</span>
                </div>
              </div>
              <button
                className="gta-card-action-btn"
                onClick={() => {
                  GtaAudio.playSelect();
                  onStartRace();
                }}
              >
                ▶ START RACING NOW (SPACE)
              </button>
              <p className="gta-controls-note">
                Supports Gamepad triggers/left stick and mobile touch controls
                (switch between Floating Joystick and Thumb Pedals in SETTINGS).
              </p>
            </div>
          )}

          {activeTab === "SETTINGS" && (
            <div className="gta-settings-preview-box">
              <div className="gta-card-header">
                <h4>GAME & AUDIO SETTINGS</h4>
                <span className="gta-badge-pill">SAVED AUTOMATICALLY</span>
              </div>

              <div className="gta-track-stats-grid">
                <div className="track-stat-tile">
                  <span className="tile-label">MASTER SOUND</span>
                  <span className="tile-value">
                    {isMuted ? "MUTED" : `${Math.round(audioVolume * 100)}%`}
                  </span>
                </div>
                <div className="track-stat-tile">
                  <span className="tile-label">SPEED READOUT</span>
                  <span className="tile-value">{speedUnit}</span>
                </div>
                <div className="track-stat-tile">
                  <span className="tile-label">MOBILE TOUCH MODE</span>
                  <span className="tile-value">
                    {touchMode === "joystick"
                      ? "FLOATING JOYSTICK"
                      : "ARCADE PEDALS"}
                  </span>
                </div>
                <div className="track-stat-tile">
                  <span className="tile-label">CORNER MINIMAP</span>
                  <span className="tile-value">
                    {showMinimap ? "VISIBLE" : "HIDDEN (CLEAN)"}
                  </span>
                </div>
              </div>

              <div className="gta-info-box">
                <h5>ENGINE SPECIFICATIONS</h5>
                <p>
                  <strong>3D Engine:</strong> Official PixiJS 3D (WebGPU / WebGL2)
                </p>
                <p>
                  <strong>Physics:</strong> Crashcat Continuous Sphere & Wall
                  Colliders
                </p>
                <p>
                  <strong>Transmission:</strong> 3-Speed Procedural Engine Synth
                  & Tire Skid Audio
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Action Legend */}
      <footer className="gta-action-legend">
        <div
          className="legend-item"
          onClick={() => menuItems[selectedIdx]?.action()}
        >
          <span className="legend-badge">ENTER</span>
          <span className="legend-label">SELECT</span>
        </div>
        <div className="legend-item" onClick={onStartRace}>
          <span className="legend-badge">SPACE</span>
          <span className="legend-label">PLAY NOW</span>
        </div>
        <div className="legend-item" onClick={onClose}>
          <span className="legend-badge">ESC</span>
          <span className="legend-label">RESUME</span>
        </div>
        <div className="legend-item">
          <span className="legend-badge">↑ ↓</span>
          <span className="legend-label">NAVIGATE</span>
        </div>
        <div className="legend-item">
          <span className="legend-badge">← →</span>
          <span className="legend-label">TABS</span>
        </div>
        <div
          className="legend-item"
          onClick={() => {
            onResetVehicle();
            onClose();
          }}
        >
          <span className="legend-badge">R</span>
          <span className="legend-label">RESPAWN</span>
        </div>
        <div className="legend-item" onClick={toggleFullscreen}>
          <span className="legend-badge">F</span>
          <span className="legend-label">FULLSCREEN</span>
        </div>
      </footer>
    </div>
  );
}
