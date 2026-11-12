import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Alert, Button, ListRow, Segmented, StatCard, T } from "@/components/ui";
import { problemMessage, type Shift, type TimeCorrection, type TimeEntry } from "@/features/hr/api";
import { formatDay, formatHours, formatRange, formatTime } from "@/features/hr/format";
import { HrScreen, Tag, hrStyles } from "@/features/hr/hr-screen";
import { $api } from "@/lib/api";
import { colors, fonts, space } from "@/theme";

// WF-07 My Timecard. UC-HR-04 Request Time Correction, steps 1-3 and extensions 3.a, 3.b,
// on GET /hr/timecard and GET /hr/pay-periods.

type Line = { at: Date; entry?: TimeEntry; missed?: Shift };

function LineTag({ line, pending }: { line: Line; pending?: TimeCorrection }) {
  if (pending) return <Tag shape="circle" color={colors.blue} textColor={colors.blue} label="Correction pending" />;
  if (line.missed) return <Tag shape="square" color={colors.red} textColor={colors.red} label="Missing punch" />;
  const e = line.entry!;
  if (!e.clockOut) return <Tag shape="circle" color={colors.blue} textColor={colors.blue} label="Clocked in" />;
  if (e.late) return <Tag shape="triangle" color={colors.yellow} label="Late" />;
  return <T style={styles.hours}>{formatHours(e.hours)}</T>;
}

export default function Timecard() {
  const [which, setWhich] = useState<"current" | "previous">("current");
  const periods = $api.useQuery("get", "/hr/pay-periods");
  const now = new Date();
  const list = periods.data ?? [];
  const currentIdx = list.findIndex((p) => new Date(p.startsAt) <= now && now < new Date(p.endsAt));
  const previous = currentIdx > 0 ? list[currentIdx - 1] : undefined;
  const periodId = which === "previous" ? previous?.id : undefined;

  const timecard = $api.useQuery("get", "/hr/timecard", { params: { query: periodId ? { payPeriodId: periodId } : {} } });
  const tc = timecard.data;

  const pendingFor = (line: Line) =>
    tc?.corrections.find(
      (c) => c.status === "Pending" && (line.entry ? c.timeEntryId === line.entry.id : !c.timeEntryId && c.shiftId === line.missed?.id),
    );
  const lines: Line[] = [
    ...(tc?.entries ?? []).map((e) => ({ at: new Date(e.clockIn), entry: e })),
    ...(tc?.missedShifts ?? []).map((s) => ({ at: new Date(s.startsAt), missed: s })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());
  const missing = lines.filter((l) => l.missed && !pendingFor(l)).length;
  const closed = tc?.payPeriod.status === "Closed";

  const open = (line: Line) =>
    router.push({
      pathname: "/hr/correction",
      params: { ...(line.entry ? { entryId: line.entry.id } : { shiftId: line.missed!.id }), ...(periodId ? { periodId } : {}) },
    });

  return (
    <HrScreen eyebrow={tc ? `Pay period ${formatRange(tc.payPeriod.startsAt, tc.payPeriod.endsAt)}` : "Pay period"} title="My timecard" backLabel="Back">
      {previous ? (
        <Segmented
          options={[
            { value: "current", label: "This period" },
            { value: "previous", label: "Last period" },
          ]}
          value={which}
          onChange={(v) => setWhich(v as "current" | "previous")}
        />
      ) : null}

      {timecard.isPending ? (
        <T style={hrStyles.muted}>Loading…</T>
      ) : !tc ? (
        <>
          <Alert tone="error" title="Couldn't load your timecard" message={problemMessage(timecard.error)} />
          <Button variant="secondary" title="Retry" onPress={() => timecard.refetch()} />
        </>
      ) : (
        <>
          {/* Step 2: entries with daily totals, missing punches flagged */}
          <View style={styles.stats}>
            <StatCard label="Hours" value={String(tc.hours)} accent="blue" />
            {tc.overtimeHours > 0 ? <StatCard label="Overtime" value={String(tc.overtimeHours)} accent="yellow" /> : null}
            <StatCard label="Missing punches" value={String(missing)} accent={missing ? "red" : "ink"} alert={missing > 0} />
          </View>
          <T style={hrStyles.muted}>
            {closed ? `Closed and paid on ${tc.payPeriod.payDate}. Corrections post as adjustments.` : `Paid on ${tc.payPeriod.payDate}.`} Tap an entry to request a correction.
          </T>

          {lines.length === 0 ? (
            <T style={hrStyles.muted}>No punches in this pay period yet.</T>
          ) : (
            <View style={hrStyles.rule}>
              {lines.map((line) => (
                <ListRow
                  key={line.entry?.id ?? line.missed!.id}
                  title={formatDay(line.at)}
                  subtitle={
                    line.missed
                      ? `No time entry · scheduled ${formatTime(line.missed.startsAt)} – ${formatTime(line.missed.endsAt)}`
                      : `${formatTime(line.entry!.clockIn)} – ${line.entry!.clockOut ? formatTime(line.entry!.clockOut) : "now"}${line.entry!.source === "Correction" ? " · corrected" : ""}`
                  }
                  right={<LineTag line={line} pending={pendingFor(line)} />}
                  onPress={() => open(line)}
                />
              ))}
            </View>
          )}
        </>
      )}
    </HrScreen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", gap: space[3] },
  hours: { fontFamily: fonts.bold },
});
