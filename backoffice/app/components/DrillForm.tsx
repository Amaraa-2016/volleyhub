"use client";

import { useState } from "react";
import { Field, useToast } from "@/app/components/ui";
import type { Drill, Skill } from "@/app/types/api";
import { API } from "@/app/utils/API";

export default function DrillForm({ drill, skills, onSaved }: { drill: Drill | null; skills: Skill[]; onSaved: (id: number) => void }) {
    const toast = useToast();
    const [f, setF] = useState({
        name: drill?.name ?? "",
        minutes: drill ? String(drill.minutes) : "10",
        level: drill?.level ?? "",
        equipment: drill?.equipment ?? "",
        description: drill?.description ?? "",
        skillids: drill?.skillids ?? [] as number[],
    });
    const [busy, setBusy] = useState(false);

    const toggle = (id: number) =>
        setF({ ...f, skillids: f.skillids.includes(id) ? f.skillids.filter((x) => x !== id) : [...f.skillids, id] });

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        const res = await API<{ drillid: number }>("/api/vh/backoffice/drills", {
            data: { drillid: drill?.drillid ?? 0, ...f, minutes: Number(f.minutes) || 0 },
        });
        setBusy(false);
        if (res.error || !res.data) return toast.fail(res.error);
        toast.ok("Хадгаллаа");
        onSaved(res.data.drillid);
    };

    return (
        <form onSubmit={save}>
            <Field label="Дасгалын нэр"><input className="input" autoFocus={!drill} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required placeholder="Жишээ: Хосоор дээд дамжуулалт" /></Field>
            <div className="grid-2">
                <Field label="Хугацаа (мин)"><input className="input num" inputMode="numeric" value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value.replace(/[^\d]/g, "") })} /></Field>
                <Field label="Түвшин / нас"><input className="input" placeholder="8-10 нас" value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })} /></Field>
            </div>
            {skills.length > 0 && (
                <div className="field">
                    <span>Ур чадвар</span>
                    <div className="chips" style={{ flexWrap: "wrap" }}>
                        {skills.map((k) => (
                            <button type="button" key={k.skillid} className={`chip${f.skillids.includes(k.skillid) ? " on" : ""}`} onClick={() => toggle(k.skillid)}>{k.name}</button>
                        ))}
                    </div>
                </div>
            )}
            <Field label="Хэрэгсэл"><input className="input" placeholder="Бөмбөг, конус, тор" value={f.equipment} onChange={(e) => setF({ ...f, equipment: e.target.value })} /></Field>
            <Field label="Хэрхэн хийх"><textarea className="input" rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
            <button className="btn primary block" disabled={busy || !f.name.trim()}>Хадгалах</button>
        </form>
    );
}
