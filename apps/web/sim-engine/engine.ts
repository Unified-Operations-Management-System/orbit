import { Application, Container, Graphics } from 'pixi.js';
import { Camera, type Vec2 } from './camera';
import { GridLayer } from './grid-layer';
import { InputController } from './input';
import type { CanvasStore } from './store';
import { lightTheme, type Theme } from './theme';
import { World } from './world';

export interface EngineOptions {
  cols: number;
  rows: number;
  tileSize?: number;
  theme?: Theme;
}

export class SimEngine {
  readonly camera = new Camera();
  readonly world: World;

  private readonly app = new Application();
  private readonly theme: Theme;
  private grid!: GridLayer;
  private worldLayer!: Container;
  private overlay!: Graphics;
  private input?: InputController;
  private resizeObserver?: ResizeObserver;
  private unsubTool?: () => void;

  private hoverScreen: Vec2 | null = null;
  private dirty = true;
  private initialised = false;
  private destroyed = false;

  constructor(
    opts: EngineOptions,
    private readonly store: CanvasStore,
  ) {
    this.world = new World(opts.cols, opts.rows, opts.tileSize);
    this.theme = opts.theme ?? lightTheme;
  }

  async mount(host: HTMLElement): Promise<void> {
    await this.app.init({
      width: Math.max(1, host.clientWidth),
      height: Math.max(1, host.clientHeight),
      background: this.theme.background,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
      preference: 'webgl',
    });

    this.initialised = true;

    if (this.destroyed) {
      this.app.destroy({ removeView: true }, { children: true });
      return;
    }

    const canvas = this.app.canvas;
    canvas.style.display = 'block';
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', 'Simulation grid. Use Space-drag to pan, or Control/Command-scroll to zoom.');
    host.appendChild(canvas);

    this.grid = new GridLayer(this.world, this.theme);
    this.worldLayer = new Container({ label: 'world' });
    this.overlay = new Graphics({ label: 'overlay' });
    this.app.stage.addChild(this.grid.view, this.worldLayer, this.overlay);

    this.input = new InputController(canvas, this.camera, this.store, {
      onCamera: () => this.markDirty(),
      onHover: (p) => {
        this.hoverScreen = p;
        this.markDirty();
      },
      onFit: () => this.fit(),
    });

    this.unsubTool = this.store.subscribe((s, prev) => {
      if (s.tool !== prev.tool)
        this.input?.refreshCursor();

      if (s.panning !== prev.panning)
        this.markDirty();
    });

    this.resizeObserver = new ResizeObserver(() => this.resize(host.clientWidth, host.clientHeight));
    this.resizeObserver.observe(host);
    this.resize(host.clientWidth, host.clientHeight);
    this.fit();

    this.app.ticker.add(this.frame);
  }

  destroy(): void {
    if (this.destroyed)
      return;

    this.destroyed = true;
    if (!this.initialised)
      return;

    this.app.ticker.remove(this.frame);
    this.resizeObserver?.disconnect();
    this.input?.destroy();
    this.unsubTool?.();
    this.app.destroy({ removeView: true }, { children: true });
  }

  fit(): void {
    this.camera.fit(this.world.bounds);
    this.markDirty();
  }

  zoomTo(zoom: number): void {
    this.camera.zoomToCentered(zoom);
    this.markDirty();
  }

  zoomBy(factor: number): void {
    this.camera.zoomAt(this.camera.viewW / 2, this.camera.viewH / 2, factor);
    this.markDirty();
  }

  tileAtScreen(p: Vec2): Vec2 | null {
    return this.world.tileAt(this.camera.screenToWorld(p.x, p.y));
  }

  get worldContainer(): Container {
    return this.worldLayer;
  }

  markDirty(): void {
    this.dirty = true;
  }

  private resize(w: number, h: number): void {
    if (w <= 0 || h <= 0)
      return;

    this.app.renderer.resize(w, h);
    this.camera.setViewport(w, h);
    this.markDirty();
  }

  private frame = (): void => {
    if (!this.dirty)
      return;

    this.dirty = false;
    const cam = this.camera;
    cam.clampTo(this.world.bounds);

    this.worldLayer.position.set(-cam.x * cam.zoom, -cam.y * cam.zoom);
    this.worldLayer.scale.set(cam.zoom);

    this.grid.draw(cam);
    this.drawOverlay();
    this.publish();
  };

  private drawOverlay(): void {
    const g = this.overlay;
    g.clear();

    const tile = this.hoverScreen && !this.store.getState().panning ? this.tileAtScreen(this.hoverScreen) : null;
    if (!tile)
      return;

    const t = this.world.tileSize;
    const a = this.camera.worldToScreen(tile.x * t, tile.y * t);
    const b = this.camera.worldToScreen((tile.x + 1) * t, (tile.y + 1) * t);
    const x = Math.round(a.x) + 0.5;
    const y = Math.round(a.y) + 0.5;
    const w = Math.round(b.x) - Math.round(a.x);
    const h = Math.round(b.y) - Math.round(a.y);

    if (w < 3)
      return;

    g.rect(x, y, w, h)
      .fill({ color: this.theme.hoverFill, alpha: 0.08 })
      .stroke({ width: 1, color: this.theme.hoverStroke, alpha: 0.9 });
  }

  private publish(): void {
    const s = this.store.getState();
    const hoverTile =
      this.hoverScreen && !s.panning ? this.tileAtScreen(this.hoverScreen) : s.panning ? s.hoverTile : null;
    const zoomChanged = Math.abs(s.zoom - this.camera.zoom) > 1e-6;
    const hoverChanged = hoverTile?.x !== s.hoverTile?.x || hoverTile?.y !== s.hoverTile?.y;

    if (zoomChanged || hoverChanged)
      this.store.setState({ zoom: this.camera.zoom, hoverTile });
  }
}
