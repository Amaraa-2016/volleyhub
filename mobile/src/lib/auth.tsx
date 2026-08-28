import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { request } from "./api";
import type { AccountLogin, SwitchResult, TenantMembership } from "./types";

// Everything the app needs to talk to the backend, persisted so a restart does not force a login.
interface Session {
    accountToken: string;
    accountid: number;
    phone: string;
    name?: string | null;
    tenants: TenantMembership[];
    // The selected club: its token and id travel together on every per-club request.
    clubToken?: string;
    tenantid?: number;
    tenantname?: string;
    role?: string;
}

interface AuthValue {
    session?: Session;
    loading: boolean;
    login: (phone: string, password: string) => Promise<string | undefined>;
    register: (values: { phone: string; password: string; lastname?: string; firstname?: string }) => Promise<string | undefined>;
    selectClub: (tenantid: number) => Promise<string | undefined>;
    refreshMemberships: () => Promise<void>;
    logout: () => Promise<void>;
    // Per-club GET helper: injects the club token and tenant id, so screens never touch them.
    clubGet: <T>(path: string) => Promise<T | undefined>;
    accountPost: <T>(path: string, body?: unknown) => Promise<{ data?: T; error?: string }>;
}

const STORAGE_KEY = "volleyhub.session";

// SecureStore has no web implementation; localStorage is the honest equivalent there.
const store = {
    async get(): Promise<string | null> {
        if (Platform.OS === "web") return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
        return SecureStore.getItemAsync(STORAGE_KEY);
    },
    async set(value: string): Promise<void> {
        if (Platform.OS === "web") { globalThis.localStorage?.setItem(STORAGE_KEY, value); return; }
        await SecureStore.setItemAsync(STORAGE_KEY, value);
    },
    async clear(): Promise<void> {
        if (Platform.OS === "web") { globalThis.localStorage?.removeItem(STORAGE_KEY); return; }
        await SecureStore.deleteItemAsync(STORAGE_KEY);
    },
};

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session>();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        store.get()
            .then((raw) => { if (raw) setSession(JSON.parse(raw) as Session); })
            .catch(() => { /* corrupt or unreadable store - start logged out */ })
            .finally(() => setLoading(false));
    }, []);

    const persist = useCallback(async (next?: Session) => {
        setSession(next);
        if (next) await store.set(JSON.stringify(next));
        else await store.clear();
    }, []);

    const fromLogin = useCallback((data: AccountLogin): Session => ({
        accountToken: data.token,
        accountid: data.accountid,
        phone: data.phone,
        name: data.name,
        tenants: data.tenants ?? [],
        clubToken: data.selected?.token,
        tenantid: data.selected?.tenantid,
        tenantname: data.selected?.tenantname,
        role: data.selected?.role,
    }), []);

    const login = useCallback(async (phone: string, password: string) => {
        const res = await request<AccountLogin>("/api/vh/account/login", { body: { phone, password } });
        if (res.error || !res.data) return res.error ?? "server_error";
        await persist(fromLogin(res.data));
        return undefined;
    }, [fromLogin, persist]);

    const register = useCallback(async (values: { phone: string; password: string; lastname?: string; firstname?: string }) => {
        const res = await request<AccountLogin>("/api/vh/account/register", { body: values });
        if (res.error || !res.data) return res.error ?? "server_error";
        await persist(fromLogin(res.data));
        return undefined;
    }, [fromLogin, persist]);

    const selectClub = useCallback(async (tenantid: number) => {
        if (!session) return "account_not_found";
        const res = await request<SwitchResult>("/api/vh/account/switch", {
            body: { tenantid },
            token: session.accountToken,
        });
        if (res.error || !res.data) return res.error ?? "server_error";

        await persist({
            ...session,
            clubToken: res.data.token,
            tenantid: res.data.tenantid,
            tenantname: res.data.tenantname,
            role: res.data.role,
        });
        return undefined;
    }, [persist, session]);

    // Pull the membership list again - a pending join request that has since been approved only
    // shows up here.
    const refreshMemberships = useCallback(async () => {
        if (!session) return;
        const res = await request<TenantMembership[]>("/api/vh/account/tenants", { token: session.accountToken });
        if (res.data) await persist({ ...session, tenants: res.data });
    }, [persist, session]);

    const logout = useCallback(() => persist(undefined), [persist]);

    const clubGet = useCallback(async <T,>(path: string): Promise<T | undefined> => {
        if (!session?.clubToken || !session.tenantid) return undefined;
        const res = await request<T>(path, { token: session.clubToken, tenantId: session.tenantid });
        return res.data;
    }, [session]);

    const accountPost = useCallback(async <T,>(path: string, body?: unknown) => {
        const res = await request<T>(path, { body, token: session?.accountToken });
        return { data: res.data, error: res.error };
    }, [session]);

    const value = useMemo<AuthValue>(() => ({
        session, loading, login, register, selectClub, refreshMemberships, logout, clubGet, accountPost,
    }), [session, loading, login, register, selectClub, refreshMemberships, logout, clubGet, accountPost]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
    const value = useContext(AuthContext);
    if (!value) throw new Error("useAuth must be used inside AuthProvider");
    return value;
}
