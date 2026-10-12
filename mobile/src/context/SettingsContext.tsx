import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { isDemoLocation, loadDemoLocation, saveDemoLocation } from "../services/settings";

type SettingsState = {
    demoLocation: boolean;
    setDemoLocation: (on: boolean) => void;
};

const SettingsContext = createContext<SettingsState | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [demoLocation, setDemo] = useState<boolean>(() => isDemoLocation());

    // When the app opens, load the saved choice
    useEffect(() => {
        let cancelled = false;
        loadDemoLocation().then((value) => {
            if (!cancelled) setDemo(value);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const setDemoLocation = useCallback((on: boolean) => {
        setDemo(on);
        saveDemoLocation(on).catch(() => { });
    }, []);

    return (
        <SettingsContext.Provider value={{ demoLocation, setDemoLocation }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
    return ctx;
}