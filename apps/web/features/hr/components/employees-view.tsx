"use client";

import { useEffect, useState } from "react";
import { colors } from "@orbit/design-tokens";
import type { MemberRole, MemberStatus } from "@orbit/api-client";
import { Alert, Button, EmptyState, Panel, SearchInput, Select, Shape, StatCard, stickyHeadCell } from "@/components/ui";
import { browserApi } from "@/lib/api/browser";
import { authHeaders, useRole } from "@/lib/role";
import { problemMessage, type HrEmployee, type PayPeriod } from "../api";
import { formatHours, formatPeriod, formatTime } from "../format";

const roles: MemberRole[] = ["Employee", "Supervisor", "HR Admin", "Owner"];
const statuses: MemberStatus[] = ["Active", "Pending", "Deactivated"];
type Clock = "any" | "in" | "out";

const memberStatusLook: Record<MemberStatus, { shape: "circle" | "triangle" | "square"; color: string; text: string }> = {
  Active: { shape: "circle", color: colors.blue, text: "text-blue" },
  Pending: { shape: "triangle", color: colors.yellow, text: "text-ink" },
  Deactivated: { shape: "square", color: colors.muted, text: "text-muted line-through" },
};

// SCRUM-174: who works here, who's on the clock and how many hours this pay period. Every
// filter is a query parameter on GET /hr/employees, so the API does the filtering and the
// scoping (a supervisor sees their team, the owner the company).
export function EmployeesView({ onReviewCorrections }: { onReviewCorrections: (name: string) => void }) {
  const { role } = useRole();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [teamId, setTeamId] = useState("all");
  const [memberRole, setMemberRole] = useState("all");
  const [status, setStatus] = useState<MemberStatus>("Active");
  const [clock, setClock] = useState<Clock>("any");
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [period, setPeriod] = useState<PayPeriod>();
  const [teams, setTeams] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();

  // Wait for a pause in typing before asking the API.
  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!role) return;
    let live = true;
    const query = {
      status,
      ...(q ? { q } : {}),
      ...(teamId !== "all" ? { teamId } : {}),
      ...(memberRole !== "all" ? { role: memberRole as MemberRole } : {}),
      ...(clock !== "any" ? { clockedIn: clock === "in" } : {}),
    };
    void browserApi.GET("/hr/employees", { headers: authHeaders(role), params: { query } }).then(({ data, error }) => {
      if (!live) return;
      setLoading(false);
      if (error) return setLoadError(problemMessage(error));
      setLoadError(undefined);
      setEmployees(data.employees);
      setPeriod(data.payPeriod);
      // Team choices come from the employees seen so far (there's no teams endpoint yet).
      setTeams((known) => {
        const next = new Map(known);
        for (const e of data.employees) if (e.teamId && e.teamName) next.set(e.teamId, e.teamName);
        return next.size === known.size ? known : next;
      });
    });
    return () => {
      live = false;
    };
  }, [role, q, teamId, memberRole, status, clock]);

  const onClock = employees.filter((e) => e.clockedInSince).length;
  const hours = Math.round(employees.reduce((sum, e) => sum + e.hoursThisPeriod, 0) * 10) / 10;
  const pending = employees.reduce((sum, e) => sum + e.pendingCorrections, 0);

  return (
    <Panel
      title="Employees"
      className="flex-1"
      filters={
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Employees" value={String(employees.length)} accent="ink" />
            <StatCard label="On the clock now" value={String(onClock)} accent="blue" />
            <StatCard label="Hours this period" value={String(hours)} accent="yellow" />
            <StatCard label="Corrections to review" value={String(pending)} accent={pending ? "red" : "ink"} alert={pending > 0} />
          </div>
          <div className="mb-3 grid items-start gap-4 md:grid-cols-3 lg:grid-cols-5">
            <SearchInput value={search} onChange={setSearch} label="Search" showLabel placeholder="Name or email" />
            <Select
              label="Team"
              value={teamId}
              onChange={setTeamId}
              options={[{ value: "all", label: "All teams" }, ...[...teams].map(([value, label]) => ({ value, label }))]}
            />
            <Select label="Role" value={memberRole} onChange={setMemberRole} options={[{ value: "all", label: "All roles" }, ...roles.map((r) => ({ value: r, label: r }))]} />
            <Select label="Status" value={status} onChange={(v) => setStatus(v as MemberStatus)} options={statuses.map((s) => ({ value: s, label: s }))} />
            <Select
              label="Clock"
              value={clock}
              onChange={(v) => setClock(v as Clock)}
              options={[
                { value: "any", label: "Anyone" },
                { value: "in", label: "Clocked in" },
                { value: "out", label: "Not clocked in" },
              ]}
            />
          </div>
          <p className="text-muted">
            {employees.length} {employees.length === 1 ? "employee" : "employees"}
            {period ? ` · pay period ${formatPeriod(period.startsAt, period.endsAt)}` : ""}
          </p>
        </>
      }
    >
      {loadError ? (
        <Alert tone="error" title={`Couldn't load employees: ${loadError}`} />
      ) : loading ? (
        <p className="text-muted">Loading…</p>
      ) : employees.length === 0 ? (
        <EmptyState area="hr" title="No matching employees" body="Try a different name, team or status." />
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-[0.12em] text-muted">
              <th className={`py-2 font-bold ${stickyHeadCell}`}>Name</th>
              <th className={`py-2 font-bold ${stickyHeadCell}`}>Team</th>
              <th className={`py-2 font-bold ${stickyHeadCell}`}>Role</th>
              <th className={`py-2 font-bold ${stickyHeadCell}`}>Status</th>
              <th className={`py-2 font-bold ${stickyHeadCell}`}>On the clock</th>
              <th className={`py-2 text-right font-bold ${stickyHeadCell}`}>Hours this period</th>
              <th className={`py-2 text-right font-bold ${stickyHeadCell}`}>Corrections</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => {
              const look = memberStatusLook[e.status];
              return (
                <tr key={e.id} className="border-t border-line">
                  <td className="py-3 pr-4">
                    <div className="font-medium">{e.name}</div>
                    <div className="text-sm text-muted">{e.email}</div>
                  </td>
                  <td className="py-3 pr-4">{e.teamName ?? <span className="text-muted">No team</span>}</td>
                  <td className="py-3 pr-4">{e.role}</td>
                  <td className={`py-3 pr-4 font-bold ${look.text}`}>
                    <span className="inline-flex items-center gap-1.5">
                      <Shape shape={look.shape} color={look.color} size={10} />
                      {e.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    {e.clockedInSince ? (
                      <span className="inline-flex items-center gap-1.5 font-bold text-blue">
                        <Shape shape="circle" color={colors.blue} size={10} />
                        Since {formatTime(e.clockedInSince)}
                      </span>
                    ) : (
                      <span className="text-muted">Not clocked in</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">{formatHours(e.hoursThisPeriod)}</td>
                  <td className="py-3 text-right">
                    {e.pendingCorrections > 0 ? (
                      <Button variant="ghost" onClick={() => onReviewCorrections(e.name)}>
                        {e.pendingCorrections} to review →
                      </Button>
                    ) : (
                      <span className="text-muted">None</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
