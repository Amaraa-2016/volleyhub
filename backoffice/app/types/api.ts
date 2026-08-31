// Mirrors the backend DTOs. Field names match the JSON exactly, so responses need no mapping.

// ---- training centre ------------------------------------------------------

export interface ScheduleEntry {
    scheduleid: number;
    groupid: number;
    groupname?: string | null;
    venueid?: number | null;
    venuename?: string | null;
    weekday: number;
    start_minute: number;
    end_minute: number;
    isactive: boolean;
}

export interface Coach {
    coachid: number;
    last_name: string;
    first_name: string;
    photo?: string | null;
    position?: string | null;
    rank?: string | null;
    bio?: string | null;
    phone?: string | null;
    isactive: boolean;
    sort_order: number;
    coursecount: number;
}

export interface Group {
    groupid: number;
    name: string;
    level?: string | null;
    agegroup?: string | null;
    gender: number;
    coaches: Coach[];
    venueid?: number | null;
    venuename?: string | null;
    capacity: number;
    fee_amount: number;
    notes?: string | null;
    isactive: boolean;
    // Public listing.
    cover?: string | null;
    start_date?: string | null;
    address?: string | null;
    map_url?: string | null;
    phone?: string | null;
    studentcount: number;
    schedule: ScheduleEntry[];
}

export interface Student {
    studentid: number;
    accountid: number;
    last_name: string;
    first_name: string;
    date_of_birth?: string | null;
    gender?: number | null;
    reg_no?: string | null;
    phone?: string | null;
    parent_name?: string | null;
    parent_phone?: string | null;
    height_cm?: number | null;
    photo?: string | null;
    status: number;
    notes?: string | null;
    groupid?: number | null;
    groupname?: string | null;
    fee_amount?: number | null;
    balance: number;
}

export interface RosterEntry {
    enrollmentid: number;
    studentid: number;
    last_name: string;
    first_name: string;
    phone?: string | null;
    parent_phone?: string | null;
    date_of_birth?: string | null;
    status: number;
    fee_amount: number;
    joined: string;
}

export interface Venue {
    venueid: number;
    name: string;
    address?: string | null;
    courts: number;
    contactphone?: string | null;
    notes?: string | null;
}

export interface Session {
    sessionid: number;
    groupid: number;
    groupname: string;
    venueid?: number | null;
    venuename?: string | null;
    coach_staffid?: number | null;
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

export interface AttendanceRow {
    studentid: number;
    last_name: string;
    first_name: string;
    status: number;
    note?: string | null;
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
    studentid: number;
    amount: number;
    method: number;
    paid_at: string;
    note?: string | null;
}

export interface Fee {
    feeid: number;
    studentid: number;
    last_name: string;
    first_name: string;
    groupid: number;
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

export interface Announcement {
    announcementid: number;
    title: string;
    body?: string | null;
    cover?: string | null;
    authorname?: string | null;
    published_at?: string | null;
    created: string;
}

export interface Member {
    accounttenantid: number;
    accountid: number;
    phone: string;
    lastname?: string | null;
    firstname?: string | null;
    role: string;
    status: string;
    staffid: number;
    joined: string;
}

export interface Staff {
    staffid: number;
    staffname?: string | null;
    roleid: number;
    phone: string;
}

export interface Dashboard {
    groups: number;
    students: number;
    sessions_this_week: number;
    pending_members: number;
    unpaid_total: number;
    unpaid_students: number;
    next_sessions: Session[];
}

export interface TrainingProfile {
    tagline?: string | null;
    description?: string | null;
    logo?: string | null;
    cover?: string | null;
    photos?: string | null;
    address?: string | null;
    city?: string | null;
    district?: string | null;
    contactphone?: string | null;
    email?: string | null;
    website?: string | null;
    facebook?: string | null;
    instagram?: string | null;
    price_from?: number | null;
    age_from?: number | null;
    age_to?: number | null;
    latitude?: number | null;
    longitude?: number | null;
    is_published: boolean;
}

// ---- platform / public site ----------------------------------------------

export interface PublicSchedule {
    weekday: number;
    start_minute: number;
    end_minute: number;
}

// The public site lists courses, not organisations: tenantid + groupid together identify one.
export interface CourseCard {
    tenantid: number;
    groupid: number;
    tenantname: string;
    name: string;
    cover?: string | null;
    level?: string | null;
    agegroup?: string | null;
    gender: number;
    fee_amount: number;
    capacity: number;
    enrolled: number;
    start_date?: string | null;
    address?: string | null;
    phone?: string | null;
    schedule: PublicSchedule[];
}

export interface PublicCoach {
    coachid: number;
    last_name: string;
    first_name: string;
    photo?: string | null;
    position?: string | null;
    rank?: string | null;
    bio?: string | null;
}

export interface CourseDetail extends CourseCard {
    notes?: string | null;
    map_url?: string | null;
    venuename?: string | null;
    tenantphone?: string | null;
    tenantlogo?: string | null;
    coaches: PublicCoach[];
}

export interface News {
    newsid: number;
    title: string;
    summary?: string | null;
    body?: string | null;
    cover?: string | null;
    category: number;
    source?: string | null;
    source_url?: string | null;
    published_at?: string | null;
    view_count: number;
    created: string;
}

export interface Product {
    productid: number;
    name: string;
    category?: string | null;
    brand?: string | null;
    description?: string | null;
    price: number;
    old_price?: number | null;
    images: string[];
    stock: number;
    isactive: boolean;
    sort_order: number;
}

export interface OrderItem {
    orderitemid: number;
    productid: number;
    product_name: string;
    price: number;
    quantity: number;
}

export interface Order {
    orderid: number;
    accountid: number;
    customer_name: string;
    phone: string;
    address?: string | null;
    note?: string | null;
    total: number;
    status: number;
    admin_note?: string | null;
    created: string;
    items: OrderItem[];
}

export interface TenantRequest {
    tenantrequestid: number;
    accountid: number;
    applicantname?: string | null;
    applicantphone?: string | null;
    tenantname: string;
    registernumber?: string | null;
    address?: string | null;
    contactphone?: string | null;
    status: string;
    note?: string | null;
    tenantid?: number | null;
    created: string;
    reviewedat?: string | null;
}

export interface ClubSearchResult {
    tenantid: number;
    tenantname: string;
    address?: string | null;
    logo?: string | null;
}

// ---- shared labels --------------------------------------------------------

export const GENDERS: Record<number, string> = { 1: "Эрэгтэй", 2: "Эмэгтэй", 3: "Холимог" };

export const STUDENT_STATUS: Record<number, string> = { 1: "Суралцаж буй", 2: "Түр завсарласан", 3: "Гарсан" };

export const SESSION_STATUS: Record<number, string> = { 1: "Товлогдсон", 2: "Явагдсан", 3: "Цуцлагдсан" };

export const ATTENDANCE_STATUS: Record<number, string> = { 1: "Ирсэн", 2: "Тасалсан", 3: "Чөлөөтэй", 4: "Хоцорсон" };

export const FEE_STATUS: Record<number, string> = { 1: "Төлөгдөөгүй", 2: "Дутуу", 3: "Төлөгдсөн", 4: "Чөлөөлсөн" };

export const PAYMENT_METHODS: Record<number, string> = { 1: "Бэлэн", 2: "Данс", 3: "Карт", 4: "Бусад" };

export const NEWS_CATEGORIES: Record<number, string> = { 1: "Дэлхий", 2: "Монгол", 3: "Платформ" };

export const ORDER_STATUS: Record<number, string> = {
    1: "Шинэ", 2: "Холбогдсон", 3: "Баталгаажсан", 4: "Хүргэсэн", 5: "Цуцлагдсан",
};

export const ROLES: Record<string, string> = {
    owner: "Эзэмшигч", admin: "Админ", coach: "Дасгалжуулагч", player: "Суралцагч", fan: "Дэмжигч",
};

export const WEEKDAYS = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];

// Minutes from midnight is how the backend stores a wall-clock slot: it must not shift with
// timezones or DST, which a time-of-day column would.
export const minuteToTime = (minutes: number): string =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export const timeToMinute = (value: string): number => {
    const [h, m] = value.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
};

export const money = (value?: number | null): string =>
    value == null ? "-" : `${Math.round(value).toLocaleString("mn-MN")}₮`;
