'use client';

import { useState } from 'react';
import { SimCanvas } from './sim-canvas';

type Mode = 'edit' | 'run';

interface SimWorkspaceProps {
  cols: number;
  rows: number;
}

export function SimWorkspace({ cols, rows }: SimWorkspaceProps) {
  const [mode, setMode] = useState<Mode>('edit');

  return (
    <div className="grid h-full grid-rows-[44px_1fr] bg-neutral-100 text-neutral-900">
      <TopBar mode={mode} onModeChange={setMode} />

      <div
        className={`grid min-h-0 ${mode === 'edit' ? 'grid-cols-[224px_1fr_280px]' : 'grid-cols-[1fr_280px]'
          }`}
      >
        {mode === 'edit' && (
          <aside className="min-h-0 overflow-y-auto border-r border-neutral-200 bg-white p-3">
            <PanelLabel>Blocks</PanelLabel>
            <p className="mt-2 text-xs text-neutral-500">Block palette goes here.</p>
          </aside>
        )}

        <main className="grid min-h-0 min-w-0 grid-rows-[1fr_auto]">
          <div className="relative min-h-0 min-w-0">
            <SimCanvas cols={cols} rows={rows} />
          </div>
          {mode === 'run' && (
            <div className="h-14 border-t border-neutral-200 bg-white px-4 py-2 text-xs text-neutral-500">
              Timeline and playback controls go here.
            </div>
          )}
        </main>

        <aside className="min-h-0 overflow-y-auto border-l border-neutral-200 bg-white p-3">
          <PanelLabel>Inspector</PanelLabel>
          <p className="mt-2 text-xs text-neutral-500">Select a block to edit it.</p>
        </aside>
      </div>
    </div>
  );
}

function TopBar({ mode, onModeChange }: { mode: Mode; onModeChange: (m: Mode) => void }) {
  return (
    <header className="flex items-center gap-3 border-b border-neutral-200 bg-white px-3">
      <span className="text-sm font-semibold">Orbit</span>
      <span className="text-sm text-neutral-400">/</span>
      <span className="text-sm text-neutral-600">Untitled factory</span>

      <div className="ml-auto flex rounded-md bg-neutral-100 p-0.5 text-xs" role="tablist">
        {(['edit', 'run'] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => onModeChange(m)}
            className={`rounded px-3 py-1 capitalize ${mode === m ? 'bg-white shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
              }`}
          >
            {m}
          </button>
        ))}
      </div>

      <button
        disabled
        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
        title="Publish the draft and start a run"
      >
        Publish
      </button>
    </header>
  );
}

function PanelLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{children}</h2>;
}
