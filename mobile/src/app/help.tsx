import { useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../components/Button";
import LiveMap, { MapHelper } from "../components/LiveMap";
import { colors, radius, spacing } from "../constants/theme";
import { useVolunteer } from "../context/VolunteerContext";
import { distanceMeters, walkingMinutes } from "../utils/geo";

const STATUS_LABEL: Record<string, string> = {
    accepted: "Accepted",
    on_the_way: "On the way",
    arrived: "Arrived",
};

export default function Help() {
    const router = useRouter();
    const v = useVolunteer();
    const a = v.active;

    // Nothing to show: go back to the Alerts tab
    useEffect(() => {
        if (!a) router.replace("/(volunteer)/alerts");
    }, [a]);

    // The dots on the map: me, and the other helpers
    const mapHelpers: MapHelper[] = useMemo(() => {
        if (!a) return [];
        const list: MapHelper[] = [];
        if (v.myPos) {
            list.push({ id: "me", initial: "Y", lat: v.myPos.lat, lng: v.myPos.lng, lead: a.isLead });
        }
        Object.entries(a.others).forEach(([id, p]) => {
            const r = a.responders.find((x) => x.volunteerId === id);
            if (r && r.status !== "left") {
                list.push({ id, initial: r.name.charAt(0).toUpperCase(), lat: p.lat, lng: p.lng, lead: r.isLead });
            }
        });
        return list;
    }, [v.myPos, a?.others, a?.responders, a?.isLead]);

    if (!a) return null;

    function goBack() {
        v.closeActive();
        router.replace("/(volunteer)/alerts");
    }

    // The alert is over
    if (a.phase === "resolved" || a.phase === "cancelled") {
        return (
            <SafeAreaView style={styles.screen}>
                <View style={styles.centered}>
                    <Text style={styles.bigTitle}>
                        {a.phase === "resolved" ? "Thank you for helping" : "The alert was cancelled"}
                    </Text>
                    <Text style={styles.bigText}>
                        {a.phase === "resolved"
                            ? "She is safe because of you."
                            : "She said she is safe. Thank you for responding."}
                    </Text>
                    <View style={{ height: spacing.xl }} />
                    <Button title="Back to alerts" onPress={goBack} />
                </View>
            </SafeAreaView>
        );
    }

    const distance = v.myPos
        ? Math.round(distanceMeters(v.myPos.lat, v.myPos.lng, a.woman.lat, a.woman.lng))
        : null;

    const team = a.responders.filter((r) => r.status !== "left");

    function confirmLeave() {
        Alert.alert("Leave this alert?", "Other helpers will carry on, and she will be told.", [
            { text: "Stay", style: "cancel" },
            { text: "Leave", style: "destructive", onPress: v.leaveAlert },
        ]);
    }

    function confirmFinish() {
        Alert.alert("Finish this alert?", "Only finish once she is safe.", [
            { text: "Not yet", style: "cancel" },
            { text: "She is safe", onPress: () => v.sendStatus("resolved") },
        ]);
    }

    // The main button depends on where we are
    let mainButton = (
        <Button title="I am on the way" onPress={() => v.sendStatus("on_the_way")} />
    );
    if (a.myStatus === "on_the_way") {
        mainButton = <Button title="I have arrived" onPress={() => v.sendStatus("arrived")} />;
    } else if (a.myStatus === "arrived") {
        mainButton = <Button title="Finish: she is safe" onPress={confirmFinish} />;
    }

    return (
        <SafeAreaView style={styles.screen}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.banner}>
                    <Text style={styles.bannerTitle}>
                        {a.isLead ? "You are the lead helper" : "You are a backup helper"}
                    </Text>
                    <Text style={styles.bannerSub}>
                        {distance !== null
                            ? `${a.womanName} is ${distance} m away, about ${walkingMinutes(distance)} min on foot`
                            : "Finding your position..."}
                    </Text>
                </View>

                <View style={{ height: spacing.lg }} />
                <LiveMap me={a.woman} helpers={mapHelpers} />
                <Text style={styles.note}>
                    Red dot: {a.womanName}. Pink dots: helpers (Y is you). The dashed line is a straight
                    line, not a road route.
                </Text>

                <View style={styles.tips}>
                    <Text style={styles.tipsTitle}>Safety tips</Text>
                    <Text style={styles.line}>
                        Stay safe. Do not confront anyone. If it looks dangerous, call 112.
                    </Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Helpers on this alert</Text>
                    {team.map((r) => (
                        <View key={r.volunteerId} style={styles.row}>
                            <Text style={styles.rowName}>
                                {r.name}
                                {r.isLead ? "  (lead)" : ""}
                            </Text>
                            <Text style={styles.rowStatus}>{STATUS_LABEL[r.status] ?? r.status}</Text>
                        </View>
                    ))}
                </View>

                <View style={{ height: spacing.lg }} />
                {mainButton}
                <View style={{ height: spacing.md }} />
                <Button title="Call 112" variant="sos" onPress={() => Linking.openURL("tel:112")} />
                <View style={{ height: spacing.md }} />
                <Button title="Leave this alert" variant="outline" onPress={confirmLeave} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
    centered: { flex: 1, padding: spacing.xl, justifyContent: "center" },
    bigTitle: { fontSize: 26, fontWeight: "800", color: colors.text, textAlign: "center" },
    bigText: { fontSize: 16, color: colors.textMuted, textAlign: "center", marginTop: spacing.sm },
    banner: { backgroundColor: colors.rose, borderRadius: radius.card, padding: spacing.lg },
    bannerTitle: { color: colors.white, fontSize: 20, fontWeight: "800" },
    bannerSub: { color: colors.white, fontSize: 14, marginTop: 4 },
    note: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm },
    tips: {
        backgroundColor: colors.blush,
        borderColor: colors.sos,
        borderWidth: 1,
        borderRadius: radius.card,
        padding: spacing.lg,
        marginTop: spacing.lg,
    },
    tipsTitle: { fontSize: 16, fontWeight: "700", color: colors.sos, marginBottom: 4 },
    line: { fontSize: 14, color: colors.text },
    card: {
        backgroundColor: colors.blush,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.card,
        padding: spacing.lg,
        marginTop: spacing.md,
    },
    cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
    row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
    rowName: { fontSize: 15, color: colors.text },
    rowStatus: { fontSize: 14, fontWeight: "600", color: colors.rose },
});