import CredentialsProvider from "next-auth/providers/credentials";
import { API_BASE_URL } from "@/app/utils/backend";
import { NextAuthOptions } from "next-auth";
interface AccountLoginResult {
    accountid: number;
    name?: string | null;
    lastname?: string | null;
    photo?: string | null;
    firstname?: string | null;
    phone: string;
    training_name: string;
    token: string;
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
                // Account login. One token covers everything: the backend keeps every coach's data
                // in one schema and shows each coach only their own rows (by accountid).
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
                    photo: data.photo ?? null,
                    firstname: data.firstname ?? null,
                    phone: data.phone,
                    accountToken: data.token,
                    trainingName: data.training_name,
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
                token.photo = user.photo ?? null;
                token.firstname = user.firstname ?? null;
                token.phone = user.phone;
                token.trainingName = user.trainingName;
            }

            // Client-driven updates via useSession().update(...) - the profile page renaming the coach.
            if (trigger === "update" && session) {
                if (session.trainingName !== undefined) token.trainingName = session.trainingName;
                // The profile page updates these without a re-login.
                if (session.photo !== undefined) token.photo = session.photo;
                if (session.name !== undefined) token.name = session.name;
                if (session.lastname !== undefined) token.lastname = session.lastname;
                if (session.firstname !== undefined) token.firstname = session.firstname;
            }

            return token;
        },
        async session({ session, token }) {
            session.accountToken = token.accountToken;
            session.trainingName = token.trainingName;
            session.accountid = token.accountid;
            session.name = token.name ?? null;
            session.lastname = token.lastname ?? null;
            session.photo = token.photo ?? null;
            session.firstname = token.firstname ?? null;
            session.phone = token.phone;
            return session;
        },
    },
    session: {
        strategy: "jwt",
        // A coach opens this on their phone at the gym; logging in every 12 hours is a chore. The
        // backend token lives 7 days, so the session must not outlive it.
        maxAge: 7 * 24 * 60 * 60,
    },
    secret: process.env.NEXTAUTH_SECRET,
};
