// input.tsx
import { TextInput, View, type TextInputProps } from "react-native";
import { colors, fonts, minTouch, space } from "@/theme";
import { T } from "./text";

export function Input({ label, error, hint, style, ...props }: TextInputProps & { label: string; error?: string; hint?: string }) {
  return (
    <View style={{ gap: space[1] }}>
      <T variant="label">{label}</T>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[{ minHeight: minTouch, backgroundColor: colors.surface, borderWidth: 1, borderColor: error ? colors.red : colors.line, paddingHorizontal: space[3], fontFamily: fonts.regular, fontSize: 15, color: colors.ink }, style]}
        {...props}
      />
      {error ? <T style={{ color: colors.red }}>{error}</T> : hint ? <T style={{ color: colors.muted }}>{hint}</T> : null}
    </View>
  );
}
