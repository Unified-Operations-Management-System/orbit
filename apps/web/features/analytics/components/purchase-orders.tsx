import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass, DataTable } from "@/components/ui";
import { centsToAmount, formatDate, formatMoney, formatQuantity, toCents } from "../format";
import { getItems, getPurchaseOrder, getPurchaseOrders, getShipmentsForPurchaseOrder, getSuppliers } from "../queries";
import type { PurchaseOrder } from "../data/cost-capture";
import {
  AnalyticsPage,
  CostingStatusMark,
  PurchaseOrderStatusMark,
  Section,
  linkClass,
  numClass,
  tableClass,
  tdClass,
  thClass,
} from "./ui";

function orderTotal(po: PurchaseOrder) {
  const cents = po.lines.reduce((sum, l) => sum + l.quantity * (toCents(l.unitPrice) ?? 0), 0);
  return centsToAmount(cents);
}

const newOrderLink = (
  <Link href="/analytics/purchase-orders/new" className={buttonClass()}>
    New purchase order
  </Link>
);

// W-CA-02: purchase order list (UC-CA-11 step 1).
export function PurchaseOrderList() {
  const orders = getPurchaseOrders();
  const suppliers = getSuppliers();

  return (
    <AnalyticsPage
      title="Purchase orders"
      description="Every purchase starts here. Charges and receipts are recorded against the order's shipments."
      actions={newOrderLink}
    >
      <DataTable
        rows={orders}
        rowKey={(po) => po.id}
        empty="No purchase orders yet."
        columns={[
          {
            key: "number",
            header: "Number",
            render: (po) => (
              <Link className={linkClass} href={`/analytics/purchase-orders/${po.id}`}>
                {po.number}
              </Link>
            ),
          },
          { key: "supplier", header: "Supplier", render: (po) => suppliers.find((s) => s.id === po.supplierId)?.name },
          { key: "ordered", header: "Ordered", render: (po) => formatDate(po.orderDate) },
          { key: "expected", header: "Expected", render: (po) => formatDate(po.expectedDelivery) },
          { key: "status", header: "Status", render: (po) => <PurchaseOrderStatusMark status={po.status} /> },
          {
            key: "total",
            header: "Total",
            align: "right",
            render: (po) => <span className="tabular-nums">{formatMoney(orderTotal(po), po.currency)}</span>,
          },
        ]}
      />
    </AnalyticsPage>
  );
}

// Purchase order detail (UC-CA-11 step 10, and the entry point to UC-CA-12 step 1).
export function PurchaseOrderDetail({ id }: { id: string }) {
  const po = getPurchaseOrder(id);
  if (!po) notFound();

  const supplier = getSuppliers().find((s) => s.id === po.supplierId);
  const items = getItems();
  const shipments = getShipmentsForPurchaseOrder(po.id);

  return (
    <AnalyticsPage
      back={{ href: "/analytics/purchase-orders", label: "Purchase orders" }}
      title={po.number}
      status={<PurchaseOrderStatusMark status={po.status} />}
      description={`${supplier?.name} · ${supplier?.country} · ${supplier?.paymentTerms}`}
    >
      <dl className="grid gap-4 sm:grid-cols-4">
        <Field label="Ordered" value={formatDate(po.orderDate)} />
        <Field label="Expected delivery" value={formatDate(po.expectedDelivery)} />
        <Field label="Currency" value={po.currency} />
        <Field
          label="Provisional rate"
          value={po.provisionalRate ? `1 ${po.currency} = ${po.provisionalRate} CAD (order date)` : "Not needed (CAD)"}
        />
      </dl>

      <Section title="Lines">
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>Item</th>
              <th className={`${thClass} ${numClass}`}>Quantity</th>
              <th className={`${thClass} ${numClass}`}>Unit price</th>
              <th className={`${thClass} ${numClass}`}>Line total</th>
            </tr>
          </thead>
          <tbody>
            {po.lines.map((line) => {
              const item = items.find((i) => i.id === line.itemId);
              return (
                <tr key={line.id}>
                  <td className={tdClass}>
                    {item?.name} <span className="text-muted">({item?.unit})</span>
                  </td>
                  <td className={`${tdClass} ${numClass}`}>{formatQuantity(line.quantity)}</td>
                  <td className={`${tdClass} ${numClass}`}>{formatMoney(line.unitPrice, po.currency)}</td>
                  <td className={`${tdClass} ${numClass}`}>
                    {formatMoney(centsToAmount(line.quantity * (toCents(line.unitPrice) ?? 0)), po.currency)}
                  </td>
                </tr>
              );
            })}
            <tr>
              <td className="border-t-2 border-ink py-3 font-bold" colSpan={3}>
                Total
              </td>
              <td className={`border-t-2 border-ink py-3 font-bold ${numClass}`}>{formatMoney(orderTotal(po), po.currency)}</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Shipments">
        {shipments.length === 0 ? (
          <p className="text-muted">
            No shipment yet. When the supplier ships, the bookkeeper records it here with its charges (UC-CA-12).
          </p>
        ) : (
          <ul className="flex flex-col border-t-2 border-ink">
            {shipments.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 border-b border-line py-3">
                <Link className={linkClass} href={`/analytics/shipments/${s.id}`}>
                  {s.reference}
                </Link>
                <span className="text-sm text-muted">
                  {s.carrier} · arrival {formatDate(s.expectedArrival)}
                </span>
                <span className="ml-auto">
                  <CostingStatusMark status={s.costingStatus} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </AnalyticsPage>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
