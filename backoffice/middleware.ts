import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that never require a session or a selected club.
const PUBLIC_PREFIXES = [
    "/login",
    "/register",
    "/_next/",
    "/favicon.ico",
    "/api/auth",
    "/api/ui/account",
];

// Where a logged-in user with no club lands: pick one, apply to register one, or wait for approval.
const CLUB_SELECT_PATH = "/club";

// The platform console is cross-club, so it has to stay reachable with nothing selected.
const ADMIN_PREFIX = "/admin";

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
        const loginUrl = req.nextUrl.clone();
        loginUrl.pathname = "/login";
        loginUrl.search = "";
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // The console is club-independent and a platform admin usually runs no club of their own, so
    // this has to come before the redirect below - which would otherwise bounce them to /club.
    if (pathname.startsWith(ADMIN_PREFIX)) {
        if (!token.isPlatformAdmin) {
            const url = req.nextUrl.clone();
            url.pathname = token.selectedTenantId ? "/dashboard" : CLUB_SELECT_PATH;
            url.search = "";
            return NextResponse.redirect(url);
        }
        return NextResponse.next();
    }

    // Logged in but no active club yet. /club stays exempt so an admin can still go there.
    if (!token.selectedTenantId && pathname !== CLUB_SELECT_PATH) {
        const url = req.nextUrl.clone();
        url.pathname = token.isPlatformAdmin ? ADMIN_PREFIX : CLUB_SELECT_PATH;
        url.search = "";
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
