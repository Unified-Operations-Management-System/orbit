import { Graphics } from "pixi.js";
import { World } from "./world";
import { Theme } from "./theme";
import { Camera } from "./camera";

const MAJOR_EVERY = 10;
const MINOR_FADE_OUT = 6;
const MINOR_FADE_IN = 14;
const MIN_MAJOR_SPACING = 12;

const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

const snap = (value: number) => Math.round(value) + 0.5;

export class GridLayer {
  readonly view = new Graphics();

  constructor(
    private readonly world: World,
    private readonly theme: Theme,
  ) { }

  draw(cam: Camera): void {
    const g = this.view;
    const { world, theme } = this;
    const t = world.tileSize;
    const step = t * cam.zoom;

    g.clear();

    const b = world.bounds;
    const tl = cam.worldToScreen(b.x, b.y);
    const br = cam.worldToScreen(b.x + b.w, b.y + b.h);
    const left = Math.max(0, tl.x);
    const top = Math.max(0, tl.y);
    const right = Math.min(cam.viewW, br.x);
    const bottom = Math.min(cam.viewH, br.y);

    if (right <= left || bottom <= top)
      return;

    g.rect(left, top, right - left, bottom - top).fill(theme.floor);

    const { c0, c1, r0, r1 } = world.tileRange(cam.visibleWorld());

    const minorAlpha = smoothstep(MINOR_FADE_OUT, MINOR_FADE_IN, step);
    if (minorAlpha > 0) {
      for (let c = c0; c <= c1; c++) {
        if (c % MAJOR_EVERY === 0)
          continue;

        const x = snap(cam.worldToScreen(c * t, 0).x);
        g.moveTo(x, top).lineTo(x, bottom);
      }

      for (let r = r0; r <= r1; r++) {
        if (r % MAJOR_EVERY === 0)
          continue;

        const y = snap(cam.worldToScreen(0, r * t).y);
        g.moveTo(left, y).lineTo(right, y);
      }

      g.stroke({ width: 1, color: theme.gridMinor, alpha: minorAlpha });
    }

    let stride = MAJOR_EVERY;
    while (step * stride < MIN_MAJOR_SPACING)
      stride *= 2;

    const first = (i: number) => Math.ceil(i / stride) * stride;
    for (let c = first(c0); c <= c1; c += stride) {
      const x = snap(cam.worldToScreen(c * t, 0).x);
      g.moveTo(x, top).lineTo(x, bottom);
    }

    for (let r = first(r0); r <= r1; r += stride) {
      const y = snap(cam.worldToScreen(0, r * t).y);
      g.moveTo(left, y).lineTo(right, y);
    }

    g.stroke({ width: 1, color: theme.gridMajor, alpha: 1 });

    g.rect(snap(tl.x), snap(tl.y), Math.round(br.x - tl.x), Math.round(br.y - tl.y)).stroke({
      width: 1,
      color: theme.border,
    });
  }
}
