// stat-card.tsx
import type { ColorToken } from "@orbit/design-tokens";
import { Card } from "./card";

export function StatCard({ label, value, accent, alert }: { label: string; value: string; accent: ColorToken; alert?: boolean }) {
  return (
    <Card accent={accent}>
      <div className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</div>
      <div className={`mt-1 text-[40px] font-extrabold leading-none ${alert ? "text-red" : "text-ink"}`}>{value}</div>
    </Card>
  );
}
