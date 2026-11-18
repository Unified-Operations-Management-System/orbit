export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CameraLimits {
  minZoom: number;
  maxZoom: number;
  keepVisiblePx: number;
}

const DEFAULT_LIMITS: CameraLimits = {
  minZoom: 0.02, maxZoom: 8, keepVisiblePx: 64,
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export class Camera {
  x = 0;
  y = 0;
  zoom = 1;
  viewW = 0;
  viewH = 0;

  readonly limits: CameraLimits;

  constructor(limits: Partial<CameraLimits> = {}) {
    this.limits = { ...DEFAULT_LIMITS, ...limits };
  }

  setViewport(w: number, h: number): void {
    this.viewW = w;
    this.viewH = h;
  }

  screenToWorld(sx: number, sy: number): Vec2 {
    return {
      x: this.x + sx / this.zoom,
      y: this.y + sy / this.zoom,
    };
  }

  worldToScreen(wx: number, wy: number): Vec2 {
    return {
      x: (wx - this.x) * this.zoom,
      y: (wy - this.y) * this.zoom,
    };
  }

  visibleWorld(): Rect {
    return {
      x: this.x,
      y: this.y,
      w: this.viewW / this.zoom,
      h: this.viewH / this.zoom,
    };
  }

  panByScreen(dx: number, dy: number): void {
    this.x -= dx / this.zoom;
    this.y -= dy / this.zoom;
  }

  zoomAt(sx: number, sy: number, factor: number): void {
    const anchor = this.screenToWorld(sx, sy);
    this.zoom = clamp(this.zoom * factor, this.limits.minZoom, this.limits.maxZoom);
    this.x = anchor.x - (sx / this.zoom);
    this.y = anchor.y - (sy / this.zoom);
  }

  zoomToCentered(zoom: number): void {
    this.zoomAt(this.viewW / 2, this.viewH / 2, zoom / this.zoom);
  }

  centerOn(wx: number, wy: number): void {
    this.x = wx - (this.viewW / 2) / this.zoom;
    this.y = wy - (this.viewH / 2) / this.zoom;
  }

  fit(rect: Rect, paddingPx = 48): void {
    if (this.viewW <= 0 || this.viewH <= 0)
      return;

    const zx = (this.viewW - paddingPx * 2) / rect.w;
    const zy = (this.viewH - paddingPx * 2) / rect.h;
    this.zoom = clamp(Math.min(zx, zy), this.limits.minZoom, this.limits.maxZoom);
    this.centerOn(rect.x + rect.w / 2, rect.y + rect.h / 2);
  }

  clampTo(b: Rect): void {
    const m = this.limits.keepVisiblePx / this.zoom;
    const vw = this.viewW / this.zoom;
    const vh = this.viewH / this.zoom;

    this.x = clamp(this.x, b.x - vw + m, b.x + b.w - m);
    this.y = clamp(this.y, b.y - vh + m, b.y + b.h - m);
  }
}
