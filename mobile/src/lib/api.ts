import Constants from "expo-constants";
import { Platform } from "react-native";

// Where the backend lives. EXPO_PUBLIC_API_URL wins; otherwise fall back to the machine hosting
// the packager, so a phone on the same wifi reaches the dev backend without any configuration.
// (An Android emulator cannot see the host as "localhost", hence 10.0.2.2.)
function defaultBaseUrl(): string {
    const host = Constants.expoConfig?.hostUri?.split(":")[0];
    if (host) return `http://${host}:5090`;
    return Platform.OS === "android" ? "http://10.0.2.2:5090" : "http://localhost:5090";
}

// An unset GitHub secret arrives as an empty string, not as undefined, so `??` alone would bake an
// empty base URL into the web build and every request would silently go nowhere.
const configuredBaseUrl = (process.env.EXPO_PUBLIC_API_URL ?? "").trim();

export const BASE_URL = configuredBaseUrl.length > 0 ? configuredBaseUrl : defaultBaseUrl();

export interface ApiResult<T> {
    data?: T;
    error?: string;
    status: number;
}

interface RequestOptions {
    method?: string;
    body?: unknown;
    // Account-level token (no club) or the per-club token plus its tenant id. The two must agree:
    // the backend re-checks membership against the token, so sending a mismatched pair is a 403.
    token?: string;
    tenantId?: number;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (options.token) headers.Authorization = `Bearer ${options.token}`;
    if (options.tenantId) headers.tenantid = String(options.tenantId);

    let response: Response;
    try {
        response = await fetch(`${BASE_URL}${path}`, {
            method: options.method ?? (options.body ? "POST" : "GET"),
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
        });
    } catch {
        // No connection, wrong host, backend down - all the same to the caller.
        return { error: "network_error", status: 0 };
    }

    const text = await response.text();

    if (!response.ok) {
        let error = "server_error";
        try { error = (JSON.parse(text) as { error?: string }).error ?? error; } catch { /* non-JSON */ }
        return { error, status: response.status };
    }

    if (!text) return { status: response.status };
    try {
        return { data: JSON.parse(text) as T, status: response.status };
    } catch {
        return { error: "server_error", status: response.status };
    }
}

// Backend error codes are stable identifiers, not sentences.
const ERRORS: Record<string, string> = {
    network_error: "Сервертэй холбогдож чадсангүй",
    invalid_credentials: "Утасны дугаар эсвэл нууц үг буруу байна",
    phone_taken: "Энэ дугаараар бүртгэл үүссэн байна",
    password_too_short: "Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой",
    wrong_password: "Одоогийн нууц үг буруу байна",
    not_a_member: "Та энэ клубын гишүүн биш байна",
    membership_pending: "Таны хүсэлт хараахан батлагдаагүй байна",
    invalid_tenant: "Клуб олдсонгүй",
    account_not_found: "Бүртгэл олдсонгүй",
};

export const errorText = (code?: string): string => (code && ERRORS[code]) || "Алдаа гарлаа";
