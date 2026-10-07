import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../components/Button";
import { colors, radius, spacing } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useVolunteer } from "../context/VolunteerContext";
import { uploadForm } from "../services/upload";

type Photo = { uri: string; mime: "image/jpeg" | "image/png" };

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB, the same limit as the backend

export default function Register() {
    const router = useRouter();
    const { user, refreshUser } = useAuth();
    const v = useVolunteer();

    const [name, setName] = useState(user?.name ?? "");
    const [area, setArea] = useState("");
    const [photo, setPhoto] = useState<Photo | null>(null);
    const [agreed, setAgreed] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    // Take a photo of the ID, or choose one from the gallery
    async function pick(source: "camera" | "gallery") {
        setError("");
        try {
            let result: ImagePicker.ImagePickerResult;
            if (source === "camera") {
                const perm = await ImagePicker.requestCameraPermissionsAsync();
                if (!perm.granted) {
                    setError("Please allow the camera to take a photo of your ID.");
                    return;
                }
                result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.4 });
            } else {
                result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.4 });
            }
            if (result.canceled || result.assets.length === 0) return;

            const asset = result.assets[0];
            const mime =
                asset.mimeType ?? (asset.uri.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg");
            if (mime !== "image/jpeg" && mime !== "image/png") {
                setError("Please choose a JPG or PNG photo.");
                return;
            }
            if (asset.fileSize && asset.fileSize > MAX_BYTES) {
                setError("The photo is too large (max 5 MB). Please choose a smaller one.");
                return;
            }
            setPhoto({ uri: asset.uri, mime });
        } catch {
            setError("Could not open the photo. Please try again.");
        }
    }

    async function submit() {
        setError("");
        if (!name.trim()) {
            setError("Enter your full name");
            return;
        }
        if (!area.trim()) {
            setError("Enter your area or locality");
            return;
        }
        if (!photo) {
            setError("Please add a photo of your government ID");
            return;
        }
        if (!agreed) {
            setError("Please tick the box to confirm you understand the safety rules");
            return;
        }

        setSubmitting(true);
        try {
            const res = await uploadForm(
                "/api/volunteers/register",
                { name: name.trim(), area: area.trim() },
                {
                    field: "idDoc",
                    uri: photo.uri,
                    name: photo.mime === "image/png" ? "id.png" : "id.jpg",
                    type: photo.mime,
                }
            );
            if (!res.ok) {
                setError(res.data.message || "Could not submit. Please try again.");
                return;
            }

            await refreshUser(); // the server saved our name
            await v.reload(); // the status is now "pending"
            Alert.alert(
                "Submitted",
                "Our team will check your ID. You will get alerts once you are approved.",
                [{ text: "OK", onPress: () => router.replace("/(volunteer)/alerts") }]
            );
        } catch (e) {
            const why = e instanceof Error ? e.message : "";
            setError(
                `Cannot reach the server. Check your Wi-Fi and that the backend is running. (${why})`
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.topBar}>
                <Pressable onPress={() => router.back()} hitSlop={12}>
                    <Ionicons name="arrow-back" size={26} color={colors.text} />
                </Pressable>
                <Text style={styles.topTitle}>Become a volunteer</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Text style={styles.intro}>
                    Help women near you. Our team checks every volunteer before they get alerts.
                </Text>

                <View style={styles.card}>
                    <Text style={styles.label}>Full name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Ananya Sharma"
                        placeholderTextColor={colors.textMuted}
                        value={name}
                        onChangeText={setName}
                        maxLength={50}
                    />

                    <Text style={styles.label}>Mobile number</Text>
                    <View style={[styles.input, styles.locked]}>
                        <Text style={styles.lockedText}>+91 {user?.phone}</Text>
                    </View>

                    <Text style={styles.label}>Home area or locality</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Indiranagar, Stage 2"
                        placeholderTextColor={colors.textMuted}
                        value={area}
                        onChangeText={setArea}
                        maxLength={60}
                    />
                </View>

                <View style={styles.upload}>
                    {photo ? (
                        <Image source={{ uri: photo.uri }} style={styles.preview} resizeMode="cover" />
                    ) : (
                        <View style={styles.uploadIcon}>
                            <Ionicons name="id-card-outline" size={28} color={colors.rose} />
                        </View>
                    )}
                    <Text style={styles.uploadTitle}>
                        {photo ? "ID photo added" : "Upload a government ID"}
                    </Text>
                    <Text style={styles.muted}>Only our admin team can see this</Text>
                    <View style={styles.uploadButtons}>
                        <Pressable style={styles.smallBtn} onPress={() => pick("camera")}>
                            <Ionicons name="camera-outline" size={18} color={colors.rose} />
                            <Text style={styles.smallBtnText}>Take a photo</Text>
                        </Pressable>
                        <Pressable style={styles.smallBtn} onPress={() => pick("gallery")}>
                            <Ionicons name="image-outline" size={18} color={colors.rose} />
                            <Text style={styles.smallBtnText}>Choose a photo</Text>
                        </Pressable>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Before you join</Text>
                    {[
                        "You will get alerts only within 1 km",
                        "You can go offline any time",
                        "You can decline any alert",
                    ].map((t) => (
                        <View key={t} style={styles.checkLine}>
                            <Ionicons name="checkmark-circle" size={20} color={colors.rose} />
                            <Text style={styles.lineText}>{t}</Text>
                        </View>
                    ))}
                </View>

                <Pressable style={styles.agree} onPress={() => setAgreed(!agreed)}>
                    <Ionicons
                        name={agreed ? "checkbox" : "square-outline"}
                        size={26}
                        color={colors.rose}
                    />
                    <Text style={styles.agreeText}>
                        I understand that I should never confront anyone and should call 112 if it looks
                        dangerous
                    </Text>
                </Pressable>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <View style={{ height: spacing.lg }} />
                <Button title="Submit for review" onPress={submit} loading={submitting} />
                <Text style={styles.footnote}>Review usually takes 1 to 2 days</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    topTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
    content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
    intro: { fontSize: 15, color: colors.textMuted },
    card: {
        backgroundColor: colors.blush,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.card,
        padding: spacing.lg,
        marginTop: spacing.lg,
    },
    cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
    label: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginTop: spacing.md },
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
    locked: { justifyContent: "center", backgroundColor: colors.blush },
    lockedText: { fontSize: 16, color: colors.textMuted },
    upload: {
        alignItems: "center",
        padding: spacing.xl,
        borderRadius: radius.card,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: colors.rose,
        backgroundColor: colors.blush,
        marginTop: spacing.lg,
        gap: 4,
    },
    uploadIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: spacing.sm,
    },
    preview: { width: 140, height: 90, borderRadius: radius.button, marginBottom: spacing.sm },
    uploadTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
    muted: { fontSize: 14, color: colors.textMuted },
    uploadButtons: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
    smallBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.rose,
        backgroundColor: colors.white,
    },
    smallBtnText: { fontSize: 14, fontWeight: "700", color: colors.rose },
    checkLine: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 4 },
    lineText: { fontSize: 14, color: colors.text, flex: 1 },
    agree: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg, alignItems: "flex-start" },
    agreeText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },
    error: { color: colors.sos, fontSize: 14, marginTop: spacing.md },
    footnote: { fontSize: 13, color: colors.textMuted, textAlign: "center", marginTop: spacing.md },
});