// Display helpers. Amounts arrive as decimal strings (the API never sends money as floats,
// per the Financial accuracy NFR), so we only convert to a number to format for display.

const money = (currency: string, fractionDigits = 2) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

export function formatMoney(amount: string, currency = "CAD") {
  return money(currency).format(Number(amount));
}

/** Unit costs are kept to four decimals so small items (cartons at $0.97) stay meaningful. */
export function formatUnitCost(amount: string, currency = "CAD") {
  return money(currency, 4).format(Number(amount));
}

export function formatQuantity(quantity: number) {
  return new Intl.NumberFormat("en-CA").format(quantity);
}

export function formatDate(isoDate: string) {
  return new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(new Date(`${isoDate.slice(0, 10)}T12:00`));
}

export function formatPercent(part: string, whole: string) {
  const total = Number(whole);
  if (total === 0) return "0%";
  return new Intl.NumberFormat("en-CA", { style: "percent", maximumFractionDigits: 1 }).format(Number(part) / total);
}

/** Exact cents from a decimal string, so the purchase order form can add totals without float error. */
export function toCents(amount: string): number | null {
  const match = /^\s*(\d+)(?:\.(\d{0,2}))?\s*$/.exec(amount);
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

export function centsToAmount(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
