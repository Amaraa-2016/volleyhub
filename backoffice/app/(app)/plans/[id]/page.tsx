"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown, Trash2, Plus, Search, Library } from "lucide-react";
import { TopBar, useData, Loading, ErrorBox, Sheet, Field, Empty, useToast } from "@/app/components/ui";
import type { Drill, Plan, Skill } from "@/app/types/api";
import { API } from "@/app/utils/API";

interface Step { key: number; drillid: number | null; title: string; minutes: number }

let seq = 0;
const nextKey = () => ++seq;

// Build a lesson: steps from the drill library or typed in, in order, with minutes. The total
// is kept in view so the plan fits the class's hour.
export default function PlanEditor({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const isNew = id === "new";
    const router = useRouter();
    const toast = useToast();
    const plan = useData<Plan>(isNew ? null : `/api/vh/backoffice/plans/${id}`);
    const drills = useData<Drill[]>("/api/vh/backoffice/drills");
    const skills = useData<Skill[]>("/api/vh/backoffice/skills");
    const [name, setName] = useState("");
    const [notes, setNotes] = useState("");
    const [steps, setSteps] = useState<Step[]>([]);
    const [picking, setPicking] = useState(false);
    const [busy, setBusy] = useState(false);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        if (!plan.data) return;
        setName(plan.data.name);
        setNotes(plan.data.notes ?? "");
        setSteps(plan.data.items.map((i) => ({ key: nextKey(), drillid: i.drillid ?? null, title: i.title, minutes: i.minutes })));
    }, [plan.data]);

    const total = steps.reduce((n, s) => n + (s.minutes || 0), 0);
    const change = (next: Step[]) => { setSteps(next); setDirty(true); };
    const update = (key: number, patch: Partial<Step>) => change(steps.map((s) => (s.key === key ? { ...s, ...patch } : s)));
    const move = (i: number, dir: -1 | 1) => {
        const j = i + dir;
        if (j < 0 || j >= steps.length) return;
        const next = [...steps];
        [next[i], next[j]] = [next[j], next[i]];
        change(next);
    };

    const save = async () => {
        setBusy(true);
        const res = await API<{ planid: number }>("/api/vh/backoffice/plans", {
            data: {
                planid: isNew ? 0 : Number(id), name, notes,
                items: steps.map((s) => ({ drillid: s.drillid, title: s.title, minutes: s.minutes })),
            },
        });
        setBusy(false);
        if (res.error || !res.data) return toast.fail(res.error);
        setDirty(false);
        toast.ok("Төлөвлөгөө хадгалагдлаа");
        if (isNew) router.replace(`/plans/${res.data.planid}`);
        else plan.reload();
    };

    const remove = async () => {
        if (!confirm(`"${name}" төлөвлөгөөг устгах уу?`)) return;
        const res = await API(`/api/vh/backoffice/plans/${id}`, { method: "DELETE" });
        if (res.error) return toast.fail(res.error);
        router.replace("/plans");
    };

    if (!isNew && plan.loading && !plan.data) return <><TopBar back="/plans" title="" /><main className="page"><Loading rows={4} /></main></>;
    if (!isNew && plan.error) return <><TopBar back="/plans" title="" /><main className="page"><ErrorBox code={plan.error} retry={plan.reload} /></main></>;

    return (
        <>
            <TopBar back="/plans" title={isNew ? "Шинэ төлөвлөгөө" : name || "Төлөвлөгөө"} sub={`${total} минут · ${steps.length} алхам`} />
            <main className="page">
                <div className="form-section">
                    <Field label="Нэр"><input className="input" autoFocus={isNew} placeholder="Жишээ: Анхан шат - дамжуулалтын өдөр" value={name} onChange={(e) => { setName(e.target.value); setDirty(true); }} /></Field>
                    <Field label="Тэмдэглэл"><textarea className="input" rows={2} value={notes} onChange={(e) => { setNotes(e.target.value); setDirty(true); }} placeholder="Зорилго, анхаарах зүйл" /></Field>
                </div>

                <div className="section-head" style={{ marginTop: 16 }}>
                    <h2>Алхамууд</h2>
                    <span className="caption">Нийт {total} мин</span>
                </div>
                {steps.length === 0 ? (
                    <div className="card"><Empty title="Алхам алга" text="Дасгалын сангаас сонгох эсвэл өөрөө бичиж нэмнэ." /></div>
                ) : (
                    <div className="list">
                        {steps.map((s, i) => (
                            <div key={s.key} className="row" style={{ gap: 8 }}>
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                    <button className="icon-btn" style={{ height: 24 }} aria-label="Дээш" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={16} /></button>
                                    <button className="icon-btn" style={{ height: 24 }} aria-label="Доош" disabled={i === steps.length - 1} onClick={() => move(i, 1)}><ArrowDown size={16} /></button>
                                </div>
                                <input className="input" style={{ flex: 1, minWidth: 0 }} value={s.title} onChange={(e) => update(s.key, { title: e.target.value })} aria-label="Алхам" />
                                <input className="input num" style={{ width: 64, textAlign: "center", padding: "10px 6px" }} inputMode="numeric" aria-label="Минут"
                                    value={s.minutes || ""} onChange={(e) => update(s.key, { minutes: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })} />
                                <button className="icon-btn" aria-label="Хасах" onClick={() => change(steps.filter((x) => x.key !== s.key))}><Trash2 size={18} /></button>
                            </div>
                        ))}
                    </div>
                )}
                <div className="actions" style={{ marginTop: 12 }}>
                    <button className="btn" onClick={() => setPicking(true)}><Library size={18} /> Сангаас нэмэх</button>
                    <button className="btn" onClick={() => change([...steps, { key: nextKey(), drillid: null, title: "", minutes: 5 }])}><Plus size={18} /> Өөрөө бичих</button>
                </div>

                <button className="btn primary block section" disabled={busy || !name.trim() || (!dirty && !isNew)} onClick={save}>
                    {!dirty && !isNew ? "Хадгалсан" : "Хадгалах"}
                </button>
                {!isNew && <button className="btn ghost block danger" style={{ marginTop: 8 }} onClick={remove}><Trash2 size={16} /> Устгах</button>}
            </main>

            <Sheet open={picking} onClose={() => setPicking(false)} title="Дасгалын сангаас">
                <DrillPicker drills={drills.data ?? []} skills={skills.data ?? []} loading={drills.loading && !drills.data}
                    onPick={(d) => change([...steps, { key: nextKey(), drillid: d.drillid, title: d.name, minutes: d.minutes }])} />
            </Sheet>
        </>
    );
}

function DrillPicker({ drills, skills, loading, onPick }: { drills: Drill[]; skills: Skill[]; loading: boolean; onPick: (d: Drill) => void }) {
    const [q, setQ] = useState("");
    const [skill, setSkill] = useState<number | null>(null);
    const [added, setAdded] = useState<number[]>([]);
    const shown = useMemo(() => drills.filter((d) =>
        (!skill || d.skillids.includes(skill)) && (!q.trim() || d.name.toLowerCase().includes(q.trim().toLowerCase()))), [drills, q, skill]);

    if (loading) return <Loading />;
    if (drills.length === 0) return <Empty title="Дасгалын сан хоосон" text="Төлөвлөгөө → Дасгалын сан хэсэгт дасгалаа нэмнэ үү." />;
    return (
        <div>
            <div className="search"><Search size={18} /><input className="input" placeholder="Хайх" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            {skills.length > 0 && (
                <div className="chips" style={{ marginBottom: 12 }}>
                    <button className={`chip${skill === null ? " on" : ""}`} onClick={() => setSkill(null)}>Бүгд</button>
                    {skills.map((k) => <button key={k.skillid} className={`chip${skill === k.skillid ? " on" : ""}`} onClick={() => setSkill(k.skillid)}>{k.name}</button>)}
                </div>
            )}
            <div className="list">
                {shown.map((d) => (
                    <div key={d.drillid} className="row">
                        <div className="time-pill">{d.minutes}<small>мин</small></div>
                        <div className="grow">
                            <div className="title">{d.name}</div>
                            {d.description && <div className="meta">{d.description}</div>}
                        </div>
                        <button className="btn sm" onClick={() => { onPick(d); setAdded([...added, d.drillid]); }}>
                            {added.includes(d.drillid) ? "+1" : "Нэмэх"}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
