import type { ReactNode } from "react";
import { colors, statuses, type Status } from "@orbit/design-tokens";
import { Shape } from "./area-icon";

export function Timeline({
  items,
}: {
  items: { id: string; title: string; meta?: string; body?: ReactNode; status?: Status }[];
}) {
  return (
    <ol className="relative ml-1.5 border-l-2 border-ink">
      {items.map((item) => {
        const s = item.status ? statuses[item.status] : undefined;
        const shape = s?.shape ?? "circle";
        const color = s ? colors[s.color] : colors.ink;
        return (
          <li key={item.id} className="relative flex flex-col gap-1 pb-6 pl-6 last:pb-0">
            <span className="absolute left-0 top-0.5 -translate-x-1/2 bg-paper">
              {shape === "check" ? (
                <span aria-hidden className="font-bold text-ink">✓</span>
              ) : (
                <Shape shape={shape} color={color} size={12} />
              )}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-bold">{item.title}</span>
              {item.meta ? <span className="text-sm text-muted">{item.meta}</span> : null}
            </div>
            {item.body ? <div>{item.body}</div> : null}
          </li>
        );
      })}
    </ol>
  );
}
