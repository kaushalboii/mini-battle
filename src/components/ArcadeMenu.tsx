/**
 * Mini-Battle 3D Arcade - Master Gaming Menu & Portal
 * High-voltage arcade landing screen allowing players to select
 * between RevSector 3D (Car Racing) and Toxic Meltdown® (Inflatable Sweeper).
 * Engineered by Kaushal.
 */

import React from 'react';
import '../styles/arcade-menu.css';

interface ArcadeMenuProps {
  onSelectGame: (game: 'racing' | 'meltdown') => void;
}

export default function ArcadeMenu({ onSelectGame }: ArcadeMenuProps) {
  return (
    <div className="arcade-menu-wrapper">
      {/* Animated Background Ambience */}
      <div className="arcade-bg-glow" />
      <div className="arcade-grid-mesh" />

      {/* Main Container */}
      <div className="arcade-menu-container">
        {/* Header */}
        <header className="arcade-header">
          <div className="arcade-brand-badge">
            <span className="arcade-badge-pill">ARCADE ARENA 3D</span>
            <span className="arcade-badge-version">v4.2 PRO</span>
          </div>
          <h1 className="arcade-main-title">
            MINI-BATTLE<span className="title-highlight"> 3D</span>
          </h1>
          <p className="arcade-subtitle">
            High-Performance Real-Time WebGL & WebGPU Simulations • Engineered by <strong>Kaushal</strong>
          </p>
        </header>

        {/* Game Selection Cards Grid */}
        <div className="arcade-games-grid">
          {/* GAME 1: RevSector 3D (Car Racing) */}
          <div className="arcade-game-card card-racing" onClick={() => onSelectGame('racing')}>
            <div className="card-top-banner">
              <span className="game-type-pill pill-racing">🏎️ MOTORSPORT SIMULATOR</span>
              <span className="game-meta-tag">3 GRAND PRIX CIRCUITS</span>
            </div>

            <div className="card-visual-preview preview-racing">
              <div className="racing-preview-graphic">
                <div className="racing-car-silhouette">🏎️💨</div>
                <div className="racing-track-lines">
                  <span className="curb-stripe" />
                  <span className="curb-stripe red" />
                  <span className="curb-stripe" />
                </div>
              </div>
            </div>

            <div className="card-content">
              <h2 className="game-title">RevSector 3D</h2>
              <p className="game-tagline">
                Formula Grand Prix Circuit Racing • Dynamic Physics & Multi-Car Grid
              </p>
              <p className="game-desc">
                High-speed asphalt circuit racing across Monza Speed Ring, Silverstone GP, and Marina Bay. Features realistic vehicle dynamics, nitrous injection, tire smoke, drift rubber skid marks, Day/Sunset/Night lighting, and official F1 live timing telemetry.
              </p>

              <div className="game-features-list">
                <span className="feature-pill">🏁 3 Grand Prix Tracks</span>
                <span className="feature-pill">🌐 Zero-Connect Mesh Sync</span>
                <span className="feature-pill">🤖 3 Sparring AI Racers</span>
                <span className="feature-pill">💨 Nitrous & Drift Marks</span>
              </div>
            </div>

            <div className="card-footer">
              <button
                type="button"
                className="btn-launch-game btn-racing"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectGame('racing');
                }}
              >
                <span>LAUNCH CAR RACING</span>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* GAME 2: Toxic Meltdown® (Inflatable Sweeper) */}
          <div className="arcade-game-card card-meltdown" onClick={() => onSelectGame('meltdown')}>
            <div className="card-top-banner">
              <span className="game-type-pill pill-meltdown">☣️ GALAXY MULTI RIDES®</span>
              <span className="game-meta-tag">8 PLAYERS</span>
            </div>

            <div className="card-visual-preview preview-meltdown">
              <div className="meltdown-preview-graphic">
                <div className="sweeper-rotor-icon">☣️</div>
                <div className="meltdown-arms-graphic">
                  <span className="hazard-boom-low">LOW ARM: JUMP ⬆️</span>
                  <span className="hazard-boom-high">HIGH ARM: DUCK ⬇️</span>
                </div>
              </div>
            </div>

            <div className="card-content">
              <h2 className="game-title">
                Toxic Meltdown<span className="reg-mark">®</span> 3D
              </h2>
              <p className="game-tagline">
                8-Player Inflatable Sweeper • Last Person Standing Survival
              </p>
              <p className="game-desc">
                The world-famous 30ft octagonal inflatable action game. Stand on your podium and survive two spinning mechanical foam boom arms! Jump over the low arm, duck beneath the high arm with diagonal truss, and outlast 7 competitors as speeds escalate into a meltdown!
              </p>

              <div className="game-features-list">
                <span className="feature-pill">🦘 Low Arm: Jump Over</span>
                <span className="feature-pill">🦆 High Arm: Duck Under</span>
                <span className="feature-pill">💥 Ragdoll Knockout Physics</span>
                <span className="feature-pill">🕹️ Attendant Console Mode</span>
              </div>
            </div>

            <div className="card-footer">
              <button
                type="button"
                className="btn-launch-game btn-meltdown"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectGame('meltdown');
                }}
              >
                <span>ENTER TOXIC MELTDOWN</span>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <footer className="arcade-footer">
          <div className="footer-status-pill">
            <span className="status-live-dot" />
            <span>WebGL 3D Accelerated • Responsive Mobile & Desktop Engine</span>
          </div>
          <span className="footer-copyright">
            Mini-Battle 3D Portal • Built with React & Three.js • Engineered by Kaushal
          </span>
        </footer>
      </div>
    </div>
  );
}

