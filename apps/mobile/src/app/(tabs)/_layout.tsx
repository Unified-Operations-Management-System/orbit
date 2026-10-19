import { Redirect, Tabs } from "expo-router";
import { View } from "react-native";

import { Shape } from "@/components/ui";
import { useRole } from "@/lib/role";
import { colors, fonts } from "@/theme";

function MoreIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 20, height: 20, justifyContent: "space-between", paddingVertical: 3 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ height: 3, backgroundColor: color }} />
      ))}
    </View>
  );
}

// Yellow triangle with an ink outline: a larger ink triangle behind a smaller yellow one.
function OutlinedTriangle() {
  return (
    <View style={{ width: 20, height: 20, alignItems: "center", justifyContent: "flex-end" }}>
      <Shape shape="triangle" color={colors.ink} size={20} />
      <View style={{ position: "absolute", bottom: 2 }}>
        <Shape shape="triangle" color={colors.yellow} size={13} />
      </View>
    </View>
  );
}

// Active tab = red bar above the icon; shapes keep their own colours.
function Icon({ focused, children }: { focused: boolean; children: React.ReactNode }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", width: 28, height: 22 }}>
      {focused ? <View style={{ position: "absolute", top: -9, width: 24, height: 3, backgroundColor: colors.red }} /> : null}
      {children}
    </View>
  );
}

export default function TabsLayout() {
  const { role } = useRole();
  if (!role) return <Redirect href="/sign-in" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16 },
        tabBarStyle: { borderTopColor: colors.ink, borderTopWidth: 2, height: 72, paddingTop: 10, paddingBottom: 10 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ focused }) => <Icon focused={focused}><Shape shape="square" color={colors.ink} size={18} /></Icon> }} />
      <Tabs.Screen name="shift" options={{ title: "My shift", tabBarIcon: ({ focused }) => <Icon focused={focused}><Shape shape="circle" color={colors.blue} size={18} /></Icon> }} />
      <Tabs.Screen name="tasks" options={{ title: "Tasks", tabBarIcon: ({ focused }) => <Icon focused={focused}><OutlinedTriangle /></Icon> }} />
      <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: ({ focused }) => <Icon focused={focused}><MoreIcon color={colors.ink} /></Icon> }} />
    </Tabs>
  );
}
