"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarPlus } from "lucide-react";
import { TopBar, useData, Loading, ErrorBox, Empty, useToast } from "@/app/components/ui";
import type { Group, Session } from "@/app/types/api";
import { API } from "@/app/utils/API";
import { addDays, dayLabel, hhmm, today, WEEKDAYS_SHORT, parseDay } from "@/app/utils/format";

export default function AttendancePage() {
    const toast = useToast();
    const [day, setDay] = useState(today());
    const [busy, setBusy] = useState(false);

    // The week around the chosen day, so the strip of days can show which ones have classes.
    const start = addDays(day, -((parseDay(day).getDay() + 6) % 7));
    const end = addDays(start, 6);
    const { data, error, loading, reload } = useData<Session[]>(`/api/vh/backoffice/sessions?from=${start}&to=${end}`);
    const groups = useData<Group[]>("/api/vh/backoffice/groups");

    const onDay = (data ?? []).filter((s) => s.session_date.slice(0, 10) === day);
    const hasTimetable = (groups.data ?? []).some((g) => g.schedule.length > 0);

    // Turns the weekly timetable into dated classes for the next four weeks. Safe to press twice:
    // the backend skips any class that already exists.
    const generate = async () => {
        setBusy(true);
        const res = await API<{ created: number }>("/api/vh/backoffice/sessions/generate", {
            data: { from: start, to: addDays(start, 34) },
        });
        setBusy(false);
        if (res.error) return toast.fail(res.error);
        toast.ok(res.data?.created ? `${res.data.created} хичээл нэмэгдлээ` : "Хуваарь аль хэдийн шинэчлэгдсэн байна");
        reload();
    };

    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

    return (
        <>
            <TopBar title="Ирц" sub={dayLabel(day)} right={
                hasTimetable ? (
                    <button className="icon-btn" aria-label="Хуваариас хичээл үүсгэх" onClick={generate} disabled={busy}>
                        <CalendarPlus size={22} />
                    </button>
                ) : undefined
            } />
            <main className="page">
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 12 }}>
                    <button className="icon-btn" aria-label="Өмнөх долоо хоног" onClick={() => setDay(addDays(day, -7))}><ChevronLeft size={20} /></button>
                    <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                        {days.map((d) => {
                            const count = (data ?? []).filter((s) => s.session_date.slice(0, 10) === d && s.status !== 3).length;
                            const on = d === day;
                            return (
                                <button
                                    key={d}
                                    onClick={() => setDay(d)}
                                    style={{
                                        border: 0, cursor: "pointer", borderRadius: 12, padding: "6px 0",
                                        background: on ? "var(--ink)" : d === today() ? "var(--brand-soft)" : "transparent",
                                        color: on ? "var(--surface-100)" : "var(--ink)",
                                    }}
                                >
                                    <div className="caption" style={{ color: "inherit", opacity: .8 }}>{WEEKDAYS_SHORT[parseDay(d).getDay()]}</div>
                                    <div style={{ fontWeight: 800 }}>{parseDay(d).getDate()}</div>
                                    <div style={{ height: 6, display: "flex", justifyContent: "center", gap: 2 }}>
                                        {Array.from({ length: Math.min(count, 3) }, (_, i) => (
                                            <span key={i} style={{ width: 5, height: 5, borderRadius: 3, background: on ? "var(--sun)" : "var(--brand)" }} />
                                        ))}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    <button className="icon-btn" aria-label="Дараагийн долоо хоног" onClick={() => setDay(addDays(day, 7))}><ChevronRight size={20} /></button>
                </div>

                {loading && !data ? <Loading /> : error && !data ? <ErrorBox code={error} retry={reload} /> : onDay.length === 0 ? (
                    <div className="card">
                        {(data ?? []).length === 0 && hasTimetable ? (
                            <Empty title="Энэ долоо хоногт хичээл үүсээгүй" text="Бүлгүүдийн долоо хоногийн хуваариас хичээлүүдийг үүсгэнэ.">
                                <button className="btn primary" onClick={generate} disabled={busy}><CalendarPlus size={18} /> Хуваариас үүсгэх</button>
                            </Empty>
                        ) : !hasTimetable ? (
                            <Empty title="Хуваарь алга" text="Бүлгийн хуудсанд орж долоо хоногийн хуваарийг оруулна уу.">
                                <Link href="/groups" className="btn">Бүлгүүд рүү</Link>
                            </Empty>
                        ) : (
                            <Empty title="Энэ өдөр хичээлгүй" />
                        )}
                    </div>
                ) : (
                    <div className="list">
                        {onDay.map((s) => (
                            <Link key={s.sessionid} href={`/attendance/${s.sessionid}`} className="row">
                                <div className="time-pill">{hhmm(s.start_minute)}<small>{hhmm(s.end_minute)}</small></div>
                                <div className="grow">
                                    <div className="title">{s.groupname}</div>
                                    <div className="meta">{s.student_count} хүүхэд{s.notes ? ` · ${s.notes}` : ""}</div>
                                </div>
                                {s.status === 3 ? <span className="badge tone-muted">Цуцалсан</span>
                                    : s.attendance_taken ? <span className="badge tone-present">{s.present_count}/{s.student_count}</span>
                                    : <span className="badge tone-brand">Ирц авах</span>}
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </>
    );
}
