import { Suspense } from "react";
import { PageSkeleton, PurchaseOrderDetail, purchaseOrderIds } from "@/features/analytics";

export function generateStaticParams() {
  return purchaseOrderIds();
}

// params are URL data: read them inside <Suspense> so navigation can show the shell instantly.
export default function PurchaseOrderPage({ params }: PageProps<"/analytics/purchase-orders/[poId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      {params.then(({ poId }) => (
        <PurchaseOrderDetail id={poId} />
      ))}
    </Suspense>
  );
}
