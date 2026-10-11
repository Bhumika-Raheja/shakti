import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing } from "../constants/theme";
import legal from "../constants/legal.json";

type Doc = {
    title: string;
    intro: string;
    sections: { heading: string; paragraphs?: string[]; bullets?: string[] }[];
};

// Shows the Privacy Policy or the Terms of Use, read from legal.json
export default function LegalScreen({ kind }: { kind: "privacy" | "terms" }) {
    const router = useRouter();
    const doc = legal[kind] as Doc;

    // Puts the contact and date into the text
    const fill = (text: string) =>
        text.replaceAll("{{contact}}", legal.contact).replaceAll("{{updated}}", legal.updated);

    function goBack() {
        if (router.canGoBack()) router.back();
        else router.replace("/");
    }

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.topBar}>
                <Pressable onPress={goBack} hitSlop={12}>
                    <Ionicons name="arrow-back" size={26} color={colors.text} />
                </Pressable>
                <Text style={styles.topTitle}>{doc.title}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.intro}>{fill(doc.intro)}</Text>

                {doc.sections.map((s) => (
                    <View key={s.heading} style={styles.card}>
                        <Text style={styles.heading}>{s.heading}</Text>
                        {s.paragraphs?.map((p) => (
                            <Text key={p} style={styles.paragraph}>
                                {fill(p)}
                            </Text>
                        ))}
                        {s.bullets?.map((b) => (
                            <View key={b} style={styles.bulletRow}>
                                <Text style={styles.bullet}>•</Text>
                                <Text style={styles.bulletText}>{fill(b)}</Text>
                            </View>
                        ))}
                    </View>
                ))}
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
    intro: { fontSize: 15, color: colors.textMuted, lineHeight: 22 },
    card: {
        backgroundColor: colors.blush,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.card,
        padding: spacing.lg,
        marginTop: spacing.md,
    },
    heading: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
    paragraph: { fontSize: 14, color: colors.text, lineHeight: 21, marginTop: 4 },
    bulletRow: { flexDirection: "row", gap: spacing.sm, marginTop: 6 },
    bullet: { fontSize: 14, color: colors.rose, lineHeight: 21 },
    bulletText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 21 },
});