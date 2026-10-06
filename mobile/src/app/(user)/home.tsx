import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    Alert,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../../components/Button";
import SosButton from "../../components/SosButton";
import { USE_TEST_LOCATION } from "../../constants/config";
import { colors, radius, spacing } from "../../constants/theme";
import { useAlert } from "../../context/AlertContext";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";

type Contact = { _id: string; name: string; phone: string };

export default function Home() {
    const router = useRouter();
    const { user } = useAuth();
    const { phase, sendSos } = useAlert();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const busy = phase === "sending" || phase === "active";

    // Load the trusted contacts every time this screen opens
    useFocusEffect(
        useCallback(() => {
            api
                .get("/contacts")
                .then((res) => setContacts(res.data.contacts))
                .catch(() => { });
        }, [])
    );

    // Send the SOS and open the "SOS sent" screen
    function triggerSos() {
        sendSos();
        router.push("/sos");
    }

    function silentAlert() {
        Alert.alert(
            "Send a silent alert?",
            "This sends your location to your contacts and nearby volunteers, with no sound or vibration on your phone.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Send", onPress: triggerSos },
            ]
        );
    }

    function fakeCall() {
        Alert.alert("Coming soon", "The fake call will be added in a later step.");
    }

    const greeting = user?.name ? `Stay safe, ${user.name}` : "Stay safe";

    return (
        <SafeAreaView style={styles.screen} edges={["top"]}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Top bar */}
                <View style={styles.topBar}>
                    <View style={styles.brand}>
                        <View style={styles.logo}>
                            <Ionicons name="shield-checkmark" size={20} color={colors.white} />
                        </View>
                        <Text style={styles.brandName}>Shakti</Text>
                    </View>
                    <View style={styles.pill}>
                        <View style={styles.dot} />
                        <Text style={styles.pillText}>
                            {USE_TEST_LOCATION ? "Test location" : "Location on"}
                        </Text>
                    </View>
                </View>

                <Text style={styles.greeting}>{greeting}</Text>
                <Text style={styles.greetingSub}>Your contacts are ready to help.</Text>

                {/* If an SOS is running, show a way back to it */}
                {busy ? (
                    <Pressable style={styles.activeBanner} onPress={() => router.push("/sos")}>
                        <Text style={styles.activeText}>SOS is on. Tap to see what is happening.</Text>
                    </Pressable>
                ) : null}

                {/* The SOS button */}
                <View style={styles.sosCard}>
                    <SosButton onTrigger={triggerSos} disabled={busy} />
                    <Text style={styles.sosHint}>Press and hold for 3 seconds</Text>
                    <Text style={styles.sosSub}>
                        Alerts your trusted contacts and nearby volunteers
                    </Text>
                </View>

                {/* Quick tools */}
                <View style={styles.tools}>
                    <Pressable style={styles.tool} onPress={silentAlert} disabled={busy}>
                        <View style={styles.toolIcon}>
                            <Ionicons name="notifications-off-outline" size={22} color={colors.rose} />
                        </View>
                        <Text style={styles.toolTitle}>Silent alert</Text>
                    </Pressable>
                    <Pressable style={styles.tool} onPress={fakeCall}>
                        <View style={styles.toolIcon}>
                            <Ionicons name="call-outline" size={22} color={colors.rose} />
                        </View>
                        <Text style={styles.toolTitle}>Fake call</Text>
                    </Pressable>
                </View>

                {/* Who gets the alert */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Alerts will go to</Text>
                    {contacts.length === 0 ? (
                        <Text style={styles.muted}>
                            No trusted contacts yet. You will add them in the Contacts tab.
                        </Text>
                    ) : (
                        <View style={styles.avatars}>
                            {contacts.slice(0, 5).map((c) => (
                                <View key={c._id} style={styles.avatarWrap}>
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>{c.name.charAt(0).toUpperCase()}</Text>
                                    </View>
                                    <Text style={styles.avatarName} numberOfLines={1}>
                                        {c.name}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                <View style={{ height: spacing.lg }} />
                <Button title="Call 112" variant="outline" onPress={() => Linking.openURL("tel:112")} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    brand: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    logo: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: colors.rose,
        alignItems: "center",
        justifyContent: "center",
    },
    brandName: { fontSize: 20, fontWeight: "800", color: colors.text },
    pill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.white,
    },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2E7D32" },
    pillText: { fontSize: 13, color: colors.text },
    greeting: {
        fontSize: 24,
        fontWeight: "800",
        color: colors.text,
        marginTop: spacing.xl,
    },
    greetingSub: { fontSize: 15, color: colors.textMuted, marginTop: 4 },
    activeBanner: {
        backgroundColor: colors.sos,
        borderRadius: radius.card,
        padding: spacing.md,
        marginTop: spacing.lg,
    },
    activeText: { color: colors.white, fontWeight: "700", textAlign: "center" },
    sosCard: {
        backgroundColor: colors.blush,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.card,
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing.lg,
        marginTop: spacing.lg,
        alignItems: "center",
    },
    sosHint: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: spacing.md },
    sosSub: { fontSize: 13, color: colors.textMuted, marginTop: 4, textAlign: "center" },
    tools: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
    tool: {
        flex: 1,
        alignItems: "center",
        backgroundColor: colors.blush,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.card,
        paddingVertical: spacing.lg,
        gap: spacing.sm,
    },
    toolIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.white,
        alignItems: "center",
        justifyContent: "center",
    },
    toolTitle: { fontSize: 15, fontWeight: "700", color: colors.rose },
    card: {
        backgroundColor: colors.blush,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.card,
        padding: spacing.lg,
        marginTop: spacing.lg,
    },
    cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
    muted: { fontSize: 14, color: colors.textMuted, marginTop: spacing.sm },
    avatars: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.md },
    avatarWrap: { alignItems: "center", width: 60 },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: { fontSize: 18, fontWeight: "700", color: colors.rose },
    avatarName: { fontSize: 13, color: colors.text, marginTop: 4 },
});