import Link from "next/link";
import type { CostingStatus, PurchaseOrderStatus } from "../data/cost-capture";

// Small building blocks shared by the Cost Analytics screens. They stay inside the feature
// until a second domain needs them (apps/web/README.md, rule 5).

const badgeStyles = {
  neutral: "border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300",
  amber: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200",
  green: "border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950 dark:text-green-200",
  blue: "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-200",
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof badgeStyles; children: React.ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${badgeStyles[tone]}`}>
      {children}
    </span>
  );
}

export function CostingStatusBadge({ status }: { status: CostingStatus }) {
  return status === "final" ? <Badge tone="green">Final</Badge> : <Badge tone="amber">Provisional</Badge>;
}

export function PurchaseOrderStatusBadge({ status }: { status: PurchaseOrderStatus }) {
  const tone = { draft: "neutral", open: "blue", closed: "green" } as const;
  const label = { draft: "Draft", open: "Open", closed: "Closed" };
  return <Badge tone={tone[status]}>{label[status]}</Badge>;
}

export function PageHeader({
  title,
  description,
  back,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      {back && (
        <Link href={back.href} className="text-sm text-neutral-500 hover:text-foreground">
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description && <p className="max-w-2xl text-sm text-neutral-500">{description}</p>}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Card({ title, children, className = "" }: { title?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-neutral-200 dark:border-neutral-800 ${className}`}>
      {title && <h2 className="border-b border-neutral-200 px-4 py-3 text-sm font-semibold dark:border-neutral-800">{title}</h2>}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">
      {children}
    </Link>
  );
}

/** Says out loud that nothing is saved yet, so a demo viewer isn't misled. */
export function PrototypeNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-neutral-300 px-3 py-2 text-xs text-neutral-500 dark:border-neutral-700">
      Prototype: {children}
    </p>
  );
}

export const tableClass = "w-full text-left text-sm";
export const thClass = "border-b border-neutral-200 py-2 pr-4 font-medium text-neutral-500 dark:border-neutral-800";
export const tdClass = "border-b border-neutral-100 py-2 pr-4 align-top dark:border-neutral-900";
export const numClass = "text-right tabular-nums";

/** Placeholder shown while a page that depends on the URL streams in. */
export function PageSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-1/3 rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="h-4 w-2/3 rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="h-48 rounded bg-neutral-100 dark:bg-neutral-900" />
    </div>
  );
}
