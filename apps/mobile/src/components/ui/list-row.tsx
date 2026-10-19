// list-row.tsx
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, space } from "@/theme";
import { T } from "./text";

export function ListRow({ title, subtitle, right, leading, onPress }: { title: string; subtitle?: string; right?: ReactNode; leading?: ReactNode; onPress?: () => void }) {
  const inner = (
    <View style={[styles.row, onPress && styles.rowPress]}>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.textCol}>
        <T>{title}</T>
        {subtitle ? <T style={{ color: colors.muted }}>{subtitle}</T> : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable role="button" onPress={onPress} style={({ pressed }) => [styles.flex, pressed && { backgroundColor: colors.surface }]}>
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: space[3], paddingVertical: space[2], borderBottomWidth: 1, borderBottomColor: colors.line },
  rowPress: { paddingHorizontal: space[2] },
  leading: { alignItems: "center", justifyContent: "center" },
  textCol: { flex: 1, gap: 2 },
  right: { alignItems: "flex-end" },
});
