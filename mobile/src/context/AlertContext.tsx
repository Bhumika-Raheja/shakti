import * as Location from "expo-location";
import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { Socket } from "socket.io-client";
import { TEST_LOCATION, USE_TEST_LOCATION } from "../constants/config";
import { connectSocket, disconnectSocket } from "../services/socket";
import { useAuth } from "./AuthContext";

export type Responder = {
    volunteerId: string;
    name: string;
    rating: number;
    helpedCount: number;
    status: "accepted" | "on_the_way" | "arrived" | "left";
    isLead: boolean;
};

// idle = no SOS, sending = waiting for the server, active = SOS is on,
// resolved / cancelled = it is over
type Phase = "idle" | "sending" | "active" | "resolved" | "cancelled";

type AlertState = {
    phase: Phase;
    alertId: string | null;
    startedAt: number | null;
    notifiedCount: number; // volunteers who were alerted
    contactsCount: number; // trusted contacts who were messaged
    responders: Responder[]; // helpers who accepted
    expanded: boolean; // the search was widened to 3 km
    unanswered: boolean; // nobody accepted: tell her to call 112
    helperPositions: Record<string, { lat: number; lng: number }>;
    error: string;
};

const emptyState: AlertState = {
    phase: "idle",
    alertId: null,
    startedAt: null,
    notifiedCount: 0,
    contactsCount: 0,
    responders: [],
    expanded: false,
    unanswered: false,
    helperPositions: {},
    error: "",
};

type AlertContextValue = AlertState & {
    sendSos: () => Promise<void>;
    cancelSos: () => void;
    reset: () => void;
};

const AlertContext = createContext<AlertContextValue | null>(null);

// Where is the phone right now?
async function getPosition() {
    if (USE_TEST_LOCATION) return TEST_LOCATION;
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== "granted") {
        throw new Error("Please allow location, so helpers can find you.");
    }
    const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced, // faster than "High", good enough
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

export function AlertProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [state, setState] = useState<AlertState>(emptyState);
    const socketRef = useRef<Socket | null>(null);
    const stateRef = useRef<AlertState>(state);
    stateRef.current = state;
    const sendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Listen to the server (only for women using the app)
    useEffect(() => {
        if (!user || user.role !== "user") {
            setState(emptyState);
            return;
        }

        const socket = connectSocket();
        socketRef.current = socket;

        // Ignore messages that belong to some other alert
        const mine = (id?: string) => !!stateRef.current.alertId && id === stateRef.current.alertId;
        const stopTimer = () => {
            if (sendingTimer.current) clearTimeout(sendingTimer.current);
        };

        const onCreated = (d: { alertId: string; notifiedCount: number }) => {
            stopTimer();
            stateRef.current = { ...stateRef.current, alertId: d.alertId };
            setState((s) => ({
                ...s,
                phase: "active",
                alertId: d.alertId,
                notifiedCount: d.notifiedCount,
            }));
        };
        const onContacts = (d: { count: number }) =>
            setState((s) => ({ ...s, contactsCount: d.count }));
        const onError = (d: { message: string }) => {
            stopTimer();
            setState({ ...emptyState, error: d.message });
        };
        const onResponders = (d: { alertId: string; responders: Responder[] }) => {
            if (mine(d.alertId)) setState((s) => ({ ...s, responders: d.responders }));
        };
        const onStatus = (d: { alertId: string; status: string }) => {
            if (!mine(d.alertId)) return;
            if (d.status === "resolved") setState((s) => ({ ...s, phase: "resolved" }));
            if (d.status === "cancelled") setState((s) => ({ ...s, phase: "cancelled" }));
        };
        const onExpanded = (d: { alertId: string }) => {
            if (mine(d.alertId)) setState((s) => ({ ...s, expanded: true }));
        };
        const onUnanswered = (d: { alertId: string }) => {
            if (mine(d.alertId)) setState((s) => ({ ...s, unanswered: true }));
        };
        const onLocation = (d: {
            alertId: string;
            from: string;
            volunteerId: string | null;
            lat: number;
            lng: number;
        }) => {
            if (!mine(d.alertId) || d.from !== "volunteer" || !d.volunteerId) return;
            const id = d.volunteerId;
            setState((s) => ({
                ...s,
                helperPositions: { ...s.helperPositions, [id]: { lat: d.lat, lng: d.lng } },
            }));
        };

        socket.on("sos:created", onCreated);
        socket.on("sos:contacts", onContacts);
        socket.on("sos:error", onError);
        socket.on("alert:responders", onResponders);
        socket.on("alert:status", onStatus);
        socket.on("alert:expanded", onExpanded);
        socket.on("alert:unanswered", onUnanswered);
        socket.on("location:update", onLocation);

        return () => {
            socket.off("sos:created", onCreated);
            socket.off("sos:contacts", onContacts);
            socket.off("sos:error", onError);
            socket.off("alert:responders", onResponders);
            socket.off("alert:status", onStatus);
            socket.off("alert:expanded", onExpanded);
            socket.off("alert:unanswered", onUnanswered);
            socket.off("location:update", onLocation);
            disconnectSocket();
            socketRef.current = null;
        };
    }, [user?._id, user?.role]);

    // While an SOS is on, send the woman's position every 5 seconds
    useEffect(() => {
        if (state.phase !== "active" || !state.alertId) return;
        const alertId = state.alertId;
        const timer = setInterval(async () => {
            try {
                const pos = await getPosition();
                socketRef.current?.emit("location:update", { alertId, ...pos });
            } catch {
                // A missed update is fine, the next one will follow
            }
        }, 5000);
        return () => clearInterval(timer);
    }, [state.phase, state.alertId]);

    // Send the SOS
    const sendSos = useCallback(async () => {
        const phase = stateRef.current.phase;
        if (phase === "sending" || phase === "active") return;

        setState({ ...emptyState, phase: "sending", startedAt: Date.now() });
        try {
            const pos = await getPosition();
            const socket = socketRef.current;
            if (!socket || !socket.connected) {
                throw new Error("Not connected to the server. Check your Wi-Fi.");
            }
            socket.emit("sos:trigger", pos);

            // If the server does not answer in 10 seconds, show an error
            if (sendingTimer.current) clearTimeout(sendingTimer.current);
            sendingTimer.current = setTimeout(() => {
                if (stateRef.current.phase === "sending") {
                    setState({
                        ...emptyState,
                        error: "The SOS could not be sent. Please call 112.",
                    });
                }
            }, 10000);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Could not send the SOS.";
            setState({ ...emptyState, error: message });
        }
    }, []);

    // "I am safe, cancel alert"
    const cancelSos = useCallback(() => {
        const id = stateRef.current.alertId;
        if (id) socketRef.current?.emit("alert:cancel", { alertId: id });
        setState((s) => ({ ...s, phase: "cancelled" }));
    }, []);

    const reset = useCallback(() => setState(emptyState), []);

    return (
        <AlertContext.Provider value={{ ...state, sendSos, cancelSos, reset }}>
            {children}
        </AlertContext.Provider>
    );
}

export function useAlert() {
    const ctx = useContext(AlertContext);
    if (!ctx) throw new Error("useAlert must be used inside AlertProvider");
    return ctx;
}