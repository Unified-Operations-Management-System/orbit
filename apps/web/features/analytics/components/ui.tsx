import Link from "next/link";
import type { ReactNode } from "react";
import { colors, type AreaShape, type ColorToken } from "@orbit/design-tokens";
import { Card, PageHeader, Shape, Skeleton } from "@/components/ui";
import type { CostingStatus, PurchaseOrderStatus } from "../data/cost-capture";
import { AnalyticsNav } from "./analytics-nav";

// Building blocks shared by the Cost Analytics screens, composed from components/ui so the
// area matches the design system (docs/design/README.md). They stay inside the feature until
// a second domain needs them (apps/web/README.md, rule 5).

/** Shape + label, so a status never relies on colour alone (design rule 5). */
export function StatusMark({ shape, color, text = "ink", label }: { shape: AreaShape | "check"; color: ColorToken; text?: ColorToken; label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-bold">
      {shape === "check" ? <span aria-hidden>✓</span> : <Shape shape={shape} color={colors[color]} size={10} />}
      <span style={{ color: colors[text] }}>{label}</span>
    </span>
  );
}

export function CostingStatusMark({ status }: { status: CostingStatus }) {
  return status === "final" ? <StatusMark shape="check" color="ink" label="Final" /> : <StatusMark shape="triangle" color="yellow" label="Provisional" />;
}

export function PurchaseOrderStatusMark({ status }: { status: PurchaseOrderStatus }) {
  if (status === "open") return <StatusMark shape="circle" color="blue" text="blue" label="Open" />;
  if (status === "closed") return <StatusMark shape="check" color="ink" label="Closed" />;
  return <StatusMark shape="square" color="muted" text="muted" label="Draft" />;
}

/**
 * Page frame for every Cost Analytics screen: optional back link, the shared PageHeader,
 * the area's second-level navigation, then an intro line (status, context) above the content.
 */
export function AnalyticsPage({
  title,
  status,
  description,
  back,
  actions,
  children,
}: {
  title: string;
  status?: ReactNode;
  description?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="flex flex-col">
      {back ? (
        <Link href={back.href} className="text-sm font-bold text-muted hover:text-ink">
          ← {back.label}
        </Link>
      ) : null}
      <PageHeader eyebrow="Cost Analytics" title={title} actions={actions} />
      <div className="-mt-4 mb-6">
        <AnalyticsNav />
      </div>
      {status || description ? (
        <div className="mb-6 flex max-w-3xl flex-col gap-2">
          {status ? <div>{status}</div> : null}
          {description ? <p className="text-muted">{description}</p> : null}
        </div>
      ) : null}
      <div className="flex flex-col gap-6">{children}</div>
    </main>
  );
}

/** A Card with a section heading. */
export function Section({ title, accent, children }: { title: string; accent?: ColorToken; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <Card accent={accent}>
        <h2 className="mb-3 text-[22px] font-bold">{title}</h2>
        {children}
      </Card>
    </section>
  );
}

/** Says out loud that nothing is saved yet, so a demo viewer isn't misled. */
export function PrototypeNotice({ children }: { children: ReactNode }) {
  return (
    <p className="border-l-[6px] border-line py-1 pl-3 text-sm text-muted">
      <span className="font-bold uppercase tracking-[0.12em]">Prototype</span> · {children}
    </p>
  );
}

export const linkClass = "font-bold underline decoration-2 underline-offset-2 hover:text-red";
export const tableClass = "w-full border-t-2 border-ink text-left";
export const thClass = "py-2 pr-4 text-xs font-bold uppercase tracking-[0.12em] text-muted";
export const tdClass = "border-t border-line py-3 pr-4 align-top";
export const numClass = "text-right tabular-nums";

/** Placeholder shown while a page that depends on the URL streams in. */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-10 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-48" />
    </div>
  );
}
