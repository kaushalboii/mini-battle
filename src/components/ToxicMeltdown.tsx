/**
 * Toxic Meltdown® 3D - Interactive React Component
 * 8-player inflatable sweeper battle game.
 * Jump over the low arm, duck under the high arm, survive escalating motor speeds!
 * Features tactile mobile pedals, attendant console controls, and multi-cam views.
 * Engineered by Kaushal.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ToxicMeltdownEngine, type MeltdownEngineState } from '../game/toxic-meltdown/ToxicMeltdownEngine';
import { ToxicMeltdownAudio } from '../game/toxic-meltdown/ToxicMeltdownAudio';
import '../styles/toxic-meltdown.css';

interface ToxicMeltdownProps {
  onSwitchToRacing?: () => void;
}

export default function ToxicMeltdown({ onSwitchToRacing }: ToxicMeltdownProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ToxicMeltdownEngine | null>(null);
  const audioRef = useRef<ToxicMeltdownAudio>(new ToxicMeltdownAudio());

  // Game UI State
  const [engineState, setEngineState] = useState<MeltdownEngineState>({
    survivorsCount: 8,
    totalPlayers: 8,
    roundTime: 0,
    currentRpm: 14,
    speedLevel: 'WARMUP',
    direction: 1,
    isPlayerEliminated: false,
    playerRank: null,
    winnerName: null,
    isRoundOver: false,
    score: 0,
    clearedJumps: 0,
    clearedDucks: 0,
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraMode, setCameraMode] = useState<'action' | 'player' | 'operator' | 'topdown'>('action');
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [operatorSpeedRatio, setOperatorSpeedRatio] = useState(0.35);

  // Touch active states
  const [isJumpPressed, setIsJumpPressed] = useState(false);
  const [isDuckPressed, setIsDuckPressed] = useState(false);

  // Initialize 3D Engine
  useEffect(() => {
    if (!canvasRef.current) return;

    const audio = audioRef.current;
    const engine = new ToxicMeltdownEngine(
      canvasRef.current,
      audio,
      (state) => setEngineState(state),
      (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 2400);
      }
    );

    engineRef.current = engine;
    engine.restartGame();

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        setIsJumpPressed(true);
        engineRef.current?.triggerJump(0);
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        setIsDuckPressed(true);
        engineRef.current?.setDucking(true, 0);
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        engineRef.current?.restartGame();
      } else if (e.code === 'KeyC') {
        e.preventDefault();
        const nextMode = engineRef.current?.cycleCameraMode();
        if (nextMode) setCameraMode(nextMode as any);
      } else if (e.code === 'KeyM') {
        setIsMuted((prev) => {
          const next = !prev;
          audioRef.current.setMuted(next);
          return next;
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        setIsJumpPressed(false);
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        setIsDuckPressed(false);
        engineRef.current?.setDucking(false, 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleJumpStart = () => {
    setIsJumpPressed(true);
    engineRef.current?.triggerJump(0);
  };

  const handleJumpEnd = () => {
    setIsJumpPressed(false);
  };

  const handleDuckStart = () => {
    setIsDuckPressed(true);
    engineRef.current?.setDucking(true, 0);
  };

  const handleDuckEnd = () => {
    setIsDuckPressed(false);
    engineRef.current?.setDucking(false, 0);
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      audioRef.current.setMuted(next);
      return next;
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem.toFixed(1).padStart(4, '0')}`;
  };

  return (
    <div className="toxic-meltdown-container">
      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="toxic-canvas" />

      {/* Top Navigation & Game Switcher Toolbar */}
      <header className="toxic-top-bar">
        {/* Brand & Badge */}
        <div className="toxic-brand-group">
          <div className="toxic-hazard-stripe-icon">☣️</div>
          <div className="toxic-brand-meta">
            <div className="toxic-brand-title">
              TOXIC MELTDOWN<span className="toxic-reg">®</span>
            </div>
            <div className="toxic-brand-sub">
              By Galaxy Multi Rides • Inflatable Sweeper Arena
            </div>
          </div>
        </div>

        {/* Global Toolbar Actions */}
        <div className="toxic-toolbar-actions">
          {/* Switch to Car Racing Portal Button */}
          {onSwitchToRacing && (
            <button
              className="toxic-nav-btn switch-game-btn"
              onClick={onSwitchToRacing}
              title="Switch to RevSector 3D Car Racing"
            >
              <span>🏎️</span>
              <span className="btn-label-text">Play Car Racing</span>
            </button>
          )}

          {/* Camera View Toggle */}
          <button
            className="toxic-nav-btn"
            onClick={() => {
              const nextMode = engineRef.current?.cycleCameraMode();
              if (nextMode) setCameraMode(nextMode as any);
            }}
            title="Switch Camera (C): Action / Player / Operator / Top-Down"
          >
            <span>📹</span>
            <span className="btn-label-text">
              {cameraMode === 'action' && 'Action Cam'}
              {cameraMode === 'player' && 'Player 1 Cam'}
              {cameraMode === 'operator' && 'Console Cam'}
              {cameraMode === 'topdown' && 'Arena Cam'}
            </span>
            <kbd className="toxic-kbd">C</kbd>
          </button>

          {/* Operator Console Drawer Toggle */}
          <button
            className={`toxic-nav-btn ${isConsoleOpen ? 'active' : ''}`}
            onClick={() => setIsConsoleOpen((prev) => !prev)}
            title="Toggle Operator Control Console"
          >
            <span>🕹️</span>
            <span className="btn-label-text">Operator Panel</span>
          </button>

          {/* Audio Mute */}
          <button
            className={`toxic-nav-btn ${isMuted ? 'muted' : ''}`}
            onClick={toggleMute}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            <span>{isMuted ? '🔇' : '🔊'}</span>
          </button>

          {/* Restart Round */}
          <button
            className="toxic-nav-btn"
            onClick={() => engineRef.current?.restartGame()}
            title="Restart Round (R)"
          >
            <span>🔄</span>
            <span className="btn-label-text">Restart</span>
            <kbd className="toxic-kbd">R</kbd>
          </button>

          {/* Fullscreen */}
          <button
            className="toxic-nav-btn icon-only"
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
          >
            <span>⛶</span>
          </button>
        </div>
      </header>

      {/* Main HUD Overlay */}
      <div className="toxic-hud-overlay">
        {/* Left Card: Survivors Tracker & Roster */}
        <div className="toxic-hud-card survivors-card">
          <div className="toxic-card-header">
            <span className="toxic-badge-hazard">LAST STANDING</span>
            <span className="survivors-count-num">
              {engineState.survivorsCount} <span className="survivors-total">/ 8</span>
            </span>
          </div>
          <div className="survivors-status-text">
            {engineState.survivorsCount === 1
              ? '👑 FINAL CHAMPION!'
              : engineState.survivorsCount === 2
              ? '⚡ FINAL 2 HEAD-TO-HEAD!'
              : `${engineState.survivorsCount} Players On Podiums`}
          </div>
          <div className="survivor-pills-row">
            {[...Array(8)].map((_, i) => {
              const isAlive = i < engineState.survivorsCount;
              return (
                <span
                  key={i}
                  className={`survivor-pip ${isAlive ? 'alive' : 'out'}`}
                  title={`Player ${i + 1}`}
                >
                  {i === 0 ? 'P1' : `P${i + 1}`}
                </span>
              );
            })}
          </div>
        </div>

        {/* Center: Sweeper Speed & Motor Dial */}
        <div className="toxic-hud-card sweeper-status-card">
          <div className="sweeper-rpm-display">
            <span className="sweeper-rpm-val">{engineState.currentRpm}</span>
            <span className="sweeper-rpm-unit">RPM</span>
          </div>
          <div className={`sweeper-level-pill level-${engineState.speedLevel.toLowerCase().replace(/[^a-z]/g, '')}`}>
            {engineState.speedLevel}
          </div>
          <div className="sweeper-dir-indicator">
            {engineState.direction === 1 ? '🔄 Clockwise' : '🔁 Counter-Clockwise'}
          </div>
        </div>

        {/* Right Card: Timer & Score */}
        <div className="toxic-hud-card score-card">
          <div className="score-time-row">
            <span className="stat-label">TIME</span>
            <span className="stat-val-mono">{formatTime(engineState.roundTime)}</span>
          </div>
          <div className="score-points-row">
            <span className="stat-label">SCORE</span>
            <span className="stat-val-highlight">{engineState.score.toLocaleString()}</span>
          </div>
          <div className="cleared-stats-mini">
            <span>🦘 Jumps: <strong>{engineState.clearedJumps}</strong></span>
            <span>🦆 Ducks: <strong>{engineState.clearedDucks}</strong></span>
          </div>
        </div>
      </div>

      {/* Operator Control Console Drawer (Matches Galaxy Multi Rides Yellow Pedestal) */}
      {isConsoleOpen && (
        <div className="toxic-operator-console-drawer">
          <div className="console-drawer-header">
            <div className="console-title">
              <span className="console-led-live" />
              <span>GALAXY MULTI RIDES OPERATOR CONSOLE</span>
            </div>
            <button className="console-close-btn" onClick={() => setIsConsoleOpen(false)}>
              ✕
            </button>
          </div>

          <div className="console-controls-grid">
            {/* Speed Lever Slider */}
            <div className="console-control-box">
              <label className="console-label">
                MOTOR SPEED: <strong>{Math.round(operatorSpeedRatio * 100)}%</strong>
              </label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={operatorSpeedRatio}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setOperatorSpeedRatio(val);
                  engineRef.current?.setOperatorSpeed(val);
                }}
                className="console-slider"
              />
            </div>

            {/* Direction Reverse Switch */}
            <div className="console-control-box">
              <button
                type="button"
                className="console-btn btn-reverse"
                onClick={() => engineRef.current?.reverseDirection()}
              >
                <span>🔄 REVERSE ROTATION</span>
              </button>
            </div>

            {/* Turbo Surge Burst Button */}
            <div className="console-control-box">
              <button
                type="button"
                className="console-btn btn-surge"
                onClick={() => engineRef.current?.triggerSpeedBurst()}
              >
                <span>⚡ SPEED BURST SURGE</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Alert / Toast Notification */}
      {toastMessage && (
        <div className="toxic-alert-toast">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Instructions Overlay Bar (Desktop Guidance) */}
      <div className="toxic-desktop-guide">
        <span className="guide-item">
          <kbd className="toxic-kbd">SPACE</kbd> / <kbd className="toxic-kbd">↑</kbd> JUMP (Low Arm)
        </span>
        <span className="guide-divider">•</span>
        <span className="guide-item">
          <kbd className="toxic-kbd">↓</kbd> / <kbd className="toxic-kbd">S</kbd> DUCK (High Arm)
        </span>
        <span className="guide-divider">•</span>
        <span className="guide-item">
          <kbd className="toxic-kbd">C</kbd> Camera
        </span>
      </div>

      {/* Mobile Touch Action Pedals (Ergonomic Thumb Targets) */}
      <div className="toxic-mobile-action-bar">
        {/* Left Thumb: DUCK Button */}
        <button
          type="button"
          className={`toxic-pedal-btn duck-btn ${isDuckPressed ? 'pressed' : ''}`}
          onPointerDown={handleDuckStart}
          onPointerUp={handleDuckEnd}
          onPointerCancel={handleDuckEnd}
          aria-label="Duck underneath high arm"
        >
          <div className="pedal-icon">🦆</div>
          <div className="pedal-title">DUCK ⬇️</div>
          <div className="pedal-sub">High Arm</div>
        </button>

        {/* Right Thumb: JUMP Button */}
        <button
          type="button"
          className={`toxic-pedal-btn jump-btn ${isJumpPressed ? 'pressed' : ''}`}
          onPointerDown={handleJumpStart}
          onPointerUp={handleJumpEnd}
          onPointerCancel={handleJumpEnd}
          aria-label="Jump over low arm"
        >
          <div className="pedal-icon">🦘</div>
          <div className="pedal-title">JUMP ⬆️</div>
          <div className="pedal-sub">Low Arm</div>
        </button>
      </div>

      {/* Round End / Elimination Modal */}
      {engineState.isRoundOver && (
        <div className="toxic-modal-backdrop">
          <div className="toxic-modal-card">
            <div className="modal-hazard-stripe-top" />
            
            {engineState.playerRank === 1 ? (
              <div className="modal-content victory">
                <div className="modal-icon">🏆</div>
                <h2 className="modal-title">LAST PERSON STANDING!</h2>
                <p className="modal-desc">
                  Incredible reflexes! You conquered the Toxic Meltdown sweeper arms and outlasted all 7 competitors!
                </p>
                <div className="modal-stats-pill">
                  <span>Survived: <strong>{formatTime(engineState.roundTime)}</strong></span>
                  <span>Score: <strong>{engineState.score.toLocaleString()}</strong></span>
                </div>
              </div>
            ) : (
              <div className="modal-content eliminated">
                <div className="modal-icon">💥</div>
                <h2 className="modal-title">KNOCKED OFF PODIUM!</h2>
                <p className="modal-desc">
                  {engineState.winnerName
                    ? `Winner: ${engineState.winnerName}! You finished in Rank #${engineState.playerRank || 8}.`
                    : 'The sweeper boom caught you! Ready for redemption?'}
                </p>
                <div className="modal-stats-pill">
                  <span>Survived: <strong>{formatTime(engineState.roundTime)}</strong></span>
                  <span>Score: <strong>{engineState.score.toLocaleString()}</strong></span>
                </div>
              </div>
            )}

            <div className="modal-actions-row">
              <button
                type="button"
                className="modal-btn btn-replay"
                onClick={() => engineRef.current?.restartGame()}
              >
                <span>🔄 Play Again</span>
              </button>

              {onSwitchToRacing && (
                <button
                  type="button"
                  className="modal-btn btn-switch"
                  onClick={onSwitchToRacing}
                >
                  <span>🏎️ Race in RevSector 3D</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
