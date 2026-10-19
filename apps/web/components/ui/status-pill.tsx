import { colors, statuses, type Status } from "@orbit/design-tokens";
import { Shape } from "./area-icon";

export function StatusPill({ status }: { status: Status }) {
  const s = statuses[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-bold">
      {s.shape === "check" ? <span aria-hidden>✓</span> : <Shape shape={s.shape} color={colors[s.color]} size={10} />}
      <span style={{ color: colors[s.text] }}>{s.label}</span>
    </span>
  );
}
