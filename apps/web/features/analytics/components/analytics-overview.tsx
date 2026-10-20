import Link from "next/link";
import type { ColorToken } from "@orbit/design-tokens";
import { Alert, Badge, buttonClass, Card, StatCard } from "@/components/ui";
import { centsToAmount, formatMoney, toCents } from "../format";
import { getPurchaseOrder, getPurchaseOrders, getShipments } from "../queries";
import { missingForFinal } from "../status";
import { AnalyticsPage, linkClass } from "./ui";

// W-CA-01: landing page of the Cost Analytics and Reporting area (UC-CA-00).
// Shows every feature of the area so the prototype covers the whole functional area,
// with Cost Capture (the Inception feature) live and the rest marked by planned iteration.

const features = [
  {
    name: "Cost Capture",
    useCase: "UC-CA-10",
    description: "Purchase orders, shipment charges and goods receipts become a landed cost per usable unit.",
    href: "/analytics/shipments",
    iteration: null,
  },
  {
    name: "Production Cost Tracking",
    useCase: "UC-CA-20",
    description: "Material, approved labour hours and overhead joined per production run.",
    iteration: "Iteration 12",
  },
  {
    name: "Orders, Invoicing and Receivables",
    useCase: "UC-CA-30",
    description: "Invoices from completed orders, payments received and overdue ageing.",
    iteration: "Iteration 15",
  },
  {
    name: "Contracts and Obligations",
    useCase: "UC-CA-40",
    description: "Customer and supplier contracts, plus licence expiry alerts.",
    iteration: "Iteration 15",
  },
  {
    name: "Cash and Payment Calendar",
    useCase: "UC-CA-50",
    description: "Money in and out over the next 30, 60 and 90 days.",
    iteration: "Iteration 15",
  },
  {
    name: "Analytics and Reporting",
    useCase: "UC-CA-60",
    description: "Margin by product and customer, yield and cost-of-waste trends.",
    iteration: "Iteration 15",
  },
  {
    name: "Accounting Integration",
    useCase: "UC-CA-70",
    description: "Invoices, payments, bills and approved hours sent to QuickBooks Online.",
    iteration: "Iteration 17",
  },
];

export function AnalyticsOverview() {
  const orders = getPurchaseOrders();
  const shipments = getShipments();

  const openOrders = orders.filter((po) => po.status === "open").length;
  const provisional = shipments.filter((s) => s.costingStatus === "provisional");
  const awaitingReceipt = shipments.filter((s) => !s.receipt);
  const discrepancies = shipments.filter((s) => s.receipt?.discrepancy);
  const finalLandedCents = shipments
    .filter((s) => s.costingStatus === "final")
    .flatMap((s) => s.landedCost[s.allocationMethod])
    .reduce((sum, line) => sum + (toCents(line.total) ?? 0), 0);

  return (
    <AnalyticsPage
      title="Cost Analytics and Reporting"
      description="Follow the money: what materials really cost once they reach the warehouse, what each unit costs to make, and which products and customers are profitable."
      actions={
        <Link href="/analytics/purchase-orders/new" className={buttonClass()}>
          New purchase order
        </Link>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Open purchase orders" value={String(openOrders)} href="/analytics/purchase-orders" accent="blue" />
        <Stat label="Provisional landed cost" value={String(provisional.length)} href="/analytics/shipments" accent="yellow" />
        <Stat label="Awaiting goods receipt" value={String(awaitingReceipt.length)} href="/analytics/shipments" accent="ink" />
        <Stat label="Finalized (CAD)" value={formatMoney(centsToAmount(finalLandedCents))} href="/analytics/shipments" accent="red" />
      </div>

      {(discrepancies.length > 0 || provisional.length > 0) && (
        <section aria-label="Needs attention" className="flex flex-col gap-3">
          <h2 className="text-[22px] font-bold">Needs attention</h2>
          {discrepancies.map((s) => (
            <Alert key={`d-${s.id}`} tone="warning" title={`${s.reference}: receipt discrepancy`} action={<Link className={linkClass} href={`/analytics/shipments/${s.id}`}>Open shipment</Link>}>
              <span className="text-sm">{s.receipt?.discrepancy}</span>
            </Alert>
          ))}
          {provisional.map((s) => (
            <Alert key={`p-${s.id}`} tone="info" title={`${s.reference}: landed cost is provisional`} action={<Link className={linkClass} href={`/analytics/shipments/${s.id}`}>Open shipment</Link>}>
              <span className="text-sm">Missing: {missingForFinal(s, getPurchaseOrder(s.purchaseOrderId)).join(", ")}.</span>
            </Alert>
          ))}
        </section>
      )}

      <section aria-label="Features in this area" className="flex flex-col gap-3">
        <h2 className="text-[22px] font-bold">Features in this area</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const body = (
              <Card accent={f.href ? "red" : "line"} className="flex h-full flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold">{f.name}</span>
                  {f.iteration ? <Badge>{f.iteration}</Badge> : <Badge tone="danger">Available</Badge>}
                </div>
                <p className="text-sm text-muted">{f.description}</p>
                <span className="mt-auto text-xs font-bold uppercase tracking-[0.12em] text-muted">{f.useCase}</span>
              </Card>
            );
            return f.href ? (
              <Link key={f.name} href={f.href} className="outline-ink hover:[&>div]:bg-line focus-visible:outline-2 focus-visible:outline-offset-2">
                {body}
              </Link>
            ) : (
              <div key={f.name} aria-disabled="true">
                {body}
              </div>
            );
          })}
        </div>
      </section>
    </AnalyticsPage>
  );
}

function Stat({ label, value, href, accent }: { label: string; value: string; href: string; accent: ColorToken }) {
  return (
    <Link href={href} className="outline-ink hover:[&>div]:bg-line focus-visible:outline-2 focus-visible:outline-offset-2">
      <StatCard label={label} value={value} accent={accent} />
    </Link>
  );
}
