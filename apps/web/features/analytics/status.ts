import type { PurchaseOrder, Shipment } from "./data/cost-capture";

/**
 * What still stops a shipment's landed cost from being Final (RULE-CA-11), in words the
 * bookkeeper can act on. CAD purchases never need a settlement rate.
 * The API will report this itself; the web app only displays it.
 */
export function missingForFinal(shipment: Shipment, order: PurchaseOrder | undefined): string[] {
  if (shipment.costingStatus === "final") return [];
  const missing: string[] = [];
  if (order && order.currency !== "CAD" && !shipment.settlement) missing.push("settlement exchange rate");
  if (!shipment.chargesComplete) missing.push("charges not yet marked complete");
  return missing;
}
