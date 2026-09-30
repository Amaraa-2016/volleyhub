"use client";

import { useState } from "react";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";
import { useData, Loading, useToast } from "@/app/components/ui";
import type { Discount, MeasureType } from "@/app/types/api";
import { API } from "@/app/utils/API";
import { money } from "@/app/utils/format";

export const discountText = (d: { kind: number; value: number }) => (d.kind === 1 ? `${d.value}%` : money(d.value));

// Discount types: name + percent or fixed ₮. Given to a child on their card; applied when a
// month's fee is created.
export function DiscountsEditor() {
    const toast = useToast();
    const list = useData<Discount[]>("/api/vh/backoffice/discounts");
    const [edit, setEdit] = useState<number | null>(null);
    const [draft, setDraft] = useState({ name: "", kind: 1, value: "" });
    const [busy, setBusy] = useState(false);

    const open = (d?: Discount) => {
        setEdit(d?.discountid ?? 0);
        setDraft(d ? { name: d.name, kind: d.kind, value: String(d.value) } : { name: "", kind: 1, value: "" });
    };

    const save = async () => {
        setBusy(true);
        const res = await API("/api/vh/backoffice/discounts", {
            data: { discountid: edit ?? 0, name: draft.name, kind: draft.kind, value: Number(draft.value) || 0 },
        });
        setBusy(false);
        if (res.error) return toast.fail(res.error);
        setEdit(null);
        list.reload();
    };

    const remove = async (d: Discount) => {
        const who = d.student_count ? ` ${d.student_count} хүүхдээс хасагдана, өмнөх сарууд өөрчлөгдөхгүй.` : "";
        if (!confirm(`"${d.name}" хөнгөлөлтийг устгах уу?${who}`)) return;
        const res = await API(`/api/vh/backoffice/discounts/${d.discountid}`, { method: "DELETE" });
        if (res.error) return toast.fail(res.error);
        list.reload();
    };

    const form = (
        <div className="row" style={{ flexWrap: "wrap", alignItems: "flex-start" }}>
            <div className="grow" style={{ display: "grid", gap: 8, minWidth: 220 }}>
                <input className="input" autoFocus placeholder="Нэр, жишээ: Ах дүүгийн хөнгөлөлт" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                <div style={{ display: "flex", gap: 8 }}>
                    <div className="seg" style={{ flex: 1 }}>
                        <button type="button" className={draft.kind === 1 ? "on" : ""} onClick={() => setDraft({ ...draft, kind: 1 })}>Хувь %</button>
                        <button type="button" className={draft.kind === 2 ? "on" : ""} onClick={() => setDraft({ ...draft, kind: 2 })}>Дүн ₮</button>
                    </div>
                    <input className="input num" style={{ width: 120 }} inputMode="numeric" placeholder={draft.kind === 1 ? "10" : "20000"}
                        value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value.replace(/[^\d.]/g, "") })} />
                </div>
            </div>
            <button className="icon-btn tone-present" style={{ borderRadius: 999 }} aria-label="Хадгалах" disabled={busy || !draft.name.trim() || !draft.value} onClick={save}><Check size={20} /></button>
            <button className="icon-btn" aria-label="Болих" onClick={() => setEdit(null)}><X size={20} /></button>
        </div>
    );

    if (list.loading && !list.data) return <Loading rows={2} />;
    return (
        <div>
            <div className="list">
                {(list.data ?? []).map((d) => edit === d.discountid ? <div key={d.discountid}>{form}</div> : (
                    <div key={d.discountid} className="row">
                        <span className="badge tone-brand" style={{ minWidth: 64, justifyContent: "center" }}>−{discountText(d)}</span>
                        <div className="grow">
                            <div className="title">{d.name}</div>
                            <div className="meta">{d.student_count ? `${d.student_count} хүүхэд` : "Хүүхэд оноогоогүй"}</div>
                        </div>
                        <button className="icon-btn" aria-label="Засах" onClick={() => open(d)}><Pencil size={18} /></button>
                        <button className="icon-btn" aria-label="Устгах" onClick={() => remove(d)}><Trash2 size={18} /></button>
                    </div>
                ))}
                {edit === 0 && form}
                {!list.data?.length && edit !== 0 && <div className="row muted">Хөнгөлөлтийн төрөл алга</div>}
            </div>
            {edit !== 0 && <button className="btn block" style={{ marginTop: 12 }} onClick={() => open()}><Plus size={18} /> Хөнгөлөлт нэмэх</button>}
        </div>
    );
}

// What the coach measures: name, unit, and whether a bigger number is progress.
export function MeasureTypesEditor() {
    const toast = useToast();
    const list = useData<MeasureType[]>("/api/vh/backoffice/measure-types");
    const [edit, setEdit] = useState<number | null>(null);
    const [draft, setDraft] = useState({ name: "", unit: "", higher_is_better: true });
    const [busy, setBusy] = useState(false);

    const open = (t?: MeasureType) => {
        setEdit(t?.typeid ?? 0);
        setDraft(t ? { name: t.name, unit: t.unit, higher_is_better: t.higher_is_better } : { name: "", unit: "", higher_is_better: true });
    };

    const save = async () => {
        setBusy(true);
        const res = await API("/api/vh/backoffice/measure-types", { data: { typeid: edit ?? 0, ...draft } });
        setBusy(false);
        if (res.error) return toast.fail(res.error);
        setEdit(null);
        list.reload();
    };

    const remove = async (t: MeasureType) => {
        if (!confirm(`"${t.name}" хэмжилтийг хасах уу? Өмнөх утгууд хадгалагдана.`)) return;
        const res = await API(`/api/vh/backoffice/measure-types/${t.typeid}`, { method: "DELETE" });
        if (res.error) return toast.fail(res.error);
        list.reload();
    };

    const form = (
        <div className="row" style={{ flexWrap: "wrap", alignItems: "flex-start" }}>
            <div className="grow" style={{ display: "grid", gap: 8, minWidth: 220 }}>
                <div style={{ display: "flex", gap: 8 }}>
                    <input className="input" autoFocus placeholder="Нэр, жишээ: Үсрэлт" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                    <input className="input" style={{ width: 90 }} placeholder="см" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} />
                </div>
                <div className="seg">
                    <button type="button" className={draft.higher_is_better ? "on" : ""} onClick={() => setDraft({ ...draft, higher_is_better: true })}>Их нь сайн</button>
                    <button type="button" className={!draft.higher_is_better ? "on" : ""} onClick={() => setDraft({ ...draft, higher_is_better: false })}>Бага нь сайн</button>
                </div>
            </div>
            <button className="icon-btn tone-present" style={{ borderRadius: 999 }} aria-label="Хадгалах" disabled={busy || !draft.name.trim()} onClick={save}><Check size={20} /></button>
            <button className="icon-btn" aria-label="Болих" onClick={() => setEdit(null)}><X size={20} /></button>
        </div>
    );

    if (list.loading && !list.data) return <Loading rows={2} />;
    return (
        <div>
            <div className="list">
                {(list.data ?? []).map((t) => edit === t.typeid ? <div key={t.typeid}>{form}</div> : (
                    <div key={t.typeid} className="row">
                        <div className="grow">
                            <div className="title">{t.name} {t.unit && <span className="muted">({t.unit})</span>}</div>
                            <div className="meta">{t.higher_is_better ? "Их нь сайн" : "Бага нь сайн (жишээ нь хугацаа)"}</div>
                        </div>
                        <button className="icon-btn" aria-label="Засах" onClick={() => open(t)}><Pencil size={18} /></button>
                        <button className="icon-btn" aria-label="Устгах" onClick={() => remove(t)}><Trash2 size={18} /></button>
                    </div>
                ))}
                {edit === 0 && form}
            </div>
            {edit !== 0 && <button className="btn block" style={{ marginTop: 12 }} onClick={() => open()}><Plus size={18} /> Хэмжилт нэмэх</button>}
        </div>
    );
}
