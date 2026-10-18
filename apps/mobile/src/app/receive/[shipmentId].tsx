import { Link, Stack, useLocalSearchParams, useTheme } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { isDiscrepancy, receivableShipments, type ReceivableLine } from "@/features/cost/receiving";

// W-CA-M2 (enter quantities) and W-CA-M3 (confirmation) for UC-CA-13 Record Goods Receipt.
// Prototype: checks mirror RULE-CA-14 and RULE-CA-16 for the demo; the API will own them.

type Entry = { received: string; damaged: string; rejected: string; reason: string; note: string; returned: boolean; overageOk: boolean };
const blank: Entry = { received: "", damaged: "", rejected: "", reason: "", note: "", returned: false, overageOk: false };
const num = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : null);

export default function ReceiveShipmentScreen() {
  const { shipmentId } = useLocalSearchParams<{ shipmentId: string }>();
  const { colors } = useTheme();
  const shipment = receivableShipments.find((s) => s.id === shipmentId);
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [attempted, setAttempted] = useState(false);

  if (!shipment) {
    return (
      <View style={styles.padded}>
        <Stack.Screen options={{ title: "Not found" }} />
        <Text style={{ color: colors.text }}>That shipment doesn&apos;t exist.</Text>
      </View>
    );
  }

  // Extension 8b: someone already received it. Show it read-only.
  if (shipment.receipt) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.padded}>
        <Stack.Screen options={{ title: shipment.reference }} />
        <Text style={[styles.banner, styles.okBanner]}>Already received on {shipment.receipt.receivedAt}. Only a correction note can be added.</Text>
        {shipment.receipt.lines.map((r) => {
          const line = shipment.lines.find((l) => l.id === r.lineId);
          return (
            <View key={r.lineId} style={[styles.card, { borderColor: colors.border }]}>
              <Text style={[styles.item, { color: colors.text }]}>{line?.itemName}</Text>
              <Text style={styles.meta}>
                {r.received} received · {r.damaged} damaged · {r.rejected} rejected · {r.received - r.damaged - r.rejected} usable
              </Text>
            </View>
          );
        })}
      </ScrollView>
    );
  }

  const entry = (id: string) => entries[id] ?? blank;
  const update = (id: string, patch: Partial<Entry>) => setEntries({ ...entries, [id]: { ...entry(id), ...patch } });

  function problems(line: ReceivableLine): string[] {
    const e = entry(line.id);
    const received = num(e.received);
    const damaged = num(e.damaged || "0");
    const rejected = num(e.rejected || "0");
    const found: string[] = [];
    if (received === null) return ["Enter how many arrived."];
    if (damaged === null || rejected === null) found.push("Damaged and rejected must be whole numbers.");
    else if (damaged + rejected > received) found.push("Damaged plus rejected can't be more than received (RULE-CA-14).");
    if ((damaged || rejected) && !e.reason.trim()) found.push("Say why goods were damaged or rejected.");
    if (received > line.quantityShipped && !e.overageOk) found.push("Confirm the overage.");
    if (isDiscrepancy(received, line.quantityShipped) && !e.note.trim()) found.push("Add a note explaining the difference.");
    return found;
  }

  const allProblems = shipment.lines.flatMap((l) => problems(l));

  if (confirmed) {
    const flagged = shipment.lines.filter((l) => isDiscrepancy(num(entry(l.id).received) ?? 0, l.quantityShipped));
    const returned = shipment.lines.filter((l) => entry(l.id).returned);
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.padded}>
        <Stack.Screen options={{ title: "Receipt recorded" }} />
        <Text style={[styles.banner, styles.okBanner]}>
          {shipment.reference} received. Landed cost per usable unit has been recalculated (provisional).
        </Text>
        {shipment.lines.map((l) => {
          const e = entry(l.id);
          const usable = (num(e.received) ?? 0) - (num(e.damaged || "0") ?? 0) - (num(e.rejected || "0") ?? 0);
          return (
            <View key={l.id} style={[styles.card, { borderColor: colors.border }]}>
              <Text style={[styles.item, { color: colors.text }]}>{l.itemName}</Text>
              <Text style={styles.meta}>
                {e.received} of {l.quantityShipped} received · {usable} usable
              </Text>
            </View>
          );
        })}
        {flagged.length > 0 && (
          <Text style={[styles.banner, styles.warnBanner]}>
            Discrepancy on {flagged.map((l) => l.itemName).join(", ")}. The bookkeeper has been notified.
          </Text>
        )}
        {returned.length > 0 && (
          <Text style={[styles.banner, styles.warnBanner]}>
            Returned to supplier: {returned.map((l) => l.itemName).join(", ")}. The bookkeeper will request a supplier credit.
          </Text>
        )}
        <Link href="/receive" style={StyleSheet.flatten([styles.link, { color: colors.primary }])}>
          Back to shipments
        </Link>
        <Text style={[styles.meta, styles.small]}>Prototype: the receipt isn&apos;t saved yet (SCRUM-67, SCRUM-78).</Text>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Stack.Screen options={{ title: shipment.reference }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.padded}>
        <Text style={styles.meta}>
          {shipment.purchaseOrder} · {shipment.supplier}
        </Text>

        <Pressable
          role="button"
          onPress={() =>
            setEntries(Object.fromEntries(shipment.lines.map((l) => [l.id, { ...entry(l.id), received: String(l.quantityShipped) }])))
          }
          style={[styles.outlineButton, { borderColor: colors.border }]}
        >
          <Text style={{ color: colors.text, textAlign: "center" }}>All received as shipped</Text>
        </Pressable>

        {shipment.lines.map((line) => {
          const e = entry(line.id);
          const received = num(e.received);
          const lineProblems = attempted ? problems(line) : [];
          const discrepancy = received !== null && isDiscrepancy(received, line.quantityShipped);
          const overage = received !== null && received > line.quantityShipped;
          return (
            <View key={line.id} style={[styles.card, { borderColor: lineProblems.length ? "#ef4444" : colors.border }]}>
              <Text style={[styles.item, { color: colors.text }]}>{line.itemName}</Text>
              <Text style={styles.meta}>
                {line.quantityShipped} shipped · {line.unit}
              </Text>

              <View style={styles.inputs}>
                <Field label="Received" value={e.received} onChange={(v) => update(line.id, { received: v })} />
                <Field label="Damaged" value={e.damaged} onChange={(v) => update(line.id, { damaged: v })} />
                <Field label="Rejected" value={e.rejected} onChange={(v) => update(line.id, { rejected: v })} />
              </View>

              {(num(e.damaged || "0") || num(e.rejected || "0")) ? (
                <>
                  <TextInput
                    value={e.reason}
                    onChangeText={(v) => update(line.id, { reason: v })}
                    placeholder="Reason (e.g. torn bags, leaking)"
                    placeholderTextColor="#9ca3af"
                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  />
                  {num(e.rejected || "0") ? (
                    <View style={styles.switchRow}>
                      <Text style={{ color: colors.text, flex: 1 }}>Returned to supplier</Text>
                      <Switch value={e.returned} onValueChange={(v) => update(line.id, { returned: v })} />
                    </View>
                  ) : null}
                </>
              ) : null}

              {discrepancy && (
                <>
                  <Text style={styles.warn}>
                    {received} vs {line.quantityShipped} shipped: more than 2% off, so the bookkeeper will be notified.
                  </Text>
                  <TextInput
                    value={e.note}
                    onChangeText={(v) => update(line.id, { note: v })}
                    placeholder="What happened? (required)"
                    placeholderTextColor="#9ca3af"
                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  />
                </>
              )}
              {overage && (
                <View style={styles.switchRow}>
                  <Text style={{ color: colors.text, flex: 1 }}>More arrived than shipped. Confirm overage</Text>
                  <Switch value={e.overageOk} onValueChange={(v) => update(line.id, { overageOk: v })} />
                </View>
              )}
              {lineProblems.map((p) => (
                <Text key={p} style={styles.error}>
                  {p}
                </Text>
              ))}
            </View>
          );
        })}

        <Pressable
          role="button"
          onPress={() => {
            setAttempted(true);
            if (allProblems.length === 0) setConfirmed(true);
          }}
          style={[styles.primary, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.primaryLabel}>Confirm receipt</Text>
        </Pressable>
        <Text style={[styles.meta, styles.small]}>Prototype: sample shipment. Scanning item labels arrives with Inventory (extension point &quot;identify items&quot;).</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor="#9ca3af"
        aria-label={label}
        style={[styles.input, { color: colors.text, borderColor: colors.border }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { padding: 16, gap: 12 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 14, gap: 8 },
  item: { fontSize: 17, fontWeight: "600" },
  meta: { fontSize: 14, color: "#6b7280" },
  small: { fontSize: 12, textAlign: "center" },
  inputs: { flexDirection: "row", gap: 8 },
  field: { flex: 1, gap: 4 },
  label: { fontSize: 13, color: "#6b7280" },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  warn: { fontSize: 14, color: "#b45309" },
  error: { fontSize: 14, color: "#ef4444" },
  banner: { borderRadius: 10, padding: 12, fontSize: 15, overflow: "hidden" },
  okBanner: { backgroundColor: "#dcfce7", color: "#166534" },
  warnBanner: { backgroundColor: "#fef3c7", color: "#92400e" },
  outlineButton: { borderWidth: 1, borderRadius: 10, paddingVertical: 12 },
  primary: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  primaryLabel: { color: "white", fontSize: 17, fontWeight: "600" },
  link: { fontSize: 16, paddingVertical: 8 },
});
