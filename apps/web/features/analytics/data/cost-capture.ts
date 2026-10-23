// Sample data for the Cost Capture prototype (Inception Release).
//
// The shapes mirror what the Go API will return once the cost endpoints exist
// (SCRUM-61, SCRUM-73, SCRUM-79). Until then the screens read from here.
// Landed-cost figures are precomputed with the rules in the requirements model
// (RULE-CA-05..07, 10, 14, 15) so the prototype shows real numbers. The calculation
// itself belongs in the Go API, not in the web app.
//
// SHP-0007 is the worked example in UC-CA-15; reuse it for the landed-cost unit
// tests (SCRUM-80).

export type CurrencyCode = "CAD" | "USD";
export type AllocationMethod = "value" | "weight";
export type CostingStatus = "provisional" | "final";
export type PurchaseOrderStatus = "draft" | "open" | "closed";
export type ChargeType =
  | "freight"
  | "insurance"
  | "duty"
  | "brokerage"
  | "port"
  | "drayage"
  | "delivery"
  | "supplier-credit"
  | "other";

export type Supplier = {
  id: string;
  name: string;
  country: string;
  currency: CurrencyCode;
  paymentTerms: string;
};

export type Item = {
  id: string;
  code: string;
  name: string;
  unit: string;
  weightKg: number;
};

export type PurchaseOrderLine = {
  id: string;
  itemId: string;
  quantity: number;
  unitPrice: string;
};

export type PurchaseOrder = {
  id: string;
  number: string;
  supplierId: string;
  orderDate: string;
  expectedDelivery: string;
  currency: CurrencyCode;
  /** CAD per unit of `currency` on the order date (RULE-CA-10). Null for CAD orders. */
  provisionalRate: string | null;
  status: PurchaseOrderStatus;
  lines: PurchaseOrderLine[];
};

export type ShipmentCharge = {
  id: string;
  type: ChargeType;
  amount: string;
  currency: CurrencyCode;
  invoiceRef: string;
  /** "shared" is split across lines by the allocation method; otherwise the line it belongs to. */
  basis: "shared" | { lineId: string };
};

export type RecoverableTax = {
  id: string;
  label: string;
  amount: string;
};

export type ReceiptLine = {
  shipmentLineId: string;
  received: number;
  damaged: number;
  rejected: number;
  reason?: string;
};

export type GoodsReceipt = {
  receivedAt: string;
  receivedBy: string;
  lines: ReceiptLine[];
  discrepancy?: string;
};

export type LandedCostLine = {
  lineId: string;
  purchaseValueCad: string;
  /** CAD allocated to this line, keyed by charge id. */
  charges: Record<string, string>;
  total: string;
  perOrderedUnit: string;
  /** Null until goods are received (RULE-CA-15). */
  perUsableUnit: string | null;
};

export type Shipment = {
  id: string;
  purchaseOrderId: string;
  carrier: string;
  reference: string;
  expectedArrival: string;
  allocationMethod: AllocationMethod;
  costingStatus: CostingStatus;
  chargesComplete: boolean;
  settlement: { date: string; rate: string } | null;
  /** Shipment line id -> purchase order line id and quantity shipped. */
  lines: { id: string; purchaseOrderLineId: string; quantityShipped: number }[];
  charges: ShipmentCharge[];
  recoverableTax: RecoverableTax[];
  receipt: GoodsReceipt | null;
  /** Precomputed results for both methods so the screen can compare them (UC-CA-12 6a). */
  landedCost: Record<AllocationMethod, LandedCostLine[]>;
};

export const chargeTypeLabels: Record<ChargeType, string> = {
  freight: "Ocean freight",
  insurance: "Marine insurance",
  duty: "Customs duty",
  brokerage: "Customs brokerage",
  port: "Port and terminal fees",
  drayage: "Drayage",
  delivery: "Delivery",
  "supplier-credit": "Supplier credit",
  other: "Other",
};

export const suppliers: Supplier[] = [
  { id: "SUP-01", name: "Lagos Agro Exports Ltd", country: "Nigeria", currency: "USD", paymentTerms: "Net 30" },
  { id: "SUP-02", name: "Northern Packaging Co.", country: "Canada", currency: "CAD", paymentTerms: "Net 15" },
  { id: "SUP-03", name: "Accra Spice Traders", country: "Ghana", currency: "USD", paymentTerms: "Net 60" },
];

export const items: Item[] = [
  { id: "ITM-YAM", code: "RM-1001", name: "Yam flour", unit: "25 kg bag", weightKg: 25 },
  { id: "ITM-CAS", code: "RM-1002", name: "Cassava flour", unit: "25 kg bag", weightKg: 25 },
  { id: "ITM-PALM", code: "RM-1010", name: "Red palm oil", unit: "20 L jerrycan", weightKg: 18.4 },
  { id: "ITM-FILM", code: "PK-2001", name: "Printed pouch film", unit: "roll", weightKg: 22 },
  { id: "ITM-CTN", code: "PK-2010", name: "Shipping carton", unit: "each", weightKg: 0.35 },
];

export const purchaseOrders: PurchaseOrder[] = [
  {
    id: "po-1042",
    number: "PO-1042",
    supplierId: "SUP-01",
    orderDate: "2026-08-24",
    expectedDelivery: "2026-09-28",
    currency: "USD",
    provisionalRate: "1.3650",
    status: "closed",
    lines: [
      { id: "POL-1", itemId: "ITM-YAM", quantity: 400, unitPrice: "18.50" },
      { id: "POL-2", itemId: "ITM-CAS", quantity: 300, unitPrice: "14.00" },
      { id: "POL-3", itemId: "ITM-PALM", quantity: 200, unitPrice: "32.00" },
    ],
  },
  {
    id: "po-1045",
    number: "PO-1045",
    supplierId: "SUP-01",
    orderDate: "2026-09-21",
    expectedDelivery: "2026-10-27",
    currency: "USD",
    provisionalRate: "1.3685",
    status: "open",
    lines: [
      { id: "POL-1", itemId: "ITM-YAM", quantity: 300, unitPrice: "18.75" },
      { id: "POL-2", itemId: "ITM-PALM", quantity: 150, unitPrice: "32.50" },
    ],
  },
  {
    id: "po-1046",
    number: "PO-1046",
    supplierId: "SUP-02",
    orderDate: "2026-10-05",
    expectedDelivery: "2026-10-14",
    currency: "CAD",
    provisionalRate: null,
    status: "open",
    lines: [
      { id: "POL-1", itemId: "ITM-FILM", quantity: 40, unitPrice: "86.00" },
      { id: "POL-2", itemId: "ITM-CTN", quantity: 2000, unitPrice: "0.92" },
    ],
  },
  {
    id: "po-1047",
    number: "PO-1047",
    supplierId: "SUP-03",
    orderDate: "2026-10-16",
    expectedDelivery: "2026-11-20",
    currency: "USD",
    provisionalRate: "1.3702",
    status: "draft",
    lines: [{ id: "POL-1", itemId: "ITM-PALM", quantity: 120, unitPrice: "33.10" }],
  },
];

export const shipments: Shipment[] = [
  {
    id: "shp-0007",
    purchaseOrderId: "po-1042",
    carrier: "Maersk",
    reference: "MSKU 482913-7",
    expectedArrival: "2026-09-29",
    allocationMethod: "value",
    costingStatus: "final",
    chargesComplete: true,
    settlement: { date: "2026-10-08", rate: "1.3720" },
    lines: [
      { id: "L1", purchaseOrderLineId: "POL-1", quantityShipped: 400 },
      { id: "L2", purchaseOrderLineId: "POL-2", quantityShipped: 300 },
      { id: "L3", purchaseOrderLineId: "POL-3", quantityShipped: 200 },
    ],
    charges: [
      { id: "C1", type: "freight", amount: "3200.00", currency: "USD", invoiceRef: "FWD-88231", basis: "shared" },
      { id: "C2", type: "insurance", amount: "180.00", currency: "USD", invoiceRef: "INS-5520", basis: "shared" },
      { id: "C3", type: "duty", amount: "1240.00", currency: "CAD", invoiceRef: "B3-21987", basis: { lineId: "L3" } },
      { id: "C4", type: "brokerage", amount: "425.00", currency: "CAD", invoiceRef: "BRK-3307", basis: "shared" },
      { id: "C5", type: "port", amount: "310.00", currency: "CAD", invoiceRef: "PRT-1180", basis: "shared" },
      { id: "C6", type: "drayage", amount: "650.00", currency: "CAD", invoiceRef: "DRY-0451", basis: "shared" },
    ],
    recoverableTax: [{ id: "T1", label: "GST on import (recoverable)", amount: "1290.50" }],
    receipt: {
      receivedAt: "2026-09-29T10:40",
      receivedBy: "Receiving supervisor",
      lines: [
        { shipmentLineId: "L1", received: 400, damaged: 6, rejected: 0, reason: "Torn bags" },
        { shipmentLineId: "L2", received: 300, damaged: 0, rejected: 0 },
        { shipmentLineId: "L3", received: 200, damaged: 2, rejected: 0, reason: "Leaking jerrycans" },
      ],
    },
    landedCost: {
      value: [
        {
          lineId: "L1",
          purchaseValueCad: "10152.80",
          charges: { C1: "1804.94", C2: "101.53", C3: "0.00", C4: "174.72", C5: "127.45", C6: "267.22" },
          total: "12628.66",
          perOrderedUnit: "31.5717",
          perUsableUnit: "32.0524",
        },
        {
          lineId: "L2",
          purchaseValueCad: "5762.40",
          charges: { C1: "1024.43", C2: "57.62", C3: "0.00", C4: "99.17", C5: "72.33", C6: "151.67" },
          total: "7167.62",
          perOrderedUnit: "23.8921",
          perUsableUnit: "23.8921",
        },
        {
          lineId: "L3",
          purchaseValueCad: "8780.80",
          charges: { C1: "1561.03", C2: "87.81", C3: "1240.00", C4: "151.11", C5: "110.22", C6: "231.11" },
          total: "12162.08",
          perOrderedUnit: "60.8104",
          perUsableUnit: "61.4246",
        },
      ],
      weight: [
        {
          lineId: "L1",
          purchaseValueCad: "10152.80",
          charges: { C1: "2072.90", C2: "116.60", C3: "0.00", C4: "200.66", C5: "146.37", C6: "306.89" },
          total: "12996.22",
          perOrderedUnit: "32.4906",
          perUsableUnit: "32.9853",
        },
        {
          lineId: "L2",
          purchaseValueCad: "5762.40",
          charges: { C1: "1554.67", C2: "87.45", C3: "0.00", C4: "150.50", C5: "109.77", C6: "230.17" },
          total: "7894.96",
          perOrderedUnit: "26.3165",
          perUsableUnit: "26.3165",
        },
        {
          lineId: "L3",
          purchaseValueCad: "8780.80",
          charges: { C1: "762.83", C2: "42.91", C3: "1240.00", C4: "73.84", C5: "53.86", C6: "112.94" },
          total: "11067.18",
          perOrderedUnit: "55.3359",
          perUsableUnit: "55.8948",
        },
      ],
    },
  },
  {
    id: "shp-0009",
    purchaseOrderId: "po-1045",
    carrier: "CMA CGM",
    reference: "CMAU 771045-2",
    expectedArrival: "2026-10-27",
    allocationMethod: "value",
    costingStatus: "provisional",
    chargesComplete: false,
    settlement: null,
    lines: [
      { id: "L1", purchaseOrderLineId: "POL-1", quantityShipped: 300 },
      { id: "L2", purchaseOrderLineId: "POL-2", quantityShipped: 150 },
    ],
    charges: [
      { id: "C1", type: "freight", amount: "2600.00", currency: "USD", invoiceRef: "FWD-88907", basis: "shared" },
      { id: "C2", type: "insurance", amount: "140.00", currency: "USD", invoiceRef: "INS-5601", basis: "shared" },
    ],
    recoverableTax: [],
    receipt: null,
    landedCost: {
      value: [
        {
          lineId: "L1",
          purchaseValueCad: "7697.81",
          charges: { C1: "1906.12", C2: "102.64" },
          total: "9706.57",
          perOrderedUnit: "32.3552",
          perUsableUnit: null,
        },
        {
          lineId: "L2",
          purchaseValueCad: "6671.44",
          charges: { C1: "1651.98", C2: "88.95" },
          total: "8412.37",
          perOrderedUnit: "56.0825",
          perUsableUnit: null,
        },
      ],
      weight: [
        {
          lineId: "L1",
          purchaseValueCad: "7697.81",
          charges: { C1: "2600.95", C2: "140.05" },
          total: "10438.81",
          perOrderedUnit: "34.7960",
          perUsableUnit: null,
        },
        {
          lineId: "L2",
          purchaseValueCad: "6671.44",
          charges: { C1: "957.15", C2: "51.54" },
          total: "7680.13",
          perOrderedUnit: "51.2009",
          perUsableUnit: null,
        },
      ],
    },
  },
  {
    id: "shp-0010",
    purchaseOrderId: "po-1046",
    carrier: "Northern Packaging fleet",
    reference: "NPC-DEL-5531",
    expectedArrival: "2026-10-14",
    allocationMethod: "value",
    costingStatus: "provisional",
    chargesComplete: false,
    settlement: null,
    lines: [
      { id: "L1", purchaseOrderLineId: "POL-1", quantityShipped: 40 },
      { id: "L2", purchaseOrderLineId: "POL-2", quantityShipped: 2000 },
    ],
    charges: [
      { id: "C1", type: "delivery", amount: "180.00", currency: "CAD", invoiceRef: "NPC-INV-2290", basis: "shared" },
    ],
    recoverableTax: [{ id: "T1", label: "HST (recoverable)", amount: "709.80" }],
    receipt: {
      receivedAt: "2026-10-14T14:05",
      receivedBy: "Receiving supervisor",
      lines: [
        { shipmentLineId: "L1", received: 40, damaged: 1, rejected: 0, reason: "Crushed core" },
        { shipmentLineId: "L2", received: 1950, damaged: 0, rejected: 0 },
      ],
      discrepancy: "Cartons: 1,950 received against 2,000 shipped (2.5% short). Bookkeeper notified.",
    },
    landedCost: {
      value: [
        {
          lineId: "L1",
          purchaseValueCad: "3440.00",
          charges: { C1: "117.27" },
          total: "3557.27",
          perOrderedUnit: "88.9318",
          perUsableUnit: "91.2121",
        },
        {
          lineId: "L2",
          purchaseValueCad: "1840.00",
          charges: { C1: "62.73" },
          total: "1902.73",
          perOrderedUnit: "0.9514",
          perUsableUnit: "0.9758",
        },
      ],
      weight: [
        {
          lineId: "L1",
          purchaseValueCad: "3440.00",
          charges: { C1: "100.25" },
          total: "3540.25",
          perOrderedUnit: "88.5063",
          perUsableUnit: "90.7756",
        },
        {
          lineId: "L2",
          purchaseValueCad: "1840.00",
          charges: { C1: "79.75" },
          total: "1919.75",
          perOrderedUnit: "0.9599",
          perUsableUnit: "0.9845",
        },
      ],
    },
  },
];
