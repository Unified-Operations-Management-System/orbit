import Link from "next/link";
import { notFound } from "next/navigation";
import { centsToAmount, formatDate, formatMoney, toCents } from "../format";
import { getItems, getPurchaseOrder, getShipment, getShipments, getSuppliers } from "../queries";
import { missingForFinal } from "../status";
import { LandedCostBreakdown } from "./landed-cost-breakdown";
import { ShipmentCostEditor } from "./shipment-cost-editor";
import { Badge, CostingStatusBadge, PageHeader, numClass, tableClass, tdClass, thClass } from "./ui";

// Shipment list: entry point to UC-CA-12 and UC-CA-14.
export function ShipmentList() {
  const shipments = getShipments();
  const suppliers = getSuppliers();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Shipments and landed cost"
        description="Each shipment collects its freight, insurance, duty and other charges. Landed cost stays provisional until the supplier is paid and the charges are complete."
      />
      <table className={tableClass}>
        <thead>
          <tr>
            <th className={thClass}>Shipment</th>
            <th className={thClass}>Purchase order</th>
            <th className={thClass}>Supplier</th>
            <th className={thClass}>Arrival</th>
            <th className={thClass}>Receipt</th>
            <th className={thClass}>Landed cost</th>
            <th className={`${thClass} ${numClass}`}>Total (CAD)</th>
          </tr>
        </thead>
        <tbody>
          {shipments.map((s) => {
            const po = getPurchaseOrder(s.purchaseOrderId);
            const totalCents = s.landedCost[s.allocationMethod].reduce((sum, l) => sum + (toCents(l.total) ?? 0), 0);
            return (
              <tr key={s.id}>
                <td className={tdClass}>
                  <Link className="font-medium underline" href={`/analytics/shipments/${s.id}`}>
                    {s.reference}
                  </Link>
                  <div className="text-xs text-neutral-500">{s.carrier}</div>
                </td>
                <td className={tdClass}>
                  <Link className="underline" href={`/analytics/purchase-orders/${po?.id}`}>
                    {po?.number}
                  </Link>
                </td>
                <td className={tdClass}>{suppliers.find((x) => x.id === po?.supplierId)?.name}</td>
                <td className={tdClass}>{formatDate(s.expectedArrival)}</td>
                <td className={tdClass}>
                  {s.receipt ? (
                    s.receipt.discrepancy ? <Badge tone="amber">Received · discrepancy</Badge> : <Badge tone="green">Received</Badge>
                  ) : (
                    <Badge>Awaiting receipt</Badge>
                  )}
                </td>
                <td className={tdClass}>
                  <CostingStatusBadge status={s.costingStatus} />
                </td>
                <td className={`${tdClass} ${numClass}`}>
                  <Link className="underline" href={`/analytics/shipments/${s.id}/landed-cost`}>
                    {formatMoney(centsToAmount(totalCents))}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function loadShipmentContext(id: string) {
  const shipment = getShipment(id);
  if (!shipment) notFound();
  const order = getPurchaseOrder(shipment.purchaseOrderId);
  if (!order) notFound();
  const supplier = getSuppliers().find((s) => s.id === order.supplierId);
  return { shipment, order, supplier, items: getItems() };
}

// W-CA-04: record shipment costs (UC-CA-12).
export function ShipmentCosts({ id }: { id: string }) {
  const { shipment, order, supplier, items } = loadShipmentContext(id);
  const missing = missingForFinal(shipment, order);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/analytics/shipments", label: "Shipments" }}
        title={
          <span className="flex items-center gap-3">
            {shipment.reference} <CostingStatusBadge status={shipment.costingStatus} />
          </span>
        }
        description={
          <>
            {shipment.carrier} · for{" "}
            <Link className="underline" href={`/analytics/purchase-orders/${order.id}`}>
              {order.number}
            </Link>{" "}
            from {supplier?.name} · arrival {formatDate(shipment.expectedArrival)}
            {missing.length > 0 && <> · Provisional until: {missing.join(", ")}</>}
          </>
        }
        actions={
          <Link
            href={`/analytics/shipments/${shipment.id}/landed-cost`}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
          >
            View landed cost breakdown
          </Link>
        }
      />
      <ShipmentCostEditor shipment={shipment} order={order} items={items} />
    </div>
  );
}

// W-CA-05: landed cost breakdown (UC-CA-14).
export function ShipmentLandedCost({ id }: { id: string }) {
  const { shipment, order, supplier, items } = loadShipmentContext(id);
  const missing = missingForFinal(shipment, order);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: `/analytics/shipments/${shipment.id}`, label: `${shipment.reference} charges` }}
        title={
          <span className="flex items-center gap-3">
            Landed cost · {shipment.reference} <CostingStatusBadge status={shipment.costingStatus} />
          </span>
        }
        description={`${order.number} from ${supplier?.name}. ${
          shipment.settlement
            ? `Foreign amounts converted at the settlement rate ${shipment.settlement.rate} (${formatDate(shipment.settlement.date)}).`
            : order.provisionalRate
              ? `Foreign amounts converted at the provisional order-date rate ${order.provisionalRate}.`
              : "All amounts in CAD."
        }`}
      />
      {missing.length > 0 && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          These figures are provisional and may change. Still missing: {missing.join(", ")}.
        </p>
      )}
      <LandedCostBreakdown shipment={shipment} order={order} items={items} />
    </div>
  );
}
