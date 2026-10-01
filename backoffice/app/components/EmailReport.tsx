"use client";

import { useEffect, useState } from "react";
import { Mail, Send } from "lucide-react";
import { Sheet, useToast } from "@/app/components/ui";
import type { ReportEmail, Student } from "@/app/types/api";
import { API } from "@/app/utils/API";
import { EMAIL } from "@/app/utils/format";

// Sends the report on screen (same period and sections) to the guardian and/or the child.
// With SMTP set up on the server it goes straight from Volleyhub; without it, the coach's own
// mail app opens with the addresses, subject and the report text filled in.
export default function EmailReport({ open, onClose, kid, from, sections, enabled }: {
    open: boolean;
    onClose: () => void;
    kid: Student;
    // YYYY-MM-DD, or null for the whole history
    from: string | null;
    sections: string[];
    enabled: boolean;
}) {
    const toast = useToast();
    const known = [
        kid.emergency_email ? { email: kid.emergency_email, who: kid.emergency_relation || "Асран хамгаалагч", name: kid.emergency_name } : null,
        kid.email ? { email: kid.email, who: "Хүүхэд", name: kid.first_name } : null,
    ].filter((x): x is { email: string; who: string; name: string | null | undefined } => !!x && !!x.email)
        .filter((x, i, all) => all.findIndex((y) => y.email === x.email) === i);

    const [picked, setPicked] = useState<string[]>([]);
    const [extra, setExtra] = useState("");
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);
    const [preview, setPreview] = useState<ReportEmail | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        if (!open) return;
        // The guardian by default; the child only when there is no guardian address.
        setPicked(known.length ? [known[0].email] : []);
        setExtra("");
        setPreview(null);
        setShowPreview(false);
        setMessage(`Сайн байна уу. ${kid.first_name}-ийн сургалтын тайланг хүргүүлж байна.`);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const extras = extra.split(/[,;\s]+/).map((x) => x.trim().toLowerCase()).filter(Boolean);
    const badExtra = extras.find((x) => !EMAIL.test(x));
    const to = Array.from(new Set([...picked, ...extras]));

    const body = (preview: boolean) => ({ to, from, sections, message, preview });

    const load = async () => {
        const res = await API<ReportEmail>(`/api/vh/backoffice/students/${kid.studentid}/report/email`, { data: body(true) });
        if (res.error || !res.data) { toast.fail(res.error); return null; }
        setPreview(res.data);
        return res.data;
    };

    const send = async () => {
        if (badExtra) return toast.fail("email_invalid");
        if (to.length === 0) return toast.fail("no_recipients");
        setBusy(true);
        if (enabled) {
            const res = await API<ReportEmail>(`/api/vh/backoffice/students/${kid.studentid}/report/email`, { data: body(false) });
            setBusy(false);
            if (res.error || !res.data) return toast.fail(res.error);
            toast.ok(`Илгээлээ: ${res.data.sent_to.join(", ")}`);
            onClose();
            return;
        }
        // No SMTP: hand the text to the phone's / computer's mail app.
        const p = preview ?? await load();
        setBusy(false);
        if (!p) return;
        const href = `mailto:${to.map(encodeURIComponent).join(",")}?subject=${encodeURIComponent(p.subject)}&body=${encodeURIComponent(p.text)}`;
        window.location.href = href;
    };

    const togglePreview = async () => {
        if (!showPreview && !preview) {
            setBusy(true);
            await load();
            setBusy(false);
        }
        setShowPreview(!showPreview);
    };

    return (
        <Sheet open={open} onClose={onClose} title="Тайлан имэйлээр илгээх">
            <div className="form-section">
                <h4>Хэнд</h4>
                {known.length === 0 && (
                    <p className="caption" style={{ marginTop: 0 }}>
                        Хүүхдийн бүртгэлд имэйл алга. Хүүхдийн мэдээллийг засаж асран хамгаалагчийн имэйлийг нэмэх, эсвэл доор хаяг бичнэ үү.
                    </p>
                )}
                {known.map((k) => {
                    const on = picked.includes(k.email);
                    return (
                        <label key={k.email} className="card pad" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, cursor: "pointer" }}>
                            <input type="checkbox" checked={on} style={{ width: 20, height: 20, accentColor: "var(--brand)" }}
                                onChange={() => setPicked(on ? picked.filter((x) => x !== k.email) : [...picked, k.email])} />
                            <span style={{ flex: 1, minWidth: 0 }}>
                                <span className="caption">{k.who}{k.name ? ` · ${k.name}` : ""}</span>
                                <span style={{ display: "block", fontWeight: 700, overflowWrap: "anywhere" }}>{k.email}</span>
                            </span>
                        </label>
                    );
                })}
                <label className="field">
                    <span>Өөр хаяг</span>
                    <input className={`input${badExtra ? " invalid" : ""}`} type="email" inputMode="email" autoComplete="off"
                        value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="name@example.com" />
                    {badExtra && <span className="field-error">Имэйл хаяг буруу байна</span>}
                </label>
            </div>

            <div className="form-section">
                <h4>Захидал</h4>
                <label className="field">
                    <span>Багшийн үг</span>
                    <textarea className="input" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
                    <small className="caption">Тайлангийн эхэнд орно. Хугацаа, хэсгүүд нь дэлгэц дээр сонгосноор явна.</small>
                </label>
                <button type="button" className="btn sm" onClick={togglePreview} disabled={busy}>
                    {showPreview ? "Урьдчилж харахыг хаах" : "Урьдчилж харах"}
                </button>
                {showPreview && preview && (
                    <div className="card pad" style={{ marginTop: 10, maxHeight: 280, overflow: "auto" }}>
                        <div style={{ fontWeight: 800, marginBottom: 6 }}>{preview.subject}</div>
                        <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 13, margin: 0 }}>{preview.text}</pre>
                    </div>
                )}
            </div>

            {!enabled && (
                <p className="alert tone-sun" style={{ marginTop: 0 }}>
                    Серверийн имэйл (SMTP) тохируулаагүй тул таны утас/компьютерийн имэйл апп нээгдэж, тайлангийн текст бөглөгдөнө.
                </p>
            )}

            <button className="btn primary block" onClick={send} disabled={busy || to.length === 0}>
                {enabled ? <Send size={18} /> : <Mail size={18} />}
                {busy ? "Түр хүлээнэ үү…" : enabled ? `Илгээх${to.length ? ` (${to.length})` : ""}` : "Имэйл апп нээх"}
            </button>
        </Sheet>
    );
}
