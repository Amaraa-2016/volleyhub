"use client";

import { useState } from "react";
import { Ban } from "lucide-react";
import { Field, useToast, useData } from "@/app/components/ui";
import ParentNotice from "@/app/components/ParentNotice";
import type { Session, Settings } from "@/app/types/api";
import { API } from "@/app/utils/API";
import { dayLabel, hhmm, parseDay, toMinutes, WEEKDAYS } from "@/app/utils/format";

export const REASONS = ["Заал засвартай", "Баяр ёслол", "Багш өвчтэй", "Цаг агаарын нөхцөл", "Тэмцээн"];

const fullDay = (d: string) => {
    const x = parseDay(d);
    return `${x.getMonth() + 1}-р сарын ${x.getDate()} (${WEEKDAYS[x.getDay()]})`;
};

// The text parents get: which class, when, why, and the make-up if one was booked.
export const cancelMessage = (training: string | undefined, s: { groupname: string; session_date: string; start_minute: number },
    reason?: string | null, makeup?: { date: string; start: number } | null) => {
    const parts = [
        `${training ? training + ": " : ""}${fullDay(s.session_date)} ${hhmm(s.start_minute)}-ийн ${s.groupname} ангийн хичээл${reason ? ` ${reason.toLowerCase()} тул` : ""} болохгүй.`,
    ];
    if (makeup) parts.push(`Нөхөх хичээл: ${fullDay(makeup.date)} ${hhmm(makeup.start)}.`);
    parts.push("Баярлалаа.");
    return parts.join(" ");
};

// Cancel one class: reason, optional make-up, then the parents' text. Works after the register
// was taken too - the marks are removed so nobody reads as absent for a class that did not happen.
export default function CancelClass({ session, onDone }: { session: Session; onDone: () => void }) {
    const toast = useToast();
    const settings = useData<Settings>("/api/vh/backoffice/settings");
    const [step, setStep] = useState<"form" | "notify">(session.status === 3 ? "notify" : "form");
    const [reason, setReason] = useState(session.cancel_reason ?? "");
    const [makeup, setMakeup] = useState(false);
    const [mDate, setMDate] = useState("");
    const [mStart, setMStart] = useState(hhmm(session.start_minute));
    const [mEnd, setMEnd] = useState(hhmm(session.end_minute));
    const [busy, setBusy] = useState(false);
    const [booked, setBooked] = useState<{ date: string; start: number } | null>(
        session.makeup_date ? { date: session.makeup_date.slice(0, 10), start: session.makeup_start_minute ?? session.start_minute } : null);

    const cancel = async () => {
        setBusy(true);
        const res = await API(`/api/vh/backoffice/sessions/${session.sessionid}/cancel`, { data: { reason } });
        if (res.error) { setBusy(false); return toast.fail(res.error); }
        if (makeup && mDate) {
            const mk = await API(`/api/vh/backoffice/sessions/${session.sessionid}/makeup`, {
                data: { date: mDate, start_minute: toMinutes(mStart), end_minute: toMinutes(mEnd) },
            });
            if (mk.error) toast.fail(mk.error);
            else setBooked({ date: mDate, start: toMinutes(mStart) });
        }
        setBusy(false);
        toast.ok("Хичээл цуцлагдлаа");
        setStep("notify");
        onDone();
    };

    if (step === "notify") {
        return (
            <div>
                <p className="alert tone-muted" style={{ marginTop: 0 }}>
                    {dayLabel(session.session_date)} {hhmm(session.start_minute)} · {session.groupname} цуцлагдсан.
                    {session.attendance_taken ? " Бүртгэсэн ирц арилсан." : ""}
                </p>
                <ParentNotice groups={[{ groupid: session.groupid, name: session.groupname }]}
                    message={cancelMessage(settings.data?.tenantname, session, reason || session.cancel_reason, booked)} />
            </div>
        );
    }

    return (
        <div>
            {session.attendance_taken && (
                <p className="alert tone-sun" style={{ marginTop: 0 }}>Энэ хичээлийн ирц бүртгэгдсэн байна. Цуцлахад ирц арилж, хэн ч «ирээгүй» гэж тооцогдохгүй.</p>
            )}
            <div className="field">
                <span>Шалтгаан</span>
                <div className="chips" style={{ flexWrap: "wrap", marginBottom: 8 }}>
                    {REASONS.map((r) => (
                        <button type="button" key={r} className={`chip${reason === r ? " on" : ""}`} onClick={() => setReason(reason === r ? "" : r)}>{r}</button>
                    ))}
                </div>
                <input className="input" placeholder="Эсвэл өөрөө бичих" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>

            <label className="row" style={{ padding: "8px 0", borderBottom: 0, cursor: "pointer" }}>
                <input type="checkbox" className="check" checked={makeup} onChange={(e) => setMakeup(e.target.checked)} />
                <span style={{ fontWeight: 700 }}>Нөхөх хичээл товлох</span>
            </label>
            {makeup && (
                <div className="form-section">
                    <Field label="Огноо"><input className="input" type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} /></Field>
                    <div className="grid-2">
                        <Field label="Эхлэх"><input className="input" type="time" value={mStart} onChange={(e) => setMStart(e.target.value)} /></Field>
                        <Field label="Дуусах"><input className="input" type="time" value={mEnd} onChange={(e) => setMEnd(e.target.value)} /></Field>
                    </div>
                </div>
            )}

            <button className="btn primary block" style={{ background: "var(--absent)", borderColor: "var(--absent)", color: "#fff", marginTop: 8 }}
                disabled={busy || (makeup && !mDate)} onClick={cancel}>
                <Ban size={18} /> Хичээлийг цуцлах
            </button>
        </div>
    );
}
