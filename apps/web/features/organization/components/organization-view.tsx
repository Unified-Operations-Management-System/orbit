"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui";
import { MembersView } from "./members-view";
import { RolesMatrix } from "./roles-matrix";

const tabs = ["Members", "Roles and permissions"] as const;

export function OrganizationView() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Members");
  return (
    <main>
      <PageHeader eyebrow="Organization" title="Members and access" />
      <div role="tablist" className="mb-6 flex gap-6 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-4 pb-2 font-bold ${tab === t ? "border-red text-ink" : "border-transparent text-muted"}`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Members" ? <MembersView /> : <RolesMatrix />}
    </main>
  );
}
