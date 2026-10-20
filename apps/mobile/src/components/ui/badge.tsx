// badge.tsx
import { StyleSheet, View } from "react-native";
import { colors, fonts, space, typeScale } from "@/theme";
import { T } from "./text";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";
const tones: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.surface, fg: colors.ink },
  info: { bg: colors.blue, fg: colors.paper },
  success: { bg: colors.blue, fg: colors.paper },
  warning: { bg: colors.yellow, fg: colors.ink },
  danger: { bg: colors.red, fg: colors.paper },
};

export function Badge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  const t = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <T style={[styles.text, { color: t.fg }]}>{label}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: "flex-start", paddingHorizontal: space[2], paddingVertical: space[1] },
  text: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: typeScale.label.lineHeight,
    textTransform: "uppercase",
    letterSpacing: 11 * typeScale.label.letterSpacing,
  },
});
