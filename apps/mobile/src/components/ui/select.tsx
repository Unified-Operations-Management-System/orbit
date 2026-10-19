// select.tsx
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, fonts, minTouch, space } from "@/theme";
import { ListRow } from "./list-row";
import { Sheet } from "./sheet";
import { T } from "./text";

export function Select({ label, value, options, onChange, placeholder }: { label: string; value?: string; options: { value: string; label: string }[]; onChange: (next: string) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <View style={{ gap: space[1] }}>
      <T variant="label">{label}</T>
      <Pressable
        role="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={label}
        accessibilityHint={selected?.label ?? placeholder ?? ""}
        onPress={() => setOpen(true)}
        style={styles.field}
      >
        <T style={{ color: selected ? colors.ink : colors.muted }}>{selected?.label ?? placeholder ?? label}</T>
        <T style={{ color: colors.muted }}>▾</T>
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        {options.map((o) => (
          <ListRow
            key={o.value}
            title={o.label}
            onPress={() => {
              onChange(o.value);
              setOpen(false);
            }}
            right={o.value === value ? <T aria-hidden style={{ fontFamily: fonts.bold }}>✓</T> : undefined}
          />
        ))}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: minTouch,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space[3],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
