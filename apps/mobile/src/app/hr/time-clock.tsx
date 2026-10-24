import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Alert, Badge, Button, Card, Checkbox, Segmented, Sheet, T } from "@/components/ui";
import { HrScreen, PrototypeNote, Row, Tag, hrStyles } from "@/features/hr/hr-screen";
import {
  checkClockIn,
  clockInDemoTimes,
  clockOutDemoTimes,
  clockOutSummary,
  formatHours,
  formatTime,
  hours,
  hoursThisWeekBeforeToday,
  today,
  todayShift,
} from "@/features/hr/time-attendance";
import { useTimeClock, type EntryFlag } from "@/features/hr/time-clock-store";
import { colors, space } from "@/theme";

// WF-03 Time Clock and WF-04 Confirm Punch.
// UC-HR-01 Clock In (steps 1–7) and UC-HR-02 Clock Out (steps 1–7), with their extensions.

const flagText: Record<EntryFlag, string> = { late: "Late", noShift: "Needs supervisor review", earlyOut: "Early out" };

export default function TimeClockScreen() {
  const { openSince, openFlags, todayEntry, clockIn, clockOut } = useTimeClock();
  const clockedIn = openSince !== null;

  // Prototype controls: the presenter picks "now" and failure cases to walk through extensions.
  const [inTime, setInTime] = useState(clockInDemoTimes[1].value);
  const [outTime, setOutTime] = useState(clockOutDemoTimes[1].value);
  const [noShift, setNoShift] = useState(false);
  const [offline, setOffline] = useState(false);

  const now = Number(clockedIn ? outTime : inTime);
  const shift = noShift ? null : todayShift;

  const [confirming, setConfirming] = useState(false);
  const [problem, setProblem] = useState<{ title: string; message: string } | null>(null);

  // UC-HR-01 step 4: check the time against the clock-in window.
  const inCheck = checkClockIn(now, shift);
  const inFlags: EntryFlag[] = inCheck.kind === "ok" ? [...(inCheck.late ? (["late"] as const) : []), ...(inCheck.noShift ? (["noShift"] as const) : [])] : [];

  // UC-HR-02 step 4: summary with early out and overtime.
  const summary = openSince !== null ? clockOutSummary(openSince, now, shift) : null;
  const outFlags: EntryFlag[] = summary?.earlyOut ? ["earlyOut"] : [];

  function startPunch() {
    setProblem(null);
    if (!clockedIn && inCheck.kind === "tooEarly") {
      // UC-HR-01 ext 4.a
      setProblem({ title: "Too early to clock in", message: `Your shift starts at ${formatTime(shift!.start)}. You can clock in from ${formatTime(inCheck.earliest)}.` });
      return;
    }
    setConfirming(true);
  }

  function confirmPunch() {
    setConfirming(false);
    if (offline) {
      // UC-HR-01 ext 7.a / UC-HR-02 ext 6.a
      setProblem({ title: "Not saved, try again", message: clockedIn ? "You are still clocked in. Check your connection and tap Clock Out again." : "You are still clocked out. Check your connection and tap Clock In again." });
      return;
    }
    if (clockedIn) clockOut(now, outFlags);
    else clockIn(now, inFlags);
  }

  return (
    <HrScreen eyebrow={`HR · ${today.label}`} title="Time clock" backLabel="Home">
      {/* Step 2: status, current time and today's shift */}
      <Card accent={clockedIn ? "blue" : "ink"} style={hrStyles.card}>
        <T variant="label">Status</T>
        {clockedIn ? (
          <>
            <Tag shape="circle" color={colors.blue} textColor={colors.blue} label={`Clocked in since ${formatTime(openSince!)}`} />
            <T variant="stat">{formatHours(Math.max(0, hours(openSince!, now)))}</T>
            <T style={hrStyles.muted}>elapsed at {formatTime(now)}</T>
            <View style={styles.badges}>
              {openFlags.map((f) => (
                <Badge key={f} label={flagText[f]} tone="warning" />
              ))}
            </View>
          </>
        ) : (
          <>
            <Tag shape="bar" color={colors.ink} label="Clocked out" />
            <T variant="stat">{formatTime(now)}</T>
            <T style={hrStyles.muted}>current time</T>
          </>
        )}
      </Card>

      <Card style={hrStyles.card}>
        <T variant="label">Today&apos;s shift</T>
        {shift ? (
          <>
            <T variant="h2">
              {formatTime(shift.start)} – {formatTime(shift.end)}
            </T>
            <T style={hrStyles.muted}>{shift.station}</T>
          </>
        ) : (
          // UC-HR-01 ext 2.b
          <T>No shift scheduled today. You can still clock in; your supervisor will review the entry.</T>
        )}
      </Card>

      {problem ? <Alert tone="error" title={problem.title} message={problem.message} /> : null}

      {/* Shown after clocking out: UC-HR-02 step 7 */}
      {!clockedIn && todayEntry ? (
        <Alert
          tone="success"
          title={`Clocked out at ${formatTime(todayEntry.clockOut!)}`}
          message={`You worked ${formatHours(hours(todayEntry.clockIn!, todayEntry.clockOut!))} today, ${formatHours(hoursThisWeekBeforeToday + hours(todayEntry.clockIn!, todayEntry.clockOut!))} this week.`}
        />
      ) : null}

      {/* Step 3 */}
      <Button large title={clockedIn ? "Clock out" : "Clock in →"} onPress={startPunch} />
      <Button variant="ghost" title="My timecard →" onPress={() => router.push("/hr/timecard")} />

      {/* WF-04 Confirm Punch: UC-HR-01 step 5 / UC-HR-02 step 4 */}
      <Sheet visible={confirming} onClose={() => setConfirming(false)} title={clockedIn ? "Confirm clock out" : "Confirm clock in"}>
        <View style={styles.sheet}>
          {clockedIn && summary ? (
            <>
              <Row label="Clocked in" value={formatTime(openSince!)} />
              <Row label="Clocking out" value={formatTime(now)} />
              {summary.overtime > 0 ? (
                // UC-HR-02 ext 4.b
                <>
                  <Row label="Regular hours" value={formatHours(summary.regular)} />
                  <Row label="Overtime hours" value={formatHours(summary.overtime)} />
                </>
              ) : (
                <Row label="Hours worked" value={formatHours(summary.worked)} />
              )}
              <Row label="This week" value={formatHours(summary.weekTotal)} />
              {summary.earlyOut ? <Alert tone="warning" title="Early out" message={`Your shift ends at ${formatTime(shift!.end)}. This entry will be marked Early Out.`} /> : null}
              {summary.overtime > 0 ? <Alert tone="info" title="Overtime" message="This week is over 40 hours, so the extra time is shown as overtime." /> : null}
            </>
          ) : (
            <>
              <Row label="Clock in at" value={formatTime(now)} />
              {shift ? <Row label="Shift" value={`${formatTime(shift.start)} – ${formatTime(shift.end)}`} /> : null}
              {inFlags.includes("late") ? <Alert tone="warning" title="Late" message={`Your shift started at ${formatTime(shift!.start)}. This entry will be marked Late.`} /> : null}
              {inFlags.includes("noShift") ? <Alert tone="warning" title="No shift today" message="This entry will be sent to your supervisor for review." /> : null}
            </>
          )}
          <Button title={clockedIn ? "Confirm clock out" : "Confirm clock in"} onPress={confirmPunch} />
          {/* UC-HR-01 ext 6.a / UC-HR-02 ext 5.a */}
          <Button variant="ghost" title="Cancel" onPress={() => setConfirming(false)} />
        </View>
      </Sheet>

      {/* Prototype controls */}
      <Card style={[hrStyles.card, styles.demo]}>
        <T variant="label">Prototype controls</T>
        <T style={hrStyles.muted}>Pick the current time to show each use-case extension.</T>
        <Segmented options={clockedIn ? clockOutDemoTimes : clockInDemoTimes} value={clockedIn ? outTime : inTime} onChange={clockedIn ? setOutTime : setInTime} />
        {!clockedIn ? <Checkbox label="No shift scheduled today" checked={noShift} onChange={setNoShift} /> : null}
        <Checkbox label="Simulate lost connection" checked={offline} onChange={setOffline} />
      </Card>
      <PrototypeNote>Prototype: punches are kept in memory only. The server clock and saving arrive with the HR API.</PrototypeNote>
    </HrScreen>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: "row", gap: space[2], flexWrap: "wrap" },
  sheet: { gap: space[3] },
  demo: { marginTop: space[6], backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderStyle: "dashed" },
});
