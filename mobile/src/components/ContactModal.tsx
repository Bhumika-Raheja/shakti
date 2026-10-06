import { useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { colors, radius, spacing } from "../constants/theme";
import Button from "./Button";

export type Relation = "Family" | "Friend" | "Other";
export type ContactInput = { name: string; phone: string; relation: Relation };

const RELATIONS: Relation[] = ["Family", "Friend", "Other"];

type Props = {
    visible: boolean;
    title: string;
    initial?: ContactInput | null;
    saving: boolean;
    error: string;
    onClose: () => void;
    onSave: (c: ContactInput) => void;
};

// A small pop-up form used to add a contact or edit one
export default function ContactModal({
    visible,
    title,
    initial,
    saving,
    error,
    onClose,
    onSave,
}: Props) {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [relation, setRelation] = useState<Relation>("Family");
    const [localError, setLocalError] = useState("");

    // Every time the form opens, fill it with the contact being edited (or empty)
    useEffect(() => {
        if (visible) {
            setName(initial?.name ?? "");
            setPhone(initial?.phone ?? "");
            setRelation(initial?.relation ?? "Family");
            setLocalError("");
        }
    }, [visible, initial]);

    function submit() {
        if (!name.trim()) {
            setLocalError("Enter a name");
            return;
        }
        if (!/^[6-9]\d{9}$/.test(phone)) {
            setLocalError("Enter a valid 10-digit mobile number");
            return;
        }
        setLocalError("");
        onSave({ name: name.trim(), phone, relation });
    }

    const shownError = localError || error;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
                <View style={styles.card}>
                    <Text style={styles.title}>{title}</Text>

                    <Text style={styles.label}>Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Mom"
                        placeholderTextColor={colors.textMuted}
                        value={name}
                        onChangeText={setName}
                        maxLength={50}
                    />

                    <Text style={styles.label}>Mobile number</Text>
                    <View style={styles.phoneRow}>
                        <Text style={styles.prefix}>+91</Text>
                        <TextInput
                            style={styles.phoneInput}
                            placeholder="10-digit number"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="number-pad"
                            maxLength={10}
                            value={phone}
                            onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, ""))}
                        />
                    </View>

                    <Text style={styles.label}>Relation</Text>
                    <View style={styles.chips}>
                        {RELATIONS.map((r) => (
                            <Pressable
                                key={r}
                                onPress={() => setRelation(r)}
                                style={[styles.chip, relation === r && styles.chipOn]}
                            >
                                <Text style={[styles.chipText, relation === r && styles.chipTextOn]}>{r}</Text>
                            </Pressable>
                        ))}
                    </View>

                    {shownError ? <Text style={styles.error}>{shownError}</Text> : null}

                    <View style={{ height: spacing.lg }} />
                    <Button title="Save" onPress={submit} loading={saving} />
                    <View style={{ height: spacing.sm }} />
                    <Button title="Cancel" variant="outline" onPress={onClose} disabled={saving} />
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        padding: spacing.xl,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: radius.card,
        padding: spacing.xl,
    },
    title: { fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: spacing.md },
    label: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginTop: spacing.md },
    input: {
        height: 48,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.button,
        paddingHorizontal: spacing.md,
        fontSize: 16,
        color: colors.text,
        marginTop: 6,
    },
    phoneRow: {
        flexDirection: "row",
        alignItems: "center",
        height: 48,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.button,
        paddingHorizontal: spacing.md,
        marginTop: 6,
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
    phoneInput: { flex: 1, fontSize: 16, color: colors.text },
    chips: { flexDirection: "row", gap: spacing.sm, marginTop: 6 },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.white,
    },
    chipOn: { backgroundColor: colors.blush, borderColor: colors.rose },
    chipText: { fontSize: 14, color: colors.text },
    chipTextOn: { color: colors.rose, fontWeight: "700" },
    error: { color: colors.sos, fontSize: 14, marginTop: spacing.md },
});