import { useEffect, useState } from "react";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing } from "../constants/theme";
import { useVolunteer } from "../context/VolunteerContext";
import Button from "./Button";
import LiveMap from "./LiveMap";

const RESPOND_SECONDS = 45;

// A full-screen pop-up shown on top of everything when an alert arrives
export default function IncomingAlertModal() {
  const { incoming, active, accepting, accept, decline } = useVolunteer();
  const current = incoming[0];
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const secondsLeft = current
    ? Math.max(0, RESPOND_SECONDS - Math.floor((now - current.receivedAt) / 1000))
    : 0;

  // Time ran out: treat it as "can't help"
  useEffect(() => {
    if (current && secondsLeft <= 0 && accepting !== current.alertId) {
      decline(current.alertId);
    }
  }, [secondsLeft, current, accepting, decline]);

  if (!current || active) return null;
  const busy = accepting === current.alertId;

  return (
    <Modal visible animationType="slide" onRequestClose={() => decline(current.alertId)}>
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>Someone near you needs help</Text>
            <Text style={styles.bannerSub}>
              {current.label}  •  Respond in 0:{String(secondsLeft).padStart(2, "0")}
            </Text>
          </View>

          <View style={{ height: spacing.lg }} />
          <LiveMap me={current.approxLocation} helpers={[]} height={220} />
          <Text style={styles.note}>
            The red dot is the area she is in. Her exact location, and her name, are shown only
            after you accept.
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>About this alert</Text>
            <Text style={styles.line}>Up to 3 volunteers can help.</Text>
            <Text style={styles.line}>Live location is on.</Text>
          </View>

          <View style={styles.tips}>
            <Text style={styles.tipsTitle}>Safety tips</Text>
            <Text style={styles.line}>
              Stay safe. Do not confront anyone. If it looks dangerous, call 112.
            </Text>
          </View>

          <View style={{ height: spacing.lg }} />
          <Button
            title="Accept and go"
            onPress={() => accept(current.alertId)}
            loading={busy}
          />
          <View style={{ height: spacing.md }} />
          <Button
            title="Can't help right now"
            variant="outline"
            onPress={() => decline(current.alertId)}
            disabled={busy}
          />
          <Pressable onPress={() => Linking.openURL("tel:112")} style={styles.call}>
            <Text style={styles.callText}>Call 112 directly</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  banner: { backgroundColor: colors.sos, borderRadius: radius.card, padding: spacing.lg },
  bannerTitle: { color: colors.white, fontSize: 20, fontWeight: "800" },
  bannerSub: { color: colors.white, fontSize: 14, marginTop: 6 },
  note: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm },
  card: {
    backgroundColor: colors.blush,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 4 },
  line: { fontSize: 14, color: colors.text, marginTop: 4 },
  tips: {
    backgroundColor: colors.blush,
    borderColor: colors.sos,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  tipsTitle: { fontSize: 16, fontWeight: "700", color: colors.sos, marginBottom: 4 },
  call: { alignItems: "center", paddingVertical: spacing.lg },
  callText: { color: colors.rose, fontSize: 15, fontWeight: "700" },
});