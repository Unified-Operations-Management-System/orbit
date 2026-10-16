import { useTheme } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { $api } from "@/lib/api";

export function HealthPill() {
  const { colors } = useTheme();
  const { data, isPending, isError } = $api.useQuery("get", "/health", {}, { refetchInterval: 15_000 });

  const status = isPending ? "checking" : isError || data?.status !== "ok" ? "down" : "ok";
  const dot = { checking: "#9ca3af", ok: "#22c55e", down: "#ef4444" }[status];

  return (
    <View style={[styles.pill, { borderColor: colors.border }]} aria-label={`Go API ${status}`}>
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <Text style={[styles.label, { color: colors.text }]}>API {status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 13 },
});
