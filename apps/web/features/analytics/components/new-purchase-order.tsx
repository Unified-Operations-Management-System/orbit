import { getItems, getPurchaseOrders, getSuppliers } from "../queries";
import { PurchaseOrderForm } from "./purchase-order-form";
import { AnalyticsPage, PrototypeNotice } from "./ui";

// W-CA-03 wrapper: loads the lists the form needs on the server and hands them to the
// client form as props.
export function NewPurchaseOrder() {
  const lastNumber = Math.max(...getPurchaseOrders().map((po) => Number(po.number.replace("PO-", ""))));

  return (
    <AnalyticsPage
      back={{ href: "/analytics/purchase-orders", label: "Purchase orders" }}
      title="New purchase order"
      description="Record what you're buying, from whom and at what price. Freight, duty and other charges are added to the shipment later."
    >
      <PurchaseOrderForm
        suppliers={getSuppliers()}
        items={getItems()}
        nextNumber={`PO-${lastNumber + 1}`}
        rates={{ USD: "1.3702" }}
      />
      <PrototypeNotice>suppliers, items and today&apos;s rate are sample data; submitting doesn&apos;t store the order yet.</PrototypeNotice>
    </AnalyticsPage>
  );
}
