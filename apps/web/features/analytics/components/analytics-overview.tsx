import Link from "next/link";
import { centsToAmount, formatMoney, toCents } from "../format";
import { getPurchaseOrder, getPurchaseOrders, getShipments } from "../queries";
import { missingForFinal } from "../status";
import { Badge, Card, PageHeader, PrimaryLink } from "./ui";

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
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Cost Analytics and Reporting"
        description="Follow the money: what materials really cost once they reach the warehouse, what each unit costs to make, and which products and customers are profitable."
        actions={<PrimaryLink href="/analytics/purchase-orders/new">New purchase order</PrimaryLink>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Open purchase orders" value={String(openOrders)} href="/analytics/purchase-orders" />
        <Stat label="Shipments with provisional cost" value={String(provisional.length)} href="/analytics/shipments" />
        <Stat label="Awaiting goods receipt" value={String(awaitingReceipt.length)} href="/analytics/shipments" />
        <Stat label="Landed cost finalized (CAD)" value={formatMoney(centsToAmount(finalLandedCents))} href="/analytics/shipments" />
      </div>

      {(discrepancies.length > 0 || provisional.length > 0) && (
        <Card title="Needs attention">
          <ul className="flex flex-col gap-2 text-sm">
            {discrepancies.map((s) => (
              <li key={`d-${s.id}`}>
                <Link className="underline" href={`/analytics/shipments/${s.id}`}>
                  {s.reference}
                </Link>{" "}
                <span className="text-neutral-500">{s.receipt?.discrepancy}</span>
              </li>
            ))}
            {provisional.map((s) => (
              <li key={`p-${s.id}`}>
                <Link className="underline" href={`/analytics/shipments/${s.id}`}>
                  {s.reference}
                </Link>{" "}
                <span className="text-neutral-500">
                  Landed cost is provisional. Missing: {missingForFinal(s, getPurchaseOrder(s.purchaseOrderId)).join(", ")}.
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Features in this area</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const body = (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{f.name}</span>
                  {f.iteration ? <Badge>Planned · {f.iteration}</Badge> : <Badge tone="green">Available</Badge>}
                </div>
                <p className="text-sm text-neutral-500">{f.description}</p>
                <span className="text-xs text-neutral-400">{f.useCase}</span>
              </>
            );
            return f.href ? (
              <Link
                key={f.name}
                href={f.href}
                className="flex flex-col gap-2 rounded-lg border border-neutral-300 p-4 hover:border-foreground dark:border-neutral-700"
              >
                {body}
              </Link>
            ) : (
              <div
                key={f.name}
                aria-disabled="true"
                className="flex flex-col gap-2 rounded-lg border border-dashed border-neutral-200 p-4 opacity-70 dark:border-neutral-800"
              >
                {body}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="flex flex-col gap-1 rounded-lg border border-neutral-200 p-4 hover:border-foreground dark:border-neutral-800">
      <span className="text-xs text-neutral-500">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
    </Link>
  );
}
