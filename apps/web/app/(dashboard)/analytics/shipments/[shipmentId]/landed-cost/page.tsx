import { Suspense } from "react";
import { PageSkeleton, ShipmentLandedCost, shipmentIds } from "@/features/analytics";

export function generateStaticParams() {
  return shipmentIds();
}

// params are URL data: read them inside <Suspense> so navigation can show the shell instantly.
export default function LandedCostPage({ params }: PageProps<"/analytics/shipments/[shipmentId]/landed-cost">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      {params.then(({ shipmentId }) => (
        <ShipmentLandedCost id={shipmentId} />
      ))}
    </Suspense>
  );
}
