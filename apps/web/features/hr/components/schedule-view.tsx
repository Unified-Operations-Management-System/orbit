"use client";

import { useEffect, useState } from "react";
import { Alert, Button, EmptyState, Panel, stickyHeadCell } from "@/components/ui";
import { browserApi } from "@/lib/api/browser";
import { authHeaders, useRole } from "@/lib/role";
import { problemMessage, type HrEmployee, type Schedule } from "../api";
import { formatDay, formatTime } from "../format";
import { addDays, sameDay, startOfWeek } from "../week";

// SCRUM-14: a supervisor builds the week for their team. Drafts are
// only visible to schedulers; employees see a shift once it's published (UC-HR-03).
export function ScheduleView() {
  const { role } = useRole();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [schedule, setSchedule] = useState<Schedule>();
  const [people, setPeople] = useState<HrEmployee[]>([]);
  const [loadError, setLoadError] = useState<string>();

  useEffect(() => {
    if (!role) return;
    let live = true;
    void browserApi.GET("/hr/employees", { headers: authHeaders(role), params: { query: { status: "Active" } } }).then(({ data }) => {
      if (live && data) setPeople(data.employees);
    });
    return () => {
      live = false;
    };
  }, [role]);

  useEffect(() => {
    if (!role) return;
    let live = true;
    const query = { from: weekStart.toISOString(), to: addDays(weekStart, 7).toISOString() };
    void browserApi.GET("/hr/shifts", { headers: authHeaders(role), params: { query } }).then(({ data, error }) => {
      if (!live) return;
      if (error) return setLoadError(problemMessage(error));
      setLoadError(undefined);
      setSchedule(data);
    });
    return () => {
      live = false;
    };
  }, [role, weekStart]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();
  const shifts = schedule?.shifts ?? [];
  const shiftsOn = (memberId: string, day: Date) => shifts.filter((s) => s.memberId === memberId && sameDay(new Date(s.startsAt), day));
  const offOn = (memberId: string, day: Date) =>
    schedule?.timeOff.find((t) => t.memberId === memberId && new Date(t.startsAt) < addDays(day, 1) && new Date(t.endsAt) > day);

  const goTo = setWeekStart;

  return (
    <Panel
      title="Schedule"
      className="flex-1"
      filters={
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={() => goTo(addDays(weekStart, -7))}>
              ← Previous
            </Button>
            <Button variant="ghost" onClick={() => goTo(startOfWeek(new Date()))}>
              This week
            </Button>
            <Button variant="ghost" onClick={() => goTo(addDays(weekStart, 7))}>
              Next →
            </Button>
            <span className="ml-2 font-bold">
              Week of {formatDay(weekStart.toISOString())} – {formatDay(addDays(weekStart, 6).toISOString())}
            </span>
          </div>
          <p className="text-muted">Drafts are only visible to supervisors.</p>
        </>
      }
    >
      {loadError ? (
        <Alert tone="error" title={`Couldn't load the schedule: ${loadError}`} />
      ) : !schedule ? (
        <p className="text-muted">Loading…</p>
      ) : people.length === 0 ? (
        <EmptyState area="hr" title="No one to schedule" body="Active employees on your team show up here." />
      ) : (
        <table className="w-full table-fixed text-left">
          <thead>
            <tr className="text-xs uppercase tracking-[0.12em] text-muted">
              <th className={`w-44 py-2 font-bold ${stickyHeadCell}`}>Employee</th>
              {days.map((d) => (
                <th key={d.toISOString()} className={`py-2 font-bold ${stickyHeadCell} ${sameDay(d, today) ? "text-ink" : ""}`}>
                  {formatDay(d.toISOString())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id} className="border-t border-line align-top">
                <td className="py-3 pr-3">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-sm text-muted">{p.teamName ?? "No team"}</div>
                </td>
                {days.map((d) => {
                  const off = offOn(p.id, d);
                  return (
                    <td key={d.toISOString()} className="py-2 pr-2">
                      <div className="flex flex-col gap-1.5">
                        {off ? <div className="bg-surface px-2 py-1 text-sm font-bold text-blue">{off.kind}</div> : null}
                        {shiftsOn(p.id, d).map((s) => {
                          return (
                            <div
                              key={s.id}
                              title={s.changeNote}
                              className={`border-l-4 bg-surface px-2 py-1 text-sm ${s.published ? "border-blue" : "border-dashed border-yellow"}`}
                            >
                              <span className="block font-bold">
                                {formatTime(s.startsAt)} – {formatTime(s.endsAt)}
                              </span>
                              <span className="block truncate text-muted">{s.station}</span>
                              {!s.published ? <span className="block text-xs font-bold uppercase tracking-[0.12em]">Draft</span> : null}
                              {s.published && s.changeNote ? <span className="block text-xs font-bold uppercase tracking-[0.12em] text-blue">Updated</span> : null}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}

    </Panel>
  );
}
