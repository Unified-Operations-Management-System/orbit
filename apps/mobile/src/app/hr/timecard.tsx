import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { ListRow, StatCard, T } from "@/components/ui";
import { HrScreen, PrototypeNote, Tag, hrStyles } from "@/features/hr/hr-screen";
import { entryHours, formatHours, formatTime, payPeriod, type TimeEntry } from "@/features/hr/time-attendance";
import { useTimeClock, useTimecardEntries, type Correction } from "@/features/hr/time-clock-store";
import { colors, fonts, space } from "@/theme";

// WF-07 My Timecard. UC-HR-04 Request Time Correction, steps 1–3 and extensions 3.a, 3.b.

function times(e: TimeEntry) {
  if (e.clockIn === null) return "No time entry";
  return `${formatTime(e.clockIn)} – ${e.clockOut === null ? "missing clock-out" : formatTime(e.clockOut)}`;
}

function EntryTag({ entry, correction }: { entry: TimeEntry; correction?: Correction }) {
  if (correction) return <Tag shape="circle" color={colors.blue} textColor={colors.blue} label="Correction pending" />;
  if (entry.clockIn === null || entry.clockOut === null) return <Tag shape="square" color={colors.red} textColor={colors.red} label="Missing punch" />;
  if (entry.late) return <Tag shape="triangle" color={colors.yellow} label="Late" />;
  return <T style={styles.hours}>{formatHours(entryHours(entry))}</T>;
}

export default function Timecard() {
  const { corrections } = useTimeClock();
  const entries = useTimecardEntries();
  const current = entries.filter((e) => !e.closedPeriod);
  const closed = entries.filter((e) => e.closedPeriod);

  const total = current.reduce((sum, e) => sum + entryHours(e), 0);
  const missing = current.filter((e) => (e.clockIn === null || e.clockOut === null) && !corrections[e.id]).length;

  const open = (e: TimeEntry) => router.push({ pathname: "/hr/correction", params: { entryId: e.id } });

  return (
    <HrScreen eyebrow={`Pay period ${payPeriod.label}`} title="My timecard" backLabel="Back">
      {/* Step 2: entries with daily totals, missing punches flagged */}
      <View style={styles.stats}>
        <StatCard label="Hours" value={formatHours(Math.round(total * 100) / 100).replace(" h", "")} accent="blue" />
        <StatCard label="Missing punches" value={String(missing)} accent={missing ? "red" : "ink"} alert={missing > 0} />
      </View>
      <T style={hrStyles.muted}>Paid on {payPeriod.payDate}. Tap an entry to request a correction.</T>

      <View style={hrStyles.rule}>
        {current.map((e) => (
          <ListRow
            key={e.id}
            title={`${e.day} ${e.date}`}
            subtitle={e.clockIn === null ? "No time entry · tap to add the missing entry" : times(e)}
            right={<EntryTag entry={e} correction={corrections[e.id]} />}
            onPress={() => open(e)}
          />
        ))}
      </View>

      <T variant="label" style={styles.section}>Last pay period (closed)</T>
      <View style={hrStyles.rule}>
        {closed.map((e) => (
          <ListRow
            key={e.id}
            title={`${e.day} ${e.date}`}
            subtitle={times(e)}
            right={<EntryTag entry={e} correction={corrections[e.id]} />}
            onPress={() => open(e)}
          />
        ))}
      </View>

      <PrototypeNote>Prototype: sample entries for Priya. Today&apos;s punches appear here after you clock out.</PrototypeNote>
    </HrScreen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", gap: space[3] },
  hours: { fontFamily: fonts.bold },
  section: { marginTop: space[4] },
});
