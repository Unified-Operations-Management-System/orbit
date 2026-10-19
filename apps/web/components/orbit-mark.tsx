// components/orbit-mark.tsx
import { colors } from "@orbit/design-tokens";

export function OrbitMark({ size = 28, onDark }: { size?: number; onDark?: boolean }) {
  const stroke = onDark ? colors.paper : colors.ink;
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden>
      <circle cx="14" cy="14" r="12" fill="none" stroke={stroke} strokeWidth="2" />
      <circle cx="23" cy="7" r="4" fill={colors.red} />
    </svg>
  );
}
