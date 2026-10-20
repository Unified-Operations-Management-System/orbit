// alert.tsx
import { StyleSheet, View } from "react-native";
import { colors, fonts, space } from "@/theme";
import { Shape } from "./area-icon";
import { T } from "./text";

type Tone = "info" | "success" | "warning" | "error";
const tones: Record<Tone, { border: string; shape: "circle" | "check" | "triangle" | "square"; color: string }> = {
  info: { border: colors.blue, shape: "circle", color: colors.blue },
  success: { border: colors.blue, shape: "check", color: colors.ink },
  warning: { border: colors.yellow, shape: "triangle", color: colors.yellow },
  error: { border: colors.red, shape: "square", color: colors.red },
};

export function Alert({ tone = "info", title, message }: { tone?: Tone; title: string; message: string }) {
  const t = tones[tone];
  return (
    <View
      accessibilityRole={tone === "error" ? "alert" : undefined}
      accessibilityLiveRegion="polite"
      style={[styles.alert, { borderLeftColor: t.border }]}
    >
      {t.shape === "check" ? (
        <T aria-hidden style={{ fontFamily: fonts.bold, color: t.color }}>✓</T>
      ) : (
        <Shape shape={t.shape} color={t.color} size={12} />
      )}
      <View style={styles.textCol}>
        <T style={styles.title}>{title}</T>
        <T>{message}</T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  alert: { backgroundColor: colors.surface, borderLeftWidth: 6, flexDirection: "row", gap: space[3], padding: space[3], alignItems: "flex-start" },
  textCol: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.bold },
});
