"use client";

import { useEffect, useState } from "react";
import { Alert, Button, EmptyState, Panel, stickyHeadCell } from "@/components/ui";
import { browserApi } from "@/lib/api/browser";
import { authHeaders, useRole } from "@/lib/role";
import { problemMessage, type HrEmployee, type Schedule, type Shift } from "../api";
import { formatDay, formatTime } from "../format";
import { addDays, sameDay, startOfWeek } from "../week";
import { ShiftDialog } from "./shift-dialog";

type Editing = { shift?: Shift; memberId?: string; day?: Date };

// SCRUM-14: a supervisor builds the week for their team. Drafts are
// only visible to schedulers; employees see a shift once it's published (UC-HR-03).
export function ScheduleView() {
  const { role } = useRole();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [schedule, setSchedule] = useState<Schedule>();
  const [people, setPeople] = useState<HrEmployee[]>([]);
  const [loadError, setLoadError] = useState<string>();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [notice, setNotice] = useState<string>();
  // Bumped after a change, to reload the week.
  const [version, setVersion] = useState(0);

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
  }, [role, weekStart, version]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();
  const shifts = schedule?.shifts ?? [];
  const stations = [...new Set(shifts.map((s) => s.station))].sort();
  const shiftsOn = (memberId: string, day: Date) => shifts.filter((s) => s.memberId === memberId && sameDay(new Date(s.startsAt), day));
  const offOn = (memberId: string, day: Date) =>
    schedule?.timeOff.find((t) => t.memberId === memberId && new Date(t.startsAt) < addDays(day, 1) && new Date(t.endsAt) > day);

  const goTo = (d: Date) => {
    setWeekStart(d);
    setNotice(undefined);
  };

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
          <p className="text-muted">Drafts are only visible to supervisors. Click a shift to change it, or + to add one.</p>
        </>
      }
    >
      {notice ? (
        <div className="mb-3">
          <Alert tone="success" title={notice} />
        </div>
      ) : null}
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
                  const past = addDays(d, 1) <= today;
                  return (
                    <td key={d.toISOString()} className="py-2 pr-2">
                      <div className="flex flex-col gap-1.5">
                        {off ? <div className="bg-surface px-2 py-1 text-sm font-bold text-blue">{off.kind}</div> : null}
                        {shiftsOn(p.id, d).map((s) => {
                          const started = new Date(s.startsAt) <= today;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              disabled={started}
                              title={started ? "Already started" : s.changeNote}
                              onClick={() => setEditing({ shift: s })}
                              className={`border-l-4 bg-surface px-2 py-1 text-left text-sm disabled:opacity-60 ${s.published ? "border-blue" : "border-dashed border-yellow"}`}
                            >
                              <span className="block font-bold">
                                {formatTime(s.startsAt)} – {formatTime(s.endsAt)}
                              </span>
                              <span className="block truncate text-muted">{s.station}</span>
                              {!s.published ? <span className="block text-xs font-bold uppercase tracking-[0.12em]">Draft</span> : null}
                              {s.published && s.changeNote ? <span className="block text-xs font-bold uppercase tracking-[0.12em] text-blue">Updated</span> : null}
                            </button>
                          );
                        })}
                        {past ? null : (
                          <button
                            type="button"
                            aria-label={`Add a shift for ${p.name} on ${formatDay(d.toISOString())}`}
                            onClick={() => setEditing({ memberId: p.id, day: d })}
                            className="border border-dashed border-line px-2 py-1 text-left text-sm text-muted hover:border-ink hover:text-ink"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing ? (
        <ShiftDialog
          shift={editing.shift}
          memberId={editing.memberId}
          day={editing.day}
          people={people}
          stations={stations}
          onClose={() => setEditing(null)}
          onDone={(message) => {
            setEditing(null);
            setNotice(message);
            setVersion((v) => v + 1);
          }}
        />
      ) : null}
    </Panel>
  );
}
