"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/app/components/ui";
import type { RosterEntry } from "@/app/types/api";
import { API } from "@/app/utils/API";
import { shortName } from "@/app/utils/format";

// Many phones refuse or silently trim a group text with too many recipients; beyond this the
// list is split into several "open" buttons.
const BATCH = 20;

const isIOS = () =>
    typeof navigator !== "undefined"
    && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && navigator.maxTouchPoints > 1));

// One text to many numbers in the phone's own messaging app. iPhone and Android spell the group
// link differently, so it is picked at tap time.
export const groupSmsLink = (phones: string[], text: string) => {
    const nums = phones.map((p) => p.replace(/[^\d+]/g, "")).filter(Boolean);
    const body = encodeURIComponent(text);
    return isIOS() ? `sms://open?addresses=${nums.join(",")}&body=${body}` : `sms:${nums.join(",")}?body=${body}`;
};

interface Contact { studentid: number; name: string; phone: string; group: string }

// The parents of every active child in the given classes, with a ready message. The coach can
// edit the text, then one tap opens their messaging app with all the numbers filled in.
export default function ParentNotice({ groups, message }: { groups: { groupid: number; name: string }[]; message: string }) {
    const toast = useToast();
    const [text, setText] = useState(message);
    const [contacts, setContacts] = useState<Contact[] | null>(null);
    const [missing, setMissing] = useState<string[]>([]);
    const [showList, setShowList] = useState(false);
    const [opened, setOpened] = useState<number[]>([]);
    const key = groups.map((g) => g.groupid).join(",");

    useEffect(() => setText(message), [message]);

    useEffect(() => {
        let alive = true;
        (async () => {
            const found: Contact[] = [];
            const noPhone: string[] = [];
            const seen = new Set<string>();
            for (const g of groups) {
                const res = await API<RosterEntry[]>(`/api/vh/backoffice/groups/${g.groupid}/students`);
                for (const r of res.data ?? []) {
                    const phone = (r.emergency_phone || r.phone || "").trim();
                    if (!phone) { noPhone.push(shortName(r.last_name, r.first_name)); continue; }
                    // Siblings share a parent: one text per number is enough.
                    if (seen.has(phone)) continue;
                    seen.add(phone);
                    found.push({ studentid: r.studentid, name: shortName(r.last_name, r.first_name), phone, group: g.name });
                }
            }
            if (alive) { setContacts(found); setMissing(noPhone); }
        })();
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    const batches = useMemo(() => {
        const list = contacts ?? [];
        const out: Contact[][] = [];
        for (let i = 0; i < list.length; i += BATCH) out.push(list.slice(i, i + BATCH));
        return out;
    }, [contacts]);

    const copy = async (value: string, done: string) => {
        try { await navigator.clipboard.writeText(value); toast.ok(done); } catch { toast.fail(); }
    };

    if (!contacts) return <p className="caption">Эцэг эхийн дугаарыг цуглуулж байна…</p>;

    return (
        <div>
            <label className="field">
                <span>Эцэг эхэд очих мессеж</span>
                <textarea className="input" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
            </label>

            {contacts.length === 0 ? (
                <p className="alert tone-muted">Энэ ангийн хүүхдүүдэд утасны дугаар бүртгэгдээгүй байна.</p>
            ) : (
                <>
                    <div className="stack">
                        {batches.map((b, i) => (
                            <button key={i} className={`btn block ${opened.includes(i) ? "" : "primary"}`}
                                onClick={() => { setOpened((o) => [...o, i]); window.location.href = groupSmsLink(b.map((c) => c.phone), text); }}>
                                <MessageSquare size={18} />
                                {batches.length > 1 ? `${i + 1}-р хэсэг: ` : ""}{b.length} эцэг эхэд мессеж апп нээх{opened.includes(i) ? " ✓" : ""}
                            </button>
                        ))}
                    </div>
                    <div className="actions" style={{ marginTop: 8 }}>
                        <button className="btn sm" onClick={() => copy(contacts.map((c) => c.phone).join(", "), "Дугаарууд хуулагдлаа")}><Copy size={15} /> Дугаарууд</button>
                        <button className="btn sm" onClick={() => copy(text, "Мессеж хуулагдлаа")}><Copy size={15} /> Мессеж</button>
                    </div>
                    <button className="btn ghost sm" style={{ paddingLeft: 0, marginTop: 4 }} onClick={() => setShowList(!showList)}>
                        {showList ? <ChevronUp size={16} /> : <ChevronDown size={16} />} {contacts.length} дугаар{missing.length ? `, ${missing.length} хүүхэд утасгүй` : ""}
                    </button>
                    {showList && (
                        <div className="list">
                            {contacts.map((c) => (
                                <div key={c.phone} className="row" style={{ minHeight: 44 }}>
                                    <div className="grow"><div className="title">{c.name}</div>{groups.length > 1 && <div className="meta">{c.group}</div>}</div>
                                    <span className="num meta">{c.phone}</span>
                                </div>
                            ))}
                            {missing.map((n) => (
                                <div key={n} className="row" style={{ minHeight: 44 }}><div className="grow title muted">{n}</div><span className="badge tone-muted">Утасгүй</span></div>
                            ))}
                        </div>
                    )}
                    <p className="caption" style={{ marginTop: 8 }}>Компьютер дээр мессеж апп нээгдэхгүй бол дугаар, мессежийг хуулж ашиглана.</p>
                </>
            )}
        </div>
    );
}
