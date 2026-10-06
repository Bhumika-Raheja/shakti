import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../../components/Button";
import { colors, radius, spacing } from "../../constants/theme";
import { api, errorMessage } from "../../services/api";

type Role = "user" | "volunteer";

// One of the two "Continue as" cards
function RoleCard({
    title,
    label,
    icon,
    selected,
    onPress,
}: {
    title: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    selected: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            style={[styles.roleCard, selected && styles.roleCardSelected]}
        >
            {selected && (
                <View style={styles.check}>
                    <Ionicons name="checkmark" size={14} color={colors.white} />
                </View>
            )}
            <View style={[styles.roleIcon, selected && { backgroundColor: colors.white }]}>
                <Ionicons name={icon} size={22} color={colors.rose} />
            </View>
            <Text style={styles.roleTitle}>{title}</Text>
            <Text style={[styles.roleLabel, selected && { color: colors.rose }]}>{label}</Text>
        </Pressable>
    );
}

export default function Login() {
    const router = useRouter();
    const [phone, setPhone] = useState("");
    const [role, setRole] = useState<Role>("user");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function sendOtp() {
        setError("");
        if (!/^[6-9]\d{9}$/.test(phone)) {
            setError("Enter a valid 10-digit mobile number");
            return;
        }
        setLoading(true);
        try {
            await api.post("/auth/send-otp", { phone });
            router.push({ pathname: "/(auth)/otp", params: { phone, role } });
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    }

    return (
        <SafeAreaView style={styles.screen}>
            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.logo}>
                    <Ionicons name="shield-checkmark" size={40} color={colors.white} />
                </View>
                <Text style={styles.name}>Shakti</Text>
                <Text style={styles.tagline}>You are never alone</Text>
                <Text style={styles.sub}>Sign in with your phone number to continue</Text>

                <View style={styles.inputRow}>
                    <Text style={styles.prefix}>+91</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter mobile number"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="number-pad"
                        maxLength={10}
                        value={phone}
                        onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, ""))}
                    />
                </View>
                {error ? <Text style={styles.error}>{error}</Text> : null}

                <View style={{ height: spacing.md }} />
                <Button title="Send OTP" onPress={sendOtp} loading={loading} />

                <View style={styles.dividerRow}>
                    <View style={styles.line} />
                    <Text style={styles.dividerText}>CONTINUE AS</Text>
                    <View style={styles.line} />
                </View>

                <View style={styles.roles}>
                    <RoleCard
                        title="I need safety"
                        label="User"
                        icon="shield-outline"
                        selected={role === "user"}
                        onPress={() => setRole("user")}
                    />
                    <RoleCard
                        title="I want to help"
                        label="Volunteer"
                        icon="hand-left-outline"
                        selected={role === "volunteer"}
                        onPress={() => setRole("volunteer")}
                    />
                </View>

                <Text style={styles.terms}>
                    By continuing, you agree to our Terms and Privacy Policy
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.xl, alignItems: "stretch", flexGrow: 1 },
    logo: {
        alignSelf: "center",
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.rose,
        alignItems: "center",
        justifyContent: "center",
        marginTop: spacing.xl,
    },
    name: {
        fontSize: 30,
        fontWeight: "800",
        color: colors.text,
        textAlign: "center",
        marginTop: spacing.md,
    },
    tagline: {
        fontSize: 16,
        fontWeight: "700",
        color: colors.rose,
        textAlign: "center",
        marginTop: 4,
    },
    sub: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: "center",
        marginTop: spacing.sm,
        marginBottom: spacing.xl,
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.rose,
        borderRadius: radius.button,
        backgroundColor: colors.white,
        paddingHorizontal: spacing.lg,
        height: 52,
    },
    prefix: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        paddingRight: spacing.md,
        marginRight: spacing.md,
        borderRightWidth: 1,
        borderRightColor: colors.border,
    },
    input: { flex: 1, fontSize: 16, color: colors.text },
    error: { color: colors.sos, fontSize: 14, marginTop: spacing.sm },
    dividerRow: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: spacing.xl,
        gap: spacing.md,
    },
    line: { flex: 1, height: 1, backgroundColor: colors.border },
    dividerText: { fontSize: 12, letterSpacing: 1, color: colors.textMuted },
    roles: { flexDirection: "row", gap: spacing.md },
    roleCard: {
        flex: 1,
        alignItems: "center",
        padding: spacing.lg,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.white,
    },
    roleCardSelected: {
        backgroundColor: colors.blush,
        borderColor: colors.rose,
        borderWidth: 1.5,
    },
    check: {
        position: "absolute",
        top: 8,
        right: 8,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.rose,
        alignItems: "center",
        justifyContent: "center",
    },
    roleIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.blush,
        alignItems: "center",
        justifyContent: "center",
    },
    roleTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: colors.text,
        marginTop: spacing.sm,
        textAlign: "center",
    },
    roleLabel: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    terms: {
        fontSize: 12,
        color: colors.textMuted,
        textAlign: "center",
        marginTop: "auto",
        paddingTop: spacing.xl,
    },
});