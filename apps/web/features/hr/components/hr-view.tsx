"use client";

import { useState } from "react";
import { DashboardPage, PageHeader, Tabs } from "@/components/ui";
import { useRole } from "@/lib/role";
import { CorrectionsView } from "./corrections-view";
import { EmployeesView } from "./employees-view";
import { TimecardView } from "./timecard-view";

const reviewerTabs = [
  { id: "corrections", label: "Time corrections" },
  { id: "employees", label: "Employees" },
];
const employeeTabs = [
  { id: "timecard", label: "My timecard" },
  { id: "corrections", label: "My requests" },
];

// HR Management on the web, matching the mobile app: employees see their own time here,
// supervisors and the owner review their team's.
export function HrView() {
  const { role } = useRole();
  const canReview = role === "owner" || role === "supervisor";
  const tabs = canReview ? reviewerTabs : employeeTabs;
  const [tab, setTab] = useState(tabs[0].id);
  // Set when "n to review" on an employee opens the corrections tab for them.
  const [forEmployee, setForEmployee] = useState("");

  const reviewCorrections = (name: string) => {
    setForEmployee(name);
    setTab("corrections");
  };

  return (
    <DashboardPage
      fill
      header={
        <>
          <PageHeader eyebrow="HR Management" title="Time and attendance" />
          <div className="mb-6">
            <Tabs tabs={tabs} value={tab} onChange={setTab} />
          </div>
        </>
      }
    >
      {canReview && tab === "employees" ? (
        <EmployeesView onReviewCorrections={reviewCorrections} />
      ) : !canReview && tab === "timecard" ? (
        <TimecardView />
      ) : (
        <CorrectionsView key={forEmployee} initialQuery={forEmployee} />
      )}
    </DashboardPage>
  );
}
