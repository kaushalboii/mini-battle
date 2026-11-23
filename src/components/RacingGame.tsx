import { useEffect, useRef, useState } from "react";
import { initRacingGame, type GameInstance } from "../game/pixi-racing/initGame";
import { CAMERA_MODES } from "../game/pixi-racing/Camera";
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
  const [showHelp, setShowHelp] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const handleReset = () => {
    gameRef.current?.resetPosition();
  };

  const handleColorChange = (key: string) => {
    setSelectedColor(key);
    gameRef.current?.setVehicleColor(key);
  };

  const handleCycleCamera = () => {
    if (!gameRef.current) return;
    const nextMode = gameRef.current.cycleCameraMode();
    setCameraMode(nextMode);
    const info = CAMERA_MODES.find((m) => m.key === nextMode);
    setCamToast(info ? `${info.label} (${info.desc})` : nextMode);
    setTimeout(() => {
      setCamToast((cur) => (cur?.includes(info?.label || "") ? null : cur));
    }, 1800);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "KeyC") {
        handleCycleCamera();
      } else if (e.code === "KeyR") {
        handleReset();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const toggleFullscreen = () => {
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
        <div className="racing-loading-overlay">
          <div className="racing-loading-card">
            <div className="racing-spinner"></div>
            <h2 className="racing-loading-title">KENNEY STARTER KIT RACING</h2>
            <p className="racing-loading-subtitle">PixiJS 3D & Crashcat Physics</p>
            <div className="racing-progress-bar-bg">
              <div
                className="racing-progress-bar-fill"
                style={{ width: `${loadProgress}%` }}
              ></div>
            </div>
            <p className="racing-progress-label">
              {loadLabel} ({loadProgress}%)
            </p>
          </div>
        </div>
      )}

      {/* Camera Mode Toast Notification */}
      {camToast && (
        <div className="racing-camera-toast">
          <span className="racing-toast-icon">📷</span>
          <span>{camToast}</span>
        </div>
      )}

      {/* Error Overlay */}
      {errorMsg && (
        <div className="racing-loading-overlay">
          <div className="racing-loading-card">
            <h2 style={{ color: "#ef4444" }}>Initialization Failed</h2>
            <p>{errorMsg}</p>
            <button
              className="racing-btn"
              onClick={() => window.location.reload()}
              style={{ marginTop: "1rem" }}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Top Right Controls & Camera Switcher */}
      {!isLoading && (
        <div className="racing-controls-panel">
          <div className="racing-truck-palette">
            {VEHICLE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                className={`racing-color-dot ${selectedColor === opt.key ? "active" : ""}`}
                style={{ backgroundColor: opt.color }}
                title={opt.label}
                aria-label={opt.label}
                onClick={() => handleColorChange(opt.key)}
              />
            ))}
          </div>

          <button
            className="racing-icon-btn racing-cam-btn"
            onClick={handleCycleCamera}
            title="Switch Camera (Press C)"
            aria-label="Switch Camera"
          >
            📷 {currentCamInfo.label} <kbd className="racing-kbd-inline">C</kbd>
          </button>

          <button
            className="racing-icon-btn"
            onClick={handleReset}
            title="Reset Truck (Press R)"
            aria-label="Reset Truck"
          >
            ↺ Respawn <kbd className="racing-kbd-inline">R</kbd>
          </button>

          <button
            className="racing-icon-btn"
            onClick={() => setShowHelp((prev) => !prev)}
            title="Help / Controls"
            aria-label="Help"
          >
            ?
          </button>

          <button
            className="racing-icon-btn"
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            aria-label="Toggle Fullscreen"
          >
            ⛶
          </button>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="racing-help-modal" onClick={() => setShowHelp(false)}>
          <div className="racing-help-card" onClick={(e) => e.stopPropagation()}>
            <div className="racing-help-header">
              <h3>Kenney Starter Kit Racing</h3>
              <button onClick={() => setShowHelp(false)}>✕</button>
            </div>
            <div className="racing-help-body">
              <p>
                <strong>Engine:</strong> Official PixiJS 3D (<code>@pixi/3d</code>)
              </p>
              <p>
                <strong>Physics:</strong> <code>crashcat</code> rigid body sphere & box colliders
              </p>
              <p>
                <strong>Cameras:</strong> 5 selectable camera angles with dynamic speed FOV.
              </p>
              <hr />
              <h4>Controls</h4>
              <ul>
                <li>
                  <kbd>W</kbd> / <kbd>↑</kbd> : Accelerate forward
                </li>
                <li>
                  <kbd>S</kbd> / <kbd>↓</kbd> : Reverse / Brake
                </li>
                <li>
                  <kbd>A</kbd> / <kbd>D</kbd> or <kbd>←</kbd> / <kbd>→</kbd> : Steer left / right
                </li>
                <li>
                  <kbd>C</kbd> : Switch Camera (Chase View, Close Follow, Hood View, Isometric, Aerial)
                </li>
                <li>
                  <kbd>R</kbd> : Respawn truck at starting line
                </li>
                <li>
                  <strong>Touch Screen:</strong> Floating touch joystick anywhere on screen
                </li>
                <li>
                  <strong>Gamepad:</strong> Left stick steering, RT throttle, LT brake
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Hint Pill */}
      {!isLoading && (
        <div className="racing-hint-bar">
          <span>WASD to Drive • <kbd className="racing-kbd-inline">C</kbd> Switch Camera • <kbd className="racing-kbd-inline">R</kbd> Respawn • Click to Unlock Sound</span>
        </div>
      )}
    </div>
  );
}
