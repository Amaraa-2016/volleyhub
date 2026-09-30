"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Trash2, Check, Pencil, TrendingUp, TrendingDown } from "lucide-react";
import { useData, Loading, Empty, Sheet, Field, useToast } from "@/app/components/ui";
import { LineChart } from "@/app/components/Charts";
import type { Injury, Measurement, MeasureType, Student } from "@/app/types/api";
import { API } from "@/app/utils/API";
import { shortDate, today } from "@/app/utils/format";

const monthLabel = (d: string) => `${Number(d.slice(5, 7))}/${d.slice(2, 4)}`;

// ---- physical development ------------------------------------------------------

export function MeasureTab({ studentId }: { studentId: string }) {
    const types = useData<MeasureType[]>("/api/vh/backoffice/measure-types");
    const values = useData<Measurement[]>(`/api/vh/backoffice/students/${studentId}/measurements`);
    const toast = useToast();
    const [adding, setAdding] = useState(false);
    const [history, setHistory] = useState<number | null>(null);

    const byType = useMemo(() => {
        const map = new Map<number, Measurement[]>();
        for (const m of values.data ?? []) map.set(m.typeid, [...(map.get(m.typeid) ?? []), m]);
        return map;
    }, [values.data]);

    if ((types.loading && !types.data) || (values.loading && !values.data)) return <Loading rows={2} />;

    const list = types.data ?? [];
    const remove = async (m: Measurement) => {
        if (!confirm("Энэ утгыг устгах уу?")) return;
        const res = await API(`/api/vh/backoffice/students/${studentId}/measurements/${m.measureid}`, { method: "DELETE" });
        if (res.error) return toast.fail(res.error);
        values.reload();
    };

    return (
        <>
            <button className="btn primary block" style={{ marginBottom: 12 }} onClick={() => setAdding(true)} disabled={list.length === 0}>
                <Plus size={18} /> Хэмжилт оруулах
            </button>
            {list.length === 0 ? (
                <div className="card"><Empty title="Хэмжилтийн төрөл алга"><Link href="/me#measures" className="btn">Тохиргоо</Link></Empty></div>
            ) : (
                <div className="stack">
                    {list.map((t) => {
                        const pts = byType.get(t.typeid) ?? [];
                        const first = pts[0], last = pts[pts.length - 1];
                        const change = pts.length > 1 ? last.value - first.value : 0;
                        const better = t.higher_is_better ? change > 0 : change < 0;
                        return (
                            <div key={t.typeid} className="card pad">
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                                    <strong>{t.name}{t.unit ? ` (${t.unit})` : ""}</strong>
                                    {pts.length > 1 && change !== 0 && (
                                        <span className={`badge tone-${better ? "present" : "sun"}`}>
                                            {change > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                            {change > 0 ? "+" : ""}{Math.round(change * 10) / 10} {t.unit} · {shortDate(first.measured_on)}-с хойш
                                        </span>
                                    )}
                                </div>
                                {pts.length === 0 ? (
                                    <p className="muted" style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Хэмжээгүй байна</p>
                                ) : (
                                    <>
                                        <LineChart points={pts.map((p) => ({ label: monthLabel(p.measured_on), value: p.value }))} unit={t.unit} />
                                        <button className="btn ghost sm" style={{ paddingLeft: 0 }} onClick={() => setHistory(history === t.typeid ? null : t.typeid)}>
                                            {history === t.typeid ? "Хураах" : `Бүх утга (${pts.length})`}
                                        </button>
                                        {history === t.typeid && (
                                            <div className="list" style={{ marginTop: 4 }}>
                                                {[...pts].reverse().map((m) => (
                                                    <div key={m.measureid} className="row" style={{ minHeight: 48 }}>
                                                        <div className="grow">
                                                            <div className="title num">{m.value} {t.unit}</div>
                                                            <div className="meta">{shortDate(m.measured_on)}{m.note ? ` · ${m.note}` : ""}</div>
                                                        </div>
                                                        <button className="icon-btn" aria-label="Устгах" onClick={() => remove(m)}><Trash2 size={16} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            <Sheet open={adding} onClose={() => setAdding(false)} title="Хэмжилт оруулах">
                <MeasureForm studentId={studentId} types={list} last={byType} onSaved={() => { setAdding(false); values.reload(); }} />
            </Sheet>
        </>
    );
}

function MeasureForm({ studentId, types, last, onSaved }: {
    studentId: string;
    types: MeasureType[];
    last: Map<number, Measurement[]>;
    onSaved: () => void;
}) {
    const toast = useToast();
    const [day, setDay] = useState(today());
    const [vals, setVals] = useState<Record<number, string>>({});
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        const res = await API(`/api/vh/backoffice/students/${studentId}/measurements`, {
            data: {
                measured_on: day,
                note,
                values: Object.entries(vals).filter(([, v]) => Number(v) > 0).map(([typeid, v]) => ({ typeid: Number(typeid), value: Number(v) })),
            },
        });
        setBusy(false);
        if (res.error) return toast.fail(res.error);
        toast.ok("Хэмжилт хадгалагдлаа");
        onSaved();
    };

    return (
        <form onSubmit={save}>
            <Field label="Огноо"><input className="input" type="date" value={day} max={today()} onChange={(e) => setDay(e.target.value)} /></Field>
            <div className="grid-2">
                {types.map((t) => {
                    const prev = last.get(t.typeid)?.slice(-1)[0];
                    return (
                        <label key={t.typeid} className="field">
                            <span>{t.name}{t.unit ? ` (${t.unit})` : ""}</span>
                            <input className="input num" inputMode="decimal" placeholder={prev ? `Өмнө: ${prev.value}` : ""}
                                value={vals[t.typeid] ?? ""} onChange={(e) => setVals({ ...vals, [t.typeid]: e.target.value.replace(",", ".").replace(/[^\d.]/g, "") })} />
                        </label>
                    );
                })}
            </div>
            <Field label="Тэмдэглэл"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Заавал биш" /></Field>
            <button className="btn primary block" disabled={busy || !Object.values(vals).some((v) => Number(v) > 0)}>Хадгалах</button>
        </form>
    );
}

// ---- health and safety -------------------------------------------------------

export function HealthTab({ student, injuries, onEdit }: {
    student: Student;
    injuries: { data?: Injury[]; loading: boolean; reload: () => void };
    onEdit: () => void;
}) {
    const toast = useToast();
    const [open, setOpen] = useState<Injury | "new" | null>(null);

    const recover = async (i: Injury) => {
        const res = await API(`/api/vh/backoffice/students/${student.studentid}/injuries`, {
            data: { ...i, occurred_on: i.occurred_on.slice(0, 10), status: 2, recovered_on: today() },
        });
        if (res.error) return toast.fail(res.error);
        toast.ok("Эдгэрсэн гэж тэмдэглэлээ");
        injuries.reload();
    };

    return (
        <>
            <div className="card pad" style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>Эрүүл мэндийн мэдээлэл</strong>
                    <button className="icon-btn" aria-label="Засах" onClick={onEdit}><Pencil size={18} /></button>
                </div>
                <dl className="kv" style={{ marginTop: 8 }}>
                    <dt>Харшил</dt><dd style={{ color: student.allergies ? "var(--absent)" : undefined }}>{student.allergies || "Байхгүй"}</dd>
                    <dt>Цусны бүлэг</dt><dd>{student.blood_type || "—"}</dd>
                    <dt>Өвчин, эм</dt><dd style={{ whiteSpace: "pre-wrap" }}>{student.medical_notes || "—"}</dd>
                    <dt>Яаралтай үед</dt>
                    <dd>{student.emergency_phone ? <a href={`tel:${student.emergency_phone}`} style={{ color: "var(--court)" }}>{[student.emergency_relation, student.emergency_name].filter(Boolean).join(" ")} {student.emergency_phone}</a> : "—"}</dd>
                </dl>
            </div>

            <div className="section-head">
                <h2>Гэмтлийн бүртгэл</h2>
                <button onClick={() => setOpen("new")}>+ Бүртгэх</button>
            </div>
            {injuries.loading && !injuries.data ? <Loading rows={1} /> : !injuries.data?.length ? (
                <div className="card"><Empty title="Гэмтэл бүртгэгдээгүй" /></div>
            ) : (
                <div className="list">
                    {injuries.data.map((i) => (
                        <div key={i.injuryid} className="row" style={{ alignItems: "flex-start" }}>
                            <button onClick={() => setOpen(i)} style={{ all: "unset", flex: 1, minWidth: 0, cursor: "pointer" }}>
                                <div className="title">{i.body_part || "Гэмтэл"}</div>
                                <div className="meta" style={{ whiteSpace: "normal" }}>
                                    {shortDate(i.occurred_on)} · {i.description}
                                    {i.status === 2 && i.recovered_on ? ` · ${shortDate(i.recovered_on)}-нд эдгэрсэн` : ""}
                                </div>
                            </button>
                            {i.status === 1 ? (
                                <button className="btn sm" onClick={() => recover(i)}><Check size={16} /> Эдгэрсэн</button>
                            ) : <span className="badge tone-present">Эдгэрсэн</span>}
                        </div>
                    ))}
                </div>
            )}

            <Sheet open={open !== null} onClose={() => setOpen(null)} title={open === "new" ? "Гэмтэл бүртгэх" : "Гэмтэл"}>
                {open !== null && (
                    <InjuryForm studentId={student.studentid} injury={open === "new" ? null : open}
                        onSaved={() => { setOpen(null); injuries.reload(); }} />
                )}
            </Sheet>
        </>
    );
}

function InjuryForm({ studentId, injury, onSaved }: { studentId: number; injury: Injury | null; onSaved: () => void }) {
    const toast = useToast();
    const [f, setF] = useState({
        occurred_on: injury?.occurred_on.slice(0, 10) ?? today(),
        body_part: injury?.body_part ?? "",
        description: injury?.description ?? "",
        status: injury?.status ?? 1,
        recovered_on: injury?.recovered_on?.slice(0, 10) ?? "",
    });
    const [busy, setBusy] = useState(false);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        const res = await API(`/api/vh/backoffice/students/${studentId}/injuries`, {
            data: { injuryid: injury?.injuryid ?? 0, ...f, recovered_on: f.status === 2 ? f.recovered_on || today() : null },
        });
        setBusy(false);
        if (res.error) return toast.fail(res.error);
        toast.ok("Хадгаллаа");
        onSaved();
    };

    const remove = async () => {
        if (!injury || !confirm("Энэ бүртгэлийг устгах уу?")) return;
        const res = await API(`/api/vh/backoffice/students/${studentId}/injuries/${injury.injuryid}`, { method: "DELETE" });
        if (res.error) return toast.fail(res.error);
        onSaved();
    };

    return (
        <form onSubmit={save}>
            <div className="grid-2">
                <Field label="Огноо"><input className="input" type="date" value={f.occurred_on} max={today()} onChange={(e) => setF({ ...f, occurred_on: e.target.value })} /></Field>
                <Field label="Хаана"><input className="input" placeholder="Шагай, бугуй…" value={f.body_part} onChange={(e) => setF({ ...f, body_part: e.target.value })} /></Field>
            </div>
            <Field label="Юу болсон">
                <textarea className="input" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Жишээ: Давхар дамжуулалтын үеэр шагайгаа мушгисан. Мөс тавьсан, ээжид нь мэдэгдсэн." />
            </Field>
            <div className="seg" style={{ marginBottom: 16 }}>
                <button type="button" className={f.status === 1 ? "on" : ""} onClick={() => setF({ ...f, status: 1 })}>Эдгэрч байгаа</button>
                <button type="button" className={f.status === 2 ? "on" : ""} onClick={() => setF({ ...f, status: 2, recovered_on: f.recovered_on || today() })}>Эдгэрсэн</button>
            </div>
            {f.status === 2 && (
                <Field label="Эдгэрсэн огноо"><input className="input" type="date" value={f.recovered_on} onChange={(e) => setF({ ...f, recovered_on: e.target.value })} /></Field>
            )}
            <button className="btn primary block" disabled={busy || !f.description.trim()}>Хадгалах</button>
            {injury && <button type="button" className="btn ghost block danger" style={{ marginTop: 8 }} onClick={remove}><Trash2 size={16} /> Устгах</button>}
        </form>
    );
}
