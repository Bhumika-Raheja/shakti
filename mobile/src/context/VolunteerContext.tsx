import axios from "axios";
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
import { TEST_VOLUNTEER_LOCATION, USE_TEST_LOCATION } from "../constants/config";
import { api, errorMessage } from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";
import type { Responder } from "./AlertContext";
import { useAuth } from "./AuthContext";

type Point = { lat: number; lng: number };

export type VolunteerProfile = {
    id: string;
    status: "pending" | "verified" | "suspended";
    area: string;
    isOnline: boolean;
    helpedCount: number;
    rating: number;
    hasIdDoc: boolean;
};

export type RecentAlert = {
    alertId: string;
    outcome: "helped" | "left" | "cancelled" | "ongoing";
    createdAt: string;
};

// An alert that has just arrived (before the volunteer accepts)
export type Incoming = {
    alertId: string;
    label: string;
    distanceMeters: number;
    approxLocation: Point;
    receivedAt: number;
};

// An alert the volunteer has accepted
export type ActiveHelp = {
    alertId: string;
    isLead: boolean;
    womanName: string;
    woman: Point; // her exact location, now that we accepted
    others: Record<string, Point>; // the other helpers' positions
    responders: Responder[];
    myStatus: "accepted" | "on_the_way" | "arrived";
    phase: "active" | "resolved" | "cancelled";
};

type LoadState = "loading" | "ready" | "none" | "error";

type VolunteerContextValue = {
    loadState: LoadState;
    loadError: string;
    profile: VolunteerProfile | null;
    recent: RecentAlert[];
    incoming: Incoming[];
    accepting: string | null;
    active: ActiveHelp | null;
    notice: string;
    myPos: Point | null;
    reload: () => Promise<void>;
    setOnline: (on: boolean) => Promise<string>; // returns an error message, or ""
    accept: (alertId: string) => void;
    decline: (alertId: string) => void;
    sendStatus: (status: "on_the_way" | "arrived" | "resolved") => void;
    leaveAlert: () => void;
    closeActive: () => void;
    clearNotice: () => void;
};

const VolunteerContext = createContext<VolunteerContextValue | null>(null);

// Where is the volunteer's phone right now?
async function getMyPosition(): Promise<Point> {
    if (USE_TEST_LOCATION) return TEST_VOLUNTEER_LOCATION;
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== "granted") {
        throw new Error("Please allow location, so we can alert you about people nearby.");
    }
    const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

function messageOf(err: unknown) {
    if (err instanceof Error && !axios.isAxiosError(err)) return err.message;
    return errorMessage(err);
}

export function VolunteerProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [loadState, setLoadState] = useState<LoadState>("loading");
    const [loadError, setLoadError] = useState("");
    const [profile, setProfile] = useState<VolunteerProfile | null>(null);
    const [recent, setRecent] = useState<RecentAlert[]>([]);
    const [incoming, setIncoming] = useState<Incoming[]>([]);
    const [accepting, setAccepting] = useState<string | null>(null);
    const [active, setActive] = useState<ActiveHelp | null>(null);
    const [notice, setNotice] = useState("");
    const [myPos, setMyPos] = useState<Point | null>(null);

    const socketRef = useRef<Socket | null>(null);
    const activeRef = useRef<ActiveHelp | null>(null);
    // Keep a copy of the latest value that the event handlers can read
    useEffect(() => {
        activeRef.current = active;
    }, [active]);
    const acceptingRef = useRef<string | null>(null);
    const simPos = useRef<Point | null>(null); // the pretend walking position (test mode)

    const removeIncoming = useCallback((alertId: string) => {
        setIncoming((list) => list.filter((x) => x.alertId !== alertId));
    }, []);

    // Load the volunteer's profile from the backend
    const loadProfile = useCallback(async () => {
        try {
            const res = await api.get("/volunteers/me");
            setProfile(res.data.volunteer);
            setRecent(res.data.recentAlerts);
            setLoadError("");
            setLoadState("ready");
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 404) {
                setProfile(null);
                setRecent([]);
                setLoadState("none"); // not registered as a volunteer yet
            } else {
                setLoadError(errorMessage(err));
                setLoadState("error");
            }
        }
    }, []);

    // When a volunteer logs in, load their profile
    const volunteerId = user?.role === "volunteer" ? user._id : null;
    useEffect(() => {
        if (!volunteerId) return;
        loadProfile();
        return () => {
            // When this volunteer logs out (or another one logs in), forget everything
            setProfile(null);
            setRecent([]);
            setIncoming([]);
            setActive(null);
            setMyPos(null);
            setLoadState("loading");
        };
    }, [volunteerId, loadProfile]);

    // Listen to the server (only for verified volunteers)
    useEffect(() => {
        if (!user || user.role !== "volunteer" || profile?.status !== "verified") return;
        const meId = user._id;
        const socket = connectSocket();
        socketRef.current = socket;

        // A new alert arrived
        const onNew = (d: {
            alertId: string;
            label: string;
            distanceMeters: number;
            approxLocation: Point;
        }) => {
            if (activeRef.current && activeRef.current.phase === "active") return; // already helping
            setIncoming((list) =>
                list.some((x) => x.alertId === d.alertId)
                    ? list
                    : [...list, { ...d, receivedAt: Date.now() }]
            );
        };

        // The alert is no longer needed (cancelled, finished, or full)
        const onGone = (d: { alertId: string }) => removeIncoming(d.alertId);
        const onSlots = (d: { alertId: string; slotsLeft: number }) => {
            if (d.slotsLeft <= 0) removeIncoming(d.alertId);
        };

        // We got in
        const onClaimed = (d: {
            alertId: string;
            isLead: boolean;
            user: { name: string };
            location: Point;
        }) => {
            acceptingRef.current = null;
            setAccepting(null);
            setIncoming([]);
            simPos.current = null;
            setMyPos(null);
            const next: ActiveHelp = {
                alertId: d.alertId,
                isLead: d.isLead,
                womanName: d.user.name,
                woman: d.location,
                others: {},
                responders: [],
                myStatus: "accepted",
                phase: "active",
            };
            activeRef.current = next;
            setActive(next);
        };

        // The list of helpers changed
        const onResponders = (d: { alertId: string; responders: Responder[] }) => {
            setActive((a) => {
                if (!a || a.alertId !== d.alertId) return a;
                const mine = d.responders.find((r) => r.volunteerId === meId);
                return {
                    ...a,
                    responders: d.responders,
                    isLead: mine ? mine.isLead : a.isLead,
                    myStatus: mine && mine.status !== "left" ? mine.status : a.myStatus,
                };
            });
        };

        // Live positions from the woman and the other helpers
        const onLocation = (d: {
            alertId: string;
            from: string;
            volunteerId: string | null;
            lat: number;
            lng: number;
        }) => {
            setActive((a) => {
                if (!a || a.alertId !== d.alertId) return a;
                if (d.from === "user") return { ...a, woman: { lat: d.lat, lng: d.lng } };
                if (d.volunteerId && d.volunteerId !== meId) {
                    return { ...a, others: { ...a.others, [d.volunteerId]: { lat: d.lat, lng: d.lng } } };
                }
                return a;
            });
        };

        const onStatus = (d: { alertId: string; status: string }) => {
            setActive((a) => {
                if (!a || a.alertId !== d.alertId) return a;
                if (d.status === "resolved") return { ...a, phase: "resolved" };
                if (d.status === "cancelled") return { ...a, phase: "cancelled" };
                return a;
            });
        };

        const onLeft = () => setActive(null);

        const onError = (d: { message: string }) => {
            if (acceptingRef.current) {
                removeIncoming(acceptingRef.current);
                acceptingRef.current = null;
                setAccepting(null);
            }
            setNotice(d.message);
        };

        socket.on("alert:new", onNew);
        socket.on("alert:cancelled", onGone);
        socket.on("alert:closed", onGone);
        socket.on("alert:slots", onSlots);
        socket.on("alert:claimed", onClaimed);
        socket.on("alert:responders", onResponders);
        socket.on("location:update", onLocation);
        socket.on("alert:status", onStatus);
        socket.on("alert:left", onLeft);
        socket.on("alert:error", onError);

        return () => {
            socket.off("alert:new", onNew);
            socket.off("alert:cancelled", onGone);
            socket.off("alert:closed", onGone);
            socket.off("alert:slots", onSlots);
            socket.off("alert:claimed", onClaimed);
            socket.off("alert:responders", onResponders);
            socket.off("location:update", onLocation);
            socket.off("alert:status", onStatus);
            socket.off("alert:left", onLeft);
            socket.off("alert:error", onError);
            disconnectSocket();
            socketRef.current = null;
        };
    }, [user?._id, user?.role, profile?.status]);

    // While helping: send our position every 3 seconds
    useEffect(() => {
        if (!active || active.phase !== "active") return;
        const alertId = active.alertId;

        async function tick() {
            const a = activeRef.current;
            if (!a || a.phase !== "active") return;
            let pos: Point;
            if (USE_TEST_LOCATION) {
                // DEVELOPMENT ONLY: pretend to walk toward the woman
                if (!simPos.current) {
                    simPos.current = { lat: a.woman.lat + 0.004, lng: a.woman.lng + 0.004 };
                }
                if (a.myStatus === "on_the_way") {
                    simPos.current = {
                        lat: simPos.current.lat + (a.woman.lat - simPos.current.lat) * 0.2,
                        lng: simPos.current.lng + (a.woman.lng - simPos.current.lng) * 0.2,
                    };
                } else if (a.myStatus === "arrived") {
                    simPos.current = { lat: a.woman.lat + 0.00005, lng: a.woman.lng + 0.00005 };
                }
                pos = simPos.current;
            } else {
                try {
                    pos = await getMyPosition();
                } catch {
                    return;
                }
            }
            setMyPos(pos);
            socketRef.current?.emit("location:update", { alertId, ...pos });
        }

        tick();
        const timer = setInterval(tick, 3000);
        return () => clearInterval(timer);
    }, [active?.alertId, active?.phase]);

    // While online and not helping: refresh our position every 20 seconds,
    // so the server knows who is nearby
    useEffect(() => {
        if (!profile || profile.status !== "verified" || !profile.isOnline || active) return;
        const timer = setInterval(async () => {
            try {
                const p = await getMyPosition();
                await api.patch("/volunteers/online", { isOnline: true, lat: p.lat, lng: p.lng });
            } catch {
                // a missed refresh is fine
            }
        }, 20000);
        return () => clearInterval(timer);
    }, [profile?.isOnline, profile?.status, active]);

    // The Online / Offline switch
    const setOnline = useCallback(async (on: boolean) => {
        try {
            const body: { isOnline: boolean; lat?: number; lng?: number } = { isOnline: on };
            if (on) {
                const p = await getMyPosition();
                body.lat = p.lat;
                body.lng = p.lng;
            }
            const res = await api.patch("/volunteers/online", body);
            setProfile(res.data.volunteer);
            if (!on) setIncoming([]);
            return "";
        } catch (err) {
            return messageOf(err);
        }
    }, []);

    // "Accept and go"
    const accept = useCallback((alertId: string) => {
        acceptingRef.current = alertId;
        setAccepting(alertId);
        socketRef.current?.emit("alert:accept", { alertId });
        // If the server does not answer in 8 seconds, give up
        setTimeout(() => {
            if (acceptingRef.current === alertId) {
                acceptingRef.current = null;
                setAccepting(null);
                removeIncoming(alertId);
                setNotice("No answer from the server. Please try again.");
            }
        }, 8000);
    }, []);

    // "Can't help right now"
    const decline = useCallback((alertId: string) => removeIncoming(alertId), []);

    const sendStatus = useCallback((status: "on_the_way" | "arrived" | "resolved") => {
        const a = activeRef.current;
        if (a) socketRef.current?.emit("alert:status", { alertId: a.alertId, status });
    }, []);

    const leaveAlert = useCallback(() => {
        const a = activeRef.current;
        if (a) socketRef.current?.emit("alert:leave", { alertId: a.alertId });
    }, []);

    // Close the help screen after the alert is over
    const closeActive = useCallback(() => {
        simPos.current = null;
        setMyPos(null);
        setActive(null);
        loadProfile(); // refresh the "people helped" count
    }, []);

    const clearNotice = useCallback(() => setNotice(""), []);

    return (
        <VolunteerContext.Provider
            value={{
                loadState,
                loadError,
                profile,
                recent,
                incoming,
                accepting,
                active,
                notice,
                myPos,
                reload: loadProfile,
                setOnline,
                accept,
                decline,
                sendStatus,
                leaveAlert,
                closeActive,
                clearNotice,
            }}
        >
            {children}
        </VolunteerContext.Provider>
    );
}

export function useVolunteer() {
    const ctx = useContext(VolunteerContext);
    if (!ctx) throw new Error("useVolunteer must be used inside VolunteerProvider");
    return ctx;
}