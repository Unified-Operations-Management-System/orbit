import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Alert, Button, Card, Checkbox, Input, T } from "@/components/ui";
import { HrScreen, PrototypeNote, Row, hrStyles } from "@/features/hr/hr-screen";
import { correctionProblem, employee, formatTime, parseTime, shifts } from "@/features/hr/time-attendance";
import { useTimeClock, useTimecardEntries } from "@/features/hr/time-clock-store";
import { colors, space } from "@/theme";

// WF-08 Correction Form. UC-HR-04 Request Time Correction, steps 4–9 and extensions
// 3.a, 3.b, 5.a, 6.a, 7.a–7.c, 8.a, 8.b.

const toLabel = (min: number | null) => (min === null ? "" : formatTime(min));

export default function CorrectionForm() {
  const { entryId } = useLocalSearchParams<{ entryId: string }>();
  const entries = useTimecardEntries();
  const { corrections, submitCorrection, withdrawCorrection } = useTimeClock();
  const entry = entries.find((e) => e.id === entryId);

  // Missing punches are pre-filled from the scheduled shift for that day.
  const shift = entry ? shifts.find((s) => s.date === entry.date) : undefined;
  const [clockIn, setClockIn] = useState(toLabel(entry?.clockIn ?? shift?.start ?? null));
  const [clockOut, setClockOut] = useState(toLabel(entry?.clockOut ?? shift?.end ?? null));
  const [reason, setReason] = useState("");
  const [adjustmentOk, setAdjustmentOk] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [offline, setOffline] = useState(false);
  const [noSupervisor, setNoSupervisor] = useState(false);
  const [notSent, setNotSent] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (!entry) {
    return (
      <HrScreen eyebrow="Time correction" title="Not found" backLabel="Timecard">
        <T>That time entry doesn&apos;t exist.</T>
      </HrScreen>
    );
  }

  const title = `${entry.day} ${entry.date}`;
  const pending = corrections[entry.id];

  // Step 9: confirmation after submitting.
  if (sentTo && pending) {
    return (
      <HrScreen eyebrow="Time correction" title="Request sent" backLabel="Timecard">
        <Alert tone="success" title="Correction pending" message={`Sent to ${sentTo} for approval. Your original entry stays on your timecard until it's approved.`} />
        <Card style={hrStyles.card}>
          <Row label="Date" value={title} />
          <Row label="Corrected times" value={`${formatTime(pending.clockIn)} – ${formatTime(pending.clockOut)}`} />
          <Row label="Reason" value={pending.reason} />
          {pending.adjustment ? <Row label="Posted as" value="Adjustment this period" /> : null}
        </Card>
        <Button variant="secondary" title="Back to timecard" onPress={() => router.back()} />
      </HrScreen>
    );
  }

  // Ext 3.b: already has a pending correction.
  if (pending) {
    return (
      <HrScreen eyebrow="Time correction" title={title} backLabel="Timecard">
        <Alert tone="info" title="Correction pending" message={`Waiting for ${employee.supervisor} to approve.`} />
        <Card style={hrStyles.card}>
          <Row label="Original" value={entry.clockIn === null ? "No time entry" : `${formatTime(entry.clockIn)} – ${toLabel(entry.clockOut) || "missing"}`} />
          <Row label="Requested" value={`${formatTime(pending.clockIn)} – ${formatTime(pending.clockOut)}`} />
          <Row label="Reason" value={pending.reason} />
        </Card>
        <Button
          variant="secondary"
          title="Withdraw request"
          onPress={() => {
            withdrawCorrection(entry.id);
            router.back();
          }}
        />
      </HrScreen>
    );
  }

  // Step 7 checks, shown once the employee tries to submit.
  const inMin = parseTime(clockIn);
  const outMin = parseTime(clockOut);
  const problems: string[] = [];
  if (inMin === null || outMin === null) problems.push("Enter times like 7:00 AM and 3:00 PM.");
  else {
    const p = correctionProblem({ entryId: entry.id, date: entry.date, clockIn: inMin, clockOut: outMin }, entries); // ext 7.a, 7.b
    if (p) problems.push(p);
  }
  if (!reason.trim()) problems.push("Add a reason for the correction."); // ext 5.a
  if (entry.closedPeriod && !adjustmentOk) problems.push("Confirm the adjustment to continue."); // ext 7.c
  const shown = attempted ? problems : [];

  function submit() {
    setAttempted(true);
    setNotSent(false);
    if (problems.length || inMin === null || outMin === null) return;
    if (offline) {
      setNotSent(true); // ext 8.a: keep the form filled
      return;
    }
    submitCorrection({ entryId: entry!.id, date: entry!.date, clockIn: inMin, clockOut: outMin, reason: reason.trim(), status: "pending", adjustment: !!entry!.closedPeriod });
    setSentTo(noSupervisor ? "the HR Administrator" : employee.supervisor); // ext 8.b
  }

  return (
    <HrScreen eyebrow="Request time correction" title={title} backLabel="Timecard">
      {/* Step 4: original times */}
      <Card style={hrStyles.card}>
        <T variant="label">Original entry</T>
        <T variant="h2">{entry.clockIn === null ? "No time entry" : `${formatTime(entry.clockIn)} – ${toLabel(entry.clockOut) || "missing clock-out"}`}</T>
        {shift ? <T style={hrStyles.muted}>Scheduled {formatTime(shift.start)} – {formatTime(shift.end)} · {shift.station}</T> : null}
      </Card>

      {entry.clockIn === null ? <Alert tone="info" title="Add missing entry" message="You have no punches for this shift. Enter the times you actually worked." /> : null}
      {entry.closedPeriod ? (
        <>
          <Alert tone="warning" title="Closed pay period" message="This period has been paid. Your correction will post as an adjustment in the current pay period." />
          <Checkbox label="I understand, post it as an adjustment" checked={adjustmentOk} onChange={setAdjustmentOk} />
        </>
      ) : null}

      {/* Step 5 */}
      <View style={styles.times}>
        <View style={styles.field}>
          <Input label="Clock in" placeholder="7:00 AM" value={clockIn} onChangeText={setClockIn} autoCapitalize="characters" />
        </View>
        <View style={styles.field}>
          <Input label="Clock out" placeholder="3:00 PM" value={clockOut} onChangeText={setClockOut} autoCapitalize="characters" />
        </View>
      </View>
      <Input
        label="Reason (required)"
        placeholder="e.g. Forgot to clock out after the line stopped"
        value={reason}
        onChangeText={setReason}
        multiline
        style={styles.reason}
        error={attempted && !reason.trim() ? "A reason is required." : undefined}
      />

      {shown.filter((p) => p !== "Add a reason for the correction.").map((p) => (
        <T key={p} style={hrStyles.error}>
          {p}
        </T>
      ))}
      {notSent ? <Alert tone="error" title="Not sent, try again" message="Your form is still filled in. Check your connection and submit again." /> : null}

      {/* Step 6 */}
      <Button large title="Submit request" onPress={submit} />
      {/* Ext 6.a */}
      <Button variant="ghost" title="Cancel" onPress={() => router.back()} />

      <Card style={[hrStyles.card, styles.demo]}>
        <T variant="label">Prototype controls</T>
        <Checkbox label="Simulate lost connection" checked={offline} onChange={setOffline} />
        <Checkbox label="No supervisor assigned" checked={noSupervisor} onChange={setNoSupervisor} />
      </Card>
      <PrototypeNote>Prototype: requests are kept in memory and nobody is notified yet.</PrototypeNote>
    </HrScreen>
  );
}

const styles = StyleSheet.create({
  times: { flexDirection: "row", gap: space[3] },
  field: { flex: 1 },
  reason: { minHeight: 88, paddingTop: space[3], textAlignVertical: "top" },
  demo: { marginTop: space[6], backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderStyle: "dashed" },
});
