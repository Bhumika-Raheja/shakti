import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../../components/Button";
import LiveMap, { MapHelper } from "../../components/LiveMap";
import { colors, radius, spacing } from "../../constants/theme";
import { getPosition, useAlert } from "../../context/AlertContext";
import { distanceMeters, walkingMinutes } from "../../utils/geo";

const STATUS_LABEL: Record<string, string> = {
    accepted: "Accepted",
    on_the_way: "On the way",
    arrived: "Arrived",
};

export default function Track() {
    const router = useRouter();
    const a = useAlert();
    const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);

    // While an SOS is on, keep the woman's own position fresh
    useEffect(() => {
        if (a.phase !== "active") return;
        let alive = true;
        async function load() {
            try {
                const p = await getPosition();
                if (alive) setMe(p);
            } catch {
                // ignore, we will try again in 5 seconds
            }
        }
        load();
        const timer = setInterval(load, 5000);
        return () => {
            alive = false;
            clearInterval(timer);
        };
    }, [a.phase]);

    const helpers = a.responders.filter((r) => r.status !== "left");
    const lead = helpers.find((h) => h.isLead);

    // The dots to draw on the map
    const mapHelpers: MapHelper[] = useMemo(
        () =>
            helpers
                .filter((h) => a.helperPositions[h.volunteerId])
                .map((h) => ({
                    id: h.volunteerId,
                    initial: h.name.charAt(0).toUpperCase(),
                    lat: a.helperPositions[h.volunteerId].lat,
                    lng: a.helperPositions[h.volunteerId].lng,
                    lead: h.isLead,
                })),
        [a.responders, a.helperPositions]
    );

    // How far is a helper?
    function distanceOf(volunteerId: string): number | null {
        const p = a.helperPositions[volunteerId];
        if (!me || !p) return null;
        return Math.round(distanceMeters(p.lat, p.lng, me.lat, me.lng));
    }

    function confirmCancel() {
        Alert.alert("Cancel the alert?", "Helpers will be told you are safe.", [
            { text: "Keep alert on", style: "cancel" },
            { text: "I am safe", onPress: a.cancelSos },
        ]);
    }

    // No SOS right now
    if (a.phase !== "active") {
        return (
            <SafeAreaView style={styles.screen} edges={["top"]}>
                <View style={styles.centered}>
                    <Text style={styles.title}>Track</Text>
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>No SOS right now</Text>
                        <Text style={styles.muted}>
                            When you send an SOS, you will see your helpers coming toward you on a map here.
                        </Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    // The banner at the top
    const leadDistance = lead ? distanceOf(lead.volunteerId) : null;
    let bannerTitle = "Looking for a volunteer";
    let bannerSub = "We are alerting helpers near you";
    if (lead) {
        if (lead.status === "arrived") {
            bannerTitle = "Your helper has arrived";
            bannerSub = "Stay safe. Call 112 if you need more help.";
        } else {
            bannerTitle = "Help is on the way";
            bannerSub =
                leadDistance !== null
                    ? `Arriving in about ${walkingMinutes(leadDistance)} min (${leadDistance} m away)`
                    : "Waiting for their location";
        }
    }

    // The activity list
    const steps = [
        { label: "SOS sent", done: true },
        {
            label:
                a.contactsCount > 0
                    ? `${a.contactsCount} trusted contacts messaged`
                    : "No trusted contacts to message",
            done: a.contactsCount > 0,
        },
        { label: `${a.notifiedCount} volunteers alerted`, done: a.notifiedCount > 0 },
        {
            label: lead ? `${lead.name} accepted` : "Waiting for a volunteer to accept",
            done: !!lead,
        },
        {
            label: "A helper is on the way",
            done: helpers.some((h) => h.status === "on_the_way" || h.status === "arrived"),
        },
        { label: "A helper has arrived", done: helpers.some((h) => h.status === "arrived") },
    ];

    return (
        <SafeAreaView style={styles.screen} edges={["top"]}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.banner}>
                    <Text style={styles.bannerTitle}>{bannerTitle}</Text>
                    <Text style={styles.bannerSub}>{bannerSub}</Text>
                </View>

                <View style={{ height: spacing.lg }} />
                <LiveMap me={me} helpers={mapHelpers} />
                <Text style={styles.mapNote}>
                    Red dot: you. Pink dots: helpers. The dashed line is a straight line, not a road route.
                </Text>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Your helpers</Text>
                    {helpers.length === 0 ? (
                        <Text style={styles.muted}>Waiting for a volunteer to accept...</Text>
                    ) : (
                        helpers.map((h) => {
                            const d = distanceOf(h.volunteerId);
                            return (
                                <View key={h.volunteerId} style={styles.row}>
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>{h.name.charAt(0).toUpperCase()}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.rowName}>
                                            {h.name}
                                            {h.isLead ? "  (lead)" : ""}
                                        </Text>
                                        <Text style={styles.muted}>
                                            {STATUS_LABEL[h.status] ?? h.status}
                                            {d !== null ? `  •  ${d} m away` : ""}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Alert activity</Text>
                    {steps.map((s) => (
                        <View key={s.label} style={styles.stepRow}>
                            <View style={[styles.stepDot, s.done && styles.stepDotDone]} />
                            <Text style={[styles.stepText, !s.done && { color: colors.textMuted }]}>
                                {s.label}
                            </Text>
                        </View>
                    ))}
                </View>

                {a.unanswered && helpers.length === 0 ? (
                    <View style={styles.warning}>
                        <Text style={styles.warningText}>
                            No volunteer has accepted yet. Please call 112 now.
                        </Text>
                    </View>
                ) : null}

                <View style={{ height: spacing.lg }} />
                <Button title="Call 112" variant="sos" onPress={() => Linking.openURL("tel:112")} />
                <View style={{ height: spacing.md }} />
                <Button title="I am safe, cancel alert" variant="outline" onPress={confirmCancel} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
    centered: { flex: 1, padding: spacing.lg },
    title: { fontSize: 24, fontWeight: "700", color: colors.text, marginBottom: spacing.lg },
    banner: { backgroundColor: colors.rose, borderRadius: radius.card, padding: spacing.lg },
    bannerTitle: { color: colors.white, fontSize: 20, fontWeight: "800" },
    bannerSub: { color: colors.white, fontSize: 14, marginTop: 4 },
    mapNote: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm },
    card: {
        backgroundColor: colors.blush,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.card,
        padding: spacing.lg,
        marginTop: spacing.lg,
    },
    cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
    muted: { fontSize: 14, color: colors.textMuted },
    row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
    rowName: { fontSize: 15, fontWeight: "600", color: colors.text },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: { fontSize: 16, fontWeight: "700", color: colors.rose },
    stepRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 6 },
    stepDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: colors.border,
        backgroundColor: colors.white,
    },
    stepDotDone: { backgroundColor: colors.rose, borderColor: colors.rose },
    stepText: { fontSize: 14, color: colors.text, flex: 1 },
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