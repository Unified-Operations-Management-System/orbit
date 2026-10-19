// progress-bar.tsx
import { StyleSheet, View } from "react-native";
import { colors, space, type ColorToken } from "@/theme";
import { T } from "./text";

export function ProgressBar({ label, value, max = 100, accent = "blue" }: { label: string; value: number; max?: number; accent?: ColorToken }) {
  const pct = max === 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <View role="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max, now: value }} style={{ gap: space[1] }}>
      <View style={styles.row}>
        <T variant="label">{label}</T>
        <T>{`${Math.round(pct)}%`}</T>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: colors[accent] }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  track: { height: 12, backgroundColor: colors.surface },
  fill: { height: 12 },
});
