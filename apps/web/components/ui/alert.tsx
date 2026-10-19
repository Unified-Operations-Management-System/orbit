import type { ReactNode } from "react";
import { colors } from "@orbit/design-tokens";
import { Shape } from "./area-icon";

type Tone = "info" | "success" | "warning" | "error";

const tones: Record<Tone, { shape: "circle" | "triangle" | "square"; color: string }> = {
  info: { shape: "circle", color: colors.blue },
  success: { shape: "circle", color: colors.blue },
  warning: { shape: "triangle", color: colors.yellow },
  error: { shape: "square", color: colors.red },
};

export function Alert({
  tone = "info",
  title,
  children,
  action,
}: {
  tone?: Tone;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const t = tones[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className="flex items-start gap-3 border-l-[6px] bg-surface p-4"
      style={{ borderLeftColor: t.color }}
    >
      <Shape shape={t.shape} color={t.color} size={14} />
      <div className="flex-1">
        <p className="font-bold">{title}</p>
        {children ? <div className="text-ink">{children}</div> : null}
      </div>
      {action
        ? <div className="shrink-0">{action}</div>
        : null}
    </div>
  );
}
