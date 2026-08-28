import CredentialsProvider from "next-auth/providers/credentials";
import { API_BASE_URL } from "@/app/utils/backend";
import { NextAuthOptions } from "next-auth";
import type { TenantMembership } from "@/app/types/next-auth";

interface SwitchResult {
    tenantid: number;
    tenantname: string;
    role: string;
    token: string;
}

interface AccountLoginResult {
    accountid: number;
    name?: string | null;
    lastname?: string | null;
    firstname?: string | null;
    phone: string;
    token: string;
    tenants: TenantMembership[];
    selected?: SwitchResult | null;
    isplatformadmin?: boolean;
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                phone: { label: "Phone", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                // Global account login - no club involved. The response also carries the clubs this
                // account belongs to, and a per-club token when there is exactly one, so a
                // single-club user never sees a picker.
                const res = await fetch(`${API_BASE_URL}/api/vh/account/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        phone: credentials?.phone,
                        password: credentials?.password,
                    }),
                });

                if (!res.ok) return null;
                const data = (await res.json()) as AccountLoginResult;
                if (!data) return null;

                return {
                    id: String(data.accountid),
                    accountid: data.accountid,
                    name: data.name ?? null,
                    lastname: data.lastname ?? null,
                    firstname: data.firstname ?? null,
                    phone: data.phone,
                    accountToken: data.token,
                    tenants: data.tenants ?? [],
                    // Routing hint only - every platform endpoint re-checks the database.
                    isPlatformAdmin: data.isplatformadmin ?? false,
                    accessToken: data.selected?.token,
                    selectedTenantId: data.selected ? String(data.selected.tenantid) : undefined,
                    selectedTenantName: data.selected?.tenantname,
                    selectedRole: data.selected?.role,
                };
            },
        }),
    ],
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.accountToken = user.accountToken;
                token.accountid = user.accountid;
                token.name = user.name ?? null;
                token.lastname = user.lastname ?? null;
                token.firstname = user.firstname ?? null;
                token.phone = user.phone;
                token.tenants = user.tenants;
                token.isPlatformAdmin = user.isPlatformAdmin;
                token.accessToken = user.accessToken;
                token.selectedTenantId = user.selectedTenantId;
                token.selectedTenantName = user.selectedTenantName;
                token.selectedRole = user.selectedRole;
            }

            // Client-driven updates via useSession().update(...) - selecting or creating a club.
            if (trigger === "update" && session) {
                if (session.selectedTenantId !== undefined) token.selectedTenantId = session.selectedTenantId;
                if (session.selectedTenantName !== undefined) token.selectedTenantName = session.selectedTenantName;
                if (session.selectedRole !== undefined) token.selectedRole = session.selectedRole;
                if (session.accessToken !== undefined) token.accessToken = session.accessToken;
                if (session.tenants !== undefined) token.tenants = session.tenants;
                if (session.isPlatformAdmin !== undefined) token.isPlatformAdmin = session.isPlatformAdmin;
            }

            return token;
        },
        async session({ session, token }) {
            session.accountToken = token.accountToken;
            session.accessToken = token.accessToken;
            session.selectedTenantId = token.selectedTenantId;
            session.selectedTenantName = token.selectedTenantName;
            session.selectedRole = token.selectedRole;
            session.accountid = token.accountid;
            session.name = token.name ?? null;
            session.lastname = token.lastname ?? null;
            session.firstname = token.firstname ?? null;
            session.phone = token.phone;
            session.tenants = token.tenants;
            session.isPlatformAdmin = token.isPlatformAdmin;
            return session;
        },
    },
    session: {
        strategy: "jwt",
        maxAge: 12 * 60 * 60,
    },
    secret: process.env.NEXTAUTH_SECRET,
};
