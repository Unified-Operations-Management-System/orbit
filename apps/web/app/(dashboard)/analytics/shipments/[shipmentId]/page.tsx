import { Suspense } from "react";
import { PageSkeleton, ShipmentCosts, shipmentIds } from "@/features/analytics";

export function generateStaticParams() {
  return shipmentIds();
}

// params are URL data: read them inside <Suspense> so navigation can show the shell instantly.
export default function ShipmentPage({ params }: PageProps<"/analytics/shipments/[shipmentId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      {params.then(({ shipmentId }) => (
        <ShipmentCosts id={shipmentId} />
      ))}
    </Suspense>
  );
}
