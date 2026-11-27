import { useState, useEffect } from "react";
import { GtaAudio } from "../utils/gtaAudio";
import { CAMERA_MODES } from "../game/pixi-racing/Camera";
import { TRACK_DEFINITIONS, TRACK_LIST } from "../game/pixi-racing/Track";
import { formatLapTime } from "../game/pixi-racing/LapTimer";
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
  speedUnit: "MPH" | "KMH";
  onToggleSpeedUnit: () => void;
  touchMode: "joystick" | "pedals";
  onToggleTouchMode: () => void;
  toggleFullscreen: () => void;
  vehicleOptions: Array<{ key: string; label: string; color: string }>;
  meshState: MeshStateSnapshot;
  initialTab?: MenuTab;
  initialRoomCode?: string;
  onHostRoom: (customCode?: string) => void;
  onJoinRoom: (code: string) => void;
  onLeaveRoom: () => void;
  onChangeDriverName: (name: string) => void;
  onClearRoomUrl?: () => void;
}

export type MenuTab = "PLAY" | "LEVELS" | "SETUP" | "MULTIPLAYER";

function getStoredBestLap(trackId: string): number | null {
  try {
    const raw = localStorage.getItem(`racing.bestLap.${trackId}`);
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function TrackMinimapSvg({ trackId }: { trackId: string }) {
  const def =
    TRACK_DEFINITIONS[trackId as keyof typeof TRACK_DEFINITIONS] ||
    TRACK_DEFINITIONS["level-1"];
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
        strokeWidth="0.68"
        strokeLinejoin="round"
      />
      <polygon
        points={points}
        fill="none"
        stroke="#facc15"
        strokeWidth="0.19"
        strokeLinejoin="round"
      />
      {bumps.map(([gx, gz], idx) => (
        <circle
          key={`bump-${idx}`}
          cx={gx + 0.5}
          cy={gz + 0.5}
          r="0.24"
          fill="#00e5ff"
        />
      ))}
      <rect
        x={finish[0] + 0.22}
        y={finish[1] + 0.36}
        width="0.56"
        height="0.28"
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
  speedUnit,
  onToggleSpeedUnit,
  touchMode,
  onToggleTouchMode,
  toggleFullscreen,
  vehicleOptions,
  meshState,
  initialTab = "PLAY",
  initialRoomCode = "",
  onHostRoom,
  onJoinRoom,
  onLeaveRoom,
  onChangeDriverName,
  onClearRoomUrl,
}: GtaMenuProps) {
  const [activeTab, setActiveTab] = useState<MenuTab>(initialTab);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [roomInput, setRoomInput] = useState(initialRoomCode);
  const [nameInput, setNameInput] = useState(meshState.driverName);
  const [copiedLink, setCopiedLink] = useState(false);

  const tabs: MenuTab[] = ["PLAY", "LEVELS", "SETUP", "MULTIPLAYER"];

  useEffect(() => {
    if (initialRoomCode) {
      setRoomInput(initialRoomCode);
      setActiveTab("MULTIPLAYER");
    }
  }, [initialRoomCode]);

  useEffect(() => {
    setNameInput(meshState.driverName);
  }, [meshState.driverName]);

  const currentTrackInfo =
    TRACK_DEFINITIONS[selectedTrack as keyof typeof TRACK_DEFINITIONS] ||
    TRACK_DEFINITIONS["level-1"];

  const canSwitchTrack =
    meshState.status === "offline" ||
    meshState.isHost ||
    meshState.status === "error";

  const cycleLevel = () => {
    if (!canSwitchTrack) {
      GtaAudio.playBack();
      return;
    }
    const idx = TRACK_LIST.findIndex((t) => t.id === selectedTrack);
    const next = TRACK_LIST[(idx + 1) % TRACK_LIST.length];
    GtaAudio.playSelect();
    onSelectTrack(next.id);
  };

  const cycleRaceMode = () => {
    const order: Array<"solo" | "ghost" | "ai"> = ["solo", "ai", "ghost"];
    const next = order[(order.indexOf(raceMode) + 1) % order.length];
    GtaAudio.playSelect();
    onSelectRaceMode(next);
  };

  const cycleTruck = () => {
    const idx = vehicleOptions.findIndex((v) => v.key === selectedColor);
    const next = vehicleOptions[(idx + 1) % vehicleOptions.length];
    onSelectColor(next.key);
  };

  const cycleCamera = () => {
    const idx = CAMERA_MODES.findIndex((m) => m.key === selectedCamera);
    const next = CAMERA_MODES[(idx + 1) % CAMERA_MODES.length];
    onSelectCamera(next.key);
  };

  let menuItems: Array<{
    id: string;
    label: string;
    badge?: string;
    action: () => void;
  }> = [];

  if (activeTab === "PLAY") {
    menuItems = [
      {
        id: "start",
        label: "▶ START RACE / RESUME",
        badge: "SPACE",
        action: () => {
          GtaAudio.playSelect();
          onStartRace();
        },
      },
      {
        id: "cycle-level",
        label: `CIRCUIT: ${currentTrackInfo.shortName}`,
        badge: canSwitchTrack ? "CHANGE" : "HOST",
        action: cycleLevel,
      },
      {
        id: "cycle-mode",
        label: `RACE MODE: ${
          raceMode === "ai"
            ? "3 AI RIVALS"
            : raceMode === "ghost"
            ? "BEST-LAP GHOST"
            : "SOLO PRACTICE"
        }`,
        badge: "CYCLE",
        action: cycleRaceMode,
      },
      {
        id: "cycle-truck",
        label: `TRUCK: ${
          (
            vehicleOptions.find((v) => v.key === selectedColor)?.label ||
            "Yellow Truck"
          ).toUpperCase()
        }`,
        badge: "CYCLE",
        action: cycleTruck,
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
  } else if (activeTab === "LEVELS") {
    menuItems = [
      ...TRACK_LIST.map((t) => {
        const best = getStoredBestLap(t.id);
        const cleared = best !== null && best <= t.targetLapSec;
        return {
          id: `track-${t.id}`,
          label: t.name.toUpperCase(),
          badge:
            selectedTrack === t.id
              ? "ACTIVE"
              : cleared
              ? "✓ CLEARED"
              : t.difficulty,
          action: () => {
            if (!canSwitchTrack) {
              GtaAudio.playBack();
              return;
            }
            GtaAudio.playSelect();
            onSelectTrack(t.id);
          },
        };
      }),
      {
        id: "levels-mode",
        label: `MODE: ${
          raceMode === "ai"
            ? "3 AI RIVALS"
            : raceMode === "ghost"
            ? "BEST-LAP GHOST"
            : "SOLO PRACTICE"
        }`,
        badge: "CYCLE",
        action: cycleRaceMode,
      },
    ];
  } else if (activeTab === "SETUP") {
    const camLabel = (
      CAMERA_MODES.find((m) => m.key === selectedCamera)?.label || "Chase View"
    ).toUpperCase();

    menuItems = [
      {
        id: "setup-truck",
        label: `TRUCK COLOR: ${
          (
            vehicleOptions.find((v) => v.key === selectedColor)?.label ||
            "Yellow Truck"
          ).toUpperCase()
        }`,
        badge: "CYCLE",
        action: cycleTruck,
      },
      {
        id: "setup-cam",
        label: `CAMERA VIEW: ${camLabel}`,
        badge: "CYCLE",
        action: cycleCamera,
      },
      {
        id: "setup-sound",
        label: "SOUND EFFECTS",
        badge: isMuted ? "MUTED" : "ON",
        action: () => {
          onToggleMute();
          GtaAudio.playSelect();
        },
      },
      {
        id: "setup-unit",
        label: "SPEEDOMETER UNIT",
        badge: speedUnit,
        action: () => {
          GtaAudio.playSelect();
          onToggleSpeedUnit();
        },
      },
      {
        id: "setup-touch",
        label: "TOUCH CONTROLS",
        badge: touchMode === "joystick" ? "JOYSTICK" : "PEDALS",
        action: () => {
          GtaAudio.playSelect();
          onToggleTouchMode();
        },
      },
      {
        id: "setup-fs",
        label: "FULLSCREEN MODE",
        badge: "F",
        action: () => {
          GtaAudio.playSelect();
          toggleFullscreen();
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
            : roomInput.trim()
            ? `HOST ROOM [${roomInput.trim().toUpperCase()}]`
            : "HOST WI-FI MESH ROOM",
        badge: meshState.status === "hosting" ? "LIVE" : "HOST",
        action: () => {
          GtaAudio.playSelect();
          onHostRoom(roomInput.trim() || undefined);
        },
      },
      {
        id: "mp-join",
        label: roomInput.trim()
          ? `JOIN ROOM [${roomInput.trim().toUpperCase()}]`
          : "JOIN ROOM BY CODE",
        badge: roomInput.trim() ? "JOIN" : "CODE",
        action: () => {
          GtaAudio.playSelect();
          if (roomInput.trim()) onJoinRoom(roomInput);
        },
      },
      {
        id: "mp-play",
        label: "▶ DRIVE ON TRACK (SOLO)",
        badge: "SPACE",
        action: () => {
          GtaAudio.playSelect();
          onClearRoomUrl?.();
          onStartRace();
        },
      },
      ...(meshState.status === "hosting" || meshState.status === "connected"
        ? [
            {
              id: "mp-leave",
              label: "LEAVE MULTIPLAYER ROOM",
              badge: "EXIT",
              action: () => {
                GtaAudio.playBack();
                onClearRoomUrl?.();
                onLeaveRoom();
              },
            },
          ]
        : []),
    ];
  }

  useEffect(() => {
    if (selectedIdx >= menuItems.length) {
      setSelectedIdx(Math.max(0, menuItems.length - 1));
    }
  }, [activeTab, menuItems.length, selectedIdx]);

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
  const activeVehicleObj =
    vehicleOptions.find((v) => v.key === selectedColor) || vehicleOptions[0];

  const previewTrackId =
    activeTab === "LEVELS" && currentItem?.id.startsWith("track-")
      ? currentItem.id.replace("track-", "")
      : selectedTrack;
  const previewTrackInfo =
    TRACK_DEFINITIONS[previewTrackId as keyof typeof TRACK_DEFINITIONS] ||
    currentTrackInfo;
  const previewBestNum = getStoredBestLap(previewTrackId);
  const previewCleared =
    previewBestNum !== null && previewBestNum <= previewTrackInfo.targetLapSec;

  const handleCopyInviteLink = () => {
    const code = meshState.roomCode || roomInput.trim();
    if (!code) return;
    const base = window.location.href.split("?")[0];
    const url = `${base}?room=${code.toUpperCase()}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedLink(true);
    GtaAudio.playSelect();
    setTimeout(() => setCopiedLink(false), 1800);
  };

  return (
    <div className="gta-menu-overlay">
      <div className="gta-backdrop-vignette" />

      {/* Clean Focused Header */}
      <header className="gta-header-bar">
        <div className="gta-header-left">
          <div className="gta-logo-container">
            <span className="gta-logo-main">MINI BATTLE</span>
            <span className="gta-logo-sub">6-SPEED 3D RACING</span>
          </div>
          {(meshState.status === "hosting" ||
            meshState.status === "connected") && (
            <div className="gta-header-pill">
              ROOM {meshState.roomCode} • {meshState.players.length} ONLINE
            </div>
          )}
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
              {tab}
            </button>
          ))}
        </nav>

        <div className="gta-header-right">
          <div className="gta-track-status-badge">
            <span className="track-status-dot" />
            <span className="track-status-text">
              {currentTrackInfo.shortName}
            </span>
          </div>
          <div className="gta-header-meta">
            <span>BEST {bestLapFormatted}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="gta-menu-content">
        <div className="gta-menu-list-wrapper">
          <div className="gta-menu-list-header">
            <h3>{activeTab}</h3>
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
                  onClick={() => {
                    setSelectedIdx(idx);
                    item.action();
                  }}
                >
                  <span className="gta-item-text">{item.label}</span>
                  {item.badge && (
                    <span className="gta-item-badge">{item.badge}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="gta-detail-card">
          {(activeTab === "PLAY" || activeTab === "LEVELS") && (
            <div className="gta-track-preview-box">
              <div className="gta-card-header">
                <h4>{previewTrackInfo.name.toUpperCase()}</h4>
                <span
                  className={`gta-badge-pill ${previewCleared ? "cleared" : ""}`}
                >
                  {previewCleared
                    ? "✓ LEVEL CLEARED"
                    : previewTrackInfo.difficulty}
                </span>
              </div>

              <div className="track-svg-frame">
                <TrackMinimapSvg trackId={previewTrackId} />
                <div className="track-svg-legend">
                  <span className="legend-dot finish" /> START / FINISH
                  {previewTrackInfo.bumps > 0 && (
                    <>
                      <span className="legend-dot bump" />{" "}
                      {previewTrackInfo.bumps} JUMP BUMPS
                    </>
                  )}
                </div>
              </div>

              <div className="gta-track-stats-grid">
                <div className="track-stat-tile">
                  <span className="tile-label">DISTANCE / TURNS</span>
                  <span className="tile-value">
                    {previewTrackInfo.lengthLabel} • {previewTrackInfo.corners}{" "}
                    CORNERS
                  </span>
                </div>
                <div className="track-stat-tile">
                  <span className="tile-label">TARGET TIME</span>
                  <span className="tile-value">
                    {formatLapTime(previewTrackInfo.targetLapSec)}
                  </span>
                </div>
                <div className="track-stat-tile">
                  <span className="tile-label">YOUR BEST LAP</span>
                  <span className="tile-value">
                    {previewBestNum !== null
                      ? formatLapTime(previewBestNum)
                      : "--:--.--"}
                  </span>
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
                    if (
                      activeTab === "LEVELS" &&
                      canSwitchTrack &&
                      previewTrackId !== selectedTrack
                    ) {
                      onSelectTrack(previewTrackId);
                    }
                    onStartRace();
                  }}
                >
                  ▶ DRIVE LEVEL {previewTrackInfo.level} (SPACE)
                </button>
                {activeTab === "LEVELS" && (
                  <button
                    className="gta-card-secondary-btn"
                    onClick={() => {
                      GtaAudio.playBack();
                      onClearBestLap();
                    }}
                  >
                    RESET BEST
                  </button>
                )}
              </div>

              <p className="gta-vehicle-desc" style={{ marginTop: 12 }}>
                {previewTrackInfo.desc}
              </p>
            </div>
          )}

          {activeTab === "SETUP" && (
            <div className="gta-vehicle-preview-box">
              <div className="gta-card-header">
                <h4>{activeVehicleObj.label.toUpperCase()}</h4>
                <span className="gta-badge-pill">6-SPEED GEARBOX</span>
              </div>

              <div className="setup-swatches-row">
                {vehicleOptions.map((opt) => (
                  <button
                    key={opt.key}
                    className={`setup-swatch-btn ${
                      selectedColor === opt.key ? "active" : ""
                    }`}
                    onClick={() => onSelectColor(opt.key)}
                  >
                    <span
                      className="swatch-dot"
                      style={{ backgroundColor: opt.color }}
                    />
                    <span>{opt.label.split(" ")[0].toUpperCase()}</span>
                  </button>
                ))}
              </div>

              <div className="gta-controls-grid">
                <div className="gta-key-card">
                  <kbd>W A S D / ARROWS</kbd>
                  <span>DRIVE & DRIFT</span>
                </div>
                <div className="gta-key-card">
                  <kbd>C</kbd>
                  <span>CAMERA ANGLE</span>
                </div>
                <div className="gta-key-card">
                  <kbd>R</kbd>
                  <span>RESPAWN GRID</span>
                </div>
                <div className="gta-key-card">
                  <kbd>M / F / ESC</kbd>
                  <span>MUTE / FULLSCREEN / MENU</span>
                </div>
              </div>

              <button
                className="gta-card-action-btn"
                style={{ marginBottom: 0 }}
                onClick={() => {
                  GtaAudio.playSelect();
                  onStartRace();
                }}
              >
                ▶ DRIVE NOW (SPACE)
              </button>
            </div>
          )}

          {activeTab === "MULTIPLAYER" && (
            <div className="mesh-console-box">
              <div className="gta-card-header">
                <h4>WI-FI MESH CONSOLE</h4>
                <span
                  className={`mesh-status-pill status-${meshState.status}`}
                >
                  {meshState.status === "hosting"
                    ? `HOST [${meshState.roomCode}]`
                    : meshState.status === "connected"
                    ? `ONLINE [${meshState.roomCode}]`
                    : meshState.status.toUpperCase()}
                </span>
              </div>

              <div className="mesh-form-grid">
                <div className="mesh-field">
                  <label>DRIVER NAME</label>
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
                  <label>ROOM CODE</label>
                  <div className="mesh-input-row">
                    <input
                      type="text"
                      maxLength={6}
                      value={roomInput}
                      onChange={(e) =>
                        setRoomInput(e.target.value.toUpperCase())
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && roomInput.trim()) {
                          e.preventDefault();
                          GtaAudio.playSelect();
                          onJoinRoom(roomInput);
                        }
                      }}
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

              {initialRoomCode &&
                meshState.status === "offline" &&
                !meshState.error && (
                  <div className="mesh-invite-card">
                    <div className="mesh-invite-title">
                      INVITED TO ROOM: <strong>[{initialRoomCode}]</strong>
                    </div>
                    <p className="mesh-invite-desc">
                      Join this session with friends, or host it yourself if you arrived first!
                    </p>
                    <div className="mesh-invite-actions">
                      <button
                        className="mesh-action-btn-gold"
                        onClick={() => {
                          GtaAudio.playSelect();
                          onJoinRoom(initialRoomCode);
                        }}
                      >
                        ▶ JOIN ROOM [{initialRoomCode}]
                      </button>
                      <button
                        className="mesh-action-btn-subtle"
                        onClick={() => {
                          GtaAudio.playSelect();
                          onHostRoom(initialRoomCode);
                        }}
                      >
                        ⚡ HOST ROOM [{initialRoomCode}]
                      </button>
                    </div>
                  </div>
                )}

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
                      {copiedLink ? "✓ COPIED" : "COPY LINK"}
                    </button>
                    <button
                      className="danger"
                      onClick={() => {
                        onClearRoomUrl?.();
                        onLeaveRoom();
                      }}
                    >
                      LEAVE
                    </button>
                  </div>
                </div>
              )}

              {meshState.error && (
                <div className="mesh-error-card">
                  <div className="mesh-error-title">
                    <span>⚠️</span>
                    <span>{meshState.error}</span>
                  </div>
                  <p className="mesh-error-desc">
                    {meshState.failedRoomCode
                      ? `Host for [${meshState.failedRoomCode}] is offline or not created yet. You can host this room code directly so your friends can join you, retry connecting, or drive solo!`
                      : "Check your Wi-Fi or internet connection, or try hosting a fresh room."}
                  </p>
                  <div className="mesh-error-actions">
                    {meshState.failedRoomCode && (
                      <button
                        className="mesh-action-btn-gold"
                        onClick={() => {
                          GtaAudio.playSelect();
                          onHostRoom(meshState.failedRoomCode || roomInput);
                        }}
                      >
                        ⚡ HOST ROOM [{meshState.failedRoomCode}]
                      </button>
                    )}
                    <button
                      className="mesh-action-btn-subtle"
                      onClick={() => {
                        GtaAudio.playSelect();
                        if (roomInput.trim()) onJoinRoom(roomInput);
                      }}
                    >
                      ↺ RETRY JOIN
                    </button>
                    <button
                      className="mesh-action-btn-subtle"
                      onClick={() => {
                        GtaAudio.playSelect();
                        onClearRoomUrl?.();
                        onStartRace();
                      }}
                    >
                      ▶ DRIVE SOLO
                    </button>
                    <button
                      className="mesh-action-btn-subtle"
                      onClick={() => {
                        GtaAudio.playBack();
                        setRoomInput("");
                        onClearRoomUrl?.();
                        onLeaveRoom();
                      }}
                    >
                      ✕ CLEAR CODE
                    </button>
                  </div>
                </div>
              )}

              <div className="mesh-roster">
                <div className="mesh-section-title">
                  DRIVERS ({meshState.players.length})
                </div>
                {meshState.players.length === 0 ? (
                  <div className="mesh-empty-roster">
                    Host a room or join with a friend&apos;s code on the same Wi-Fi.
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
                            LAP {p.lap} •{" "}
                            {p.isSelf && p.isHost ? "0ms" : `${p.pingMs}ms`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mesh-log-panel">
                <div className="mesh-section-title">CONSOLE LOG</div>
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
        </div>
      </main>

      {/* Essential Bottom Legend */}
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
          <span className="legend-label">MOVE</span>
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
      </footer>
    </div>
  );
}
