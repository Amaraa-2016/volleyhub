import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { API_BASE_URL } from "@/app/utils/backend";

export async function GET(req: NextRequest) { return handleProxy(req); }
export async function POST(req: NextRequest) { return handleProxy(req); }
export async function PUT(req: NextRequest) { return handleProxy(req); }
export async function DELETE(req: NextRequest) { return handleProxy(req); }

// Proxy for club-independent endpoints (/api/vh/account/*, /api/vh/platform/*). Sends the
// account-level token and no tenantid header - these endpoints must work before a club is chosen,
// and the platform console is cross-club by design.
//
// Anonymous paths (register, login, club search) are allowed through without a session, so the
// signup screens can use the same helper as the rest of the app.
const ANONYMOUS_PATHS = [
    "/api/vh/account/register",
    "/api/vh/account/login",
    "/api/vh/account/clubs",
];

async function handleProxy(req: NextRequest) {
    const url = new URL(req.url);
    const path = url.searchParams.get("path");
    if (!path) {
        return NextResponse.json({ error: "missing_path" }, { status: 400 });
    }

    const params = new URLSearchParams(url.searchParams);
    params.delete("path");
    const queryString = params.toString();
    const backendUrl = `${API_BASE_URL}${path}${queryString ? `${path.includes("?") ? "&" : "?"}${queryString}` : ""}`;

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const anonymous = ANONYMOUS_PATHS.some((p) => path.startsWith(p));
    if (!token && !anonymous) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const method = req.method;
    const body = ["GET", "HEAD"].includes(method) ? undefined : await req.text();

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token?.accountToken) headers.Authorization = `Bearer ${token.accountToken}`;

    let backendRes: Response;
    try {
        backendRes = await fetch(backendUrl, { method, headers, body });
    } catch {
        // The API is down or API_BASE_URL is wrong - report it as such rather than as an HTML 500.
        return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
    }

    const resBody = await backendRes.text();
    return new NextResponse(resBody, {
        status: backendRes.status,
        headers: { "Content-Type": backendRes.headers.get("content-type") ?? "application/json" },
    });
}
