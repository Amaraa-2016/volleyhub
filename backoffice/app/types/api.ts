// Shapes returned by /api/vh/backoffice/*. Field names follow the backend exactly.

export interface ScheduleEntry {
    scheduleid: number;
    groupid: number;
    groupname?: string | null;
    venueid?: number | null;
    venuename?: string | null;
    // 0=Sunday .. 6=Saturday
    weekday: number;
    start_minute: number;
    end_minute: number;
    isactive: boolean;
}

export interface Group {
    groupid: number;
    name: string;
    level?: string | null;
    agegroup?: string | null;
    gender: number;
    venueid?: number | null;
    venuename?: string | null;
    capacity: number;
    fee_amount: number;
    notes?: string | null;
    isactive: boolean;
    studentcount: number;
    schedule: ScheduleEntry[];
}

export interface RosterEntry {
    enrollmentid: number;
    studentid: number;
    last_name: string;
    first_name: string;
    gender?: number | null;
    birth_year?: number | null;
    phone?: string | null;
    emergency_name?: string | null;
    emergency_relation?: string | null;
    emergency_phone?: string | null;
    emergency_email?: string | null;
    email?: string | null;
    date_of_birth?: string | null;
    // The child's status: 1=Active, 3=Left
    status: number;
    fee_amount: number;
    joined: string;
    left_at?: string | null;
    active: boolean;
    balance: number;
}

export interface Student {
    studentid: number;
    last_name: string;
    first_name: string;
    date_of_birth?: string | null;
    birth_year?: number | null;
    gender?: number | null;
    phone?: string | null;
    emergency_name?: string | null;
    emergency_relation?: string | null;
    emergency_phone?: string | null;
    emergency_email?: string | null;
    email?: string | null;
    height_cm?: number | null;
    photo?: string | null;
    // 1=Active, 2=Paused, 3=Left
    status: number;
    start_date?: string | null;
    left_date?: string | null;
    notes?: string | null;
    pay_ref?: string | null;
    discountid?: number | null;
    discountname?: string | null;
    allergies?: string | null;
    medical_notes?: string | null;
    blood_type?: string | null;
    groupid?: number | null;
    groupname?: string | null;
    fee_amount?: number | null;
    balance: number;
}

export interface Session {
    sessionid: number;
    groupid: number;
    groupname: string;
    venuename?: string | null;
    session_date: string;
    start_minute: number;
    end_minute: number;
    // 1=Planned, 2=Held, 3=Cancelled
    status: number;
    attendance_taken: boolean;
    notes?: string | null;
    planid?: number | null;
    planname?: string | null;
    cancel_reason?: string | null;
    makeup_for?: number | null;
    makeup_sessionid?: number | null;
    makeup_date?: string | null;
    makeup_start_minute?: number | null;
    present_count: number;
    student_count: number;
}

export interface AttendanceRow {
    studentid: number;
    allergies?: string | null;
    injury?: string | null;
    last_name: string;
    first_name: string;
    // 1=Present, 2=Absent, 3=Excused, 4=Late
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
    history: { sessionid: number; session_date: string; groupname: string; status: number; note?: string | null }[];
}

export interface Payment {
    paymentid: number;
    feeid: number;
    studentid: number;
    amount: number;
    // 1=Cash, 2=Bank transfer, 3=Card, 4=Other
    method: number;
    paid_at: string;
    payer?: string | null;
    note?: string | null;
    studentname?: string | null;
    period?: string | null;
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
    // 1=Unpaid, 2=Partly paid, 3=Paid, 4=Waived
    status: number;
    note?: string | null;
    pay_ref?: string | null;
    base_amount?: number | null;
    discount_name?: string | null;
    phone?: string | null;
    notified_at?: string | null;
    payments: Payment[];
}

export interface Month {
    period: string;
    expected: number;
    received: number;
    paid_count: number;
    fee_count: number;
    missing_count: number;
    fees: Fee[];
}

export interface AbsentStreak {
    studentid: number;
    last_name: string;
    first_name: string;
    groupname?: string | null;
    missed: number;
}

export interface Dashboard {
    groups: number;
    students: number;
    today: Session[];
    upcoming: Session[];
    period: string;
    month_expected: number;
    month_received: number;
    month_unpaid: number;
    absent_streaks: AbsentStreak[];
}

export interface RatingMonth {
    period: string;
    // skill id (as a string key) -> 1..5
    scores: Record<string, number>;
    note?: string | null;
}

export interface Note {
    noteid: number;
    body: string;
    author?: string | null;
    created: string;
}

export interface NotifyItem {
    feeid: number;
    studentid: number;
    name: string;
    phone?: string | null;
    message: string;
    status: "sent" | "failed" | "logged" | "no_phone" | "preview";
    error?: string | null;
}

export interface NotifyResult {
    sent: number;
    failed: number;
    skipped: number;
    gateway: boolean;
    items: NotifyItem[];
}

export interface Settings {
    tenantname: string;
    contactphone?: string | null;
    bank_name?: string | null;
    bank_account?: string | null;
    bank_holder?: string | null;
    sms_enabled: boolean;
    email_enabled: boolean;
}

export interface Skill {
    skillid: number;
    name: string;
    hint?: string | null;
    sort_order: number;
}

export interface Drill {
    drillid: number;
    name: string;
    description?: string | null;
    minutes: number;
    level?: string | null;
    equipment?: string | null;
    skillids: number[];
    plan_count: number;
}

export interface PlanItem {
    itemid: number;
    drillid?: number | null;
    title: string;
    minutes: number;
    description?: string | null;
    skillids: number[];
}

export interface Plan {
    planid: number;
    name: string;
    notes?: string | null;
    total_minutes: number;
    items: PlanItem[];
}

export interface Discount {
    discountid: number;
    name: string;
    // 1=Percent, 2=Fixed ₮
    kind: number;
    value: number;
    student_count: number;
}

export interface MeasureType {
    typeid: number;
    name: string;
    unit: string;
    higher_is_better: boolean;
    sort_order: number;
}

export interface Measurement {
    measureid: number;
    typeid: number;
    value: number;
    measured_on: string;
    note?: string | null;
}

export interface Injury {
    injuryid: number;
    occurred_on: string;
    body_part?: string | null;
    description: string;
    // 1=Recovering, 2=Recovered
    status: number;
    recovered_on?: string | null;
    created: string;
}

export interface HealthFlag {
    studentid: number;
    allergies?: string | null;
    injured: boolean;
    injury?: string | null;
}

export interface IncomeReport {
    year: number;
    billed: number;
    paid: number;
    collected: number;
    discounts: number;
    outstanding: number;
    months: { period: string; billed: number; paid: number; discounts: number; collected: number; children: number }[];
    groups: { groupid: number; name: string; billed: number; paid: number }[];
    methods: Record<string, number>;
    debtors: { studentid: number; name: string; groupname?: string | null; owed: number; months: number }[];
}

export interface ReportEmail {
    subject: string;
    text: string;
    html: string;
    sent_to: string[];
    sent: boolean;
}
