import { router, useLocalSearchParams } from "expo-router";

import { Alert, Button, Card, T } from "@/components/ui";
import { problemMessage } from "@/features/hr/api";
import { formatDay, formatHours, formatTime, sameDay } from "@/features/hr/format";
import { HrScreen, Row, hrStyles } from "@/features/hr/hr-screen";
import { $api } from "@/lib/api";

// WF-06 Shift Detail. UC-HR-03 View Upcoming Shifts, steps 3-5, on GET /hr/shifts/{shiftId}.

export default function ShiftDetail() {
  const { shiftId } = useLocalSearchParams<{ shiftId: string }>();
  const shift = $api.useQuery("get", "/hr/shifts/{shiftId}", { params: { path: { shiftId } } });
  const sh = shift.data;

  if (shift.isPending) {
    return (
      <HrScreen eyebrow="Shift" title="Loading…" backLabel="Schedule">
        <T style={hrStyles.muted}>Loading…</T>
      </HrScreen>
    );
  }
  if (!sh) {
    return (
      <HrScreen eyebrow="Shift" title="Not found" backLabel="Schedule">
        <Alert tone="error" title="Couldn't show this shift" message={problemMessage(shift.error)} />
      </HrScreen>
    );
  }

  const isToday = sameDay(sh.startsAt, new Date());

  return (
    <HrScreen eyebrow={`${formatDay(sh.startsAt)}${isToday ? " · Today" : ""}`} title={`${formatTime(sh.startsAt)} – ${formatTime(sh.endsAt)}`} backLabel="Schedule">
      {sh.changeNote ? <Alert tone="warning" title="Updated since it was published" message={sh.changeNote} /> : null}
      {/* Step 4: hours, station and notes */}
      <Card accent="blue" style={hrStyles.card}>
        <Row label="Hours" value={formatHours(sh.hours)} />
        <Row label="Station" value={sh.station} />
        <Row label="Employee" value={sh.memberName} />
      </Card>
      <Card style={hrStyles.card}>
        <T variant="label">Notes</T>
        <T style={sh.notes ? undefined : hrStyles.muted}>{sh.notes || "No notes for this shift."}</T>
      </Card>
      {isToday ? <Button title="Go to time clock →" onPress={() => router.push("/hr/time-clock")} /> : null}
      {/* Step 5 */}
      <Button variant="secondary" title="Back to schedule" onPress={() => router.back()} />
    </HrScreen>
  );
}
