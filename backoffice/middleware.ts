import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Everything is behind a login except the two auth screens and what they need. There is no public
// site: children and parents never open this app, only the coach does.
const PUBLIC_PREFIXES = [
    "/_next/",
    "/favicon.ico",
    "/icon",
    "/favicon.png",
    "/apple-touch-icon.png",
    "/brand/",
    "/manifest.webmanifest",
    "/api/auth",
    "/api/ui/account",
    "/login",
    "/register",
];

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    // No session, or one from before the workspace existed (the old platform's login could leave
    // a session with no workspace selected): log in again, which selects it.
    if (!token || !token.selectedTenantId) {
        if (pathname.startsWith("/api/")) {
            return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }
        const loginUrl = req.nextUrl.clone();
        loginUrl.pathname = "/login";
        loginUrl.search = "";
        if (pathname !== "/") loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
