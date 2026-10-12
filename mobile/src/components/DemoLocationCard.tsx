import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import { colors, radius, spacing } from "../constants/theme";
import { useSettings } from "../context/SettingsContext";

// A switch in Profile: demo location (Bangalore) or the phone's real GPS
export default function DemoLocationCard() {
    const { demoLocation, setDemoLocation } = useSettings();

    function onChange(on: boolean) {
        setDemoLocation(on);
        if (!on) {
            Alert.alert(
                "Real location",
                "Shakti will now use your phone's GPS. The demo volunteers and reports are in Bangalore, so alerts only reach volunteers who are near you."
            );
        }
    }

    return (
        <View style={styles.card}>
            <View style={styles.row}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Demo location</Text>
                    <Text style={styles.muted}>
                        {demoLocation
                            ? "On: the app pretends you are in Indiranagar, Bangalore, where the demo volunteers are."
                            : "Off: the app uses your real GPS."}
                    </Text>
                </View>
                <Switch
                    value={demoLocation}
                    onValueChange={onChange}
                    trackColor={{ false: colors.border, true: colors.rose }}
                    thumbColor={colors.white}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.blush,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.card,
        padding: spacing.lg,
        marginTop: spacing.md,
    },
    row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    title: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 4 },
    muted: { fontSize: 14, color: colors.textMuted },
});