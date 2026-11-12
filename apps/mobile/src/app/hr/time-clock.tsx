import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { Alert, Badge, Button, Card, Sheet, T } from "@/components/ui";
import { problemMessage, useRefreshHr, type TimeEntry } from "@/features/hr/api";
import { formatDay, formatHours, formatTime, hoursBetween } from "@/features/hr/format";
import { HrScreen, Row, Tag, hrStyles } from "@/features/hr/hr-screen";
import { $api } from "@/lib/api";
import { colors, space } from "@/theme";

// WF-03 Time Clock and WF-04 Confirm Punch.
// UC-HR-01 Clock In and UC-HR-02 Clock Out on the API: GET /hr/clock, POST /hr/clock/in, POST /hr/clock/out.
// Punch times come from the server clock; the screen only previews them.

/** The server's time, kept ticking between refreshes: the offset is fixed when the status is fetched. */
function useServerNow(serverNow: string | undefined, fetchedAt: number): Date {
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);
  const offset = serverNow ? new Date(serverNow).getTime() - fetchedAt : 0;
  return new Date(Math.max(tick, fetchedAt) + offset);
}

export default function TimeClockScreen() {
  const status = $api.useQuery("get", "/hr/clock");
  const refresh = useRefreshHr();
  const clockIn = $api.useMutation("post", "/hr/clock/in");
  const clockOut = $api.useMutation("post", "/hr/clock/out");
  const [confirming, setConfirming] = useState(false);
  const [lastOut, setLastOut] = useState<TimeEntry | null>(null);
  const st = status.data;
  const now = useServerNow(st?.now, status.dataUpdatedAt);

  if (status.isPending) {
    return (
      <HrScreen eyebrow="HR" title="Time clock" backLabel="Home">
        <T style={hrStyles.muted}>Loading…</T>
      </HrScreen>
    );
  }
  if (status.isError || !st) {
    return (
      <HrScreen eyebrow="HR" title="Time clock" backLabel="Home">
        <Alert tone="error" title="Couldn't load the time clock" message={problemMessage(status.error)} />
        <Button variant="secondary" title="Retry" onPress={() => status.refetch()} />
      </HrScreen>
    );
  }

  const open = st.openEntry;
  const shift = st.shift;
  const busy = clockIn.isPending || clockOut.isPending;
  const error = clockIn.error ?? clockOut.error;

  // Preview of what the server will record (UC-HR-01 step 5, UC-HR-02 step 4).
  const late = !open && !!shift && now > new Date(shift.startsAt);
  const noShift = !open && !shift;
  const worked = open ? Math.max(0, hoursBetween(open.clockIn, now)) : 0;
  const weekTotal = st.hoursThisWeek + worked;
  const overtime = Math.min(worked, Math.max(0, Math.round((weekTotal - st.settings.overtimeWeeklyHours) * 100) / 100));
  const earlyOut = !!open && !!shift && now < new Date(shift.endsAt);

  function confirm() {
    setConfirming(false);
    const opts = {
      onSuccess: (entry: TimeEntry) => {
        setLastOut(entry.clockOut ? entry : null);
        refresh();
      },
    };
    if (open) clockOut.mutate({}, opts);
    else clockIn.mutate({}, opts);
  }

  // UC-HR-01 ext 4.a: the server refuses an early punch; show its window in local time.
  const tooEarly = !!error && !open && !!st.earliestClockIn && now < new Date(st.earliestClockIn);

  return (
    <HrScreen eyebrow={`HR · ${formatDay(now)}`} title="Time clock" backLabel="Home">
      {/* Step 2: status, current time and today's shift */}
      <Card accent={open ? "blue" : "ink"} style={hrStyles.card}>
        <T variant="label">Status</T>
        {open ? (
          <>
            <Tag shape="circle" color={colors.blue} textColor={colors.blue} label={`Clocked in since ${formatTime(open.clockIn)}`} />
            <T variant="stat">{formatHours(worked)}</T>
            <T style={hrStyles.muted}>elapsed at {formatTime(now)}</T>
            <View style={styles.badges}>
              {open.late ? <Badge label="Late" tone="warning" /> : null}
              {open.needsReview ? <Badge label="Needs supervisor review" tone="warning" /> : null}
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
              {formatTime(shift.startsAt)} – {formatTime(shift.endsAt)}
            </T>
            <T style={hrStyles.muted}>{shift.station}</T>
          </>
        ) : (
          // UC-HR-01 ext 2.b
          <T>No shift scheduled today. You can still clock in; your supervisor will review the entry.</T>
        )}
      </Card>

      {/* UC-HR-02 ext 2.b: an open punch longer than a shift can be */}
      {st.missedClockOut && open ? (
        <>
          <Alert tone="warning" title="Did you forget to clock out?" message={`You've been clocked in since ${formatDay(open.clockIn)} ${formatTime(open.clockIn)}. Request a correction with the right times instead.`} />
          <Button variant="secondary" title="Request time correction →" onPress={() => router.push({ pathname: "/hr/correction", params: { entryId: open.id } })} />
        </>
      ) : null}

      {error ? (
        <Alert
          tone="error"
          title={tooEarly ? "Too early to clock in" : open ? "Couldn't clock out" : "Couldn't clock in"}
          message={tooEarly ? `Your shift starts at ${formatTime(shift!.startsAt)}. You can clock in from ${formatTime(st.earliestClockIn!)}.` : problemMessage(error)}
        />
      ) : null}

      {/* UC-HR-02 step 7 */}
      {!open && lastOut?.clockOut ? (
        <Alert tone="success" title={`Clocked out at ${formatTime(lastOut.clockOut)}`} message={`You worked ${formatHours(lastOut.hours)} on this punch, ${formatHours(st.hoursThisWeek)} this week.`} />
      ) : null}

      {/* Step 3 */}
      <Button large title={busy ? "Saving…" : open ? "Clock out" : "Clock in →"} disabled={busy} onPress={() => setConfirming(true)} />
      <Button variant="ghost" title="My timecard →" onPress={() => router.push("/hr/timecard")} />

      {/* WF-04 Confirm Punch */}
      <Sheet visible={confirming} onClose={() => setConfirming(false)} title={open ? "Confirm clock out" : "Confirm clock in"}>
        <View style={styles.sheet}>
          {open ? (
            <>
              <Row label="Clocked in" value={formatTime(open.clockIn)} />
              <Row label="Clocking out" value={formatTime(now)} />
              {overtime > 0 ? (
                // UC-HR-02 ext 4.b
                <>
                  <Row label="Regular hours" value={formatHours(Math.round((worked - overtime) * 100) / 100)} />
                  <Row label="Overtime hours" value={formatHours(overtime)} />
                </>
              ) : (
                <Row label="Hours worked" value={formatHours(worked)} />
              )}
              <Row label="This week" value={formatHours(Math.round(weekTotal * 100) / 100)} />
              {earlyOut ? <Alert tone="warning" title="Early out" message={`Your shift ends at ${formatTime(shift!.endsAt)}. This entry will be marked Early Out.`} /> : null}
              {overtime > 0 ? <Alert tone="info" title="Overtime" message={`This week is over ${st.settings.overtimeWeeklyHours} hours, so the extra time is overtime.`} /> : null}
            </>
          ) : (
            <>
              <Row label="Clock in at" value={formatTime(now)} />
              {shift ? <Row label="Shift" value={`${formatTime(shift.startsAt)} – ${formatTime(shift.endsAt)}`} /> : null}
              {late ? <Alert tone="warning" title="Late" message={`Your shift started at ${formatTime(shift!.startsAt)}. This entry will be marked Late.`} /> : null}
              {noShift ? <Alert tone="warning" title="No shift today" message="This entry will be sent to your supervisor for review." /> : null}
            </>
          )}
          <Button title={open ? "Confirm clock out" : "Confirm clock in"} onPress={confirm} />
          {/* UC-HR-01 ext 6.a / UC-HR-02 ext 5.a */}
          <Button variant="ghost" title="Cancel" onPress={() => setConfirming(false)} />
        </View>
      </Sheet>
    </HrScreen>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: "row", gap: space[2], flexWrap: "wrap" },
  sheet: { gap: space[3] },
});
