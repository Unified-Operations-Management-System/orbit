'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useStore } from 'zustand';
import type { SimEngine } from '@/sim-engine/engine';
import type { CanvasStore } from '@/sim-engine/store';

export function Hud({ store, engine }: { store: CanvasStore; engine: SimEngine | null }) {
  const zoom = useStore(store, (s) => s.zoom);
  const hover = useStore(store, (s) => s.hoverTile);
  const tool = useStore(store, (s) => s.tool);
  const setTool = useStore(store, (s) => s.setTool);
  const pct = Math.round(zoom * 100);

  return (
    <>
      <div style={{ ...styles.panel, left: 12 }}>
        <ToolButton active={tool === 'select'} onClick={() => setTool('select')} title="Select (V)">
          V
        </ToolButton>
        <ToolButton active={tool === 'hand'} onClick={() => setTool('hand')} title="Hand (H)">
          H
        </ToolButton>
      </div>
      <div style={{ ...styles.panel, right: 12 }}>
        <span style={styles.readout}>{hover ? `${hover.x}, ${hover.y}` : '—'}</span>
        <span style={styles.divider} />
        <ToolButton onClick={() => engine?.zoomBy(0.5)} title="Zoom out (⌘−)">
          −
        </ToolButton>
        <button style={{ ...styles.btn, minWidth: 56 }} onClick={() => engine?.zoomTo(1)} title="Zoom to 100% (⇧0)">
          {pct}%
        </button>
        <ToolButton onClick={() => engine?.zoomBy(2)} title="Zoom in (⌘+)">
          +
        </ToolButton>
        <ToolButton onClick={() => engine?.fit()} title="Zoom to fit (⇧1)">
          ⤢
        </ToolButton>
      </div>
    </>
  );
}

function ToolButton(props: { active?: boolean; onClick: () => void; title: string; children: ReactNode }) {
  return (
    <button
      onClick={props.onClick}
      title={props.title}
      style={{ ...styles.btn, ...(props.active ? styles.btnActive : null) }}
    >
      {props.children}
    </button>
  );
}

const styles = {
  panel: {
    position: 'absolute',
    bottom: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    padding: 4,
    background: 'rgba(255,255,255,0.92)',
    border: '1px solid #e2e2e2',
    borderRadius: 8,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    font: '12px/1 ui-sans-serif, system-ui, sans-serif',
    color: '#333',
  },
  btn: {
    minWidth: 28,
    height: 28,
    padding: '0 6px',
    border: 0,
    borderRadius: 6,
    background: 'transparent',
    color: 'inherit',
    font: 'inherit',
    cursor: 'pointer',
    fontVariantNumeric: 'tabular-nums',
  },
  btnActive: { background: '#2f6bff', color: '#fff' },
  readout: { padding: '0 8px', minWidth: 64, textAlign: 'center', fontVariantNumeric: 'tabular-nums', color: '#666' },
  divider: { width: 1, height: 16, background: '#e2e2e2', margin: '0 2px' },
} satisfies Record<string, CSSProperties>;
