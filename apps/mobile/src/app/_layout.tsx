import { Jost_400Regular, Jost_500Medium, Jost_700Bold, Jost_800ExtraBold, useFonts } from "@expo-google-fonts/jost";
import { QueryClientProvider } from "@tanstack/react-query";
import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { RoleProvider } from "@/lib/role";
import { queryClient } from "@/lib/query-client";
import { colors } from "@/theme";

SplashScreen.preventAutoHideAsync();

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.paper, primary: colors.red, text: colors.ink } };

export default function RootLayout() {
  const [loaded] = useFonts({ Jost_400Regular, Jost_500Medium, Jost_700Bold, Jost_800ExtraBold });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <RoleProvider>
        <ThemeProvider value={theme}>
          <Stack screenOptions={{ headerShown: false }} />
          <StatusBar style="dark" />
        </ThemeProvider>
      </RoleProvider>
    </QueryClientProvider>
  );
}
