/**
 * Apex Drift 3D - Multi-Input Controller
 * Coordinates keyboard (WASD/Arrows/Shift/Space), HTML5 Gamepad API, and high-performance Touch Controls.
 */

import { clamp } from './MathUtils';

export class Controls {
  _keys = Object.create(null);
  _joystick = null;
  _nitroExternal = false;
  _steerExternal = 0;
  _throttleExternal = 0;

  constructor(joystick = null) {
    this._joystick = joystick;

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  setSteer(val) {
    this._steerExternal = clamp(val, -1, 1);
  }

  setThrottle(val) {
    this._throttleExternal = clamp(val, -1, 1);
  }

  setNitro(active) {
    this._nitroExternal = Boolean(active);
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
  }

  update() {
    let x = this._steerExternal;
    let z = this._throttleExternal;

    if (this._keys.KeyA || this._keys.ArrowLeft) x -= 1;
    if (this._keys.KeyD || this._keys.ArrowRight) x += 1;
    if (this._keys.KeyW || this._keys.ArrowUp) z += 1;
    if (this._keys.KeyS || this._keys.ArrowDown) z -= 1;

    x = clamp(x, -1, 1);
    z = clamp(z, -1, 1);

    let nitro =
      Boolean(this._nitroExternal) ||
      Boolean(this._keys.ShiftLeft) ||
      Boolean(this._keys.ShiftRight) ||
      Boolean(this._keys.Space);

    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp) continue;

      const stickX = gp.axes[0];
      if (Math.abs(stickX) > 0.15) x = stickX;

      const rt = gp.buttons[7]?.value ?? 0;
      const lt = gp.buttons[6]?.value ?? 0;
      if (rt > 0.1 || lt > 0.1) z = rt - lt;

      if (gp.buttons[0]?.pressed || gp.buttons[5]?.pressed) nitro = true;
      break;
    }

    const touchActive = this._steerExternal !== 0 || this._throttleExternal !== 0;

    return { x, z, touchActive, nitro };
  }

  _onKeyDown = (e) => {
    this._keys[e.code] = true;
  };

  _onKeyUp = (e) => {
    this._keys[e.code] = false;
  };
}
