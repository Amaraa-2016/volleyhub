"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Send, Receipt, MessageSquare, Copy, Check } from "lucide-react";
import { Sheet, useData, Loading, useToast } from "@/app/components/ui";
import type { Month, NotifyItem, NotifyResult, Settings } from "@/app/types/api";
import { API } from "@/app/utils/API";
import { currentPeriod, money, periodLabel, shiftPeriod, shortDate, shortName } from "@/app/utils/format";

// Opens the phone's own messaging app with the number and text filled in. iPhones read the body
// after "&", Android after "?"; "?&body=" is understood by both.
const smsLink = (phone: string, text: string) =>
    `sms:${phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(text)}`;

const STATUS_TEXT: Record<NotifyItem["status"], { label: string; tone: string }> = {
    sent: { label: "Илгээсэн", tone: "present" },
    failed: { label: "Алдаа", tone: "absent" },
    logged: { label: "Бүртгэсэн", tone: "sun" },
    no_phone: { label: "Утасгүй", tone: "muted" },
    preview: { label: "", tone: "muted" },
};

// Invoice texts for one month's unpaid fees - a whole class, or everyone. The coach sees exactly
// what a parent will receive before anything is sent.
export default function InvoiceSheet({ open, onClose, groupId, title }: {
    open: boolean;
    onClose: () => void;
    groupId?: number;
    title?: string;
}) {
    const toast = useToast();
    const [period, setPeriod] = useState(currentPeriod());
    const q = `period=${period}${groupId ? `&groupid=${groupId}` : ""}`;
    const month = useData<Month>(open ? `/api/vh/backoffice/month?${q}` : null);
    const settings = useData<Settings>(open ? "/api/vh/backoffice/settings" : null);
    const [picked, setPicked] = useState<number[]>([]);
    const [preview, setPreview] = useState<Record<number, string>>({});
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<NotifyResult | null>(null);
    // "phone": one tap per parent opens the coach's messaging app. "gateway": the server sends them
    // all at once - only offered once an SMS gateway is configured.
    const [mode, setMode] = useState<"phone" | "gateway">("phone");
    const [opened, setOpened] = useState<number[]>([]);

    const unpaid = useMemo(() => (month.data?.fees ?? []).filter((f) => f.status === 1 || f.status === 2), [month.data]);

    // Everyone with a phone is ticked to start with; the texts come from the backend so the
    // preview is exactly what will be sent.
    useEffect(() => {
        setPicked(unpaid.filter((f) => f.phone).map((f) => f.feeid));
        if (unpaid.length === 0) return;
        API<NotifyResult>("/api/vh/backoffice/fees/notify", { data: { period, groupid: groupId, preview: true } }).then((res) => {
            if (res.data) setPreview(Object.fromEntries(res.data.items.map((i) => [i.feeid, i.message])));
        });
    }, [unpaid, period, groupId]);

    // A fresh month or a fresh opening starts from the list, not from the last send's result.
    useEffect(() => {
        setResult(null);
        setOpened([]);
    }, [period, open]);

    useEffect(() => {
        if (settings.data?.sms_enabled) setMode("gateway");
    }, [settings.data?.sms_enabled]);

    // Recorded when the messaging app is opened, so the list shows who has been sent one.
    const openSms = (feeid: number, phone: string) => {
        const text = preview[feeid];
        if (!text) return;
        setOpened((o) => (o.includes(feeid) ? o : [...o, feeid]));
        API(`/api/vh/backoffice/fees/${feeid}/notified`, { data: { phone, message: text } });
        window.location.href = smsLink(phone, text);
    };

    const copy = async (feeid: number) => {
        try {
            await navigator.clipboard.writeText(preview[feeid] ?? "");
            toast.ok("Мессеж хуулагдлаа");
        } catch {
            toast.fail();
        }
    };

    const generate = async () => {
        setBusy(true);
        const res = await API<{ created: number }>("/api/vh/backoffice/fees/generate", { data: { period, groupid: groupId } });
        setBusy(false);
        if (res.error) return toast.fail(res.error);
        toast.ok(`${res.data?.created ?? 0} хүүхдийн төлбөр үүслээ`);
        month.reload();
    };

    const send = async () => {
        setBusy(true);
        const res = await API<NotifyResult>("/api/vh/backoffice/fees/notify", { data: { period, groupid: groupId, feeids: picked } });
        setBusy(false);
        if (res.error || !res.data) return toast.fail(res.error);
        setResult(res.data);
        month.reload();
    };

    const toggle = (id: number) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
    const firstPicked = picked.find((id) => preview[id]);
    const s = settings.data;

    return (
        <Sheet open={open} onClose={onClose} title={title ?? "Төлбөрийн нэхэмжлэх"}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <button className="icon-btn" aria-label="Өмнөх сар" onClick={() => setPeriod(shiftPeriod(period, -1))}><ChevronLeft size={20} /></button>
                <strong>{periodLabel(period)}</strong>
                <button className="icon-btn" aria-label="Дараагийн сар" onClick={() => setPeriod(shiftPeriod(period, 1))}><ChevronRight size={20} /></button>
            </div>

            {result ? (
                <>
                    <div className="card pad" style={{ marginBottom: 12 }}>
                        {result.gateway ? (
                            <div style={{ fontWeight: 800 }}>{result.sent} илгээгдлээ{result.failed ? `, ${result.failed} алдаатай` : ""}{result.skipped ? `, ${result.skipped} утасгүй` : ""}</div>
                        ) : (
                            <div style={{ fontWeight: 700 }}>SMS үйлчилгээ тохируулаагүй тул нэхэмжлэхүүд зөвхөн бүртгэгдлээ. Админ тохируулсны дараа илгээгдэнэ.</div>
                        )}
                    </div>
                    <div className="list">
                        {result.items.map((i) => (
                            <div key={i.feeid} className="row">
                                <div className="grow">
                                    <div className="title">{i.name}</div>
                                    <div className="meta">{i.phone ?? "Утасны дугаар алга"}{i.error ? ` · ${i.error}` : ""}</div>
                                </div>
                                <span className={`badge tone-${STATUS_TEXT[i.status].tone}`}>{STATUS_TEXT[i.status].label}</span>
                            </div>
                        ))}
                    </div>
                    <button className="btn block" style={{ marginTop: 16 }} onClick={onClose}>Хаах</button>
                </>
            ) : month.loading && !month.data ? <Loading /> : (
                <>
                    {s?.sms_enabled && (
                        <div className="seg" style={{ marginBottom: 12 }}>
                            <button className={mode === "phone" ? "on" : ""} onClick={() => setMode("phone")}>Өөрийн утаснаас</button>
                            <button className={mode === "gateway" ? "on" : ""} onClick={() => setMode("gateway")}>Бүгдэд нэг дор</button>
                        </div>
                    )}
                    {s && !s.bank_account && (
                        <div className="alert tone-muted" style={{ marginBottom: 12 }}>
                            Нэхэмжлэхэд дансны дугаар орохгүй байна. <Link href="/me" style={{ color: "var(--brand)", fontWeight: 800 }}>Тохиргоо</Link> хэсэгт дансаа оруулна уу.
                        </div>
                    )}
                    {(month.data?.missing_count ?? 0) > 0 && (
                        <div className="card pad" style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
                            <Receipt size={20} color="var(--brand)" />
                            <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{month.data!.missing_count} хүүхдэд энэ сарын төлбөр үүсээгүй</div>
                            <button className="btn primary sm" disabled={busy} onClick={generate}>Үүсгэх</button>
                        </div>
                    )}

                    {unpaid.length === 0 ? (
                        <div className="card pad center muted" style={{ fontWeight: 700 }}>
                            {(month.data?.fee_count ?? 0) > 0 ? "Бүгд төлсөн байна" : "Энэ сард төлбөр үүсээгүй байна"}
                        </div>
                    ) : (
                        mode === "phone" ? (
                            <>
                                <p className="caption" style={{ marginTop: 0 }}>
                                    «Мессеж» дарахад утасны мессеж апп нээгдэж, эцэг эхийн дугаар болон нэхэмжлэхийн текст бэлэн болно. Та зөвхөн илгээх товчийг дарна.
                                </p>
                                <div className="list" style={{ marginBottom: 12 }}>
                                    {unpaid.map((f) => {
                                        const done = opened.includes(f.feeid);
                                        return (
                                            <div key={f.feeid} className="row">
                                                <div className="grow">
                                                    <div className="title">{shortName(f.last_name, f.first_name)} <span className="amount" style={{ fontSize: 14 }}>{money(f.balance)}</span></div>
                                                    <div className="meta">
                                                        {f.phone ?? "Утасны дугааргүй"}
                                                        {f.notified_at && !done ? ` · ${shortDate(f.notified_at)}-нд илгээсэн` : ""}
                                                    </div>
                                                </div>
                                                {preview[f.feeid] && (
                                                    <button className="icon-btn" aria-label="Мессежийг хуулах" onClick={() => copy(f.feeid)}><Copy size={18} /></button>
                                                )}
                                                {f.phone ? (
                                                    <button className={`btn sm ${done ? "" : "primary"}`} disabled={!preview[f.feeid]} onClick={() => openSms(f.feeid, f.phone!)}>
                                                        {done ? <Check size={16} /> : <MessageSquare size={16} />} {done ? "Нээсэн" : "Мессеж"}
                                                    </button>
                                                ) : <span className="badge tone-muted">Утасгүй</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                                {unpaid[0] && preview[unpaid[0].feeid] && (
                                    <div>
                                        <div className="caption" style={{ marginBottom: 4 }}>Жишээ мессеж</div>
                                        <div className="message-preview">{preview[unpaid[0].feeid]}</div>
                                    </div>
                                )}
                            </>
                        ) : (
                        <>
                            <div className="list" style={{ marginBottom: 12 }}>
                                {unpaid.map((f) => (
                                    <label key={f.feeid} className="row" style={{ cursor: f.phone ? "pointer" : "default" }}>
                                        <input type="checkbox" className="check" disabled={!f.phone} checked={picked.includes(f.feeid)} onChange={() => toggle(f.feeid)} />
                                        <div className="grow">
                                            <div className="title">{shortName(f.last_name, f.first_name)}</div>
                                            <div className="meta">
                                                {f.phone ?? "Утасны дугааргүй"}
                                                {f.notified_at ? ` · ${shortDate(f.notified_at)}-нд илгээсэн` : ""}
                                            </div>
                                        </div>
                                        <div className="amount">{money(f.balance)}</div>
                                    </label>
                                ))}
                            </div>

                            {firstPicked && (
                                <div style={{ marginBottom: 16 }}>
                                    <div className="caption" style={{ marginBottom: 4 }}>Жишээ мессеж</div>
                                    <div className="message-preview">{preview[firstPicked]}</div>
                                </div>
                            )}

                            <button className="btn primary block" disabled={busy || picked.length === 0} onClick={send}>
                                <Send size={18} /> {picked.length} эцэг эхэд илгээх
                            </button>
                        </>
                        )
                    )}
                </>
            )}
        </Sheet>
    );
}
