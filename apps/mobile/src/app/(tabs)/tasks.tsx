import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StatusPill, T } from "@/components/ui";
import { myTasks } from "@/features/home/mock-data";
import { colors, space } from "@/theme";

export default function Tasks() {
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ padding: space[6], gap: space[3] }}>
        <T variant="label">Assigned by your supervisor</T>
        <T variant="display">Tasks</T>
        <View style={{ borderTopWidth: 2, borderTopColor: colors.ink }}>
          {myTasks.map((t) => (
            <View key={t.name} style={{ flexDirection: "row", alignItems: "center", gap: space[3], minHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.line }}>
              <T style={{ flex: 1 }}>{t.name}</T>
              <StatusPill status={t.status} />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
