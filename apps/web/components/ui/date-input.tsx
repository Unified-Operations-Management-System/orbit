"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

const pad2 = (n: number) => String(n).padStart(2, "0");
const WEEKDAYS = Array.from({ length: 7 }, (_, i) =>
  new Intl.DateTimeFormat("en-CA", { weekday: "short" }).format(new Date(2023, 0, 1 + i)).slice(0, 2),
);
const MONTH_FMT = new Intl.DateTimeFormat("en-CA", { month: "long" });
// "7:30 AM" style; built from local Date parsing only, never `new Date("YYYY-MM-DD")`.
const TIMES = Array.from({ length: 96 }, (_, i) => `${pad2(Math.floor(i / 4))}:${pad2((i % 4) * 15)}`);

function dayKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function parseDateStr(s: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? { y: +m[1], m: +m[2] - 1, d: +m[3] } : undefined;
}
function toDate(s?: string) {
  const p = s && parseDateStr(s);
  return p ? new Date(p.y, p.m, p.d) : undefined;
}
function clampDay(d: Date, min?: string, max?: string) {
  if (min) { const p = parseDateStr(min); if (p && dayKey(d) < min) d = new Date(p.y, p.m, p.d); }
  if (max) { const p = parseDateStr(max); if (p && dayKey(d) > max) d = new Date(p.y, p.m, p.d); }
  return d;
}
function addMonths(d: Date, delta: number) {
  const y = d.getFullYear();
  const m = d.getMonth() + delta;
  return new Date(y, m, Math.min(d.getDate(), new Date(y, m + 1, 0).getDate()));
}
const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(d);
const fmtTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const h12 = (h ?? 0) % 12 === 0 ? 12 : (h ?? 0) % 12;
  return `${h12}:${pad2(m ?? 0)} ${(h ?? 0) < 12 ? "AM" : "PM"}`;
};
function splitValue(v: string | undefined, type: string) {
  if (!v) return { date: undefined, time: undefined } as const;
  if (type === "date") return { date: v, time: undefined } as const;
  if (type === "time") return { date: undefined, time: v } as const;
  const [d, t] = v.split("T");
  return { date: d, time: t } as const;
}
const triggerClass = (error?: boolean) =>
  `flex h-11 w-full items-center justify-between border border-line bg-surface px-3 text-left outline-none focus:border-ink disabled:opacity-50 ${error ? "border-red" : ""}`;

function DatePanel({ labelId, value, min, max, onEscape, onSelect }: { labelId: string; value?: string; min?: string; max?: string; onEscape: () => void; onSelect: (d: Date) => void }) {
  const [cursor, setCursor] = useState(() => toDate(value) ?? clampDay(new Date(), min, max));
  const refs = useRef(new Map<string, HTMLButtonElement>());
  useEffect(() => { refs.current.get(dayKey(cursor))?.focus(); }, [cursor]);
  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "Escape") { e.stopPropagation(); onEscape(); return; }
    const d = cursor;
    let next: Date | undefined;
    switch (e.key) {
      case "ArrowRight": next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); break;
      case "ArrowLeft": next = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1); break;
      case "ArrowDown": next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7); break;
      case "ArrowUp": next = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7); break;
      case "PageDown": next = addMonths(d, 1); break;
      case "PageUp": next = addMonths(d, -1); break;
      case "Home": next = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay()); break;
      case "End": next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (6 - d.getDay())); break;
      default: return; // Enter/Space activate the focused day button natively
    }
    e.preventDefault();
    setCursor(clampDay(next, min, max));
  };
  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const first = new Date(y, m, 1);
  const todayKey = dayKey(new Date());
  const cells = Array.from({ length: 42 }, (_, i) => new Date(y, m, 1 - first.getDay() + i));
  return (
    <div role="dialog" aria-labelledby={labelId} onKeyDown={onKeyDown} className="absolute top-full left-0 z-20 w-72 border border-line border-t-2 border-t-ink bg-paper p-3">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" aria-label="Previous month" onClick={() => setCursor((c) => addMonths(c, -1))} className="h-9 px-3 text-muted hover:bg-surface">‹</button>
        <span id={labelId} className="font-bold">{MONTH_FMT.format(new Date(y, m, 1))} {y}</span>
        <button type="button" aria-label="Next month" onClick={() => setCursor((c) => addMonths(c, 1))} className="h-9 px-3 text-muted hover:bg-surface">›</button>
      </div>
      <div className="grid grid-cols-7">
        {WEEKDAYS.map((w, i) => (
          <span key={i} aria-hidden className="flex h-9 items-center justify-center text-xs font-bold uppercase tracking-[0.12em] text-muted">{w}</span>
        ))}
      </div>
      <div role="grid" className="grid grid-cols-7 gap-y-1">
        {cells.map((d) => {
          const key = dayKey(d);
          const disabled = (min && key < min) || (max && key > max);
          return (
            <div key={key} role="gridcell">
              <button
                type="button"
                aria-label={fmtDate(d)}
                aria-pressed={value === key}
                disabled={disabled ? true : undefined}
                ref={(el) => { if (el) refs.current.set(key, el); }}
                onClick={() => !disabled && onSelect(d)}
                className={`flex h-9 w-full items-center justify-center border-2 text-sm ${value === key ? "border-red bg-red font-bold text-paper" : "border-transparent"} ${key === todayKey ? "border-ink" : ""} ${d.getMonth() !== m ? "text-muted" : ""} ${disabled ? "pointer-events-none opacity-40" : ""}`}
              >
                {d.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimePanel({ value, uid, onSelect, onEscape }: { value?: string; uid: string; onSelect: (t: string) => void; onEscape: () => void }) {
  const [active, setActive] = useState(() => Math.max(0, TIMES.indexOf(value ?? "")));
  useEffect(() => {
    const idx = TIMES.indexOf(value ?? "");
    document.getElementById(`${uid}-t${idx >= 0 ? idx : active}`)?.scrollIntoView({ block: "nearest" });
  }, [uid, active, value]);
  const move = (delta: 1 | -1) => setActive((a) => (a + delta + TIMES.length) % TIMES.length);
  return (
    <ul
      role="listbox"
      aria-label="Time"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Escape") { e.stopPropagation(); onEscape(); }
        else if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
        else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
        else if (e.key === "Enter") { e.preventDefault(); onSelect(TIMES[active] as string); }
      }}
      className="absolute top-full left-0 z-20 max-h-64 w-full overflow-auto border border-line border-t-2 border-t-ink bg-paper"
    >
      {TIMES.map((t, i) => (
        <li key={t} id={`${uid}-t${i}`} role="option" aria-selected={t === value} onMouseEnter={() => setActive(i)} onClick={() => onSelect(t)} className={`cursor-pointer px-3 py-2.5 ${active === i ? "bg-surface" : ""}`}>
          <span className="flex items-center justify-between">
            <span className={t === value ? "font-bold" : ""}>{fmtTime(t)}</span>
            {t === value ? <span aria-hidden>✓</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function DateInput({
  label,
  hint,
  error,
  type = "date",
  value,
  defaultValue,
  onChange,
  name,
  min,
  max,
  disabled,
}: {
  label: string;
  hint?: string;
  error?: string;
  type?: "date" | "time" | "datetime-local";
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
}) {
  const uid = useId();
  const [inner, setInner] = useState<string | undefined>(defaultValue);
  const current = value !== undefined ? value : inner;
  const { date: datePart, time: timePart } = splitValue(current, type);
  const [open, setOpen] = useState<"date" | "time" | undefined>();
  const rootRef = useRef<HTMLDivElement>(null);
  const dateTriggerRef = useRef<HTMLButtonElement>(null);
  const timeTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: globalThis.MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(undefined);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const emit = (date?: string, time?: string) => {
    const next = type === "date" ? date : type === "time" ? time : `${date ?? datePart ?? dayKey(new Date())}T${time ?? timePart ?? "00:00"}`;
    if (value === undefined) setInner(next);
    onChange?.(next as string);
  };
  const close = (side: "date" | "time") => {
    setOpen(undefined);
    (side === "time" ? timeTriggerRef : dateTriggerRef).current?.focus();
  };
  const openDate = open === "date";
  const openTime = open === "time";
  const dateDisplay = toDate(datePart);
  const timeDisplay = timePart ? fmtTime(timePart) : undefined;

  return (
    <div ref={rootRef} className="flex flex-col gap-1">
      {name ? <input type="hidden" name={name} value={current ?? ""} /> : null}
      <span id={`${uid}-label`} className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</span>
      <div className={type === "datetime-local" ? "grid grid-cols-2 gap-2" : ""}>
        {type !== "time" ? (
          <div className="relative w-full">
            <button type="button" ref={dateTriggerRef} disabled={disabled} aria-haspopup="dialog" aria-expanded={openDate} aria-labelledby={`${uid}-label`} onClick={() => setOpen(openDate ? undefined : "date")} className={triggerClass(!!error)}>
              <span className={`truncate ${dateDisplay ? "" : "text-muted"}`}>{dateDisplay ? fmtDate(dateDisplay) : "Pick a date"}</span>
              <svg aria-hidden width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="shrink-0 text-muted">
                <rect x={1.5} y={3} width={13} height={11.5} />
                <path d="M1.5 6.5h13M5 1v3M11 1v3" />
              </svg>
            </button>
            {openDate ? <DatePanel labelId={`${uid}-label`} value={datePart} min={min} max={max} onEscape={() => close("date")} onSelect={(d) => { emit(dayKey(d), undefined); close("date"); }} /> : null}
          </div>
        ) : null}
        {type === "time" || type === "datetime-local" ? (
          <div className="relative w-full">
            <button type="button" ref={timeTriggerRef} disabled={disabled} aria-haspopup="dialog" aria-expanded={openTime} aria-label={type === "time" ? label : "Time"} onClick={() => setOpen(openTime ? undefined : "time")} className={triggerClass(!!error)}>
              <span className={`truncate ${timeDisplay ? "" : "text-muted"}`}>{timeDisplay ?? "Pick a time"}</span>
              <svg aria-hidden width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="shrink-0 text-muted">
                <circle cx={8} cy={8} r={6.5} />
                <path d="M8 4.5V8l2.5 1.5" />
              </svg>
            </button>
            {openTime ? <TimePanel uid={uid} value={timePart} onSelect={(t) => { emit(undefined, t); close("time"); }} onEscape={() => close("time")} /> : null}
          </div>
        ) : null}
      </div>
      {error ? <span className="text-sm text-red">{error}</span> : hint ? <span className="text-sm text-muted">{hint}</span> : null}
    </div>
  );
}
