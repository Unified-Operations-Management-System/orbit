// checkbox.tsx
import { Pressable, StyleSheet, View } from "react-native";
import { colors, fonts, minTouch, space } from "@/theme";
import { T } from "./text";

export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <Pressable
      role="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={() => onChange(!checked)}
      style={styles.press}
    >
      <View style={[styles.box, checked && { backgroundColor: colors.ink, justifyContent: "center", alignItems: "center" }]}>
        {checked ? <T style={{ color: colors.paper, fontFamily: fonts.bold, fontSize: 14 }}>✓</T> : null}
      </View>
      <T>{label}</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: { minHeight: minTouch, flexDirection: "row", alignItems: "center", gap: space[3] },
  box: { width: 22, height: 22, borderWidth: 2, borderColor: colors.ink, backgroundColor: "transparent" },
});
