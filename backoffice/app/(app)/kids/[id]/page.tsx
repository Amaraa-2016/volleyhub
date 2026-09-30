"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Pencil, Trash2 } from "lucide-react";
import { TopBar, useData, Loading, ErrorBox, Sheet, useToast } from "@/app/components/ui";
import StudentForm from "@/app/components/StudentForm";
import type { AttendanceSummary, Fee, RatingMonth, Student } from "@/app/types/api";
import { API } from "@/app/utils/API";
import { age, ATTENDANCE, currentPeriod, FEE_STATUS, initials, money, periodLabel, shortDate, SKILLS } from "@/app/utils/format";

export default function KidPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const toast = useToast();
    const kid = useData<Student>(`/api/vh/backoffice/students/${id}`);
    const att = useData<AttendanceSummary>(`/api/vh/backoffice/students/${id}/attendance`);
    const fees = useData<Fee[]>(`/api/vh/backoffice/fees?studentid=${id}`);
    const ratings = useData<RatingMonth[]>(`/api/vh/backoffice/students/${id}/ratings`);
    const [editing, setEditing] = useState(false);
    const [rating, setRating] = useState(false);

    const s = kid.data;
    const a = age(s?.date_of_birth);

    const remove = async () => {
        if (!s || !confirm(`${s.first_name}-г устгах уу? Ирц, төлбөрийн түүх хадгалагдана.`)) return;
        const res = await API(`/api/vh/backoffice/students/${id}`, { method: "DELETE" });
        if (res.error) return toast.fail(res.error);
        toast.ok("Устгалаа");
        router.replace("/kids");
    };

    const latest = ratings.data?.[0];
    const previous = ratings.data?.[1];

    return (
        <>
            <TopBar back="/kids" title={s ? s.first_name : ""} right={s && (
                <button className="icon-btn" aria-label="Засах" onClick={() => setEditing(true)}><Pencil size={20} /></button>
            )} />
            <main className="page">
                {kid.loading && !s ? <Loading rows={4} /> : kid.error ? <ErrorBox code={kid.error} retry={kid.reload} /> : s && (
                    <>
                        <div className="card pad" style={{ display: "flex", gap: 16, alignItems: "center" }}>
                            <div className="avatar lg">{initials(s.last_name, s.first_name)}</div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 800, fontSize: 20, lineHeight: "26px" }}>{s.last_name} {s.first_name}</div>
                                <div className="muted" style={{ fontWeight: 600, fontSize: 14 }}>
                                    {[s.groupname ?? "Бүлэггүй", a !== null ? `${a} настай` : null].filter(Boolean).join(" · ")}
                                </div>
                                {s.balance > 0 && <span className="badge tone-absent" style={{ marginTop: 6 }}>Өртэй {money(s.balance)}</span>}
                            </div>
                        </div>

                        {(s.emergency_phone || s.pay_ref) && (
                            <div className="list" style={{ marginTop: 12 }}>
                                {s.emergency_phone && (
                                    <a href={`tel:${s.emergency_phone}`} className="row">
                                        <Phone size={20} color="var(--court)" />
                                        <div className="grow">
                                            <div className="title num">{s.emergency_phone}</div>
                                            <div className="meta">{[s.emergency_name, s.emergency_relation].filter(Boolean).join(", ") || "Эцэг эх"}</div>
                                        </div>
                                        <span className="badge tone-court">Залгах</span>
                                    </a>
                                )}
                                {s.pay_ref && (
                                    <div className="row">
                                        <div className="grow">
                                            <div className="meta">Гүйлгээний утга</div>
                                            <div className="title">{s.pay_ref}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <section className="section">
                            <div className="section-head">
                                <h2>Ахиц</h2>
                                <button onClick={() => setRating(true)}>{latest?.period === currentPeriod() ? "Засах" : "Энэ сард үнэлэх"}</button>
                            </div>
                            <div className="card pad">
                                {!latest ? (
                                    <p className="muted" style={{ margin: 0, fontWeight: 600 }}>Үнэлгээ хийгээгүй байна. Сард нэг удаа 1–5 оноогоор үнэлбэл ахиц нь харагдана.</p>
                                ) : (
                                    <>
                                        <div className="caption" style={{ marginBottom: 8 }}>{periodLabel(latest.period)}</div>
                                        {SKILLS.map((k) => {
                                            const v = latest.scores[k.id] ?? 0;
                                            const was = previous?.scores[k.id];
                                            return (
                                                <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                                                    <div style={{ width: 112, fontWeight: 700, fontSize: 14 }}>{k.name}</div>
                                                    <div className="bar on-card" style={{ flex: 1, marginTop: 0 }}><span style={{ width: `${v * 20}%`, background: "var(--court)" }} /></div>
                                                    <div className="num" style={{ width: 44, textAlign: "right", fontWeight: 800 }}>
                                                        {v || "—"}
                                                        {was !== undefined && v > was && <span style={{ color: "var(--present)", fontSize: 12 }}> ▲</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {latest.note && <p style={{ margin: "8px 0 0", fontSize: 14 }}>{latest.note}</p>}
                                    </>
                                )}
                            </div>
                        </section>

                        <section className="section">
                            <div className="section-head"><h2>Ирц</h2></div>
                            {att.data && att.data.total > 0 ? (
                                <div className="card pad">
                                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                                        <span style={{ fontSize: 28, fontWeight: 800 }} className="num">{att.data.rate}%</span>
                                        <span className="muted" style={{ fontWeight: 600 }}>ирц · {att.data.total} хичээл</span>
                                    </div>
                                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 12 }}>
                                        {att.data.history.slice(0, 20).reverse().map((h) => (
                                            <span key={h.sessionid} title={`${shortDate(h.session_date)} · ${ATTENDANCE[h.status as 1 | 2 | 3 | 4]?.label ?? ""}`}
                                                className={`tone-${ATTENDANCE[h.status as 1 | 2 | 3 | 4]?.tone ?? "muted"}`}
                                                style={{ width: 18, height: 18, borderRadius: 6, display: "inline-block" }} />
                                        ))}
                                    </div>
                                    <div className="caption" style={{ marginTop: 8 }}>
                                        Ирсэн {att.data.present} · Хоцорсон {att.data.late} · Ирээгүй {att.data.absent} · Чөлөөтэй {att.data.excused}
                                    </div>
                                </div>
                            ) : <div className="card pad muted" style={{ fontWeight: 600 }}>Ирц бүртгэгдээгүй байна.</div>}
                        </section>

                        <section className="section">
                            <div className="section-head"><h2>Төлбөр</h2><Link href="/fees">Бүх төлбөр</Link></div>
                            {fees.data && fees.data.length > 0 ? (
                                <div className="list">
                                    {fees.data.slice(0, 12).map((f) => (
                                        <div key={f.feeid} className="row">
                                            <div className="grow">
                                                <div className="title">{periodLabel(f.period)}</div>
                                                <div className="meta">{f.groupname}{f.payments[0] ? ` · ${shortDate(f.payments[0].paid_at)}` : ""}</div>
                                            </div>
                                            <div className="end">
                                                <div className="amount">{money(f.amount)}</div>
                                                <span className={`badge tone-${FEE_STATUS[f.status].tone}`}>{FEE_STATUS[f.status].label}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <div className="card pad muted" style={{ fontWeight: 600 }}>Төлбөр үүсээгүй байна.</div>}
                        </section>

                        {s.notes && (
                            <section className="section">
                                <div className="section-head"><h2>Тэмдэглэл</h2></div>
                                <div className="card pad" style={{ whiteSpace: "pre-wrap" }}>{s.notes}</div>
                            </section>
                        )}

                        <button className="btn ghost block danger section" onClick={remove}><Trash2 size={16} /> Хүүхдийг устгах</button>
                    </>
                )}
            </main>

            <Sheet open={editing} onClose={() => setEditing(false)} title="Мэдээлэл засах">
                {s && <StudentForm student={s} onSaved={() => { setEditing(false); kid.reload(); }} />}
            </Sheet>

            <Sheet open={rating} onClose={() => setRating(false)} title={`${s?.first_name ?? ""} · ${periodLabel(currentPeriod())}`}>
                <RatingForm
                    studentId={id}
                    initial={latest?.period === currentPeriod() ? latest : undefined}
                    onSaved={() => { setRating(false); ratings.reload(); }}
                />
            </Sheet>
        </>
    );
}

function RatingForm({ studentId, initial, onSaved }: { studentId: string; initial?: RatingMonth; onSaved: () => void }) {
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
                scores: Object.entries(scores).map(([skill, score]) => ({ skill: Number(skill), score })),
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
            {SKILLS.map((k) => (
                <div key={k.id} style={{ marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>{k.name} <span className="caption">{k.hint}</span></div>
                    <div className="stars">
                        {[1, 2, 3, 4, 5].map((n) => (
                            <button key={n} type="button" className={(scores[k.id] ?? 0) >= n ? "on" : ""} aria-label={`${k.name} ${n}`}
                                onClick={() => setScores({ ...scores, [k.id]: n })}>{n}</button>
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
