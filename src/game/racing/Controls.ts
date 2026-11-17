export interface InputState {
  x: number; // Steering: -1 (left) to 1 (right)
  z: number; // Throttle: -1 (reverse) to 1 (forward)
  drift: boolean; // Handbrake
  touchActive: boolean;
}

export class Controls {
  private _keys: Record<string, boolean> = Object.create(null);
  public touchX = 0;
  public touchZ = 0;
  public touchActive = false;
  public touchDrift = false;

  constructor() {
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
  }

  destroy() {
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
  }

  update(): InputState {
    let x = 0;
    let z = 0;
    let drift = false;

    if (this._keys.KeyA || this._keys.ArrowLeft) x -= 1;
    if (this._keys.KeyD || this._keys.ArrowRight) x += 1;
    if (this._keys.KeyW || this._keys.ArrowUp) z += 1;
    if (this._keys.KeyS || this._keys.ArrowDown) z -= 1;
    if (this._keys.Space || this._keys.ShiftLeft) drift = true;

    // Gamepad support
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp) continue;

      const stickX = gp.axes[0];
      if (Math.abs(stickX) > 0.15) x = stickX;

      const rt = gp.buttons[7]?.value ?? 0;
      const lt = gp.buttons[6]?.value ?? 0;
      if (rt > 0.1 || lt > 0.1) z = rt - lt;

      if (gp.buttons[0]?.pressed || gp.buttons[2]?.pressed) drift = true;
      break;
    }

    // Touch support
    if (this.touchActive) {
      x = this.touchX;
      z = this.touchZ;
      if (this.touchDrift) drift = true;
    }

    return { x, z, drift, touchActive: this.touchActive };
  }

  private _onKeyDown = (e: KeyboardEvent) => {
    this._keys[e.code] = true;
  };

  private _onKeyUp = (e: KeyboardEvent) => {
    this._keys[e.code] = false;
  };
}
