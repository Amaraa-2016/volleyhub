"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Printer, Phone, Pencil, Trash2, StickyNote, UserX, UserCheck, Check, HeartPulse, Ruler, TriangleAlert } from "lucide-react";
import { HealthTab, MeasureTab } from "@/app/components/KidHealth";
import { TopBar, useData, Loading, ErrorBox, Sheet, Empty, useToast } from "@/app/components/ui";
import StudentForm from "@/app/components/StudentForm";
import FeeSheet from "@/app/components/FeeSheet";
import type { AttendanceSummary, Fee, Group, Injury, Note, RatingMonth, Skill, Student } from "@/app/types/api";
import { API } from "@/app/utils/API";
import {
    ageOf, ATTENDANCE, currentPeriod, dayLabel, FEE_STATUS, GENDER, initials, METHODS, money,
    periodLabel, shortDate, today,
} from "@/app/utils/format";

type Tab = "attendance" | "fees" | "notes" | "progress" | "measure" | "health";

// Everything about one child in one place: who to call, their status, and the three histories -
// attendance, payments, the coach's notes.
export default function KidPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const toast = useToast();
    const kid = useData<Student>(`/api/vh/backoffice/students/${id}`);
    const att = useData<AttendanceSummary>(`/api/vh/backoffice/students/${id}/attendance`);
    const fees = useData<Fee[]>(`/api/vh/backoffice/fees?studentid=${id}`);
    const notes = useData<Note[]>(`/api/vh/backoffice/students/${id}/notes`);
    const ratings = useData<RatingMonth[]>(`/api/vh/backoffice/students/${id}/ratings`);
    const groups = useData<Group[]>("/api/vh/backoffice/groups");
    const skills = useData<Skill[]>("/api/vh/backoffice/skills");
    const injuries = useData<Injury[]>(`/api/vh/backoffice/students/${id}/injuries`);
    const [tab, setTab] = useState<Tab>("attendance");
    const [sheet, setSheet] = useState<null | "edit" | "note" | "status" | "rating">(null);
    const [openFee, setOpenFee] = useState<Fee | null>(null);

    const s = kid.data;
    const a = s ? ageOf(s) : null;
    const isLeft = s?.status === 3;

    const remove = async () => {
        if (!s || !confirm(`${s.first_name}-г бүр мөсөн устгах уу? Ихэнх тохиолдолд "Гарсан" төлөв хангалттай.`)) return;
        const res = await API(`/api/vh/backoffice/students/${id}`, { method: "DELETE" });
        if (res.error) return toast.fail(res.error);
        toast.ok("Устгалаа");
        router.replace("/kids");
    };

    const owed = (fees.data ?? []).filter((f) => f.status === 1 || f.status === 2).reduce((n, f) => n + f.balance, 0);
    const latest = ratings.data?.[0];

    return (
        <>
            <TopBar back title={s ? `${s.last_name} ${s.first_name}`.trim() : ""} sub={s?.groupname ?? undefined} right={s && (
                <>
                    <Link href={`/print/kid/${id}`} className="icon-btn" aria-label="Тайлан хэвлэх / PDF"><Printer size={20} /></Link>
                    <button className="icon-btn" aria-label="Мэдээлэл засах" onClick={() => setSheet("edit")}><Pencil size={20} /></button>
                </>
            )} />
            <main className="page">
                {kid.loading && !s ? <Loading rows={4} /> : kid.error ? <ErrorBox code={kid.error} retry={kid.reload} /> : s && (
                    <>
                        <div className="card pad">
                            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                                <div className="avatar lg">{initials(s.last_name, s.first_name)}</div>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ fontWeight: 800, fontSize: 20, lineHeight: "26px" }}>{s.last_name} {s.first_name}</div>
                                    <div className="muted" style={{ fontWeight: 600, fontSize: 14 }}>
                                        {[s.gender ? GENDER[s.gender] : null, a !== null ? `${a} нас` : null, s.groupname].filter(Boolean).join(" · ")}
                                    </div>
                                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                                        {isLeft ? <span className="badge tone-muted">Гарсан</span> : <span className="badge tone-present">Идэвхтэй</span>}
                                        {owed > 0 && <span className="badge tone-absent">Өртэй {money(owed)}</span>}
                                    </div>
                                </div>
                            </div>
                            <dl className="kv" style={{ marginTop: 16 }}>
                                <dt>Эхэлсэн</dt><dd>{s.start_date ? shortDate(s.start_date) : "—"}</dd>
                                {isLeft && <><dt>Гарсан</dt><dd>{s.left_date ? shortDate(s.left_date) : "—"}</dd></>}
                                <dt>Сарын төлбөр</dt><dd className="num">{s.fee_amount != null ? money(s.fee_amount) : "—"}</dd>
                                {s.phone && <><dt>Утас</dt><dd className="num">{s.phone}</dd></>}
                                {s.pay_ref && <><dt>Гүйлгээний утга</dt><dd>{s.pay_ref}</dd></>}
                                {s.discountname && <><dt>Хөнгөлөлт</dt><dd>{s.discountname}</dd></>}
                            </dl>
                        </div>

                        {(s.allergies || s.medical_notes || (injuries.data ?? []).some((i) => i.status === 1)) && (
                            <button className="alert tone-absent" style={{ display: "flex", gap: 10, marginTop: 12, width: "100%", textAlign: "left", border: 0, cursor: "pointer" }}
                                onClick={() => setTab("health")}>
                                <TriangleAlert size={20} style={{ flexShrink: 0 }} />
                                <span>
                                    {s.allergies && <div>Харшил: {s.allergies}</div>}
                                    {s.medical_notes && <div>{s.medical_notes}</div>}
                                    {(injuries.data ?? []).filter((i) => i.status === 1).map((i) => (
                                        <div key={i.injuryid}>Гэмтэлтэй: {i.body_part ?? i.description}</div>
                                    ))}
                                </span>
                            </button>
                        )}

                        {s.emergency_phone && (
                            <a href={`tel:${s.emergency_phone}`} className="card pad" style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
                                <span className="avatar tone-court"><Phone size={18} /></span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="caption">Яаралтай үед · {s.emergency_relation || "Холбоо барих"}</div>
                                    <div style={{ fontWeight: 800 }}>{s.emergency_name || "—"} · <span className="num">{s.emergency_phone}</span></div>
                                </div>
                                <span className="badge tone-court">Залгах</span>
                            </a>
                        )}

                        <div className="action-grid" style={{ marginTop: 12 }}>
                            <button className="action-tile" onClick={() => setSheet("note")}>
                                <span className="ico tone-sun"><StickyNote size={20} /></span>Тэмдэглэл
                            </button>
                            <button className="action-tile" onClick={() => setSheet("status")}>
                                <span className={`ico ${isLeft ? "tone-present" : "tone-muted"}`}>{isLeft ? <UserCheck size={20} /> : <UserX size={20} />}</span>
                                {isLeft ? "Идэвхжүүлэх" : "Гарсан болгох"}
                            </button>
                            <Link className="action-tile" href={`/print/kid/${id}`}>
                                <span className="ico tone-court"><Printer size={20} /></span>Тайлан / PDF
                            </Link>
                        </div>

                        <div className="tabs" role="tablist">
                            <button className={tab === "attendance" ? "on" : ""} onClick={() => setTab("attendance")}>Ирц</button>
                            <button className={tab === "fees" ? "on" : ""} onClick={() => setTab("fees")}>Төлбөр</button>
                            <button className={tab === "notes" ? "on" : ""} onClick={() => setTab("notes")}>Тэмдэглэл<span className="count">{notes.data?.length || ""}</span></button>
                            <button className={tab === "progress" ? "on" : ""} onClick={() => setTab("progress")}>Ахиц</button>
                            <button className={tab === "measure" ? "on" : ""} onClick={() => setTab("measure")}><Ruler size={14} style={{ verticalAlign: -2 }} /> Хэмжилт</button>
                            <button className={tab === "health" ? "on" : ""} onClick={() => setTab("health")}><HeartPulse size={14} style={{ verticalAlign: -2 }} /> Эрүүл мэнд</button>
                        </div>

                        {tab === "attendance" && (
                            att.loading && !att.data ? <Loading /> : !att.data || att.data.total === 0 ? (
                                <div className="card"><Empty title="Ирц бүртгэгдээгүй байна" /></div>
                            ) : (
                                <>
                                    <div className="stats" style={{ marginBottom: 12 }}>
                                        <div className="card stat"><div className="label">Ирцийн хувь</div><div className="value">{att.data.rate}%</div></div>
                                        <div className="card stat"><div className="label">Хичээл</div><div className="value">{att.data.total}</div></div>
                                    </div>
                                    <div className="chips" style={{ marginBottom: 12 }}>
                                        <span className="badge tone-present">Ирсэн {att.data.present}</span>
                                        <span className="badge tone-sun">Хоцорсон {att.data.late}</span>
                                        <span className="badge tone-absent">Ирээгүй {att.data.absent}</span>
                                        <span className="badge tone-muted">Чөлөөтэй {att.data.excused}</span>
                                    </div>
                                    <div className="list">
                                        {att.data.history.map((h) => {
                                            const st = ATTENDANCE[h.status as 1 | 2 | 3 | 4] ?? ATTENDANCE[1];
                                            return (
                                                <Link key={h.sessionid} href={`/attendance/${h.sessionid}`} className="row">
                                                    <div className="grow">
                                                        <div className="title">{dayLabel(h.session_date)}</div>
                                                        <div className="meta">{h.groupname}{h.note ? ` · ${h.note}` : ""}</div>
                                                    </div>
                                                    <span className={`badge tone-${st.tone}`}>{st.label}</span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </>
                            )
                        )}

                        {tab === "fees" && (
                            fees.loading && !fees.data ? <Loading /> : !fees.data?.length ? (
                                <div className="card"><Empty title="Төлбөр үүсээгүй байна" text="Төлбөр цэснээс сарын төлбөрийг үүсгэнэ." /></div>
                            ) : (
                                <div className="list">
                                    {fees.data.map((f) => {
                                        const st = FEE_STATUS[f.status];
                                        return (
                                            <button key={f.feeid} className="row" onClick={() => setOpenFee(f)}>
                                                <div className="grow">
                                                    <div className="title">{periodLabel(f.period)}</div>
                                                    <div className="meta">
                                                        {f.payments.length
                                                            ? f.payments.map((p) => `${shortDate(p.paid_at)} ${money(p.amount)} ${METHODS[p.method] ?? ""}`).join(" · ")
                                                            : f.groupname}
                                                    </div>
                                                </div>
                                                <div className="end">
                                                    <div className="amount">{money(f.amount)}</div>
                                                    <span className={`badge tone-${st.tone}`}>{st.label}</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )
                        )}

                        {tab === "notes" && (
                            <>
                                <button className="btn block" style={{ marginBottom: 12 }} onClick={() => setSheet("note")}><StickyNote size={18} /> Тэмдэглэл нэмэх</button>
                                {!notes.data?.length ? (
                                    <div className="card"><Empty title="Тэмдэглэл алга" text="Гэмтэл, ахиц, эцэг эхтэй ярьсан зүйл гэх мэтийг тэмдэглээрэй." /></div>
                                ) : (
                                    <div className="list timeline">
                                        {notes.data.map((n) => (
                                            <div key={n.noteid} className="note">
                                                <div className="when">
                                                    <span>{shortDate(n.created)}{n.author ? ` · ${n.author}` : ""}</span>
                                                    <button className="icon-btn" style={{ width: 32, height: 32 }} aria-label="Устгах" onClick={async () => {
                                                        if (!confirm("Энэ тэмдэглэлийг устгах уу?")) return;
                                                        const res = await API(`/api/vh/backoffice/students/${id}/notes/${n.noteid}`, { method: "DELETE" });
                                                        if (res.error) return toast.fail(res.error);
                                                        notes.reload();
                                                    }}><Trash2 size={15} /></button>
                                                </div>
                                                <p>{n.body}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {tab === "measure" && <MeasureTab studentId={id} />}
                        {tab === "health" && <HealthTab student={s} injuries={injuries} onEdit={() => setSheet("edit")} />}

                        {tab === "progress" && (
                            <div className="card pad">
                                {!latest ? (
                                    <p className="muted" style={{ margin: "0 0 12px", fontWeight: 600 }}>Сард нэг удаа үзүүлэлт бүрийг 1–5 оноогоор үнэлбэл ахиц нь харагдана.</p>
                                ) : (
                                    <>
                                        <div className="caption" style={{ marginBottom: 8 }}>{periodLabel(latest.period)}</div>
                                        {(skills.data ?? []).map((k) => {
                                            const v = latest.scores[k.skillid] ?? 0;
                                            const was = ratings.data?.[1]?.scores[k.skillid];
                                            return (
                                                <div key={k.skillid} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                                                    <div style={{ width: 112, fontWeight: 700, fontSize: 14 }}>{k.name}</div>
                                                    <div className="bar on-card" style={{ flex: 1, marginTop: 0 }}><span style={{ width: `${v * 20}%`, background: "var(--court)" }} /></div>
                                                    <div className="num" style={{ width: 44, textAlign: "right", fontWeight: 800 }}>
                                                        {v || "—"}{was !== undefined && v > was && <span style={{ color: "var(--present)", fontSize: 12 }}> ▲</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {latest.note && <p style={{ margin: "8px 0 12px", fontSize: 14 }}>{latest.note}</p>}
                                    </>
                                )}
                                <div className="actions">
                                    <button className="btn" onClick={() => setSheet("rating")} disabled={!skills.data?.length}>{latest?.period === currentPeriod() ? "Энэ сарын үнэлгээ засах" : "Энэ сард үнэлэх"}</button>
                                    <Link href="/me#skills" className="btn ghost">Үзүүлэлт засах</Link>
                                </div>
                            </div>
                        )}

                        <button className="btn ghost block danger section" onClick={remove}><Trash2 size={16} /> Бүр мөсөн устгах</button>
                    </>
                )}
            </main>

            <Sheet open={sheet === "edit"} onClose={() => setSheet(null)} title="Мэдээлэл засах">
                {s && <StudentForm student={s} groups={groups.data} onSaved={() => { setSheet(null); kid.reload(); }} />}
            </Sheet>
            <Sheet open={sheet === "note"} onClose={() => setSheet(null)} title="Тэмдэглэл нэмэх">
                <NoteForm studentId={id} onSaved={() => { setSheet(null); setTab("notes"); notes.reload(); }} />
            </Sheet>
            <Sheet open={sheet === "status"} onClose={() => setSheet(null)} title={isLeft ? "Дахин идэвхжүүлэх" : "Гарсан болгох"}>
                {s && <StatusForm student={s} groups={groups.data ?? []} onSaved={() => { setSheet(null); kid.reload(); }} />}
            </Sheet>
            <Sheet open={sheet === "rating"} onClose={() => setSheet(null)} title={`${s?.first_name ?? ""} · ${periodLabel(currentPeriod())}`}>
                <RatingForm studentId={id} skills={skills.data ?? []} initial={latest?.period === currentPeriod() ? latest : undefined}
                    onSaved={() => { setSheet(null); ratings.reload(); }} />
            </Sheet>
            <FeeSheet fee={openFee} onClose={() => setOpenFee(null)} onChanged={() => { setOpenFee(null); fees.reload(); kid.reload(); }} />
        </>
    );
}

function NoteForm({ studentId, onSaved }: { studentId: string; onSaved: () => void }) {
    const toast = useToast();
    const [body, setBody] = useState("");
    const [busy, setBusy] = useState(false);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        const res = await API(`/api/vh/backoffice/students/${studentId}/notes`, { data: { body } });
        setBusy(false);
        if (res.error) return toast.fail(res.error);
        setBody("");
        toast.ok("Тэмдэглэл нэмэгдлээ");
        onSaved();
    };

    return (
        <form onSubmit={save}>
            <label className="field">
                <span>{dayLabel(today())}</span>
                <textarea className="input" rows={5} autoFocus placeholder="Жишээ: Шагай өвдөж, хичээлээс эрт гарсан. Ээжид нь хэлсэн." value={body} onChange={(e) => setBody(e.target.value)} />
            </label>
            <button className="btn primary block" disabled={busy || !body.trim()}>Хадгалах</button>
        </form>
    );
}

// Leaving needs the day they left - the form will not save without it. Coming back re-opens a
// place in a class from the chosen start date.
function StatusForm({ student, groups, onSaved }: { student: Student; groups: Group[]; onSaved: () => void }) {
    const toast = useToast();
    const leaving = student.status !== 3;
    const [date, setDate] = useState("");
    const [groupId, setGroupId] = useState<number | null>(student.groupid ?? null);
    const [tried, setTried] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setDate(leaving ? "" : today());
    }, [leaving]);

    const error = !date ? (leaving ? "Гарсан огноог заавал оруулна уу" : "Эхлэх огноог оруулна уу")
        : leaving && student.start_date && date < student.start_date.slice(0, 10) ? "Эхэлсэн огнооноос өмнө байж болохгүй" : "";

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setTried(true);
        if (error) return;
        setBusy(true);
        const res = await API("/api/vh/backoffice/students", {
            data: {
                ...student,
                status: leaving ? 3 : 1,
                left_date: leaving ? date : null,
                start_date: leaving ? student.start_date : date,
                groupid: leaving ? null : groupId,
                fee_amount: null,
            },
        });
        setBusy(false);
        if (res.error) return toast.fail(res.error);
        toast.ok(leaving ? `${student.first_name} гарсан төлөвт шилжлээ` : `${student.first_name} дахин идэвхжлээ`);
        onSaved();
    };

    return (
        <form onSubmit={save} noValidate>
            {leaving ? (
                <p className="muted" style={{ marginTop: 0, fontWeight: 600 }}>
                    Ангиас хасагдаж, ирцийн жагсаалт, шинэ сарын төлбөрт орохгүй болно. Өмнөх ирц, төлбөрийн түүх хадгалагдана.
                </p>
            ) : (
                <label className="field">
                    <span>Анги</span>
                    <select className="input" value={groupId ?? ""} onChange={(e) => setGroupId(e.target.value ? Number(e.target.value) : null)}>
                        <option value="">Ангигүй</option>
                        {groups.map((g) => <option key={g.groupid} value={g.groupid}>{g.name}</option>)}
                    </select>
                </label>
            )}
            <label className="field">
                <span>{leaving ? "Гарсан огноо" : "Дахин эхэлсэн огноо"}<i className="req">*</i></span>
                <input className={`input${tried && error ? " invalid" : ""}`} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                {tried && error && <span className="field-error">{error}</span>}
            </label>
            <button className={`btn block ${leaving ? "danger" : "primary"}`} disabled={busy}>
                <Check size={18} /> {leaving ? "Гарсан болгох" : "Идэвхжүүлэх"}
            </button>
        </form>
    );
}

function RatingForm({ studentId, skills, initial, onSaved }: { studentId: string; skills: Skill[]; initial?: RatingMonth; onSaved: () => void }) {
    const toast = useToast();
    const [scores, setScores] = useState<Record<number, number>>({});
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const s: Record<number, number> = {};
        for (const [k, v] of Object.entries(initial?.scores ?? {})) s[Number(k)] = v;
        setScores(s);
        setNote(initial?.note ?? "");
    }, [initial]);

    const save = async () => {
        setBusy(true);
        const res = await API(`/api/vh/backoffice/students/${studentId}/ratings`, {
            data: {
                period: currentPeriod(),
                scores: Object.entries(scores)
                    .filter(([skill]) => skills.some((k) => k.skillid === Number(skill)))
                    .map(([skill, score]) => ({ skill: Number(skill), score })),
                note,
            },
        });
        setBusy(false);
        if (res.error) return toast.fail(res.error);
        toast.ok("Үнэлгээ хадгалагдлаа");
        onSaved();
    };

    return (
        <div>
            {skills.map((k) => (
                <div key={k.skillid} style={{ marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>{k.name} {k.hint && <span className="caption">{k.hint}</span>}</div>
                    <div className="stars">
                        {[1, 2, 3, 4, 5].map((n) => (
                            <button key={n} type="button" className={(scores[k.skillid] ?? 0) >= n ? "on" : ""} aria-label={`${k.name} ${n}`}
                                onClick={() => setScores({ ...scores, [k.skillid]: n })}>{n}</button>
                        ))}
                    </div>
                </div>
            ))}
            <label className="field">
                <span>Тэмдэглэл</span>
                <textarea className="input" rows={3} placeholder="Юун дээр анхаарах вэ" value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <button className="btn primary block" disabled={busy || Object.keys(scores).length === 0} onClick={save}>Хадгалах</button>
        </div>
    );
}
