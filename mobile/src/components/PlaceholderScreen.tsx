import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing } from "../constants/theme";

// A temporary screen: a title and a short note.
// We will replace each one with the real design, one by one.
export default function PlaceholderScreen({
    title,
    note,
}: {
    title: string;
    note: string;
}) {
    return (
        <SafeAreaView style={styles.screen} edges={["top"]}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.card}>
                <Text style={styles.note}>{note}</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.background,
        padding: spacing.lg,
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        color: colors.text,
        marginBottom: spacing.lg,
    },
    card: {
        backgroundColor: colors.blush,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.card,
        padding: spacing.lg,
    },
    note: {
        fontSize: 16,
        color: colors.textMuted,
    },
});