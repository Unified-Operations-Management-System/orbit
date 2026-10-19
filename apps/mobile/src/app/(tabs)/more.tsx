import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AreaIcon, Button, T } from "@/components/ui";
import { roleLabels, useRole } from "@/lib/role";
import { areas, colors, space, type Area } from "@/theme";

export default function More() {
  const { role, signOut } = useRole();
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ padding: space[6], gap: space[3] }}>
        <T variant="label">Signed in as {role ? roleLabels[role] : ""}</T>
        <T variant="display">More</T>
        <View style={{ borderTopWidth: 2, borderTopColor: colors.ink }}>
          {(Object.keys(areas) as Area[]).map((a) => (
            <View key={a} style={{ flexDirection: "row", alignItems: "center", gap: space[3], minHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.line }}>
              <AreaIcon area={a} size={16} />
              <T>{areas[a].label}</T>
            </View>
          ))}
        </View>
        <Button
          variant="secondary"
          title="Sign out"
          onPress={() => {
            signOut();
            router.replace("/sign-in");
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
