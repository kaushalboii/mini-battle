import { useEffect, useRef, useState } from "react";
import {
  initRacingGame,
  type GameInstance,
  type RaceTelemetry,
} from "../game/pixi-racing/initGame";
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

  const [telemetry, setTelemetry] = useState<RaceTelemetry>({
    speedNormalized: 0,
    mph: 0,
    kmh: 0,
    gear: 0,
    rpm: 0,
    lap: 1,
    currentLapTime: 0,
    lastLapFormatted: "--:--.--",
    bestLapFormatted: "--:--.--",
    bestLap: null,
    x: 3.5,
    y: 0,
    z: 5,
    yaw: 0,
    trackId: "level-1",
    waypoints: [],
    bounds: { minX: -45, maxX: 8, minZ: -30, maxZ: 30 },
  });

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
  });

  useEffect(() => {
    const mesh = new MeshNetworkManager(
      (snap) => setMeshState(snap),
      (syncedTrackId) => {
        setSelectedTrack(syncedTrackId);
        gameRef.current?.setTrack(syncedTrackId);
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
        setTelemetry(instance.getTelemetry());
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
      setTelemetry(gameRef.current.getTelemetry());
    }
  }, [isGtaMenuOpen]);

  useEffect(() => {
    let animId: number;
    let lastMeshSend = 0;

    const tickHud = (now: number) => {
      const game = gameRef.current;
      if (game) {
        const snap = game.getTelemetry();
        setTelemetry(snap);

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
                speed: snap.speedNormalized * 1.85,
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
  }, [selectedColor]);

  const showToast = (msg: string) => {
    setCamToast(msg);
    setTimeout(() => {
      setCamToast((cur) => (cur === msg ? null : cur));
    }, 1500);
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
    if (gameRef.current) setTelemetry(gameRef.current.getTelemetry());
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
  const displaySpeed = speedUnit === "MPH" ? telemetry.mph : telemetry.kmh;
  const displayGear = telemetry.gear === 0 ? "N" : String(telemetry.gear);
  const rpmPercent =
    telemetry.gear === 0 ? 0 : Math.min(100, Math.round(telemetry.rpm * 100));
  const isMeshOnline =
    meshState.status === "hosting" || meshState.status === "connected";

  return (
    <div className="racing-root">
      <canvas ref={canvasRef} className="racing-canvas" />

      {isLoading && (
        <div className="gta-loading-overlay">
          <div className="gta-loading-card">
            <div className="gta-loading-spinner" />
            <h2 className="gta-loading-title">MINI BATTLE</h2>
            <p className="gta-loading-subtitle">
              6-SPEED 3D RACING • PIXI 3D
            </p>
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
                className="gta-hud-btn gta-hud-btn-sq"
                onClick={handleToggleMute}
                onMouseEnter={() => GtaAudio.playHover()}
                title="Toggle Sound (M)"
              >
                {isMuted ? "🔇" : "🔊"}
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

          {/* Minimal Corner Track Outline Map */}
          {telemetry.waypoints.length > 0 && (
            <div className="hud-minimap-card">
              <svg
                viewBox={`${telemetry.bounds.minX - 6} ${telemetry.bounds.minZ - 6} ${
                  telemetry.bounds.maxX - telemetry.bounds.minX + 12
                } ${telemetry.bounds.maxZ - telemetry.bounds.minZ + 12}`}
                className="hud-minimap-svg"
              >
                <polygon
                  points={telemetry.waypoints
                    .map((w) => `${w.x},${w.z}`)
                    .join(" ")}
                  fill="none"
                  stroke="rgba(255,255,255,0.28)"
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
                  cx={telemetry.x}
                  cy={telemetry.z}
                  r="3.2"
                  fill="#facc15"
                  stroke="#000"
                  strokeWidth="0.9"
                />
              </svg>
            </div>
          )}

          {/* 6-Speed Speedometer & Live RPM Bar */}
          <div className="gta-hud-speedometer">
            <div className="gta-speed-value">{displaySpeed}</div>
            <div className="gta-speed-unit">{speedUnit}</div>
            <div className="gta-gear-badge">GEAR {displayGear} / 6</div>
            <div className="gta-speed-bar">
              <div
                className="gta-speed-fill"
                style={{ width: `${rpmPercent}%` }}
              />
            </div>
          </div>
        </>
      )}

      {/* Streamlined Menu */}
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
          bestLapFormatted={telemetry.bestLapFormatted}
          lastLapFormatted={telemetry.lastLapFormatted}
          onClearBestLap={() => gameRef.current?.clearBestLap()}
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
          onHostRoom={() => meshRef.current?.hostRoom(selectedTrack)}
          onJoinRoom={(code) => meshRef.current?.joinRoom(code)}
          onLeaveRoom={() => meshRef.current?.disconnect()}
          onChangeDriverName={(name) => meshRef.current?.setDriverName(name)}
        />
      )}
    </div>
  );
}
