// avatar.tsx
import { StyleSheet, View } from "react-native";
import { colors, fonts } from "@/theme";
import { T } from "./text";

function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => (w[0] ?? "").toUpperCase())
    .join("");
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = initialsOf(name);
  return (
    <View
      accessibilityLabel={name}
      role="img"
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}
    >
      {initials ? <T style={{ color: colors.paper, fontFamily: fonts.bold, fontSize: Math.round(size * 0.4) }}>{initials}</T> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
});
