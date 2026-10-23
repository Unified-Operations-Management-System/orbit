// Sample data for the goods receipt prototype (UC-CA-13 Record Goods Receipt).
// Same shipments as the web app's Cost Capture sample data, so the demo tells one story:
// receive CMAU 771045-2 here, then see its landed cost on the web.
// Replaced by `$api.useQuery("get", "/shipments", ...)` once the cost endpoints exist (SCRUM-78).

export type ReceivableLine = {
  id: string;
  itemName: string;
  unit: string;
  quantityShipped: number;
};

export type ExistingReceipt = {
  receivedAt: string;
  lines: { lineId: string; received: number; damaged: number; rejected: number }[];
};

export type ReceivableShipment = {
  id: string;
  reference: string;
  purchaseOrder: string;
  supplier: string;
  expectedArrival: string;
  lines: ReceivableLine[];
  receipt: ExistingReceipt | null;
};

export const receivableShipments: ReceivableShipment[] = [
  {
    id: "shp-0009",
    reference: "CMAU 771045-2",
    purchaseOrder: "PO-1045",
    supplier: "Lagos Agro Exports Ltd",
    expectedArrival: "2026-10-27",
    lines: [
      { id: "L1", itemName: "Yam flour", unit: "25 kg bag", quantityShipped: 300 },
      { id: "L2", itemName: "Red palm oil", unit: "20 L jerrycan", quantityShipped: 150 },
    ],
    receipt: null,
  },
  {
    id: "shp-0010",
    reference: "NPC-DEL-5531",
    purchaseOrder: "PO-1046",
    supplier: "Northern Packaging Co.",
    expectedArrival: "2026-10-14",
    lines: [
      { id: "L1", itemName: "Printed pouch film", unit: "roll", quantityShipped: 40 },
      { id: "L2", itemName: "Shipping carton", unit: "each", quantityShipped: 2000 },
    ],
    receipt: {
      receivedAt: "2026-10-14 14:05",
      lines: [
        { lineId: "L1", received: 40, damaged: 1, rejected: 0 },
        { lineId: "L2", received: 1950, damaged: 0, rejected: 0 },
      ],
    },
  },
];

/** RULE-CA-16: a receipt more than 2% away from what was shipped is flagged for the bookkeeper. */
export const DISCREPANCY_THRESHOLD = 0.02;

export function isDiscrepancy(received: number, shipped: number) {
  return shipped > 0 && Math.abs(received - shipped) / shipped > DISCREPANCY_THRESHOLD;
}
