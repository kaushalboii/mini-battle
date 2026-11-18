import { useEffect, useRef, useState } from "react";
import { initRacingGame, CAMERA_MODES, type GameInstance, type TelemetryData } from "../game/racing-engine/initGame";
import { CIRCUITS, type CircuitDefinition } from "../game/racing-engine/Track";
import "../styles/racing.css";

const VEHICLE_OPTIONS = [
  { key: "vehicle-truck-yellow", label: "Amber Bull", team: "Red Bull", color: "#f59e0b" },
  { key: "vehicle-truck-red", label: "Scarlet Scuderia", team: "Ferrari", color: "#ef4444" },
  { key: "vehicle-truck-green", label: "Emerald GP", team: "Aston / Mercedes", color: "#10b981" },
  { key: "vehicle-truck-purple", label: "Cobalt Racing", team: "McLaren / Alpine", color: "#8b5cf6" },
];

const LIGHTING_THEMES: Array<{ key: 'day' | 'sunset' | 'night'; label: string }> = [
  { key: 'day', label: 'Daylight' },
  { key: 'sunset', label: 'Dusk' },
  { key: 'night', label: 'Night' },
];

function formatLapTime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return "--:--.--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds - mins * 60;
  return `${mins}:${secs.toFixed(2).padStart(5, "0")}`;
}

export default function RacingGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameInstance | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadLabel, setLoadLabel] = useState("Initializing circuit & shaders");
  
  // Grand Prix Hub & Circuit Selection State
  const [showLanding, setShowLanding] = useState(true);
  const [showCircuitPicker, setShowCircuitPicker] = useState(false);
  const [selectedCircuit, setSelectedCircuit] = useState<string>("monza");
  const [driverName, setDriverName] = useState<string>("Kaushal");
  const [selectedColor, setSelectedColor] = useState<string>("vehicle-truck-yellow");
  const [isPracticeMode, setIsPracticeMode] = useState<boolean>(false);

  const [cameraMode, setCameraMode] = useState("chase");
  const [lightingTheme, setLightingTheme] = useState<'day' | 'sunset' | 'night'>('day');
  const [isMuted, setIsMuted] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showF1Tower, setShowF1Tower] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Orientation state
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);
  const [isPortraitHintDismissed, setIsPortraitHintDismissed] = useState(false);

  // Multi-touch pedals state
  const [activeSteer, setActiveSteer] = useState<-1 | 0 | 1>(0);
  const [activeThrottle, setActiveThrottle] = useState<-1 | 0 | 1>(0);
  const [isNosActive, setIsNosActive] = useState(false);

  // Unified telemetry & sector timing stream
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    speedKmh: 0,
    gear: 1,
    rpm: 0,
    nitro: 100,
    isBoosting: false,
    driftIntensity: 0,
    currentDriftPoints: 0,
    totalDriftScore: 0,
    lap: 1,
    currentLapTime: 0,
    lastLapTime: null,
    bestLapTime: null,
    isFlash: false,
    isNewBest: false,
    sector: 1,
    trackProgress: 0,
    circuitId: "monza",
    circuit: CIRCUITS.monza,
  });

  // Track viewport orientation
  useEffect(() => {
    const handleViewportChange = () => {
      const isMobile = window.innerWidth < 850 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isPortrait = window.innerHeight > window.innerWidth;
      setIsMobilePortrait(isMobile && isPortrait);
      if (isMobile && isPortrait) {
        setShowF1Tower(false);
      }
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
      },
      selectedCircuit,
      driverName
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
        console.error("Custom 3D Engine ignition failed:", err);
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
    setTelemetry((prev) => ({
      ...prev,
      speedKmh: 0,
      linearSpeed: 0,
      gear: 1,
      currentLapTime: 0,
      lastLapTime: null,
      lap: 1,
      currentDriftPoints: 0,
      totalDriftScore: 0,
      nitro: 100,
      isBoosting: false,
      sector: 1,
      trackProgress: 0,
      isFlash: false,
      isNewBest: false,
    }));
    setToastMessage("Grid Reset • Lap Timer Reset to 00:00.00");
    setTimeout(() => setToastMessage(null), 1400);
  };

  const handleTogglePracticeMode = (forceState?: boolean) => {
    const nextState = forceState !== undefined ? forceState : !isPracticeMode;
    setIsPracticeMode(nextState);
    gameRef.current?.setPracticeMode(nextState);
    setToastMessage(nextState ? "AI Practice Grid Active • 3 Sparring Bots" : "Live Peer Mode • Solo Blank Track");
    setTimeout(() => setToastMessage(null), 1800);
  };

  const handleColorChange = (key: string) => {
    setSelectedColor(key);
    gameRef.current?.setVehicleColor(key);
  };

  const handleSelectCircuit = (circuitId: string) => {
    setSelectedCircuit(circuitId);
    if (gameRef.current) {
      gameRef.current.setCircuit(circuitId);
      const c = CIRCUITS[circuitId];
      if (c?.recommendedTheme) {
        setLightingTheme(c.recommendedTheme);
      }
      setToastMessage(`Switched to ${c?.name || circuitId} • Grid Ready`);
      setTimeout(() => setToastMessage(null), 1500);
    }
    setShowCircuitPicker(false);
  };

  const handleStartGrandPrix = () => {
    if (gameRef.current) {
      gameRef.current.setCircuit(selectedCircuit);
      gameRef.current.setVehicleColor(selectedColor);
      gameRef.current.setDriverName(driverName || "Kaushal");
      gameRef.current.setPracticeMode(isPracticeMode);
      const c = CIRCUITS[selectedCircuit];
      if (c?.recommendedTheme) {
        gameRef.current.setLightingTheme(c.recommendedTheme);
        setLightingTheme(c.recommendedTheme);
      }
    }
    setShowLanding(false);
    setToastMessage(
      isPracticeMode
        ? `Grand Prix Started • Practice Grid on ${CIRCUITS[selectedCircuit]?.name || "Monza"}!`
        : `Grand Prix Started • Live Solo on ${CIRCUITS[selectedCircuit]?.name || "Monza"}!`
    );
    setTimeout(() => setToastMessage(null), 1800);
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

      if (e.code === "Escape") {
        setShowLanding((prev) => !prev);
      } else if (e.code === "KeyC") {
        handleCycleCamera();
      } else if (e.code === "KeyR") {
        handleReset();
      } else if (e.code === "KeyM") {
        setShowCircuitPicker((prev) => !prev);
      } else if (e.code === "KeyT") {
        handleCycleLighting();
      } else if (e.code === "KeyL") {
        setShowF1Tower((prev) => !prev);
      } else if (e.code === "KeyP") {
        handleTogglePracticeMode();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cameraMode, lightingTheme, isMuted, isPracticeMode]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleRotateToLandscape = () => {
    toggleFullscreen();
    try {
      if (screen.orientation && 'lock' in screen.orientation) {
        (screen.orientation as any).lock('landscape').catch(() => {});
      }
    } catch {}
  };

  const currentCamInfo = CAMERA_MODES.find((m) => m.key === cameraMode) || CAMERA_MODES[0];
  const currentThemeInfo = LIGHTING_THEMES.find((t) => t.key === lightingTheme) || LIGHTING_THEMES[0];
  const currentCircuitDef = CIRCUITS[selectedCircuit] || CIRCUITS.monza;
  const selectedVehicleOption = VEHICLE_OPTIONS.find((v) => v.key === selectedColor) || VEHICLE_OPTIONS[0];

  return (
    <div className="racing-root racing-viewport">
      {/* 3D WebGPU / WebGL Engine Canvas */}
      <canvas ref={canvasRef} className="racing-canvas" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="racing-modal-backdrop">
          <div className="racing-card racing-load-card">
            <div className="racing-ring-loader" />
            <h2 className="racing-load-title">RevSector 3D</h2>
            <p className="racing-load-sub">Grand Prix Circuit Simulator • By Kaushal</p>
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

      {/* ROTATE TO LANDSCAPE FULLSCREEN SCREEN (MOBILE PORTRAIT INITIAL VIEW) */}
      {!isLoading && showLanding && isMobilePortrait && !isPortraitHintDismissed && (
        <div className="revsector-rotate-backdrop">
          <div className="revsector-rotate-card">
            <div className="landing-gp-badge" style={{ justifyContent: "center" }}>
              <span className="landing-f1-pill">F1 GP</span>
              <h2 className="landing-title" style={{ fontSize: "18px" }}>RevSector 3D</h2>
            </div>

            <div className="rotate-device-anim-wrapper">
              <div className="rotate-phone-anim">
                <div className="rotate-phone-notch" />
                <div className="rotate-phone-screen">
                  <span className="rotate-car-icon">🏎️</span>
                </div>
              </div>
              <svg className="rotate-arrow-svg" viewBox="0 0 100 100">
                <path d="M 22,50 A 28,28 0 1,1 50,78" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="6,4" />
                <polygon points="50,86 60,78 50,70" fill="#f59e0b" />
              </svg>
            </div>

            <h3 className="rotate-prompt-title">ROTATE DEVICE TO PLAY</h3>
            <p className="rotate-prompt-desc">
              RevSector 3D is engineered for widescreen landscape simulation. Turn your phone horizontally to access full circuit view, cockpit telemetry & steering controls.
            </p>

            <button
              type="button"
              className="btn-launch-gp rotate-enter-btn"
              onClick={handleRotateToLandscape}
            >
              <span>🔄 Turn to Landscape / Fullscreen</span>
            </button>

            <button
              type="button"
              className="rotate-bypass-link"
              onClick={() => setIsPortraitHintDismissed(true)}
            >
              Continue in Portrait Anyway →
            </button>
          </div>
        </div>
      )}

      {/* GRAND PRIX LANDING SCREEN & CIRCUIT SELECTOR */}
      {!isLoading && showLanding && (!isMobilePortrait || isPortraitHintDismissed) && (
        <div className="revsector-landing-backdrop">
          <div className="revsector-landing-hub">
            {/* Header */}
            <div className="landing-hub-header">
              <div className="landing-brand-col">
                <div className="landing-gp-badge">
                  <span className="landing-f1-pill">F1 GP</span>
                  <h1 className="landing-title">RevSector 3D</h1>
                </div>
                <span className="landing-subtitle">
                  Engineered by Kaushal • Real-Time WebGPU Multi-Car Circuit Racing
                </span>
              </div>
              <div className="landing-mesh-badge" title="Zero-Connect Live Grid Sync">
                <span className="mesh-live-dot" />
                <span className="mesh-badge-text-full">Zero-Connect Mesh Active</span>
                <span className="mesh-badge-text-short">Live Grid</span>
              </div>
            </div>

            {/* Circuit Selection Grid */}
            <div>
              <div className="landing-section-title">Select Grand Prix Circuit</div>
              <div className="circuit-cards-grid">
                {Object.values(CIRCUITS).map((circuit) => {
                  const isSelected = selectedCircuit === circuit.id;
                  return (
                    <div
                      key={circuit.id}
                      className={`circuit-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedCircuit(circuit.id)}
                    >
                      <div className="circuit-card-top">
                        <span className="circuit-flag">{circuit.flag}</span>
                        <span className="circuit-diff-badge">{circuit.difficulty}</span>
                      </div>
                      <div className="circuit-card-name">{circuit.name}</div>
                      <div className="circuit-card-loc">{circuit.location} • {circuit.country}</div>
                      <div className="circuit-card-desc">{circuit.description}</div>
                      <div className="circuit-card-stats">
                        <span className="circuit-stat-item"><strong>{circuit.sectorsCount}</strong> Sectors</span>
                        <span className="circuit-stat-item"><strong>{circuit.drsZones}</strong> DRS Zones</span>
                        <span className="circuit-stat-item circuit-stat-bench">Benchmark <strong>{circuit.benchmarkLap}s</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Race Mode Selector (Live Peer vs AI Practice Grid) */}
            <div className="landing-mode-section">
              <label className="landing-section-title">Select Racing Mode</label>
              <div className="landing-mode-grid">
                <button
                  type="button"
                  className={`landing-mode-card ${!isPracticeMode ? 'selected' : ''}`}
                  onClick={() => setIsPracticeMode(false)}
                >
                  <div className="mode-card-top">
                    <span className="mode-badge-live">🌐 ZERO-CONNECT MESH</span>
                    {!isPracticeMode && <span className="mode-check">✓ Active</span>}
                  </div>
                  <div className="mode-card-title">Pure Live Peer (Solo Hot Laps)</div>
                  <div className="mode-card-desc">
                    Clean, blank 2km circuit with zero bots. Drive solo hot laps or alongside live users visiting RevSector in real time.
                  </div>
                </button>

                <button
                  type="button"
                  className={`landing-mode-card ${isPracticeMode ? 'selected' : ''}`}
                  onClick={() => setIsPracticeMode(true)}
                >
                  <div className="mode-card-top">
                    <span className="mode-badge-ai">🤖 AI SPARRING GRID</span>
                    {isPracticeMode && <span className="mode-check">✓ Active</span>}
                  </div>
                  <div className="mode-card-title">Practice Grid (3 Sparring Bots)</div>
                  <div className="mode-card-desc">
                    Race against 3 independent AI bots (Verstappen, Hamilton, Norris) on separate lines. Full car-to-car crash physics.
                  </div>
                </button>
              </div>
            </div>

            {/* Driver & Livery Customization */}
            <div className="driver-config-row">
              <div className="driver-input-box">
                <label className="landing-section-title">Driver Name</label>
                <input
                  type="text"
                  maxLength={14}
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="driver-text-input"
                  placeholder="Enter Driver Name"
                />
              </div>

              <div className="driver-input-box">
                <label className="landing-section-title">Team Livery</label>
                <div className="livery-pills-row">
                  {VEHICLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      className={`livery-pill-opt ${selectedColor === opt.key ? 'selected' : ''}`}
                      onClick={() => handleColorChange(opt.key)}
                      title={opt.label}
                    >
                      <span className="livery-color-sample" style={{ backgroundColor: opt.color }} />
                      <span className="livery-name-full">{opt.label}</span>
                      <span className="livery-name-short">{opt.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer with Action Button */}
            <div className="landing-hub-footer">
              <span className="landing-tip-text">
                {!isPracticeMode
                  ? "🏎️ Solo Live Mode Active • Clean blank track unless live players join!"
                  : "🏎️ AI Grid Active • Sparring with Verstappen, Hamilton & Norris!"}
              </span>
              <button className="btn-launch-gp" onClick={handleStartGrandPrix}>
                <span>START GRAND PRIX</span>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-GAME CIRCUIT PICKER MODAL */}
      {!isLoading && showCircuitPicker && (
        <div className="racing-modal-backdrop" onClick={() => setShowCircuitPicker(false)}>
          <div className="racing-card racing-modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="racing-modal-header">
              <h3 className="racing-modal-title">Switch Grand Prix Circuit</h3>
              <button
                className="racing-btn racing-btn-icon"
                onClick={() => setShowCircuitPicker(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="circuit-cards-grid" style={{ gridTemplateColumns: '1fr', gap: '8px' }}>
              {Object.values(CIRCUITS).map((circuit) => {
                const isSelected = selectedCircuit === circuit.id;
                return (
                  <div
                    key={circuit.id}
                    className={`circuit-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectCircuit(circuit.id)}
                    style={{ padding: '12px' }}
                  >
                    <div className="circuit-card-top" style={{ marginBottom: '4px' }}>
                      <span style={{ fontSize: '16px' }}>{circuit.flag} {circuit.name}</span>
                      <span className="circuit-diff-badge">{circuit.difficulty}</span>
                    </div>
                    <div className="circuit-card-loc" style={{ marginBottom: '6px' }}>{circuit.location}</div>
                    <div className="circuit-card-stats">
                      <span><strong>{circuit.sectorsCount}</strong> Sectors</span>
                      <span><strong>{circuit.drsZones}</strong> DRS Zones</span>
                      <span>Target: <strong>{circuit.benchmarkLap}s</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Floating Notification Toast */}
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
              Restart Engine
            </button>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      {!isLoading && !showLanding && (
        <header className="racing-top-bar">
          {/* Brand Identifier */}
          <div className="racing-brand">
            <svg className="racing-brand-glyph" viewBox="0 0 24 24" width="20" height="20" fill="none">
              <path d="M4 19 L11 5 L14 5 L7 19 Z" fill="var(--accent)" />
              <path d="M10 19 L17 5 L20 5 L13 19 Z" fill="var(--text-primary)" fillOpacity="0.85" />
            </svg>
            <div className="racing-brand-text">
              <span className="racing-brand-name">RevSector 3D</span>
              <span className="racing-brand-sub">By Kaushal • {currentCircuitDef.name}</span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="racing-toolbar">
            {/* Paddock / Grand Prix Hub Button */}
            <button
              className="racing-btn paddock-btn"
              onClick={() => setShowLanding(true)}
              title="Open Grand Prix Hub / Paddock (Esc)"
              aria-label="Paddock Hub"
            >
              <span style={{ fontSize: '13px' }}>🏁</span>
              <span className="racing-btn-text">Paddock</span>
            </button>

            {/* Circuits Switcher Button */}
            <button
              className="racing-btn"
              onClick={() => setShowCircuitPicker(true)}
              title="Change Circuit / Grand Prix Track (M)"
              aria-label="Change Circuit"
            >
              <span style={{ fontSize: '13px' }}>{currentCircuitDef.flag}</span>
              <span className="racing-btn-text">{currentCircuitDef.name}</span>
              <kbd className="racing-keycap">M</kbd>
            </button>

            {/* F1 Tower Toggle */}
            <button
              className={`racing-btn f1-toggle-btn ${showF1Tower ? 'active' : ''}`}
              onClick={() => setShowF1Tower((prev) => !prev)}
              title="Toggle F1 Live Leaderboard (L)"
              aria-label="Toggle F1 Leaderboard"
            >
              <span className="f1-pill-badge">F1</span>
              <span className="racing-btn-text">Standings</span>
              <kbd className="racing-keycap">L</kbd>
            </button>

            {/* Mode Switcher (Solo / Live Mesh vs AI Practice Grid) */}
            <div className="racing-mode-pill-group" title="Toggle Race Mode: Live Peer (Solo) / Practice Grid (P)">
              <button
                type="button"
                className={`racing-mode-pill ${!isPracticeMode ? 'active' : ''}`}
                onClick={() => handleTogglePracticeMode(false)}
                title="Solo Live Mode (Clean track, real humans only)"
              >
                <span className="mode-live-dot" />
                <span className="racing-btn-text">Solo / Live</span>
              </button>
              <button
                type="button"
                className={`racing-mode-pill ${isPracticeMode ? 'active' : ''}`}
                onClick={() => handleTogglePracticeMode(true)}
                title="AI Practice Mode (3 Sparring Bots)"
              >
                <span className="racing-btn-text">🤖 Practice</span>
              </button>
              <kbd className="racing-keycap">P</kbd>
            </div>

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
              title={isMuted ? "Unmute audio" : "Mute audio"}
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

      {/* Mobile Portrait Orientation Recommendation Banner */}
      {!isLoading && !showLanding && isMobilePortrait && !isPortraitHintDismissed && (
        <div className="racing-orientation-banner">
          <div className="orientation-banner-content">
            <span className="orientation-icon">🔄</span>
            <span>Rotate to <strong>Landscape</strong> for wide F1 cockpit view</span>
          </div>
          <button
            className="orientation-banner-close"
            onClick={() => setIsPortraitHintDismissed(true)}
            aria-label="Dismiss orientation notice"
          >
            ✕
          </button>
        </div>
      )}

      {/* FORMULA 1 OFFICIAL TIMING TOWER / DYNAMIC RIVAL LEADERBOARD (Left Side) */}
      {!isLoading && !showLanding && showF1Tower && (
        <aside className="f1-timing-tower" aria-label="F1 Grand Prix Leaderboard">
          {/* Header */}
          <div className="f1-tower-header">
            <div className="f1-gp-badge">
              <span className="f1-gp-tag">F1</span>
              <span className="f1-gp-name">REVSECTOR</span>
            </div>
            <div className="f1-tower-lap">
              <span className="f1-lap-text">LAP</span>
              <span className="f1-lap-count">{telemetry.lap} <span className="f1-lap-total">/ 5</span></span>
            </div>
          </div>

          {/* Sector Tracking Bar */}
          <div className="f1-sector-tracker">
            <div className={`f1-sector-block ${telemetry.sector === 1 ? 'active' : telemetry.sector > 1 ? 'complete' : ''}`}>
              <span className="f1-sec-label">S1</span>
              <span className="f1-sec-pip" />
            </div>
            <div className={`f1-sector-block ${telemetry.sector === 2 ? 'active' : telemetry.sector > 2 ? 'complete' : ''}`}>
              <span className="f1-sec-label">S2</span>
              <span className="f1-sec-pip" />
            </div>
            <div className={`f1-sector-block ${telemetry.sector === 3 ? 'active' : ''}`}>
              <span className="f1-sec-label">S3</span>
              <span className="f1-sec-pip" />
            </div>
          </div>

          {/* Dynamic Drivers Standings List */}
          <div className="f1-drivers-list">
            {(telemetry.standings && telemetry.standings.length > 0 ? telemetry.standings : [
              { position: 1, name: driverName, code: driverName.substring(0, 3).toUpperCase(), color: selectedVehicleOption.color, gap: 'LEADER', tire: 'S' as const, isPlayer: true, lap: telemetry.lap, speedKmh: telemetry.speedKmh },
            ]).map((d) => (
              <div key={d.code} className={`f1-driver-row ${d.isPlayer ? 'player-row current-player' : ''}`}>
                <span className={`f1-pos-badge ${d.position === 1 ? 'p1' : ''}`}>{d.position}</span>
                <span
                  className="f1-team-stripe"
                  style={{ backgroundColor: d.color }}
                />
                <span className="f1-driver-code">{d.code}</span>
                <span className={`f1-tire-badge tire-${d.tire === 'S' ? 'soft' : d.tire === 'M' ? 'med' : 'hard'}`}>{d.tire}</span>
                <span className={`f1-gap-tag ${d.gap === 'LEADER' ? 'leader' : ''}`}>{d.gap}</span>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* UNIFIED MOTORSPORT LAP TIMING CONSOLE (Top-Center) */}
      {!isLoading && !showLanding && (
        <section className={`racing-timing-console ${telemetry.isFlash ? (telemetry.isNewBest ? "new-best" : "lap-flash") : ""}`}>
          <div className="racing-timing-header">
            <span className="racing-lap-badge">LAP {telemetry.lap}</span>
            <span className="racing-timing-state">
              {telemetry.isFlash && telemetry.isNewBest ? "PURPLE SECTOR" : `SECTOR ${telemetry.sector || 1}`}
            </span>
          </div>
          <div className="racing-timing-main">
            <span className="racing-timing-current">{formatLapTime(telemetry.currentLapTime)}</span>
          </div>
          <div className="racing-timing-footer">
            <div className="racing-time-stat">
              <span className="racing-stat-tag">LAST</span>
              <span className="racing-stat-val">{formatLapTime(telemetry.lastLapTime)}</span>
            </div>
            <div className="racing-time-stat">
              <span className="racing-stat-tag">BEST</span>
              <span className="racing-stat-val highlight">{formatLapTime(telemetry.bestLapTime)}</span>
            </div>
          </div>
        </section>
      )}

      {/* DRIFT SCORE TOAST (Cleanly Below Timing Console — NO OVERLAP!) */}
      {!isLoading && !showLanding && telemetry.currentDriftPoints > 0 && (
        <div className="racing-drift-toast">
          <span className="racing-drift-flame">🔥</span>
          <span className="racing-drift-label">DRIFT POWER</span>
          <span className="racing-drift-score">+{telemetry.currentDriftPoints}</span>
        </div>
      )}

      {/* COCKPIT TELEMETRY INSTRUMENT PANEL (Bottom-Left / Steering Dash) */}
      {!isLoading && !showLanding && (
        <aside className="racing-telemetry-panel">
          {/* F1 15-LED Shift Light Bar */}
          <div className="f1-shift-cluster">
            {[...Array(15)].map((_, i) => {
              const activeCount = Math.floor((telemetry.rpm || 0) * 15);
              const isActive = i < activeCount;
              const colorType = i < 5 ? 'green' : i < 10 ? 'red' : 'blue';
              return (
                <span
                  key={i}
                  className={`f1-shift-led ${colorType} ${isActive ? 'lit' : ''}`}
                />
              );
            })}
          </div>

          <div className="racing-speed-cluster">
            <div className="racing-speed-readout">
              <span className="racing-speed-num">{telemetry.speedKmh}</span>
              <span className="racing-speed-unit">KM/H</span>
            </div>
            <div className="racing-gear-box">
              <span className="racing-gear-tag">GEAR</span>
              <span className={`racing-gear-num ${telemetry.gear === 'NOS' ? 'gear-nos' : ''}`}>
                {telemetry.gear}
              </span>
            </div>
          </div>

          {/* ERS Boost Fuel Gauge */}
          <div className="racing-boost-section">
            <div className="racing-boost-header">
              <span className="racing-meta-label">BOOST</span>
              <span className="racing-meta-val">{telemetry.nitro}%</span>
            </div>
            <div className="racing-boost-track">
              <div
                className={`racing-boost-fill ${telemetry.isBoosting ? 'depleting' : ''}`}
                style={{ width: `${telemetry.nitro}%` }}
              />
            </div>
          </div>

          {/* Career Drift Score */}
          <div className="racing-drift-summary">
            <span className="racing-meta-label">DRIFT SCORE</span>
            <span className="racing-meta-val">
              {telemetry.totalDriftScore.toLocaleString()}
            </span>
          </div>
        </aside>
      )}

      {/* TOUCH CONTROLS FOR MOBILE / TABLET */}
      {!isLoading && !showLanding && (
        <div className="racing-touch-cluster">
          {/* Left Wing: Steering Paddles */}
          <div className="racing-steer-wing">
            <button
              className={`racing-steer-paddle left ${activeSteer === 1 ? 'pressed' : ''}`}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                handleSteerStart(1);
              }}
              onPointerUp={(e) => {
                try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
                handleSteerEnd();
              }}
              onPointerCancel={handleSteerEnd}
              aria-label="Steer Left"
            >
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 19l-7-7 7-7" />
              </svg>
              <span className="racing-pedal-keycap">A</span>
            </button>

            <button
              className={`racing-steer-paddle right ${activeSteer === -1 ? 'pressed' : ''}`}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                handleSteerStart(-1);
              }}
              onPointerUp={(e) => {
                try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
                handleSteerEnd();
              }}
              onPointerCancel={handleSteerEnd}
              aria-label="Steer Right"
            >
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 5l7 7-7 7" />
              </svg>
              <span className="racing-pedal-keycap">D</span>
            </button>
          </div>

          {/* Right Wing: Pedals & Nitro */}
          <div className="racing-pedal-wing">
            {/* Nitrous Trigger */}
            <button
              className={`racing-nos-trigger ${isNosActive ? 'firing' : ''}`}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                handleNosStart();
              }}
              onPointerUp={(e) => {
                try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
                handleNosEnd();
              }}
              onPointerCancel={handleNosEnd}
              aria-label="Nitrous Boost"
            >
              <span className="racing-pedal-keycap">SHIFT</span>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <span>BOOST</span>
            </button>

            {/* Brake & Reverse Pedal */}
            <button
              className={`racing-pedal racing-pedal-brake ${activeThrottle === -1 ? 'depressed' : ''}`}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                handleThrottleStart(-1);
              }}
              onPointerUp={(e) => {
                try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
                handleThrottleEnd();
              }}
              onPointerCancel={handleThrottleEnd}
              aria-label="Brake and Reverse"
            >
              <span className="racing-pedal-keycap">S / ↓</span>
              <span className="racing-pedal-tag">REV / BRAKE</span>
              <div className="racing-pedal-tread">
                <span /><span /><span />
              </div>
            </button>

            {/* Accelerator Pedal */}
            <button
              className={`racing-pedal racing-pedal-gas ${activeThrottle === 1 ? 'depressed' : ''}`}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                handleThrottleStart(1);
              }}
              onPointerUp={(e) => {
                try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
                handleThrottleEnd();
              }}
              onPointerCancel={handleThrottleEnd}
              aria-label="Accelerate"
            >
              <span className="racing-pedal-keycap">W / ↑</span>
              <span className="racing-pedal-tag">DRIVE</span>
              <div className="racing-pedal-tread">
                <span /><span /><span /><span />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Controls Manual / Help Modal */}
      {showHelp && (
        <div className="racing-modal-backdrop" onClick={() => setShowHelp(false)}>
          <div className="racing-card racing-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="racing-modal-header">
              <h3 className="racing-modal-title">RevSector 3D • Driver Manual</h3>
              <button
                className="racing-btn racing-btn-icon"
                onClick={() => setShowHelp(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="racing-modal-body">
              <div className="racing-modal-section">
                <h4>Driving Controls</h4>
                <div className="racing-key-table">
                  <div className="racing-key-row">
                    <span className="racing-key-cell"><kbd className="racing-keycap">W</kbd> or <kbd className="racing-keycap">↑</kbd></span>
                    <span className="racing-action-cell">Forward Acceleration</span>
                  </div>
                  <div className="racing-key-row">
                    <span className="racing-key-cell"><kbd className="racing-keycap">S</kbd> or <kbd className="racing-keycap">↓</kbd></span>
                    <span className="racing-action-cell">High-Friction Brake & Reverse</span>
                  </div>
                  <div className="racing-key-row">
                    <span className="racing-key-cell"><kbd className="racing-keycap">A</kbd> / <kbd className="racing-keycap">D</kbd> or <kbd className="racing-keycap">←</kbd> / <kbd className="racing-keycap">→</kbd></span>
                    <span className="racing-action-cell">Steering & Counter-Steer</span>
                  </div>
                  <div className="racing-key-row">
                    <span className="racing-key-cell"><kbd className="racing-keycap">Space</kbd> or <kbd className="racing-keycap">Shift</kbd></span>
                    <span className="racing-action-cell">Nitro Boost & Drift Assist</span>
                  </div>
                </div>
              </div>

              <div className="racing-modal-section">
                <h4>Race Functions</h4>
                <div className="racing-key-table">
                  <div className="racing-key-row">
                    <span className="racing-key-cell"><kbd className="racing-keycap">M</kbd></span>
                    <span className="racing-action-cell">Switch Grand Prix Circuit</span>
                  </div>
                  <div className="racing-key-row">
                    <span className="racing-key-cell"><kbd className="racing-keycap">L</kbd></span>
                    <span className="racing-action-cell">Toggle F1 Standings Leaderboard</span>
                  </div>
                  <div className="racing-key-row">
                    <span className="racing-key-cell"><kbd className="racing-keycap">C</kbd></span>
                    <span className="racing-action-cell">Cycle Follow Camera Angles</span>
                  </div>
                  <div className="racing-key-row">
                    <span className="racing-key-cell"><kbd className="racing-keycap">T</kbd></span>
                    <span className="racing-action-cell">Cycle Daylight / Dusk / Night</span>
                  </div>
                  <div className="racing-key-row">
                    <span className="racing-key-cell"><kbd className="racing-keycap">R</kbd></span>
                    <span className="racing-action-cell">Reset Position & Hot Lap</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Hint Footer */}
      {!isLoading && !showLanding && (
        <div className="racing-footer-hint">
          <span>Drive: WASD / Arrows • Nitro: Space / Shift • Circuits: M • Standings: L • Reset: R • RevSector 3D by Kaushal</span>
        </div>
      )}
    </div>
  );
}
