import { Vec2 } from "./camera";
import { createStore, type StoreApi } from 'zustand/vanilla';

export type Tool = 'select' | 'hand';

export interface CanvasState {
  zoom: number;
  hoverTile: Vec2 | null;
  tool: Tool;
  panning: boolean;

  setTool: (tool: Tool) => void;
}

export type CanvasStore = StoreApi<CanvasState>;

export const createCanvasStore = (): CanvasStore => {
  return createStore<CanvasState>((set) => ({
    zoom: 1,
    hoverTile: null,
    tool: 'select',
    panning: false,

    setTool: (tool: Tool) => set({ tool }),
  }));
}
