import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { theme } from "../src/theme/tokens";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" backgroundColor={theme.colors.bgPrimary} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.bgSurface },
          headerTintColor: theme.colors.textPrimary,
          contentStyle: { backgroundColor: theme.colors.bgPrimary },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ title: "Sign In", presentation: "modal" }} />
      </Stack>
    </>
  );
}
