import { router, useLocalSearchParams } from "expo-router";
import { useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Alert, Button, Card, Checkbox, Input, PageHeader, T } from "@/components/ui";
import { isDiscrepancy, receivableShipments, type ReceivableLine } from "@/features/cost/receiving";
import { colors, fonts, minTouch, space } from "@/theme";

// W-CA-M2 (enter quantities) and W-CA-M3 (confirmation) for UC-CA-13 Record Goods Receipt.
// Prototype: checks mirror RULE-CA-14 and RULE-CA-16 for the demo; the API will own them.

type Entry = { received: string; damaged: string; rejected: string; reason: string; note: string; returned: boolean; overageOk: boolean };
const blank: Entry = { received: "", damaged: "", rejected: "", reason: "", note: "", returned: false, overageOk: false };
const num = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : null);

// The root Stack hides headers, so each screen draws its own back link and title.
function Screen({ eyebrow, title, back, children }: { eyebrow: string; title: string; back: { label: string; onPress: () => void }; children: ReactNode }) {
  return (
    <SafeAreaView edges={["top"]} style={styles.flex}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
          <Pressable role="button" onPress={back.onPress} style={styles.back}>
            <T style={styles.backLabel}>← {back.label}</T>
          </Pressable>
          <PageHeader eyebrow={eyebrow} title={title} />
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const toList = { label: "Shipments", onPress: () => router.back() };

export default function ReceiveShipmentScreen() {
  const { shipmentId } = useLocalSearchParams<{ shipmentId: string }>();
  const shipment = receivableShipments.find((s) => s.id === shipmentId);
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [attempted, setAttempted] = useState(false);

  if (!shipment) {
    return (
      <Screen eyebrow="Receive shipment" title="Not found" back={toList}>
        <T>That shipment doesn&apos;t exist.</T>
      </Screen>
    );
  }

  // Extension 8b: someone already received it. Show it read-only.
  if (shipment.receipt) {
    return (
      <Screen eyebrow="Receive shipment" title={shipment.reference} back={toList}>
        <Alert tone="success" title="Already received" message={`Received on ${shipment.receipt.receivedAt}. Only a correction note can be added.`} />
        {shipment.receipt.lines.map((r) => {
          const line = shipment.lines.find((l) => l.id === r.lineId);
          return (
            <Card key={r.lineId}>
              <T variant="h2">{line?.itemName}</T>
              <T style={styles.muted}>
                {r.received} received · {r.damaged} damaged · {r.rejected} rejected · {r.received - r.damaged - r.rejected} usable
              </T>
            </Card>
          );
        })}
      </Screen>
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
      <Screen eyebrow="Receive shipment" title="Receipt recorded" back={toList}>
        <Alert
          tone="success"
          title={`${shipment.reference} received`}
          message="Landed cost per usable unit has been recalculated (provisional)."
        />
        {shipment.lines.map((l) => {
          const e = entry(l.id);
          const usable = (num(e.received) ?? 0) - (num(e.damaged || "0") ?? 0) - (num(e.rejected || "0") ?? 0);
          return (
            <Card key={l.id}>
              <T variant="h2">{l.itemName}</T>
              <T style={styles.muted}>
                {e.received} of {l.quantityShipped} received · {usable} usable
              </T>
            </Card>
          );
        })}
        {flagged.length > 0 && (
          <Alert tone="warning" title="Discrepancy" message={`${flagged.map((l) => l.itemName).join(", ")}. The bookkeeper has been notified.`} />
        )}
        {returned.length > 0 && (
          <Alert
            tone="warning"
            title="Returned to supplier"
            message={`${returned.map((l) => l.itemName).join(", ")}. The bookkeeper will request a supplier credit.`}
          />
        )}
        <Button variant="secondary" title="Back to shipments" onPress={() => router.back()} />
        <T style={styles.small}>Prototype: the receipt isn&apos;t saved yet (SCRUM-67, SCRUM-78).</T>
      </Screen>
    );
  }

  return (
    <Screen eyebrow={`${shipment.purchaseOrder} · ${shipment.supplier}`} title={shipment.reference} back={toList}>
      <Button
        variant="secondary"
        title="All received as shipped"
        onPress={() => setEntries(Object.fromEntries(shipment.lines.map((l) => [l.id, { ...entry(l.id), received: String(l.quantityShipped) }])))}
      />

      {shipment.lines.map((line) => {
        const e = entry(line.id);
        const received = num(e.received);
        const lineProblems = attempted ? problems(line) : [];
        const discrepancy = received !== null && isDiscrepancy(received, line.quantityShipped);
        const overage = received !== null && received > line.quantityShipped;
        return (
          <Card key={line.id} accent={lineProblems.length ? "red" : "ink"} style={styles.card}>
            <View>
              <T variant="h2">{line.itemName}</T>
              <T style={styles.muted}>
                {line.quantityShipped} shipped · {line.unit}
              </T>
            </View>

            <View style={styles.inputs}>
              <View style={styles.field}>
                <Input label="Received" keyboardType="number-pad" placeholder="0" value={e.received} onChangeText={(v) => update(line.id, { received: v })} />
              </View>
              <View style={styles.field}>
                <Input label="Damaged" keyboardType="number-pad" placeholder="0" value={e.damaged} onChangeText={(v) => update(line.id, { damaged: v })} />
              </View>
              <View style={styles.field}>
                <Input label="Rejected" keyboardType="number-pad" placeholder="0" value={e.rejected} onChangeText={(v) => update(line.id, { rejected: v })} />
              </View>
            </View>

            {num(e.damaged || "0") || num(e.rejected || "0") ? (
              <>
                <Input label="Reason" placeholder="e.g. torn bags, leaking" value={e.reason} onChangeText={(v) => update(line.id, { reason: v })} />
                {num(e.rejected || "0") ? (
                  <Checkbox label="Returned to supplier" checked={e.returned} onChange={(v) => update(line.id, { returned: v })} />
                ) : null}
              </>
            ) : null}

            {discrepancy && (
              <>
                <Alert
                  tone="warning"
                  title="More than 2% off"
                  message={`${received} vs ${line.quantityShipped} shipped, so the bookkeeper will be notified.`}
                />
                <Input label="What happened? (required)" value={e.note} onChangeText={(v) => update(line.id, { note: v })} />
              </>
            )}
            {overage && (
              <Checkbox label="More arrived than shipped. Confirm overage" checked={e.overageOk} onChange={(v) => update(line.id, { overageOk: v })} />
            )}
            {lineProblems.map((p) => (
              <T key={p} style={styles.error}>
                {p}
              </T>
            ))}
          </Card>
        );
      })}

      <Button
        large
        title="Confirm receipt"
        onPress={() => {
          setAttempted(true);
          if (allProblems.length === 0) setConfirmed(true);
        }}
      />
      <T style={styles.small}>Prototype: sample shipment. Scanning item labels arrives with Inventory (extension point &quot;identify items&quot;).</T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.paper },
  body: { padding: space[6], gap: space[3] },
  back: { minHeight: minTouch, justifyContent: "center", alignSelf: "flex-start" },
  backLabel: { fontFamily: fonts.bold, color: colors.muted },
  card: { gap: space[3] },
  muted: { color: colors.muted },
  small: { color: colors.muted, fontSize: 13 },
  inputs: { flexDirection: "row", gap: space[2] },
  field: { flex: 1 },
  error: { color: colors.red },
});
