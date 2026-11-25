import { router } from "expo-router";
import { View } from "react-native";

import { Alert, Button, EmptyState, ListRow, T } from "@/components/ui";
import { problemMessage } from "@/features/hr/api";
import { formatDay, formatTime } from "@/features/hr/format";
import { HrScreen, Tag, hrStyles } from "@/features/hr/hr-screen";
import { $api } from "@/lib/api";
import { colors } from "@/theme";

// Supervisor approvals on mobile, the same queue as the web HR page: correction requests
// waiting for review, scoped by the API (a supervisor's team, the owner's company).
export default function Approvals() {
  const queue = $api.useQuery("get", "/hr/time-corrections", { params: { query: { status: "Pending" } } });
  const items = queue.data ?? [];

  return (
    <HrScreen eyebrow="Time corrections" title="Approvals" backLabel="Home">
      {queue.isPending ? (
        <T style={hrStyles.muted}>Loading…</T>
      ) : queue.isError ? (
        <>
          <Alert tone="error" title="Couldn't load requests" message={problemMessage(queue.error)} />
          <Button variant="secondary" title="Retry" onPress={() => queue.refetch()} />
        </>
      ) : items.length === 0 ? (
        <EmptyState area="hr" title="Nothing waiting for review" body="New correction requests from your team show up here." />
      ) : (
        <>
          <T style={hrStyles.muted}>
            {items.length} waiting for review. Tap one to approve or reject it.
          </T>
          <View style={hrStyles.rule}>
            {items.map((c) => (
              <ListRow
                key={c.id}
                title={`${c.memberName} · ${formatDay(c.clockIn)}`}
                subtitle={`Asks for ${formatTime(c.clockIn)} – ${formatTime(c.clockOut)}`}
                right={c.punchClockIn ? <T>→</T> : <Tag shape="square" color={colors.red} textColor={colors.red} label="Missing" />}
                onPress={() => router.push({ pathname: "/hr/approval/[correctionId]", params: { correctionId: c.id } })}
              />
            ))}
          </View>
        </>
      )}
    </HrScreen>
  );
}
