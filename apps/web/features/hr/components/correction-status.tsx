import { colors } from "@orbit/design-tokens";
import { Shape } from "@/components/ui";
import type { CorrectionStatus } from "../api";

// Shape and label together, so colour is never the only signal.
const look: Record<CorrectionStatus, { shape: "circle" | "triangle" | "square"; color: string; text: string }> = {
  Pending: { shape: "triangle", color: colors.yellow, text: "text-ink" },
  Approved: { shape: "circle", color: colors.blue, text: "text-blue" },
  Rejected: { shape: "square", color: colors.red, text: "text-red" },
  Withdrawn: { shape: "square", color: colors.muted, text: "text-muted" },
};

export function CorrectionStatusLabel({ status }: { status: CorrectionStatus }) {
  const s = look[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-bold ${s.text}`}>
      <Shape shape={s.shape} color={s.color} size={10} />
      {status}
    </span>
  );
}
