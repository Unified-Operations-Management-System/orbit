import { areas, colors, type Area, type AreaShape, type ColorToken } from "@orbit/design-tokens";

export function Shape({ shape, color, size = 16 }: { shape: AreaShape; color: string; size?: number }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden className="shrink-0">
      {shape === "circle" && <circle cx={s / 2} cy={s / 2} r={s / 2} fill={color} />}
      {shape === "square" && <rect width={s} height={s} fill={color} />}
      {shape === "triangle" && <polygon points={`${s / 2},0 ${s},${s} 0,${s}`} fill={color} />}
      {shape === "bar" && <rect y={s * 0.3} width={s} height={s * 0.4} fill={color} />}
      {shape === "quarter" && <path d={`M0 ${s} A${s} ${s} 0 0 1 ${s} 0 L${s} ${s}Z`} fill={color} />}
    </svg>
  );
}

// onDark swaps ink for paper so the inventory bar stays visible on the black sidebar.
export function AreaIcon({ area, size, onDark }: { area: Area; size?: number; onDark?: boolean }) {
  const { shape, color } = areas[area];
  const token: ColorToken = onDark && color === "ink" ? "paper" : color;
  return <Shape shape={shape} color={colors[token]} size={size} />;
}
