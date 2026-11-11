import { DashboardPage, EmptyState, PageHeader } from "@/components/ui";

// Placeholder: the HR champion replaces the empty state with their screens.
export default function HrPage() {
  return (
    <DashboardPage header={<PageHeader eyebrow="Functional area" title="HR" />}>
      <EmptyState area="hr" title="Screens in progress" body="Time entry, scheduling and pay screens for this area land here during Iteration 4." />
    </DashboardPage>
  );
}
