import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { API_BASE_URL } from "@/app/utils/backend";

// Image upload proxy. Separate from the JSON proxies because multipart has to be forwarded
// byte-for-byte: the body is read as bytes and the original Content-Type is passed through, since
// it carries the boundary that makes the parts parseable on the other side.
//
// `scope` picks which token goes with it, and therefore which upload endpoint is allowed:
//   training  -> the per-centre token, for that centre's own gallery
//   platform  -> the account token, for news covers and product photos
export async function POST(req: NextRequest) {
    const url = new URL(req.url);
    const scope = url.searchParams.get("scope") ?? "training";
    const folder = url.searchParams.get("folder");

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const headers: Record<string, string> = {};
    const contentType = req.headers.get("content-type");
    if (contentType) headers["Content-Type"] = contentType;

    let target: string;
    if (scope === "platform") {
        if (!token.accountToken) {
            return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }
        headers.Authorization = `Bearer ${token.accountToken}`;
        target = `${API_BASE_URL}/api/vh/media/platform${folder ? `?folder=${encodeURIComponent(folder)}` : ""}`;
    } else {
        if (!token.accessToken || !token.selectedTenantId) {
            return NextResponse.json({ error: "no_club_selected" }, { status: 409 });
        }
        headers.Authorization = `Bearer ${token.accessToken}`;
        headers.tenantid = token.selectedTenantId;
        target = `${API_BASE_URL}/api/vh/media/training`;
    }

    const body = await req.arrayBuffer();

    let backendRes: Response;
    try {
        backendRes = await fetch(target, { method: "POST", headers, body });
    } catch {
        // The API is down or API_BASE_URL is wrong. Without this the route throws and Next answers
        // with an HTML 500, which the client can only report as a generic failure.
        return NextResponse.json({ error: "backend_unreachable" }, { status: 502 });
    }

    const resBody = await backendRes.text();
    return new NextResponse(resBody, {
        status: backendRes.status,
        headers: { "Content-Type": backendRes.headers.get("content-type") ?? "application/json" },
    });
}
