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

    let response: Response;
    try {
        response = await fetch(`${route}?path=${encodeURIComponent(path)}`, {
            ...fetchOptions,
            headers: { "Content-Type": "application/json", ...fetchOptions.headers },
        });
    } catch {
        // The phone lost its connection in the gym - say so rather than throwing into a component.
        return { error: "offline", status: 0 };
    }

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

// The coach's workspace (/api/vh/backoffice/*).
export const API = <T = object,>(path: string, options: APIOptions = {}): Promise<APIResult<T>> =>
    request<T>("/api/ui/backoffice", path, options);

// Workspace-independent endpoints (/api/vh/account/*).
export const AccountAPI = <T = object,>(path: string, options: APIOptions = {}): Promise<APIResult<T>> =>
    request<T>("/api/ui/account", path, options);

// Backend error codes are stable identifiers, not sentences. Everything the UI can currently
// provoke is listed here; anything else falls back to a generic message.
const ERRORS: Record<string, string> = {
    offline: "Интернэт холболт алга байна",
    backend_unreachable: "Сервертэй холбогдож чадсангүй",
    server_error: "Алдаа гарлаа. Дахин оролдоно уу",
    unauthorized: "Дахин нэвтэрнэ үү",
    no_club_selected: "Дахин нэвтэрнэ үү",
    // auth
    invalid_credentials: "Утасны дугаар эсвэл нууц үг буруу байна",
    phone_taken: "Энэ дугаараар бүртгэл үүссэн байна",
    phone_required: "Утасны дугаар оруулна уу",
    password_too_short: "Нууц үг хамгийн багадаа 6 тэмдэгт байна",
    wrong_password: "Одоогийн нууц үг буруу байна",
    staff_only: "Энэ үйлдлийг хийх эрхгүй байна",
    // common
    name_required: "Нэр оруулна уу",
    first_name_required: "Нэр оруулна уу",
    // groups and children
    group_full: "Анги дүүрсэн байна",
    group_not_found: "Анги олдсонгүй",
    student_not_found: "Хүүхэд олдсонгүй",
    student_has_unpaid_fees: "Төлөөгүй төлбөртэй тул устгах боломжгүй",
    fee_cannot_be_negative: "Төлбөр сөрөг байж болохгүй",
    enrollment_not_found: "Энэ хүүхэд ангид байхгүй байна",
    // schedule
    weekday_out_of_range: "Гараг буруу байна",
    end_before_start: "Дуусах цаг эхлэх цагаас хойш байх ёстой",
    venue_busy: "Тэр цагт заал завгүй байна",
    no_schedule: "Эхлээд ангийн долоо хоногийн хуваарийг оруулна уу",
    to_before_from: "Дуусах огноо эхлэх огнооноос хойш байх ёстой",
    range_too_long: "Хугацаа хэт урт байна",
    attendance_already_taken: "Ирц бүртгэгдсэн тул устгах боломжгүй",
    session_cancelled: "Цуцлагдсан хичээлд ирц бүртгэх боломжгүй",
    no_records: "Ангид хүүхэд алга байна",
    // fees
    period_must_be_yyyy_mm: "Сар буруу байна",
    fee_already_exists: "Энэ сарын төлбөр аль хэдийн үүссэн байна",
    fee_has_payments: "Төлөлт бүртгэгдсэн тул устгах боломжгүй",
    fee_is_waived: "Чөлөөлсөн төлбөр дээр төлөлт бүртгэх боломжгүй",
    fee_already_paid: "Энэ төлбөр аль хэдийн төлөгдсөн байна",
    payment_exceeds_fee: "Дүн төлбөрөөс их байна",
    amount_must_be_positive: "Дүн 0-ээс их байх ёстой",
    no_enrolled_students: "Ангид бүртгэлтэй хүүхэд алга",
    // registration and children
    training_name_required: "Сургалтын нэрийг оруулна уу",
    last_name_required: "Овог оруулна уу",
    left_date_required: "Гарсан огноог заавал оруулна уу",
    left_before_start: "Гарсан огноо эхэлсэн огнооноос өмнө байж болохгүй",
    birth_year_out_of_range: "Төрсөн он буруу байна",
    status_out_of_range: "Төлөв буруу байна",
    note_required: "Тэмдэглэл хоосон байна",
    note_not_found: "Тэмдэглэл олдсонгүй",
    // invoices
    nothing_to_notify: "Нэхэмжлэх илгээх төлөөгүй төлбөр алга",
    // progress
    no_scores: "Дор хаяж нэг ур чадварыг үнэлнэ үү",
    score_out_of_range: "Үнэлгээ 1-5 байна",
};

export const errorText = (code?: string): string => (code && ERRORS[code]) || "Алдаа гарлаа";
