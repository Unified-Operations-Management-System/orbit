import { EmptyState, PageHeader } from "@/components/ui";

// Placeholder: the Process champion replaces the empty state with their screens.
export default function ProductionPage() {
  return (
    <main>
      <PageHeader eyebrow="Functional area" title="Process" />
      <EmptyState area="production" title="Screens in progress" body="Workflow builder, process view and simulation screens for this area land here during Iteration 4." />
    </main>
  );
}
