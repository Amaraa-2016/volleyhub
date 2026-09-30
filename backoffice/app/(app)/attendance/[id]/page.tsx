"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Check, X, Clock, Minus, Ban, Undo2, TriangleAlert, ClipboardList } from "lucide-react";
import CancelClass from "@/app/components/CancelClass";
import { TopBar, useData, Loading, ErrorBox, Empty, Sheet, Field, useToast } from "@/app/components/ui";
import type { AttendanceRow, Plan, Session } from "@/app/types/api";
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
    const [cancelOpen, setCancelOpen] = useState(false);
    const plans = useData<Plan[]>(planOpen ? "/api/vh/backoffice/plans" : null);
    const current = useData<Plan>(session.data?.planid ? `/api/vh/backoffice/plans/${session.data.planid}` : null);
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
                                <div className="caption" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <ClipboardList size={14} /> Хичээлийн төлөвлөгөө{s.planname ? ` · ${s.planname}` : ""}
                                </div>
                                {s.planid && current.data ? (
                                    <ol style={{ margin: "6px 0 0", paddingLeft: 20, fontWeight: 600, fontSize: 14, lineHeight: "22px" }}>
                                        {current.data.items.map((i) => <li key={i.itemid}>{i.title} <span className="muted">{i.minutes}′</span></li>)}
                                    </ol>
                                ) : null}
                                {s.notes && <div style={{ fontWeight: 600, whiteSpace: "pre-wrap", marginTop: 4 }}>{s.notes}</div>}
                                {!s.planid && !s.notes && <div className="muted" style={{ fontWeight: 600 }}>Төлөвлөгөө сонгох эсвэл тэмдэглэх…</div>}
                            </button>

                            {cancelled ? (
                                <div className="card pad">
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <span className="badge tone-muted"><Ban size={14} /> Цуцлагдсан</span>
                                        {s.cancel_reason && <strong>{s.cancel_reason}</strong>}
                                    </div>
                                    <p className="caption" style={{ margin: "8px 0 0" }}>Энэ хичээл ирцийн тайланд тоологдохгүй.</p>
                                    {s.makeup_sessionid && s.makeup_date && (
                                        <Link href={`/attendance/${s.makeup_sessionid}`} className="row" style={{ padding: "10px 0", borderBottom: 0 }}>
                                            <div className="grow">
                                                <div className="meta">Нөхөх хичээл</div>
                                                <div className="title">{dayLabel(s.makeup_date)} {hhmm(s.makeup_start_minute ?? s.start_minute)}</div>
                                            </div>
                                        </Link>
                                    )}
                                    <div className="actions" style={{ marginTop: 12 }}>
                                        <button className="btn primary" onClick={() => setCancelOpen(true)}>Эцэг эхэд мэдэгдэх</button>
                                        <button className="btn" disabled={busy} onClick={async () => {
                                            const res = await API(`/api/vh/backoffice/sessions/${id}/restore`, { method: "POST" });
                                            if (res.error) return toast.fail(res.error);
                                            toast.ok("Хичээл сэргээгдлээ");
                                            session.reload();
                                        }}><Undo2 size={18} /> Сэргээх</button>
                                    </div>
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
                                                    <div className="grow">
                                                        <div className="title">{shortName(r.last_name, r.first_name)}</div>
                                                        {(r.injury || r.allergies) && (
                                                            <div className="meta" style={{ color: "var(--absent)", display: "flex", alignItems: "center", gap: 4 }}>
                                                                <TriangleAlert size={13} />
                                                                {[r.injury && `Гэмтэл: ${r.injury}`, r.allergies && `Харшил: ${r.allergies}`].filter(Boolean).join(" · ")}
                                                            </div>
                                                        )}
                                                    </div>
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

                            {!cancelled && (
                                <button className="btn ghost block danger" style={{ marginTop: 12 }} onClick={() => setCancelOpen(true)}>
                                    <Ban size={16} /> Хичээл ороогүй / цуцлах
                                </button>
                            )}
                            {s.makeup_for && (
                                <p className="caption center" style={{ marginTop: 8 }}>
                                    Энэ бол <Link href={`/attendance/${s.makeup_for}`} style={{ color: "var(--brand)", fontWeight: 800 }}>цуцлагдсан хичээлийн</Link> нөхөх хичээл.
                                </p>
                            )}
                        </>
                    )}
            </main>

            <Sheet open={cancelOpen} onClose={() => setCancelOpen(false)} title={cancelled ? "Эцэг эхэд мэдэгдэх" : "Хичээл цуцлах"}>
                {s && cancelOpen && <CancelClass session={s} onDone={() => { session.reload(); register.reload(); }} />}
            </Sheet>

            <Sheet open={planOpen} onClose={() => setPlanOpen(false)} title="Хичээлийн төлөвлөгөө">
                <div className="field">
                    <span>Бэлэн төлөвлөгөө</span>
                    {plans.loading && !plans.data ? <Loading rows={1} /> : !plans.data?.length ? (
                        <p className="caption" style={{ margin: 0 }}>Төлөвлөгөө алга. <Link href="/plans/new" style={{ color: "var(--brand)", fontWeight: 800 }}>Үүсгэх</Link></p>
                    ) : (
                        <div className="list">
                            {[{ planid: 0, name: "Төлөвлөгөөгүй", total_minutes: 0, items: [] } as Plan, ...plans.data].map((p) => (
                                <button key={p.planid} className="row" style={{ minHeight: 52 }} onClick={async () => {
                                    const res = await API(`/api/vh/backoffice/sessions/${id}/plan`, { data: { planid: p.planid || null } });
                                    if (res.error) return toast.fail(res.error);
                                    session.reload();
                                }}>
                                    <input type="radio" className="check" readOnly checked={(s?.planid ?? 0) === p.planid} />
                                    <div className="grow">
                                        <div className="title">{p.name}</div>
                                        {p.planid > 0 && <div className="meta">{p.total_minutes} мин · {p.items.map((i) => i.title).join(" → ")}</div>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <Field label="Нэмэлт тэмдэглэл" hint="Энэ хичээлд зориулсан тэмдэглэл">
                    <textarea className="input" rows={3} value={plan} onChange={(e) => setPlan(e.target.value)} />
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
