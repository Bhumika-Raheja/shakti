import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AlertProvider } from "../context/AlertContext";
import { AuthProvider } from "../context/AuthContext";
import { SettingsProvider } from "../context/SettingsContext";
import { VolunteerProvider } from "../context/VolunteerContext";

// The frame around the whole app
export default function RootLayout() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <AlertProvider>
          <VolunteerProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }} />
          </VolunteerProvider>
        </AlertProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}