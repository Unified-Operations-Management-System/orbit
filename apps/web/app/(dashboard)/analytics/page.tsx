import { EmptyState, PageHeader } from "@/components/ui";

// Placeholder: the Cost champion replaces the empty state with their screens.
export default function AnalyticsPage() {
  return (
    <main>
      <PageHeader eyebrow="Functional area" title="Cost" />
      <EmptyState area="analytics" title="Screens in progress" body="Landed cost, production cost and margin screens for this area land here during Iteration 4." />
    </main>
  );
}
