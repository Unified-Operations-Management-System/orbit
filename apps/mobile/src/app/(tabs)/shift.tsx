import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Alert, Badge, Button, Card, Checkbox, EmptyState, ListRow, PageHeader, Segmented, T } from "@/components/ui";
import { PrototypeNote, Tag, hrStyles } from "@/features/hr/hr-screen";
import { formatTime, shifts, today, weekLabels, type Shift } from "@/features/hr/time-attendance";
import { colors, space } from "@/theme";

// WF-05 Schedule. UC-HR-03 View Upcoming Shifts, steps 1–3 and extensions 2.a–2.d, 3.a.

function ShiftRight({ shift }: { shift: Shift }) {
  if (shift.status === "timeOff") return <Tag shape="square" color={colors.blue} textColor={colors.blue} label="Time off" />;
  return (
    <View style={styles.right}>
      {shift.status === "updated" ? <Badge label="Updated" tone="warning" /> : null}
      <T>→</T>
    </View>
  );
}

export default function Schedule() {
  const [week, setWeek] = useState<"this" | "next">("this");
  const [noneYet, setNoneYet] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const visible = noneYet ? [] : shifts.filter((s) => s.week === week);

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
        <T variant="label">{weekLabels[week]}</T>

        {loadError ? (
          // Ext 2.d
          <View style={styles.gap}>
            <Alert tone="error" title="Couldn't load your schedule" message="Check your connection and try again." />
            <Button variant="secondary" title="Retry" onPress={() => setLoadError(false)} />
          </View>
        ) : visible.length === 0 ? (
          // Ext 2.a
          <EmptyState area="hr" title="No upcoming shifts published yet" body="Your supervisor hasn't published the schedule. Check back later." />
        ) : (
          <View style={hrStyles.rule}>
            {visible.map((s) => (
              <ListRow
                key={s.id}
                title={`${s.day} ${s.date}${s.date === today.date ? " · Today" : ""}`}
                subtitle={s.status === "timeOff" ? "Approved time off" : `${formatTime(s.start)} – ${formatTime(s.end)} · ${s.station}`}
                right={<ShiftRight shift={s} />}
                onPress={s.status === "timeOff" ? undefined : () => router.push({ pathname: "/hr/shift/[shiftId]", params: { shiftId: s.id } })}
              />
            ))}
          </View>
        )}

        <Card style={[hrStyles.card, styles.demo]}>
          <T variant="label">Prototype controls</T>
          <Checkbox label="No shifts published yet" checked={noneYet} onChange={setNoneYet} />
          <Checkbox label="Simulate load error" checked={loadError} onChange={setLoadError} />
        </Card>
        <PrototypeNote>Prototype: sample schedule for Priya. Published shifts arrive with the HR API.</PrototypeNote>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.paper },
  body: { padding: space[6], gap: space[3] },
  gap: { gap: space[3] },
  right: { flexDirection: "row", alignItems: "center", gap: space[2] },
  demo: { marginTop: space[6], backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderStyle: "dashed" },
});
