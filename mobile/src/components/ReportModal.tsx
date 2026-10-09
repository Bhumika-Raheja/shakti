import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../constants/theme";
import Button from "./Button";

export type ReportType = "poor_lighting" | "followed" | "harassment";

export const REPORT_LABEL: Record<ReportType, string> = {
    poor_lighting: "Poor lighting",
    followed: "Followed",
    harassment: "Harassment",
};

const OPTIONS: { type: ReportType; hint: string }[] = [
    { type: "poor_lighting", hint: "A dark street, or no street lights" },
    { type: "followed", hint: "Someone followed or watched me" },
    { type: "harassment", hint: "Someone bothered or threatened me" },
];

type Props = {
    visible: boolean;
    saving: boolean;
    error: string;
    onClose: () => void;
    onSubmit: (type: ReportType) => void;
};

// A small pop-up for reporting an unsafe place at the user's current location.
// The form inside starts fresh every time the pop-up opens.
export default function ReportModal(props: Props) {
    return (
        <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
            <View style={styles.backdrop}>{props.visible ? <ReportForm {...props} /> : null}</View>
        </Modal>
    );
}

function ReportForm({ saving, error, onClose, onSubmit }: Props) {
    const [type, setType] = useState<ReportType | null>(null);
    const [localError, setLocalError] = useState("");

    function submit() {
        if (!type) {
            setLocalError("Choose what happened");
            return;
        }
        setLocalError("");
        onSubmit(type);
    }

    const shownError = localError || error;

    return (
        <View style={styles.card}>
            <Text style={styles.title}>Report an unsafe place</Text>
            <Text style={styles.sub}>
                This reports the place where you are now. Your report is anonymous: others see only the
                place and what happened, never your name.
            </Text>

            {OPTIONS.map((o) => (
                <Pressable
                    key={o.type}
                    onPress={() => setType(o.type)}
                    style={[styles.option, type === o.type && styles.optionOn]}
                >
                    <Text style={[styles.optionTitle, type === o.type && { color: colors.rose }]}>
                        {REPORT_LABEL[o.type]}
                    </Text>
                    <Text style={styles.optionHint}>{o.hint}</Text>
                </Pressable>
            ))}

            <Text style={styles.warn}>
                If you are in danger right now, use the SOS button or call 112.
            </Text>

            {shownError ? <Text style={styles.error}>{shownError}</Text> : null}

            <View style={{ height: spacing.md }} />
            <Button title="Send report" onPress={submit} loading={saving} />
            <View style={{ height: spacing.sm }} />
            <Button title="Cancel" variant="outline" onPress={onClose} disabled={saving} />
        </View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        padding: spacing.xl,
    },
    card: { backgroundColor: colors.white, borderRadius: radius.card, padding: spacing.xl },
    title: { fontSize: 20, fontWeight: "800", color: colors.text },
    sub: { fontSize: 13, color: colors.textMuted, marginTop: 6, marginBottom: spacing.md },
    option: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.button,
        padding: spacing.md,
        marginTop: spacing.sm,
        backgroundColor: colors.white,
    },
    optionOn: { backgroundColor: colors.blush, borderColor: colors.rose, borderWidth: 1.5 },
    optionTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
    optionHint: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    warn: { fontSize: 13, color: colors.sos, marginTop: spacing.md },
    error: { color: colors.sos, fontSize: 14, marginTop: spacing.sm },
});