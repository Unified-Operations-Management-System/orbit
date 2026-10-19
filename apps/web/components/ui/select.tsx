"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

type Option = { value: string; label: string };

export function Select({
  label,
  options,
  value,
  defaultValue,
  onChange,
  hint,
  error,
  placeholder,
  disabled,
  name,
}: {
  label: string;
  options: Option[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  hint?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
}) {
  const uid = useId();
  const labelId = `${uid}-label`;
  const listboxId = `${uid}-listbox`;
  const triggerId = `${uid}-trigger`;

  const [inner, setInner] = useState<string | undefined>(defaultValue);
  const current = value !== undefined ? value : inner;
  const selected = options.find((o) => o.value === current);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const typeRef = useRef({ query: "", at: 0 });

  useEffect(() => {
    if (!open) return;
    const onDown = (e: globalThis.MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = document.getElementById(`${listboxId}-${active}`);
    el?.scrollIntoView({ block: "nearest" });
  }, [open, active, listboxId]);

  const openList = (preferred?: number) => {
    const idx = selected ? options.findIndex((o) => o.value === selected.value) : 0;
    setActive(preferred ?? Math.max(0, idx));
    setOpen(true);
    typeRef.current = { query: "", at: 0 };
  };

  const select = (opt: Option) => {
    if (value === undefined) setInner(opt.value);
    onChange?.(opt.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const move = (delta: 1 | -1, from: number) =>
    options.length ? setActive((from + delta + options.length) % options.length) : 0;

  const onKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp": {
        e.preventDefault();
        if (!open) return openList(e.key === "ArrowDown" ? 0 : options.length - 1);
        move(e.key === "ArrowDown" ? 1 : -1, active);
        return;
      }
      case "Home":
        e.preventDefault();
        if (!open) return openList(0);
        setActive(0);
        return;
      case "End":
        e.preventDefault();
        if (!open) return openList(options.length - 1);
        setActive(options.length - 1);
        return;
      case "Escape":
        if (open) {
          e.stopPropagation();
          setOpen(false);
          triggerRef.current?.focus();
        }
        return;
      case "Enter":
        if (open) {
          e.preventDefault();
          if (options[active]) select(options[active]);
        }
        return;
      case " ":
        e.preventDefault();
        if (open && options[active]) select(options[active]);
        else openList();
        return;
      case "Tab":
        if (open) setOpen(false);
        return;
      default: {
        if (e.key.length !== 1 || (!/[a-zA-Z0-9]/.test(e.key) && e.key !== " ")) return;
        e.preventDefault();
        if (!open) openList();
        const now = Date.now();
        const base = now - typeRef.current.at < 500 ? typeRef.current.query : "";
        const query = (base + e.key.toLowerCase()).replace(/\s+$/, "");
        typeRef.current = { query, at: now };
        const match = (i: number) => options[i].label.toLowerCase().startsWith(query);
        let found = -1;
        for (let i = 1; i <= options.length; i++) {
          const idx = (active + i) % options.length;
          if (match(idx)) {
            found = idx;
            break;
          }
        }
        if (found < 0) for (let i = 0; i < options.length; i++) if (match(i)) { found = i; break; }
        if (found >= 0) setActive(found);
      }
    }
  };

  return (
    <div ref={rootRef} className="flex flex-col">
      {name ? <input type="hidden" name={name} value={current ?? ""} /> : null}
      <span id={labelId} className="block text-xs font-bold uppercase tracking-[0.12em] text-muted">
        {label}
      </span>
      <div className="relative mt-1">
      <button
        id={triggerId}
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-labelledby={labelId}
        aria-activedescendant={open ? `${listboxId}-${active}` : undefined}
        aria-invalid={error ? true : undefined}
        disabled={disabled}
        onClick={() => {
          if (open) setOpen(false);
          else openList();
        }}
        onKeyDown={onKeyDown}
        className={`flex h-11 w-full items-center justify-between border border-line bg-surface px-3 text-left outline-none focus:border-ink ${
          error ? "border-red" : ""
        } ${disabled ? "opacity-50" : ""}`}
      >
        <span className={`truncate ${selected ? "" : "text-muted"}`}>{selected?.label ?? placeholder ?? ""}</span>
        <svg aria-hidden width={12} height={12} viewBox="0 0 12 12" className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth={2} />
        </svg>
      </button>
      {open ? (
        <div className="absolute top-full left-0 z-20 max-h-64 w-full overflow-auto border border-line border-t-2 border-t-ink bg-paper">
          <ul id={listboxId} role="listbox" aria-labelledby={triggerId}>
            {options.map((o, i) => {
              const isSelected = o.value === current;
              return (
                <li
                  key={o.value}
                  id={`${listboxId}-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => select(o)}
                  className={`cursor-pointer whitespace-nowrap px-3 py-2.5 ${active === i ? "bg-surface" : ""}`}
                >
                  <span className="flex items-center justify-between">
                    <span className={isSelected ? "font-bold" : ""}>{o.label}</span>
                    {isSelected ? <span aria-hidden>✓</span> : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      </div>
      {error ? (
        <span className="mt-1 text-sm text-red">{error}</span>
      ) : hint ? (
        <span className="mt-1 text-sm text-muted">{hint}</span>
      ) : null}
    </div>
  );
}
