import { router } from "expo-router";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PageHeader, Shape, T } from "@/components/ui";
import { colors, fonts, minTouch, space } from "@/theme";

// The root Stack hides headers, so HR screens draw their own back link and title
// (same pattern as the goods receipt prototype).
export function HrScreen({ eyebrow, title, backLabel = "Back", children }: { eyebrow: string; title: string; backLabel?: string; children: ReactNode }) {
  return (
    <SafeAreaView edges={["top"]} style={styles.flex}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
          <Pressable role="button" accessibilityLabel={backLabel} onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} style={styles.back}>
            <T style={styles.backLabel}>← {backLabel}</T>
          </Pressable>
          <PageHeader eyebrow={eyebrow} title={title} />
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Shape + label so a state never relies on colour alone (design rule 5). */
export function Tag({ shape, color, label, textColor = colors.ink }: { shape: "circle" | "square" | "triangle" | "bar"; color: string; label: string; textColor?: string }) {
  return (
    <View style={styles.tag}>
      <Shape shape={shape} color={color} size={10} />
      <T style={[styles.tagLabel, { color: textColor }]}>{label}</T>
    </View>
  );
}

/** Small grey line under a screen that explains what is mocked. */
export function PrototypeNote({ children }: { children: string }) {
  return <T style={styles.note}>{children}</T>;
}

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <T style={styles.rowLabel}>{label}</T>
      <T style={styles.rowValue}>{value}</T>
    </View>
  );
}

export const hrStyles = StyleSheet.create({
  rule: { borderTopWidth: 2, borderTopColor: colors.ink },
  muted: { color: colors.muted },
  error: { color: colors.red },
  card: { gap: space[2] },
});

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.paper },
  body: { padding: space[6], gap: space[3] },
  back: { minHeight: minTouch, justifyContent: "center", alignSelf: "flex-start" },
  backLabel: { fontFamily: fonts.bold, color: colors.muted },
  tag: { flexDirection: "row", alignItems: "center", gap: space[1] },
  tagLabel: { fontFamily: fonts.bold, fontSize: 14 },
  note: { color: colors.muted, fontSize: 13, paddingTop: space[2] },
  row: { flexDirection: "row", justifyContent: "space-between", gap: space[3], minHeight: 36, alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.line },
  rowLabel: { color: colors.muted },
  rowValue: { fontFamily: fonts.bold, flexShrink: 1, textAlign: "right" },
});
