// page-header.tsx
import { colors } from "@orbit/design-tokens";
import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, actions }: { eyebrow?: string; title: string; actions?: ReactNode }) {
  return (
    <header className="relative mb-8 flex items-end gap-4 overflow-hidden pt-2">
      <div className="relative z-10">
        {eyebrow ? <div className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{eyebrow}</div> : null}
        <h1 className="text-[32px] font-extrabold leading-[1.05]">{title}</h1>
      </div>
      {actions ? <div className="relative z-10 ml-auto">{actions}</div> : null}
      <svg width="200" height="96" aria-hidden className={`pointer-events-none absolute right-0 top-0 hidden lg:block ${actions ? "opacity-0" : ""}`}>
        <circle cx="160" cy="10" r="56" fill={colors.yellow} />
        <rect x="70" y="18" width="52" height="52" fill={colors.blue} />
        <polygon points="120,96 168,96 144,56" fill={colors.red} />
      </svg>
    </header>
  );
}
