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

  // Touch pedals state
  const [activeSteer, setActiveSteer] = useState<-1 | 0 | 1>(0);
  const [activeThrottle, setActiveThrottle] = useState<-1 | 0 | 1>(0);
  const [isNosActive, setIsNosActive] = useState(false);

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

  // Controls API
  const handleSteerStart = (dir: -1 | 1) => {
    setActiveSteer(dir);
    gameRef.current?.setSteer(dir);
  };
  const handleSteerEnd = () => {
    setActiveSteer(0);
    gameRef.current?.setSteer(0);
  };

  const handleThrottleStart = (dir: -1 | 1) => {
    setActiveThrottle(dir);
    gameRef.current?.setThrottle(dir);
  };
  const handleThrottleEnd = () => {
    setActiveThrottle(0);
    gameRef.current?.setThrottle(0);
  };

  const handleNosStart = () => {
    setIsNosActive(true);
    gameRef.current?.setNitro(true);
  };
  const handleNosEnd = () => {
    setIsNosActive(false);
    gameRef.current?.setNitro(false);
  };

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
              className="arcade-btn arcade-btn-amber"
              onClick={() => window.location.reload()}
              style={{ marginTop: "1rem" }}
            >
              Restart Engine
            </button>
          </div>
        </div>
      )}

      {/* Top Arcade Navigation Bar */}
      {!isLoading && (
        <header className="arcade-header-bar">
          {/* Brand Logo Crest */}
          <div className="arcade-logo-badge">
            <span className="arcade-logo-flag">🏁</span>
            <div className="arcade-logo-text">
              <span className="arcade-logo-title">APEX DRIFT</span>
              <span className="arcade-logo-sub">CIRCUIT 3D</span>
            </div>
          </div>

          {/* Action Buttons Group */}
          <div className="arcade-nav-actions">
            {/* Color Dial Selector */}
            <div className="arcade-wheel-selector" title="Select Vehicle Team">
              {VEHICLE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  className={`arcade-wheel-dot ${selectedColor === opt.key ? "active" : ""}`}
                  style={{ "--dot-color": opt.color } as React.CSSProperties}
                  title={opt.label}
                  aria-label={opt.label}
                  onClick={() => handleColorChange(opt.key)}
                >
                  <span className="arcade-wheel-inner" style={{ backgroundColor: opt.color }} />
                </button>
              ))}
            </div>

            {/* Camera View Switcher */}
            <button
              className="arcade-btn arcade-btn-cam"
              onClick={handleCycleCamera}
              title="Switch Camera View (C)"
              aria-label="Switch Camera"
            >
              <svg className="arcade-btn-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 4h10a2 2 0 0 1 2 2v2.586l3.707-3.707A1 1 0 0 1 21 5.586v12.828a1 1 0 0 1-1.707.707L16 15.414V18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 2v12h10V6H4zm14 4.414v3.172l3 3V7.414l-3 3z" />
              </svg>
              <span className="arcade-btn-label">{currentCamInfo.label}</span>
              <kbd className="arcade-kbd">C</kbd>
            </button>

            {/* Lighting Atmosphere */}
            <button
              className="arcade-btn arcade-btn-theme"
              onClick={handleCycleLighting}
              title="Toggle Atmosphere (T)"
              aria-label="Atmosphere"
            >
              <span className="arcade-btn-emoji">{currentThemeInfo.icon}</span>
              <span className="arcade-btn-label">{currentThemeInfo.label}</span>
              <kbd className="arcade-kbd">T</kbd>
            </button>

            {/* Audio Toggle */}
            <button
              className={`arcade-btn arcade-btn-icon-only ${isMuted ? "muted" : ""}`}
              onClick={handleToggleMute}
              title={isMuted ? "Unmute Audio (M)" : "Mute Audio (M)"}
              aria-label="Toggle Sound"
            >
              {isMuted ? (
                <svg className="arcade-btn-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.293 2.293a1 1 0 0 0-1.414 1.414l18 18a1 1 0 0 0 1.414-1.414l-4.52-4.52A8.966 8.966 0 0 0 20 12c0-3.72-2.26-6.91-5.5-8.24a1 1 0 0 0-.76 1.85C16.33 6.64 18 9.13 18 12a6.97 6.97 0 0 1-2.07 4.93l-2.06-2.06A4.98 4.98 0 0 0 14 12V6.414l-4.293 4.293L3.293 2.293zM10 6.828L6.828 10H4a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2.828L12 19.172V14.83l-2-2V6.828z" />
                </svg>
              ) : (
                <svg className="arcade-btn-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3.172a1 1 0 0 0-1.707-.707L5.586 7H3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2.586l4.707 4.535A1 1 0 0 0 12 20.828V3.172zM15.54 7.46a1 1 0 0 1 1.41-.15A8.96 8.96 0 0 1 20 12a8.96 8.96 0 0 1-3.05 4.69 1 1 0 1 1-1.26-1.56A6.97 6.97 0 0 0 18 12a6.97 6.97 0 0 0-2.31-3.13 1 1 0 0 1-.15-1.41zm-2.83 2.83a1 1 0 0 1 1.41 0A4.98 4.98 0 0 1 15.5 12c0 .96-.28 1.86-.78 2.62a1 1 0 1 1-1.66-1.12c.28-.43.44-.95.44-1.5s-.16-1.07-.44-1.5a1 1 0 0 1 0-1.41z" />
                </svg>
              )}
            </button>

            {/* Respawn Button */}
            <button
              className="arcade-btn arcade-btn-amber"
              onClick={handleReset}
              title="Reset Vehicle to Grid (R)"
              aria-label="Respawn"
            >
              <svg className="arcade-btn-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
              </svg>
              <span className="arcade-btn-label">Respawn</span>
              <kbd className="arcade-kbd">R</kbd>
            </button>

            {/* Help / Guide */}
            <button
              className="arcade-btn arcade-btn-icon-only"
              onClick={() => setShowHelp((prev) => !prev)}
              title="Game Manual & Controls"
              aria-label="Help"
            >
              <span className="arcade-icon-txt">?</span>
            </button>

            {/* Fullscreen */}
            <button
              className="arcade-btn arcade-btn-icon-only"
              onClick={toggleFullscreen}
              title="Toggle Fullscreen"
              aria-label="Fullscreen"
            >
              <svg className="arcade-btn-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
              </svg>
            </button>
          </div>
        </header>
      )}

      {/* Floating Active Drift Score Banner */}
      {!isLoading && telemetry.currentDriftPoints > 0 && (
        <div className="racing-drift-meter">
          <span className="racing-drift-flame">🔥</span>
          <span className="racing-drift-val">+{telemetry.currentDriftPoints}</span>
          <span className="racing-drift-sub">DRIFT POWER!</span>
        </div>
      )}

      {/* High-Tech Dashboard Cluster (Center-Right / Bottom) */}
      {!isLoading && (
        <div className="arcade-dashboard">
          <div className="arcade-dash-header">
            <span className="arcade-dash-tele">TELEMETRY</span>
            <span className={`arcade-dash-nos-state ${telemetry.isBoosting ? "active" : ""}`}>
              {telemetry.isBoosting ? "⚡ NOS BOOST" : "READY"}
            </span>
          </div>

          <div className="arcade-dash-main">
            {/* Speedometer */}
            <div className="arcade-speedo-box">
              <span className="arcade-speedo-val">{telemetry.speedKmh}</span>
              <span className="arcade-speedo-unit">KM/H</span>
            </div>

            {/* Gear Indicator */}
            <div className="arcade-gear-box">
              <span className="arcade-gear-lbl">GEAR</span>
              <span className={`arcade-gear-num ${telemetry.isBoosting ? "gear-nos" : ""}`}>
                {telemetry.isBoosting ? "NOS" : telemetry.gear}
              </span>
            </div>
          </div>

          {/* Nitro Gauge */}
          <div className="arcade-nitro-tray">
            <div className="arcade-nitro-meta">
              <span className="arcade-nitro-lbl">NITRO BOOST</span>
              <span className="arcade-nitro-pct">{telemetry.nitro}%</span>
            </div>
            <div className="arcade-nitro-track">
              <div
                className={`arcade-nitro-glow-fill ${telemetry.isBoosting ? "boosting" : ""}`}
                style={{ width: `${telemetry.nitro}%` }}
              />
            </div>
          </div>

          {telemetry.totalDriftScore > 0 && (
            <div className="arcade-drift-bank">
              <span className="arcade-drift-lbl">DRIFT SCORE</span>
              <span className="arcade-drift-pts">{telemetry.totalDriftScore.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* RESPONSIVE ON-SCREEN ARCADE TOUCH CONTROLS (Mobile & Web Playable) */}
      {!isLoading && (
        <div className="arcade-touch-hud">
          {/* Left Wing: Steering Pedals */}
          <div className="arcade-pedal-cluster arcade-pedal-cluster-left">
            <button
              className={`arcade-steer-paddle paddle-left ${activeSteer === -1 ? "paddle-active" : ""}`}
              onPointerDown={() => handleSteerStart(-1)}
              onPointerUp={handleSteerEnd}
              onPointerCancel={handleSteerEnd}
              onPointerLeave={handleSteerEnd}
              aria-label="Steer Left"
            >
              <svg className="paddle-chevron" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
              <span className="paddle-txt">LEFT</span>
            </button>

            <button
              className={`arcade-steer-paddle paddle-right ${activeSteer === 1 ? "paddle-active" : ""}`}
              onPointerDown={() => handleSteerStart(1)}
              onPointerUp={handleSteerEnd}
              onPointerCancel={handleSteerEnd}
              onPointerLeave={handleSteerEnd}
              aria-label="Steer Right"
            >
              <svg className="paddle-chevron" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
              </svg>
              <span className="paddle-txt">RIGHT</span>
            </button>
          </div>

          {/* Right Wing: Drive, Brake & Nitro Core */}
          <div className="arcade-pedal-cluster arcade-pedal-cluster-right">
            {/* Nitrous Booster Button */}
            <button
              className={`arcade-nos-core ${isNosActive || telemetry.isBoosting ? "nos-core-firing" : ""}`}
              onPointerDown={handleNosStart}
              onPointerUp={handleNosEnd}
              onPointerCancel={handleNosEnd}
              onPointerLeave={handleNosEnd}
              aria-label="Nitro Boost"
            >
              <div className="nos-core-inner">
                <span className="nos-core-bolt">⚡</span>
                <span className="nos-core-txt">NOS</span>
              </div>
            </button>

            {/* Reverse / Brake Pedal */}
            <button
              className={`arcade-drive-pedal pedal-brake ${activeThrottle === -1 ? "pedal-depressed" : ""}`}
              onPointerDown={() => handleThrottleStart(-1)}
              onPointerUp={handleThrottleEnd}
              onPointerCancel={handleThrottleEnd}
              onPointerLeave={handleThrottleEnd}
              aria-label="Brake and Reverse"
            >
              <span className="pedal-ribs"></span>
              <span className="pedal-lbl">BRAKE</span>
              <span className="pedal-sub">REV</span>
            </button>

            {/* Gas / Drive Accelerator Pedal */}
            <button
              className={`arcade-drive-pedal pedal-gas ${activeThrottle === 1 ? "pedal-depressed" : ""}`}
              onPointerDown={() => handleThrottleStart(1)}
              onPointerUp={handleThrottleEnd}
              onPointerCancel={handleThrottleEnd}
              onPointerLeave={handleThrottleEnd}
              aria-label="Accelerate"
            >
              <span className="pedal-ribs"></span>
              <span className="pedal-lbl">DRIVE</span>
              <span className="pedal-sub">GAS ▲</span>
            </button>
          </div>
        </div>
      )}

      {/* Help & Controls Modal */}
      {showHelp && (
        <div className="racing-help-modal" onClick={() => setShowHelp(false)}>
          <div className="racing-help-card" onClick={(e) => e.stopPropagation()}>
            <div className="racing-help-header">
              <h3>Apex Drift 3D • Grand Prix Manual</h3>
              <button onClick={() => setShowHelp(false)}>✕</button>
            </div>
            <div className="racing-help-body">
              <p>
                Engineered for responsive desktop and mobile gaming with dedicated alloy pedals, 3D chase camera, and dual nitrous injection.
              </p>
              <hr />
              <h4>Controls & Maneuvers</h4>
              <ul>
                <li>
                  <kbd>W</kbd> / <kbd>↑</kbd> or <span className="arcade-hint-pill">DRIVE PEDAL</span> : Accelerate Full Throttle
                </li>
                <li>
                  <kbd>S</kbd> / <kbd>↓</kbd> or <span className="arcade-hint-pill">BRAKE PEDAL</span> : Reverse & Hard Brake
                </li>
                <li>
                  <kbd>A</kbd> / <kbd>D</kbd> or <span className="arcade-hint-pill">LEFT / RIGHT</span> : Steer & Power Slide
                </li>
                <li>
                  <kbd>Shift</kbd> / <kbd>Space</kbd> or <span className="arcade-hint-pill">⚡ NOS</span> : Nitrous Boost (1.55x Top Speed Surge)
                </li>
                <li>
                  <kbd>C</kbd> : Cycle Camera (Chase View, Close Follow, Hood Cam, Isometric, Aerial)
                </li>
                <li>
                  <kbd>T</kbd> : Switch Atmosphere (☀️ Daylight, 🌅 Sunset, 🌙 Neon Night)
                </li>
                <li>
                  <kbd>M</kbd> : Mute / Unmute Audio Engine
                </li>
                <li>
                  <kbd>R</kbd> : Quick Respawn at Start Line
                </li>
                <li>
                  <strong>Mobile:</strong> Two-thumb gameplay: left thumb steers, right thumb drives and hits nitrous!
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Helper Pill */}
      {!isLoading && (
        <div className="arcade-desktop-hint">
          <span>WASD to Drive • <kbd className="arcade-kbd">SHIFT</kbd> Nitro • <kbd className="arcade-kbd">C</kbd> Camera • On-Screen Pedals Active</span>
        </div>
      )}
    </div>
  );
}
