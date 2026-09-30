"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/app/components/ui";
import type { Group, Student } from "@/app/types/api";
import { API } from "@/app/utils/API";
import { money, RELATIONS, today } from "@/app/utils/format";

// A child's card: who they are, which class and from when, who to call, and
// whether they still come. Opened from a class, it is enrolled there; "Гарсан" needs the day they
// left, which the form insists on before it will save.
export default function StudentForm({ student, groups, groupId, onSaved }: {
    student?: Student | null;
    groups?: Group[];
    groupId?: number | null;
    onSaved: (studentid: number) => void;
}) {
    const toast = useToast();
    const [busy, setBusy] = useState(false);
    const [tried, setTried] = useState(false);
    const thisYear = new Date().getFullYear();

    const initialGroup = groupId ?? student?.groupid ?? null;
    const [f, setF] = useState({
        last_name: student?.last_name ?? "",
        first_name: student?.first_name ?? "",
        gender: student?.gender ?? 0,
        birth_year: student?.birth_year ? String(student.birth_year) : "",
        phone: student?.phone ?? "",
        groupid: initialGroup as number | null,
        start_date: student?.start_date?.slice(0, 10) ?? today(),
        emergency_relation: student?.emergency_relation ?? "",
        emergency_name: student?.emergency_name ?? "",
        emergency_phone: student?.emergency_phone ?? "",
        status: student?.status === 3 ? 3 : 1,
        left_date: student?.left_date?.slice(0, 10) ?? "",
        pay_ref: student?.pay_ref ?? "",
    });

    const group = useMemo(() => groups?.find((g) => g.groupid === f.groupid), [groups, f.groupid]);
    const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setF({ ...f, [k]: e.target.value });

    const errors = {
        last_name: !f.last_name.trim() ? "Овог оруулна уу" : "",
        first_name: !f.first_name.trim() ? "Нэр оруулна уу" : "",
        left_date: f.status === 3 && !f.left_date ? "Гарсан огноог заавал оруулна уу"
            : f.status === 3 && f.left_date < f.start_date ? "Эхэлсэн огнооноос өмнө байж болохгүй" : "",
    };
    const invalid = Object.values(errors).some(Boolean);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTried(true);
        if (invalid) return;
        setBusy(true);
        const res = await API<{ studentid: number }>("/api/vh/backoffice/students", {
            data: {
                studentid: student?.studentid ?? 0,
                last_name: f.last_name,
                first_name: f.first_name,
                gender: f.gender || null,
                birth_year: f.birth_year ? Number(f.birth_year) : null,
                date_of_birth: student?.date_of_birth ?? null,
                phone: f.phone,
                groupid: f.groupid,
                start_date: f.start_date || null,
                // The fee comes from the class, not the child.
                fee_amount: null,
                emergency_relation: f.emergency_relation,
                emergency_name: f.emergency_name,
                emergency_phone: f.emergency_phone,
                status: f.status,
                left_date: f.status === 3 ? f.left_date : null,
                pay_ref: f.pay_ref,
                notes: student?.notes ?? null,
                height_cm: student?.height_cm ?? null,
                photo: student?.photo ?? null,
            },
        });
        setBusy(false);
        if (res.error || !res.data) return toast.fail(res.error);
        toast.ok(student ? "Хадгаллаа" : `${f.first_name} бүртгэгдлээ`);
        onSaved(res.data.studentid);
    };

    const err = (k: keyof typeof errors) => (tried && errors[k] ? <span className="field-error">{errors[k]}</span> : null);

    return (
        <form onSubmit={submit} noValidate>
            <div className="form-section">
                <h4>Хүүхэд</h4>
                <div className="grid-2">
                    <label className="field">
                        <span>Овог<i className="req">*</i></span>
                        <input className={`input${tried && errors.last_name ? " invalid" : ""}`} value={f.last_name} onChange={set("last_name")} autoFocus={!student} />
                        {err("last_name")}
                    </label>
                    <label className="field">
                        <span>Нэр<i className="req">*</i></span>
                        <input className={`input${tried && errors.first_name ? " invalid" : ""}`} value={f.first_name} onChange={set("first_name")} />
                        {err("first_name")}
                    </label>
                </div>
                <div className="grid-2">
                    <div className="field">
                        <span>Хүйс</span>
                        <div className="seg">
                            {[[1, "Хүү"], [2, "Охин"]].map(([v, l]) => (
                                <button type="button" key={v} className={f.gender === v ? "on" : ""} onClick={() => setF({ ...f, gender: f.gender === v ? 0 : (v as number) })}>{l}</button>
                            ))}
                        </div>
                    </div>
                    <label className="field">
                        <span>Төрсөн он</span>
                        <select className="input" value={f.birth_year} onChange={set("birth_year")}>
                            <option value="">—</option>
                            {Array.from({ length: 25 }, (_, i) => thisYear - 3 - i).map((y) => (
                                <option key={y} value={y}>{y} ({thisYear - y} нас)</option>
                            ))}
                        </select>
                    </label>
                </div>
                <label className="field">
                    <span>Утасны дугаар</span>
                    <input className="input" inputMode="tel" value={f.phone} onChange={set("phone")} placeholder="Хүүхдийн өөрийн утас (байвал)" />
                </label>
            </div>

            <div className="form-section">
                <h4>Анги</h4>
                {!groupId && groups && groups.length > 0 && (
                    <label className="field">
                        <span>Анги</span>
                        <select className="input" value={f.groupid ?? ""} onChange={(e) => setF({ ...f, groupid: e.target.value ? Number(e.target.value) : null })}>
                            <option value="">Ангигүй</option>
                            {groups.map((g) => <option key={g.groupid} value={g.groupid}>{g.name}</option>)}
                        </select>
                    </label>
                )}
                <label className="field">
                    <span>Эхэлсэн огноо</span>
                    <input className="input" type="date" value={f.start_date} onChange={set("start_date")} />
                    {group && <small className="caption">Сарын төлбөр ангийнхаараа: {money(group.fee_amount)}</small>}
                </label>
                <label className="field">
                    <span>Гүйлгээний утга</span>
                    <input className="input" value={f.pay_ref} onChange={set("pay_ref")} placeholder={f.first_name ? `${f.first_name} төлбөр` : "Жишээ: Бат төлбөр"} />
                    <small className="caption">Эцэг эх шилжүүлэхдээ бичих үг. Нэхэмжлэхэд орно.</small>
                </label>
            </div>

            <div className="form-section">
                <h4>Яаралтай үед холбоо барих</h4>
                <div className="field">
                    <span>Хэн болох</span>
                    <div className="chips" style={{ flexWrap: "wrap" }}>
                        {RELATIONS.map((r) => (
                            <button type="button" key={r} className={`chip${f.emergency_relation === r ? " on" : ""}`}
                                onClick={() => setF({ ...f, emergency_relation: f.emergency_relation === r ? "" : r })}>{r}</button>
                        ))}
                    </div>
                </div>
                <div className="grid-2">
                    <label className="field">
                        <span>Нэр</span>
                        <input className="input" value={f.emergency_name} onChange={set("emergency_name")} />
                    </label>
                    <label className="field">
                        <span>Утасны дугаар</span>
                        <input className="input" inputMode="tel" value={f.emergency_phone} onChange={set("emergency_phone")} />
                    </label>
                </div>
            </div>

            <div className="form-section">
                <h4>Төлөв</h4>
                <div className="seg" style={{ marginBottom: 16 }}>
                    <button type="button" className={f.status === 1 ? "on" : ""} onClick={() => setF({ ...f, status: 1 })}>Идэвхтэй</button>
                    <button type="button" className={f.status === 3 ? "on" : ""} onClick={() => setF({ ...f, status: 3 })}>Гарсан</button>
                </div>
                {f.status === 3 && (
                    <label className="field">
                        <span>Гарсан огноо<i className="req">*</i></span>
                        <input className={`input${tried && errors.left_date ? " invalid" : ""}`} type="date" value={f.left_date} onChange={set("left_date")} />
                        {err("left_date")}
                    </label>
                )}
            </div>

            <button className="btn primary block" disabled={busy}>{busy ? "Хадгалж байна…" : student ? "Хадгалах" : "Бүртгэх"}</button>
        </form>
    );
}
