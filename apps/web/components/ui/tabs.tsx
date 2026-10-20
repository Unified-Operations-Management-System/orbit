"use client";

import { useId, useRef, type KeyboardEvent } from "react";

export function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const i = tabs.findIndex((t) => t.id === value);
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const tab = tabs[(next + tabs.length) % tabs.length];
    onChange(tab.id);
    refs.current[(next + tabs.length) % tabs.length]?.focus();
  }

  return (
    <div role="tablist" className="flex gap-6 border-b border-line">
      {tabs.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          role="tab"
          id={`${id}-tab-${t.id}`}
          aria-selected={t.id === value}
          tabIndex={t.id === value ? 0 : -1}
          onClick={() => onChange(t.id)}
          onKeyDown={onKeyDown}
          className={`border-b-4 px-0 py-2 text-[15px] font-bold outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink ${
            t.id === value ? "border-red text-ink" : "border-transparent text-muted"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
