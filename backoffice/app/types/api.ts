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
    phone?: string | null;
    emergency_phone?: string | null;
    date_of_birth?: string | null;
    status: number;
    fee_amount: number;
    joined: string;
}

export interface Student {
    studentid: number;
    last_name: string;
    first_name: string;
    date_of_birth?: string | null;
    gender?: number | null;
    phone?: string | null;
    emergency_name?: string | null;
    emergency_relation?: string | null;
    emergency_phone?: string | null;
    height_cm?: number | null;
    photo?: string | null;
    // 1=Active, 2=Paused, 3=Left
    status: number;
    notes?: string | null;
    pay_ref?: string | null;
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
    present_count: number;
    student_count: number;
}

export interface AttendanceRow {
    studentid: number;
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
