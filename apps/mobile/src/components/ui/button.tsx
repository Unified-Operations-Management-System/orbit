// button.tsx
import { Pressable, StyleSheet, type PressableProps } from "react-native";
import { colors, fonts, minTouch, space } from "@/theme";
import { T } from "./text";

type Variant = "primary" | "secondary" | "ghost";
const bg: Record<Variant, string> = { primary: colors.red, secondary: colors.ink, ghost: "transparent" };

export function Button({ title, variant = "primary", large, ...props }: PressableProps & { title: string; variant?: Variant; large?: boolean }) {
  return (
    <Pressable
      role="button"
      style={({ pressed }) => [styles.base, { backgroundColor: bg[variant] }, large && styles.large, pressed && styles.pressed]}
      {...props}
    >
      <T style={[styles.label, { color: variant === "ghost" ? colors.ink : colors.paper }, large && styles.largeLabel]}>{title}</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: minTouch, paddingHorizontal: space[6], justifyContent: "center", alignItems: "center" },
  large: { minHeight: 64 },
  pressed: { opacity: 0.85 },
  label: { fontFamily: fonts.bold, fontSize: 16 },
  largeLabel: { fontSize: 20 },
});
