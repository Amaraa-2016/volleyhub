"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { TopBar, useData, Loading, ErrorBox, Empty, Sheet } from "@/app/components/ui";
import GroupForm from "@/app/components/GroupForm";
import type { Group } from "@/app/types/api";
import { money, scheduleText } from "@/app/utils/format";

function GroupsInner() {
    const router = useRouter();
    const params = useSearchParams();
    const { data, error, loading, reload } = useData<Group[]>("/api/vh/backoffice/groups");
    const [adding, setAdding] = useState(false);

    // The home screen's "add your first group" lands here with ?new=1.
    useEffect(() => {
        if (params.get("new")) setAdding(true);
    }, [params]);

    return (
        <>
            <TopBar title="Ангиуд" />
            <main className="page">
                {loading && !data ? <Loading /> : error && !data ? <ErrorBox code={error} retry={reload} /> : !data?.length ? (
                    <div className="card">
                        <Empty title="Анги алга" text="Сургалтын ангиа нэмээд хуваарь, хүүхдүүдээ оруулна.">
                            <button className="btn primary" onClick={() => setAdding(true)}><Plus size={18} /> Анги нэмэх</button>
                        </Empty>
                    </div>
                ) : (
                    <div className="stack">
                        {data.map((g) => (
                            <Link key={g.groupid} href={`/groups/${g.groupid}`} className="card pad" style={{ display: "block" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 800, fontSize: 17 }}>{g.name}</div>
                                        <div className="muted" style={{ fontSize: 14, fontWeight: 600 }}>
                                            {[g.agegroup && `${g.agegroup} нас`, g.level].filter(Boolean).join(" · ") || " "}
                                        </div>
                                    </div>
                                    <span className="badge tone-court" style={{ alignSelf: "flex-start" }}>
                                        {g.studentcount}{g.capacity ? `/${g.capacity}` : ""} хүүхэд
                                    </span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 14, fontWeight: 700 }}>
                                    <span>{scheduleText(g)}</span>
                                    <span className="num">{money(g.fee_amount)}/сар</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>

            <button className="fab" onClick={() => setAdding(true)}><Plus size={20} /> Анги</button>

            <Sheet open={adding} onClose={() => setAdding(false)} title="Шинэ анги">
                <GroupForm onSaved={(id) => { setAdding(false); reload(); router.push(`/groups/${id}`); }} />
            </Sheet>
        </>
    );
}

export default function GroupsPage() {
    return <Suspense><GroupsInner /></Suspense>;
}
