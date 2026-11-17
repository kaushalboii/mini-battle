import { useEffect, useRef, useState } from "react";
import { initRacingGame, type GameInstance, type TelemetryData } from "../game/pixi-racing/initGame";
import { CAMERA_MODES } from "../game/pixi-racing/Camera";
import "../styles/racing.css";

const VEHICLE_OPTIONS = [
  { key: "vehicle-truck-yellow", label: "Amber Team", color: "#f59e0b" },
  { key: "vehicle-truck-red", label: "Crimson Team", color: "#ef4444" },
  { key: "vehicle-truck-green", label: "Emerald Team", color: "#10b981" },
  { key: "vehicle-truck-purple", label: "Cobalt Team", color: "#8b5cf6" },
];

const LIGHTING_THEMES: Array<{ key: 'day' | 'sunset' | 'night'; label: string }> = [
  { key: 'day', label: 'Daylight' },
  { key: 'sunset', label: 'Dusk' },
  { key: 'night', label: 'Night' },
];

export default function RacingGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameInstance | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadLabel, setLoadLabel] = useState("Loading circuit assets");
  const [selectedColor, setSelectedColor] = useState("vehicle-truck-yellow");
  const [cameraMode, setCameraMode] = useState("chase");
  const [lightingTheme, setLightingTheme] = useState<'day' | 'sunset' | 'night'>('day');
  const [isMuted, setIsMuted] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Orientation state
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);
  const [isPortraitHintDismissed, setIsPortraitHintDismissed] = useState(false);

  // Multi-touch pedals state
  const [activeSteer, setActiveSteer] = useState<-1 | 0 | 1>(0);
  const [activeThrottle, setActiveThrottle] = useState<-1 | 0 | 1>(0);
  const [isNosActive, setIsNosActive] = useState(false);

  // Telemetry stream
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

  // Track viewport orientation
  useEffect(() => {
    const handleViewportChange = () => {
      const isMobile = window.innerWidth < 850 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isPortrait = window.innerHeight > window.innerWidth;
      setIsMobilePortrait(isMobile && isPortrait);
    };

    handleViewportChange();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);
    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
    };
  }, []);

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
        console.error("Renderer initialization failed:", err);
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
    setToastMessage("Vehicle repositioned to grid");
    setTimeout(() => setToastMessage(null), 1400);
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
    setToastMessage(info ? `Camera: ${info.label}` : nextMode);
    setTimeout(() => setToastMessage(null), 1400);
  };

  const handleCycleLighting = () => {
    if (!gameRef.current) return;
    const order: Array<'day' | 'sunset' | 'night'> = ['day', 'sunset', 'night'];
    const nextIdx = (order.indexOf(lightingTheme) + 1) % order.length;
    const nextTheme = order[nextIdx];
    setLightingTheme(nextTheme);
    gameRef.current.setLightingTheme(nextTheme);
    const info = LIGHTING_THEMES.find((t) => t.key === nextTheme);
    setToastMessage(`Lighting: ${info?.label}`);
    setTimeout(() => setToastMessage(null), 1400);
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

  // RPM segment bar calculation (12 discrete LED segments)
  const rpmSegments = 12;
  const activeSegments = Math.min(rpmSegments, Math.round(telemetry.rpm * rpmSegments));

  return (
    <div className={`racing-root ${telemetry.isBoosting ? "boosting" : ""}`}>
      {/* 3D WebGPU / WebGL Viewport */}
      <canvas ref={canvasRef} className="racing-canvas" />

      {/* Subtle Speed Tunnel Focus (Zero cartoon lines) */}
      <div className={`racing-focus-vignette ${telemetry.isBoosting ? "active" : ""}`} />

      {/* Mobile Portrait Orientation Banner */}
      {!isLoading && isMobilePortrait && !isPortraitHintDismissed && (
        <div className="racing-rotate-banner">
          <svg className="racing-rotate-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75">
            <rect x="5" y="2" width="14" height="20" rx="3" />
            <path d="M12 18h.01M20 7l-2-2-2 2M18 5v5" />
          </svg>
          <span className="racing-rotate-text">Rotate device to landscape for full circuit view</span>
          <button
            className="racing-rotate-dismiss"
            onClick={() => setIsPortraitHintDismissed(true)}
            aria-label="Dismiss orientation banner"
          >
            ✕
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="racing-modal-backdrop">
          <div className="racing-card racing-load-card">
            <div className="racing-ring-loader" />
            <h1 className="racing-load-title">Apex Circuit 3D</h1>
            <p className="racing-load-sub">Grand Prix Physics Simulator</p>
            <div className="racing-progress-track">
              <div
                className="racing-progress-bar"
                style={{ width: `${loadProgress}%` }}
              />
            </div>
            <div className="racing-load-meta">
              <span>{loadLabel}</span>
              <span className="racing-num-mono">{loadProgress}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Subtle Status Notification Toast */}
      {toastMessage && (
        <div className="racing-toast">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Error Modal */}
      {errorMsg && (
        <div className="racing-modal-backdrop">
          <div className="racing-card">
            <h2 style={{ color: "var(--semantic-error)" }}>Ignition Error</h2>
            <p className="racing-card-text">{errorMsg}</p>
            <button
              className="racing-btn racing-btn-primary"
              onClick={() => window.location.reload()}
              style={{ marginTop: "16px" }}
            >
              Restart Session
            </button>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      {!isLoading && (
        <header className="racing-top-bar">
          {/* Brand Mark */}
          <div className="racing-brand">
            <svg className="racing-brand-glyph" viewBox="0 0 24 24" width="20" height="20" fill="none">
              <path d="M4 19 L11 5 L14 5 L7 19 Z" fill="var(--accent)" />
              <path d="M10 19 L17 5 L20 5 L13 19 Z" fill="var(--text-primary)" fillOpacity="0.8" />
            </svg>
            <div className="racing-brand-text">
              <span className="racing-brand-name">Apex Circuit</span>
              <span className="racing-brand-sub">Grand Prix 3D</span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="racing-toolbar">
            {/* Vehicle Palette Group */}
            <div className="racing-palette-group" title="Select Vehicle Team">
              {VEHICLE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  className={`racing-palette-dot ${selectedColor === opt.key ? "selected" : ""}`}
                  style={{ "--dot-color": opt.color } as React.CSSProperties}
                  title={opt.label}
                  aria-label={opt.label}
                  onClick={() => handleColorChange(opt.key)}
                >
                  <span className="racing-dot-core" style={{ backgroundColor: opt.color }} />
                </button>
              ))}
            </div>

            <div className="racing-divider" />

            {/* Camera Switcher */}
            <button
              className="racing-btn"
              onClick={handleCycleCamera}
              title="Camera angle (C)"
              aria-label="Switch camera angle"
            >
              <svg className="racing-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M4 6h11a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
              </svg>
              <span className="racing-btn-text">{currentCamInfo.label}</span>
              <kbd className="racing-keycap">C</kbd>
            </button>

            {/* Lighting Atmosphere */}
            <button
              className="racing-btn"
              onClick={handleCycleLighting}
              title="Lighting condition (T)"
              aria-label="Toggle lighting"
            >
              <svg className="racing-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
              <span className="racing-btn-text">{currentThemeInfo.label}</span>
              <kbd className="racing-keycap">T</kbd>
            </button>

            {/* Audio Toggle */}
            <button
              className={`racing-btn racing-btn-icon ${isMuted ? "muted" : ""}`}
              onClick={handleToggleMute}
              title={isMuted ? "Unmute audio (M)" : "Mute audio (M)"}
              aria-label="Toggle audio"
            >
              {isMuted ? (
                <svg className="racing-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
                </svg>
              ) : (
                <svg className="racing-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
                </svg>
              )}
            </button>

            {/* Respawn Button */}
            <button
              className="racing-btn"
              onClick={handleReset}
              title="Reset position to grid (R)"
              aria-label="Reset position"
            >
              <svg className="racing-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="racing-btn-text">Reset</span>
              <kbd className="racing-keycap">R</kbd>
            </button>

            {/* Help / Guide */}
            <button
              className="racing-btn racing-btn-icon"
              onClick={() => setShowHelp((prev) => !prev)}
              title="Controls manual"
              aria-label="Help manual"
            >
              <svg className="racing-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
              </svg>
            </button>

            {/* Fullscreen */}
            <button
              className="racing-btn racing-btn-icon"
              onClick={toggleFullscreen}
              title="Toggle fullscreen"
              aria-label="Toggle fullscreen"
            >
              <svg className="racing-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
              </svg>
            </button>
          </div>
        </header>
      )}

      {/* Calm Drift Telemetry Banner */}
      {!isLoading && telemetry.currentDriftPoints > 0 && (
        <div className="racing-drift-toast">
          <span className="racing-drift-label">Drift</span>
          <span className="racing-drift-score">+{telemetry.currentDriftPoints}</span>
        </div>
      )}

      {/* Cockpit Telemetry HUD */}
      {!isLoading && (
        <aside className="racing-telemetry-panel">
          {/* RPM LED Bar */}
          <div className="racing-rpm-gauge">
            <div className="racing-rpm-segments">
              {Array.from({ length: rpmSegments }).map((_, i) => (
                <div
                  key={i}
                  className={`racing-rpm-bar ${
                    i < activeSegments
                      ? i >= 10
                        ? "redline"
                        : i >= 8
                        ? "amber"
                        : "green"
                      : ""
                  }`}
                />
              ))}
            </div>
            <div className="racing-rpm-meta">
              <span className="racing-meta-label">RPM</span>
              <span className="racing-meta-val">{Math.round(telemetry.rpm * 8000)}</span>
            </div>
          </div>

          {/* Main Digital Speed & Gear Cluster */}
          <div className="racing-speed-cluster">
            <div className="racing-speed-readout">
              <span className="racing-speed-num">{telemetry.speedKmh}</span>
              <span className="racing-speed-unit">km/h</span>
            </div>

            <div className="racing-gear-readout">
              <span className="racing-meta-label">Gear</span>
              <span className={`racing-gear-box ${telemetry.isBoosting ? "nos" : ""}`}>
                {telemetry.isBoosting ? "NOS" : telemetry.gear}
              </span>
            </div>
          </div>

          {/* Boost Reserve Meter */}
          <div className="racing-boost-section">
            <div className="racing-boost-header">
              <span className="racing-meta-label">Boost</span>
              <span className="racing-meta-val">{telemetry.nitro}%</span>
            </div>
            <div className="racing-boost-track">
              <div
                className={`racing-boost-fill ${telemetry.isBoosting ? "depleting" : ""}`}
                style={{ width: `${telemetry.nitro}%` }}
              />
            </div>
          </div>

          {/* Drift Score Readout */}
          {telemetry.totalDriftScore > 0 && (
            <div className="racing-drift-summary">
              <span className="racing-meta-label">Drift Score</span>
              <span className="racing-meta-val">{telemetry.totalDriftScore.toLocaleString()}</span>
            </div>
          )}
        </aside>
      )}

      {/* On-Screen Touch Controls (Mobile Landscape Optimized & Desktop Usable) */}
      {!isLoading && (
        <nav className="racing-touch-cluster" aria-label="Racing Controls">
          {/* Left Wing: Steering Paddles */}
          <div className="racing-steer-wing">
            <button
              className={`racing-steer-paddle ${activeSteer === -1 ? "active" : ""}`}
              onPointerDown={() => handleSteerStart(-1)}
              onPointerUp={handleSteerEnd}
              onPointerCancel={handleSteerEnd}
              onPointerLeave={handleSteerEnd}
              aria-label="Steer Left"
            >
              <div className="racing-paddle-ridges">
                <span />
                <span />
                <span />
              </div>
              <svg className="racing-paddle-arrow" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              <kbd className="racing-pedal-keycap">A</kbd>
            </button>

            <button
              className={`racing-steer-paddle ${activeSteer === 1 ? "active" : ""}`}
              onPointerDown={() => handleSteerStart(1)}
              onPointerUp={handleSteerEnd}
              onPointerCancel={handleSteerEnd}
              onPointerLeave={handleSteerEnd}
              aria-label="Steer Right"
            >
              <kbd className="racing-pedal-keycap">D</kbd>
              <svg className="racing-paddle-arrow" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
              <div className="racing-paddle-ridges">
                <span />
                <span />
                <span />
              </div>
            </button>
          </div>

          {/* Right Wing: Drive Pedal, Brake Pedal & Nitrous */}
          <div className="racing-pedal-wing">
            {/* Nitrous Ignition Button */}
            <button
              className={`racing-nos-trigger ${isNosActive || telemetry.isBoosting ? "firing" : ""}`}
              onPointerDown={handleNosStart}
              onPointerUp={handleNosEnd}
              onPointerCancel={handleNosEnd}
              onPointerLeave={handleNosEnd}
              aria-label="Nitrous Boost"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <span>NOS</span>
              <kbd className="racing-pedal-keycap">Shift</kbd>
            </button>

            {/* Brake & Reverse Pedal */}
            <button
              className={`racing-pedal racing-pedal-brake ${activeThrottle === -1 ? "depressed" : ""}`}
              onPointerDown={() => handleThrottleStart(-1)}
              onPointerUp={handleThrottleEnd}
              onPointerCancel={handleThrottleEnd}
              onPointerLeave={handleThrottleEnd}
              aria-label="Brake and Reverse"
            >
              <div className="racing-pedal-tread">
                <span />
                <span />
                <span />
                <span />
              </div>
              <span className="racing-pedal-tag">Brake</span>
              <kbd className="racing-pedal-keycap">S</kbd>
            </button>

            {/* Accelerator Gas Pedal */}
            <button
              className={`racing-pedal racing-pedal-gas ${activeThrottle === 1 ? "depressed" : ""}`}
              onPointerDown={() => handleThrottleStart(1)}
              onPointerUp={handleThrottleEnd}
              onPointerCancel={handleThrottleEnd}
              onPointerLeave={handleThrottleEnd}
              aria-label="Accelerate Throttle"
            >
              <div className="racing-pedal-tread">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <span className="racing-pedal-tag">Drive</span>
              <kbd className="racing-pedal-keycap">W</kbd>
            </button>
          </div>
        </nav>
      )}

      {/* Clean Modal: Controls Guide */}
      {showHelp && (
        <div className="racing-modal-backdrop" onClick={() => setShowHelp(false)}>
          <div className="racing-card racing-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="racing-modal-header">
              <div className="racing-brand">
                <svg className="racing-brand-glyph" viewBox="0 0 24 24" width="18" height="18" fill="none">
                  <path d="M4 19 L11 5 L14 5 L7 19 Z" fill="var(--accent)" />
                  <path d="M10 19 L17 5 L20 5 L13 19 Z" fill="var(--text-primary)" fillOpacity="0.8" />
                </svg>
                <h3 className="racing-modal-title">Controls & Specification</h3>
              </div>
              <button
                className="racing-btn racing-btn-icon"
                onClick={() => setShowHelp(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="racing-modal-body">
              <section className="racing-modal-section">
                <h4>Driving Controls</h4>
                <div className="racing-key-table">
                  <div className="racing-key-row">
                    <span className="racing-key-cell">
                      <kbd className="racing-keycap">W</kbd> / <kbd className="racing-keycap">↑</kbd>
                    </span>
                    <span className="racing-action-cell">Accelerate full throttle</span>
                  </div>
                  <div className="racing-key-row">
                    <span className="racing-key-cell">
                      <kbd className="racing-keycap">S</kbd> / <kbd className="racing-keycap">↓</kbd>
                    </span>
                    <span className="racing-action-cell">Brake and reverse gear</span>
                  </div>
                  <div className="racing-key-row">
                    <span className="racing-key-cell">
                      <kbd className="racing-keycap">A</kbd> / <kbd className="racing-keycap">D</kbd>
                    </span>
                    <span className="racing-action-cell">Steering and drift sliding</span>
                  </div>
                  <div className="racing-key-row">
                    <span className="racing-key-cell">
                      <kbd className="racing-keycap">Shift</kbd> / <kbd className="racing-keycap">Space</kbd>
                    </span>
                    <span className="racing-action-cell">Nitrous boost injection</span>
                  </div>
                </div>
              </section>

              <section className="racing-modal-section">
                <h4>Camera & Session</h4>
                <div className="racing-key-table">
                  <div className="racing-key-row">
                    <span className="racing-key-cell">
                      <kbd className="racing-keycap">C</kbd>
                    </span>
                    <span className="racing-action-cell">Cycle chase, hood, isometric & aerial cameras</span>
                  </div>
                  <div className="racing-key-row">
                    <span className="racing-key-cell">
                      <kbd className="racing-keycap">T</kbd>
                    </span>
                    <span className="racing-action-cell">Cycle daylight, dusk, and night lighting</span>
                  </div>
                  <div className="racing-key-row">
                    <span className="racing-key-cell">
                      <kbd className="racing-keycap">M</kbd>
                    </span>
                    <span className="racing-action-cell">Toggle 3-stage engine audio</span>
                  </div>
                  <div className="racing-key-row">
                    <span className="racing-key-cell">
                      <kbd className="racing-keycap">R</kbd>
                    </span>
                    <span className="racing-action-cell">Reset vehicle to grid position</span>
                  </div>
                </div>
              </section>

              <section className="racing-modal-section">
                <h4>Mobile Device Support</h4>
                <p className="racing-modal-desc">
                  Designed for <strong>Landscape Mode</strong> on mobile. Left thumb steers with dual paddles; right thumb modulates throttle, brake, and hits nitrous simultaneously with full multi-touch.
                </p>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Shortcut Footer */}
      {!isLoading && (
        <footer className="racing-footer-hint">
          <span>WASD to drive • <kbd className="racing-keycap">Shift</kbd> boost • <kbd className="racing-keycap">C</kbd> camera • Touch paddles active</span>
        </footer>
      )}
    </div>
  );
}
