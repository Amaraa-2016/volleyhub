import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// The public site is the default: the home page, the training directory, news and the shop are all
// reachable with no account. Only /manage/* (a training centre's own console) and /admin (the
// platform console) require a session.
const PUBLIC_PREFIXES = [
    "/_next/",
    "/favicon.ico",
    "/api/auth",
    "/api/ui/account",
    "/api/ui/public",
    "/login",
    "/register",
    "/trainings",
    "/news",
    "/shop",
];

// Where a logged-in user with no centre selected lands: pick one, or apply to register one.
const CLUB_SELECT_PATH = "/club";
const MANAGE_PREFIX = "/manage";
const ADMIN_PREFIX = "/admin";

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // The home page is public, but "/" must not match every path below it.
    if (pathname === "/" || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    const needsSession = pathname.startsWith(MANAGE_PREFIX)
        || pathname.startsWith(ADMIN_PREFIX)
        || pathname.startsWith(CLUB_SELECT_PATH);
    if (!needsSession) return NextResponse.next();

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
        const loginUrl = req.nextUrl.clone();
        loginUrl.pathname = "/login";
        loginUrl.search = "";
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // The platform console is centre-independent, and a platform admin usually runs no training
    // centre of their own - so this has to come before the redirect below, which would otherwise
    // bounce them to /club on every visit.
    if (pathname.startsWith(ADMIN_PREFIX)) {
        if (!token.isPlatformAdmin) {
            const url = req.nextUrl.clone();
            url.pathname = token.selectedTenantId ? "/manage/dashboard" : CLUB_SELECT_PATH;
            url.search = "";
            return NextResponse.redirect(url);
        }
        return NextResponse.next();
    }

    // Logged in but no centre selected yet. /club stays exempt so it can do the selecting.
    if (pathname.startsWith(MANAGE_PREFIX) && !token.selectedTenantId) {
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
