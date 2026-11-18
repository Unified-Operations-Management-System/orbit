import { Rect, Vec2 } from "./camera";

export class World {
  constructor(
    readonly cols: number,
    readonly rows: number,
    readonly tileSize = 32,
  ) {
    if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols <= 0 || rows <= 0)
      throw new Error(`World: cols/rows must be positive integers, got ${cols}x${rows}`);
    if (!Number.isFinite(tileSize) || tileSize <= 0)
      throw new Error(`World: tileSize must be a positive finite number, got ${tileSize}`);
  }

  get bounds(): Rect {
    return {
      x: 0,
      y: 0,
      w: this.cols * this.tileSize,
      h: this.rows * this.tileSize,
    };
  }

  tileAt(p: Vec2): Vec2 | null {
    const col = Math.floor(p.x / this.tileSize);
    const row = Math.floor(p.y / this.tileSize);
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows)
      return null;

    return { x: col, y: row };
  }

  tileRange(rect: Rect): { c0: number; r0: number; c1: number; r1: number } {
    const t = this.tileSize;
    return {
      c0: Math.max(0, Math.floor(rect.x / t)),
      r0: Math.max(0, Math.floor(rect.y / t)),
      c1: Math.min(this.cols - 1, Math.floor((rect.x + rect.w) / t)),
      r1: Math.min(this.rows - 1, Math.floor((rect.y + rect.h) / t)),
    };
  }
}
