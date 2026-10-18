"use client";

import { useState } from "react";
import {
  chargeTypeLabels,
  type AllocationMethod,
  type ChargeType,
  type CurrencyCode,
  type Item,
  type PurchaseOrder,
  type Shipment,
  type ShipmentCharge,
} from "../data/cost-capture";
import { formatMoney, formatQuantity, formatUnitCost, toCents } from "../format";
import { Badge, Card, PrototypeNotice, numClass, tableClass, tdClass, thClass } from "./ui";

// Interactive part of W-CA-04 (UC-CA-12 Record Shipment Costs).
// The allocation shown is the API's precomputed result for the sample shipment; charges added
// here are listed but not allocated, because the calculation belongs to the Go API (UC-CA-15).

type DraftCharge = { type: ChargeType; amount: string; currency: CurrencyCode; invoiceRef: string; basis: string };
const emptyDraft: DraftCharge = { type: "freight", amount: "", currency: "USD", invoiceRef: "", basis: "shared" };

const inputClass = "w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700";

export function ShipmentCostEditor({ shipment, order, items }: { shipment: Shipment; order: PurchaseOrder; items: Item[] }) {
  const isFinal = shipment.costingStatus === "final";
  const [added, setAdded] = useState<ShipmentCharge[]>([]);
  const [draft, setDraft] = useState<DraftCharge>({ ...emptyDraft, currency: order.currency });
  const [message, setMessage] = useState<{ tone: "error" | "warn" | "info"; text: string } | null>(null);
  const [pendingDuplicate, setPendingDuplicate] = useState(false);
  const [method, setMethod] = useState<AllocationMethod>(shipment.allocationMethod);
  const [settlement, setSettlement] = useState({ rate: "", date: "" });
  const [finalized, setFinalized] = useState(false);

  const itemFor = (shipmentLineId: string) => {
    const line = shipment.lines.find((l) => l.id === shipmentLineId);
    const poLine = order.lines.find((l) => l.id === line?.purchaseOrderLineId);
    return items.find((i) => i.id === poLine?.itemId);
  };
  const lineLabel = (lineId: string) => itemFor(lineId)?.name ?? lineId;
  const allCharges = [...shipment.charges, ...added];

  function addCharge() {
    const cents = toCents(draft.amount.replace(/^-/, ""));
    const isCredit = draft.type === "supplier-credit";
    if (cents === null || cents === 0) {
      setMessage({ tone: "error", text: "Enter an amount above zero (extension 4e)." });
      return;
    }
    if (draft.type === "duty" && draft.basis === "shared") {
      setMessage({ tone: "error", text: "Customs duty belongs to the line(s) on the customs entry. Choose the line (RULE-CA-08)." });
      return;
    }
    if (isCredit && draft.basis === "shared") {
      setMessage({ tone: "error", text: "A supplier credit is recorded against the rejected line (RULE-CA-17)." });
      return;
    }
    const duplicate = draft.invoiceRef.trim() !== "" && allCharges.some((c) => c.invoiceRef === draft.invoiceRef.trim());
    if (duplicate && !pendingDuplicate) {
      setPendingDuplicate(true);
      setMessage({ tone: "warn", text: `Invoice ${draft.invoiceRef} is already on this shipment. Add it again only if it's a different charge.` });
      return;
    }
    setAdded([
      ...added,
      {
        id: `NEW-${added.length + 1}`,
        type: draft.type,
        amount: isCredit ? `-${draft.amount.replace(/^-/, "")}` : draft.amount,
        currency: draft.currency,
        invoiceRef: draft.invoiceRef.trim(),
        basis: draft.basis === "shared" ? "shared" : { lineId: draft.basis },
      },
    ]);
    setDraft({ ...emptyDraft, currency: order.currency });
    setPendingDuplicate(false);
    setMessage({ tone: "info", text: "Charge added. The API recalculates the allocation when it's saved (UC-CA-15)." });
  }

  const results = shipment.landedCost[shipment.allocationMethod];

  return (
    <div className="flex flex-col gap-6">
      <Card title="Lines on this shipment">
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>Item</th>
              <th className={`${thClass} ${numClass}`}>Shipped</th>
              <th className={`${thClass} ${numClass}`}>Weight</th>
              <th className={`${thClass} ${numClass}`}>Purchase value (CAD)</th>
              <th className={thClass}>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {shipment.lines.map((line) => {
              const item = itemFor(line.id);
              const received = shipment.receipt?.lines.find((r) => r.shipmentLineId === line.id);
              const value = results.find((r) => r.lineId === line.id)?.purchaseValueCad ?? "0";
              return (
                <tr key={line.id}>
                  <td className={tdClass}>
                    {item?.name} <span className="text-neutral-500">({item?.unit})</span>
                  </td>
                  <td className={`${tdClass} ${numClass}`}>{formatQuantity(line.quantityShipped)}</td>
                  <td className={`${tdClass} ${numClass}`}>{formatQuantity(Math.round((item?.weightKg ?? 0) * line.quantityShipped))} kg</td>
                  <td className={`${tdClass} ${numClass}`}>{formatMoney(value)}</td>
                  <td className={tdClass}>
                    {received ? (
                      <span>
                        {formatQuantity(received.received)} received
                        {received.damaged + received.rejected > 0 && (
                          <span className="text-neutral-500">
                            {" "}
                            · {received.damaged} damaged{received.rejected ? `, ${received.rejected} rejected` : ""}
                            {received.reason ? ` (${received.reason})` : ""}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-neutral-500">Awaiting receipt (mobile, UC-CA-13)</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {shipment.receipt?.discrepancy && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            {shipment.receipt.discrepancy}
          </p>
        )}
      </Card>

      <Card title="Charges">
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>Charge</th>
              <th className={thClass}>Invoice</th>
              <th className={`${thClass} ${numClass}`}>Amount</th>
              <th className={thClass}>Applies to</th>
            </tr>
          </thead>
          <tbody>
            {allCharges.map((c) => (
              <tr key={c.id}>
                <td className={tdClass}>
                  {chargeTypeLabels[c.type]} {c.id.startsWith("NEW") && <Badge tone="blue">Added now</Badge>}
                </td>
                <td className={tdClass}>{c.invoiceRef || "—"}</td>
                <td className={`${tdClass} ${numClass}`}>{formatMoney(c.amount, c.currency)}</td>
                <td className={tdClass}>
                  {c.basis === "shared" ? `Shared, by ${shipment.allocationMethod}` : `Only ${lineLabel(c.basis.lineId)}`}
                </td>
              </tr>
            ))}
            {shipment.recoverableTax.map((t) => (
              <tr key={t.id} className="text-neutral-500">
                <td className={tdClass}>{t.label}</td>
                <td className={tdClass}>—</td>
                <td className={`${tdClass} ${numClass}`}>{formatMoney(t.amount)}</td>
                <td className={tdClass}>Excluded from landed cost: recovered as an input tax credit (RULE-CA-09)</td>
              </tr>
            ))}
          </tbody>
        </table>

        {isFinal ? (
          <p className="mt-4 text-sm text-neutral-500">
            This landed cost is final, so charges can&apos;t be edited. A late charge is recorded as an adjustment that keeps the original figures (RULE-CA-13).
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <h3 className="text-sm font-semibold">Add a charge</h3>
            <div className="grid gap-3 sm:grid-cols-5">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-neutral-500">Type</span>
                <select
                  className={inputClass}
                  value={draft.type}
                  onChange={(e) => {
                    const type = e.target.value as ChargeType;
                    setDraft({ ...draft, type, basis: type === "duty" || type === "supplier-credit" ? shipment.lines[0].id : "shared" });
                  }}
                >
                  {(Object.keys(chargeTypeLabels) as ChargeType[]).map((t) => (
                    <option key={t} value={t}>
                      {chargeTypeLabels[t]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-neutral-500">Amount</span>
                <input inputMode="decimal" className={inputClass} value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-neutral-500">Currency</span>
                <select className={inputClass} value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value as CurrencyCode })}>
                  <option value="CAD">CAD</option>
                  <option value="USD">USD</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-neutral-500">Invoice reference</span>
                <input
                  className={inputClass}
                  value={draft.invoiceRef}
                  onChange={(e) => {
                    setPendingDuplicate(false);
                    setDraft({ ...draft, invoiceRef: e.target.value });
                  }}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-neutral-500">Applies to</span>
                <select className={inputClass} value={draft.basis} onChange={(e) => setDraft({ ...draft, basis: e.target.value })}>
                  <option value="shared">Shared across lines</option>
                  {shipment.lines.map((l) => (
                    <option key={l.id} value={l.id}>
                      Only {lineLabel(l.id)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={addCharge} className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">
                {pendingDuplicate ? "Add anyway" : "Add charge"}
              </button>
              {message && (
                <span
                  role={message.tone === "info" ? "status" : "alert"}
                  className={
                    message.tone === "error" ? "text-sm text-red-600" : message.tone === "warn" ? "text-sm text-amber-700" : "text-sm text-neutral-500"
                  }
                >
                  {message.text}
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500">GST/HST paid at the border goes under recoverable tax, not here. It isn&apos;t part of cost (RULE-CA-09).</p>
          </div>
        )}
      </Card>

      <Card title="Allocation method">
        <fieldset className="flex flex-wrap gap-6 text-sm" disabled={isFinal}>
          <legend className="sr-only">Allocation method</legend>
          {(["value", "weight"] as const).map((m) => (
            <label key={m} className="flex items-center gap-2">
              <input type="radio" name="method" checked={method === m} onChange={() => setMethod(m)} />
              By {m} {m === shipment.allocationMethod && <span className="text-neutral-500">(current)</span>}
            </label>
          ))}
        </fieldset>
        {isFinal && <p className="mt-2 text-sm text-neutral-500">The method can only change while the cost is provisional (RULE-CA-12).</p>}

        <table className={`${tableClass} mt-4`}>
          <thead>
            <tr>
              <th className={thClass}>Item</th>
              <th className={`${thClass} ${numClass}`}>Per unit, by value</th>
              <th className={`${thClass} ${numClass}`}>Per unit, by weight</th>
            </tr>
          </thead>
          <tbody>
            {shipment.lines.map((line) => {
              const byValue = shipment.landedCost.value.find((r) => r.lineId === line.id);
              const byWeight = shipment.landedCost.weight.find((r) => r.lineId === line.id);
              const unit = (r: typeof byValue) => r?.perUsableUnit ?? r?.perOrderedUnit ?? "0";
              return (
                <tr key={line.id}>
                  <td className={tdClass}>{lineLabel(line.id)}</td>
                  <td className={`${tdClass} ${numClass} ${method === "value" ? "font-semibold" : ""}`}>{formatUnitCost(unit(byValue))}</td>
                  <td className={`${tdClass} ${numClass} ${method === "weight" ? "font-semibold" : ""}`}>{formatUnitCost(unit(byWeight))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {method !== shipment.allocationMethod && !isFinal && (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span>
              Switch this shipment to <strong>by {method}</strong>? Unit costs change as shown above.
            </span>
            <button
              type="button"
              className="underline"
              onClick={() => setMessage({ tone: "info", text: `Allocation set to by ${method}. Saved when the API is connected.` })}
            >
              Confirm
            </button>
            <button type="button" className="text-neutral-500 underline" onClick={() => setMethod(shipment.allocationMethod)}>
              Keep by {shipment.allocationMethod}
            </button>
          </div>
        )}
        {!shipment.receipt && <p className="mt-2 text-xs text-neutral-500">Goods not received yet: figures are per ordered unit.</p>}
        <p className="mt-3 text-xs text-neutral-500">
          By value shares charges by each line&apos;s purchase value; by weight shares them by shipped kilograms. The more a line is worth per kilogram, the more the two methods differ.
        </p>
      </Card>

      <Card title="Settlement and completion">
        {shipment.settlement ? (
          <p className="text-sm">
            Supplier paid on {shipment.settlement.date} at <strong>{shipment.settlement.rate} CAD per {order.currency}</strong>. All charges complete. The landed cost is final.
          </p>
        ) : finalized ? (
          <p role="status" className="text-sm">
            Charges marked complete{order.currency !== "CAD" && ` and settled at ${settlement.rate}`}. The API would now mark this landed cost <strong>Final</strong> (RULE-CA-11).
          </p>
        ) : (
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (order.currency !== "CAD" && !(Number(settlement.rate) > 0 && settlement.date)) {
                setMessage({ tone: "error", text: "Enter the settlement rate and date the supplier was paid." });
                return;
              }
              setFinalized(true);
            }}
          >
            {order.currency !== "CAD" ? (
              <>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-neutral-500">Settlement rate (CAD per {order.currency})</span>
                  <input
                    inputMode="decimal"
                    className={inputClass}
                    placeholder={order.provisionalRate ?? ""}
                    value={settlement.rate}
                    onChange={(e) => setSettlement({ ...settlement, rate: e.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-neutral-500">Paid on</span>
                  <input type="date" className={inputClass} value={settlement.date} onChange={(e) => setSettlement({ ...settlement, date: e.target.value })} />
                </label>
              </>
            ) : (
              <p className="text-sm text-neutral-500">CAD purchase: no settlement rate needed.</p>
            )}
            <button type="submit" className="rounded-md border border-neutral-400 px-4 py-2 text-sm">
              Mark charges complete
            </button>
          </form>
        )}
      </Card>

      <PrototypeNotice>
        sample data for shipment {shipment.reference}. Added charges, method changes and settlement aren&apos;t saved until the cost endpoints exist
        (SCRUM-64, SCRUM-66, SCRUM-68).
      </PrototypeNotice>
    </div>
  );
}
