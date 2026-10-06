import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import Button from "./Button";

// A temporary Profile screen: who is logged in, and a Logout button.
// We will build the full design later.
export default function AccountScreen() {
    const { user, logout } = useAuth();
    const router = useRouter();

    async function onLogout() {
        await logout();
        router.replace("/");
    }

    return (
        <SafeAreaView style={styles.screen} edges={["top"]}>
            <Text style={styles.title}>Profile</Text>
            <View style={styles.card}>
                <Text style={styles.line}>Phone: +91 {user?.phone}</Text>
                <Text style={styles.line}>Signed in as: {user?.role}</Text>
            </View>
            <View style={{ height: spacing.lg }} />
            <Button title="Log out" variant="outline" onPress={onLogout} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
    title: {
        fontSize: 24,
        fontWeight: "700",
        color: colors.text,
        marginBottom: spacing.lg,
    },
    card: {
        backgroundColor: colors.blush,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.card,
        padding: spacing.lg,
        gap: spacing.sm,
    },
    line: { fontSize: 16, color: colors.text },
});