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
import { Alert, Badge, Button, DateInput, Input, RadioGroup, Select } from "@/components/ui";
import { PrototypeNotice, Section, numClass, tableClass, tdClass, thClass } from "./ui";

// Interactive part of W-CA-04 (UC-CA-12 Record Shipment Costs).
// The allocation shown is the API's precomputed result for the sample shipment; charges added
// here are listed but not allocated, because the calculation belongs to the Go API (UC-CA-15).

type DraftCharge = { type: ChargeType; amount: string; currency: CurrencyCode; invoiceRef: string; basis: string };
const emptyDraft: DraftCharge = { type: "freight", amount: "", currency: "USD", invoiceRef: "", basis: "shared" };

const currencyOptions = [
  { value: "CAD", label: "CAD" },
  { value: "USD", label: "USD" },
];
const messageTone = { error: "error", warn: "warning", info: "info" } as const;

export function ShipmentCostEditor({ shipment, order, items }: { shipment: Shipment; order: PurchaseOrder; items: Item[] }) {
  const isFinal = shipment.costingStatus === "final";
  const [added, setAdded] = useState<ShipmentCharge[]>([]);
  const [draft, setDraft] = useState<DraftCharge>({ ...emptyDraft, currency: order.currency });
  const [message, setMessage] = useState<{ tone: "error" | "warn" | "info"; text: string } | null>(null);
  const [pendingDuplicate, setPendingDuplicate] = useState(false);
  const [method, setMethod] = useState<AllocationMethod>(shipment.allocationMethod);
  const [settlement, setSettlement] = useState({ rate: "", date: "" });
  const [finalized, setFinalized] = useState(false);
  const [settlementError, setSettlementError] = useState<string>();

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
      <Section title="Lines on this shipment">
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
                    {item?.name} <span className="text-muted">({item?.unit})</span>
                  </td>
                  <td className={`${tdClass} ${numClass}`}>{formatQuantity(line.quantityShipped)}</td>
                  <td className={`${tdClass} ${numClass}`}>{formatQuantity(Math.round((item?.weightKg ?? 0) * line.quantityShipped))} kg</td>
                  <td className={`${tdClass} ${numClass}`}>{formatMoney(value)}</td>
                  <td className={tdClass}>
                    {received ? (
                      <span>
                        {formatQuantity(received.received)} received
                        {received.damaged + received.rejected > 0 && (
                          <span className="text-muted">
                            {" "}
                            · {received.damaged} damaged{received.rejected ? `, ${received.rejected} rejected` : ""}
                            {received.reason ? ` (${received.reason})` : ""}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted">Awaiting receipt (mobile, UC-CA-13)</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {shipment.receipt?.discrepancy && (
          <div className="mt-4">
            <Alert tone="warning" title="Receipt discrepancy">
              <span className="text-sm">{shipment.receipt.discrepancy}</span>
            </Alert>
          </div>
        )}
      </Section>

      <Section title="Charges">
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
                  <span className="flex flex-wrap items-center gap-2">
                    {chargeTypeLabels[c.type]} {c.id.startsWith("NEW") && <Badge tone="info">Added now</Badge>}
                  </span>
                </td>
                <td className={tdClass}>{c.invoiceRef || "—"}</td>
                <td className={`${tdClass} ${numClass}`}>{formatMoney(c.amount, c.currency)}</td>
                <td className={tdClass}>
                  {c.basis === "shared" ? `Shared, by ${shipment.allocationMethod}` : `Only ${lineLabel(c.basis.lineId)}`}
                </td>
              </tr>
            ))}
            {shipment.recoverableTax.map((t) => (
              <tr key={t.id} className="text-muted">
                <td className={tdClass}>{t.label}</td>
                <td className={tdClass}>—</td>
                <td className={`${tdClass} ${numClass}`}>{formatMoney(t.amount)}</td>
                <td className={tdClass}>Excluded from landed cost: recovered as an input tax credit (RULE-CA-09)</td>
              </tr>
            ))}
          </tbody>
        </table>

        {isFinal ? (
          <p className="mt-4 text-sm text-muted">
            This landed cost is final, so charges can&apos;t be edited. A late charge is recorded as an adjustment that keeps the original figures (RULE-CA-13).
          </p>
        ) : (
          <div className="mt-6 flex flex-col gap-4 border-t-2 border-ink pt-4">
            <h3 className="font-bold">Add a charge</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Select
                label="Type"
                value={draft.type}
                options={(Object.keys(chargeTypeLabels) as ChargeType[]).map((t) => ({ value: t, label: chargeTypeLabels[t] }))}
                onChange={(v) => {
                  const type = v as ChargeType;
                  setDraft({ ...draft, type, basis: type === "duty" || type === "supplier-credit" ? shipment.lines[0].id : "shared" });
                }}
              />
              <Input label="Amount" inputMode="decimal" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
              <Select label="Currency" value={draft.currency} options={currencyOptions} onChange={(v) => setDraft({ ...draft, currency: v as CurrencyCode })} />
              <Input
                label="Invoice reference"
                value={draft.invoiceRef}
                onChange={(e) => {
                  setPendingDuplicate(false);
                  setDraft({ ...draft, invoiceRef: e.target.value });
                }}
              />
              <Select
                label="Applies to"
                value={draft.basis}
                onChange={(v) => setDraft({ ...draft, basis: v })}
                options={[
                  { value: "shared", label: "Shared across lines" },
                  ...shipment.lines.map((l) => ({ value: l.id, label: `Only ${lineLabel(l.id)}` })),
                ]}
              />
            </div>
            <div>
              <Button type="button" onClick={addCharge}>
                {pendingDuplicate ? "Add anyway" : "Add charge"}
              </Button>
            </div>
            {message && <Alert tone={messageTone[message.tone]} title={message.text} />}
            <p className="text-sm text-muted">GST/HST paid at the border goes under recoverable tax, not here. It isn&apos;t part of cost (RULE-CA-09).</p>
          </div>
        )}
      </Section>

      <Section title="Allocation method">
        <RadioGroup
          inline
          label="Share charges"
          value={method}
          onChange={(v) => setMethod(v as AllocationMethod)}
          disabled={isFinal}
          hint={isFinal ? "The method can only change while the cost is provisional (RULE-CA-12)." : undefined}
          options={(["value", "weight"] as const).map((m) => ({
            value: m,
            label: `By ${m}${m === shipment.allocationMethod ? " (current)" : ""}`,
          }))}
        />

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
                  <td className={`${tdClass} ${numClass} ${method === "value" ? "font-bold" : "text-muted"}`}>{formatUnitCost(unit(byValue))}</td>
                  <td className={`${tdClass} ${numClass} ${method === "weight" ? "font-bold" : "text-muted"}`}>{formatUnitCost(unit(byWeight))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {method !== shipment.allocationMethod && !isFinal && (
          <div className="mt-4">
            <Alert
              tone="warning"
              title={`Switch this shipment to by ${method}?`}
              action={
                <span className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setMessage({ tone: "info", text: `Allocation set to by ${method}. Saved when the API is connected.` })}
                  >
                    Confirm
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setMethod(shipment.allocationMethod)}>
                    Keep by {shipment.allocationMethod}
                  </Button>
                </span>
              }
            >
              <span className="text-sm">Unit costs change as shown above.</span>
            </Alert>
          </div>
        )}
        {!shipment.receipt && <p className="mt-3 text-sm text-muted">Goods not received yet: figures are per ordered unit.</p>}
        <p className="mt-3 text-sm text-muted">
          By value shares charges by each line&apos;s purchase value; by weight shares them by shipped kilograms. The more a line is worth per kilogram, the more the two methods differ.
        </p>
      </Section>

      <Section title="Settlement and completion">
        {shipment.settlement ? (
          <p>
            Supplier paid on {shipment.settlement.date} at <strong>{shipment.settlement.rate} CAD per {order.currency}</strong>. All charges complete. The landed cost is final.
          </p>
        ) : finalized ? (
          <Alert tone="success" title="Charges marked complete">
            <span className="text-sm">
              {order.currency !== "CAD" && `Settled at ${settlement.rate}. `}The API would now mark this landed cost <strong>Final</strong> (RULE-CA-11).
            </span>
          </Alert>
        ) : (
          <form
            className="flex flex-wrap items-end gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (order.currency !== "CAD" && !(Number(settlement.rate) > 0 && settlement.date)) {
                setSettlementError("Enter the settlement rate and date the supplier was paid.");
                return;
              }
              setSettlementError(undefined);
              setFinalized(true);
            }}
          >
            {order.currency !== "CAD" ? (
              <>
                <div className="w-64">
                  <Input
                    label={`Settlement rate (CAD per ${order.currency})`}
                    inputMode="decimal"
                    placeholder={order.provisionalRate ?? ""}
                    value={settlement.rate}
                    onChange={(e) => setSettlement({ ...settlement, rate: e.target.value })}
                  />
                </div>
                <div className="w-64">
                  <DateInput label="Paid on" value={settlement.date} onChange={(date) => setSettlement({ ...settlement, date })} />
                </div>
              </>
            ) : (
              <p className="text-muted">CAD purchase: no settlement rate needed.</p>
            )}
            <Button type="submit" variant="secondary">
              Mark charges complete
            </Button>
            {settlementError && (
              <div className="w-full">
                <Alert tone="error" title={settlementError} />
              </div>
            )}
          </form>
        )}
      </Section>

      <PrototypeNotice>
        sample data for shipment {shipment.reference}. Added charges, method changes and settlement aren&apos;t saved until the cost endpoints exist
        (SCRUM-64, SCRUM-66, SCRUM-68).
      </PrototypeNotice>
    </div>
  );
}
