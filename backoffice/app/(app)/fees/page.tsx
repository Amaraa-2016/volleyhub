"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Check, Search, Download, Undo2, Receipt } from "lucide-react";
import { TopBar, useData, Loading, ErrorBox, Empty, Sheet, Field, useToast } from "@/app/components/ui";
import type { Fee, Group, Month } from "@/app/types/api";
import { API } from "@/app/utils/API";
import { currentPeriod, FEE_STATUS, initials, METHODS, money, periodLabel, shiftPeriod, shortDate, shortName, today } from "@/app/utils/format";

type Filter = "unpaid" | "paid" | "all";

// The coach's side of the bank statement: go down the list with the statement open in the bank's
// app, tick each child whose transfer is there. Nothing here moves money - a tick is a note.
export default function FeesPage() {
    const toast = useToast();
    const [period, setPeriod] = useState(currentPeriod());
    const [filter, setFilter] = useState<Filter>("unpaid");
    const [groupId, setGroupId] = useState<number | null>(null);
    const [q, setQ] = useState("");
    const [open, setOpen] = useState<Fee | null>(null);
    const [busy, setBusy] = useState(false);

    const month = useData<Month>(`/api/vh/backoffice/month?period=${period}`);
    const groups = useData<Group[]>("/api/vh/backoffice/groups");

    const fees = useMemo(() => {
        const term = q.trim().toLowerCase();
        return (month.data?.fees ?? []).filter((f) => {
            if (groupId && f.groupid !== groupId) return false;
            if (filter === "unpaid" && (f.status === 3 || f.status === 4)) return false;
            if (filter === "paid" && f.status !== 3) return false;
            if (!term) return true;
            return [f.first_name, f.last_name, f.pay_ref ?? "", f.groupname].some((v) => v.toLowerCase().includes(term));
        });
    }, [month.data, filter, groupId, q]);

    const unpaidCount = (month.data?.fees ?? []).filter((f) => f.status === 1 || f.status === 2).length;

    const generate = async () => {
        setBusy(true);
        const res = await API<{ created: number }>("/api/vh/backoffice/fees/generate", { data: { period } });
        setBusy(false);
        if (res.error) return toast.fail(res.error);
        toast.ok(`${res.data?.created ?? 0} хүүхдийн төлбөр үүслээ`);
        month.reload();
    };

    // One tap: pays whatever is left, with an undo in the toast for a mis-tap.
    const quickPay = async (f: Fee) => {
        const res = await API<{ paymentid: number }>(`/api/vh/backoffice/fees/${f.feeid}/paid`, {
            data: { method: 2, paid_at: new Date().toISOString() },
        });
        if (res.error) return toast.fail(res.error);
        month.reload();
        const paymentid = res.data?.paymentid;
        toast.ok(`${shortName(f.last_name, f.first_name)} — төлсөн`, paymentid ? {
            label: "Буцаах",
            run: async () => {
                const undo = await API(`/api/vh/backoffice/payments/${paymentid}`, { method: "DELETE" });
                if (undo.error) toast.fail(undo.error);
                month.reload();
            },
        } : undefined);
    };

    const exportCsv = () => {
        const rows = [["Овог", "Нэр", "Бүлэг", "Гүйлгээний утга", "Төлбөр", "Төлсөн", "Үлдэгдэл", "Төлөв", "Төлсөн огноо", "Шилжүүлсэн"]];
        for (const f of month.data?.fees ?? []) {
            const last = f.payments[0];
            rows.push([
                f.last_name, f.first_name, f.groupname, f.pay_ref ?? "", String(f.amount), String(f.paid_amount),
                String(f.balance), FEE_STATUS[f.status]?.label ?? "", last ? shortDate(last.paid_at) : "", last?.payer ?? "",
            ]);
        }
        const csv = "﻿" + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `volleyhub-tolbor-${period}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const m = month.data;
    const pct = m && m.expected > 0 ? Math.round((m.received / m.expected) * 100) : 0;

    return (
        <>
            <TopBar title="Төлбөр" right={
                m && m.fees.length > 0 ? <button className="icon-btn" aria-label="Excel (CSV) татах" onClick={exportCsv}><Download size={22} /></button> : undefined
            } />
            <main className="page">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <button className="icon-btn" aria-label="Өмнөх сар" onClick={() => setPeriod(shiftPeriod(period, -1))}><ChevronLeft size={22} /></button>
                    <strong style={{ fontSize: 17 }}>{periodLabel(period)}</strong>
                    <button className="icon-btn" aria-label="Дараагийн сар" onClick={() => setPeriod(shiftPeriod(period, 1))}><ChevronRight size={22} /></button>
                </div>

                {month.loading && !m ? <Loading rows={5} /> : month.error && !m ? <ErrorBox code={month.error} retry={month.reload} /> : m && (
                    <>
                        <div className="hero">
                            <span className="ball" />
                            <div className="label">Орсон / хүлээгдэж буй</div>
                            <div className="value">{money(m.received)} <small>/ {money(m.expected)}</small></div>
                            <div className="bar"><span style={{ width: `${pct}%` }} /></div>
                            <div className="foot">
                                <span>{m.paid_count}/{m.fee_count} хүүхэд төлсөн</span>
                                <span>Үлдсэн {money(m.expected - m.received)}</span>
                            </div>
                        </div>

                        {m.missing_count > 0 && (
                            <div className="card pad" style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
                                <Receipt size={22} color="var(--brand)" />
                                <div style={{ flex: 1, fontWeight: 700, fontSize: 14, lineHeight: "20px" }}>
                                    {m.missing_count} хүүхдэд энэ сарын төлбөр үүсээгүй байна
                                </div>
                                <button className="btn primary sm" disabled={busy} onClick={generate}>Үүсгэх</button>
                            </div>
                        )}

                        {m.fees.length === 0 ? (
                            m.missing_count === 0 && (
                                <div className="card" style={{ marginTop: 12 }}>
                                    <Empty title="Энэ сард төлбөр алга" text="Бүлэгт хүүхэд нэмж, бүлгийн сарын төлбөрийг оруулсны дараа энд гарна." />
                                </div>
                            )
                        ) : (
                            <>
                                <div className="seg" style={{ marginTop: 16 }}>
                                    <button className={filter === "unpaid" ? "on" : ""} onClick={() => setFilter("unpaid")}>Төлөөгүй {unpaidCount}</button>
                                    <button className={filter === "paid" ? "on" : ""} onClick={() => setFilter("paid")}>Төлсөн {m.paid_count}</button>
                                    <button className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>Бүгд</button>
                                </div>
                                <div className="search">
                                    <Search size={18} />
                                    <input className="input" placeholder="Нэр эсвэл гүйлгээний утгаар хайх" value={q} onChange={(e) => setQ(e.target.value)} />
                                </div>
                                {(groups.data?.length ?? 0) > 1 && (
                                    <div className="chips" style={{ marginBottom: 12 }}>
                                        <button className={`chip${groupId === null ? " on" : ""}`} onClick={() => setGroupId(null)}>Бүх бүлэг</button>
                                        {groups.data!.map((g) => (
                                            <button key={g.groupid} className={`chip${groupId === g.groupid ? " on" : ""}`} onClick={() => setGroupId(g.groupid)}>{g.name}</button>
                                        ))}
                                    </div>
                                )}

                                {fees.length === 0 ? (
                                    <div className="card"><Empty title={filter === "unpaid" ? "Бүгд төлсөн байна" : "Илэрц алга"} /></div>
                                ) : (
                                    <div className="list">
                                        {fees.map((f) => {
                                            const st = FEE_STATUS[f.status];
                                            const owes = f.status === 1 || f.status === 2;
                                            return (
                                                <div key={f.feeid} className="row">
                                                    <button onClick={() => setOpen(f)} style={{ all: "unset", display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, cursor: "pointer" }}>
                                                        <div className="avatar">{initials(f.last_name, f.first_name)}</div>
                                                        <div className="grow">
                                                            <div className="title">{shortName(f.last_name, f.first_name)}</div>
                                                            <div className="meta">
                                                                {f.pay_ref ? `Утга: ${f.pay_ref}` : f.groupname}
                                                            </div>
                                                        </div>
                                                        <div className="end">
                                                            <div className="amount">{money(owes ? f.balance : f.amount)}</div>
                                                            <span className={`badge tone-${st.tone}`}>{st.label}</span>
                                                        </div>
                                                    </button>
                                                    {owes && (
                                                        <button className="icon-btn tone-present" style={{ borderRadius: 999 }} aria-label={`${f.first_name} төлсөн гэж тэмдэглэх`} onClick={() => quickPay(f)}>
                                                            <Check size={22} strokeWidth={3} />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </main>

            <FeeSheet fee={open} onClose={() => setOpen(null)} onChanged={() => { month.reload(); setOpen(null); }} />
        </>
    );
}

function FeeSheet({ fee, onClose, onChanged }: { fee: Fee | null; onClose: () => void; onChanged: () => void }) {
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
