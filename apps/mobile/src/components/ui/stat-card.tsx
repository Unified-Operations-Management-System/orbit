// stat-card.tsx
import { colors, type ColorToken } from "@/theme";
import { Card } from "./card";
import { T } from "./text";

export function StatCard({ label, value, accent, alert }: { label: string; value: string; accent: ColorToken; alert?: boolean }) {
  return (
    <Card accent={accent} style={{ flex: 1 }}>
      <T variant="label">{label}</T>
      <T variant="stat" style={alert ? { color: colors.red } : undefined}>{value}</T>
    </Card>
  );
}
