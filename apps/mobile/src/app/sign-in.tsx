import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Shape, T } from "@/components/ui";
import { roleLabels, useRole, type Role } from "@/lib/role";
import { colors, space, type AreaShape } from "@/theme";

const choices: { role: Role; blurb: string; shape: AreaShape; color: string }[] = [
  { role: "owner", blurb: "Company setup, members, costs and every area", shape: "circle", color: colors.red },
  { role: "supervisor", blurb: "Team, schedules, production and stock", shape: "square", color: colors.blue },
  { role: "employee", blurb: "My shift, clock in and my tasks", shape: "triangle", color: colors.yellow },
];

export default function SignIn() {
  const { signIn } = useRole();
  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.brand}>
          <View style={styles.mark}><View style={styles.moon} /></View>
          <T variant="h2">orbit</T>
        </View>
        <T variant="display">Sign in</T>
        <T style={{ color: colors.muted }}>Prototype: pick a role to see what that user sees.</T>
        <View style={styles.list}>
          {choices.map((c) => (
            <Pressable
              key={c.role}
              role="button"
              onPress={() => {
                signIn(c.role);
                router.replace("/");
              }}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}
            >
              <Shape shape={c.shape} color={c.color} size={24} />
              <View style={styles.flex}>
                <T variant="h2">{roleLabels[c.role]}</T>
                <T style={{ color: colors.muted }}>{c.blurb}</T>
              </View>
              <T variant="h2">→</T>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.paper },
  body: { padding: space[6], gap: space[4] },
  brand: { flexDirection: "row", alignItems: "center", gap: space[3], marginBottom: space[6] },
  mark: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: colors.ink },
  moon: { position: "absolute", top: -4, right: -4, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.red },
  list: { borderTopWidth: 2, borderTopColor: colors.ink, marginTop: space[4] },
  row: { flexDirection: "row", alignItems: "center", gap: space[4], minHeight: 72, borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: space[3] },
});
