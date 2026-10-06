import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, Vibration, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors } from "../constants/theme";

const HOLD_MS = 3000; // hold for 3 seconds
const SIZE = 250;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// A big round SOS button. It only fires after the user holds it for 3 seconds,
// so an accidental tap does nothing. A ring fills up while holding.
export default function SosButton({
    onTrigger,
    disabled = false,
}: {
    onTrigger: () => void;
    disabled?: boolean;
}) {
    const [progress, setProgress] = useState(0); // 0 to 1
    const timer = useRef<ReturnType<typeof setInterval> | null>(null);
    const startedAt = useRef(0);
    const done = useRef(false);

    function stop() {
        if (timer.current) {
            clearInterval(timer.current);
            timer.current = null;
        }
    }
    useEffect(() => stop, []);

    function pressIn() {
        if (disabled) return;
        done.current = false;
        startedAt.current = Date.now();
        stop();
        timer.current = setInterval(() => {
            const p = Math.min((Date.now() - startedAt.current) / HOLD_MS, 1);
            setProgress(p);
            if (p >= 1 && !done.current) {
                done.current = true;
                stop();
                Vibration.vibrate(400);
                onTrigger();
                setTimeout(() => setProgress(0), 600);
            }
        }, 40);
    }

    function pressOut() {
        stop();
        if (!done.current) setProgress(0); // let go too early: start over
    }

    const secondsLeft = Math.max(1, Math.ceil((1 - progress) * (HOLD_MS / 1000)));

    return (
        <View style={styles.wrap}>
            <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
                <Circle
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    stroke={colors.border}
                    strokeWidth={STROKE}
                    fill="none"
                />
                <Circle
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    stroke={colors.sos}
                    strokeWidth={STROKE}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                    strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
                    rotation="-90"
                    origin={`${SIZE / 2}, ${SIZE / 2}`}
                />
            </Svg>
            <Pressable
                onPressIn={pressIn}
                onPressOut={pressOut}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel="SOS. Press and hold for 3 seconds to send an alert"
                style={[styles.button, disabled && { opacity: 0.5 }]}
            >
                <Text style={styles.sos}>SOS</Text>
                {progress > 0 && progress < 1 ? (
                    <Text style={styles.hold}>Keep holding... {secondsLeft}</Text>
                ) : null}
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        width: SIZE,
        height: SIZE,
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "center",
    },
    button: {
        width: 190,
        height: 190,
        borderRadius: 95,
        backgroundColor: colors.sos,
        alignItems: "center",
        justifyContent: "center",
    },
    sos: { color: colors.white, fontSize: 48, fontWeight: "800", letterSpacing: 2 },
    hold: { color: colors.white, fontSize: 13, marginTop: 4 },
});