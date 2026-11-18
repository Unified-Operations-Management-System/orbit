'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { SimEngine } from '@/sim-engine/engine';
import { createCanvasStore } from '@/sim-engine/store';
import { Hud } from './hud';

interface SimCanvasProps {
  cols: number;
  rows: number;
  tileSize?: number;
}

export function SimCanvas({ cols, rows, tileSize = 32 }: SimCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [store] = useState(createCanvasStore);
  const [engine, setEngine] = useState<SimEngine | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let instance: SimEngine | null = null;

    void (async () => {
      try {
        const { SimEngine } = await import('@/sim-engine/engine');
        if (cancelled) return;
        instance = new SimEngine({ cols, rows, tileSize }, store);
        await instance.mount(host);
        if (!cancelled) setEngine(instance);
      } catch (reason) {
        instance?.destroy();
        if (!cancelled)
          setError(reason instanceof Error ? reason.message : String(reason));
      }
    })();

    return () => {
      cancelled = true;
      instance?.destroy();
      setEngine(null);
    };
  }, [cols, rows, tileSize, store]);

  return (
    <div style={styles.root}>
      <div ref={hostRef} style={styles.host} />
      {error ? (
        <p role="alert" className="absolute inset-0 grid place-items-center bg-neutral-100 p-6 text-center text-sm text-red-700">
          Simulation canvas could not start: {error}
        </p>
      ) : null}
      <Hud store={store} engine={engine} />
    </div>
  );
}

const styles = {
  root: { position: 'relative', width: '100%', height: '100%', overflow: 'hidden', userSelect: 'none' },
  host: { position: 'absolute', inset: 0 },
} satisfies Record<string, CSSProperties>;
