import { useEffect, useRef, useState } from "react";
import { initRacingGame, type GameInstance } from "../game/pixi-racing/initGame";
import { CAMERA_MODES } from "../game/pixi-racing/Camera";
import { type PeerRacerInfo } from "../game/pixi-racing/MultiplayerMesh";
import { ConsolePanel } from "./ConsolePanel";
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

  // Mesh & Driver Profile State
  const [driverName, setDriverName] = useState(() => {
    return localStorage.getItem("skr3d_driver_name") || "Kaushal";
  });
  const [roomCode, setRoomCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get("room") || "WIFI-MESH").toUpperCase();
  });
  const [selectedColor, setSelectedColor] = useState("vehicle-truck-yellow");
  const [cameraMode, setCameraMode] = useState("chase");
  const [camToast, setCamToast] = useState<string | null>(null);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [peersList, setPeersList] = useState<PeerRacerInfo[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      (updatedPeers) => {
        if (isDisposed) return;
        setPeersList(updatedPeers);
      },
      driverName,
      selectedColor,
      roomCode
    )
      .then((instance) => {
        if (isDisposed) {
          instance.destroy();
          return;
        }
        gameRef.current = instance;
        setIsLoading(false);
        setPeersList(instance.getPeersList());
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

  const handleDriverNameChange = (name: string) => {
    setDriverName(name);
    localStorage.setItem("skr3d_driver_name", name);
    gameRef.current?.setDriverName(name);
  };

  const handleRoomCodeChange = (newRoom: string) => {
    setRoomCode(newRoom);
    gameRef.current?.setRoomCode(newRoom);
    const url = new URL(window.location.href);
    url.searchParams.set("room", newRoom);
    window.history.replaceState({}, "", url.toString());
  };

  const handleColorChange = (key: string) => {
    setSelectedColor(key);
    gameRef.current?.setVehicleColor(key);
  };

  const handleReset = () => {
    gameRef.current?.resetPosition();
  };

  const handleCameraChange = (newMode: string) => {
    setCameraMode(newMode);
    gameRef.current?.setCameraMode(newMode);
    const info = CAMERA_MODES.find((m) => m.key === newMode);
    setCamToast(info ? `${info.label} (${info.desc})` : newMode);
    setTimeout(() => {
      setCamToast((cur) => (cur?.includes(info?.label || "") ? null : cur));
    }, 1800);
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (gameRef.current) {
      if (nextMuted) {
        gameRef.current.audio.destroy();
      } else {
        gameRef.current.audio.unlock();
      }
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "KeyC") {
        if (!gameRef.current) return;
        const nextMode = gameRef.current.cycleCameraMode();
        setCameraMode(nextMode);
        const info = CAMERA_MODES.find((m) => m.key === nextMode);
        setCamToast(info ? `${info.label} (${info.desc})` : nextMode);
        setTimeout(() => {
          setCamToast((cur) => (cur?.includes(info?.label || "") ? null : cur));
        }, 1800);
      } else if (e.code === "KeyR") {
        handleReset();
      } else if (e.code === "KeyM" || e.code === "Escape") {
        setIsConsoleOpen((prev) => !prev);
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

  return (
    <div className="racing-root">
      {/* PixiJS WebGPU/WebGL Canvas */}
      <canvas ref={canvasRef} className="racing-canvas" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="racing-loading-overlay">
          <div className="racing-loading-card">
            <div className="racing-spinner"></div>
            <h2 className="racing-loading-title">KENNEY STARTER KIT RACING 3D</h2>
            <p className="racing-loading-subtitle">Same-Wi-Fi Mesh Multiplayer • PixiJS 3D</p>
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

      {/* Modern Control Console HUD & Drawer */}
      {!isLoading && (
        <ConsolePanel
          isOpen={isConsoleOpen}
          onToggle={() => setIsConsoleOpen((prev) => !prev)}
          driverName={driverName}
          onDriverNameChange={handleDriverNameChange}
          roomCode={roomCode}
          onRoomCodeChange={handleRoomCodeChange}
          selectedColor={selectedColor}
          onColorChange={handleColorChange}
          vehicleOptions={VEHICLE_OPTIONS}
          cameraMode={cameraMode}
          onCameraChange={handleCameraChange}
          peers={peersList}
          onRespawn={handleReset}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onToggleFullscreen={toggleFullscreen}
        />
      )}

      {/* Bottom Hint Pill */}
      {!isLoading && !isConsoleOpen && (
        <div className="racing-hint-bar">
          <span>WASD to Drive • <kbd className="racing-kbd-inline">C</kbd> Camera • <kbd className="racing-kbd-inline">R</kbd> Respawn • <kbd className="racing-kbd-inline">M</kbd> Console Panel</span>
        </div>
      )}
    </div>
  );
}
