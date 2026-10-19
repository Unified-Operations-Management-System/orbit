// segmented.tsx
import { Pressable, StyleSheet, View } from "react-native";
import { colors, fonts, minTouch, space } from "@/theme";
import { T } from "./text";

export function Segmented({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (next: string) => void }) {
  return (
    <View role="tablist" style={styles.tablist}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            role="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={o.label}
            onPress={() => onChange(o.value)}
            style={[styles.tab, selected && styles.tabActive]}
          >
            <T style={[selected ? { color: colors.ink } : { color: colors.muted }, { fontFamily: fonts.bold }, selected && styles.tabLabelActive]}>{o.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tablist: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.line },
  tab: { minHeight: minTouch, paddingHorizontal: space[4], justifyContent: "center", borderBottomWidth: 4, borderBottomColor: "transparent", marginBottom: -1 },
  tabActive: { borderBottomColor: colors.red },
  tabLabelActive: { color: colors.ink },
});
