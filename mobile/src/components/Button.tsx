import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors, radius } from "../constants/theme";

type Props = {
    title: string;
    onPress: () => void;
    variant?: "primary" | "outline" | "sos";
    loading?: boolean;
    disabled?: boolean;
};

// primary = rose pink, outline = white with a rose border,
// sos = deep red (only for emergency things)
export default function Button({
    title,
    onPress,
    variant = "primary",
    loading = false,
    disabled = false,
}: Props) {
    const isOutline = variant === "outline";
    const background = variant === "sos" ? colors.sos : colors.rose;
    const off = disabled || loading;

    return (
        <Pressable
            onPress={onPress}
            disabled={off}
            style={({ pressed }) => [
                styles.base,
                isOutline
                    ? { backgroundColor: colors.white, borderColor: colors.rose, borderWidth: 1.5 }
                    : { backgroundColor: background },
                off && styles.disabled,
                pressed && styles.pressed,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={isOutline ? colors.rose : colors.white} />
            ) : (
                <Text style={[styles.text, { color: isOutline ? colors.rose : colors.white }]}>
                    {title}
                </Text>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        height: 52,
        borderRadius: radius.button,
        alignItems: "center",
        justifyContent: "center",
    },
    text: { fontSize: 16, fontWeight: "700" },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.85 },
});