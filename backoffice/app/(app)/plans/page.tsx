"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { TopBar, useData, Loading, ErrorBox, Empty, Sheet, useToast } from "@/app/components/ui";
import DrillForm from "@/app/components/DrillForm";
import type { Drill, Plan, Skill } from "@/app/types/api";
import { API } from "@/app/utils/API";

function PlansInner() {
    const router = useRouter();
    const params = useSearchParams();
    const toast = useToast();
    const [tab, setTab] = useState<"plans" | "drills">(params.get("tab") === "drills" ? "drills" : "plans");
    const plans = useData<Plan[]>("/api/vh/backoffice/plans");
    const drills = useData<Drill[]>("/api/vh/backoffice/drills");
    const skills = useData<Skill[]>("/api/vh/backoffice/skills");
    const [q, setQ] = useState("");
    const [skill, setSkill] = useState<number | null>(null);
    const [editing, setEditing] = useState<Drill | "new" | null>(null);

    const skillName = (id: number) => skills.data?.find((k) => k.skillid === id)?.name;

    const shownDrills = useMemo(() => {
        const term = q.trim().toLowerCase();
        return (drills.data ?? []).filter((d) =>
            (!skill || d.skillids.includes(skill))
            && (!term || `${d.name} ${d.description ?? ""} ${d.level ?? ""}`.toLowerCase().includes(term)));
    }, [drills.data, q, skill]);

    const removeDrill = async (d: Drill) => {
        const note = d.plan_count ? ` ${d.plan_count} төлөвлөгөөнд байгаа алхам нь хэвээр үлдэнэ.` : "";
        if (!confirm(`"${d.name}" дасгалыг устгах уу?${note}`)) return;
        const res = await API(`/api/vh/backoffice/drills/${d.drillid}`, { method: "DELETE" });
        if (res.error) return toast.fail(res.error);
        drills.reload();
    };

    return (
        <>
            <TopBar title="Төлөвлөгөө" sub="Хичээлийн төлөвлөгөө ба дасгалын сан" />
            <main className="page">
                <div className="seg" style={{ marginBottom: 12 }}>
                    <button className={tab === "plans" ? "on" : ""} onClick={() => setTab("plans")}>Төлөвлөгөө {plans.data?.length ?? ""}</button>
                    <button className={tab === "drills" ? "on" : ""} onClick={() => setTab("drills")}>Дасгалын сан {drills.data?.length ?? ""}</button>
                </div>

                {tab === "plans" ? (
                    plans.loading && !plans.data ? <Loading /> : plans.error ? <ErrorBox code={plans.error} retry={plans.reload} /> : !plans.data?.length ? (
                        <div className="card">
                            <Empty title="Төлөвлөгөө алга" text="Дасгалын сангаас дасгал сонгож хичээлийн төлөвлөгөө угсарна. Нэг төлөвлөгөөг олон хичээлд ашиглана.">
                                <Link href="/plans/new" className="btn primary"><Plus size={18} /> Төлөвлөгөө үүсгэх</Link>
                            </Empty>
                        </div>
                    ) : (
                        <div className="list">
                            {plans.data.map((p) => (
                                <Link key={p.planid} href={`/plans/${p.planid}`} className="row">
                                    <div className="time-pill">{p.total_minutes}<small>мин</small></div>
                                    <div className="grow">
                                        <div className="title">{p.name}</div>
                                        <div className="meta">{p.items.map((i) => i.title).join(" → ") || "Алхамгүй"}</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )
                ) : (
                    <>
                        <div className="search">
                            <Search size={18} />
                            <input className="input" placeholder="Дасгал хайх" value={q} onChange={(e) => setQ(e.target.value)} />
                        </div>
                        {(skills.data?.length ?? 0) > 0 && (
                            <div className="chips" style={{ marginBottom: 12 }}>
                                <button className={`chip${skill === null ? " on" : ""}`} onClick={() => setSkill(null)}>Бүгд</button>
                                {skills.data!.map((k) => (
                                    <button key={k.skillid} className={`chip${skill === k.skillid ? " on" : ""}`} onClick={() => setSkill(k.skillid)}>{k.name}</button>
                                ))}
                            </div>
                        )}
                        {drills.loading && !drills.data ? <Loading /> : shownDrills.length === 0 ? (
                            <div className="card">
                                <Empty title={drills.data?.length ? "Илэрц алга" : "Дасгалын сан хоосон"} text={drills.data?.length ? undefined : "Өөрийн хэрэглэдэг дасгалуудаа нэмээрэй."}>
                                    {!drills.data?.length && <button className="btn primary" onClick={() => setEditing("new")}><Plus size={18} /> Дасгал нэмэх</button>}
                                </Empty>
                            </div>
                        ) : (
                            <div className="list">
                                {shownDrills.map((d) => (
                                    <div key={d.drillid} className="row" style={{ alignItems: "flex-start" }}>
                                        <div className="time-pill">{d.minutes}<small>мин</small></div>
                                        <div className="grow">
                                            <div className="title">{d.name}</div>
                                            {d.description && <div className="meta" style={{ whiteSpace: "normal" }}>{d.description}</div>}
                                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                                                {d.skillids.map((id) => skillName(id) && <span key={id} className="badge tone-court">{skillName(id)}</span>)}
                                                {d.level && <span className="badge tone-muted">{d.level}</span>}
                                            </div>
                                        </div>
                                        <button className="icon-btn" aria-label="Засах" onClick={() => setEditing(d)}><Pencil size={18} /></button>
                                        <button className="icon-btn" aria-label="Устгах" onClick={() => removeDrill(d)}><Trash2 size={18} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>

            <button className="fab" onClick={() => (tab === "plans" ? router.push("/plans/new") : setEditing("new"))}>
                <Plus size={20} /> {tab === "plans" ? "Төлөвлөгөө" : "Дасгал"}
            </button>

            <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Шинэ дасгал" : "Дасгал засах"}>
                {editing !== null && (
                    <DrillForm drill={editing === "new" ? null : editing} skills={skills.data ?? []}
                        onSaved={() => { setEditing(null); drills.reload(); }} />
                )}
            </Sheet>
        </>
    );
}

export default function PlansPage() {
    return <Suspense><PlansInner /></Suspense>;
}

