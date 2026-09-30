"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, TriangleAlert } from "lucide-react";
import { TopBar, useData, Loading, ErrorBox, Empty, Sheet } from "@/app/components/ui";
import StudentForm from "@/app/components/StudentForm";
import type { Group, Student } from "@/app/types/api";
import type { HealthFlag } from "@/app/types/api";
import { ageOf, initials, money, shortDate, shortName } from "@/app/utils/format";

type StatusFilter = "active" | "left" | "all";

export default function KidsPage() {
    const router = useRouter();
    const { data, error, loading, reload } = useData<Student[]>("/api/vh/backoffice/students");
    const flags = useData<HealthFlag[]>("/api/vh/backoffice/health-flags");
    const groups = useData<Group[]>("/api/vh/backoffice/groups");
    const [q, setQ] = useState("");
    const [status, setStatus] = useState<StatusFilter>("active");
    const [groupId, setGroupId] = useState<number | null>(null);
    const [adding, setAdding] = useState(false);

    const counts = useMemo(() => ({
        active: (data ?? []).filter((s) => s.status !== 3).length,
        left: (data ?? []).filter((s) => s.status === 3).length,
    }), [data]);

    const kids = useMemo(() => {
        const term = q.trim().toLowerCase();
        return (data ?? []).filter((s) => {
            if (status === "active" && s.status === 3) return false;
            if (status === "left" && s.status !== 3) return false;
            if (groupId && s.groupid !== groupId) return false;
            if (!term) return true;
            return [s.first_name, s.last_name, s.emergency_phone ?? "", s.phone ?? "", s.pay_ref ?? ""].some((v) => v.toLowerCase().includes(term));
        });
    }, [data, q, status, groupId]);

    return (
        <>
            <TopBar title="Хүүхдүүд" sub={data ? `${counts.active} идэвхтэй хүүхэд` : undefined} />
            <main className="page">
                <div className="seg">
                    <button className={status === "active" ? "on" : ""} onClick={() => setStatus("active")}>Идэвхтэй {counts.active}</button>
                    <button className={status === "left" ? "on" : ""} onClick={() => setStatus("left")}>Гарсан {counts.left}</button>
                    <button className={status === "all" ? "on" : ""} onClick={() => setStatus("all")}>Бүгд</button>
                </div>
                <div className="search">
                    <Search size={18} />
                    <input className="input" placeholder="Нэр, утас, гүйлгээний утга" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
                {(groups.data?.length ?? 0) > 1 && (
                    <div className="chips" style={{ marginBottom: 12 }}>
                        <button className={`chip${groupId === null ? " on" : ""}`} onClick={() => setGroupId(null)}>Бүх анги</button>
                        {groups.data!.map((g) => (
                            <button key={g.groupid} className={`chip${groupId === g.groupid ? " on" : ""}`} onClick={() => setGroupId(g.groupid)}>{g.name}</button>
                        ))}
                    </div>
                )}

                {loading && !data ? <Loading rows={6} /> : error && !data ? <ErrorBox code={error} retry={reload} /> : kids.length === 0 ? (
                    <div className="card">
                        {data?.length ? <Empty title="Илэрц алга" /> : (
                            <Empty title="Хүүхэд бүртгээгүй байна" text="Ангиа үүсгээд тухайн ангид хүүхдүүдээ бүртгэнэ.">
                                <button className="btn primary" onClick={() => setAdding(true)}><Plus size={18} /> Хүүхэд бүртгэх</button>
                            </Empty>
                        )}
                    </div>
                ) : (
                    <div className="list">
                        {kids.map((s) => {
                            const a = ageOf(s);
                            const left = s.status === 3;
                            return (
                                <Link key={s.studentid} href={`/kids/${s.studentid}`} className={`row${left ? " left" : ""}`}>
                                    <div className="avatar">{initials(s.last_name, s.first_name)}</div>
                                    <div className="grow">
                                        <div className="title">{shortName(s.last_name, s.first_name)}{flags.data?.some((x) => x.studentid === s.studentid) && (
                                                            <TriangleAlert size={14} color="var(--absent)" style={{ marginLeft: 6, verticalAlign: -2 }} aria-label="Эрүүл мэндийн анхааруулга" />
                                                        )}</div>
                                        <div className="meta">
                                            {[s.groupname ?? "Ангигүй", a !== null ? `${a} нас` : null, left && s.left_date ? `Гарсан ${shortDate(s.left_date)}` : null].filter(Boolean).join(" · ")}
                                        </div>
                                    </div>
                                    {left ? <span className="badge tone-muted">Гарсан</span>
                                        : s.balance > 0 ? <span className="badge tone-absent">{money(s.balance)}</span> : null}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </main>

            <button className="fab" onClick={() => setAdding(true)}><Plus size={20} /> Хүүхэд</button>

            <Sheet open={adding} onClose={() => setAdding(false)} title="Хүүхэд бүртгэх">
                <StudentForm
                    groups={groups.data}
                    groupId={null}
                    onSaved={(id) => { setAdding(false); reload(); router.push(`/kids/${id}`); }}
                />
            </Sheet>
        </>
    );
}
