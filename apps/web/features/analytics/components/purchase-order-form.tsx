"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { CurrencyCode, Item, Supplier } from "../data/cost-capture";
import { Alert, Button, DateInput, Input, Select } from "@/components/ui";
import { centsToAmount, formatMoney, toCents } from "../format";
import { linkClass } from "./ui";

// W-CA-03: new purchase order (UC-CA-11 Record Purchase Order).
// Prototype: validation mirrors RULE-CA-03/04 so the flow can be demonstrated, but nothing is
// saved. The Go API will own these checks (apps/web/README.md, rule 7).

type Line = { key: string; itemId: string; quantity: string; unitPrice: string };
type Outcome = { kind: "open" | "draft"; number: string } | null;

const currencyOptions = [
  { value: "CAD", label: "CAD" },
  { value: "USD", label: "USD" },
];
const termOptions = ["Net 15", "Net 30", "Net 60", "Cash on delivery"].map((t) => ({ value: t, label: t }));
const labelClass = "text-xs font-bold uppercase tracking-[0.12em] text-muted";

export function PurchaseOrderForm({
  suppliers: initialSuppliers,
  items,
  nextNumber,
  rates,
}: {
  suppliers: Supplier[];
  items: Item[];
  nextNumber: string;
  /** CAD per unit of each foreign currency today (sample values). */
  rates: Record<Exclude<CurrencyCode, "CAD">, string>;
}) {
  const formId = useId();
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [supplierId, setSupplierId] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("CAD");
  const [expected, setExpected] = useState("");
  const [lines, setLines] = useState<Line[]>([{ key: "1", itemId: "", quantity: "", unitPrice: "" }]);
  const [duplicate, setDuplicate] = useState<{ key: string; existingKey: string } | null>(null);
  const [newSupplier, setNewSupplier] = useState<{ name: string; country: string; currency: CurrencyCode; terms: string } | null>(null);
  // Set on the first submit attempt; after that, errors update as the bookkeeper fixes them.
  const [attempted, setAttempted] = useState<"open" | "draft" | null>(null);
  const touched = attempted !== null;
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);

  const supplier = suppliers.find((s) => s.id === supplierId);
  const rate = currency === "CAD" ? null : rates[currency];

  function chooseSupplier(id: string) {
    if (id === "__new") {
      setNewSupplier({ name: "", country: "", currency: "USD", terms: "Net 30" });
      return;
    }
    setSupplierId(id);
    const s = suppliers.find((x) => x.id === id);
    if (s) setCurrency(s.currency); // step 4: supplier's currency and terms fill in
  }

  function saveNewSupplier() {
    if (!newSupplier || !newSupplier.name.trim()) return;
    const id = `SUP-NEW-${suppliers.length + 1}`;
    setSuppliers([
      ...suppliers,
      { id, name: newSupplier.name.trim(), country: newSupplier.country.trim() || "—", currency: newSupplier.currency, paymentTerms: newSupplier.terms },
    ]);
    setSupplierId(id);
    setCurrency(newSupplier.currency);
    setNewSupplier(null);
  }

  function updateLine(key: string, patch: Partial<Line>) {
    if (patch.itemId) {
      const existing = lines.find((l) => l.key !== key && l.itemId === patch.itemId);
      if (existing) setDuplicate({ key, existingKey: existing.key }); // extension 6c
    }
    setLines(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function resolveDuplicate(combine: boolean) {
    if (!duplicate) return;
    if (combine) {
      const from = lines.find((l) => l.key === duplicate.key);
      const into = lines.find((l) => l.key === duplicate.existingKey);
      const qty = (Number(into?.quantity) || 0) + (Number(from?.quantity) || 0);
      setLines(
        lines
          .filter((l) => l.key !== duplicate.key)
          .map((l) => (l.key === duplicate.existingKey ? { ...l, quantity: qty ? String(qty) : l.quantity } : l)),
      );
    }
    setDuplicate(null);
  }

  const lineCents = (l: Line) => {
    const qty = Number(l.quantity);
    const price = toCents(l.unitPrice);
    return Number.isInteger(qty) && qty > 0 && price !== null && price > 0 ? qty * price : null;
  };
  const totalCents = lines.reduce((sum, l) => sum + (lineCents(l) ?? 0), 0);
  // Rate has four decimals: multiply in integers, then round to the cent.
  const cadEstimateCents = rate ? Math.round((totalCents * Math.round(Number(rate) * 10000)) / 10000) : totalCents;

  function validate(forDraft: boolean) {
    const found: string[] = [];
    if (!supplierId) found.push("Select a supplier.");
    if (!forDraft) {
      const filled = lines.filter((l) => l.itemId);
      if (filled.length === 0) found.push("Add at least one item."); // extension 8a
      if (filled.some((l) => lineCents(l) === null))
        found.push("Quantities must be whole numbers above zero and unit prices above zero (RULE-CA-04).");
      if (!expected) found.push("Enter the expected delivery date.");
    }
    return found;
  }

  function submit(kind: "open" | "draft") {
    setAttempted(kind);
    if (validate(kind === "draft").length === 0) setOutcome({ kind, number: nextNumber });
  }

  const errors = attempted ? validate(attempted === "draft") : [];

  if (outcome) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="success" title={`${outcome.number} saved as ${outcome.kind === "open" ? "Open" : "Draft"}`}>
          <p>
            {supplier?.name} · {formatMoney(centsToAmount(totalCents), currency)}
            {rate && ` · about ${formatMoney(centsToAmount(cadEstimateCents))} at today's provisional rate`}
          </p>
          <p className="mt-1 text-sm text-muted">
            Prototype: the order isn&apos;t stored yet. Saving arrives with the purchase order endpoints (SCRUM-61).
          </p>
        </Alert>
        <div className="flex gap-6">
          <Link className={linkClass} href="/analytics/purchase-orders">
            Back to purchase orders
          </Link>
          <Link className={linkClass} href="/analytics/purchase-orders/po-1045">
            See an open order with a shipment
          </Link>
        </div>
      </div>
    );
  }

  const isQuantityValid = (l: Line) => Number.isInteger(Number(l.quantity)) && Number(l.quantity) > 0;
  const isPriceValid = (l: Line) => (toCents(l.unitPrice) ?? 0) > 0;

  return (
    <form
      aria-labelledby={`${formId}-title`}
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit("open");
      }}
    >
      <h2 id={`${formId}-title`} className="sr-only">
        New purchase order
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Number" value={nextNumber} readOnly />
        <Select
          label="Supplier"
          placeholder="Select a supplier…"
          value={newSupplier ? "__new" : supplierId}
          error={touched && !supplierId ? "Select a supplier." : undefined}
          hint={supplier ? `Payment terms: ${supplier.paymentTerms}` : undefined}
          onChange={chooseSupplier}
          options={[
            ...suppliers.map((s) => ({ value: s.id, label: `${s.name} (${s.country})` })),
            { value: "__new", label: "+ New supplier…" },
          ]}
        />
      </div>

      {newSupplier && (
        <fieldset className="grid gap-4 border-t-[6px] border-red bg-surface p-4 sm:grid-cols-4">
          <legend className="sr-only">New supplier</legend>
          <h3 className="text-[22px] font-bold sm:col-span-4">New supplier</h3>
          <Input label="Name" value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} />
          <Input label="Country" value={newSupplier.country} onChange={(e) => setNewSupplier({ ...newSupplier, country: e.target.value })} />
          <Select
            label="Currency"
            value={newSupplier.currency}
            options={currencyOptions}
            onChange={(v) => setNewSupplier({ ...newSupplier, currency: v as CurrencyCode })}
          />
          <Select label="Payment terms" value={newSupplier.terms} options={termOptions} onChange={(v) => setNewSupplier({ ...newSupplier, terms: v })} />
          <div className="flex gap-2 sm:col-span-4">
            <Button type="button" variant="secondary" onClick={saveNewSupplier}>
              Add supplier
            </Button>
            <Button type="button" variant="ghost" onClick={() => setNewSupplier(null)}>
              Cancel
            </Button>
          </div>
        </fieldset>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Select label="Currency" value={currency} options={currencyOptions} onChange={(v) => setCurrency(v as CurrencyCode)} />
        <div className="flex flex-col gap-1">
          <span className={labelClass}>Provisional exchange rate</span>
          <p className="flex h-11 items-center">{rate ? `1 ${currency} = ${rate} CAD (today)` : "Not needed for CAD"}</p>
        </div>
        <DateInput
          label="Expected delivery"
          value={expected}
          onChange={setExpected}
          error={touched && !expected && attempted === "open" ? "Enter the expected delivery date." : undefined}
        />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-[22px] font-bold">Lines</legend>
        <div className="flex flex-col border-t-2 border-ink">
          {lines.map((line, index) => {
            const cents = lineCents(line);
            const invalid = touched && line.itemId !== "" && cents === null;
            return (
              <div key={line.key} className="grid items-start gap-3 border-b border-line py-4 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                <Select
                  label={`Item ${index + 1}`}
                  placeholder="Select an item…"
                  value={line.itemId}
                  onChange={(v) => updateLine(line.key, { itemId: v })}
                  options={items.map((i) => ({ value: i.id, label: `${i.code} · ${i.name} (${i.unit})` }))}
                />
                <Input
                  label="Quantity"
                  inputMode="numeric"
                  value={line.quantity}
                  error={invalid && !isQuantityValid(line) ? "Whole number above zero" : undefined}
                  onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                />
                <Input
                  label={`Unit price (${currency})`}
                  inputMode="decimal"
                  value={line.unitPrice}
                  error={invalid && !isPriceValid(line) ? "Above zero" : undefined}
                  onChange={(e) => updateLine(line.key, { unitPrice: e.target.value })}
                />
                <div className="flex flex-col gap-1">
                  <span className={labelClass}>Line total</span>
                  <span className="flex h-11 items-center tabular-nums">{cents === null ? "—" : formatMoney(centsToAmount(cents), currency)}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Remove line ${index + 1}`}
                  onClick={() => setLines(lines.filter((l) => l.key !== line.key))}
                  className="sm:mt-5"
                >
                  Remove
                </Button>
                {duplicate?.key === line.key && (
                  <div className="sm:col-span-5">
                    <Alert
                      tone="warning"
                      title={`This item is already on line ${lines.findIndex((l) => l.key === duplicate.existingKey) + 1}.`}
                      action={
                        <span className="flex gap-2">
                          <Button type="button" variant="secondary" onClick={() => resolveDuplicate(true)}>
                            Combine quantities
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => resolveDuplicate(false)}>
                            Keep two lines
                          </Button>
                        </span>
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setLines([...lines, { key: String(Date.now()), itemId: "", quantity: "", unitPrice: "" }])}
          >
            + Add line
          </Button>
          <p className="mt-2 text-sm text-muted">Can&apos;t find an item? Items are set up in Inventory; save this order as a draft meanwhile.</p>
        </div>
      </fieldset>

      <div className="flex flex-col items-end gap-1 border-t-2 border-ink pt-4">
        <span className="text-[22px] font-bold">
          Total: <span className="tabular-nums">{formatMoney(centsToAmount(totalCents), currency)}</span>
        </span>
        {rate && (
          <span className="text-sm text-muted">
            About {formatMoney(centsToAmount(cadEstimateCents))} at the provisional rate. Final cost uses the settlement rate.
          </span>
        )}
      </div>

      {errors.length > 0 && (
        <Alert tone="error" title="Fix these before submitting">
          <ul className="list-disc pl-5 text-sm">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit">Submit purchase order</Button>
        <Button type="button" variant="secondary" onClick={() => submit("draft")}>
          Save as draft
        </Button>
        {confirmCancel ? (
          <span className="flex items-center gap-3">
            Discard this purchase order?
            <Link href="/analytics/purchase-orders" className={`${linkClass} text-red`}>
              Discard
            </Link>
            <Button type="button" variant="ghost" onClick={() => setConfirmCancel(false)}>
              Keep editing
            </Button>
          </span>
        ) : (
          <Button type="button" variant="ghost" onClick={() => setConfirmCancel(true)}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
