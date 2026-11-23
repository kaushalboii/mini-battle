import { useEffect, useRef, useState } from "react";
import { initRacingGame, type GameInstance } from "../game/pixi-racing/initGame";
import { CAMERA_MODES } from "../game/pixi-racing/Camera";
import GtaMenu from "./GtaMenu";
import { GtaAudio } from "../utils/gtaAudio";
import "../styles/racing.css";

const VEHICLE_OPTIONS = [
  { key: "vehicle-truck-yellow", label: "Yellow Truck", color: "#facc15" },
  { key: "vehicle-truck-red", label: "Red Truck", color: "#ef4444" },
  { key: "vehicle-truck-green", label: "Green Truck", color: "#22c55e" },
  { key: "vehicle-truck-purple", label: "Purple Truck", color: "#a855f7" },
];

export default function RacingGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameInstance | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadLabel, setLoadLabel] = useState("Initializing PixiJS 3D...");
  const [selectedColor, setSelectedColor] = useState("vehicle-truck-yellow");
  const [cameraMode, setCameraMode] = useState("chase");
  const [camToast, setCamToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Home & Menu page state: Open by default when starting the game
  const [isGtaMenuOpen, setIsGtaMenuOpen] = useState(true);

  // In-Game Live HUD metrics
  const [liveSpeedMph, setLiveSpeedMph] = useState(0);
  const [liveGear, setLiveGear] = useState("N");

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
        instance.setPaused(isGtaMenuOpen);
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

  // Sync pause state with game engine
  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.setPaused(isGtaMenuOpen);
    }
  }, [isGtaMenuOpen]);

  // Live HUD Speedometer ticker
  useEffect(() => {
    let animId: number;
    const updateHud = () => {
      if (gameRef.current?.vehicle) {
        const speed = Math.abs(gameRef.current.vehicle.linearSpeed || 0);
        const mph = Math.round(speed * 28);
        setLiveSpeedMph(mph);

        if (mph === 0) setLiveGear("N");
        else if (mph < 35) setLiveGear("1");
        else if (mph < 75) setLiveGear("2");
        else setLiveGear("3");
      }
      animId = requestAnimationFrame(updateHud);
    };

    animId = requestAnimationFrame(updateHud);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleReset = () => {
    GtaAudio.playSelect();
    gameRef.current?.resetPosition();
  };

  const handleColorChange = (key: string) => {
    GtaAudio.playSelect();
    setSelectedColor(key);
    gameRef.current?.setVehicleColor(key);
  };

  const handleSelectCamera = (key: string) => {
    GtaAudio.playSelect();
    setCameraMode(key);
    gameRef.current?.setCameraMode(key);
    const info = CAMERA_MODES.find((m) => m.key === key);
    setCamToast(info ? `${info.label} (${info.desc})` : key);
    setTimeout(() => {
      setCamToast((cur) => (cur?.includes(info?.label || "") ? null : cur));
    }, 1800);
  };

  const handleCycleCamera = () => {
    if (!gameRef.current) return;
    GtaAudio.playSelect();
    const nextMode = gameRef.current.cycleCameraMode();
    setCameraMode(nextMode);
    const info = CAMERA_MODES.find((m) => m.key === nextMode);
    setCamToast(info ? `${info.label} (${info.desc})` : nextMode);
    setTimeout(() => {
      setCamToast((cur) => (cur?.includes(info?.label || "") ? null : cur));
    }, 1800);
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
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "Escape") {
        e.preventDefault();
        toggleGtaMenu();
      } else if (!isGtaMenuOpen) {
        if (e.code === "KeyC") {
          handleCycleCamera();
        } else if (e.code === "KeyR") {
          handleReset();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isGtaMenuOpen]);

  const toggleFullscreen = () => {
    GtaAudio.playSelect();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const currentCamInfo = CAMERA_MODES.find((m) => m.key === cameraMode) || CAMERA_MODES[0];

  return (
    <div className="racing-root">
      {/* PixiJS WebGPU/WebGL Canvas */}
      <canvas ref={canvasRef} className="racing-canvas" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="gta-loading-overlay">
          <div className="gta-loading-card">
            <div className="gta-loading-spinner" />
            <h2 className="gta-loading-title">MINI BATTLE</h2>
            <p className="gta-loading-subtitle">3D ARCADE RACING SPEEDWAY • PIXI 3D</p>
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

      {/* Camera Mode Toast Notification */}
      {camToast && !isGtaMenuOpen && (
        <div className="gta-camera-toast">
          <span className="gta-toast-icon">📷</span>
          <span>{camToast}</span>
        </div>
      )}

      {/* Error Overlay */}
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

      {/* In-Game Racing HUD: Clean, organized, zero clutter */}
      {!isLoading && !isGtaMenuOpen && (
        <>
          {/* Top Left: Home / Menu Toggle Button */}
          <div className="gta-hud-top-left">
            <button
              className="gta-hud-btn gta-menu-trigger-btn"
              onClick={() => {
                GtaAudio.playSelect();
                setIsGtaMenuOpen(true);
              }}
              onMouseEnter={() => GtaAudio.playHover()}
              title="Open Menu (Press ESC)"
            >
              <span className="gta-btn-key">ESC</span>
              <span className="gta-btn-label">MENU</span>
            </button>
          </div>

          {/* Top Right: Clean Action Bar */}
          <div className="gta-hud-top-right">
            <div className="gta-hud-action-row">
              {/* Camera Switcher Button */}
              <button
                className="gta-hud-btn"
                onClick={handleCycleCamera}
                onMouseEnter={() => GtaAudio.playHover()}
                title="Switch Camera (Press C)"
              >
                <span className="gta-btn-key">C</span>
                <span className="gta-btn-label">CAM: {currentCamInfo.label.toUpperCase()}</span>
              </button>

              {/* Respawn Button */}
              <button
                className="gta-hud-btn gta-hud-btn-danger"
                onClick={handleReset}
                onMouseEnter={() => GtaAudio.playHover()}
                title="Respawn Truck (Press R)"
              >
                <span className="gta-btn-key">R</span>
                <span className="gta-btn-label">↺ RESPAWN</span>
              </button>

              {/* Fullscreen Button */}
              <button
                className="gta-hud-btn gta-hud-btn-sq"
                onClick={toggleFullscreen}
                onMouseEnter={() => GtaAudio.playHover()}
                title="Toggle Fullscreen"
              >
                ⛶
              </button>
            </div>
          </div>

          {/* Bottom Right: Digital Speedometer HUD */}
          <div className="gta-hud-speedometer">
            <div className="gta-speed-value">{liveSpeedMph}</div>
            <div className="gta-speed-unit">MPH</div>
            <div className="gta-gear-badge">GEAR {liveGear}</div>
            <div className="gta-speed-bar">
              <div
                className="gta-speed-fill"
                style={{ width: `${Math.min(100, (liveSpeedMph / 140) * 100)}%` }}
              />
            </div>
          </div>
        </>
      )}

      {/* Mini Battle Home & Pause Menu Overlay */}
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
          toggleFullscreen={toggleFullscreen}
          vehicleOptions={VEHICLE_OPTIONS}
        />
      )}
    </div>
  );
}
