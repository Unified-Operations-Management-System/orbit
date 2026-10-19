import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Card, StatusPill, T } from "@/components/ui";
import { myTasks, todayShift } from "@/features/home/mock-data";
import { roleLabels, useRole } from "@/lib/role";
import { colors, space } from "@/theme";

export default function Home() {
  const { role } = useRole();
  const [clockedIn, setClockedIn] = useState(false);

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
        <Button large title={clockedIn ? "Clock out" : "Clock in →"} onPress={() => setClockedIn((v) => !v)} />
        {clockedIn ? <T style={{ color: colors.muted }}>Clocked in at 7:02 AM</T> : null}
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
