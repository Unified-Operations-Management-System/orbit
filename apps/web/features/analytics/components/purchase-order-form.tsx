"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { CurrencyCode, Item, Supplier } from "../data/cost-capture";
import { centsToAmount, formatMoney, toCents } from "../format";

// W-CA-03: new purchase order (UC-CA-11 Record Purchase Order).
// Prototype: validation mirrors RULE-CA-03/04 so the flow can be demonstrated, but nothing is
// saved. The Go API will own these checks (apps/web/README.md, rule 7).

type Line = { key: string; itemId: string; quantity: string; unitPrice: string };
type Outcome = { kind: "open" | "draft"; number: string } | null;

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700 aria-[invalid=true]:border-red-500";
const labelClass = "flex flex-col gap-1 text-sm";

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
      <div role="status" className="flex flex-col gap-3 rounded-lg border border-green-300 bg-green-50 p-6 text-sm dark:border-green-800 dark:bg-green-950">
        <p className="text-base font-semibold">
          {outcome.number} saved as {outcome.kind === "open" ? "Open" : "Draft"}
        </p>
        <p>
          {supplier?.name} · {formatMoney(centsToAmount(totalCents), currency)}
          {rate && ` · about ${formatMoney(centsToAmount(cadEstimateCents))} at today's provisional rate`}
        </p>
        <p className="text-neutral-600 dark:text-neutral-400">
          Prototype: the order isn&apos;t stored yet. Saving arrives with the purchase order endpoints (SCRUM-61).
        </p>
        <div className="flex gap-3">
          <Link className="underline" href="/analytics/purchase-orders">
            Back to purchase orders
          </Link>
          <Link className="underline" href="/analytics/purchase-orders/po-1045">
            See an open order with a shipment
          </Link>
        </div>
      </div>
    );
  }

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
        <label className={labelClass}>
          <span className="text-neutral-500">Number</span>
          <input className={inputClass} value={nextNumber} readOnly />
        </label>
        <label className={labelClass}>
          <span className="text-neutral-500">Supplier</span>
          <select
            className={inputClass}
            value={newSupplier ? "__new" : supplierId}
            aria-invalid={touched && !supplierId}
            onChange={(e) => chooseSupplier(e.target.value)}
          >
            <option value="">Select a supplier…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.country})
              </option>
            ))}
            <option value="__new">+ New supplier…</option>
          </select>
        </label>
      </div>

      {newSupplier && (
        <fieldset className="grid gap-3 rounded-lg border border-neutral-200 p-4 sm:grid-cols-4 dark:border-neutral-800">
          <legend className="px-1 text-sm font-medium">New supplier</legend>
          <label className={labelClass}>
            <span className="text-neutral-500">Name</span>
            <input className={inputClass} value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} />
          </label>
          <label className={labelClass}>
            <span className="text-neutral-500">Country</span>
            <input className={inputClass} value={newSupplier.country} onChange={(e) => setNewSupplier({ ...newSupplier, country: e.target.value })} />
          </label>
          <label className={labelClass}>
            <span className="text-neutral-500">Currency</span>
            <select
              className={inputClass}
              value={newSupplier.currency}
              onChange={(e) => setNewSupplier({ ...newSupplier, currency: e.target.value as CurrencyCode })}
            >
              <option value="CAD">CAD</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <label className={labelClass}>
            <span className="text-neutral-500">Payment terms</span>
            <select className={inputClass} value={newSupplier.terms} onChange={(e) => setNewSupplier({ ...newSupplier, terms: e.target.value })}>
              <option>Net 15</option>
              <option>Net 30</option>
              <option>Net 60</option>
              <option>Cash on delivery</option>
            </select>
          </label>
          <div className="flex gap-2 sm:col-span-4">
            <button type="button" onClick={saveNewSupplier} className="rounded-md border border-neutral-400 px-3 py-1.5 text-sm">
              Add supplier
            </button>
            <button type="button" onClick={() => setNewSupplier(null)} className="px-3 py-1.5 text-sm text-neutral-500">
              Cancel
            </button>
          </div>
        </fieldset>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <label className={labelClass}>
          <span className="text-neutral-500">Currency</span>
          <select className={inputClass} value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}>
            <option value="CAD">CAD</option>
            <option value="USD">USD</option>
          </select>
        </label>
        <div className={labelClass}>
          <span className="text-neutral-500">Provisional exchange rate</span>
          <p className="py-2">{rate ? `1 ${currency} = ${rate} CAD (today)` : "Not needed for CAD"}</p>
        </div>
        <label className={labelClass}>
          <span className="text-neutral-500">Expected delivery</span>
          <input
            type="date"
            className={inputClass}
            value={expected}
            aria-invalid={touched && !expected}
            onChange={(e) => setExpected(e.target.value)}
          />
        </label>
      </div>
      {supplier && <p className="-mt-3 text-xs text-neutral-500">Payment terms: {supplier.paymentTerms}</p>}

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-semibold">Lines</legend>
        {lines.map((line, index) => {
          const cents = lineCents(line);
          const invalid = touched && line.itemId !== "" && cents === null;
          return (
            <div key={line.key} className="grid items-end gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
              <label className={labelClass}>
                <span className="text-neutral-500">Item {index + 1}</span>
                <select className={inputClass} value={line.itemId} onChange={(e) => updateLine(line.key, { itemId: e.target.value })}>
                  <option value="">Select an item…</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.code} · {i.name} ({i.unit})
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                <span className="text-neutral-500">Quantity</span>
                <input
                  inputMode="numeric"
                  className={inputClass}
                  value={line.quantity}
                  aria-invalid={invalid && !(Number.isInteger(Number(line.quantity)) && Number(line.quantity) > 0)}
                  onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                />
              </label>
              <label className={labelClass}>
                <span className="text-neutral-500">Unit price ({currency})</span>
                <input
                  inputMode="decimal"
                  className={inputClass}
                  value={line.unitPrice}
                  aria-invalid={invalid && !((toCents(line.unitPrice) ?? 0) > 0)}
                  onChange={(e) => updateLine(line.key, { unitPrice: e.target.value })}
                />
              </label>
              <div className="flex flex-col gap-1 text-sm">
                <span className="text-neutral-500">Line total</span>
                <span className="py-2 tabular-nums">{cents === null ? "—" : formatMoney(centsToAmount(cents), currency)}</span>
              </div>
              <button
                type="button"
                aria-label={`Remove line ${index + 1}`}
                onClick={() => setLines(lines.filter((l) => l.key !== line.key))}
                className="py-2 text-sm text-neutral-400 hover:text-red-600"
              >
                Remove
              </button>
              {duplicate?.key === line.key && (
                <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 sm:col-span-5 dark:bg-amber-950 dark:text-amber-100">
                  This item is already on line {lines.findIndex((l) => l.key === duplicate.existingKey) + 1}.
                  <button type="button" className="underline" onClick={() => resolveDuplicate(true)}>
                    Combine quantities
                  </button>
                  <button type="button" className="underline" onClick={() => resolveDuplicate(false)}>
                    Keep two lines
                  </button>
                </div>
              )}
            </div>
          );
        })}
        <div>
          <button
            type="button"
            onClick={() => setLines([...lines, { key: String(Date.now()), itemId: "", quantity: "", unitPrice: "" }])}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
          >
            + Add line
          </button>
          <p className="mt-2 text-xs text-neutral-500">Can&apos;t find an item? Items are set up in Inventory; save this order as a draft meanwhile.</p>
        </div>
      </fieldset>

      <div className="flex flex-col items-end gap-1 border-t border-neutral-200 pt-4 text-sm dark:border-neutral-800">
        <span>
          Total: <strong className="tabular-nums">{formatMoney(centsToAmount(totalCents), currency)}</strong>
        </span>
        {rate && (
          <span className="text-neutral-500">
            About {formatMoney(centsToAmount(cadEstimateCents))} at the provisional rate. Final cost uses the settlement rate.
          </span>
        )}
      </div>

      {errors.length > 0 && (
        <ul role="alert" className="list-disc rounded-md bg-red-50 py-3 pl-8 pr-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">
          Submit purchase order
        </button>
        <button type="button" onClick={() => submit("draft")} className="rounded-md border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700">
          Save as draft
        </button>
        {confirmCancel ? (
          <span className="flex items-center gap-3 text-sm">
            Discard this purchase order?
            <Link href="/analytics/purchase-orders" className="text-red-600 underline">
              Discard
            </Link>
            <button type="button" className="underline" onClick={() => setConfirmCancel(false)}>
              Keep editing
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmCancel(true)} className="px-2 py-2 text-sm text-neutral-500">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
