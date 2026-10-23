import { purchaseOrders, shipments } from "./data/cost-capture";

// IDs for generateStaticParams. With Cache Components, dynamic routes need at least one
// sample param so the build can prerender and validate them.
export const purchaseOrderIds = () => purchaseOrders.map((po) => ({ poId: po.id }));
export const shipmentIds = () => shipments.map((s) => ({ shipmentId: s.id }));
