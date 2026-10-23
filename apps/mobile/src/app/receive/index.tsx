import { router } from "expo-router";
import { useState } from "react";
import { Alert as NativeAlert, FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, ListRow, PageHeader, SearchInput, Shape, T } from "@/components/ui";
import { receivableShipments, type ReceivableShipment } from "@/features/cost/receiving";
import { colors, fonts, minTouch, space } from "@/theme";

// Shape + label so the status never relies on colour alone (design rule 5).
function ReceiptStatus({ shipment }: { shipment: ReceivableShipment }) {
  const received = shipment.receipt !== null;
  return (
    <View style={styles.status}>
      <Shape shape={received ? "circle" : "bar"} color={received ? colors.blue : colors.ink} size={10} />
      <T style={[styles.statusLabel, { color: received ? colors.blue : colors.ink }]}>{received ? "Received" : "To receive"}</T>
    </View>
  );
}

// W-CA-M1: shipments to receive (UC-CA-13 steps 1–3).
export default function ReceiveShipmentsScreen() {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const shipments = receivableShipments.filter(
    (s) => !q || s.reference.toLowerCase().includes(q) || s.purchaseOrder.toLowerCase().includes(q),
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.flex}>
      <FlatList
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.body}
        data={shipments}
        keyExtractor={(s) => s.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable role="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}>
              <T style={styles.backLabel}>← Back</T>
            </Pressable>
            <PageHeader eyebrow="Cost" title="Receive shipment" />
            <SearchInput value={query} onChangeText={setQuery} placeholder="Search PO number or container" />
            <View style={styles.rule} />
          </View>
        }
        renderItem={({ item: s }) => (
          <ListRow
            title={s.reference}
            subtitle={`${s.purchaseOrder} · ${s.supplier}\n${s.lines.length} lines · expected ${s.expectedArrival}`}
            right={<ReceiptStatus shipment={s} />}
            onPress={() => router.push({ pathname: "/receive/[shipmentId]", params: { shipmentId: s.id } })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <T style={{ color: colors.muted }}>No shipment matches &quot;{query}&quot;.</T>
            {/* Extension 3a2: goods arrived that nobody ordered (or the PO isn't in yet). */}
            <Button
              variant="secondary"
              title="Record unexpected delivery"
              onPress={() =>
                NativeAlert.alert(
                  "Unexpected delivery recorded",
                  "The bookkeeper has been notified to create or find the purchase order. Nothing is received until then. (Prototype: not sent.)",
                )
              }
            />
          </View>
        }
        ListFooterComponent={<T style={styles.footer}>Prototype: sample shipments, nothing is saved yet.</T>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.paper },
  body: { padding: space[6] },
  header: { gap: space[3] },
  back: { minHeight: minTouch, justifyContent: "center", alignSelf: "flex-start" },
  backLabel: { fontFamily: fonts.bold, color: colors.muted },
  rule: { height: 2, backgroundColor: colors.ink, marginTop: space[3] },
  status: { flexDirection: "row", alignItems: "center", gap: space[1] },
  statusLabel: { fontFamily: fonts.bold, fontSize: 14 },
  empty: { paddingVertical: space[6], gap: space[4] },
  footer: { paddingVertical: space[4], color: colors.muted, fontSize: 13 },
});
