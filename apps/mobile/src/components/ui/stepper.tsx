// stepper.tsx
import { StyleSheet, View } from "react-native";
import { colors, fonts, space } from "@/theme";
import { T } from "./text";

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <View>
      {steps.map((step, i) => (
        <View key={`${i}-${step}`}>
          <View accessibilityLabel={step} accessibilityState={{ selected: i === current }} style={styles.row}>
            <View style={[styles.marker, i < current && styles.markerDone, i === current && styles.markerCurrent, i > current && styles.markerUpcoming]} />
            <T style={i === current ? styles.current : i > current ? styles.upcoming : undefined}>{step}</T>
          </View>
          {i < steps.length - 1 ? <View style={[styles.connector, i < current && styles.connectorDone]} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space[3] },
  marker: { width: 14, height: 14 },
  markerDone: { backgroundColor: colors.ink },
  markerCurrent: { backgroundColor: colors.red },
  markerUpcoming: { borderWidth: 2, borderColor: colors.line, backgroundColor: "transparent" },
  connector: { width: 2, height: space[3], marginLeft: 6, backgroundColor: colors.line },
  connectorDone: { backgroundColor: colors.ink },
  current: { fontFamily: fonts.bold },
  upcoming: { color: colors.muted },
});
