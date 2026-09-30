"use client";

import { useMemo, useState } from "react";
import { Ban } from "lucide-react";
import { Field, useData, useToast } from "@/app/components/ui";
import ParentNotice from "@/app/components/ParentNotice";
import { REASONS } from "@/app/components/CancelClass";
import type { Group, Session, Settings } from "@/app/types/api";
import { API } from "@/app/utils/API";
import { hhmm, parseDay, today } from "@/app/utils/format";

const md = (d: string) => { const x = parseDay(d); return `${x.getMonth() + 1}-р сарын ${x.getDate()}`; };

// A holiday or a closed hall: cancel every class in a date range at once - optionally for one
// class only - then text each class's parents.
export default function CancelRange({ day, onDone }: { day?: string; onDone: () => void }) {
    const toast = useToast();
    const groups = useData<Group[]>("/api/vh/backoffice/groups");
    const settings = useData<Settings>("/api/vh/backoffice/settings");
    const [from, setFrom] = useState(day ?? today());
    const [to, setTo] = useState(day ?? today());
    const [groupId, setGroupId] = useState<number | null>(null);
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState<Session[] | null>(null);

    const byGroup = useMemo(() => {
        const m = new Map<number, Session[]>();
        for (const s of done ?? []) m.set(s.groupid, [...(m.get(s.groupid) ?? []), s]);
        return [...m.entries()];
    }, [done]);

    const submit = async () => {
        setBusy(true);
        const res = await API<Session[]>("/api/vh/backoffice/sessions/cancel-range", { data: { from, to, groupid: groupId, reason } });
        setBusy(false);
        if (res.error || !res.data) return toast.fail(res.error);
        toast.ok(`${res.data.length} хичээл цуцлагдлаа`);
        setDone(res.data);
        onDone();
    };

    const messageFor = (list: Session[]) => {
        const g = list[0].groupname;
        const when = list.length === 1
            ? `${md(list[0].session_date)} ${hhmm(list[0].start_minute)}-ийн`
            : from === to ? `${md(from)}-ний` : `${md(from)}-с ${md(to)}-ны хооронд`;
        const training = settings.data?.tenantname ? `${settings.data.tenantname}: ` : "";
        return `${training}${when} ${g} ангийн хичээл${reason ? ` ${reason.toLowerCase()} тул` : ""} болохгүй. Баярлалаа.`;
    };

    if (done) {
        return (
            <div>
                {byGroup.map(([gid, list]) => (
                    <div key={gid} className="form-section">
                        <h4>{list[0].groupname} · {list.length} хичээл</h4>
                        <ParentNotice groups={[{ groupid: gid, name: list[0].groupname }]} message={messageFor(list)} />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div>
            <div className="grid-2">
                <Field label="Эхлэх өдөр"><input className="input" type="date" value={from} onChange={(e) => { setFrom(e.target.value); if (e.target.value > to) setTo(e.target.value); }} /></Field>
                <Field label="Дуусах өдөр"><input className="input" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></Field>
            </div>
            <Field label="Анги">
                <select className="input" value={groupId ?? ""} onChange={(e) => setGroupId(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">Бүх анги</option>
                    {(groups.data ?? []).map((g) => <option key={g.groupid} value={g.groupid}>{g.name}</option>)}
                </select>
            </Field>
            <div className="field">
                <span>Шалтгаан</span>
                <div className="chips" style={{ flexWrap: "wrap", marginBottom: 8 }}>
                    {["Баярын амралт", ...REASONS].map((r) => (
                        <button type="button" key={r} className={`chip${reason === r ? " on" : ""}`} onClick={() => setReason(reason === r ? "" : r)}>{r}</button>
                    ))}
                </div>
                <input className="input" placeholder="Эсвэл өөрөө бичих" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <p className="caption">Энэ хугацааны хуваарьт бүх хичээл цуцлагдана. Ирц аваагүй гэж тооцогдохгүй, тайланд орохгүй.</p>
            <button className="btn primary block" style={{ background: "var(--absent)", borderColor: "var(--absent)", color: "#fff" }} disabled={busy} onClick={submit}>
                <Ban size={18} /> Цуцлах
            </button>
        </div>
    );
}
