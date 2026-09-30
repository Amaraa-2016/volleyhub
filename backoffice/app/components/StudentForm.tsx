"use client";

import { useState } from "react";
import { Field, useToast } from "@/app/components/ui";
import type { Group, Student } from "@/app/types/api";
import { API } from "@/app/utils/API";

// Add or edit a child. Only the name is required: a coach adding children at the side of the court
// will fill in the rest later, if ever.
export default function StudentForm({ student, groups, groupId, onSaved }: {
    student?: Student | null;
    groups?: Group[];
    groupId?: number | null;
    onSaved: (studentid: number) => void;
}) {
    const toast = useToast();
    const [busy, setBusy] = useState(false);
    const [f, setF] = useState({
        last_name: student?.last_name ?? "",
        first_name: student?.first_name ?? "",
        date_of_birth: student?.date_of_birth?.slice(0, 10) ?? "",
        gender: student?.gender ?? 0,
        emergency_name: student?.emergency_name ?? "",
        emergency_relation: student?.emergency_relation ?? "",
        emergency_phone: student?.emergency_phone ?? "",
        pay_ref: student?.pay_ref ?? "",
        notes: student?.notes ?? "",
        groupid: groupId ?? null as number | null,
    });

    const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setF({ ...f, [k]: e.target.value });

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        const res = await API<{ studentid: number }>("/api/vh/backoffice/students", {
            data: {
                ...student,
                studentid: student?.studentid ?? 0,
                last_name: f.last_name,
                first_name: f.first_name,
                date_of_birth: f.date_of_birth || null,
                gender: f.gender || null,
                emergency_name: f.emergency_name,
                emergency_relation: f.emergency_relation,
                emergency_phone: f.emergency_phone,
                pay_ref: f.pay_ref,
                notes: f.notes,
                status: student?.status ?? 1,
                groupid: student ? undefined : f.groupid,
            },
        });
        setBusy(false);
        if (res.error || !res.data) return toast.fail(res.error);
        toast.ok(student ? "Хадгаллаа" : `${f.first_name} нэмэгдлээ`);
        onSaved(res.data.studentid);
    };

    return (
        <form onSubmit={submit}>
            <div className="grid-2">
                <Field label="Овог"><input className="input" value={f.last_name} onChange={set("last_name")} /></Field>
                <Field label="Нэр"><input className="input" value={f.first_name} onChange={set("first_name")} required autoFocus={!student} /></Field>
            </div>
            <div className="grid-2">
                <Field label="Төрсөн огноо"><input className="input" type="date" value={f.date_of_birth} onChange={set("date_of_birth")} /></Field>
                <Field label="Хүйс">
                    <select className="input" value={f.gender} onChange={(e) => setF({ ...f, gender: Number(e.target.value) })}>
                        <option value={0}>—</option>
                        <option value={1}>Хүү</option>
                        <option value={2}>Охин</option>
                    </select>
                </Field>
            </div>
            {!student && groups && groups.length > 0 && (
                <Field label="Бүлэг">
                    <select className="input" value={f.groupid ?? ""} onChange={(e) => setF({ ...f, groupid: e.target.value ? Number(e.target.value) : null })}>
                        <option value="">Бүлэггүй</option>
                        {groups.map((g) => <option key={g.groupid} value={g.groupid}>{g.name}</option>)}
                    </select>
                </Field>
            )}
            <div className="grid-2">
                <Field label="Эцэг эхийн нэр"><input className="input" value={f.emergency_name} onChange={set("emergency_name")} /></Field>
                <Field label="Хэн болох"><input className="input" placeholder="ээж, аав…" value={f.emergency_relation} onChange={set("emergency_relation")} /></Field>
            </div>
            <Field label="Эцэг эхийн утас"><input className="input" inputMode="tel" value={f.emergency_phone} onChange={set("emergency_phone")} /></Field>
            <Field label="Гүйлгээний утга" hint="Эцэг эх шилжүүлэхдээ бичих үг. Хуулгаас хурдан олоход тусална.">
                <input className="input" placeholder={f.first_name ? `${f.first_name} төлбөр` : "Жишээ: Бат төлбөр"} value={f.pay_ref} onChange={set("pay_ref")} />
            </Field>
            <Field label="Тэмдэглэл"><textarea className="input" rows={3} value={f.notes} onChange={set("notes")} /></Field>
            <button className="btn primary block" disabled={busy}>{student ? "Хадгалах" : "Нэмэх"}</button>
        </form>
    );
}
