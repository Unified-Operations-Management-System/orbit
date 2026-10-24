import { router, useLocalSearchParams } from "expo-router";

import { Alert, Button, Card, T } from "@/components/ui";
import { HrScreen, PrototypeNote, Row, hrStyles } from "@/features/hr/hr-screen";
import { formatHours, formatTime, hours, shifts, today } from "@/features/hr/time-attendance";

// WF-06 Shift Detail. UC-HR-03 View Upcoming Shifts, steps 3–5.

export default function ShiftDetail() {
  const { shiftId } = useLocalSearchParams<{ shiftId: string }>();
  const shift = shifts.find((s) => s.id === shiftId);

  if (!shift) {
    return (
      <HrScreen eyebrow="Shift" title="Not found" backLabel="Schedule">
        <T>That shift doesn&apos;t exist.</T>
      </HrScreen>
    );
  }

  const isToday = shift.date === today.date;

  return (
    <HrScreen eyebrow={`${shift.day} ${shift.date}${isToday ? " · Today" : ""}`} title={`${formatTime(shift.start)} – ${formatTime(shift.end)}`} backLabel="Schedule">
      {shift.change ? <Alert tone="warning" title="Updated since you last looked" message={shift.change} /> : null}
      {/* Step 4: hours, station, supervisor and notes */}
      <Card accent="blue" style={hrStyles.card}>
        <Row label="Hours" value={formatHours(hours(shift.start, shift.end))} />
        <Row label="Station" value={shift.station} />
        <Row label="Supervisor" value={shift.supervisor} />
      </Card>
      <Card style={hrStyles.card}>
        <T variant="label">Notes</T>
        <T style={shift.notes ? undefined : hrStyles.muted}>{shift.notes || "No notes for this shift."}</T>
      </Card>
      {isToday ? <Button title="Go to time clock →" onPress={() => router.push("/hr/time-clock")} /> : null}
      {/* Step 5 */}
      <Button variant="secondary" title="Back to schedule" onPress={() => router.back()} />
      <PrototypeNote>Prototype: sample shift data.</PrototypeNote>
    </HrScreen>
  );
}
