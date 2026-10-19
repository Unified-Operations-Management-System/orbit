import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { T } from "@/components/ui";
import { week } from "@/features/home/mock-data";
import { colors, space } from "@/theme";

export default function Shift() {
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ padding: space[6], gap: space[3] }}>
        <T variant="label">Published schedule</T>
        <T variant="display">My shift</T>
        <View style={{ borderTopWidth: 2, borderTopColor: colors.ink }}>
          {week.map((d) => (
            <View key={d.day} style={{ flexDirection: "row", minHeight: 52, alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.line }}>
              <T variant="h2" style={{ width: 64 }}>{d.day}</T>
              <T style={d.time === "Off" ? { color: colors.muted } : undefined}>{d.time}</T>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
