import "server-only";
import { items, purchaseOrders, shipments, suppliers } from "./data/cost-capture";

// Reads for Cost Analytics. For the Inception prototype they return sample data; each one
// becomes an `api.GET(...)` call when the cost endpoints land in the spec (SCRUM-61).

export function getSuppliers() {
  return suppliers;
}

export function getItems() {
  return items;
}

export function getPurchaseOrders() {
  return purchaseOrders;
}

export function getPurchaseOrder(id: string) {
  return purchaseOrders.find((po) => po.id === id);
}

export function getShipments() {
  return shipments;
}

export function getShipment(id: string) {
  return shipments.find((s) => s.id === id);
}

export function getShipmentsForPurchaseOrder(purchaseOrderId: string) {
  return shipments.filter((s) => s.purchaseOrderId === purchaseOrderId);
}
