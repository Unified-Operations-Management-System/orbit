import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Card, ListRow, StatusPill, T } from "@/components/ui";
import { formatHours, formatTime } from "@/features/hr/format";
import { myTasks, todayShift } from "@/features/home/mock-data";
import { $api } from "@/lib/api";
import { roleLabels, useRole } from "@/lib/role";
import { colors, space } from "@/theme";

export default function Home() {
  const { role } = useRole();
  // HR Time and Attendance (UC-HR-01 step 1): Home shows today's shift and punch status from
  // GET /hr/clock and opens the Time Clock.
  const { data: clock } = $api.useQuery("get", "/hr/clock");
  const open = clock?.openEntry;
  const shift = clock?.shift;
  // Supervisors and the owner also review their team's correction requests.
  const canReview = role === "owner" || role === "supervisor";
  const { data: queue } = $api.useQuery("get", "/hr/time-corrections", { params: { query: { status: "Pending" } } }, { enabled: canReview });

  return (
    <SafeAreaView edges={["top"]} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.body}>
        <T variant="label">{todayShift.label}</T>
        <T variant="display">Good morning, {role ? roleLabels[role] : ""}.</T>
        <Card accent="blue">
          <T variant="label">Today</T>
          <T variant="h2">{shift ? `${formatTime(shift.startsAt)} – ${formatTime(shift.endsAt)}` : clock ? "No shift today" : "…"}</T>
          {shift ? <T style={{ color: colors.muted }}>{shift.station}</T> : null}
        </Card>
        <Button large title={open ? "Clock out →" : "Clock in →"} onPress={() => router.push("/hr/time-clock")} />
        {open ? <T style={{ color: colors.muted }}>Clocked in at {formatTime(open.clockIn)}</T> : null}
        <View style={styles.list}>
          <ListRow
            title="My timecard"
            subtitle={clock ? `${formatHours(clock.hoursThisPeriod)} this pay period · corrections` : "Hours this pay period and corrections"}
            right={<T>→</T>}
            onPress={() => router.push("/hr/timecard")}
          />
          {canReview ? (
            <ListRow
              title="Approvals"
              subtitle={queue ? `${queue.length} correction ${queue.length === 1 ? "request" : "requests"} waiting` : "Correction requests from your team"}
              right={<T>→</T>}
              onPress={() => router.push("/hr/approvals")}
            />
          ) : null}
        </View>
        <T variant="h2" style={{ marginTop: space[4] }}>My tasks</T>
        <View style={styles.list}>
          {myTasks.map((t) => (
            <View key={t.name} style={styles.row}>
              <T style={styles.flexText}>{t.name}</T>
              <StatusPill status={t.status} />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.paper },
  body: { padding: space[6], gap: space[3] },
  list: { borderTopWidth: 2, borderTopColor: colors.ink },
  row: { flexDirection: "row", alignItems: "center", gap: space[3], minHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.line },
  flexText: { flex: 1 },
});
