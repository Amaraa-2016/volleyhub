import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { API_BASE_URL } from "@/app/utils/backend";

export async function GET(req: NextRequest) { return handleProxy(req); }
export async function POST(req: NextRequest) { return handleProxy(req); }
export async function PUT(req: NextRequest) { return handleProxy(req); }
export async function DELETE(req: NextRequest) { return handleProxy(req); }

// Proxy for per-club endpoints (/api/vh/backoffice/*). The club comes from the user's session, not
// from a subdomain or anything the browser can set. The per-club token and the tenantid header must
// agree, or the backend membership check rejects the call - so both are read from the same session.
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
    if (!token) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const tenantId = token.selectedTenantId ?? "";
    if (!tenantId || !token.accessToken) {
        return NextResponse.json({ error: "no_club_selected" }, { status: 409 });
    }

    const method = req.method;
    const body = ["GET", "HEAD"].includes(method) ? undefined : await req.text();

    const backendRes = await fetch(backendUrl, {
        method,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token.accessToken}`,
            tenantid: tenantId,
        },
        body,
    });

    const resBody = await backendRes.text();
    return new NextResponse(resBody, {
        status: backendRes.status,
        headers: { "Content-Type": backendRes.headers.get("content-type") ?? "application/json" },
    });
}
