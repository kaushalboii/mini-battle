import React, { useState } from "react";
import type { PeerRacerInfo } from "../game/pixi-racing/MultiplayerMesh";
import { CAMERA_MODES } from "../game/pixi-racing/Camera";

interface VehicleOption {
  key: string;
  label: string;
  color: string;
}

interface ConsolePanelProps {
  isOpen: boolean;
  onToggle: () => void;
  driverName: string;
  onDriverNameChange: (name: string) => void;
  roomCode: string;
  onRoomCodeChange: (room: string) => void;
  selectedColor: string;
  onColorChange: (key: string) => void;
  vehicleOptions: VehicleOption[];
  cameraMode: string;
  onCameraChange: (key: string) => void;
  peers: PeerRacerInfo[];
  onRespawn: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
}

function formatLapTime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds <= 0) return "--:--.--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds - mins * 60;
  return `${mins}:${secs.toFixed(2).padStart(5, "0")}`;
}

export const ConsolePanel: React.FC<ConsolePanelProps> = ({
  isOpen,
  onToggle,
  driverName,
  onDriverNameChange,
  roomCode,
  onRoomCodeChange,
  selectedColor,
  onColorChange,
  vehicleOptions,
  cameraMode,
  onCameraChange,
  peers,
  onRespawn,
  isMuted,
  onToggleMute,
  onToggleFullscreen,
}) => {
  const [tempRoom, setTempRoom] = useState(roomCode);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("room", roomCode);
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2200);
    });
  };

  const handleRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempRoom.trim()) {
      onRoomCodeChange(tempRoom.trim().toUpperCase());
    }
  };

  const currentCam = CAMERA_MODES.find((m) => m.key === cameraMode) || CAMERA_MODES[0];
  const totalRacers = Math.max(1, peers.length);

  return (
    <>
      {/* 1. TOP STATUS & CONSOLE HUD BAR */}
      <header className="racing-console-bar" role="banner">
        {/* Left: Branding & Driver Tag */}
        <div className="console-bar-left">
          <div className="console-brand">
            <span className="console-brand-icon">🏎️</span>
            <div className="console-brand-titles">
              <span className="console-brand-name">Starter Kit Racing 3D</span>
              <span className="console-brand-sub">Same-Wi-Fi Mesh Multiplayer</span>
            </div>
          </div>
          <div className="console-driver-badge" title="Driver Name">
            <span className="driver-avatar-dot" style={{ backgroundColor: vehicleOptions.find(v => v.key === selectedColor)?.color || "#facc15" }} />
            <span className="driver-name-text">{driverName}</span>
          </div>
        </div>

        {/* Center: Live Wi-Fi Mesh Status Pill */}
        <div className="console-bar-center">
          <div className="mesh-status-pill" onClick={onToggle} title="Click to open Wi-Fi Mesh Console">
            <span className="mesh-radar-dot" />
            <span className="mesh-status-label">SAME-WI-FI MESH: ACTIVE</span>
            <span className="mesh-pill-divider">•</span>
            <span className="mesh-peers-count">
              👥 {totalRacers} {totalRacers === 1 ? "RACER" : "RACERS"}
            </span>
            <span className="mesh-pill-divider">•</span>
            <span className="mesh-room-tag">📡 {roomCode}</span>
          </div>
        </div>

        {/* Right: Quick Console Action Buttons */}
        <div className="console-bar-right">
          {/* Quick Palette */}
          <div className="console-quick-palette">
            {vehicleOptions.map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={`console-color-dot ${selectedColor === opt.key ? "active" : ""}`}
                style={{ backgroundColor: opt.color }}
                title={`Switch to ${opt.label}`}
                onClick={() => onColorChange(opt.key)}
                aria-label={opt.label}
              />
            ))}
          </div>

          {/* Camera Button */}
          <button
            type="button"
            className="console-hud-btn console-cam-btn"
            onClick={() => {
              const keys = CAMERA_MODES.map((m) => m.key);
              const idx = (keys.indexOf(cameraMode) + 1) % keys.length;
              onCameraChange(keys[idx]);
            }}
            title="Cycle Camera View (Press C)"
          >
            <span>📷 {currentCam.label}</span>
            <kbd className="console-kbd">C</kbd>
          </button>

          {/* Respawn Button */}
          <button
            type="button"
            className="console-hud-btn console-respawn-btn"
            onClick={onRespawn}
            title="Respawn Truck at Starting Grid (Press R)"
          >
            <span>↺ Respawn</span>
            <kbd className="console-kbd">R</kbd>
          </button>

          {/* Audio Toggle */}
          <button
            type="button"
            className="console-hud-btn console-icon-only-btn"
            onClick={onToggleMute}
            title={isMuted ? "Unmute Engine Audio" : "Mute Audio"}
            aria-label="Toggle Audio"
          >
            {isMuted ? "🔇" : "🔊"}
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            className="console-hud-btn console-icon-only-btn"
            onClick={onToggleFullscreen}
            title="Toggle Fullscreen"
            aria-label="Toggle Fullscreen"
          >
            ⛶
          </button>

          {/* Open Main Console Drawer Button */}
          <button
            type="button"
            className={`console-hud-btn console-drawer-toggle ${isOpen ? "active" : ""}`}
            onClick={onToggle}
            title="Open Control Console (M)"
            aria-expanded={isOpen}
          >
            <span>⚙️ Console</span>
            <span className="console-toggle-arrow">{isOpen ? "▲" : "▼"}</span>
          </button>
        </div>
      </header>

      {/* 2. EXPANDABLE GLASSMORPHIC CONTROL CONSOLE MODAL */}
      {isOpen && (
        <div className="console-modal-backdrop" onClick={onToggle}>
          <div
            className="console-modal-window"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Control Console"
          >
            {/* Modal Header */}
            <div className="console-window-header">
              <div className="console-window-title-group">
                <span className="console-window-icon">🕹️</span>
                <div>
                  <h2 className="console-window-title">RACING CONTROL CONSOLE</h2>
                  <p className="console-window-subtitle">
                    Zero-Config Same-Wi-Fi Mesh Multiplayer • WebRTC Peer-to-Peer
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="console-close-btn"
                onClick={onToggle}
                aria-label="Close Console"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="console-window-body">
              {/* Card 1: Same-Wi-Fi Mesh Lobby */}
              <section className="console-card">
                <div className="console-card-header">
                  <div className="card-header-title">
                    <span className="card-badge-dot" />
                    <h3>Same-Wi-Fi Mesh Lobby</h3>
                  </div>
                  <span className="mesh-indicator-badge">
                    🟢 {peers.length > 1 ? `${peers.length} Racers Live` : "Active • Waiting for peers"}
                  </span>
                </div>
                <div className="console-card-content">
                  <p className="console-desc">
                    Connect any phone, tablet, or laptop on your <strong>same Wi-Fi network</strong>. All devices using this room code will automatically spawn on the circuit together!
                  </p>

                  <form className="console-room-form" onSubmit={handleRoomSubmit}>
                    <div className="console-input-group">
                      <label htmlFor="room-input">Wi-Fi Room Code</label>
                      <input
                        id="room-input"
                        type="text"
                        value={tempRoom}
                        onChange={(e) => setTempRoom(e.target.value.toUpperCase())}
                        maxLength={16}
                        placeholder="e.g. WIFI-MESH"
                        className="console-text-input uppercase"
                      />
                    </div>
                    <button type="submit" className="console-btn-primary">
                      Switch Room
                    </button>
                    <button
                      type="button"
                      className="console-btn-secondary"
                      onClick={handleCopyLink}
                    >
                      {copySuccess ? "✓ Copied Link!" : "📋 Copy Wi-Fi Race Link"}
                    </button>
                  </form>
                </div>
              </section>

              {/* Card 2: Driver Identity & Truck Livery */}
              <section className="console-card">
                <div className="console-card-header">
                  <div className="card-header-title">
                    <span className="card-badge-dot" />
                    <h3>Driver Profile & Truck Livery</h3>
                  </div>
                </div>
                <div className="console-card-content">
                  <div className="console-input-group" style={{ marginBottom: "16px" }}>
                    <label htmlFor="driver-input">Driver Name (Synced to Mesh)</label>
                    <input
                      id="driver-input"
                      type="text"
                      value={driverName}
                      onChange={(e) => onDriverNameChange(e.target.value)}
                      maxLength={18}
                      placeholder="Your Driver Name"
                      className="console-text-input"
                    />
                  </div>

                  <label className="console-label-block">Choose Your Truck Color</label>
                  <div className="console-truck-grid">
                    {vehicleOptions.map((opt) => {
                      const isSelected = selectedColor === opt.key;
                      return (
                        <div
                          key={opt.key}
                          className={`console-truck-card ${isSelected ? "selected" : ""}`}
                          onClick={() => onColorChange(opt.key)}
                        >
                          <div className="truck-card-color-chip" style={{ backgroundColor: opt.color }} />
                          <div className="truck-card-details">
                            <span className="truck-card-name">{opt.label}</span>
                            <span className="truck-card-status">
                              {isSelected ? "✓ Selected Truck" : "Click to Drive"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* Card 3: Live Mesh Racers Leaderboard */}
              <section className="console-card">
                <div className="console-card-header">
                  <div className="card-header-title">
                    <span className="card-badge-dot" />
                    <h3>Live Session Leaderboard ({totalRacers})</h3>
                  </div>
                  <span className="console-live-badge">REAL-TIME</span>
                </div>
                <div className="console-card-content">
                  <div className="console-table-wrapper">
                    <table className="console-grid-table">
                      <thead>
                        <tr>
                          <th>POS</th>
                          <th>RACER</th>
                          <th>TRUCK</th>
                          <th>LAP</th>
                          <th>BEST LAP</th>
                          <th>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {peers.map((peer, idx) => (
                          <tr key={peer.id} className={peer.isLocal ? "row-local-player" : ""}>
                            <td className="cell-pos">P{idx + 1}</td>
                            <td className="cell-driver">
                              <span className="driver-color-dot" style={{ backgroundColor: peer.colorHex }} />
                              <span className="driver-name-text">
                                {peer.name} {peer.isLocal && <span className="you-pill">YOU</span>}
                              </span>
                            </td>
                            <td className="cell-truck">{peer.colorKey.replace("vehicle-truck-", "").toUpperCase()}</td>
                            <td className="cell-lap">L{peer.lap}</td>
                            <td className="cell-time">{formatLapTime(peer.bestTime)}</td>
                            <td className="cell-status">
                              {peer.isLocal ? (
                                <span className="status-badge local">🟢 Local</span>
                              ) : (
                                <span className="status-badge remote">⚡ {peer.ping}ms</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              {/* Card 4: Camera Angles & Driving Assist */}
              <section className="console-card">
                <div className="console-card-header">
                  <div className="card-header-title">
                    <span className="card-badge-dot" />
                    <h3>Camera Angles & Controls</h3>
                  </div>
                </div>
                <div className="console-card-content">
                  <label className="console-label-block">Camera Modes</label>
                  <div className="console-cam-grid">
                    {CAMERA_MODES.map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        className={`console-cam-pill ${cameraMode === m.key ? "active" : ""}`}
                        onClick={() => onCameraChange(m.key)}
                      >
                        <span className="cam-pill-label">{m.label}</span>
                        <span className="cam-pill-desc">{m.desc}</span>
                      </button>
                    ))}
                  </div>

                  <div className="console-controls-guide">
                    <div className="guide-item">
                      <kbd>W</kbd> / <kbd>↑</kbd> <span>Drive</span>
                    </div>
                    <div className="guide-item">
                      <kbd>S</kbd> / <kbd>↓</kbd> <span>Reverse / Brake</span>
                    </div>
                    <div className="guide-item">
                      <kbd>A</kbd> / <kbd>D</kbd> <span>Steer / Drift</span>
                    </div>
                    <div className="guide-item">
                      <kbd>C</kbd> <span>Cycle Camera</span>
                    </div>
                    <div className="guide-item">
                      <kbd>R</kbd> <span>Reset Position</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Modal Footer */}
            <div className="console-window-footer">
              <span className="console-footer-note">
                💡 Tip: On mobile devices, use the touch joystick anywhere on screen.
              </span>
              <button type="button" className="console-btn-primary" onClick={onToggle}>
                Resume Race
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
