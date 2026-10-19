// search-input.tsx
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { colors, fonts, minTouch, space } from "@/theme";
import { T } from "./text";

export function SearchInput({ value, onChangeText, placeholder = "Search" }: { value: string; onChangeText: (text: string) => void; placeholder?: string }) {
  return (
    <View style={styles.wrap}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        returnKeyType="search"
        accessibilityLabel="Search"
        style={styles.input}
      />
      {value !== "" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={() => onChangeText("")}
          style={styles.clear}
        >
          <T style={styles.clearGlyph}>×</T>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { minHeight: minTouch, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center" },
  input: { flex: 1, minWidth: 0, paddingVertical: space[3], paddingHorizontal: space[3], fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  clear: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  clearGlyph: { fontFamily: fonts.bold, fontSize: 16 },
});
