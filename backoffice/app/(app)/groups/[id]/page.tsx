"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, UserPlus, UserMinus, CalendarPlus, Search } from "lucide-react";
import { TopBar, useData, Loading, ErrorBox, Empty, Sheet, Field, useToast } from "@/app/components/ui";
import GroupForm from "@/app/components/GroupForm";
import StudentForm from "@/app/components/StudentForm";
import type { Group, RosterEntry, Student } from "@/app/types/api";
import { API } from "@/app/utils/API";
import { addDays, age, hhmm, initials, money, shortName, toMinutes, today, WEEKDAYS, WEEKDAYS_SHORT, WEEK_ORDER } from "@/app/utils/format";

export default function GroupPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const toast = useToast();
    const group = useData<Group>(`/api/vh/backoffice/groups/${id}`);
    const roster = useData<RosterEntry[]>(`/api/vh/backoffice/groups/${id}/students`);
    const [sheet, setSheet] = useState<null | "edit" | "slot" | "add" | "new">(null);
    const [busy, setBusy] = useState(false);

    const g = group.data;

    const removeSlot = async (scheduleid: number) => {
        const res = await API(`/api/vh/backoffice/schedule/${scheduleid}`, { method: "DELETE" });
        if (res.error) return toast.fail(res.error);
        group.reload();
    };

    const unenroll = async (r: RosterEntry) => {
        if (!confirm(`${r.first_name}-г бүлгээс хасах уу?`)) return;
        const res = await API(`/api/vh/backoffice/groups/${id}/students/${r.studentid}`, { method: "DELETE" });
        if (res.error) return toast.fail(res.error);
        toast.ok("Бүлгээс хаслаа");
        roster.reload();
        group.reload();
    };

    const generate = async () => {
        setBusy(true);
        const res = await API<{ created: number }>("/api/vh/backoffice/sessions/generate", {
            data: { groupid: Number(id), from: today(), to: addDays(today(), 34) },
        });
        setBusy(false);
        if (res.error) return toast.fail(res.error);
        toast.ok(res.data?.created ? `Ирэх 5 долоо хоногт ${res.data.created} хичээл нэмэгдлээ` : "Хичээлүүд аль хэдийн үүссэн байна");
    };

    const archive = async () => {
        if (!g || !confirm(`"${g.name}" бүлгийг устгах уу? Өмнөх ирц, төлбөр хадгалагдана.`)) return;
        const res = await API(`/api/vh/backoffice/groups/${id}`, { method: "DELETE" });
        if (res.error) return toast.fail(res.error);
        toast.ok("Бүлэг устлаа");
        router.replace("/groups");
    };

    const reloadAll = () => { roster.reload(); group.reload(); };

    return (
        <>
            <TopBar back="/groups" title={g?.name ?? ""} sub={g ? [g.agegroup && `${g.agegroup} нас`, g.level].filter(Boolean).join(" · ") || undefined : undefined}
                right={g && <button className="icon-btn" aria-label="Засах" onClick={() => setSheet("edit")}><Pencil size={20} /></button>} />
            <main className="page">
                {group.loading && !g ? <Loading rows={4} /> : group.error ? <ErrorBox code={group.error} retry={group.reload} /> : g && (
                    <>
                        <div className="stats">
                            <div className="card stat">
                                <div className="label">Хүүхэд</div>
                                <div className="value">{g.studentcount}{g.capacity ? <small> / {g.capacity}</small> : null}</div>
                            </div>
                            <div className="card stat">
                                <div className="label">Сарын төлбөр</div>
                                <div className="value" style={{ fontSize: 20 }}>{money(g.fee_amount)}</div>
                            </div>
                        </div>

                        <section className="section">
                            <div className="section-head">
                                <h2>Долоо хоногийн хуваарь</h2>
                                <button onClick={() => setSheet("slot")}>+ Нэмэх</button>
                            </div>
                            {g.schedule.length === 0 ? (
                                <div className="card"><Empty title="Хуваарь алга" text="Аль гарагт хэдэн цагт хичээллэдгээ оруулбал ирцийн хуудас автоматаар гарна." /></div>
                            ) : (
                                <>
                                    <div className="list">
                                        {[...g.schedule].sort((a, b) => WEEK_ORDER.indexOf(a.weekday) - WEEK_ORDER.indexOf(b.weekday) || a.start_minute - b.start_minute).map((s) => (
                                            <div key={s.scheduleid} className="row">
                                                <div className="time-pill">{WEEKDAYS_SHORT[s.weekday]}</div>
                                                <div className="grow">
                                                    <div className="title">{WEEKDAYS[s.weekday]}</div>
                                                    <div className="meta num">{hhmm(s.start_minute)} – {hhmm(s.end_minute)}</div>
                                                </div>
                                                <button className="icon-btn" aria-label="Устгах" onClick={() => removeSlot(s.scheduleid)}><Trash2 size={18} /></button>
                                            </div>
                                        ))}
                                    </div>
                                    <button className="btn block" style={{ marginTop: 12 }} disabled={busy} onClick={generate}>
                                        <CalendarPlus size={18} /> Ирэх 5 долоо хоногийн хичээл үүсгэх
                                    </button>
                                </>
                            )}
                        </section>

                        <section className="section">
                            <div className="section-head">
                                <h2>Хүүхдүүд</h2>
                                <button onClick={() => setSheet("add")}>+ Нэмэх</button>
                            </div>
                            {roster.loading && !roster.data ? <Loading /> : !roster.data?.length ? (
                                <div className="card">
                                    <Empty title="Хүүхэд алга">
                                        <button className="btn primary" onClick={() => setSheet("new")}><UserPlus size={18} /> Хүүхэд нэмэх</button>
                                    </Empty>
                                </div>
                            ) : (
                                <div className="list">
                                    {roster.data.map((r) => {
                                        const a = age(r.date_of_birth);
                                        return (
                                            <div key={r.enrollmentid} className="row">
                                                <Link href={`/kids/${r.studentid}`} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                                                    <div className="avatar">{initials(r.last_name, r.first_name)}</div>
                                                    <div className="grow">
                                                        <div className="title">{shortName(r.last_name, r.first_name)}</div>
                                                        <div className="meta">{[a !== null ? `${a} настай` : null, r.fee_amount !== g.fee_amount ? `${money(r.fee_amount)}/сар` : null].filter(Boolean).join(" · ") || " "}</div>
                                                    </div>
                                                </Link>
                                                <button className="icon-btn" aria-label="Бүлгээс хасах" onClick={() => unenroll(r)}><UserMinus size={18} /></button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        <button className="btn ghost block danger section" onClick={archive}><Trash2 size={16} /> Бүлгийг устгах</button>
                    </>
                )}
            </main>

            <Sheet open={sheet === "edit"} onClose={() => setSheet(null)} title="Бүлэг засах">
                {g && <GroupForm group={g} onSaved={() => { setSheet(null); group.reload(); }} />}
            </Sheet>
            <Sheet open={sheet === "slot"} onClose={() => setSheet(null)} title="Хичээлийн цаг нэмэх">
                <SlotForm groupId={Number(id)} onSaved={() => { setSheet(null); group.reload(); }} />
            </Sheet>
            <Sheet open={sheet === "add"} onClose={() => setSheet(null)} title="Бүлэгт хүүхэд нэмэх">
                <AddExisting groupId={id} inGroup={(roster.data ?? []).map((r) => r.studentid)} onNew={() => setSheet("new")} onAdded={reloadAll} />
            </Sheet>
            <Sheet open={sheet === "new"} onClose={() => setSheet(null)} title="Шинэ хүүхэд">
                <StudentForm groupId={Number(id)} onSaved={() => { setSheet(null); reloadAll(); }} />
            </Sheet>
        </>
    );
}

function SlotForm({ groupId, onSaved }: { groupId: number; onSaved: () => void }) {
    const toast = useToast();
    const [days, setDays] = useState<number[]>([]);
    const [start, setStart] = useState("18:00");
    const [end, setEnd] = useState("19:30");
    const [busy, setBusy] = useState(false);

    // Several days at once: most groups train the same hour on two or three days.
    const save = async () => {
        setBusy(true);
        for (const weekday of days) {
            const res = await API("/api/vh/backoffice/schedule", {
                data: { scheduleid: 0, groupid: groupId, weekday, start_minute: toMinutes(start), end_minute: toMinutes(end), isactive: true },
            });
            if (res.error) {
                setBusy(false);
                return toast.fail(res.error);
            }
        }
        setBusy(false);
        setDays([]);
        toast.ok("Хуваарь нэмэгдлээ");
        onSaved();
    };

    return (
        <div>
            <div className="field">
                <span style={{ display: "block", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Гараг</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                    {WEEK_ORDER.map((d) => (
                        <button key={d} type="button" className={`chip${days.includes(d) ? " on" : ""}`} style={{ padding: 0 }}
                            onClick={() => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d])}>
                            {WEEKDAYS_SHORT[d]}
                        </button>
                    ))}
                </div>
            </div>
            <div className="grid-2">
                <Field label="Эхлэх"><input className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
                <Field label="Дуусах"><input className="input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
            </div>
            <button className="btn primary block" disabled={busy || days.length === 0} onClick={save}><Plus size={18} /> Нэмэх</button>
        </div>
    );
}

function AddExisting({ groupId, inGroup, onNew, onAdded }: { groupId: string; inGroup: number[]; onNew: () => void; onAdded: () => void }) {
    const toast = useToast();
    const all = useData<Student[]>("/api/vh/backoffice/students");
    const [q, setQ] = useState("");
    const [added, setAdded] = useState<number[]>([]);

    const candidates = useMemo(() => {
        const seen = new Set<number>();
        const term = q.trim().toLowerCase();
        return (all.data ?? []).filter((s) => {
            if (seen.has(s.studentid) || inGroup.includes(s.studentid)) return false;
            seen.add(s.studentid);
            return !term || `${s.last_name} ${s.first_name}`.toLowerCase().includes(term);
        });
    }, [all.data, inGroup, q]);

    const add = async (s: Student) => {
        const res = await API(`/api/vh/backoffice/groups/${groupId}/students`, { data: { studentid: s.studentid } });
        if (res.error) return toast.fail(res.error);
        setAdded([...added, s.studentid]);
        onAdded();
    };

    return (
        <div>
            <button className="btn primary block" onClick={onNew}><UserPlus size={18} /> Шинэ хүүхэд бүртгэх</button>
            {candidates.length > 0 && (
                <>
                    <p className="caption" style={{ margin: "16px 0 4px" }}>Эсвэл бүртгэлтэй хүүхдээс сонгох</p>
                    <div className="search">
                        <Search size={18} />
                        <input className="input" placeholder="Нэрээр хайх" value={q} onChange={(e) => setQ(e.target.value)} />
                    </div>
                    <div className="list">
                        {candidates.slice(0, 30).map((s) => (
                            <div key={s.studentid} className="row">
                                <div className="avatar">{initials(s.last_name, s.first_name)}</div>
                                <div className="grow">
                                    <div className="title">{shortName(s.last_name, s.first_name)}</div>
                                    <div className="meta">{s.groupname ?? "Бүлэггүй"}</div>
                                </div>
                                {added.includes(s.studentid)
                                    ? <span className="badge tone-present">Нэмсэн</span>
                                    : <button className="btn sm" onClick={() => add(s)}>Нэмэх</button>}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
