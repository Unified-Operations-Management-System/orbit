"use client";

import { useState } from "react";
import { DashboardPage, PageHeader, Tabs } from "@/components/ui";
import { useRole } from "@/lib/role";
import { CorrectionsView } from "./corrections-view";
import { EmployeesView } from "./employees-view";

const reviewerTabs = [
  { id: "corrections", label: "Time corrections" },
  { id: "employees", label: "Employees" },
];

// HR Management on the web: supervisors and the owner review their team's time here.
// Employees clock in and request corrections in the mobile app; on the web they see
// the status of their own requests.
export function HrView() {
  const { role } = useRole();
  const canReview = role === "owner" || role === "supervisor";
  const [tab, setTab] = useState("corrections");
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
          {canReview ? (
            <div className="mb-6">
              <Tabs tabs={reviewerTabs} value={tab} onChange={setTab} />
            </div>
          ) : null}
        </>
      }
    >
      {canReview && tab === "employees" ? (
        <EmployeesView onReviewCorrections={reviewCorrections} />
      ) : (
        <CorrectionsView key={forEmployee} initialQuery={forEmployee} />
      )}
    </DashboardPage>
  );
}
