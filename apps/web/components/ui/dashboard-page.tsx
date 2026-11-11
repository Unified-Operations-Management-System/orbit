// dashboard-page.tsx
import type { ReactNode } from "react";

/**
 * Frame for every signed-in page (design rule: the dashboard never scrolls).
 * The header (title, actions, tabs) stays put and the body fills the rest of the
 * screen. By default the body scrolls as one block; with `fill` the page lays
 * out Panels that each scroll on their own. Below `lg` the body scrolls so
 * narrow screens stay usable.
 */
export function DashboardPage({ header, fill, children }: { header: ReactNode; fill?: boolean; children: ReactNode }) {
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0">{header}</div>
      <div className={`min-h-0 flex-1 overflow-y-auto ${fill ? "flex flex-col gap-6 lg:overflow-hidden" : ""}`}>{children}</div>
    </main>
  );
}

/** A titled section of a `fill` DashboardPage whose content scrolls inside it. */
export function Panel({ title, actions, className = "", children }: { title: string; actions?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className={`flex flex-col lg:min-h-0 ${className}`}>
      <div className="mb-3 flex shrink-0 items-center justify-between gap-4">
        <h2 className="text-[22px] font-bold">{title}</h2>
        {actions}
      </div>
      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">{children}</div>
    </section>
  );
}
