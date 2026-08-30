// Mirrors the backend DTOs the mobile app consumes. Field names match the JSON exactly.

export interface TenantMembership {
    tenantid: number;
    tenantname: string;
    role: string;
    status: string;
    staffid: number;
    logo?: string | null;
}

export interface SwitchResult {
    tenantid: number;
    tenantname: string;
    role: string;
    staffid: number;
    token: string;
    expirydate: string;
}

export interface AccountLogin {
    accountid: number;
    phone: string;
    name?: string | null;
    lastname?: string | null;
    firstname?: string | null;
    token: string;
    expirydate: string;
    isplatformadmin: boolean;
    tenants: TenantMembership[];
    selected?: SwitchResult | null;
}

// The training centre the student attends.
export interface Training {
    tenantid: number;
    tenantname: string;
    tagline?: string | null;
    address?: string | null;
    contactphone?: string | null;
    logo?: string | null;
    cover?: string | null;
}

export interface Session {
    sessionid: number;
    groupid: number;
    groupname: string;
    venueid?: number | null;
    venuename?: string | null;
    coachname?: string | null;
    session_date: string;
    start_minute: number;
    end_minute: number;
    status: number;
    attendance_taken: boolean;
    notes?: string | null;
    present_count: number;
    student_count: number;
}

export interface StudentCard {
    studentid: number;
    accountid: number;
    last_name: string;
    first_name: string;
    date_of_birth?: string | null;
    phone?: string | null;
    height_cm?: number | null;
    status: number;
    groupid?: number | null;
    groupname?: string | null;
    fee_amount?: number | null;
    balance: number;
}

export interface MyProfile {
    role: string;
    student?: StudentCard | null;
    next_sessions: Session[];
}

export interface AttendanceHistory {
    sessionid: number;
    session_date: string;
    groupname: string;
    status: number;
    note?: string | null;
}

export interface AttendanceSummary {
    total: number;
    present: number;
    absent: number;
    excused: number;
    late: number;
    rate: number;
    history: AttendanceHistory[];
}

export interface Payment {
    paymentid: number;
    feeid: number;
    amount: number;
    method: number;
    paid_at: string;
    note?: string | null;
}

export interface Fee {
    feeid: number;
    groupname: string;
    period: string;
    amount: number;
    paid_amount: number;
    balance: number;
    due_date?: string | null;
    status: number;
    note?: string | null;
    payments: Payment[];
}

export interface FeesResponse {
    balance: number;
    fees: Fee[];
}

export interface Announcement {
    announcementid: number;
    title: string;
    body?: string | null;
    cover?: string | null;
    authorname?: string | null;
    published_at?: string | null;
    created: string;
}

export interface News {
    newsid: number;
    title: string;
    summary?: string | null;
    body?: string | null;
    cover?: string | null;
    category: number;
    published_at?: string | null;
}

// ---- labels ---------------------------------------------------------------

export const SESSION_STATUS: Record<number, string> = {
    1: "Товлогдсон",
    2: "Явагдсан",
    3: "Цуцлагдсан",
};

export const ATTENDANCE_STATUS: Record<number, string> = {
    1: "Ирсэн",
    2: "Тасалсан",
    3: "Чөлөөтэй",
    4: "Хоцорсон",
};

export const FEE_STATUS: Record<number, string> = {
    1: "Төлөгдөөгүй",
    2: "Дутуу",
    3: "Төлөгдсөн",
    4: "Чөлөөлсөн",
};

export const PAYMENT_METHODS: Record<number, string> = {
    1: "Бэлэн",
    2: "Данс",
    3: "Карт",
    4: "Бусад",
};

export const ROLES: Record<string, string> = {
    owner: "Эзэмшигч",
    admin: "Админ",
    coach: "Дасгалжуулагч",
    player: "Суралцагч",
    fan: "Эцэг эх / дэмжигч",
};

export const WEEKDAYS = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];

// Minutes from midnight is how the backend stores a wall-clock slot: it must not shift with
// timezones or DST, which a time-of-day column would.
export const minuteToTime = (minutes: number): string =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export const money = (value?: number | null): string =>
    value == null ? "-" : `${Math.round(value).toLocaleString("mn-MN")}₮`;
