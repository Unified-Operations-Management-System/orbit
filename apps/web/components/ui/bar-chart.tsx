import { colors, type ColorToken } from "@orbit/design-tokens";

export function BarChart({
  title,
  data,
  accent = "blue",
  format = (v: number) => String(v),
}: {
  title: string;
  data: { label: string; value: number }[];
  accent?: ColorToken;
  format?: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 0);
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{title}</figcaption>
      {data.map((d) => (
        <div
          key={d.label}
          role="img"
          aria-label={`${d.label}: ${format(d.value)}`}
          className="flex items-center gap-2"
        >
          <span className="w-32 truncate text-sm text-muted">{d.label}</span>
          <span className="block h-3 flex-1 bg-surface">
            <span className="block h-full" style={{ width: `${max > 0 ? (d.value / max) * 100 : 0}%`, backgroundColor: colors[accent] }} />
          </span>
          <span className="text-sm font-bold">{format(d.value)}</span>
        </div>
      ))}
    </figure>
  );
}
