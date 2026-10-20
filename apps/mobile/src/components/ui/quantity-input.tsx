// quantity-input.tsx
import { Pressable, StyleSheet, View, type AccessibilityActionEvent } from "react-native";
import { colors, fonts, minTouch, space } from "@/theme";
import { T } from "./text";

export function QuantityInput({
  label,
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const set = (next: number) => onChange(Math.min(max, Math.max(min, next)));
  const atMin = value <= min;
  const atMax = value >= max;
  const onAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === "increment") set(value + step);
    if (event.nativeEvent.actionName === "decrement") set(value - step);
  };

  return (
    <View style={{ gap: space[1] }}>
      <T variant="label">{label}</T>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} decrease`}
          disabled={atMin}
          onPress={() => set(value - step)}
          style={[styles.button, atMin && styles.disabled]}
        >
          <T style={styles.glyph}>−</T>
        </Pressable>
        <View
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min, max: Number.isFinite(max) ? max : undefined, now: value }}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={onAction}
          style={styles.value}
        >
          <T style={styles.valueText}>{String(value)}</T>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} increase`}
          disabled={atMax}
          onPress={() => set(value + step)}
          style={[styles.button, atMax && styles.disabled]}
        >
          <T style={styles.glyph}>+</T>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space[2] },
  button: { width: 44, height: 44, minHeight: minTouch, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.4 },
  value: { minWidth: 64, minHeight: minTouch, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", paddingHorizontal: space[2] },
  valueText: { fontFamily: fonts.bold, fontSize: 20 },
  glyph: { color: colors.paper, fontFamily: fonts.bold, fontSize: 16 },
});
