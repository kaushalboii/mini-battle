import { useEffect, useRef, useState } from "react";
import { initRacingGame, type GameInstance } from "../game/pixi-racing/initGame";
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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

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

      {/* Top Right Controls & Color Picker */}
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
            className="racing-icon-btn"
            onClick={handleReset}
            title="Reset Truck (R)"
            aria-label="Reset Truck"
          >
            ↺ Respawn
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
                <strong>Visuals:</strong> Cascaded directional shadows, ACES tone mapping, dynamic drift ribbons, particle smoke puffs.
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
                  <kbd>A</kbd> / <kbd>D</kbd> or <kbd>←</kbd> / <kbd>→</kbd> : Steer / Drift
                </li>
                <li>
                  <strong>Touch Screen:</strong> Floating touch joystick anywhere on screen
                </li>
                <li>
                  <strong>Gamepad:</strong> Left stick steering, Right trigger (RT) throttle, Left trigger (LT) brake
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Hint Pill */}
      {!isLoading && (
        <div className="racing-hint-bar">
          <span>WASD / Arrow Keys / Gamepad to Drive • Click to Unlock Audio</span>
        </div>
      )}
    </div>
  );
}
