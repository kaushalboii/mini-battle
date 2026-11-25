import { useEffect, useMemo, useRef, useState } from "react";
import { initRacingGame, type GameInstance } from "../game/pixi-racing/initGame";
import { CAMERA_MODES } from "../game/pixi-racing/Camera";
import { TRACK_DEFINITIONS } from "../game/pixi-racing/Track";
import {
  MeshNetworkManager,
  type MeshStateSnapshot,
} from "../game/multiplayer/MeshNetwork";
import GtaMenu, { type MenuTab } from "./GtaMenu";
import { GtaAudio } from "../utils/gtaAudio";
import "../styles/racing.css";

const VEHICLE_OPTIONS = [
  { key: "vehicle-truck-yellow", label: "Yellow Truck", color: "#facc15" },
  { key: "vehicle-truck-red", label: "Red Truck", color: "#ef4444" },
  { key: "vehicle-truck-green", label: "Green Truck", color: "#22c55e" },
  { key: "vehicle-truck-purple", label: "Purple Truck", color: "#a855f7" },
];

function loadPref<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function savePref(key: string, val: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // ignore
  }
}

export default function RacingGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameInstance | null>(null);
  const meshRef = useRef<MeshNetworkManager | null>(null);

  // Direct DOM refs so 60fps HUD updates cause ZERO React re-renders
  const speedValRef = useRef<HTMLDivElement>(null);
  const gearBadgeRef = useRef<HTMLDivElement>(null);
  const rpmFillRef = useRef<HTMLDivElement>(null);
  const minimapPlayerRef = useRef<SVGCircleElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadLabel, setLoadLabel] = useState("Initializing PixiJS 3D...");

  const [selectedColor, setSelectedColor] = useState<string>(() =>
    loadPref("miniBattle.vehicleColor", "vehicle-truck-yellow")
  );
  const [cameraMode, setCameraMode] = useState<string>(() =>
    loadPref("miniBattle.cameraMode", "chase")
  );
  const [selectedTrack, setSelectedTrack] = useState<string>("level-1");
  const [raceMode, setRaceMode] = useState<"solo" | "ghost" | "ai">("solo");

  const [isMuted, setIsMuted] = useState<boolean>(() => GtaAudio.isMuted());
  const [speedUnit, setSpeedUnit] = useState<"MPH" | "KMH">(() =>
    loadPref("miniBattle.speedUnit", "MPH")
  );
  const [touchMode, setTouchMode] = useState<"joystick" | "pedals">(() =>
    loadPref("miniBattle.touchMode", "joystick")
  );

  const [camToast, setCamToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isGtaMenuOpen, setIsGtaMenuOpen] = useState(true);

  const [lapStats, setLapStats] = useState({
    bestLapFormatted: "--:--.--",
    lastLapFormatted: "--:--.--",
  });

  // Minimap geometry rebuilt ONLY when track switches (not per frame)
  const [minimapGeo, setMinimapGeo] = useState<{
    points: string;
    viewBox: string;
  }>({ points: "", viewBox: "-45 -30 60 60" });

  const [urlRoomCode] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return (params.get("room") || "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 6);
    } catch {
      return "";
    }
  });
  const [initialMenuTab] = useState<MenuTab>(() =>
    urlRoomCode ? "MULTIPLAYER" : "PLAY"
  );

  const [meshState, setMeshState] = useState<MeshStateSnapshot>({
    status: "offline",
    roomCode: "",
    isHost: false,
    localId: "",
    driverName: "RACER-1",
    trackId: "level-1",
    players: [],
    logs: [],
    error: null,
    failedRoomCode: null,
  });

  const isTouchDevice = useMemo(
    () =>
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0),
    []
  );

  const syncTrackAndLapMeta = (instance: GameInstance | null) => {
    if (!instance) return;
    const t = instance.getTelemetry();
    setLapStats({
      bestLapFormatted: t.bestLapFormatted,
      lastLapFormatted: t.lastLapFormatted,
    });
    if (t.waypoints.length > 0) {
      setMinimapGeo({
        points: t.waypoints.map((w) => `${w.x.toFixed(1)},${w.z.toFixed(1)}`).join(" "),
        viewBox: `${t.bounds.minX - 6} ${t.bounds.minZ - 6} ${
          t.bounds.maxX - t.bounds.minX + 12
        } ${t.bounds.maxZ - t.bounds.minZ + 12}`,
      });
    }
  };

  useEffect(() => {
    const mesh = new MeshNetworkManager(
      (snap) => setMeshState(snap),
      (syncedTrackId) => {
        setSelectedTrack(syncedTrackId);
        gameRef.current?.setTrack(syncedTrackId);
        syncTrackAndLapMeta(gameRef.current);
      }
    );
    meshRef.current = mesh;
    setMeshState(mesh.getSnapshot());

    return () => {
      mesh.disconnect(true);
      meshRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (
      meshState.status === "hosting" &&
      meshState.roomCode &&
      typeof window !== "undefined"
    ) {
      const url = new URL(window.location.href);
      if (url.searchParams.get("room") !== meshState.roomCode) {
        url.searchParams.set("room", meshState.roomCode);
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [meshState.status, meshState.roomCode]);

  useEffect(() => {
    if (!canvasRef.current) return;
    let isDisposed = false;

    initRacingGame(canvasRef.current, (progress, label) => {
      if (isDisposed) return;
      setLoadProgress(Math.round(progress * 100));
      setLoadLabel(label);
    })
      .then((instance) => {
        if (isDisposed) {
          instance.destroy();
          return;
        }
        gameRef.current = instance;
        instance.setVehicleColor(selectedColor);
        instance.setCameraMode(cameraMode);
        instance.setAudioMuted(isMuted);
        instance.setTouchMode(touchMode);
        instance.setPaused(isGtaMenuOpen);
        syncTrackAndLapMeta(instance);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to start PixiJS 3D Racing:", err);
        setErrorMsg(err?.message || "Failed to initialize 3D canvas");
        setIsLoading(false);
      });

    return () => {
      isDisposed = true;
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.setPaused(isGtaMenuOpen);
      if (isGtaMenuOpen) {
        syncTrackAndLapMeta(gameRef.current);
      }
    }
  }, [isGtaMenuOpen]);

  // Direct DOM HUD & Mesh pose loop — ZERO React state updates per frame
  useEffect(() => {
    let animId: number;
    let lastMeshSend = 0;
    let lastSpeedShown = -1;
    let lastGearShown = -1;
    let lastRpmShown = -1;

    const tickHud = (now: number) => {
      const game = gameRef.current;
      if (game && !isGtaMenuOpen) {
        const snap = game.getTelemetry();

        const spd = speedUnit === "MPH" ? snap.mph : snap.kmh;
        if (spd !== lastSpeedShown && speedValRef.current) {
          lastSpeedShown = spd;
          speedValRef.current.textContent = String(spd);
        }

        if (snap.gear !== lastGearShown && gearBadgeRef.current) {
          lastGearShown = snap.gear;
          gearBadgeRef.current.textContent = `GEAR ${
            snap.gear === 0 ? "N" : snap.gear
          } / 6`;
        }

        const rpmPct =
          snap.gear === 0 ? 0 : Math.min(100, Math.round(snap.rpm * 100));
        if (rpmPct !== lastRpmShown && rpmFillRef.current) {
          lastRpmShown = rpmPct;
          rpmFillRef.current.style.width = `${rpmPct}%`;
        }

        if (minimapPlayerRef.current) {
          minimapPlayerRef.current.setAttribute("cx", snap.x.toFixed(1));
          minimapPlayerRef.current.setAttribute("cy", snap.z.toFixed(1));
        }

        const mesh = meshRef.current;
        if (mesh) {
          const ms = mesh.getSnapshot();
          if (ms.status === "hosting" || ms.status === "connected") {
            game.syncRemotePlayers(ms.players);
            if (now - lastMeshSend >= 50) {
              lastMeshSend = now;
              mesh.updateLocalPose({
                x: snap.x,
                y: snap.y,
                z: snap.z,
                yaw: snap.yaw,
                speed: snap.speedNormalized * 1.75,
                color: selectedColor,
                lap: snap.lap,
                bestLap: snap.bestLap,
              });
            }
          } else {
            game.syncRemotePlayers([]);
          }
        }
      }
      animId = requestAnimationFrame(tickHud);
    };

    animId = requestAnimationFrame(tickHud);
    return () => cancelAnimationFrame(animId);
  }, [isGtaMenuOpen, speedUnit, selectedColor]);

  const showToast = (msg: string) => {
    setCamToast(msg);
    setTimeout(() => {
      setCamToast((cur) => (cur === msg ? null : cur));
    }, 1400);
  };

  const handleReset = () => {
    GtaAudio.playSelect();
    gameRef.current?.resetPosition();
  };

  const handleColorChange = (key: string) => {
    GtaAudio.playSelect();
    setSelectedColor(key);
    savePref("miniBattle.vehicleColor", key);
    gameRef.current?.setVehicleColor(key);
  };

  const handleSelectCamera = (key: string) => {
    GtaAudio.playSelect();
    setCameraMode(key);
    savePref("miniBattle.cameraMode", key);
    gameRef.current?.setCameraMode(key);
    const info = CAMERA_MODES.find((m) => m.key === key);
    if (info) showToast(info.label.toUpperCase());
  };

  const handleCycleCamera = () => {
    if (!gameRef.current) return;
    GtaAudio.playSelect();
    const nextMode = gameRef.current.cycleCameraMode();
    setCameraMode(nextMode);
    savePref("miniBattle.cameraMode", nextMode);
    const info = CAMERA_MODES.find((m) => m.key === nextMode);
    if (info) showToast(info.label.toUpperCase());
  };

  const handleSelectTrack = (trackId: string) => {
    setSelectedTrack(trackId);
    gameRef.current?.setTrack(trackId);
    meshRef.current?.setTrackId(trackId);
    syncTrackAndLapMeta(gameRef.current);
    const info =
      TRACK_DEFINITIONS[trackId as keyof typeof TRACK_DEFINITIONS];
    if (info) showToast(info.shortName);
  };

  const handleSelectRaceMode = (mode: "solo" | "ghost" | "ai") => {
    setRaceMode(mode);
    gameRef.current?.setRaceMode(mode);
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    GtaAudio.setMuted(next);
    gameRef.current?.setAudioMuted(next);
  };

  const handleToggleSpeedUnit = () => {
    const next = speedUnit === "MPH" ? "KMH" : "MPH";
    setSpeedUnit(next);
    savePref("miniBattle.speedUnit", next);
  };

  const handleToggleTouchMode = () => {
    const next = touchMode === "joystick" ? "pedals" : "joystick";
    setTouchMode(next);
    savePref("miniBattle.touchMode", next);
    gameRef.current?.setTouchMode(next);
  };

  const toggleFullscreen = () => {
    GtaAudio.playSelect();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const toggleGtaMenu = () => {
    if (isGtaMenuOpen) {
      GtaAudio.playBack();
      setIsGtaMenuOpen(false);
    } else {
      GtaAudio.playSelect();
      setIsGtaMenuOpen(true);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code === "Escape") {
        e.preventDefault();
        toggleGtaMenu();
      } else if (!isGtaMenuOpen) {
        if (e.code === "KeyC") {
          handleCycleCamera();
        } else if (e.code === "KeyR") {
          handleReset();
        } else if (e.code === "KeyM") {
          handleToggleMute();
        } else if (e.code === "KeyF") {
          toggleFullscreen();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isGtaMenuOpen, isMuted]);

  const currentCamInfo =
    CAMERA_MODES.find((m) => m.key === cameraMode) || CAMERA_MODES[0];
  const isMeshOnline =
    meshState.status === "hosting" || meshState.status === "connected";
  const liftForPedals = isTouchDevice && touchMode === "pedals";

  return (
    <div className="racing-root">
      <canvas ref={canvasRef} className="racing-canvas" />

      {isLoading && (
        <div className="gta-loading-overlay">
          <div className="gta-loading-card">
            <div className="gta-loading-spinner" />
            <h2 className="gta-loading-title">MINI BATTLE</h2>
            <p className="gta-loading-subtitle">6-SPEED 3D RACING • PIXI 3D</p>
            <div className="gta-progress-track">
              <div
                className="gta-progress-fill"
                style={{ width: `${loadProgress}%` }}
              />
            </div>
            <p className="gta-progress-label">
              {loadLabel} ({loadProgress}%)
            </p>
          </div>
        </div>
      )}

      {camToast && !isGtaMenuOpen && (
        <div className="gta-camera-toast">
          <span>{camToast}</span>
        </div>
      )}

      {errorMsg && (
        <div className="gta-loading-overlay">
          <div className="gta-loading-card">
            <h2 style={{ color: "#ef4444" }}>Initialization Failed</h2>
            <p>{errorMsg}</p>
            <button
              className="gta-btn gta-btn-primary"
              onClick={() => window.location.reload()}
              style={{ marginTop: "1rem" }}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Clean In-Game HUD */}
      {!isLoading && !isGtaMenuOpen && (
        <>
          <div className="gta-hud-top-left">
            <button
              className="gta-hud-btn gta-menu-trigger-btn"
              onClick={() => {
                GtaAudio.playSelect();
                setIsGtaMenuOpen(true);
              }}
              onMouseEnter={() => GtaAudio.playHover()}
              title="Open Menu (ESC)"
            >
              <span className="gta-btn-key">ESC</span>
              <span className="gta-btn-label">MENU</span>
            </button>
            {isMeshOnline && (
              <div className="hud-mesh-live-pill">
                <span className="live-dot" />
                <span>
                  {meshState.roomCode} • {meshState.players.length} LIVE
                </span>
              </div>
            )}
          </div>

          <div className="gta-hud-top-right">
            <div className="gta-hud-action-row">
              <button
                className="gta-hud-btn"
                onClick={handleCycleCamera}
                onMouseEnter={() => GtaAudio.playHover()}
                title="Switch Camera (C)"
              >
                <span className="gta-btn-key">C</span>
                <span className="gta-btn-label">
                  CAM: {currentCamInfo.label.toUpperCase()}
                </span>
              </button>

              <button
                className="gta-hud-btn gta-hud-btn-danger"
                onClick={handleReset}
                onMouseEnter={() => GtaAudio.playHover()}
                title="Respawn Truck (R)"
              >
                <span className="gta-btn-key">R</span>
                <span className="gta-btn-label">↺ RESPAWN</span>
              </button>

              <button
                className="gta-hud-btn"
                onClick={handleToggleMute}
                onMouseEnter={() => GtaAudio.playHover()}
                title="Toggle Sound (M)"
              >
                <span className="gta-btn-key">M</span>
                <span className="gta-btn-label">
                  {isMuted ? "MUTED" : "SFX"}
                </span>
              </button>

              <button
                className="gta-hud-btn gta-hud-btn-sq"
                onClick={toggleFullscreen}
                onMouseEnter={() => GtaAudio.playHover()}
                title="Fullscreen (F)"
              >
                ⛶
              </button>
            </div>
          </div>

          {/* Static Polygon + Single Ref-Updated Car Dot */}
          {minimapGeo.points && (
            <div
              className={`hud-minimap-card ${liftForPedals ? "lifted" : ""}`}
            >
              <svg viewBox={minimapGeo.viewBox} className="hud-minimap-svg">
                <polygon
                  points={minimapGeo.points}
                  fill="none"
                  stroke="rgba(255,255,255,0.34)"
                  strokeWidth="4.6"
                  strokeLinejoin="round"
                />
                {meshState.players
                  .filter((p) => !p.isSelf)
                  .map((p) => (
                    <circle
                      key={p.id}
                      cx={p.x}
                      cy={p.z}
                      r="2.6"
                      fill="#00e5ff"
                    />
                  ))}
                <circle
                  ref={minimapPlayerRef}
                  cx={3.5}
                  cy={5}
                  r="3.2"
                  fill="#facc15"
                  stroke="#000"
                  strokeWidth="0.9"
                />
              </svg>
            </div>
          )}

          {/* Ref-Updated 6-Speed Speedometer & Live RPM Bar */}
          <div
            className={`gta-hud-speedometer ${
              liftForPedals ? "lifted-right" : ""
            }`}
          >
            <div ref={speedValRef} className="gta-speed-value">
              0
            </div>
            <div className="gta-speed-unit">{speedUnit}</div>
            <div ref={gearBadgeRef} className="gta-gear-badge">
              GEAR N / 6
            </div>
            <div className="gta-speed-bar">
              <div
                ref={rpmFillRef}
                className="gta-speed-fill"
                style={{ width: "0%" }}
              />
            </div>
          </div>
        </>
      )}

      {!isLoading && (
        <GtaMenu
          isOpen={isGtaMenuOpen}
          onClose={() => setIsGtaMenuOpen(false)}
          onStartRace={() => setIsGtaMenuOpen(false)}
          onResetVehicle={handleReset}
          selectedColor={selectedColor}
          onSelectColor={handleColorChange}
          selectedCamera={cameraMode}
          onSelectCamera={handleSelectCamera}
          selectedTrack={selectedTrack}
          onSelectTrack={handleSelectTrack}
          raceMode={raceMode}
          onSelectRaceMode={handleSelectRaceMode}
          bestLapFormatted={lapStats.bestLapFormatted}
          lastLapFormatted={lapStats.lastLapFormatted}
          onClearBestLap={() => {
            gameRef.current?.clearBestLap();
            syncTrackAndLapMeta(gameRef.current);
          }}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          speedUnit={speedUnit}
          onToggleSpeedUnit={handleToggleSpeedUnit}
          touchMode={touchMode}
          onToggleTouchMode={handleToggleTouchMode}
          toggleFullscreen={toggleFullscreen}
          vehicleOptions={VEHICLE_OPTIONS}
          meshState={meshState}
          initialTab={initialMenuTab}
          initialRoomCode={urlRoomCode}
          onHostRoom={(customCode) => {
            const codeToHost = customCode?.trim() || undefined;
            meshRef.current?.hostRoom(selectedTrack, codeToHost);
            if (codeToHost && typeof window !== "undefined") {
              const url = new URL(window.location.href);
              url.searchParams.set("room", codeToHost.toUpperCase());
              window.history.replaceState({}, "", url.toString());
            }
          }}
          onJoinRoom={(code) => {
            const clean = code.trim().toUpperCase();
            meshRef.current?.joinRoom(clean);
            if (typeof window !== "undefined") {
              const url = new URL(window.location.href);
              url.searchParams.set("room", clean);
              window.history.replaceState({}, "", url.toString());
            }
          }}
          onLeaveRoom={() => {
            meshRef.current?.disconnect(false);
            if (typeof window !== "undefined") {
              const url = new URL(window.location.href);
              if (url.searchParams.has("room")) {
                url.searchParams.delete("room");
                window.history.replaceState({}, "", url.pathname);
              }
            }
          }}
          onClearRoomUrl={() => {
            if (typeof window !== "undefined") {
              const url = new URL(window.location.href);
              if (url.searchParams.has("room")) {
                url.searchParams.delete("room");
                window.history.replaceState({}, "", url.pathname);
              }
            }
          }}
          onChangeDriverName={(name) => meshRef.current?.setDriverName(name)}
        />
      )}
    </div>
  );
}
