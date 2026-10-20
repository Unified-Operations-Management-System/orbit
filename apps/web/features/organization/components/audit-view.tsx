"use client";

import { useMemo, useState } from "react";
import { DateInput, EmptyState, Pagination, SearchInput, Select, Timeline } from "@/components/ui";
import { actionLabels, auditActors, auditEntries, type AuditAction } from "../audit-data";

const PAGE_SIZE = 8;
const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const statusFor = (action: AuditAction) => {
  if (action === "member.deactivated" || action === "device.revoked") return "stalled";
  if (action === "member.invited" || action === "device.registered") return "onTrack";
  return undefined;
};

export function AuditView() {
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("all");
  const [actor, setActor] = useState("everyone");
  const [from, setFrom] = useState<string>();
  const [to, setTo] = useState<string>();
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () =>
      auditEntries.filter((e) => {
        if (query && !`${e.summary} ${e.actor}`.toLowerCase().includes(query.toLowerCase())) return false;
        if (action !== "all" && e.action !== action) return false;
        if (actor !== "everyone" && e.actor !== actor) return false;
        const day = e.at.slice(0, 10);
        if (from && day < from) return false;
        if (to && day > to) return false;
        return true;
      }),
    [query, action, actor, from, to],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <section aria-label="Audit history">
      <h2 className="mb-3 text-[22px] font-bold">Audit history</h2>
      <div className="mb-6 grid items-start gap-4 md:grid-cols-2 lg:grid-cols-5">
        <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1); }} label="Search" showLabel placeholder="Search activity" />
        <Select
          label="Action"
          value={action}
          onChange={(v) => { setAction(v); setPage(1); }}
          options={[{ value: "all", label: "All actions" }, ...Object.entries(actionLabels).map(([value, label]) => ({ value, label }))]}
        />
        <Select
          label="Actor"
          value={actor}
          onChange={(v) => { setActor(v); setPage(1); }}
          options={[{ value: "everyone", label: "Everyone" }, ...auditActors.map((a) => ({ value: a, label: a }))]}
        />
        <DateInput label="From" value={from} onChange={(v) => { setFrom(v); setPage(1); }} />
        <DateInput label="To" value={to} onChange={(v) => { setTo(v); setPage(1); }} />
      </div>
      <p className="mb-3 text-muted">
        Showing {filtered.length} of {auditEntries.length} entries
      </p>
      {filtered.length === 0 ? (
        <EmptyState area="organization" title="No matching activity" body="Try a different search or date range." />
      ) : (
        <div className="flex flex-col gap-6">
          <Timeline
            items={visible.map((e) => ({
              id: e.id,
              title: e.summary,
              meta: `${fmt.format(new Date(e.at))} · ${e.actor} · ${actionLabels[e.action]}`,
              status: statusFor(e.action),
            }))}
          />
          {pageCount > 1 ? <Pagination page={current} pageCount={pageCount} onPageChange={setPage} /> : null}
        </div>
      )}
    </section>
  );
}
