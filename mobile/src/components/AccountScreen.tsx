import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Keyboard,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { USE_TEST_LOCATION } from "../constants/config";
import { colors, radius, spacing } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { api, errorMessage } from "../services/api";
import Button from "./Button";

const NUMBERS = [
    { number: "112", label: "Emergency (police, fire, ambulance)" },
    { number: "1091", label: "Women helpline" },
    { number: "181", label: "Women helpline (domestic abuse)" },
];

// The Profile tab, shared by women and volunteers:
// name, emergency numbers, and log out.
export default function AccountScreen() {
    const { user, logout, refreshUser } = useAuth();
    const router = useRouter();
    const [name, setName] = useState(user?.name ?? "");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const saved = user?.name ?? "";
    const changed = name.trim() !== saved;
    const roleLabel = user?.role === "volunteer" ? "Volunteer" : "Safety user";

    async function saveName() {
        setError("");
        setMessage("");
        if (!name.trim()) {
            setError("Enter your name");
            return;
        }
        setSaving(true);
        try {
            await api.patch("/auth/me", { name: name.trim() });
            await refreshUser();
            Keyboard.dismiss();
            setMessage("Saved");
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    }

    async function onLogout() {
        await logout();
        router.replace("/");
    }

    const shownName = saved || "Someone you know";

    return (
        <SafeAreaView style={styles.screen} edges={["top"]}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Text style={styles.title}>Profile</Text>

                <View style={styles.card}>
                    <View style={styles.topRow}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {(saved || user?.phone || "?").charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.name}>{saved || "Add your name"}</Text>
                            <Text style={styles.muted}>+91 {user?.phone}</Text>
                            <View style={styles.tag}>
                                <Text style={styles.tagText}>{roleLabel}</Text>
                            </View>
                        </View>
                    </View>

                    <Text style={styles.label}>Your name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Riya"
                        placeholderTextColor={colors.textMuted}
                        value={name}
                        onChangeText={(t) => {
                            setName(t);
                            setMessage("");
                        }}
                        maxLength={50}
                    />
                    {error ? <Text style={styles.error}>{error}</Text> : null}
                    {message ? <Text style={styles.ok}>{message}</Text> : null}
                    <View style={{ height: spacing.md }} />
                    <Button title="Save name" onPress={saveName} loading={saving} disabled={!changed} />
                </View>

                {user?.role !== "volunteer" ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>What your contacts will see</Text>
                        <View style={styles.preview}>
                            <Text style={styles.previewText}>
                                EMERGENCY SOS: {shownName} needs help. Location: (your live map link) Please call
                                them, or call 112 if you cannot reach them. - Sent by Shakti
                            </Text>
                        </View>
                    </View>
                ) : null}

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Emergency numbers</Text>
                    {NUMBERS.map((n) => (
                        <Pressable
                            key={n.number}
                            style={styles.numberRow}
                            onPress={() => Linking.openURL(`tel:${n.number}`)}
                        >
                            <View style={styles.callIcon}>
                                <Ionicons name="call-outline" size={20} color={colors.rose} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.numberText}>{n.number}</Text>
                                <Text style={styles.muted}>{n.label}</Text>
                            </View>
                        </Pressable>
                    ))}
                </View>

                {USE_TEST_LOCATION ? (
                    <View style={styles.devCard}>
                        <Text style={styles.devText}>
                            Development mode: the app is using a test location, not your real GPS.
                        </Text>
                    </View>
                ) : null}

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>About Shakti</Text>
                    <Text style={styles.muted}>
                        Shakti is a support tool and does not replace the police or an ambulance. In an
                        emergency, always call 112.
                    </Text>
                </View>

                <View style={{ height: spacing.lg }} />
                <Button title="Log out" variant="outline" onPress={onLogout} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
    title: { fontSize: 24, fontWeight: "800", color: colors.text },
    card: {
        backgroundColor: colors.blush,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.card,
        padding: spacing.lg,
        marginTop: spacing.md,
    },
    cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
    topRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: { fontSize: 24, fontWeight: "700", color: colors.rose },
    name: { fontSize: 18, fontWeight: "700", color: colors.text },
    muted: { fontSize: 14, color: colors.textMuted },
    tag: {
        alignSelf: "flex-start",
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 3,
        marginTop: 6,
    },
    tagText: { fontSize: 12, fontWeight: "700", color: colors.rose },
    label: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginTop: spacing.lg },
    input: {
        height: 48,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.button,
        paddingHorizontal: spacing.md,
        fontSize: 16,
        color: colors.text,
        backgroundColor: colors.white,
        marginTop: 6,
    },
    error: { color: colors.sos, fontSize: 14, marginTop: spacing.sm },
    ok: { color: colors.rose, fontSize: 14, fontWeight: "700", marginTop: spacing.sm },
    preview: {
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.button,
        padding: spacing.md,
    },
    previewText: { fontSize: 14, color: colors.text, lineHeight: 20 },
    numberRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
    callIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    numberText: { fontSize: 18, fontWeight: "800", color: colors.text },
    devCard: {
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderWidth: 1,
        borderStyle: "dashed",
        borderRadius: radius.card,
        padding: spacing.md,
        marginTop: spacing.md,
    },
    devText: { fontSize: 13, color: colors.textMuted },
});