"use client";

import { useEffect, useState } from "react";
import { colors } from "@orbit/design-tokens";
import { Alert, EmptyState, Panel, Shape, StatCard, stickyHeadCell } from "@/components/ui";
import { browserApi } from "@/lib/api/browser";
import { authHeaders, useRole } from "@/lib/role";
import { problemMessage, type Timecard } from "../api";
import { formatDay, formatHours, formatPeriod, formatTime, roundHours } from "../format";

type Line = { at: string; entry?: Timecard["entries"][number]; missed?: Timecard["missedShifts"][number] };

function Flag({ shape, color, text, label }: { shape: "circle" | "triangle" | "square"; color: string; text: string; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-bold ${text}`}>
      <Shape shape={shape} color={color} size={10} />
      {label}
    </span>
  );
}

// My timecard on the web, the same as the mobile timecard (UC-HR-04 steps 1-3): punches and
// missed shifts for a pay period, with hours, overtime and missing punches.
export function TimecardView() {
  const { role } = useRole();
  const [timecard, setTimecard] = useState<Timecard>();
  const [loadError, setLoadError] = useState<string>();

  useEffect(() => {
    if (!role) return;
    let live = true;
    void browserApi.GET("/hr/timecard", { headers: authHeaders(role) }).then(({ data, error }) => {
      if (!live) return;
      if (error) return setLoadError(problemMessage(error));
      setLoadError(undefined);
      setTimecard(data);
    });
    return () => {
      live = false;
    };
  }, [role]);

  const lines: Line[] = timecard
    ? [
        ...timecard.entries.map((e) => ({ at: e.clockIn, entry: e })),
        ...timecard.missedShifts.map((s) => ({ at: s.startsAt, missed: s })),
      ].sort((a, b) => a.at.localeCompare(b.at))
    : [];
  const missing = lines.filter((l) => l.missed).length;
  const closed = timecard?.payPeriod.status === "Closed";

  return (
    <Panel
      title="My timecard"
      className="flex-1"
      filters={
        <>
          {timecard ? (
            <>
              <div className="mb-4 grid gap-4 sm:grid-cols-3">
                <StatCard label="Hours" value={roundHours(timecard.hours)} accent="blue" />
                <StatCard label="Overtime" value={roundHours(timecard.overtimeHours)} accent={timecard.overtimeHours ? "yellow" : "ink"} />
                <StatCard label="Missing punches" value={String(missing)} accent={missing ? "red" : "ink"} alert={missing > 0} />
              </div>
              <p className="text-muted">
                Pay period {formatPeriod(timecard.payPeriod.startsAt, timecard.payPeriod.endsAt)}
                {closed ? ", already paid. Corrections post as an adjustment in the current period." : "."}
              </p>
            </>
          ) : null}
        </>
      }
    >
      {loadError ? (
        <Alert tone="error" title={`Couldn't load your timecard: ${loadError}`} />
      ) : !timecard ? (
        <p className="text-muted">Loading…</p>
      ) : lines.length === 0 ? (
        <EmptyState area="hr" title="No punches in this pay period yet" body="Punches show up here after you clock in from the mobile app." />
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-[0.12em] text-muted">
              <th className={`py-2 font-bold ${stickyHeadCell}`}>Day</th>
              <th className={`py-2 font-bold ${stickyHeadCell}`}>In</th>
              <th className={`py-2 font-bold ${stickyHeadCell}`}>Out</th>
              <th className={`py-2 text-right font-bold ${stickyHeadCell}`}>Hours</th>
              <th className={`py-2 pl-6 font-bold ${stickyHeadCell}`}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const e = l.entry;
              return (
                <tr key={e?.id ?? l.missed!.id} className="border-t border-line">
                  <td className="py-3 pr-4 font-medium">{formatDay(l.at)}</td>
                  <td className="py-3 pr-4">{e ? formatTime(e.clockIn) : <span className="text-muted">—</span>}</td>
                  <td className="py-3 pr-4">{e?.clockOut ? formatTime(e.clockOut) : <span className="text-muted">{e ? "Still clocked in" : "—"}</span>}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">{e?.clockOut ? formatHours(e.hours) : ""}</td>
                  <td className="py-3 pl-6">
                    <span className="flex flex-wrap gap-3">
                      {l.missed ? <Flag shape="square" color={colors.red} text="text-red" label="Missing punch" /> : null}
                      {e?.late ? <Flag shape="triangle" color={colors.yellow} text="text-ink" label="Late" /> : null}
                      {e?.earlyOut ? <Flag shape="triangle" color={colors.yellow} text="text-ink" label="Left early" /> : null}
                      {e?.source === "Correction" ? <span className="text-sm text-muted">Corrected</span> : null}
                    </span>
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
