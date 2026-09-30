"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown, Pencil, Trash2, Plus, Check, X } from "lucide-react";
import { useData, Loading, useToast } from "@/app/components/ui";
import type { Skill } from "@/app/types/api";
import { API } from "@/app/utils/API";

// The coach's own rating criteria: add, rename, reorder, remove. Removing one hides it from new
// ratings; months already scored keep it.
export default function SkillsEditor() {
    const toast = useToast();
    const skills = useData<Skill[]>("/api/vh/backoffice/skills");
    const [editing, setEditing] = useState<number | null>(null);
    const [draft, setDraft] = useState({ name: "", hint: "" });
    const [adding, setAdding] = useState(false);
    const [busy, setBusy] = useState(false);

    const list = skills.data ?? [];

    const save = async (skillid: number) => {
        if (!draft.name.trim()) return;
        setBusy(true);
        const res = await API("/api/vh/backoffice/skills", { data: { skillid, name: draft.name, hint: draft.hint } });
        setBusy(false);
        if (res.error) return toast.fail(res.error);
        setEditing(null);
        setAdding(false);
        setDraft({ name: "", hint: "" });
        skills.reload();
    };

    const remove = async (k: Skill) => {
        if (!confirm(`"${k.name}" үзүүлэлтийг хасах уу? Өмнөх үнэлгээнүүд хадгалагдана.`)) return;
        const res = await API(`/api/vh/backoffice/skills/${k.skillid}`, { method: "DELETE" });
        if (res.error) return toast.fail(res.error);
        skills.reload();
    };

    const move = async (i: number, dir: -1 | 1) => {
        const next = [...list];
        const j = i + dir;
        if (j < 0 || j >= next.length) return;
        [next[i], next[j]] = [next[j], next[i]];
        skills.setData(next);
        const res = await API("/api/vh/backoffice/skills/order", { data: { skillids: next.map((k) => k.skillid) } });
        if (res.error) {
            toast.fail(res.error);
            skills.reload();
        }
    };

    const form = (skillid: number) => (
        <div className="row" style={{ flexWrap: "wrap" }}>
            <div className="grow" style={{ display: "grid", gap: 8, minWidth: 200 }}>
                <input className="input" autoFocus placeholder="Нэр, жишээ: Үсрэлт" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && save(skillid)} />
                <input className="input" placeholder="Тайлбар (заавал биш)" value={draft.hint} onChange={(e) => setDraft({ ...draft, hint: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && save(skillid)} />
            </div>
            <button className="icon-btn tone-present" style={{ borderRadius: 999 }} aria-label="Хадгалах" disabled={busy || !draft.name.trim()} onClick={() => save(skillid)}><Check size={20} /></button>
            <button className="icon-btn" aria-label="Болих" onClick={() => { setEditing(null); setAdding(false); }}><X size={20} /></button>
        </div>
    );

    if (skills.loading && !skills.data) return <Loading rows={2} />;

    return (
        <div>
            <div className="list">
                {list.map((k, i) => editing === k.skillid ? <div key={k.skillid}>{form(k.skillid)}</div> : (
                    <div key={k.skillid} className="row">
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <button className="icon-btn" style={{ height: 24 }} aria-label="Дээш" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={16} /></button>
                            <button className="icon-btn" style={{ height: 24 }} aria-label="Доош" disabled={i === list.length - 1} onClick={() => move(i, 1)}><ArrowDown size={16} /></button>
                        </div>
                        <div className="grow">
                            <div className="title">{k.name}</div>
                            {k.hint && <div className="meta">{k.hint}</div>}
                        </div>
                        <button className="icon-btn" aria-label="Засах" onClick={() => { setAdding(false); setEditing(k.skillid); setDraft({ name: k.name, hint: k.hint ?? "" }); }}><Pencil size={18} /></button>
                        <button className="icon-btn" aria-label="Хасах" onClick={() => remove(k)}><Trash2 size={18} /></button>
                    </div>
                ))}
                {adding && form(0)}
                {list.length === 0 && !adding && <div className="row muted">Үзүүлэлт алга</div>}
            </div>
            {!adding && (
                <button className="btn block" style={{ marginTop: 12 }} onClick={() => { setEditing(null); setAdding(true); setDraft({ name: "", hint: "" }); }}>
                    <Plus size={18} /> Үзүүлэлт нэмэх
                </button>
            )}
        </div>
    );
}
