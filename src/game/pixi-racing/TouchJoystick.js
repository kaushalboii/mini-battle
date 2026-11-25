import { Container, Graphics, Text } from 'pixi.js';

const STEER_RANGE = 40;
const KNOB_TRAVEL = 60;

export class TouchJoystick extends Container {
  dirX = 0;
  dirY = 0;
  touchActive = false;

  // Pedals mode direct outputs
  pedalMode = false;
  pedalX = 0;
  pedalZ = 0;
  pedalActive = false;

  _pointerId = null;
  _startX = 0;
  _startY = 0;

  _hitArea;
  _ring;
  _knob;

  _pedalsContainer;
  _pedalPointers = new Map();
  _btnLeft;
  _btnRight;
  _btnBrake;
  _btnGas;
  _width = 800;
  _height = 600;

  constructor(width, height) {
    super();
    this._width = width;
    this._height = height;

    this.eventMode = 'static';

    this._hitArea = new Graphics()
      .rect(0, 0, width, height)
      .fill({ color: 0x000000, alpha: 0.001 });
    this._hitArea.eventMode = 'static';
    this.addChild(this._hitArea);

    this._ring = new Graphics()
      .circle(0, 0, 70)
      .fill({ color: 0xffffff, alpha: 0.08 })
      .circle(0, 0, 70)
      .stroke({ width: 2, color: 0xffffff, alpha: 0.25 });
    this._ring.visible = false;
    this.addChild(this._ring);

    this._knob = new Graphics()
      .circle(0, 0, 30)
      .fill({ color: 0xffffff, alpha: 0.4 });
    this._knob.visible = false;
    this.addChild(this._knob);

    this._hitArea.on('pointerdown', this._onDown);
    this._hitArea.on('pointermove', this._onMove);
    this._hitArea.on('pointerup', this._onUp);
    this._hitArea.on('pointerupoutside', this._onUp);
    this._hitArea.on('pointercancel', this._onUp);

    // Optional Pedals HUD container (only shown on touch screens when pedalMode = true)
    this._pedalsContainer = new Container();
    this._pedalsContainer.visible = false;
    this.addChild(this._pedalsContainer);

    this._btnLeft = this._makePedalButton('◀', 'left', 62, 56);
    this._btnRight = this._makePedalButton('▶', 'right', 62, 56);
    this._btnBrake = this._makePedalButton('BRAKE', 'brake', 64, 52);
    this._btnGas = this._makePedalButton('GAS', 'gas', 72, 82);

    this._pedalsContainer.addChild(
      this._btnLeft,
      this._btnRight,
      this._btnBrake,
      this._btnGas,
    );
    this._layoutPedals();
  }

  _makePedalButton(label, action, w, h) {
    const btn = new Container();
    btn.eventMode = 'static';
    const bg = new Graphics()
      .roundRect(0, 0, w, h, 8)
      .fill({ color: 0x0a0c10, alpha: 0.68 })
      .roundRect(0, 0, w, h, 8)
      .stroke({ width: 1.5, color: 0xffffff, alpha: 0.35 });
    const txt = new Text({
      text: label,
      style: {
        fontFamily: 'system-ui, sans-serif',
        fontSize: label.length > 2 ? 12 : 20,
        fontWeight: '800',
        fill: 0xffffff,
      },
    });
    txt.anchor.set(0.5);
    txt.position.set(w / 2, h / 2);
    btn.addChild(bg, txt);

    const onPress = (e) => {
      e.stopPropagation();
      this._pedalPointers.set(e.pointerId, action);
      btn.alpha = 1;
      btn.scale.set(0.95);
      this._recomputePedals();
    };
    const onRelease = (e) => {
      if (this._pedalPointers.delete(e.pointerId)) {
        btn.alpha = 0.85;
        btn.scale.set(1);
        this._recomputePedals();
      }
    };

    btn.alpha = 0.85;
    btn.on('pointerdown', onPress);
    btn.on('pointerup', onRelease);
    btn.on('pointerupoutside', onRelease);
    btn.on('pointercancel', onRelease);
    return btn;
  }

  _recomputePedals() {
    let x = 0;
    let z = 0;
    for (const act of this._pedalPointers.values()) {
      if (act === 'left') x -= 1;
      if (act === 'right') x += 1;
      if (act === 'gas') z += 1;
      if (act === 'brake') z -= 1;
    }
    this.pedalX = Math.max(-1, Math.min(1, x));
    this.pedalZ = Math.max(-1, Math.min(1, z));
    this.pedalActive = this._pedalPointers.size > 0;
  }

  setMode(mode) {
    const usePedals = mode === 'pedals';
    this.pedalMode = usePedals;
    const isTouchCapable =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    this._pedalsContainer.visible = usePedals && isTouchCapable;
    this._hitArea.eventMode = usePedals ? 'none' : 'static';
    this._ring.visible = false;
    this._knob.visible = false;
    this._pointerId = null;
    this.touchActive = false;
    this._pedalPointers.clear();
    this._recomputePedals();
  }

  _layoutPedals() {
    const pad = 18;
    const h = this._height;
    const w = this._width;
    this._btnLeft.position.set(pad, h - 56 - pad);
    this._btnRight.position.set(pad + 62 + 12, h - 56 - pad);
    this._btnBrake.position.set(w - pad - 72 - 12 - 64, h - 52 - pad);
    this._btnGas.position.set(w - pad - 72, h - 82 - pad);
  }

  resize(width, height) {
    if (this._width === width && this._height === height) return;
    this._width = width;
    this._height = height;
    this._hitArea
      .clear()
      .rect(0, 0, width, height)
      .fill({ color: 0x000000, alpha: 0.001 });
    this._layoutPedals();
  }

  _onDown = (e) => {
    if (this.pedalMode) return;
    if (this._pointerId !== null) return;
    if (e.pointerType !== 'touch') return;

    this._pointerId = e.pointerId;
    this._startX = e.global.x;
    this._startY = e.global.y;
    this.touchActive = true;
    this.dirX = 0;
    this.dirY = 0;

    this._ring.position.set(this._startX, this._startY);
    this._knob.position.set(this._startX, this._startY);
    this._ring.visible = true;
    this._knob.visible = true;
  };

  _onMove = (e) => {
    if (e.pointerId !== this._pointerId) return;

    let dx = (e.global.x - this._startX) / STEER_RANGE;
    let dy = (e.global.y - this._startY) / STEER_RANGE;
    const mag = Math.sqrt(dx * dx + dy * dy);

    if (mag > 1) {
      dx /= mag;
      dy /= mag;
    }

    this.dirX = dx;
    this.dirY = dy;

    this._knob.position.set(
      this._startX + dx * KNOB_TRAVEL,
      this._startY + dy * KNOB_TRAVEL,
    );
  };

  _onUp = (e) => {
    if (e.pointerId !== this._pointerId) return;

    this._pointerId = null;
    this.touchActive = false;
    this.dirX = 0;
    this.dirY = 0;
    this._ring.visible = false;
    this._knob.visible = false;
  };
}
