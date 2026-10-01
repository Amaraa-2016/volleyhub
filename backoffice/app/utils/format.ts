// Display helpers. Everything is in the coach's own timezone: dates the backend treats as calendar
// days (session_date) are read as YYYY-MM-DD and never shifted.

export const money = (n: number | null | undefined): string =>
    `${Math.round(n ?? 0).toLocaleString("en-US").replace(/,/g, "'")}₮`;

export const pad = (n: number) => String(n).padStart(2, "0");

export const hhmm = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

export const toMinutes = (value: string): number => {
    const [h, m] = value.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
};

// 0=Sunday, matching the backend and Date.getDay().
export const WEEKDAYS = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];
export const WEEKDAYS_SHORT = ["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"];
// The week the way a Mongolian calendar reads it: Monday first.
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

// YYYY-MM-DD of a local Date.
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const today = () => isoDay(new Date());

export const addDays = (day: string, n: number) => {
    const d = parseDay(day);
    d.setDate(d.getDate() + n);
    return isoDay(d);
};

// A calendar day from the API ("2026-09-30T00:00:00Z") or a form ("2026-09-30"), as a local Date.
export const parseDay = (value: string) => {
    const [y, m, d] = value.slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d);
};

export const dayLabel = (value: string) => {
    const day = value.slice(0, 10);
    if (day === today()) return "Өнөөдөр";
    if (day === addDays(today(), 1)) return "Маргааш";
    if (day === addDays(today(), -1)) return "Өчигдөр";
    const d = parseDay(day);
    return `${d.getMonth() + 1}-р сарын ${d.getDate()}, ${WEEKDAYS[d.getDay()]}`;
};

export const shortDate = (value: string) => {
    const d = new Date(value);
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
};

// "Да 18:00, Лх 18:00" - a group's weekly timetable on one line.
export const scheduleText = (g: { schedule: { weekday: number; start_minute: number }[] }) =>
    g.schedule.length === 0
        ? "Хуваарьгүй"
        : g.schedule.map((s) => `${WEEKDAYS_SHORT[s.weekday]} ${hhmm(s.start_minute)}`).join(", ");

// ---- months (fee periods) ------------------------------------------------

export const currentPeriod = () => today().slice(0, 7);

export const shiftPeriod = (period: string, n: number) => {
    const [y, m] = period.split("-").map(Number);
    const d = new Date(y, m - 1 + n, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

export const periodLabel = (period: string) => {
    const [y, m] = period.split("-").map(Number);
    return `${y} оны ${m}-р сар`;
};

// ---- people -------------------------------------------------------------

// "Д. Сараа": initial of the family name, the given name in full - how names are written here.
export const shortName = (last?: string | null, first?: string | null) => {
    const l = (last ?? "").trim();
    const f = (first ?? "").trim();
    return l ? `${l.charAt(0)}. ${f}` : f;
};

export const initials = (last?: string | null, first?: string | null) =>
    ((first ?? "").charAt(0) + (last ?? "").charAt(0)).toUpperCase() || "?";

// Age from the year of birth - what the coach enters. Falls back to a full date for children
// entered before the field existed.
export const ageOf = (s: { birth_year?: number | null; date_of_birth?: string | null }) =>
    s.birth_year ? new Date().getFullYear() - s.birth_year : age(s.date_of_birth);

export const GENDER: Record<number, string> = { 1: "Хүү", 2: "Охин" };

export const RELATIONS = ["Ээж", "Аав", "Эмээ", "Өвөө", "Эгч", "Ах", "Асран хамгаалагч"];

export const age = (dob?: string | null) => {
    if (!dob) return null;
    const b = new Date(dob);
    const n = new Date();
    let a = n.getFullYear() - b.getFullYear();
    if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
    return a;
};

export const ATTENDANCE = {
    1: { label: "Ирсэн", short: "Ирсэн", tone: "present" },
    2: { label: "Ирээгүй", short: "Тасалсан", tone: "absent" },
    3: { label: "Чөлөөтэй", short: "Чөлөө", tone: "muted" },
    4: { label: "Хоцорсон", short: "Хоцорсон", tone: "sun" },
} as const;

export const FEE_STATUS: Record<number, { label: string; tone: string }> = {
    1: { label: "Төлөөгүй", tone: "absent" },
    2: { label: "Дутуу", tone: "sun" },
    3: { label: "Төлсөн", tone: "present" },
    4: { label: "Чөлөөлсөн", tone: "muted" },
};

export const METHODS: Record<number, string> = {
    2: "Дансаар",
    1: "Бэлнээр",
    3: "Картаар",
    4: "Бусад",
};

// Loose on purpose: the server checks the same shape; the mail server is the real judge.
export const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
