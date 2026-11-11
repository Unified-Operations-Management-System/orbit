// card.tsx
import { colors, type ColorToken } from "@orbit/design-tokens";
import type { ReactNode } from "react";

export function Card({ accent, className = "", children }: { accent?: ColorToken; className?: string; children: ReactNode }) {
  return (
    <div className={`min-w-0 bg-surface p-4 ${className}`} style={accent ? { borderTop: `6px solid ${colors[accent]}` } : undefined}>
      {children}
    </div>
  );
}
