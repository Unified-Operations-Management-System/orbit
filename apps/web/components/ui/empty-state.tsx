// empty-state.tsx
import type { Area } from "@orbit/design-tokens";
import type { ReactNode } from "react";
import { AreaIcon } from "./area-icon";

export function EmptyState({ area, title, body, action }: { area: Area; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4 border-t-2 border-ink py-12">
      <AreaIcon area={area} size={64} />
      <h2 className="text-[22px] font-bold">{title}</h2>
      <p className="max-w-prose text-muted">{body}</p>
      {action}
    </div>
  );
}
