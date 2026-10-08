import axios from "axios";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../../components/Button";
import ReportModal, { REPORT_LABEL, ReportType } from "../../components/ReportModal";
import ReportsMap, { MapReport } from "../../components/ReportsMap";
import { colors, radius, spacing } from "../../constants/theme";
import { getPosition } from "../../context/AlertContext";
import { api, errorMessage } from "../../services/api";
import { distanceMeters } from "../../utils/geo";

type Report = {
    id: string;
    type: ReportType;
    lat: number;
    lng: number;
    createdAt: string;
    distanceMeters: number;
};

const RADIUS = 500; // search within 500 m
const CLUSTER = 150; // reports closer than this count as "the same spot"

// Colours for the map circles: few, some and many reports in the same spot
const FEW = "#F48FB1";
const SOME = colors.rose;
const MANY = colors.sos;

// "5 min ago", "2 h ago", "3 days ago"
function ago(iso: string) {
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
    if (minutes < 60) return `${minutes} min ago`;
    if (minutes < 60 * 24) return `${Math.floor(minutes / 60)} h ago`;
    return `${Math.floor(minutes / 60 / 24)} days ago`;
}

function messageOf(err: unknown) {
    if (axios.isAxiosError(err)) return errorMessage(err);
    return err instanceof Error ? err.message : errorMessage(err);
}

export default function Safety() {
    const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    // Where am I, and what has been reported near me?
    const load = useCallback(async () => {
        try {
            const p = await getPosition();
            setMe(p);
            const res = await api.get("/reports/near", {
                params: { lat: p.lat, lng: p.lng, radius: RADIUS },
            });
            setReports(res.data.reports);
            setError("");
        } catch (err) {
            setError(messageOf(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load])
    );

    // The circles: the more reports in the same spot, the redder
    const mapReports: MapReport[] = useMemo(
        () =>
            reports.map((r) => {
                const n = reports.filter((o) => distanceMeters(r.lat, r.lng, o.lat, o.lng) <= CLUSTER)
                    .length;
                return {
                    id: r.id,
                    lat: r.lat,
                    lng: r.lng,
                    color: n >= 4 ? MANY : n >= 2 ? SOME : FEW,
                    label: `${REPORT_LABEL[r.type]} (${ago(r.createdAt)})`,
                };
            }),
        [reports]
    );

    const latest = useMemo(
        () =>
            [...reports]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5),
        [reports]
    );

    async function sendReport(type: ReportType) {
        setSaving(true);
        setFormError("");
        try {
            const p = me ?? (await getPosition());
            await api.post("/reports", { type, lat: p.lat, lng: p.lng });
            setModalOpen(false);
            await load();
        } catch (err) {
            setFormError(messageOf(err));
        } finally {
            setSaving(false);
        }
    }

    const count = reports.length;

    return (
        <SafeAreaView style={styles.screen} edges={["top"]}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Safety map</Text>
                <Text style={styles.sub}>Places near you that people reported as unsafe</Text>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <View style={{ height: spacing.md }} />
                {loading ? (
                    <View style={styles.loading}>
                        <ActivityIndicator size="large" color={colors.rose} />
                    </View>
                ) : (
                    <ReportsMap me={me} radiusMeters={RADIUS} reports={mapReports} />
                )}

                {/* Legend */}
                <View style={styles.legend}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: FEW }]} />
                        <Text style={styles.legendText}>Few</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: SOME }]} />
                        <Text style={styles.legendText}>Some</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: MANY }]} />
                        <Text style={styles.legendText}>Many</Text>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.near}>
                        <Text style={{ color: colors.rose, fontWeight: "800" }}>
                            {count} {count === 1 ? "report" : "reports"}
                        </Text>{" "}
                        within {RADIUS} m in the last 30 days
                    </Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Recent reports</Text>
                    {latest.length === 0 ? (
                        <Text style={styles.muted}>No reports near you. That is good news.</Text>
                    ) : (
                        latest.map((r) => (
                            <View key={r.id} style={styles.row}>
                                <View style={styles.tag}>
                                    <Text style={styles.tagText}>{REPORT_LABEL[r.type]}</Text>
                                </View>
                                <Text style={styles.muted}>
                                    {ago(r.createdAt)}  •  {r.distanceMeters} m away
                                </Text>
                            </View>
                        ))
                    )}
                </View>

                <View style={{ height: spacing.lg }} />
                <Button
                    title="Report an unsafe place"
                    onPress={() => {
                        setFormError("");
                        setModalOpen(true);
                    }}
                />
            </ScrollView>

            <ReportModal
                visible={modalOpen}
                saving={saving}
                error={formError}
                onClose={() => setModalOpen(false)}
                onSubmit={sendReport}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
    title: { fontSize: 24, fontWeight: "800", color: colors.text },
    sub: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
    error: { color: colors.sos, fontSize: 14, marginTop: spacing.md },
    loading: {
        height: 320,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.blush,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
    },
    legend: {
        flexDirection: "row",
        justifyContent: "space-around",
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.card,
        paddingVertical: spacing.md,
        marginTop: spacing.md,
    },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    legendDot: { width: 14, height: 14, borderRadius: 7 },
    legendText: { fontSize: 14, color: colors.text },
    card: {
        backgroundColor: colors.blush,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.card,
        padding: spacing.lg,
        marginTop: spacing.md,
    },
    near: { fontSize: 15, color: colors.text },
    cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
    muted: { fontSize: 14, color: colors.textMuted },
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: spacing.sm,
    },
    tag: {
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    tagText: { fontSize: 12, fontWeight: "700", color: colors.rose },
});