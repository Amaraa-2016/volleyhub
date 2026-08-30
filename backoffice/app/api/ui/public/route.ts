import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/app/utils/backend";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) { return handleProxy(req); }
export async function POST(req: NextRequest) { return handleProxy(req); }

// Proxy for the public site (/api/vh/public/*). No session is required and no tenantid is sent -
// these endpoints exist precisely so a visitor with no account can browse trainings, news and the
// shop.
//
// The path is checked against the public prefix rather than passed through: without that, this
// unauthenticated route would happily forward a request to any endpoint in the API.
const PUBLIC_PREFIX = "/api/vh/public/";

async function handleProxy(req: NextRequest) {
    const url = new URL(req.url);
    const path = url.searchParams.get("path");
    if (!path) {
        return NextResponse.json({ error: "missing_path" }, { status: 400 });
    }
    if (!path.startsWith(PUBLIC_PREFIX)) {
        return NextResponse.json({ error: "forbidden_path" }, { status: 403 });
    }

    const params = new URLSearchParams(url.searchParams);
    params.delete("path");
    const queryString = params.toString();
    const backendUrl = `${API_BASE_URL}${path}${queryString ? `${path.includes("?") ? "&" : "?"}${queryString}` : ""}`;

    const method = req.method;
    const body = method === "GET" ? undefined : await req.text();

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    // A visitor who happens to be logged in gets their order tied to their account; everyone else
    // is served the same way, anonymously.
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token?.accountToken) headers.Authorization = `Bearer ${token.accountToken}`;

    const backendRes = await fetch(backendUrl, { method, headers, body });

    const resBody = await backendRes.text();
    return new NextResponse(resBody, {
        status: backendRes.status,
        headers: { "Content-Type": backendRes.headers.get("content-type") ?? "application/json" },
    });
}
