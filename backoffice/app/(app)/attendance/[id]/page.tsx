"use client";

import { use, useEffect, useState } from "react";
import { Check, X, Clock, Minus, Ban, Undo2 } from "lucide-react";
import { TopBar, useData, Loading, ErrorBox, Empty, Sheet, Field, useToast } from "@/app/components/ui";
import type { AttendanceRow, Session } from "@/app/types/api";
import { API } from "@/app/utils/API";
import { ATTENDANCE, dayLabel, hhmm, initials, shortName } from "@/app/utils/format";

// Tap order: present → absent → late → excused → present. Most children come, so a register is a
// handful of taps on the exceptions.
const NEXT: Record<number, number> = { 1: 2, 2: 4, 4: 3, 3: 1 };
const ICON = { 1: Check, 2: X, 3: Minus, 4: Clock } as const;

export default function RegisterPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const toast = useToast();
    const session = useData<Session>(`/api/vh/backoffice/sessions/${id}`);
    const register = useData<AttendanceRow[]>(`/api/vh/backoffice/sessions/${id}/attendance`);
    const [rows, setRows] = useState<AttendanceRow[]>([]);
    const [dirty, setDirty] = useState(false);
    const [busy, setBusy] = useState(false);
    const [planOpen, setPlanOpen] = useState(false);
    const [plan, setPlan] = useState("");

    useEffect(() => {
        if (register.data) setRows(register.data);
    }, [register.data]);

    useEffect(() => {
        setPlan(session.data?.notes ?? "");
    }, [session.data?.notes]);

    const s = session.data;
    const cycle = (studentid: number) => {
        setRows((all) => all.map((r) => (r.studentid === studentid ? { ...r, status: NEXT[r.status] ?? 1 } : r)));
        setDirty(true);
    };

    const save = async () => {
        setBusy(true);
        const res = await API(`/api/vh/backoffice/sessions/${id}/attendance`, {
            data: { records: rows.map((r) => ({ studentid: r.studentid, status: r.status, note: r.note })) },
        });
        setBusy(false);
        if (res.error) return toast.fail(res.error);
        setDirty(false);
        toast.ok("Ирц хадгалагдлаа");
        session.reload();
    };

    // The class's own fields travel whole, because the backend replaces them all on save.
    const saveSession = async (patch: Partial<Session>) => {
        if (!s) return;
        const next = { ...s, ...patch };
        setBusy(true);
        const res = await API("/api/vh/backoffice/sessions", {
            data: {
                sessionid: next.sessionid, groupid: next.groupid, session_date: next.session_date.slice(0, 10),
                start_minute: next.start_minute, end_minute: next.end_minute, status: next.status, notes: next.notes,
            },
        });
        setBusy(false);
        if (res.error) return toast.fail(res.error);
        session.reload();
        return true;
    };

    const counts = rows.reduce<Record<number, number>>((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});
    const cancelled = s?.status === 3;

    return (
        <>
            <TopBar
                back
                title={s?.groupname ?? "Ирц"}
                sub={s ? `${dayLabel(s.session_date)} · ${hhmm(s.start_minute)}–${hhmm(s.end_minute)}` : undefined}
            />
            <main className="page">
                {(session.loading && !s) || (register.loading && !register.data) ? <Loading rows={6} />
                    : session.error || register.error ? <ErrorBox code={session.error ?? register.error} retry={() => { session.reload(); register.reload(); }} />
                    : s && (
                        <>
                            <button className="card pad" style={{ width: "100%", textAlign: "left", cursor: "pointer", marginBottom: 12 }} onClick={() => setPlanOpen(true)}>
                                <div className="caption">Хичээлийн төлөвлөгөө</div>
                                <div style={{ fontWeight: 600, whiteSpace: "pre-wrap" }}>{s.notes || <span className="muted">Юу хийхээ тэмдэглэх…</span>}</div>
                            </button>

                            {cancelled ? (
                                <div className="card">
                                    <Empty title="Энэ хичээл цуцлагдсан">
                                        <button className="btn" disabled={busy} onClick={() => saveSession({ status: 1 })}><Undo2 size={18} /> Сэргээх</button>
                                    </Empty>
                                </div>
                            ) : rows.length === 0 ? (
                                <div className="card"><Empty title="Ангид хүүхэд алга" text="Ангийн хуудсаас хүүхэд нэмнэ үү." /></div>
                            ) : (
                                <>
                                    <div className="chips" style={{ marginBottom: 12 }}>
                                        {([1, 2, 4, 3] as const).map((st) => (
                                            <span key={st} className={`badge tone-${ATTENDANCE[st].tone}`}>{ATTENDANCE[st].label} {counts[st] ?? 0}</span>
                                        ))}
                                    </div>
                                    <div className="list">
                                        {rows.map((r) => {
                                            const meta = ATTENDANCE[r.status as 1 | 2 | 3 | 4] ?? ATTENDANCE[1];
                                            const Icon = ICON[r.status as 1 | 2 | 3 | 4] ?? Check;
                                            return (
                                                <div key={r.studentid} className="row">
                                                    <div className="avatar">{initials(r.last_name, r.first_name)}</div>
                                                    <div className="grow"><div className="title">{shortName(r.last_name, r.first_name)}</div></div>
                                                    <button className={`mark tone-${meta.tone}`} onClick={() => cycle(r.studentid)} aria-label={`${r.first_name}: ${meta.label}. Солихын тулд дарна уу`}>
                                                        <Icon size={16} strokeWidth={3} /> {meta.label}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <p className="caption center" style={{ marginTop: 8 }}>Төлөвийг солихын тулд товч дээр дарна уу</p>
                                    <div className="actions" style={{ marginTop: 16 }}>
                                        <button className="btn primary" disabled={busy || (!dirty && s.attendance_taken)} onClick={save}>
                                            {s.attendance_taken && !dirty ? "Хадгалсан" : "Ирц хадгалах"}
                                        </button>
                                    </div>
                                </>
                            )}

                            {!cancelled && !s.attendance_taken && (
                                <button className="btn ghost block" style={{ marginTop: 12 }} disabled={busy} onClick={async () => {
                                    if (await saveSession({ status: 3 })) toast.ok("Хичээл цуцлагдлаа");
                                }}>
                                    <Ban size={16} /> Хичээлийг цуцлах
                                </button>
                            )}
                        </>
                    )}
            </main>

            <Sheet open={planOpen} onClose={() => setPlanOpen(false)} title="Хичээлийн төлөвлөгөө">
                <Field label="Юу хийх вэ" hint="Жишээ: халаалт 10', дамжуулалт хосоор 15', давшилт 15', тоглолт 20'">
                    <textarea className="input" rows={6} value={plan} onChange={(e) => setPlan(e.target.value)} />
                </Field>
                <button className="btn primary block" disabled={busy} onClick={async () => {
                    if (await saveSession({ notes: plan })) {
                        setPlanOpen(false);
                        toast.ok("Хадгаллаа");
                    }
                }}>Хадгалах</button>
            </Sheet>
        </>
    );
}
