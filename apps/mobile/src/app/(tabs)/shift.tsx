import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Alert, Button, EmptyState, ListRow, PageHeader, Segmented, T } from "@/components/ui";
import { problemMessage, type Shift, type TimeOff } from "@/features/hr/api";
import { addDays, formatDay, formatRange, formatTime, sameDay, startOfWeek } from "@/features/hr/format";
import { Tag, hrStyles } from "@/features/hr/hr-screen";
import { $api } from "@/lib/api";
import { colors, space } from "@/theme";

// WF-05 Schedule. UC-HR-03 View Upcoming Shifts on GET /hr/shifts (steps 1-3, ext 2.a-2.d, 3.a).

type Item = { at: Date; shift?: Shift; off?: TimeOff };

export default function Schedule() {
  const [week, setWeek] = useState<"this" | "next">("this");
  const monday = addDays(startOfWeek(new Date()), week === "this" ? 0 : 7);
  const sunday = addDays(monday, 7);
  const schedule = $api.useQuery("get", "/hr/shifts", {
    params: { query: { from: monday.toISOString(), to: sunday.toISOString() } },
  });

  const items: Item[] = [
    ...(schedule.data?.shifts ?? []).map((s) => ({ at: new Date(s.startsAt), shift: s })),
    ...(schedule.data?.timeOff ?? []).map((t) => ({ at: new Date(t.startsAt), off: t })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  return (
    <SafeAreaView edges={["top"]} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.body}>
        <PageHeader eyebrow="Published schedule" title="My shifts" />
        {/* Ext 3.a: switch week */}
        <Segmented
          options={[
            { value: "this", label: "This week" },
            { value: "next", label: "Next week" },
          ]}
          value={week}
          onChange={(v) => setWeek(v as "this" | "next")}
        />
        <T variant="label">
          {week === "this" ? "This week" : "Next week"} · {formatRange(monday, sunday)}
        </T>

        {schedule.isPending ? (
          <T style={hrStyles.muted}>Loading…</T>
        ) : schedule.isError ? (
          // Ext 2.d
          <View style={styles.gap}>
            <Alert tone="error" title="Couldn't load your schedule" message={problemMessage(schedule.error)} />
            <Button variant="secondary" title="Retry" onPress={() => schedule.refetch()} />
          </View>
        ) : items.length === 0 ? (
          // Ext 2.a
          <EmptyState area="hr" title="No upcoming shifts published yet" body="Your supervisor hasn't published this week's schedule. Check back later." />
        ) : (
          <View style={hrStyles.rule}>
            {items.map(({ shift, off, at }) =>
              off ? (
                // Ext 2.c
                <View key={off.id} style={styles.inset}>
                  <ListRow
                    title={formatDay(at)}
                    subtitle={off.status === "Approved" ? `${off.kind} · approved` : `${off.kind} · ${off.status.toLowerCase()}`}
                    right={<Tag shape="square" color={colors.blue} textColor={colors.blue} label="Time off" />}
                  />
                </View>
              ) : (
                <ListRow
                  key={shift!.id}
                  // Ext 2.b: changed after publishing
                  title={`${formatDay(at)}${sameDay(at, new Date()) ? " · Today" : ""}${shift!.changeNote ? " · Updated" : ""}`}
                  subtitle={`${formatTime(shift!.startsAt)} – ${formatTime(shift!.endsAt)} · ${shift!.station}`}
                  right={<T>→</T>}
                  onPress={() => router.push({ pathname: "/hr/shift/[shiftId]", params: { shiftId: shift!.id } })}
                />
              ),
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.paper },
  body: { padding: space[6], gap: space[3] },
  gap: { gap: space[3] },
  inset: { paddingHorizontal: space[2] },
});
