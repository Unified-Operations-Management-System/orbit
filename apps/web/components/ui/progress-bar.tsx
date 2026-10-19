import { colors, type ColorToken } from "@orbit/design-tokens";

export function ProgressBar({
  label,
  value,
  max = 100,
  accent = "blue",
}: {
  label: string;
  value: number;
  max?: number;
  accent?: ColorToken;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</span>
        <span className="text-sm font-bold">{Math.round(pct)}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
        className="h-3 bg-surface"
      >
        <div className="h-full" style={{ width: `${pct}%`, backgroundColor: colors[accent] }} />
      </div>
    </div>
  );
}
