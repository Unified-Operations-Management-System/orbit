import { EmptyState, PageHeader } from "@/components/ui";

// Placeholder: the Inventory champion replaces the empty state with their screens.
export default function InventoryPage() {
  return (
    <main>
      <PageHeader eyebrow="Functional area" title="Inventory" />
      <EmptyState area="inventory" title="Screens in progress" body="Stock levels, barcode scans and requisitions for this area land here during Iteration 4." />
    </main>
  );
}
