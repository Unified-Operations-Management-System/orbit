import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Card, ListRow, StatusPill, T } from "@/components/ui";
import { formatTime } from "@/features/hr/time-attendance";
import { useTimeClock } from "@/features/hr/time-clock-store";
import { myTasks, todayShift } from "@/features/home/mock-data";
import { roleLabels, useRole } from "@/lib/role";
import { colors, space } from "@/theme";

export default function Home() {
  const { role } = useRole();
  // HR Time and Attendance (UC-HR-01 step 1): Home opens the Time Clock and shows the punch status.
  const { openSince } = useTimeClock();
  const clockedIn = openSince !== null;

  return (
    <SafeAreaView edges={["top"]} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.body}>
        <T variant="label">{todayShift.label}</T>
        <T variant="display">Good morning, {role ? roleLabels[role] : ""}.</T>
        <Card accent="blue">
          <T variant="label">Today</T>
          <T variant="h2">{todayShift.time}</T>
          <T style={{ color: colors.muted }}>{todayShift.station}</T>
        </Card>
        <Button large title={clockedIn ? "Clock out →" : "Clock in →"} onPress={() => router.push("/hr/time-clock")} />
        {clockedIn ? <T style={{ color: colors.muted }}>Clocked in at {formatTime(openSince)}</T> : null}
        <View style={styles.list}>
          <ListRow title="My timecard" subtitle="Hours this pay period and corrections" right={<T>→</T>} onPress={() => router.push("/hr/timecard")} />
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
