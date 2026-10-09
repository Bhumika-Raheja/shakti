import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../components/Button";
import { colors, radius, spacing } from "../constants/theme";
import { useAlert } from "../context/AlertContext";

const STATUS_LABEL: Record<string, string> = {
    accepted: "Accepted",
    on_the_way: "On the way",
    arrived: "Arrived",
};

export default function SosScreen() {
    const router = useRouter();
    const a = useAlert();
    const [now, setNow] = useState(() => Date.now());

    // A running clock for the timer
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);

    // If there is nothing to show, go back home
    useEffect(() => {
        if (a.phase === "idle" && !a.error) router.replace("/");
    }, [a.phase, a.error]);

    const seconds = a.startedAt ? Math.max(0, Math.floor((now - a.startedAt) / 1000)) : 0;
    const timer = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
        seconds % 60
    ).padStart(2, "0")}`;

    function call112() {
        Linking.openURL("tel:112");
    }

    function goHome() {
        a.reset();
        router.replace("/");
    }

    function confirmCancel() {
        Alert.alert("Cancel the alert?", "Helpers will be told you are safe.", [
            { text: "Keep alert on", style: "cancel" },
            { text: "I am safe", onPress: a.cancelSos },
        ]);
    }

    // 1. The SOS could not be sent
    if (a.phase === "idle" && a.error) {
        return (
            <SafeAreaView style={styles.screen}>
                <View style={styles.centered}>
                    <Text style={styles.bigTitle}>SOS not sent</Text>
                    <Text style={styles.bigText}>{a.error}</Text>
                    <View style={{ height: spacing.xl }} />
                    <Button title="Call 112" variant="sos" onPress={call112} />
                    <View style={{ height: spacing.md }} />
                    <Button title="Back" variant="outline" onPress={goHome} />
                </View>
            </SafeAreaView>
        );
    }

    // 2. Waiting for the server
    if (a.phase === "sending") {
        return (
            <SafeAreaView style={styles.screen}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.sos} />
                    <Text style={[styles.bigText, { marginTop: spacing.lg }]}>Sending your SOS...</Text>
                    <View style={{ height: spacing.xl }} />
                    <Button title="Call 112" variant="sos" onPress={call112} />
                </View>
            </SafeAreaView>
        );
    }

    // 3. The alert is over
    if (a.phase === "resolved" || a.phase === "cancelled") {
        return (
            <SafeAreaView style={styles.screen}>
                <View style={styles.centered}>
                    <Text style={styles.bigTitle}>
                        {a.phase === "resolved" ? "Help has finished" : "Alert cancelled"}
                    </Text>
                    <Text style={styles.bigText}>
                        {a.phase === "resolved"
                            ? "We hope you are safe. Thank you for using Shakti."
                            : "Glad you are safe."}
                    </Text>
                    <View style={{ height: spacing.xl }} />
                    <Button title="Back to home" onPress={goHome} />
                </View>
            </SafeAreaView>
        );
    }

    // 4. The alert is on
    const helpers = a.responders.filter((r) => r.status !== "left");

    return (
        <SafeAreaView style={styles.screen}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.banner}>
                    <View style={styles.bannerRow}>
                        <Text style={styles.bannerTitle}>SOS sent</Text>
                        <Text style={styles.bannerTimer}>{timer}</Text>
                    </View>
                    <Text style={styles.bannerSub}>
                        Your contacts and nearby volunteers have been alerted
                    </Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Who has been alerted</Text>

                    <View style={styles.row}>
                        <Text style={styles.rowName}>Trusted contacts</Text>
                        <Text style={styles.rowStatus}>
                            {a.contactsCount > 0 ? `${a.contactsCount} messaged` : "None saved"}
                        </Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.rowName}>Volunteers nearby</Text>
                        <Text style={styles.rowStatus}>{a.notifiedCount} alerted</Text>
                    </View>
                    {a.expanded ? (
                        <Text style={styles.note}>
                            Nobody accepted yet, so we also alerted volunteers within 3 km.
                        </Text>
                    ) : null}
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Helpers on the way</Text>
                    {helpers.length === 0 ? (
                        <Text style={styles.muted}>Waiting for a volunteer to accept...</Text>
                    ) : (
                        helpers.map((h) => (
                            <View key={h.volunteerId} style={styles.row}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{h.name.charAt(0).toUpperCase()}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.rowName}>
                                        {h.name}
                                        {h.isLead ? "  (lead)" : ""}
                                    </Text>
                                </View>
                                <Text style={styles.rowStatus}>{STATUS_LABEL[h.status] ?? h.status}</Text>
                            </View>
                        ))
                    )}
                </View>

                {a.unanswered && helpers.length === 0 ? (
                    <View style={styles.warning}>
                        <Text style={styles.warningText}>
                            No volunteer has accepted yet. Please call 112 now.
                        </Text>
                    </View>
                ) : null}

                <View style={{ height: spacing.lg }} />
                <Button title="See live map" variant="outline" onPress={() => router.replace("/(user)/track")} />
                <View style={{ height: spacing.lg }} />
                <Button title="Call 112" variant="sos" onPress={call112} />
                <View style={{ height: spacing.md }} />
                <Button title="I am safe, cancel alert" variant="outline" onPress={confirmCancel} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
    centered: { flex: 1, padding: spacing.xl, justifyContent: "center" },
    bigTitle: {
        fontSize: 28,
        fontWeight: "800",
        color: colors.text,
        textAlign: "center",
    },
    bigText: {
        fontSize: 16,
        color: colors.textMuted,
        textAlign: "center",
        marginTop: spacing.sm,
    },
    banner: {
        backgroundColor: colors.sos,
        borderRadius: radius.card,
        padding: spacing.lg,
    },
    bannerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    bannerTitle: { color: colors.white, fontSize: 22, fontWeight: "800" },
    bannerTimer: { color: colors.white, fontSize: 22, fontWeight: "700" },
    bannerSub: { color: colors.white, fontSize: 14, marginTop: spacing.sm },
    card: {
        backgroundColor: colors.blush,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.card,
        padding: spacing.lg,
        marginTop: spacing.lg,
    },
    cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: spacing.sm,
        gap: spacing.md,
    },
    rowName: { fontSize: 15, color: colors.text },
    rowStatus: { fontSize: 14, fontWeight: "600", color: colors.rose },
    muted: { fontSize: 14, color: colors.textMuted },
    note: { fontSize: 13, color: colors.textMuted, marginTop: spacing.sm },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: { fontSize: 15, fontWeight: "700", color: colors.rose },
    warning: {
        backgroundColor: colors.white,
        borderColor: colors.sos,
        borderWidth: 1.5,
        borderRadius: radius.card,
        padding: spacing.lg,
        marginTop: spacing.lg,
    },
    warningText: { color: colors.sos, fontWeight: "700", fontSize: 15, textAlign: "center" },
});