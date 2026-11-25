import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { Alert, Button, Card, T } from "@/components/ui";
import { problemMessage, useRefreshHr } from "@/features/hr/api";
import { formatDay, formatHours, formatTime, hoursBetween } from "@/features/hr/format";
import { HrScreen, Row, hrStyles } from "@/features/hr/hr-screen";
import { $api } from "@/lib/api";
import { space } from "@/theme";

const span = (from: string, to?: string) => `${formatTime(from)} – ${to ? formatTime(to) : "no clock-out"}`;

// Review one correction request: what was scheduled, what was punched and what is asked
// for, then approve or reject. The API refuses a reviewer approving their own request.
export default function ReviewCorrection() {
  const { correctionId } = useLocalSearchParams<{ correctionId: string }>();
  const refresh = useRefreshHr();
  const list = $api.useQuery("get", "/hr/time-corrections", {});
  const approve = $api.useMutation("post", "/hr/time-corrections/{correctionId}/approve", { onSuccess: refresh });
  const reject = $api.useMutation("post", "/hr/time-corrections/{correctionId}/reject", { onSuccess: refresh });
  const c = list.data?.find((x) => x.id === correctionId);
  const busy = approve.isPending || reject.isPending;
  const done = approve.data ?? reject.data;
  const failed = approve.error ?? reject.error;

  if (list.isPending) {
    return (
      <HrScreen eyebrow="Time correction" title="Loading…" backLabel="Approvals">
        <T style={hrStyles.muted}>Loading…</T>
      </HrScreen>
    );
  }
  if (!c) {
    return (
      <HrScreen eyebrow="Time correction" title="Not found" backLabel="Approvals">
        <Alert tone="error" title="Couldn't find that request" message={list.error ? problemMessage(list.error) : "It may have been withdrawn."} />
      </HrScreen>
    );
  }

  const requested = hoursBetween(c.clockIn, c.clockOut);
  const recorded = c.punchClockIn && c.punchClockOut ? hoursBetween(c.punchClockIn, c.punchClockOut) : 0;
  const change = Math.round((requested - recorded) * 10) / 10;
  const params = { params: { path: { correctionId: c.id } } };

  return (
    <HrScreen eyebrow={c.memberName} title={formatDay(c.clockIn)} backLabel="Approvals">
      {done ? (
        <Alert
          tone="success"
          title={done.status === "Approved" ? "Approved" : "Rejected"}
          message={done.status === "Approved" ? `${c.memberName}'s timecard now shows the requested times.` : `${c.memberName}'s timecard stays as it was.`}
        />
      ) : null}
      <Card style={hrStyles.card}>
        <Row label="Scheduled" value={c.shiftStartsAt && c.shiftEndsAt ? span(c.shiftStartsAt, c.shiftEndsAt) : "No shift"} />
        <Row label="Recorded" value={c.punchClockIn ? span(c.punchClockIn, c.punchClockOut) : "No punch"} />
        <Row label="Requested" value={span(c.clockIn, c.clockOut)} />
        <Row label="Change" value={change === 0 ? "No change in hours" : `${change > 0 ? "+" : "−"}${formatHours(Math.abs(change))}`} />
        <Row label="Reason" value={c.reason} />
      </Card>
      {c.adjustment ? (
        <Alert tone="warning" title="Closed pay period" message="This day was already paid. If approved, the hours post as an adjustment in the current period." />
      ) : null}
      {failed ? <Alert tone="error" title="Not saved" message={problemMessage(failed)} /> : null}

      {done ? (
        <Button variant="secondary" title="Back to approvals" onPress={() => router.back()} />
      ) : (
        <View style={{ gap: space[3] }}>
          <Button
            large
            title={approve.isPending ? "Approving…" : "Approve"}
            disabled={busy}
            onPress={() => approve.mutate(params)}
          />
          <Button
            variant="secondary"
            title={reject.isPending ? "Rejecting…" : "Reject"}
            disabled={busy}
            onPress={() => reject.mutate(params)}
          />
        </View>
      )}
    </HrScreen>
  );
}
