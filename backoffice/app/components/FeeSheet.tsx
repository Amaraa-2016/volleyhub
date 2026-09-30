"use client";

import { useState } from "react";
import { Check, Undo2 } from "lucide-react";
import { Sheet, Field, useToast } from "@/app/components/ui";
import type { Fee } from "@/app/types/api";
import { API } from "@/app/utils/API";
import { FEE_STATUS, METHODS, money, periodLabel, shortDate, shortName, today } from "@/app/utils/format";

// One fee: what was paid when and by whom, "mark paid" after checking the bank statement, undo,
// or waive the month.
export default function FeeSheet({ fee, onClose, onChanged }: { fee: Fee | null; onClose: () => void; onChanged: () => void }) {
    const toast = useToast();
    const [form, setForm] = useState({ amount: "", paid_at: today(), payer: "", method: 2, note: "" });
    const [busy, setBusy] = useState(false);
    const [lastFee, setLastFee] = useState<number | null>(null);

    // Reset the form each time a different fee opens.
    if (fee && fee.feeid !== lastFee) {
        setLastFee(fee.feeid);
        setForm({ amount: String(fee.balance), paid_at: today(), payer: "", method: 2, note: "" });
    }

    if (!fee) return null;
    const owes = fee.status === 1 || fee.status === 2;

    const markPaid = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        const res = await API(`/api/vh/backoffice/fees/${fee.feeid}/paid`, {
            data: {
                amount: Number(form.amount) || undefined,
                method: form.method,
                // Noon local time, so the day never slips across midnight in UTC.
                paid_at: new Date(`${form.paid_at}T12:00:00`).toISOString(),
                payer: form.payer,
                note: form.note,
            },
        });
        setBusy(false);
        if (res.error) return toast.fail(res.error);
        toast.ok("Төлсөн гэж тэмдэглэлээ");
        onChanged();
    };

    const undo = async (paymentid: number) => {
        setBusy(true);
        const res = await API(`/api/vh/backoffice/payments/${paymentid}`, { method: "DELETE" });
        setBusy(false);
        if (res.error) return toast.fail(res.error);
        toast.ok("Буцаалаа");
        onChanged();
    };

    const waive = async () => {
        setBusy(true);
        const res = await API(`/api/vh/backoffice/fees/${fee.feeid}/waive`, { data: { note: "Чөлөөлсөн" } });
        setBusy(false);
        if (res.error) return toast.fail(res.error);
        toast.ok("Энэ сарын төлбөрөөс чөлөөллөө");
        onChanged();
    };

    return (
        <Sheet open onClose={onClose} title={shortName(fee.last_name, fee.first_name)}>
            <div className="card pad" style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="muted">{fee.groupname} · {periodLabel(fee.period)}</span>
                    <span className={`badge tone-${FEE_STATUS[fee.status].tone}`}>{FEE_STATUS[fee.status].label}</span>
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }} className="num">
                    {money(fee.paid_amount)} <span className="muted" style={{ fontSize: 16 }}>/ {money(fee.amount)}</span>
                </div>
                {fee.discount_name && fee.base_amount != null && (
                    <div className="caption" style={{ marginTop: 4 }}>{fee.discount_name}: {money(fee.base_amount)} → {money(fee.amount)}</div>
                )}
                {fee.pay_ref && <div className="caption" style={{ marginTop: 4 }}>Гүйлгээний утга: <b>{fee.pay_ref}</b></div>}
            </div>

            {fee.payments.length > 0 && (
                <div className="list" style={{ marginBottom: 16 }}>
                    {fee.payments.map((p) => (
                        <div key={p.paymentid} className="row">
                            <div className="grow">
                                <div className="title num">{money(p.amount)}</div>
                                <div className="meta">{shortDate(p.paid_at)} · {METHODS[p.method] ?? ""}{p.payer ? ` · ${p.payer}` : ""}</div>
                            </div>
                            <button className="btn sm" disabled={busy} onClick={() => undo(p.paymentid)}><Undo2 size={16} /> Буцаах</button>
                        </div>
                    ))}
                </div>
            )}

            {owes && (
                <form onSubmit={markPaid}>
                    <div className="grid-2">
                        <Field label="Дүн">
                            <input className="input num" inputMode="numeric" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^\d]/g, "") })} />
                        </Field>
                        <Field label="Огноо">
                            <input className="input" type="date" value={form.paid_at} onChange={(e) => setForm({ ...form, paid_at: e.target.value })} />
                        </Field>
                    </div>
                    <Field label="Хуулгад байгаа нэр" hint="Дараа нь хуулгаас хайхад хэрэгтэй">
                        <input className="input" placeholder="Жишээ: Д.Сараа" value={form.payer} onChange={(e) => setForm({ ...form, payer: e.target.value })} />
                    </Field>
                    <div className="seg" style={{ marginBottom: 16 }}>
                        {[2, 1, 4].map((m) => (
                            <button type="button" key={m} className={form.method === m ? "on" : ""} onClick={() => setForm({ ...form, method: m })}>{METHODS[m]}</button>
                        ))}
                    </div>
                    <button className="btn primary block" disabled={busy}><Check size={18} /> Төлсөн гэж тэмдэглэх</button>
                    {fee.payments.length === 0 && (
                        <button type="button" className="btn ghost block" style={{ marginTop: 8 }} disabled={busy} onClick={waive}>Энэ сард чөлөөлөх</button>
                    )}
                </form>
            )}
        </Sheet>
    );
}
