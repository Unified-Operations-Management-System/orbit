import { Link, Stack, useTheme } from "expo-router";
import { useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { receivableShipments } from "@/features/cost/receiving";

// W-CA-M1: shipments to receive (UC-CA-13 steps 1–3).
export default function ReceiveShipmentsScreen() {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const shipments = receivableShipments.filter(
    (s) => !q || s.reference.toLowerCase().includes(q) || s.purchaseOrder.toLowerCase().includes(q),
  );

  return (
    <>
      <Stack.Screen options={{ title: "Receive shipment", headerLargeTitleEnabled: true }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        data={shipments}
        keyExtractor={(s) => s.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search PO number or container"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
              style={[styles.search, { color: colors.text, borderColor: colors.border }]}
            />
          </View>
        }
        renderItem={({ item: s }) => (
          <Link href={{ pathname: "/receive/[shipmentId]", params: { shipmentId: s.id } }} asChild>
            <Pressable style={StyleSheet.flatten([styles.row, { borderBottomColor: colors.border }])} role="button">
              <View style={styles.rowText}>
                <Text style={[styles.title, { color: colors.text }]}>{s.reference}</Text>
                <Text style={styles.meta}>
                  {s.purchaseOrder} · {s.supplier}
                </Text>
                <Text style={styles.meta}>
                  {s.lines.length} lines · expected {s.expectedArrival}
                </Text>
              </View>
              <Text style={[styles.status, s.receipt ? styles.received : { color: colors.primary }]}>
                {s.receipt ? "Received" : "To receive"}
              </Text>
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.meta, styles.center]}>No shipment matches &quot;{query}&quot;.</Text>
            {/* Extension 3a2: goods arrived that nobody ordered (or the PO isn't in yet). */}
            <Pressable
              role="button"
              onPress={() =>
                Alert.alert(
                  "Unexpected delivery recorded",
                  "The bookkeeper has been notified to create or find the purchase order. Nothing is received until then. (Prototype: not sent.)",
                )
              }
              style={[styles.outlineButton, { borderColor: colors.border }]}
            >
              <Text style={{ color: colors.text }}>Record unexpected delivery</Text>
            </Pressable>
          </View>
        }
        ListFooterComponent={<Text style={[styles.meta, styles.footer]}>Prototype: sample shipments, nothing is saved yet.</Text>}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16 },
  search: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, gap: 2 },
  title: { fontSize: 17, fontWeight: "600" },
  meta: { fontSize: 14, color: "#6b7280" },
  status: { fontSize: 14, fontWeight: "600" },
  received: { color: "#16a34a" },
  empty: { padding: 24, gap: 16, alignItems: "center" },
  center: { textAlign: "center" },
  outlineButton: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  footer: { padding: 16, textAlign: "center", fontSize: 12 },
});
