"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, UserPlus, CalendarPlus, Search, ClipboardCheck, Send, Phone } from "lucide-react";
import { TopBar, useData, Loading, ErrorBox, Empty, Sheet, Field, useToast } from "@/app/components/ui";
import GroupForm from "@/app/components/GroupForm";
import StudentForm from "@/app/components/StudentForm";
import InvoiceSheet from "@/app/components/InvoiceSheet";
import type { Group, RosterEntry, Student } from "@/app/types/api";
import { API } from "@/app/utils/API";
import { addDays, ageOf, hhmm, initials, money, shortDate, shortName, toMinutes, today, WEEKDAYS, WEEKDAYS_SHORT, WEEK_ORDER } from "@/app/utils/format";

type Tab = "active" | "left" | "schedule";

// A class is where the coach works: its children, and the three things done to them - take the
// register, send the month's invoices, add a child.
export default function GroupPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const toast = useToast();
    const group = useData<Group>(`/api/vh/backoffice/groups/${id}`);
    const roster = useData<RosterEntry[]>(`/api/vh/backoffice/groups/${id}/students?includeLeft=true`);
    const [tab, setTab] = useState<Tab>("active");
    const [sheet, setSheet] = useState<null | "edit" | "slot" | "existing" | "new" | "invoice">(null);
    const [busy, setBusy] = useState(false);
    const [q, setQ] = useState("");

    const g = group.data;
    const active = useMemo(() => (roster.data ?? []).filter((r) => r.active), [roster.data]);
    const left = useMemo(() => (roster.data ?? []).filter((r) => !r.active), [roster.data]);
    const owed = active.reduce((sum, r) => sum + r.balance, 0);

    const shown = (tab === "left" ? left : active).filter((r) => {
        const term = q.trim().toLowerCase();
        return !term || `${r.last_name} ${r.first_name} ${r.emergency_phone ?? ""}`.toLowerCase().includes(term);
    });

    const takeAttendance = async () => {
        setBusy(true);
        const res = await API<{ sessionid: number }>(`/api/vh/backoffice/groups/${id}/sessions/today`, { data: { date: today() } });
        setBusy(false);
        if (res.error || !res.data) return toast.fail(res.error);
        router.push(`/attendance/${res.data.sessionid}`);
    };

    const removeSlot = async (scheduleid: number) => {
        const res = await API(`/api/vh/backoffice/schedule/${scheduleid}`, { method: "DELETE" });
        if (res.error) return toast.fail(res.error);
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
        if (!g || !confirm(`"${g.name}" ангийг устгах уу? Өмнөх ирц, төлбөр хадгалагдана.`)) return;
        const res = await API(`/api/vh/backoffice/groups/${id}`, { method: "DELETE" });
        if (res.error) return toast.fail(res.error);
        toast.ok("Анги устлаа");
        router.replace("/groups");
    };

    const reloadAll = () => { roster.reload(); group.reload(); };

    return (
        <>
            <TopBar back="/groups" title={g?.name ?? ""}
                sub={g ? [g.agegroup && `${g.agegroup} нас`, g.level].filter(Boolean).join(" · ") || "Анги" : undefined}
                right={g && <button className="icon-btn" aria-label="Анги засах" onClick={() => setSheet("edit")}><Pencil size={20} /></button>} />
            <main className="page">
                {group.loading && !g ? <Loading rows={4} /> : group.error ? <ErrorBox code={group.error} retry={group.reload} /> : g && (
                    <>
                        <div className="stats">
                            <div className="card stat">
                                <div className="label">Идэвхтэй хүүхэд</div>
                                <div className="value">{active.length}{g.capacity ? <small> / {g.capacity}</small> : null}</div>
                            </div>
                            <div className="card stat">
                                <div className="label">Төлөгдөөгүй</div>
                                <div className="value" style={{ fontSize: 20, color: owed > 0 ? "var(--absent)" : undefined }}>{money(owed)}</div>
                            </div>
                        </div>

                        <div className="action-grid" style={{ marginTop: 12 }}>
                            <button className="action-tile primary" disabled={busy} onClick={takeAttendance}>
                                <span className="ico"><ClipboardCheck size={22} /></span>Ирц бүртгэх
                            </button>
                            <button className="action-tile" onClick={() => setSheet("invoice")}>
                                <span className="ico tone-brand"><Send size={20} /></span>Нэхэмжлэх илгээх
                            </button>
                            <button className="action-tile" onClick={() => setSheet("new")}>
                                <span className="ico tone-court"><UserPlus size={20} /></span>Хүүхэд бүртгэх
                            </button>
                        </div>

                        <div className="tabs" role="tablist">
                            <button className={tab === "active" ? "on" : ""} onClick={() => setTab("active")}>Хүүхдүүд<span className="count">{active.length}</span></button>
                            <button className={tab === "left" ? "on" : ""} onClick={() => setTab("left")}>Гарсан<span className="count">{left.length}</span></button>
                            <button className={tab === "schedule" ? "on" : ""} onClick={() => setTab("schedule")}>Хуваарь</button>
                        </div>

                        {tab === "schedule" ? (
                            <>
                                {g.schedule.length === 0 ? (
                                    <div className="card"><Empty title="Хуваарь алга" text="Аль гарагт хэдэн цагт хичээллэдгээ оруулбал ирцийн хуудас автоматаар гарна." /></div>
                                ) : (
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
                                )}
                                <div className="actions" style={{ marginTop: 12 }}>
                                    <button className="btn" onClick={() => setSheet("slot")}><Plus size={18} /> Цаг нэмэх</button>
                                    {g.schedule.length > 0 && (
                                        <button className="btn" disabled={busy} onClick={generate}><CalendarPlus size={18} /> 5 долоо хоногийн хичээл үүсгэх</button>
                                    )}
                                </div>
                                <button className="btn ghost block danger section" onClick={archive}><Trash2 size={16} /> Ангийг устгах</button>
                            </>
                        ) : (
                            <>
                                {(roster.data?.length ?? 0) > 8 && (
                                    <div className="search">
                                        <Search size={18} />
                                        <input className="input" placeholder="Хүүхэд хайх" value={q} onChange={(e) => setQ(e.target.value)} />
                                    </div>
                                )}
                                {roster.loading && !roster.data ? <Loading /> : shown.length === 0 ? (
                                    <div className="card">
                                        {tab === "left" ? <Empty title="Гарсан хүүхэд алга" /> : q ? <Empty title="Илэрц алга" /> : (
                                            <Empty title="Хүүхэд бүртгээгүй байна" text="Энэ ангид хамрагдаж буй хүүхдүүдээ бүртгэнэ үү.">
                                                <button className="btn primary" onClick={() => setSheet("new")}><UserPlus size={18} /> Хүүхэд бүртгэх</button>
                                            </Empty>
                                        )}
                                    </div>
                                ) : (
                                    <div className="list">
                                        {shown.map((r) => {
                                            const a = ageOf(r);
                                            return (
                                                <div key={r.enrollmentid} className={`row${r.active ? "" : " left"}`}>
                                                    <Link href={`/kids/${r.studentid}`} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                                                        <div className="avatar">{initials(r.last_name, r.first_name)}</div>
                                                        <div className="grow">
                                                            <div className="title">{shortName(r.last_name, r.first_name)}</div>
                                                            <div className="meta">
                                                                {[a !== null ? `${a} нас` : null,
                                                                  r.emergency_relation && r.emergency_phone ? `${r.emergency_relation} ${r.emergency_phone}` : r.emergency_phone,
                                                                  !r.active && r.left_at ? `Гарсан ${shortDate(r.left_at)}` : null,
                                                                ].filter(Boolean).join(" · ") || " "}
                                                            </div>
                                                        </div>
                                                        {r.active && r.balance > 0 && <span className="badge tone-absent">{money(r.balance)}</span>}
                                                        {!r.active && <span className="badge tone-muted">Гарсан</span>}
                                                    </Link>
                                                    {r.active && r.emergency_phone && (
                                                        <a className="icon-btn" href={`tel:${r.emergency_phone}`} aria-label={`${r.first_name}-ийн эцэг эх рүү залгах`}><Phone size={18} /></a>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {tab === "active" && (
                                    <button className="btn ghost block" style={{ marginTop: 8 }} onClick={() => setSheet("existing")}>Өөр ангиас / бүртгэлтэй хүүхэд нэмэх</button>
                                )}
                            </>
                        )}
                    </>
                )}
            </main>

            <Sheet open={sheet === "edit"} onClose={() => setSheet(null)} title="Анги засах">
                {g && <GroupForm group={g} onSaved={() => { setSheet(null); group.reload(); }} />}
            </Sheet>
            <Sheet open={sheet === "slot"} onClose={() => setSheet(null)} title="Хичээлийн цаг нэмэх">
                <SlotForm groupId={Number(id)} onSaved={() => { setSheet(null); group.reload(); }} />
            </Sheet>
            <Sheet open={sheet === "existing"} onClose={() => setSheet(null)} title="Ангид хүүхэд нэмэх">
                <AddExisting groupId={id} inGroup={active.map((r) => r.studentid)} onAdded={reloadAll} />
            </Sheet>
            <Sheet open={sheet === "new"} onClose={() => setSheet(null)} title={`Шинэ хүүхэд · ${g?.name ?? ""}`}>
                {g && <StudentForm groupId={g.groupid} groups={[g]} onSaved={() => { setSheet(null); setTab("active"); reloadAll(); }} />}
            </Sheet>
            <InvoiceSheet open={sheet === "invoice"} onClose={() => { setSheet(null); roster.reload(); }} groupId={Number(id)} title={`Нэхэмжлэх · ${g?.name ?? ""}`} />
        </>
    );
}

function SlotForm({ groupId, onSaved }: { groupId: number; onSaved: () => void }) {
    const toast = useToast();
    const [days, setDays] = useState<number[]>([]);
    const [start, setStart] = useState("18:00");
    const [end, setEnd] = useState("19:30");
    const [busy, setBusy] = useState(false);

    // Several days at once: most classes train the same hour on two or three days.
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

function AddExisting({ groupId, inGroup, onAdded }: { groupId: string; inGroup: number[]; onAdded: () => void }) {
    const toast = useToast();
    const all = useData<Student[]>("/api/vh/backoffice/students");
    const [q, setQ] = useState("");
    const [added, setAdded] = useState<number[]>([]);

    const candidates = useMemo(() => {
        const term = q.trim().toLowerCase();
        return (all.data ?? []).filter((s) =>
            s.status !== 3 && !inGroup.includes(s.studentid)
            && (!term || `${s.last_name} ${s.first_name}`.toLowerCase().includes(term)));
    }, [all.data, inGroup, q]);

    const add = async (s: Student) => {
        const res = await API(`/api/vh/backoffice/groups/${groupId}/students`, { data: { studentid: s.studentid } });
        if (res.error) return toast.fail(res.error);
        setAdded([...added, s.studentid]);
        onAdded();
    };

    return (
        <div>
            <div className="search">
                <Search size={18} />
                <input className="input" placeholder="Нэрээр хайх" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {all.loading && !all.data ? <Loading /> : candidates.length === 0 ? (
                <Empty title="Нэмэх хүүхэд алга" text="Бусад ангийн идэвхтэй хүүхдүүд энд харагдана." />
            ) : (
                <div className="list">
                    {candidates.slice(0, 40).map((s) => (
                        <div key={s.studentid} className="row">
                            <div className="avatar">{initials(s.last_name, s.first_name)}</div>
                            <div className="grow">
                                <div className="title">{shortName(s.last_name, s.first_name)}</div>
                                <div className="meta">{s.groupname ?? "Ангигүй"}</div>
                            </div>
                            {added.includes(s.studentid)
                                ? <span className="badge tone-present">Нэмсэн</span>
                                : <button className="btn sm" onClick={() => add(s)}>Нэмэх</button>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
