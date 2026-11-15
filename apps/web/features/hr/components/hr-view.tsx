"use client";

import { useState } from "react";
import { DashboardPage, PageHeader, Tabs } from "@/components/ui";
import { useRole } from "@/lib/role";
import { CorrectionsView } from "./corrections-view";

// HR Management on the web: supervisors and the owner review their team's time here.
// Employees clock in and request corrections in the mobile app; on the web they see
// the status of their own requests.
export function HrView() {
  const { role } = useRole();
  const canReview = role === "owner" || role === "supervisor";
  const tabs = canReview ? [{ id: "corrections", label: "Time corrections" }] : [];
  const [tab, setTab] = useState("corrections");

  return (
    <DashboardPage
      fill
      header={
        <>
          <PageHeader eyebrow="HR Management" title="Time and attendance" />
          {tabs.length > 1 ? (
            <div className="mb-6">
              <Tabs tabs={tabs} value={tab} onChange={setTab} />
            </div>
          ) : null}
        </>
      }
    >
      <CorrectionsView />
    </DashboardPage>
  );
}
