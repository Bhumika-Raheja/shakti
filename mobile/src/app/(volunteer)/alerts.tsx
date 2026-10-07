import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../../components/Button";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useVolunteer } from "../../context/VolunteerContext";

const OUTCOME_LABEL: Record<string, string> = {
    helped: "Helped",
    left: "Left",
    cancelled: "Cancelled",
    ongoing: "Ongoing",
};

// "5 min ago", "2 h ago", "3 days ago"
function ago(iso: string) {
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
    if (minutes < 60) return `${minutes} min ago`;
    if (minutes < 60 * 24) return `${Math.floor(minutes / 60)} h ago`;
    return `${Math.floor(minutes / 60 / 24)} days ago`;
}

export default function Alerts() {
    const router = useRouter();
    const { user } = useAuth();
    const v = useVolunteer();
    const { reload } = v;
    const [toggling, setToggling] = useState(false);

    // Refresh every time this tab opens
    useFocusEffect(
        useCallback(() => {
            reload();
        }, [reload])
    );

    async function onToggle(value: boolean) {
        setToggling(true);
        const message = await v.setOnline(value);
        if (message) Alert.alert("Could not change", message);
        setToggling(false);
    }

    // --- States before the volunteer can receive alerts ---
    if (v.loadState === "loading") {
        return (
            <SafeAreaView style={styles.screen} edges={["top"]}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.rose} />
                </View>
            </SafeAreaView>
        );
    }

    if (v.loadState === "error") {
        return (
            <SafeAreaView style={styles.screen} edges={["top"]}>
                <View style={styles.centered}>
                    <Text style={styles.error}>{v.loadError}</Text>
                    <View style={{ height: spacing.lg }} />
                    <Button title="Try again" onPress={reload} />
                </View>
            </SafeAreaView>
        );
    }

    if (v.loadState === "none") {
        return (
            <SafeAreaView style={styles.screen} edges={["top"]}>
                <View style={styles.centered}>
                    <Text style={styles.title}>Become a volunteer</Text>
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>You have not registered yet</Text>
                        <Text style={styles.muted}>
                            Volunteers add their name, area and a government ID. Our team checks every
                            volunteer before they get alerts.
                        </Text>
                    </View>
                    <View style={{ height: spacing.lg }} />
                    <Button
                        title="Register as a volunteer"
                        onPress={() => router.push("/register")}
                    />
                </View>
            </SafeAreaView>
        );
    }

    const p = v.profile;
    if (!p) return null;

    if (p.status === "pending") {
        return (
            <SafeAreaView style={styles.screen} edges={["top"]}>
                <View style={styles.centered}>
                    <Text style={styles.title}>Waiting for approval</Text>
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Your application is being checked</Text>
                        <Text style={styles.muted}>
                            Our team checks every volunteer's ID. You will get alerts once you are approved.
                        </Text>
                    </View>
                    <View style={{ height: spacing.lg }} />
                    <Button title="Check again" variant="outline" onPress={reload} />
                </View>
            </SafeAreaView>
        );
    }

    if (p.status === "suspended") {
        return (
            <SafeAreaView style={styles.screen} edges={["top"]}>
                <View style={styles.centered}>
                    <Text style={styles.title}>Account paused</Text>
                    <View style={styles.card}>
                        <Text style={styles.muted}>
                            Your volunteer account is paused, so you will not get alerts. Please contact the
                            Shakti team.
                        </Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    // --- A verified volunteer ---
    const name = user?.name || "Volunteer";

    return (
        <SafeAreaView style={styles.screen} edges={["top"]}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Alerts</Text>

                {v.active && v.active.phase === "active" ? (
                    <Pressable style={styles.activeBanner} onPress={() => router.push("/help")}>
                        <Text style={styles.activeText}>You are helping with an alert. Tap to open it.</Text>
                    </Pressable>
                ) : null}

                {/* Online switch */}
                <View style={styles.card}>
                    <View style={styles.switchRow}>
                        <View style={{ flex: 1 }}>
                            <View style={styles.statusRow}>
                                <View style={[styles.dot, { backgroundColor: p.isOnline ? "#2E7D32" : "#9E9E9E" }]} />
                                <Text style={styles.cardTitle}>{p.isOnline ? "You are online" : "You are offline"}</Text>
                            </View>
                            <Text style={styles.muted}>
                                {p.isOnline
                                    ? "You will get alerts within 1 km"
                                    : "Switch on to get alerts near you"}
                            </Text>
                        </View>
                        <Switch
                            value={p.isOnline}
                            onValueChange={onToggle}
                            disabled={toggling}
                            trackColor={{ false: colors.border, true: colors.rose }}
                            thumbColor={colors.white}
                        />
                    </View>
                </View>

                {/* Profile */}
                <View style={styles.card}>
                    <View style={styles.profileRow}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.name}>{name}</Text>
                            <View style={styles.tag}>
                                <Text style={styles.tagText}>ID checked by admin</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.stats}>
                        <View style={styles.stat}>
                            <Text style={styles.statNumber}>{p.helpedCount}</Text>
                            <Text style={styles.muted}>people helped</Text>
                        </View>
                        <View style={styles.stat}>
                            <Text style={styles.statNumber}>{p.rating > 0 ? p.rating.toFixed(1) : "New"}</Text>
                            <Text style={styles.muted}>rating</Text>
                        </View>
                    </View>
                </View>

                {/* Recent alerts */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Recent alerts</Text>
                    {v.recent.length === 0 ? (
                        <Text style={styles.muted}>Nothing yet. Alerts you accept will show here.</Text>
                    ) : (
                        v.recent.map((r) => (
                            <View key={r.alertId} style={styles.recentRow}>
                                <Text style={styles.recentTime}>{ago(r.createdAt)}</Text>
                                <View
                                    style={[styles.outcome, r.outcome === "helped" && { backgroundColor: colors.white }]}
                                >
                                    <Text style={styles.outcomeText}>{OUTCOME_LABEL[r.outcome] ?? r.outcome}</Text>
                                </View>
                            </View>
                        ))
                    )}
                </View>

                {/* Safety tips */}
                <View style={styles.tips}>
                    <Text style={styles.tipsTitle}>Safety tips</Text>
                    <Text style={styles.muted}>Never confront anyone. Call 112 if it looks dangerous.</Text>
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
    centered: { flex: 1, padding: spacing.lg, justifyContent: "center" },
    title: { fontSize: 24, fontWeight: "800", color: colors.text, marginBottom: spacing.md },
    error: { color: colors.sos, fontSize: 15, textAlign: "center" },
    activeBanner: {
        backgroundColor: colors.sos,
        borderRadius: radius.card,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    activeText: { color: colors.white, fontWeight: "700", textAlign: "center" },
    card: {
        backgroundColor: colors.blush,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.card,
        padding: spacing.lg,
        marginTop: spacing.md,
    },
    cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 4 },
    muted: { fontSize: 14, color: colors.textMuted },
    switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    dot: { width: 10, height: 10, borderRadius: 5 },
    profileRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: { fontSize: 22, fontWeight: "700", color: colors.rose },
    name: { fontSize: 18, fontWeight: "700", color: colors.text },
    tag: {
        alignSelf: "flex-start",
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 3,
        marginTop: 4,
    },
    tagText: { fontSize: 12, fontWeight: "600", color: colors.rose },
    stats: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
    stat: {
        flex: 1,
        alignItems: "center",
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.button,
        paddingVertical: spacing.md,
    },
    statNumber: { fontSize: 22, fontWeight: "800", color: colors.text },
    recentRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: spacing.sm,
    },
    recentTime: { fontSize: 14, color: colors.text },
    outcome: {
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    outcomeText: { fontSize: 12, fontWeight: "700", color: colors.rose },
    tips: {
        backgroundColor: colors.blush,
        borderColor: colors.sos,
        borderWidth: 1,
        borderRadius: radius.card,
        padding: spacing.lg,
        marginTop: spacing.md,
    },
    tipsTitle: { fontSize: 16, fontWeight: "700", color: colors.sos, marginBottom: 4 },
});