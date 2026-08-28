// Client helpers for the two backend surfaces. Both route through a server-side proxy that injects
// the right token, so no token ever reaches the browser.
type APIOptions = RequestInit & {
    data?: object;
};

export interface APIResult<T> {
    data?: T;
    error?: string;
    status: number;
}

const request = async <T = object,>(route: string, path: string, options: APIOptions = {}): Promise<APIResult<T>> => {
    const { data, ...fetchOptions } = options;

    if (data !== undefined) {
        fetchOptions.body = JSON.stringify(data);
        fetchOptions.method = fetchOptions.method || "POST";
    }

    const response = await fetch(`${route}?path=${encodeURIComponent(path)}`, {
        ...fetchOptions,
        headers: { "Content-Type": "application/json", ...fetchOptions.headers },
    });

    const text = await response.text();

    if (!response.ok) {
        let error = "server_error";
        try { error = (JSON.parse(text) as { error?: string }).error ?? error; } catch { /* non-JSON body */ }
        return { error, status: response.status };
    }

    if (!text) return { data: undefined, status: response.status };
    try {
        return { data: JSON.parse(text) as T, status: response.status };
    } catch {
        // A 2xx that is not JSON means something in front of the backend answered (a restart, a
        // proxy error page) - treat it as a failure rather than handing garbage to the caller.
        return { error: "server_error", status: response.status };
    }
};

// Per-club endpoints (/api/vh/backoffice/*).
export const API = async <T = object,>(path: string, options: APIOptions = {}): Promise<T | undefined> =>
    (await request<T>("/api/ui/backoffice", path, options)).data;

export const APIWithError = <T = object,>(path: string, options: APIOptions = {}): Promise<APIResult<T>> =>
    request<T>("/api/ui/backoffice", path, options);

// Club-independent endpoints (/api/vh/account/*, /api/vh/platform/*).
export const AccountAPI = async <T = object,>(path: string, options: APIOptions = {}): Promise<T | undefined> =>
    (await request<T>("/api/ui/account", path, options)).data;

export const AccountAPIWithError = <T = object,>(path: string, options: APIOptions = {}): Promise<APIResult<T>> =>
    request<T>("/api/ui/account", path, options);

// Backend error codes are stable identifiers, not sentences. Everything the UI can currently
// provoke is listed here; anything else falls back to a generic message.
const ERRORS: Record<string, string> = {
    invalid_credentials: "Утасны дугаар эсвэл нууц үг буруу байна",
    phone_taken: "Энэ дугаараар бүртгэл үүссэн байна",
    password_too_short: "Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой",
    wrong_password: "Одоогийн нууц үг буруу байна",
    tenant_name_taken: "Ийм нэртэй клуб бүртгэлтэй байна",
    request_already_pending: "Танд хүлээгдэж буй хүсэлт байна",
    not_a_member: "Та энэ клубын гишүүн биш байна",
    admin_only: "Зөвхөн админ хийх боломжтой үйлдэл",
    staff_only: "Зөвхөн ажилтан хийх боломжтой үйлдэл",
    no_club_selected: "Клуб сонгоно уу",
    name_required: "Нэр оруулна уу",
    title_required: "Гарчиг оруулна уу",
    first_name_required: "Нэр оруулна уу",
    teams_must_differ: "Нэг баг өөртэйгөө тоглох боломжгүй",
    jersey_taken: "Энэ дугаар аль хэдийн эзэмшигдсэн байна",
    team_has_matches: "Тоглолт бүртгэгдсэн тул хасах боломжгүй",
    tournament_has_results: "Үр дүн бүртгэгдсэн тэмцээнийг устгах боломжгүй",
    fixtures_already_exist: "Хуваарь аль хэдийн үүссэн байна",
    need_at_least_two_teams: "Дор хаяж хоёр баг бүртгүүлсэн байх шаардлагатай",
    venue_in_use: "Тоглолт бүртгэгдсэн тул устгах боломжгүй",
    season_in_use: "Тэмцээн бүртгэгдсэн тул устгах боломжгүй",
    match_incomplete: "Тоглолт дуусаагүй байна - ялагч тодрох ёстой",
    both_teams_cannot_win: "Хоёр баг зэрэг ялж болохгүй",
    set_cannot_be_drawn: "Сет тэнцэж дуусах боломжгүй",
    negative_points: "Оноо сөрөг байж болохгүй",
    too_many_sets: "Сетийн тоо хэтэрсэн байна",
    cannot_change_owner: "Эзэмшигчийн эрхийг өөрчлөх боломжгүй",
    cannot_remove_owner: "Эзэмшигчийг хасах боломжгүй",
};

export const errorText = (code?: string): string => {
    if (!code) return "Алдаа гарлаа";
    if (ERRORS[code]) return ERRORS[code];
    // Set validation codes carry the set number, e.g. set_3_margin_below_2.
    const set = /^set_(\d+)_(.+)$/.exec(code);
    if (set) return `${set[1]}-р сетийн оноо буруу байна`;
    return "Алдаа гарлаа";
};
