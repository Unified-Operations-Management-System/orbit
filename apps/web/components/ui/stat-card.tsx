// stat-card.tsx
import type { ColorToken } from "@orbit/design-tokens";
import { Card } from "./card";

export function StatCard({ label, value, accent, alert }: { label: string; value: string; accent: ColorToken; alert?: boolean }) {
  return (
    <Card accent={accent} className="@container">
      <div className="truncate text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</div>
      {/* Scales down with the card so long values (e.g. currency) never overflow. */}
      <div className={`mt-1 text-[min(40px,12cqi)] font-extrabold leading-none tabular-nums ${alert ? "text-red" : "text-ink"}`}>{value}</div>
    </Card>
  );
}
