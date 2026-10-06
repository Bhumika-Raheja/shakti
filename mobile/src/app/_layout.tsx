import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AlertProvider } from "../context/AlertContext";
import { AuthProvider } from "../context/AuthContext";

// The frame around the whole app
export default function RootLayout() {
  return (
    <AuthProvider>
      <AlertProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </AlertProvider>
    </AuthProvider>
  );
}