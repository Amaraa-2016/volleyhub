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

// The public site (/api/vh/public/*) - no session needed.
export const PublicAPI = async <T = object,>(path: string, options: APIOptions = {}): Promise<T | undefined> =>
    (await request<T>("/api/ui/public", path, options)).data;

export const PublicAPIWithError = <T = object,>(path: string, options: APIOptions = {}): Promise<APIResult<T>> =>
    request<T>("/api/ui/public", path, options);

// Backend error codes are stable identifiers, not sentences. Everything the UI can currently
// provoke is listed here; anything else falls back to a generic message.
const ERRORS: Record<string, string> = {
    // auth
    invalid_credentials: "Утасны дугаар эсвэл нууц үг буруу байна",
    phone_taken: "Энэ дугаараар бүртгэл үүссэн байна",
    password_too_short: "Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой",
    wrong_password: "Одоогийн нууц үг буруу байна",
    not_a_member: "Та энэ сургалтын гишүүн биш байна",
    admin_only: "Зөвхөн админ хийх боломжтой үйлдэл",
    staff_only: "Зөвхөн ажилтан хийх боломжтой үйлдэл",
    not_platform_admin: "Зөвхөн платформын админ хийх боломжтой үйлдэл",
    no_club_selected: "Сургалт сонгоно уу",
    // registration
    tenant_name_taken: "Ийм нэртэй сургалт бүртгэлтэй байна",
    request_already_pending: "Танд хүлээгдэж буй хүсэлт байна",
    request_already_reviewed: "Энэ хүсэлт аль хэдийн шийдэгдсэн байна",
    // common
    name_required: "Нэр оруулна уу",
    title_required: "Гарчиг оруулна уу",
    first_name_required: "Нэр оруулна уу",
    phone_required: "Утасны дугаар оруулна уу",
    cannot_change_owner: "Эзэмшигчийн эрхийг өөрчлөх боломжгүй",
    cannot_remove_owner: "Эзэмшигчийг хасах боломжгүй",
    // groups and students
    group_full: "Сургалт дүүрсэн байна",
    group_not_found: "Сургалт олдсонгүй",
    coach_not_found: "Багш олдсонгүй",
    student_not_found: "Суралцагч олдсонгүй",
    student_has_unpaid_fees: "Төлөгдөөгүй төлбөртэй тул устгах боломжгүй",
    fee_cannot_be_negative: "Төлбөр сөрөг байж болохгүй",
    // schedule
    weekday_out_of_range: "Гараг буруу байна",
    end_before_start: "Дуусах цаг нь эхлэх цагаас хойш байх ёстой",
    venue_busy: "Тухайн цагт заал завгүй байна",
    no_schedule: "Эхлээд долоо хоногийн хуваарь үүсгэнэ үү",
    to_before_from: "Дуусах огноо нь эхлэх огнооноос хойш байх ёстой",
    range_too_long: "Хугацааны зай хэт урт байна",
    attendance_already_taken: "Ирц бүртгэгдсэн тул устгах боломжгүй",
    session_cancelled: "Цуцлагдсан хичээлд ирц бүртгэх боломжгүй",
    venue_in_use: "Хичээл бүртгэгдсэн тул устгах боломжгүй",
    // billing
    period_must_be_yyyy_mm: "Сарыг YYYY-MM хэлбэрээр оруулна уу",
    fee_already_exists: "Тухайн сарын төлбөр аль хэдийн үүссэн байна",
    fee_has_payments: "Төлөлт бүртгэгдсэн тул устгах боломжгүй",
    fee_is_waived: "Чөлөөлсөн төлбөр дээр төлөлт бүртгэх боломжгүй",
    payment_exceeds_fee: "Төлөлт нь төлбөрийн дүнгээс хэтэрсэн байна",
    amount_must_be_positive: "Дүн 0-ээс их байх ёстой",
    no_enrolled_students: "Бүртгэлтэй суралцагч алга",
    // shop
    no_items: "Бараа сонгоно уу",
    product_unavailable: "Сонгосон бараа боломжгүй байна",
    product_not_found: "Бараа олдсонгүй",
    news_not_found: "Мэдээ олдсонгүй",
    training_not_found: "Сургалт олдсонгүй",
    // upload
    backend_unreachable: "Сервертэй холбогдож чадсангүй",
    storage_not_configured: "Зургийн сан тохируулагдаагүй байна",
    storage_unreachable: "Зургийн сан (MinIO) руу холбогдож чадсангүй",
    storage_upload_failed: "Зураг хадгалахад алдаа гарлаа",
    file_required: "Файл сонгоно уу",
    file_too_large: "Зургийн хэмжээ 5MB-аас хэтэрсэн байна",
    unsupported_file_type: "Зөвхөн зураг (jpg, png, webp, gif) оруулах боломжтой",
};

export const errorText = (code?: string): string => {
    if (!code) return "Алдаа гарлаа";
    // Storage failures carry the S3 error code after a pipe (storage_upload_failed|NoSuchBucket).
    // Showing it saves a trip to the pod logs for the one class of error whose cause is not
    // guessable from the message alone.
    const [base, detail] = code.split("|");
    const text = ERRORS[base] ?? "Алдаа гарлаа";
    return detail ? `${text} (${detail})` : text;
};
