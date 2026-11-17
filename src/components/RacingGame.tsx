import { useEffect, useRef, useState } from "react";
import { initRacingGame, type GameInstance, type TelemetryData } from "../game/pixi-racing/initGame";
import { CAMERA_MODES } from "../game/pixi-racing/Camera";
import "../styles/racing.css";

const VEHICLE_OPTIONS = [
  { key: "vehicle-truck-yellow", label: "Golden Fury", color: "#facc15" },
  { key: "vehicle-truck-red", label: "Crimson Blaze", color: "#ef4444" },
  { key: "vehicle-truck-green", label: "Viper Green", color: "#22c55e" },
  { key: "vehicle-truck-purple", label: "Neon Phantom", color: "#a855f7" },
];

const LIGHTING_THEMES: Array<{ key: 'day' | 'sunset' | 'night'; label: string; icon: string }> = [
  { key: 'day', label: 'Daylight', icon: '☀️' },
  { key: 'sunset', label: 'Sunset', icon: '🌅' },
  { key: 'night', label: 'Neon Night', icon: '🌙' },
];

export default function RacingGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameInstance | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadLabel, setLoadLabel] = useState("Firing up engine...");
  const [selectedColor, setSelectedColor] = useState("vehicle-truck-yellow");
  const [cameraMode, setCameraMode] = useState("chase");
  const [lightingTheme, setLightingTheme] = useState<'day' | 'sunset' | 'night'>('day');
  const [isMuted, setIsMuted] = useState(false);
  const [camToast, setCamToast] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Telemetry state
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    speedKmh: 0,
    gear: 1,
    rpm: 0,
    nitro: 100,
    isBoosting: false,
    driftIntensity: 0,
    currentDriftPoints: 0,
    totalDriftScore: 0,
  });

  useEffect(() => {
    if (!canvasRef.current) return;
    let isDisposed = false;

    initRacingGame(
      canvasRef.current,
      (progress, label) => {
        if (isDisposed) return;
        setLoadProgress(Math.round(progress * 100));
        setLoadLabel(label);
      },
      (data) => {
        if (isDisposed) return;
        setTelemetry(data);
      }
    )
      .then((instance) => {
        if (isDisposed) {
          instance.destroy();
          return;
        }
        gameRef.current = instance;
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Engine ignition failed:", err);
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
    setCamToast(info ? `${info.label} • ${info.desc}` : nextMode);
    setTimeout(() => {
      setCamToast((cur) => (cur?.includes(info?.label || "") ? null : cur));
    }, 1800);
  };

  const handleCycleLighting = () => {
    if (!gameRef.current) return;
    const order: Array<'day' | 'sunset' | 'night'> = ['day', 'sunset', 'night'];
    const nextIdx = (order.indexOf(lightingTheme) + 1) % order.length;
    const nextTheme = order[nextIdx];
    setLightingTheme(nextTheme);
    gameRef.current.setLightingTheme(nextTheme);
    const info = LIGHTING_THEMES.find((t) => t.key === nextTheme);
    setCamToast(`${info?.icon} Atmosphere: ${info?.label}`);
    setTimeout(() => setCamToast(null), 1500);
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    gameRef.current?.setMuted(nextMuted);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "KeyC") {
        handleCycleCamera();
      } else if (e.code === "KeyR") {
        handleReset();
      } else if (e.code === "KeyM") {
        handleToggleMute();
      } else if (e.code === "KeyT") {
        handleCycleLighting();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cameraMode, lightingTheme, isMuted]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const currentCamInfo = CAMERA_MODES.find((m) => m.key === cameraMode) || CAMERA_MODES[0];
  const currentThemeInfo = LIGHTING_THEMES.find((t) => t.key === lightingTheme) || LIGHTING_THEMES[0];

  return (
    <div className={`racing-root ${telemetry.isBoosting ? "nitro-active" : ""}`}>
      {/* 3D WebGPU/WebGL Canvas */}
      <canvas ref={canvasRef} className="racing-canvas" />

      {/* Nitro Speed Streaks & Tunnel Blur Effect */}
      {telemetry.isBoosting && <div className="racing-nitro-speed-lines" />}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="racing-loading-overlay">
          <div className="racing-loading-card">
            <div className="racing-spinner"></div>
            <h2 className="racing-loading-title">APEX DRIFT 3D</h2>
            <p className="racing-loading-subtitle">High-Octane Arcade Racing Engine</p>
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

      {/* Camera Mode / Atmosphere Toast Notification */}
      {camToast && (
        <div className="racing-camera-toast">
          <span>{camToast}</span>
        </div>
      )}

      {/* Error Overlay */}
      {errorMsg && (
        <div className="racing-loading-overlay">
          <div className="racing-loading-card">
            <h2 style={{ color: "#ef4444" }}>Ignition Failure</h2>
            <p>{errorMsg}</p>
            <button
              className="racing-btn"
              onClick={() => window.location.reload()}
              style={{ marginTop: "1rem" }}
            >
              Restart Engine
            </button>
          </div>
        </div>
      )}

      {/* Top Right Controls Bar */}
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
            title="Switch Camera View (C)"
            aria-label="Switch Camera"
          >
            📷 {currentCamInfo.label} <kbd className="racing-kbd-inline">C</kbd>
          </button>

          <button
            className="racing-icon-btn"
            onClick={handleCycleLighting}
            title="Toggle Atmosphere (T)"
            aria-label="Atmosphere"
          >
            {currentThemeInfo.icon} {currentThemeInfo.label}
          </button>

          <button
            className="racing-icon-btn"
            onClick={handleToggleMute}
            title={isMuted ? "Unmute Audio (M)" : "Mute Audio (M)"}
            aria-label="Mute Audio"
          >
            {isMuted ? "🔇" : "🔊"}
          </button>

          <button
            className="racing-icon-btn"
            onClick={handleReset}
            title="Reset Vehicle (R)"
            aria-label="Reset Vehicle"
          >
            ↺ Respawn <kbd className="racing-kbd-inline">R</kbd>
          </button>

          <button
            className="racing-icon-btn"
            onClick={() => setShowHelp((prev) => !prev)}
            title="Game Manual & Controls"
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

      {/* Active Drift Score Floating Banner */}
      {!isLoading && telemetry.currentDriftPoints > 0 && (
        <div className="racing-drift-meter">
          <span className="racing-drift-flame">🔥</span>
          <span className="racing-drift-val">+{telemetry.currentDriftPoints}</span>
          <span className="racing-drift-sub">DRIFT POWER!</span>
        </div>
      )}

      {/* High-Tech Dashboard Cluster (Bottom Right) */}
      {!isLoading && (
        <div className="racing-instrument-cluster">
          <div className="racing-speed-display">
            <span className="racing-speed-num">{telemetry.speedKmh}</span>
            <span className="racing-speed-unit">KM/H</span>
          </div>

          <div className="racing-gear-display">
            <span className="racing-gear-lbl">GEAR</span>
            <span className={`racing-gear-val ${telemetry.isBoosting ? "nitro-gear" : ""}`}>
              {telemetry.isBoosting ? "NOS" : telemetry.gear}
            </span>
          </div>

          <div className="racing-nitro-gauge-wrap">
            <div className="racing-nitro-header">
              <span>NITRO INJECTION</span>
              <span>{telemetry.nitro}%</span>
            </div>
            <div className="racing-nitro-bar-bg">
              <div
                className={`racing-nitro-bar-fill ${telemetry.isBoosting ? "boosting" : ""}`}
                style={{ width: `${telemetry.nitro}%` }}
              />
            </div>
          </div>

          {telemetry.totalDriftScore > 0 && (
            <div className="racing-total-drift-badge">
              <span>DRIFT SCORE</span>
              <b>{telemetry.totalDriftScore.toLocaleString()}</b>
            </div>
          )}
        </div>
      )}

      {/* Mobile / Quick Nitro Boost Button (Bottom Left) */}
      {!isLoading && (
        <button
          className={`racing-nos-touch-btn ${telemetry.isBoosting ? "active" : ""}`}
          onPointerDown={() => gameRef.current?.setNitro(true)}
          onPointerUp={() => gameRef.current?.setNitro(false)}
          onPointerLeave={() => gameRef.current?.setNitro(false)}
          title="Hold Shift or Space for Nitro"
        >
          <span className="nos-icon">⚡</span>
          <span className="nos-txt">NOS</span>
          <kbd className="racing-kbd-inline nos-kbd">SHIFT</kbd>
        </button>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="racing-help-modal" onClick={() => setShowHelp(false)}>
          <div className="racing-help-card" onClick={(e) => e.stopPropagation()}>
            <div className="racing-help-header">
              <h3>Apex Drift 3D • Grand Prix Manual</h3>
              <button onClick={() => setShowHelp(false)}>✕</button>
            </div>
            <div className="racing-help-body">
              <p>
                A high-octane 3D arcade racer built with real-time rigid body dynamics, multi-gear transmission, streamed rubber skid marks, and nitrous flame particle exhaust.
              </p>
              <hr />
              <h4>Controls & Maneuvers</h4>
              <ul>
                <li>
                  <kbd>W</kbd> / <kbd>↑</kbd> : Full Throttle Drive
                </li>
                <li>
                  <kbd>S</kbd> / <kbd>↓</kbd> : Reverse / Hard Brake
                </li>
                <li>
                  <kbd>A</kbd> / <kbd>D</kbd> or <kbd>←</kbd> / <kbd>→</kbd> : Steer / Power Slide
                </li>
                <li>
                  <kbd>Shift</kbd> / <kbd>Space</kbd> : <strong>Nitrous Boost (NOS)</strong> — 1.55x Top Speed & Acceleration
                </li>
                <li>
                  <kbd>C</kbd> : Cycle Camera (Chase View, Close Follow, Hood Cam, Isometric, Aerial)
                </li>
                <li>
                  <kbd>T</kbd> : Switch Lighting (☀️ Daylight, 🌅 Sunset, 🌙 Neon Night)
                </li>
                <li>
                  <kbd>M</kbd> : Mute / Unmute Audio Engine
                </li>
                <li>
                  <kbd>R</kbd> : Quick Respawn at Start Line
                </li>
                <li>
                  <strong>Touch Screen:</strong> Floating Joystick + NOS Button
                </li>
                <li>
                  <strong>Gamepad:</strong> Left stick steering, RT gas, LT brake, A / RB Nitrous
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Hint Bar */}
      {!isLoading && (
        <div className="racing-hint-bar">
          <span>WASD to Drive • <kbd className="racing-kbd-inline">SHIFT</kbd> Nitro Boost • <kbd className="racing-kbd-inline">C</kbd> Camera • <kbd className="racing-kbd-inline">T</kbd> Atmosphere</span>
        </div>
      )}
    </div>
  );
}
