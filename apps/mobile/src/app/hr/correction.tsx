import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Alert, Button, Card, Checkbox, Input, T } from "@/components/ui";
import { problemMessage, useRefreshHr } from "@/features/hr/api";
import { atMinutes, formatDay, formatTime, parseTime } from "@/features/hr/format";
import { HrScreen, Row, hrStyles } from "@/features/hr/hr-screen";
import { $api } from "@/lib/api";
import { colors, space } from "@/theme";

// WF-08 Correction Form. UC-HR-04 Request Time Correction, steps 4-9 and extensions 3.a,
// 3.b, 5.a, 6.a, 7.a-7.c, 8.a, on POST /hr/time-corrections and .../{id}/withdraw.
// The server applies the rules; the form shows its answers.

const minutesOf = (iso?: string) => (iso ? new Date(iso).getHours() * 60 + new Date(iso).getMinutes() : null);
const label = (min: number | null) => (min === null ? "" : formatTime(atMinutes(new Date(), min)));

export default function CorrectionForm() {
  const { entryId, shiftId, periodId } = useLocalSearchParams<{ entryId?: string; shiftId?: string; periodId?: string }>();
  const timecard = $api.useQuery("get", "/hr/timecard", { params: { query: periodId ? { payPeriodId: periodId } : {} } });
  const status = $api.useQuery("get", "/hr/clock", { enabled: !!entryId });
  const refresh = useRefreshHr();
  const submit = $api.useMutation("post", "/hr/time-corrections", { onSuccess: refresh });
  const withdraw = $api.useMutation("post", "/hr/time-corrections/{correctionId}/withdraw", { onSuccess: refresh });

  const tc = timecard.data;
  // The punch may be the open one (UC-HR-02 ext 2.b), which the timecard lists too.
  const entry = entryId ? (tc?.entries.find((e) => e.id === entryId) ?? (status.data?.openEntry?.id === entryId ? status.data.openEntry : undefined)) : undefined;
  const shift = shiftId ? tc?.missedShifts.find((s) => s.id === shiftId) : undefined;
  const workDay = entry?.clockIn ?? shift?.startsAt;

  const [clockIn, setClockIn] = useState<string | null>(null);
  const [clockOut, setClockOut] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [ack, setAck] = useState(false);
  const [attempted, setAttempted] = useState(false);

  if (timecard.isPending) {
    return (
      <HrScreen eyebrow="Time correction" title="Loading…" backLabel="Timecard">
        <T style={hrStyles.muted}>Loading…</T>
      </HrScreen>
    );
  }
  if (!tc || !workDay) {
    return (
      <HrScreen eyebrow="Time correction" title="Not found" backLabel="Timecard">
        <Alert tone="error" title="Couldn't find that entry" message={timecard.error ? problemMessage(timecard.error) : "It may have been corrected already."} />
      </HrScreen>
    );
  }

  const title = formatDay(workDay);
  const sent = submit.data;
  const pending = tc.corrections.find((c) => c.status === "Pending" && (entry ? c.timeEntryId === entry.id : !c.timeEntryId && c.shiftId === shiftId));

  // Step 9: confirmation after submitting.
  if (sent) {
    return (
      <HrScreen eyebrow="Time correction" title="Request sent" backLabel="Timecard">
        <Alert tone="success" title="Correction pending" message="Sent for approval. Your original entry stays on your timecard until it's approved." />
        <Card style={hrStyles.card}>
          <Row label="Date" value={title} />
          <Row label="Corrected times" value={`${formatTime(sent.clockIn)} – ${formatTime(sent.clockOut)}`} />
          <Row label="Reason" value={sent.reason} />
          {sent.adjustment ? <Row label="Posted as" value="Adjustment this period" /> : null}
        </Card>
        <Button variant="secondary" title="Back to timecard" onPress={() => router.back()} />
      </HrScreen>
    );
  }

  // Ext 3.b: already has a pending correction.
  if (pending) {
    return (
      <HrScreen eyebrow="Time correction" title={title} backLabel="Timecard">
        <Alert tone="info" title="Correction pending" message="Waiting for your supervisor to approve it." />
        <Card style={hrStyles.card}>
          <Row label="Original" value={entry ? `${formatTime(entry.clockIn)} – ${entry.clockOut ? formatTime(entry.clockOut) : "missing"}` : "No time entry"} />
          <Row label="Requested" value={`${formatTime(pending.clockIn)} – ${formatTime(pending.clockOut)}`} />
          <Row label="Reason" value={pending.reason} />
        </Card>
        {withdraw.error ? <Alert tone="error" title="Couldn't withdraw" message={problemMessage(withdraw.error)} /> : null}
        <Button
          variant="secondary"
          title={withdraw.isPending ? "Withdrawing…" : "Withdraw request"}
          disabled={withdraw.isPending}
          onPress={() => withdraw.mutate({ params: { path: { correctionId: pending.id } } }, { onSuccess: () => router.back() })}
        />
      </HrScreen>
    );
  }

  // Step 5 defaults: the punch's times, or the scheduled shift for a missing entry.
  const inText = clockIn ?? label(minutesOf(entry?.clockIn ?? shift?.startsAt));
  const outText = clockOut ?? label(minutesOf(entry?.clockOut ?? shift?.endsAt ?? undefined));
  const inMin = parseTime(inText);
  const outMin = parseTime(outText);
  const closed = tc.payPeriod.status === "Closed";
  const badTimes = inMin === null || outMin === null;

  function send() {
    setAttempted(true);
    if (badTimes || !reason.trim() || (closed && !ack)) return;
    submit.mutate({
      body: {
        ...(entry ? { timeEntryId: entry.id } : { shiftId: shiftId! }),
        clockIn: atMinutes(workDay!, inMin!).toISOString(),
        clockOut: atMinutes(workDay!, outMin!).toISOString(),
        reason: reason.trim(),
        ...(closed ? { acknowledgeAdjustment: ack } : {}),
      },
    });
  }

  return (
    <HrScreen eyebrow="Request time correction" title={title} backLabel="Timecard">
      {/* Step 4: original times */}
      <Card style={hrStyles.card}>
        <T variant="label">Original entry</T>
        <T variant="h2">{entry ? `${formatTime(entry.clockIn)} – ${entry.clockOut ? formatTime(entry.clockOut) : "missing clock-out"}` : "No time entry"}</T>
        {shift ? <T style={hrStyles.muted}>Scheduled {formatTime(shift.startsAt)} – {formatTime(shift.endsAt)} · {shift.station}</T> : null}
      </Card>

      {shift ? <Alert tone="info" title="Add missing entry" message="You have no punches for this shift. Enter the times you actually worked." /> : null}
      {closed ? (
        // Ext 7.c
        <>
          <Alert tone="warning" title="Closed pay period" message="This period has been paid. Your correction will post as an adjustment in the current pay period." />
          <Checkbox label="I understand, post it as an adjustment" checked={ack} onChange={setAck} />
          {attempted && !ack ? <T style={styles.error}>Confirm the adjustment to continue.</T> : null}
        </>
      ) : null}

      {/* Step 5 */}
      <View style={styles.times}>
        <View style={styles.field}>
          <Input label="Clock in" placeholder="7:00 AM" value={inText} onChangeText={setClockIn} autoCapitalize="characters" />
        </View>
        <View style={styles.field}>
          <Input label="Clock out" placeholder="3:00 PM" value={outText} onChangeText={setClockOut} autoCapitalize="characters" />
        </View>
      </View>
      {attempted && badTimes ? <T style={styles.error}>Enter times like 7:00 AM and 3:00 PM.</T> : null}
      <Input
        label="Reason (required)"
        placeholder="e.g. Forgot to clock out after the line stopped"
        value={reason}
        onChangeText={setReason}
        multiline
        style={styles.reason}
        error={attempted && !reason.trim() ? "A reason is required." : undefined}
      />

      {/* Ext 7.a, 7.b, 8.a: the server's answer */}
      {submit.error ? <Alert tone="error" title="Not sent" message={problemMessage(submit.error)} /> : null}

      {/* Step 6 */}
      <Button large title={submit.isPending ? "Sending…" : "Submit request"} disabled={submit.isPending} onPress={send} />
      {/* Ext 6.a */}
      <Button variant="ghost" title="Cancel" onPress={() => router.back()} />
    </HrScreen>
  );
}

const styles = StyleSheet.create({
  times: { flexDirection: "row", gap: space[3] },
  field: { flex: 1 },
  reason: { minHeight: 88, paddingTop: space[3], textAlignVertical: "top" },
  error: { color: colors.red },
});
