import { StyleSheet, Text, type TextProps } from "react-native";
import { colors, fonts, typeScale } from "@/theme";

type Variant = keyof typeof typeScale;

export function T({ variant = "body", style, ...props }: TextProps & { variant?: Variant }) {
  return <Text style={[styles.base, styles[variant], style]} {...props} />;
}

const styles = StyleSheet.create({
  base: { color: colors.ink },
  display: { fontFamily: fonts.extraBold, fontSize: typeScale.display.size, lineHeight: typeScale.display.lineHeight },
  h2: { fontFamily: fonts.bold, fontSize: typeScale.h2.size, lineHeight: typeScale.h2.lineHeight },
  body: { fontFamily: fonts.regular, fontSize: typeScale.body.size, lineHeight: typeScale.body.lineHeight },
  label: {
    fontFamily: fonts.bold,
    fontSize: typeScale.label.size,
    lineHeight: typeScale.label.lineHeight,
    letterSpacing: typeScale.label.size * typeScale.label.letterSpacing,
    textTransform: "uppercase",
    color: colors.muted,
  },
  stat: { fontFamily: fonts.extraBold, fontSize: typeScale.stat.size, lineHeight: typeScale.stat.lineHeight },
});
