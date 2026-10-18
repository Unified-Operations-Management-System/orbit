import Link from "next/link";
import { notFound } from "next/navigation";
import { centsToAmount, formatDate, formatMoney, formatQuantity, toCents } from "../format";
import { getItems, getPurchaseOrder, getPurchaseOrders, getShipmentsForPurchaseOrder, getSuppliers } from "../queries";
import type { PurchaseOrder } from "../data/cost-capture";
import {
  Card,
  CostingStatusBadge,
  PageHeader,
  PrimaryLink,
  PurchaseOrderStatusBadge,
  numClass,
  tableClass,
  tdClass,
  thClass,
} from "./ui";

function orderTotal(po: PurchaseOrder) {
  const cents = po.lines.reduce((sum, l) => sum + l.quantity * (toCents(l.unitPrice) ?? 0), 0);
  return centsToAmount(cents);
}

// W-CA-02: purchase order list (UC-CA-11 step 1).
export function PurchaseOrderList() {
  const orders = getPurchaseOrders();
  const suppliers = getSuppliers();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Purchase orders"
        description="Every purchase starts here. Charges and receipts are recorded against the order's shipments."
        actions={<PrimaryLink href="/analytics/purchase-orders/new">New purchase order</PrimaryLink>}
      />
      <table className={tableClass}>
        <thead>
          <tr>
            <th className={thClass}>Number</th>
            <th className={thClass}>Supplier</th>
            <th className={thClass}>Ordered</th>
            <th className={thClass}>Expected</th>
            <th className={thClass}>Status</th>
            <th className={`${thClass} ${numClass}`}>Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((po) => (
            <tr key={po.id}>
              <td className={tdClass}>
                <Link className="font-medium underline" href={`/analytics/purchase-orders/${po.id}`}>
                  {po.number}
                </Link>
              </td>
              <td className={tdClass}>{suppliers.find((s) => s.id === po.supplierId)?.name}</td>
              <td className={tdClass}>{formatDate(po.orderDate)}</td>
              <td className={tdClass}>{formatDate(po.expectedDelivery)}</td>
              <td className={tdClass}>
                <PurchaseOrderStatusBadge status={po.status} />
              </td>
              <td className={`${tdClass} ${numClass}`}>{formatMoney(orderTotal(po), po.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/analytics/purchase-orders", label: "Purchase orders" }}
        title={
          <span className="flex items-center gap-3">
            {po.number} <PurchaseOrderStatusBadge status={po.status} />
          </span>
        }
        description={`${supplier?.name} · ${supplier?.country} · ${supplier?.paymentTerms}`}
      />

      <dl className="grid gap-4 text-sm sm:grid-cols-4">
        <Field label="Ordered" value={formatDate(po.orderDate)} />
        <Field label="Expected delivery" value={formatDate(po.expectedDelivery)} />
        <Field label="Currency" value={po.currency} />
        <Field
          label="Provisional rate"
          value={po.provisionalRate ? `1 ${po.currency} = ${po.provisionalRate} CAD (order date)` : "Not needed (CAD)"}
        />
      </dl>

      <Card title="Lines">
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
                    {item?.name} <span className="text-neutral-500">({item?.unit})</span>
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
              <td className="py-2 font-medium" colSpan={3}>
                Total
              </td>
              <td className={`py-2 font-medium ${numClass}`}>{formatMoney(orderTotal(po), po.currency)}</td>
            </tr>
          </tbody>
        </table>
      </Card>

      <Card title="Shipments">
        {shipments.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No shipment yet. When the supplier ships, the bookkeeper records it here with its charges (UC-CA-12).
          </p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {shipments.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3">
                <Link className="font-medium underline" href={`/analytics/shipments/${s.id}`}>
                  {s.reference}
                </Link>
                <span className="text-neutral-500">
                  {s.carrier} · arrival {formatDate(s.expectedArrival)}
                </span>
                <CostingStatusBadge status={s.costingStatus} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
