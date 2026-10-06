import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ContactModal, { ContactInput, Relation } from "../../components/ContactModal";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { api, errorMessage } from "../../services/api";

type Contact = {
    _id: string;
    name: string;
    phone: string;
    relation: Relation;
    isPrimary: boolean;
};

const MAX_CONTACTS = 5;

export default function Contacts() {
    const { user } = useAuth();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Contact | null>(null);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    const loadSeq = useRef(0); // numbers each load, so late replies can be ignored
    const pending = useRef(0); // how many changes are still being sent
    const chain = useRef<Promise<unknown>>(Promise.resolve()); // the queue of changes

    const full = contacts.length >= MAX_CONTACTS;

    // Load the list from the backend
    const load = useCallback(async () => {
        const mine = ++loadSeq.current;
        try {
            const res = await api.get("/contacts");
            if (mine !== loadSeq.current) return; // an older answer arrived late: ignore it
            if (pending.current > 0) return; // changes are still on their way: keep what is on screen
            setContacts(res.data.contacts);
            setLoadError("");
        } catch (err) {
            if (mine !== loadSeq.current) return;
            setLoadError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    // ...every time this screen opens
    useFocusEffect(
        useCallback(() => {
            load();
        }, [load])
    );

    // NEW: show a change on screen straight away, then send it to the server.
    // Changes are sent one at a time, in the order they were tapped, and the list
    // is reloaded from the server only after the last one is done.
    function runChange(showNow: () => void, send: () => Promise<unknown>) {
        showNow();
        pending.current += 1;
        chain.current = chain.current
            .then(send)
            .catch((err) => Alert.alert("Could not save the change", errorMessage(err)))
            .finally(() => {
                pending.current -= 1;
                if (pending.current === 0) load();
            });
    }

    function openAdd() {
        setEditing(null);
        setFormError("");
        setModalOpen(true);
    }

    function openEdit(c: Contact) {
        setEditing(c);
        setFormError("");
        setModalOpen(true);
    }

    // Save a new contact, or the changes to an existing one
    async function save(input: ContactInput) {
        setSaving(true);
        setFormError("");
        try {
            if (editing) {
                await api.put(`/contacts/${editing._id}`, input);
            } else {
                await api.post("/contacts", input);
            }
            setModalOpen(false);
            await load();
        } catch (err) {
            setFormError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    }

    function makePrimary(c: Contact) {
        if (c.isPrimary) return;
        runChange(
            () =>
                setContacts((list) =>
                    list
                        .map((x) => ({ ...x, isPrimary: x._id === c._id }))
                        .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
                ),
            () => api.patch(`/contacts/${c._id}/primary`)
        );
    }

    function confirmRemove(c: Contact) {
        Alert.alert("Remove contact?", `${c.name} will no longer get your SOS messages.`, [
            { text: "Keep", style: "cancel" },
            {
                text: "Remove",
                style: "destructive",
                onPress: () =>
                    runChange(
                        () =>
                            setContacts((list) => {
                                const rest = list.filter((x) => x._id !== c._id);
                                // if the primary one is removed, the oldest remaining one becomes primary
                                if (c.isPrimary && rest.length > 0) rest[0] = { ...rest[0], isPrimary: true };
                                return rest;
                            }),
                        () => api.delete(`/contacts/${c._id}`)
                    ),
            },
        ]);
    }

    const who = user?.name ? user.name : "Someone you know";

    return (
        <SafeAreaView style={styles.screen} edges={["top"]}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Text style={styles.title}>Trusted contacts</Text>
                <Text style={styles.sub}>These people get your SOS message and live location</Text>

                <Text style={styles.count}>
                    {contacts.length} of {MAX_CONTACTS} added
                </Text>

                {loadError ? <Text style={styles.error}>{loadError}</Text> : null}
                {!loading && !loadError && contacts.length === 0 ? (
                    <View style={styles.card}>
                        <Text style={styles.muted}>
                            You have not added anyone yet. Add a family member or a friend you trust.
                        </Text>
                    </View>
                ) : null}

                {contacts.map((c) => (
                    <View key={c._id} style={styles.card}>
                        <View style={styles.topRow}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{c.name.charAt(0).toUpperCase()}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <View style={styles.nameRow}>
                                    <Text style={styles.name}>{c.name}</Text>
                                    {c.isPrimary ? (
                                        <View style={styles.primaryTag}>
                                            <Text style={styles.primaryText}>Primary</Text>
                                        </View>
                                    ) : null}
                                </View>
                                <Text style={styles.muted}>
                                    +91 {c.phone}  •  {c.relation}
                                </Text>
                            </View>
                            <Pressable
                                onPress={() => Linking.openURL(`tel:${c.phone}`)}
                                style={styles.callBtn}
                                accessibilityLabel={`Call ${c.name}`}
                            >
                                <Ionicons name="call-outline" size={20} color={colors.rose} />
                            </Pressable>
                        </View>

                        <View style={styles.actions}>
                            {!c.isPrimary ? (
                                <Pressable onPress={() => makePrimary(c)} hitSlop={8} style={styles.actionBtn}>
                                    <Text style={styles.action}>Make primary</Text>
                                </Pressable>
                            ) : null}
                            <Pressable onPress={() => openEdit(c)} hitSlop={8} style={styles.actionBtn}>
                                <Text style={styles.action}>Edit</Text>
                            </Pressable>
                            <Pressable onPress={() => confirmRemove(c)} hitSlop={8} style={styles.actionBtn}>
                                <Text style={[styles.action, { color: colors.sos }]}>Remove</Text>
                            </Pressable>
                        </View>
                    </View>
                ))}

                <Pressable
                    onPress={openAdd}
                    disabled={full}
                    style={[styles.addCard, full && { opacity: 0.5 }]}
                >
                    <Ionicons name="add-circle-outline" size={26} color={colors.rose} />
                    <Text style={styles.addTitle}>{full ? "You have added 5 contacts" : "Add a contact"}</Text>
                    {!full ? <Text style={styles.muted}>You can add up to {MAX_CONTACTS}</Text> : null}
                </Pressable>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Message preview</Text>
                    <Text style={styles.muted}>Sent to your contacts when you press SOS:</Text>
                    <View style={styles.preview}>
                        <Text style={styles.previewText}>
                            EMERGENCY SOS: {who} needs help. Location: (your live map link) Please call them,
                            or call 112 if you cannot reach them. - Sent by Shakti
                        </Text>
                    </View>
                </View>
            </ScrollView>

            <ContactModal
                visible={modalOpen}
                title={editing ? "Edit contact" : "Add a contact"}
                initial={editing ? { name: editing.name, phone: editing.phone, relation: editing.relation } : null}
                saving={saving}
                error={formError}
                onClose={() => setModalOpen(false)}
                onSave={save}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
    title: { fontSize: 24, fontWeight: "800", color: colors.text },
    sub: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
    count: { fontSize: 13, fontWeight: "600", color: colors.rose, marginTop: spacing.md },
    error: { color: colors.sos, fontSize: 14, marginTop: spacing.md },
    card: {
        backgroundColor: colors.blush,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.card,
        padding: spacing.lg,
        marginTop: spacing.md,
    },
    cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 4 },
    topRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: { fontSize: 18, fontWeight: "700", color: colors.rose },
    nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    name: { fontSize: 16, fontWeight: "700", color: colors.text },
    primaryTag: {
        backgroundColor: colors.rose,
        borderRadius: radius.pill,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    primaryText: { color: colors.white, fontSize: 11, fontWeight: "700" },
    muted: { fontSize: 14, color: colors.textMuted },
    callBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    actions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    actionBtn: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        minHeight: 44,
        justifyContent: "center",
    },
    action: { fontSize: 14, fontWeight: "700", color: colors.rose },
    addCard: {
        alignItems: "center",
        gap: 4,
        paddingVertical: spacing.xl,
        borderRadius: radius.card,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: colors.rose,
        marginTop: spacing.md,
    },
    addTitle: { fontSize: 16, fontWeight: "700", color: colors.rose },
    preview: {
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.button,
        padding: spacing.md,
        marginTop: spacing.sm,
    },
    previewText: { fontSize: 14, color: colors.text, lineHeight: 20 },
});