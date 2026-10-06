import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

// The frame around the whole app
export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}