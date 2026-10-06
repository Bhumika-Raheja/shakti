import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../../components/Button";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { api, errorMessage } from "../../services/api";

export default function Otp() {
    const router = useRouter();
    const { login } = useAuth();
    const { phone, role } = useLocalSearchParams<{ phone: string; role: string }>();
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function verify() {
        setError("");
        if (otp.length !== 6) {
            setError("Enter the 6-digit code");
            return;
        }
        setLoading(true);
        try {
            const res = await api.post("/auth/verify-otp", { phone, otp, role });
            await login(res.data.token, res.data.user);
            router.replace("/"); // the starting page sends us to the right place
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    }

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.content}>
                <Text style={styles.title}>Enter the code</Text>
                <Text style={styles.sub}>We sent a 6-digit code to +91 {phone}</Text>
                <Text style={styles.hint}>Development mode: the code is 123456</Text>

                <TextInput
                    style={styles.input}
                    placeholder="------"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, ""))}
                    autoFocus
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}

                <View style={{ height: spacing.lg }} />
                <Button title="Verify and continue" onPress={verify} loading={loading} />

                <Pressable onPress={() => router.back()} style={styles.back}>
                    <Text style={styles.backText}>Change phone number</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.xl, paddingTop: spacing.xl * 2 },
    title: { fontSize: 26, fontWeight: "800", color: colors.text },
    sub: { fontSize: 15, color: colors.textMuted, marginTop: spacing.sm },
    hint: {
        fontSize: 13,
        color: colors.rose,
        marginTop: spacing.sm,
        marginBottom: spacing.xl,
    },
    input: {
        height: 60,
        borderWidth: 1,
        borderColor: colors.rose,
        borderRadius: radius.button,
        textAlign: "center",
        fontSize: 28,
        letterSpacing: 8,
        color: colors.text,
        backgroundColor: colors.white,
    },
    error: { color: colors.sos, fontSize: 14, marginTop: spacing.sm },
    back: { alignItems: "center", marginTop: spacing.xl },
    backText: { color: colors.rose, fontSize: 15, fontWeight: "600" },
});