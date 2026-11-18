import { SimWorkspace } from "@/components/sim/sim-workspace";
import { DashboardPage, PageHeader } from "@/components/ui";

export default function SimulationPage() {
  return (
    <DashboardPage
      fill
      header={<PageHeader eyebrow="Functional area" title="Simulation" />}
    >
      <section aria-label="Simulation workspace" className="min-h-0 flex-1 overflow-hidden border border-line">
        <SimWorkspace cols={128} rows={80} />
      </section>
    </DashboardPage>
  );
}
