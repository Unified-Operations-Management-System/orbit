"use client";

import { useState } from "react";
import { PageHeader, Tabs } from "@/components/ui";
import { MembersView } from "./members-view";
import { RolesMatrix } from "./roles-matrix";
import { DevicesView } from "./devices-view";
import { AuditView } from "./audit-view";
import { CompanyView } from "./company-view";

const tabs = [
  { id: "members", label: "Members" },
  { id: "roles", label: "Roles and permissions" },
  { id: "devices", label: "Devices" },
  { id: "audit", label: "Audit history" },
  { id: "company", label: "Company" },
];

export function OrganizationView() {
  const [tab, setTab] = useState("members");
  return (
    <main>
      <PageHeader eyebrow="Organization" title="Members and access" />
      <div className="mb-6">
        <Tabs tabs={tabs} value={tab} onChange={setTab} />
      </div>
      {tab === "members" ? <MembersView /> : null}
      {tab === "roles" ? <RolesMatrix /> : null}
      {tab === "devices" ? <DevicesView /> : null}
      {tab === "audit" ? <AuditView /> : null}
      {tab === "company" ? <CompanyView /> : null}
    </main>
  );
}
