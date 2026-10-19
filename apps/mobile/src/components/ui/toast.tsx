// toast.tsx
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, View } from "react-native";
import { colors, space } from "@/theme";
import { T } from "./text";

export function Toast({ message, visible, tone = "info" }: { message: string; visible: boolean; tone?: "info" | "success" | "error" }) {
  if (!visible) return null;
  return (
    <ToastInner message={message} tone={tone} />
  );
}

function ToastInner({ message, tone }: { message: string; tone: "info" | "success" | "error" }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
      style={[styles.toast, { marginBottom: space[4] + insets.bottom }]}
    >
      <View style={[styles.bar, { backgroundColor: tone === "error" ? colors.red : colors.blue }]} />
      <T style={{ color: colors.paper, padding: space[3] }}>{message}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", backgroundColor: colors.ink },
  bar: { width: 6 },
});
