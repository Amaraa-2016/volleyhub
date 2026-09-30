"use client";

import { useState } from "react";
import { Field, useToast } from "@/app/components/ui";
import type { Group } from "@/app/types/api";
import { API } from "@/app/utils/API";

export default function GroupForm({ group, onSaved, onDelete }: {
    group?: Group | null;
    onSaved: (groupid: number) => void;
    onDelete?: () => void;
}) {
    const toast = useToast();
    const [busy, setBusy] = useState(false);
    const [f, setF] = useState({
        name: group?.name ?? "",
        agegroup: group?.agegroup ?? "",
        level: group?.level ?? "",
        gender: group?.gender ?? 3,
        fee_amount: group ? String(group.fee_amount) : "",
        capacity: group?.capacity ? String(group.capacity) : "",
        notes: group?.notes ?? "",
    });

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        const res = await API<{ groupid: number }>("/api/vh/backoffice/groups", {
            data: {
                groupid: group?.groupid ?? 0,
                name: f.name,
                agegroup: f.agegroup,
                level: f.level,
                gender: f.gender,
                fee_amount: Number(f.fee_amount) || 0,
                capacity: Number(f.capacity) || 0,
                notes: f.notes,
                venueid: group?.venueid ?? null,
                isactive: group?.isactive ?? true,
            },
        });
        setBusy(false);
        if (res.error || !res.data) return toast.fail(res.error);
        toast.ok(group ? "Хадгаллаа" : "Анги нэмэгдлээ");
        onSaved(res.data.groupid);
    };

    return (
        <form onSubmit={submit}>
            <Field label="Ангийн нэр">
                <input className="input" placeholder="Жишээ: 10-12 насны охид" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required autoFocus={!group} />
            </Field>
            <div className="grid-2">
                <Field label="Нас"><input className="input" placeholder="10-12" value={f.agegroup} onChange={(e) => setF({ ...f, agegroup: e.target.value })} /></Field>
                <Field label="Түвшин"><input className="input" placeholder="Анхан шат" value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })} /></Field>
            </div>
            <div className="seg" style={{ marginBottom: 16 }}>
                {[[3, "Холимог"], [1, "Хөвгүүд"], [2, "Охид"]].map(([v, l]) => (
                    <button type="button" key={v} className={f.gender === v ? "on" : ""} onClick={() => setF({ ...f, gender: v as number })}>{l}</button>
                ))}
            </div>
            <div className="grid-2">
                <Field label="Сарын төлбөр (₮)" hint="Ангийн бүх хүүхдэд хамаарна. Өмнө үүссэн сарын төлбөр өөрчлөгдөхгүй.">
                    <input className="input num" inputMode="numeric" placeholder="80000" value={f.fee_amount} onChange={(e) => setF({ ...f, fee_amount: e.target.value.replace(/[^\d]/g, "") })} />
                </Field>
                <Field label="Хүүхдийн дээд тоо" hint="Хоосон бол хязгааргүй">
                    <input className="input num" inputMode="numeric" value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value.replace(/[^\d]/g, "") })} />
                </Field>
            </div>
            <Field label="Тэмдэглэл"><textarea className="input" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
            <button className="btn primary block" disabled={busy}>{group ? "Хадгалах" : "Анги нэмэх"}</button>
            {group && onDelete && (
                <button type="button" className="btn ghost block danger" style={{ marginTop: 8 }} onClick={onDelete}>Ангийг устгах</button>
            )}
        </form>
    );
}
