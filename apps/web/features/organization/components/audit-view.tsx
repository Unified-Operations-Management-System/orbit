"use client";

import { useEffect, useMemo, useState } from "react";
import type { Problem } from "@orbit/api-client";
import { Alert, DateInput, EmptyState, Pagination, Panel, SearchInput, Select, Timeline } from "@/components/ui";
import { browserApi } from "@/lib/api/browser";
import { authHeaders, useRole } from "@/lib/role";
import { actionLabels, type AuditAction, type AuditEntry } from "../audit-data";

const PAGE_SIZE = 8;
const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const statusFor = (action: AuditAction) => {
  if (action === "member.deactivated" || action === "device.revoked") return "stalled";
  if (action === "member.invited" || action === "device.registered") return "onTrack";
  return undefined;
};

const problemMessage = (p: Problem | undefined) => p?.detail ?? "Something went wrong.";

// Recorded by the API whenever members, roles or permissions change (BR-OAM-R10).
// Filtering and paging happen here; the API returns the latest 500 entries.
export function AuditView() {
  const { role } = useRole();
  const [auditEntries, setEntries] = useState<AuditEntry[]>([]);
  const [loadError, setLoadError] = useState<string>();
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("all");
  const [actor, setActor] = useState("everyone");
  const [from, setFrom] = useState<string>();
  const [to, setTo] = useState<string>();
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!role) return;
    let live = true;
    void browserApi.GET("/audit", { headers: authHeaders(role), params: { query: { limit: 500 } } }).then(({ data, error }) => {
      if (!live) return;
      if (error) return setLoadError(problemMessage(error));
      setLoadError(undefined);
      setEntries(data);
    });
    return () => {
      live = false;
    };
  }, [role]);

  const auditActors = useMemo(() => [...new Set(auditEntries.map((e) => e.actor))].sort(), [auditEntries]);

  const filtered = useMemo(
    () =>
      auditEntries.filter((e) => {
        if (query && !`${e.summary} ${e.actor}`.toLowerCase().includes(query.toLowerCase())) return false;
        if (action !== "all" && e.action !== action) return false;
        if (actor !== "everyone" && e.actor !== actor) return false;
        const day = e.at.slice(0, 10); // UTC date
        if (from && day < from) return false;
        if (to && day > to) return false;
        return true;
      }),
    [auditEntries, query, action, actor, from, to],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <Panel
      title="Audit history"
      className="flex-1"
      filters={
        <>
          <div className="mb-3 grid items-start gap-4 md:grid-cols-2 lg:grid-cols-5">
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
          <p className="text-muted">
            Showing {filtered.length} of {auditEntries.length} entries
          </p>
        </>
      }
      footer={filtered.length > 0 && pageCount > 1 ? <Pagination page={current} pageCount={pageCount} onPageChange={setPage} /> : null}
    >
      {loadError ? (
        <Alert tone="error" title={loadError} />
      ) : filtered.length === 0 ? (
        <EmptyState area="organization" title="No matching activity" body="Try a different search or date range." />
      ) : (
        <Timeline
          items={visible.map((e) => ({
            id: e.id,
            title: e.summary,
            meta: `${fmt.format(new Date(e.at))} · ${e.actor} · ${actionLabels[e.action]}`,
            status: statusFor(e.action),
          }))}
        />
      )}
    </Panel>
  );
}
