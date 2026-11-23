/**
 * Toxic Meltdown® 3D - Interactive React Component
 * 8-player inflatable sweeper battle game.
 * Jump over the low arm, duck under the high arm, survive escalating motor speeds!
 * Features live lobby start, 3-2-1 countdown, dynamic HUD prompts, tactile mobile pedals,
 * attendant console controls, and multi-cam views.
 * Engineered by Kaushal.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ToxicMeltdownEngine, type MeltdownEngineState } from '../game/toxic-meltdown/ToxicMeltdownEngine';
import { ToxicMeltdownAudio } from '../game/toxic-meltdown/ToxicMeltdownAudio';
import '../styles/toxic-meltdown.css';

interface ToxicMeltdownProps {
  onSwitchToRacing?: () => void;
  onReturnToMenu?: () => void;
}

export default function ToxicMeltdown({ onSwitchToRacing, onReturnToMenu }: ToxicMeltdownProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ToxicMeltdownEngine | null>(null);
  const audioRef = useRef<ToxicMeltdownAudio>(new ToxicMeltdownAudio());

  // Game UI State
  const [engineState, setEngineState] = useState<MeltdownEngineState>({
    phase: 'lobby',
    countdown: 3,
    activePrompt: null,
    reactionFeedback: null,
    playerLives: 3,
    isInvulnerable: false,
    survivorsCount: 8,
    totalPlayers: 8,
    roundTime: 0,
    currentRpm: 0,
    speedLevel: 'STANDBY',
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
    // Engine starts in 'lobby' mode with arms stationary.
    // User starts the live round by pressing "START ROUND" or Space/Enter.

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (e.code === 'KeyR') {
        e.preventDefault();
        engineRef.current?.restartGame();
        return;
      }
      if (e.code === 'KeyC') {
        e.preventDefault();
        const nextMode = engineRef.current?.cycleCameraMode();
        if (nextMode) setCameraMode(nextMode as any);
        return;
      }
      if (e.code === 'KeyM') {
        setIsMuted((prev) => {
          const next = !prev;
          audioRef.current.setMuted(next);
          return next;
        });
        return;
      }

      // Lobby Start Key
      if (engineState.phase === 'lobby') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          engineRef.current?.startLiveRound();
          return;
        }
      }

      // Gameplay Action Keys
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        setIsJumpPressed(true);
        engineRef.current?.triggerJump(0);
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        setIsDuckPressed(true);
        engineRef.current?.setDucking(true, 0);
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
  }, [engineState.phase]);

  const handleJumpStart = () => {
    if (engineState.phase === 'lobby') {
      engineRef.current?.startLiveRound();
      return;
    }
    setIsJumpPressed(true);
    engineRef.current?.triggerJump(0);
  };

  const handleJumpEnd = () => {
    setIsJumpPressed(false);
  };

  const handleDuckStart = () => {
    if (engineState.phase === 'lobby') {
      engineRef.current?.startLiveRound();
      return;
    }
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
          {/* Return to Arcade Menu Portal */}
          {onReturnToMenu && (
            <button
              className="toxic-nav-btn return-menu-btn"
              onClick={onReturnToMenu}
              title="Return to Master Arcade Menu"
            >
              <span>🏠</span>
              <span className="btn-label-text">Game Menu</span>
            </button>
          )}

          {/* Switch to Car Racing Portal Button */}
          {onSwitchToRacing && (
            <button
              className="toxic-nav-btn switch-game-btn"
              onClick={onSwitchToRacing}
              title="Switch to RevSector 3D Car Racing"
            >
              <span>🏎️</span>
              <span className="btn-label-text">Car Racing</span>
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
            <span className="btn-label-text">Operator</span>
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
            {engineState.phase === 'lobby'
              ? '8 Players Ready On Podiums'
              : engineState.survivorsCount === 1
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
          <div className="player-lives-bar" title="Remaining Lives">
            {[1, 2, 3].map((h) => (
              <span key={h} className="live-heart-icon">
                {h <= engineState.playerLives ? '❤️' : '🤍'}
              </span>
            ))}
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

      {/* Non-blocking Spectator Banner when Player 1 is eliminated */}
      {engineState.isPlayerEliminated && !engineState.isRoundOver && (
        <div className="toxic-spectator-banner">
          <div className="spectator-inner">
            <span className="spectator-icon">💥</span>
            <span className="spectator-msg">
              Knocked off your podium! Spectating remaining survivors...
            </span>
            <button
              type="button"
              className="btn-spectator-retry"
              onClick={() => engineRef.current?.startLiveRound()}
            >
              🔄 Quick Retry
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Action Prompt Banner during Live Gameplay */}
      {engineState.phase === 'playing' && engineState.activePrompt && (
        <div className={`toxic-live-prompt-banner prompt-${engineState.activePrompt}`}>
          {engineState.activePrompt === 'jump' ? (
            <div className="prompt-inner">
              <span className="prompt-icon">🦘</span>
              <span className="prompt-text">JUMP OVER LOW ARM!</span>
              <span className="prompt-keys">SPACE / ↑</span>
            </div>
          ) : (
            <div className="prompt-inner">
              <span className="prompt-icon">🦆</span>
              <span className="prompt-text">DUCK UNDER HIGH ARM!</span>
              <span className="prompt-keys">S / ↓</span>
            </div>
          )}
        </div>
      )}

      {/* Reaction Feedback Toast */}
      {engineState.reactionFeedback && (
        <div className="toxic-feedback-toast">
          <span>{engineState.reactionFeedback}</span>
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

      {/* LOBBY / READY PRE-ROUND OVERLAY */}
      {engineState.phase === 'lobby' && (
        <div className="toxic-lobby-backdrop">
          <div className="toxic-lobby-card">
            <div className="lobby-hazard-bar" />
            <div className="lobby-brand-row">
              <span className="lobby-badge-official">GALAXY MULTI RIDES® OFFICIAL</span>
              <span className="lobby-badge-live">LIVE ARENA 3D</span>
            </div>
            <h1 className="lobby-title">
              TOXIC MELTDOWN<span className="toxic-reg">®</span>
            </h1>
            <p className="lobby-subtitle">
              8-Player Inflatable Sweeper • Last Standing Survivor Challenge
            </p>

            <div className="lobby-rules-grid">
              <div className="rule-box rule-low">
                <div className="rule-icon-circle low">🦘</div>
                <div className="rule-text-content">
                  <div className="rule-heading">LOW BOOM ARM (0.38m)</div>
                  <div className="rule-action">JUMP OVER!</div>
                  <div className="rule-keys">
                    <kbd className="toxic-kbd">SPACE</kbd> or <kbd className="toxic-kbd">↑</kbd> or <span className="touch-tag">Green Pedal</span>
                  </div>
                </div>
              </div>

              <div className="rule-box rule-high">
                <div className="rule-icon-circle high">🦆</div>
                <div className="rule-text-content">
                  <div className="rule-heading">HIGH BOOM ARM (1.35m)</div>
                  <div className="rule-action">DUCK UNDER!</div>
                  <div className="rule-keys">
                    <kbd className="toxic-kbd">S</kbd> or <kbd className="toxic-kbd">↓</kbd> or <span className="touch-tag">Orange Pedal</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lobby-tip-bar">
              ⚠️ Stay on your podium! Don't let the spinning mechanical foam boom arms knock you onto the inflatable floor!
            </div>

            <div className="lobby-start-actions">
              <button
                type="button"
                className="btn-start-live-round"
                onClick={() => engineRef.current?.startLiveRound()}
              >
                <span className="btn-play-icon">▶</span>
                <span className="btn-text-main">START ROUND (LIVE PLAY)</span>
                <span className="btn-key-hint">Press SPACE or ENTER</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COUNTDOWN OVERLAY */}
      {engineState.phase === 'countdown' && (
        <div className="toxic-countdown-backdrop">
          <div className="toxic-countdown-card">
            <div className="countdown-hazard-icon">☣️</div>
            <div className="countdown-number-pulse">
              {engineState.countdown > 0 ? engineState.countdown : 'GO!'}
            </div>
            <div className="countdown-subtext">
              {engineState.countdown > 0 ? 'GET READY ON YOUR PODIUM!' : 'DUCK & JUMP!'}
            </div>
          </div>
        </div>
      )}

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
                onClick={() => engineRef.current?.startLiveRound()}
              >
                <span>🔄 Play Again</span>
              </button>

              {onReturnToMenu && (
                <button
                  type="button"
                  className="modal-btn btn-menu"
                  onClick={onReturnToMenu}
                >
                  <span>🏠 Game Menu</span>
                </button>
              )}

              {onSwitchToRacing && (
                <button
                  type="button"
                  className="modal-btn btn-switch"
                  onClick={onSwitchToRacing}
                >
                  <span>🏎️ Play Car Racing</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
