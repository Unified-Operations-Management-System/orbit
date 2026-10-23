import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, buttonClass, DataTable } from "@/components/ui";
import { centsToAmount, formatDate, formatMoney, toCents } from "../format";
import { getItems, getPurchaseOrder, getShipment, getShipments, getSuppliers } from "../queries";
import type { Shipment } from "../data/cost-capture";
import { missingForFinal } from "../status";
import { LandedCostBreakdown } from "./landed-cost-breakdown";
import { ShipmentCostEditor } from "./shipment-cost-editor";
import { AnalyticsPage, CostingStatusMark, StatusMark, linkClass } from "./ui";

function ReceiptMark({ shipment }: { shipment: Shipment }) {
  if (!shipment.receipt) return <StatusMark shape="bar" color="muted" text="muted" label="Awaiting receipt" />;
  if (shipment.receipt.discrepancy) return <StatusMark shape="triangle" color="yellow" label="Received · discrepancy" />;
  return <StatusMark shape="circle" color="blue" text="blue" label="Received" />;
}

// Shipment list: entry point to UC-CA-12 and UC-CA-14.
export function ShipmentList() {
  const shipments = getShipments();
  const suppliers = getSuppliers();

  return (
    <AnalyticsPage
      title="Shipments and landed cost"
      description="Each shipment collects its freight, insurance, duty and other charges. Landed cost stays provisional until the supplier is paid and the charges are complete."
    >
      <DataTable
        rows={shipments}
        rowKey={(s) => s.id}
        empty="No shipments yet."
        columns={[
          {
            key: "shipment",
            header: "Shipment",
            render: (s) => (
              <>
                <Link className={linkClass} href={`/analytics/shipments/${s.id}`}>
                  {s.reference}
                </Link>
                <div className="text-sm text-muted">{s.carrier}</div>
              </>
            ),
          },
          {
            key: "po",
            header: "Purchase order",
            render: (s) => {
              const po = getPurchaseOrder(s.purchaseOrderId);
              return (
                <Link className={linkClass} href={`/analytics/purchase-orders/${po?.id}`}>
                  {po?.number}
                </Link>
              );
            },
          },
          {
            key: "supplier",
            header: "Supplier",
            render: (s) => suppliers.find((x) => x.id === getPurchaseOrder(s.purchaseOrderId)?.supplierId)?.name,
          },
          { key: "arrival", header: "Arrival", render: (s) => formatDate(s.expectedArrival) },
          { key: "receipt", header: "Receipt", render: (s) => <ReceiptMark shipment={s} /> },
          { key: "costing", header: "Landed cost", render: (s) => <CostingStatusMark status={s.costingStatus} /> },
          {
            key: "total",
            header: "Total (CAD)",
            align: "right",
            render: (s) => {
              const totalCents = s.landedCost[s.allocationMethod].reduce((sum, l) => sum + (toCents(l.total) ?? 0), 0);
              return (
                <Link className={`${linkClass} tabular-nums`} href={`/analytics/shipments/${s.id}/landed-cost`}>
                  {formatMoney(centsToAmount(totalCents))}
                </Link>
              );
            },
          },
        ]}
      />
    </AnalyticsPage>
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
    <AnalyticsPage
      back={{ href: "/analytics/shipments", label: "Shipments" }}
      title={shipment.reference}
      status={<CostingStatusMark status={shipment.costingStatus} />}
      description={
        <>
          {shipment.carrier} · for{" "}
          <Link className={`${linkClass} text-ink`} href={`/analytics/purchase-orders/${order.id}`}>
            {order.number}
          </Link>{" "}
          from {supplier?.name} · arrival {formatDate(shipment.expectedArrival)}
          {missing.length > 0 && <> · Provisional until: {missing.join(", ")}</>}
        </>
      }
      actions={
        <Link href={`/analytics/shipments/${shipment.id}/landed-cost`} className={buttonClass("secondary")}>
          View landed cost breakdown
        </Link>
      }
    >
      <ShipmentCostEditor shipment={shipment} order={order} items={items} />
    </AnalyticsPage>
  );
}

// W-CA-05: landed cost breakdown (UC-CA-14).
export function ShipmentLandedCost({ id }: { id: string }) {
  const { shipment, order, supplier, items } = loadShipmentContext(id);
  const missing = missingForFinal(shipment, order);

  return (
    <AnalyticsPage
      back={{ href: `/analytics/shipments/${shipment.id}`, label: `${shipment.reference} charges` }}
      title={`Landed cost · ${shipment.reference}`}
      status={<CostingStatusMark status={shipment.costingStatus} />}
      description={`${order.number} from ${supplier?.name}. ${
        shipment.settlement
          ? `Foreign amounts converted at the settlement rate ${shipment.settlement.rate} (${formatDate(shipment.settlement.date)}).`
          : order.provisionalRate
            ? `Foreign amounts converted at the provisional order-date rate ${order.provisionalRate}.`
            : "All amounts in CAD."
      }`}
    >
      {missing.length > 0 && (
        <Alert tone="warning" title="These figures are provisional and may change.">
          <span className="text-sm">Still missing: {missing.join(", ")}.</span>
        </Alert>
      )}
      <LandedCostBreakdown shipment={shipment} order={order} items={items} />
    </AnalyticsPage>
  );
}
