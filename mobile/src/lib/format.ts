const MONTHS = ["1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар",
    "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар"];

const pad = (n: number) => String(n).padStart(2, "0");

// The backend sends UTC with a trailing Z; Date renders it in the device timezone, which is what a
// fixture time should show.
export const formatDateTime = (iso: string): string => {
    const d = new Date(iso);
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const formatDate = (iso: string): string => {
    const d = new Date(iso);
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
};

export const formatDayMonth = (iso: string): string => {
    const d = new Date(iso);
    return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
};

export const formatTime = (iso: string): string => {
    const d = new Date(iso);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const fullName = (last?: string | null, first?: string | null): string =>
    [last, first].filter(Boolean).join(" ").trim();
