import { Camera, Vec2 } from "./camera";
import { CanvasStore } from "./store";

export interface InputCallbacks {
  onCamera(): void;
  onHover(screen: Vec2 | null): void;
  onPrimaryDown?(screen: Vec2, e: PointerEvent): void;
  onFit(): void;
}

const ZOOM_SENSITIVITY = 0.0075;
const MAX_ZOOM_DELTA = 60;
const KEY_ZOOM_STEP = 2;
const LINE_HEIGHT_PX = 16;

const isTypingTarget = (t: EventTarget | null) => {
  return t instanceof HTMLElement && (t.isContentEditable || t.tagName == 'INPUT' || t.tagName == 'TEXTAREA' || t.tagName == 'SELECT');
}

export class InputController {
  private spaceHeld = false;
  private panPointer: number | null = null;
  private last: Vec2 = { x: 0, y: 0 };
  private gestureScale = 1;
  private readonly abort = new AbortController();

  constructor(
    private readonly el: HTMLCanvasElement,
    private readonly camera: Camera,
    private readonly store: CanvasStore,
    private readonly cb: InputCallbacks,
  ) {
    const opts = { signal: this.abort.signal };
    const nonPassive = { signal: this.abort.signal, passive: false };

    el.addEventListener('wheel', this.onWheel, nonPassive);
    el.addEventListener('pointerdown', this.onPointerDown, opts);
    el.addEventListener('pointermove', this.onPointerMove, opts);
    el.addEventListener('pointerup', this.onPointerUp, opts);
    el.addEventListener('pointercancel', this.onPointerUp, opts);
    el.addEventListener('pointerleave', this.onPointerLeave, opts);
    el.addEventListener('contextmenu', (e) => e.preventDefault(), opts);
    el.addEventListener('gesturestart', this.onGestureStart as EventListener, nonPassive);
    el.addEventListener('gesturechange', this.onGestureChange as EventListener, nonPassive);

    window.addEventListener('keydown', this.onKeyDown, opts);
    window.addEventListener('keyup', this.onKeyUp, opts);
    window.addEventListener('blur', this.reset, opts);

    el.style.touchAction = 'none';
    this.syncCursor();
  }

  destroy() {
    this.abort.abort();
  }

  private local(e: { clientX: number; clientY: number }): Vec2 {
    const rect = this.el.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private syncCursor(): void {
    const { tool } = this.store.getState();
    const panning = this.panPointer !== null;
    this.el.style.cursor = panning ? 'grabbing' : this.spaceHeld || tool === 'hand' ? 'grab' : 'default';
  }

  private setPanning(on: boolean): void {
    if (this.store.getState().panning !== on)
      this.store.setState({ panning: on });

    this.syncCursor();
  }

  private reset = (): void => {
    this.spaceHeld = false;
    if (this.panPointer !== null && this.el.hasPointerCapture(this.panPointer))
      this.el.releasePointerCapture(this.panPointer);

    this.panPointer = null;
    this.setPanning(false);
  }

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();

    const unit = e.deltaMode === 1 ? LINE_HEIGHT_PX : e.deltaMode === 2 ? this.camera.viewH : 1;
    let dx = e.deltaX * unit;
    let dy = e.deltaY * unit;

    if (e.ctrlKey || e.metaKey) {
      const d = Math.max(-MAX_ZOOM_DELTA, Math.min(MAX_ZOOM_DELTA, dy));
      const p = this.local(e);
      this.camera.zoomAt(p.x, p.y, Math.exp(-d * ZOOM_SENSITIVITY));
      this.cb.onCamera();
      return;
    }

    if (e.shiftKey && dx === 0)
      [dx, dy] = [dy, 0];

    this.camera.panByScreen(-dx, -dy);
    this.cb.onCamera();
  }

  private onGestureStart = (e: Event): void => {
    e.preventDefault();
    this.gestureScale = 1;
  }

  private onGestureChange = (e: Event & { scale?: number; clientX?: number; clientY?: number }): void => {
    e.preventDefault();
    const scale = e.scale ?? 1;
    const p = this.local({ clientX: e.clientX ?? 0, clientY: e.clientY ?? 0 });
    this.camera.zoomAt(p.x, p.y, scale / this.gestureScale);
    this.gestureScale = scale;
    this.cb.onCamera();
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (this.panPointer !== null)
      return;

    this.el.focus({ preventScroll: true });
    const p = this.local(e);
    const { tool } = this.store.getState();
    const wantsPan = e.button === 1 || (e.button === 0 && (this.spaceHeld || tool === "hand"));

    if (wantsPan) {
      e.preventDefault();
      this.panPointer = e.pointerId;
      this.last = p;
      this.el.setPointerCapture(e.pointerId);
      this.setPanning(true);
      return;
    }

    if (e.button === 0)
      this.cb.onPrimaryDown?.(p, e);
  }

  private onPointerMove = (e: PointerEvent): void => {
    const p = this.local(e);
    if (e.pointerId === this.panPointer) {
      this.camera.panByScreen(p.x - this.last.x, p.y - this.last.y);
      this.last = p;
      this.cb.onCamera();
    }

    this.cb.onHover(p);
  }

  private onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.panPointer)
      return;

    if (this.el.hasPointerCapture(e.pointerId))
      this.el.releasePointerCapture(e.pointerId);

    this.panPointer = null;
    this.setPanning(false);
  }

  private onPointerLeave = (): void => {
    if (this.panPointer === null)
      this.cb.onHover(null);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (isTypingTarget(e.target) || document.activeElement !== this.el)
      return;

    if (e.code === 'Space') {
      e.preventDefault();
      if (!e.repeat) {
        this.spaceHeld = true;
        this.syncCursor();
      }

      return;
    }

    if (e.repeat)
      return;

    const cx = this.camera.viewW / 2;
    const cy = this.camera.viewH / 2;

    const mod = e.ctrlKey || e.metaKey;
    if (mod && (e.key === '=' || e.key === '+')) {
      e.preventDefault();
      this.camera.zoomAt(cx, cy, KEY_ZOOM_STEP);
      this.cb.onCamera();
    } else if (mod && e.key === '-') {
      e.preventDefault();
      this.camera.zoomAt(cx, cy, 1 / KEY_ZOOM_STEP);
      this.cb.onCamera();
    } else if (e.shiftKey && e.code === 'Digit1') {
      this.cb.onFit();
    } else if (e.shiftKey && e.code === 'Digit0') {
      this.camera.zoomToCentered(1);
      this.cb.onCamera();
    } else if (!mod && e.code === 'KeyH') {
      this.store.getState().setTool('hand');
      this.syncCursor();
    } else if (!mod && e.code === 'KeyV') {
      this.store.getState().setTool('select');
      this.syncCursor();
    }
  }

  private onKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'Space') {
      this.spaceHeld = false;
      this.syncCursor();
    }
  }

  refreshCursor(): void {
    this.syncCursor();
  }
}
