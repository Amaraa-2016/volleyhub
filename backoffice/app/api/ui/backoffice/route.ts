import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { API_BASE_URL } from "@/app/utils/backend";

export async function GET(req: NextRequest) { return handleProxy(req); }
export async function POST(req: NextRequest) { return handleProxy(req); }
export async function PUT(req: NextRequest) { return handleProxy(req); }
export async function DELETE(req: NextRequest) { return handleProxy(req); }

// Proxy for the coach's workspace endpoints (/api/vh/backoffice/*). The token comes from the
// session, never from the browser; the backend shows the coach only the rows they own.
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

    if (!token.accountToken) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const method = req.method;
    const body = ["GET", "HEAD"].includes(method) ? undefined : await req.text();

    let backendRes: Response;
    try {
        backendRes = await fetch(backendUrl, {
            method,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token.accountToken}`,
            },
            body,
        });
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
