import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { useEffect } from "react";
import { Alert } from "react-native";
import IncomingAlertModal from "../../components/IncomingAlertModal";
import { colors } from "../../constants/theme";
import { useVolunteer } from "../../context/VolunteerContext";

// The bottom bar for volunteers, plus the pop-up for incoming alerts
export default function VolunteerTabs() {
  const router = useRouter();
  const { active, notice, clearNotice } = useVolunteer();

  // Show messages from the server (for example "already taken")
  useEffect(() => {
    if (notice) {
      Alert.alert("Shakti", notice);
      clearNotice();
    }
  }, [notice]);

  // Once we accept an alert, open the help screen
  useEffect(() => {
    if (active) router.push("/help");
  }, [active?.alertId]);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.rose,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.white,
            borderTopColor: colors.border,
          },
          tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        }}
      >
        <Tabs.Screen
          name="alerts"
          options={{
            title: "Alerts",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="notifications-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: "History",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="time-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
      <IncomingAlertModal />
    </>
  );
}