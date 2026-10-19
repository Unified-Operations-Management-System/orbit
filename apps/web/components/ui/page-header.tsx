// page-header.tsx
import { colors } from "@orbit/design-tokens";
import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, actions }: { eyebrow?: string; title: string; actions?: ReactNode }) {
  return (
    <header className="relative mb-8 flex min-h-[120px] items-end gap-4 overflow-hidden pt-2">
      <div className="relative z-10">
        {eyebrow ? <div className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{eyebrow}</div> : null}
        <h1 className="text-[32px] font-extrabold leading-[1.05]">{title}</h1>
      </div>
      {actions ? <div className="relative z-10 ml-auto">{actions}</div> : null}
      <svg width="230" height="120" aria-hidden className={`pointer-events-none absolute right-0 top-0 hidden lg:block ${actions ? "opacity-0" : ""}`}>
        <circle cx="185" cy="15" r="65" fill={colors.yellow} />
        <rect x="80" y="20" width="62" height="62" fill={colors.blue} />
        <polygon points="140,110 196,110 168,64" fill={colors.red} />
      </svg>
    </header>
  );
}
