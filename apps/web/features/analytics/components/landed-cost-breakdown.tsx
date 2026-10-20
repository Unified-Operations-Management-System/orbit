"use client";

import { useState } from "react";
import { chargeTypeLabels, type AllocationMethod, type Item, type PurchaseOrder, type Shipment } from "../data/cost-capture";
import { formatMoney, formatPercent, formatQuantity, formatUnitCost } from "../format";
import { Button, RadioGroup } from "@/components/ui";
import { PrototypeNotice, Section, numClass, tableClass, tdClass, thClass } from "./ui";

// Interactive part of W-CA-05 (UC-CA-14 Review Landed Cost Breakdown).

export function LandedCostBreakdown({ shipment, order, items }: { shipment: Shipment; order: PurchaseOrder; items: Item[] }) {
  const [view, setView] = useState<AllocationMethod>(shipment.allocationMethod);
  const [selected, setSelected] = useState(shipment.lines[0]?.id);

  const results = shipment.landedCost[view];
  const itemFor = (lineId: string) => {
    const line = shipment.lines.find((l) => l.id === lineId);
    const poLine = order.lines.find((l) => l.id === line?.purchaseOrderLineId);
    return items.find((i) => i.id === poLine?.itemId);
  };
  const receiptFor = (lineId: string) => shipment.receipt?.lines.find((r) => r.shipmentLineId === lineId);
  const chosen = results.find((r) => r.lineId === selected);
  const rateNote = shipment.settlement
    ? `settlement rate ${shipment.settlement.rate} on ${shipment.settlement.date}`
    : order.provisionalRate
      ? `provisional rate ${order.provisionalRate} (order date)`
      : null;

  function exportCsv() {
    const header = ["Item", "Ordered", "Usable", "Purchase value CAD", ...shipment.charges.map((c) => chargeTypeLabels[c.type]), "Landed cost CAD", "Per ordered unit", "Per usable unit"];
    const rows = results.map((r) => {
      const line = shipment.lines.find((l) => l.id === r.lineId);
      const receipt = receiptFor(r.lineId);
      return [
        itemFor(r.lineId)?.name ?? r.lineId,
        String(line?.quantityShipped ?? ""),
        receipt ? String(receipt.received - receipt.damaged - receipt.rejected) : "",
        r.purchaseValueCad,
        ...shipment.charges.map((c) => r.charges[c.id] ?? "0.00"),
        r.total,
        r.perOrderedUnit,
        r.perUsableUnit ?? "",
      ];
    });
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `landed-cost-${shipment.reference.replaceAll(" ", "")}-by-${view}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <RadioGroup
          inline
          label="Allocation method shown"
          value={view}
          onChange={(v) => setView(v as AllocationMethod)}
          options={(["value", "weight"] as const).map((m) => ({
            value: m,
            label: `By ${m} ${m === shipment.allocationMethod ? "(applied)" : "(compare)"}`,
          }))}
        />
        <Button variant="secondary" onClick={exportCsv}>
          Export CSV
        </Button>
      </div>
      {view !== shipment.allocationMethod && (
        <p className="text-sm text-muted">Comparison only: this shipment is costed by {shipment.allocationMethod}. Nothing is changed.</p>
      )}

      <table className={tableClass}>
        <thead>
          <tr>
            <th className={thClass}>Item</th>
            <th className={`${thClass} ${numClass}`}>Ordered</th>
            <th className={`${thClass} ${numClass}`}>Usable</th>
            <th className={`${thClass} ${numClass}`}>Purchase value</th>
            <th className={`${thClass} ${numClass}`}>Charges</th>
            <th className={`${thClass} ${numClass}`}>Landed cost</th>
            <th className={`${thClass} ${numClass}`}>Per ordered unit</th>
            <th className={`${thClass} ${numClass}`}>Per usable unit</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => {
            const item = itemFor(r.lineId);
            const line = shipment.lines.find((l) => l.id === r.lineId);
            const receipt = receiptFor(r.lineId);
            const usable = receipt ? receipt.received - receipt.damaged - receipt.rejected : null;
            const charges = (Number(r.total) - Number(r.purchaseValueCad)).toFixed(2);
            const isSelected = r.lineId === selected;
            return (
              <tr key={r.lineId} className={isSelected ? "bg-surface" : undefined}>
                <td className={tdClass}>
                  <button type="button" className={`text-left font-bold underline decoration-2 underline-offset-2 hover:text-red ${isSelected ? "decoration-red" : ""}`} aria-pressed={isSelected} onClick={() => setSelected(r.lineId)}>
                    {item?.name}
                  </button>
                  <div className="text-sm text-muted">{item?.unit}</div>
                </td>
                <td className={`${tdClass} ${numClass}`}>{formatQuantity(line?.quantityShipped ?? 0)}</td>
                <td className={`${tdClass} ${numClass}`}>{usable === null ? "—" : formatQuantity(usable)}</td>
                <td className={`${tdClass} ${numClass}`}>{formatMoney(r.purchaseValueCad)}</td>
                <td className={`${tdClass} ${numClass}`}>{formatMoney(charges)}</td>
                <td className={`${tdClass} ${numClass} font-bold`}>{formatMoney(r.total)}</td>
                <td className={`${tdClass} ${numClass}`}>{formatUnitCost(r.perOrderedUnit)}</td>
                <td className={`${tdClass} ${numClass} font-bold`}>
                  {usable === 0 ? (
                    <span className="text-red">No usable stock: full cost is a loss</span>
                  ) : r.perUsableUnit ? (
                    formatUnitCost(r.perUsableUnit)
                  ) : (
                    <span className="font-normal text-muted">Awaiting receipt</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {chosen && (
        <Section accent="red" title={`What makes up the landed cost of ${itemFor(chosen.lineId)?.name}`}>
          <ul className="flex flex-col gap-4">
            <BreakdownRow
              label="Purchase price"
              amount={chosen.purchaseValueCad}
              total={chosen.total}
              source={rateNote ? `Supplier invoice in ${order.currency}, converted at the ${rateNote}` : "Supplier invoice in CAD"}
            />
            {shipment.charges
              .filter((c) => Number(chosen.charges[c.id] ?? 0) !== 0)
              .map((c) => (
                <BreakdownRow
                  key={c.id}
                  label={chargeTypeLabels[c.type]}
                  amount={chosen.charges[c.id]}
                  total={chosen.total}
                  source={`Invoice ${c.invoiceRef}: ${formatMoney(c.amount, c.currency)}${
                    c.basis === "shared" ? `, shared by ${view}` : ", charged to this line only"
                  }${c.currency !== "CAD" && rateNote ? `, converted at the ${rateNote}` : ""}`}
                />
              ))}
          </ul>
          {(() => {
            const receipt = receiptFor(chosen.lineId);
            if (!receipt || receipt.damaged + receipt.rejected === 0 || !chosen.perUsableUnit) return null;
            const extra = (Number(chosen.perUsableUnit) - Number(chosen.perOrderedUnit)).toFixed(4);
            return (
              <p className="mt-4 text-sm text-muted">
                {receipt.damaged + receipt.rejected} unit(s) arrived unusable{receipt.reason ? ` (${receipt.reason.toLowerCase()})` : ""}. Spreading their cost over the
                usable units adds {formatUnitCost(extra)} to each one (RULE-CA-14, RULE-CA-15).
              </p>
            );
          })()}
        </Section>
      )}

      <PrototypeNotice>figures for {shipment.reference} are the API&apos;s expected results for this sample shipment (worked example in UC-CA-15).</PrototypeNotice>
    </div>
  );
}

function BreakdownRow({ label, amount, total, source }: { label: string; amount: string; total: string; source: string }) {
  const share = Math.max(0, Math.min(100, (Number(amount) / Number(total)) * 100));
  return (
    <li className="flex flex-col gap-1">
      <div className="flex justify-between gap-4">
        <span className="font-bold">{label}</span>
        <span className="tabular-nums">
          {formatMoney(amount)} <span className="text-muted">· {formatPercent(amount, total)}</span>
        </span>
      </div>
      <div className="h-3 bg-paper" aria-hidden="true">
        <div className="h-full bg-ink" style={{ width: `${share}%` }} />
      </div>
      <span className="text-sm text-muted">{source}</span>
    </li>
  );
}
