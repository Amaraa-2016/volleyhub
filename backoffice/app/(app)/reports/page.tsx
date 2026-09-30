"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { TopBar, useData, Loading, ErrorBox, Empty } from "@/app/components/ui";
import { IncomeColumns } from "@/app/components/Charts";
import type { IncomeReport } from "@/app/types/api";
import { METHODS, money } from "@/app/utils/format";

// The year's income: what was billed and paid by the month it was for, what actually arrived in
// each calendar month, where it came from, and who still owes.
export default function ReportsPage() {
    const [year, setYear] = useState(new Date().getFullYear());
    const { data: r, error, loading, reload } = useData<IncomeReport>(`/api/vh/backoffice/reports/income?year=${year}`);
    const [view, setView] = useState<"chart" | "table">("chart");

    const exportCsv = () => {
        if (!r) return;
        const rows = [["Сар", "Нэхэмжилсэн", "Төлөгдсөн", "Хөнгөлөлт", "Тухайн сард орсон", "Хүүхэд"]];
        for (const m of r.months) rows.push([m.period, String(m.billed), String(m.paid), String(m.discounts), String(m.collected), String(m.children)]);
        rows.push(["Нийт", String(r.billed), String(r.paid), String(r.discounts), String(r.collected), ""]);
        rows.push([]);
        rows.push(["Анги", "Нэхэмжилсэн", "Төлөгдсөн"]);
        for (const g of r.groups) rows.push([g.name, String(g.billed), String(g.paid)]);
        const csv = "﻿" + rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `volleyhub-orlogo-${year}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const pct = r && r.billed > 0 ? Math.round((r.paid / r.billed) * 100) : 0;
    const hasData = r && (r.billed > 0 || r.collected > 0);

    return (
        <>
            <TopBar back="/fees" title="Орлогын тайлан" right={hasData ? <button className="icon-btn" aria-label="Excel (CSV) татах" onClick={exportCsv}><Download size={22} /></button> : undefined} />
            <main className="page">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <button className="icon-btn" aria-label="Өмнөх он" onClick={() => setYear(year - 1)}><ChevronLeft size={22} /></button>
                    <strong style={{ fontSize: 17 }}>{year} он</strong>
                    <button className="icon-btn" aria-label="Дараагийн он" onClick={() => setYear(year + 1)}><ChevronRight size={22} /></button>
                </div>

                {loading && !r ? <Loading rows={4} /> : error && !r ? <ErrorBox code={error} retry={reload} /> : !hasData ? (
                    <div className="card"><Empty title={`${year} онд орлого алга`} /></div>
                ) : r && (
                    <>
                        <div className="hero">
                            <span className="ball" />
                            <div className="label">Жилийн төлөгдсөн төлбөр</div>
                            <div className="value">{money(r.paid)} <small>/ {money(r.billed)}</small></div>
                            <div className="bar"><span style={{ width: `${pct}%` }} /></div>
                            <div className="foot"><span>{pct}% цугларсан</span><span>Өр {money(r.outstanding)}</span></div>
                        </div>

                        <div className="stats" style={{ marginTop: 12 }}>
                            <div className="card stat"><div className="label">Дансанд орсон</div><div className="value" style={{ fontSize: 20 }}>{money(r.collected)}</div></div>
                            <div className="card stat"><div className="label">Хөнгөлөлт</div><div className="value" style={{ fontSize: 20 }}>{money(r.discounts)}</div></div>
                        </div>

                        <section className="section">
                            <div className="section-head">
                                <h2>Сар бүрээр</h2>
                                <button onClick={() => setView(view === "chart" ? "table" : "chart")}>{view === "chart" ? "Хүснэгтээр" : "Графикаар"}</button>
                            </div>
                            <div className="card pad">
                                {view === "chart" ? (
                                    <IncomeColumns money={money} months={r.months.map((m) => ({ label: String(Number(m.period.slice(5))), billed: m.billed, paid: m.paid }))} />
                                ) : (
                                    <div style={{ overflowX: "auto" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }} className="num">
                                            <thead>
                                                <tr style={{ textAlign: "right", color: "var(--ink-muted)", fontSize: 12 }}>
                                                    <th style={{ textAlign: "left", padding: "6px 4px" }}>Сар</th><th>Нэхэмжилсэн</th><th>Төлөгдсөн</th><th>Орсон</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {r.months.map((m) => (
                                                    <tr key={m.period} style={{ borderTop: "1px solid var(--line)", textAlign: "right", fontWeight: 700 }}>
                                                        <td style={{ textAlign: "left", padding: "8px 4px" }}>{Number(m.period.slice(5))}-р сар</td>
                                                        <td>{money(m.billed)}</td><td>{money(m.paid)}</td><td>{money(m.collected)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                <p className="caption" style={{ margin: "8px 0 0" }}>
                                    «Нэхэмжилсэн/Төлөгдсөн» нь тухайн сарын төлбөрөөр, «Орсон» нь мөнгө дансанд орсон сараар тооцогдоно.
                                </p>
                            </div>
                        </section>

                        {r.groups.length > 0 && (
                            <section className="section">
                                <div className="section-head"><h2>Ангиар</h2></div>
                                <div className="list">
                                    {r.groups.map((g) => (
                                        <div key={g.groupid} className="row">
                                            <div className="grow">
                                                <div className="title">{g.name}</div>
                                                <div className="bar on-card" style={{ marginTop: 6 }}><span style={{ width: `${g.billed ? (g.paid / g.billed) * 100 : 0}%`, background: "var(--viz-1)" }} /></div>
                                            </div>
                                            <div className="end"><div className="amount">{money(g.paid)}</div><div className="caption">/ {money(g.billed)}</div></div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {Object.keys(r.methods).length > 0 && (
                            <section className="section">
                                <div className="section-head"><h2>Төлбөрийн хэлбэр</h2></div>
                                <div className="list">
                                    {Object.entries(r.methods).sort((a, b) => b[1] - a[1]).map(([m, v]) => (
                                        <div key={m} className="row"><div className="grow title">{METHODS[Number(m)] ?? "Бусад"}</div><div className="amount">{money(v)}</div></div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {r.debtors.length > 0 && (
                            <section className="section">
                                <div className="section-head"><h2>Өртэй хүүхдүүд</h2><span className="caption">{r.debtors.length}</span></div>
                                <div className="list">
                                    {r.debtors.slice(0, 30).map((d) => (
                                        <Link key={d.studentid} href={`/kids/${d.studentid}`} className="row">
                                            <div className="grow">
                                                <div className="title">{d.name}</div>
                                                <div className="meta">{d.groupname ?? ""} · {d.months} сар</div>
                                            </div>
                                            <span className="badge tone-absent">{money(d.owed)}</span>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </main>
        </>
    );
}
