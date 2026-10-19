// card.tsx
import { StyleSheet, View, type ViewProps } from "react-native";
import { colors, space, type ColorToken } from "@/theme";

export function Card({ accent, style, ...props }: ViewProps & { accent?: ColorToken }) {
  return <View style={[styles.card, accent && { borderTopWidth: 6, borderTopColor: colors[accent] }, style]} {...props} />;
}

const styles = StyleSheet.create({ card: { backgroundColor: colors.surface, padding: space[4] } });
