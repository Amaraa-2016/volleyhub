"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { TopBar, useData, Loading, ErrorBox, Empty, Sheet } from "@/app/components/ui";
import StudentForm from "@/app/components/StudentForm";
import type { Group, Student } from "@/app/types/api";
import { age, initials, money, shortName } from "@/app/utils/format";

export default function KidsPage() {
    const router = useRouter();
    const { data, error, loading, reload } = useData<Student[]>("/api/vh/backoffice/students");
    const groups = useData<Group[]>("/api/vh/backoffice/groups");
    const [q, setQ] = useState("");
    const [groupId, setGroupId] = useState<number | "none" | null>(null);
    const [adding, setAdding] = useState(false);

    // A child in two groups comes back twice; the list shows each child once.
    const kids = useMemo(() => {
        const seen = new Map<number, Student & { groups: string[] }>();
        for (const s of data ?? []) {
            const hit = seen.get(s.studentid);
            if (hit) { if (s.groupname) hit.groups.push(s.groupname); continue; }
            seen.set(s.studentid, { ...s, groups: s.groupname ? [s.groupname] : [] });
        }
        const term = q.trim().toLowerCase();
        return [...seen.values()].filter((s) => {
            if (groupId === "none" && s.groups.length > 0) return false;
            if (typeof groupId === "number" && !(data ?? []).some((x) => x.studentid === s.studentid && x.groupid === groupId)) return false;
            if (!term) return true;
            return [s.first_name, s.last_name, s.emergency_phone ?? "", s.pay_ref ?? ""].some((v) => v.toLowerCase().includes(term));
        });
    }, [data, q, groupId]);

    return (
        <>
            <TopBar title="Хүүхдүүд" sub={data ? `${new Set(data.map((s) => s.studentid)).size} хүүхэд` : undefined} />
            <main className="page">
                <div className="search">
                    <Search size={18} />
                    <input className="input" placeholder="Нэр, утас, гүйлгээний утга" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
                {(groups.data?.length ?? 0) > 0 && (
                    <div className="chips" style={{ marginBottom: 12 }}>
                        <button className={`chip${groupId === null ? " on" : ""}`} onClick={() => setGroupId(null)}>Бүгд</button>
                        {groups.data!.map((g) => (
                            <button key={g.groupid} className={`chip${groupId === g.groupid ? " on" : ""}`} onClick={() => setGroupId(g.groupid)}>{g.name}</button>
                        ))}
                        <button className={`chip${groupId === "none" ? " on" : ""}`} onClick={() => setGroupId("none")}>Бүлэггүй</button>
                    </div>
                )}

                {loading && !data ? <Loading rows={6} /> : error && !data ? <ErrorBox code={error} retry={reload} /> : kids.length === 0 ? (
                    <div className="card">
                        {data?.length ? <Empty title="Илэрц алга" /> : (
                            <Empty title="Хүүхэд нэмээгүй байна" text="Эхний хүүхдээ нэмээрэй.">
                                <button className="btn primary" onClick={() => setAdding(true)}><Plus size={18} /> Хүүхэд нэмэх</button>
                            </Empty>
                        )}
                    </div>
                ) : (
                    <div className="list">
                        {kids.map((s) => {
                            const a = age(s.date_of_birth);
                            return (
                                <Link key={s.studentid} href={`/kids/${s.studentid}`} className="row">
                                    <div className="avatar">{initials(s.last_name, s.first_name)}</div>
                                    <div className="grow">
                                        <div className="title">{shortName(s.last_name, s.first_name)}</div>
                                        <div className="meta">{[s.groups.join(", ") || "Бүлэггүй", a !== null ? `${a} настай` : null].filter(Boolean).join(" · ")}</div>
                                    </div>
                                    {s.balance > 0 && <span className="badge tone-absent">{money(s.balance)}</span>}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </main>

            <button className="fab" onClick={() => setAdding(true)}><Plus size={20} /> Хүүхэд</button>

            <Sheet open={adding} onClose={() => setAdding(false)} title="Хүүхэд нэмэх">
                <StudentForm
                    groups={groups.data}
                    groupId={typeof groupId === "number" ? groupId : null}
                    onSaved={(id) => { setAdding(false); reload(); router.push(`/kids/${id}`); }}
                />
            </Sheet>
        </>
    );
}
