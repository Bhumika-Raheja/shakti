import axios from "axios";
import * as SecureStore from "expo-secure-store";
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from "react";
import { api, setAuthToken } from "../services/api";

export type User = {
    _id: string;
    name: string;
    phone: string;
    role: "user" | "volunteer" | "admin";
};

type AuthState = {
    user: User | null;
    loading: boolean;
    login: (token: string, user: User) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
};

const TOKEN_KEY = "shakti_token";
const AuthContext = createContext<AuthState | null>(null);

// Wraps the whole app, so every screen can ask "who is logged in?"
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // When the app opens: look for a saved token and ask the server who it is
    useEffect(() => {
        (async () => {
            try {
                const saved = await SecureStore.getItemAsync(TOKEN_KEY);
                if (saved) {
                    setAuthToken(saved);
                    const res = await api.get("/auth/me");
                    setUser(res.data.user);
                }
            } catch (err) {
                // Only forget the token if the server says it is no longer valid.
                // If the server is just unreachable, keep it for next time.
                if (axios.isAxiosError(err) && err.response?.status === 401) {
                    await SecureStore.deleteItemAsync(TOKEN_KEY);
                }
                setAuthToken(null);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    async function login(token: string, newUser: User) {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
        setAuthToken(token);
        setUser(newUser);
    }

    async function logout() {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        setAuthToken(null);
        setUser(null);
    }

    // Asks the server for the latest details (for example, after a name change)
    async function refreshUser() {
        try {
            const res = await api.get("/auth/me");
            setUser(res.data.user);
        } catch {
            // keep what we have
        }
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}