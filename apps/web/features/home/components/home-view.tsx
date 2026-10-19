"use client";

import { useState } from "react";
import { Button, PageHeader, StatCard, StatusPill } from "@/components/ui";
import { roleLabels, useRole } from "@/lib/role";
import { myTasks, processRuns, statsByRole } from "../mock-data";

export function HomeView() {
  const { role } = useRole();
  const [clockedIn, setClockedIn] = useState(false);
  if (!role) return null;

  const list = role === "employee" ? myTasks : processRuns;
  const today = new Date().toLocaleDateString("en-CA", { weekday: "long" });

  return (
    <main className="flex flex-col gap-4">
      <PageHeader eyebrow={`${today} · Shift A`} title={`Good morning, ${roleLabels[role]}.`} />
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {statsByRole[role].map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>
      <section aria-label={role === "employee" ? "My tasks" : "Production runs"} className="border border-line">
        {list.map((r, i) => (
          <div key={r.name} className={`flex items-center justify-between px-4 py-3 ${i ? "border-t border-line" : ""}`}>
            <span>{r.name}</span>
            <StatusPill status={r.status} />
          </div>
        ))}
      </section>
      {role !== "owner" ? (
        <div className="flex items-center gap-4">
          <Button onClick={() => setClockedIn((v) => !v)}>{clockedIn ? "Clock out" : "Clock in →"}</Button>
          {clockedIn ? <span className="text-muted">Clocked in at 7:02 AM</span> : null}
        </div>
      ) : null}
    </main>
  );
}
