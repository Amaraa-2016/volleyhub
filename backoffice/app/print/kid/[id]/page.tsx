"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Printer } from "lucide-react";
import { useData, Loading, ErrorBox } from "@/app/components/ui";
import { LineChart } from "@/app/components/Charts";
import type {
    AttendanceSummary, Fee, Injury, Measurement, MeasureType, Note, RatingMonth, Settings, Skill, Student,
} from "@/app/types/api";
import { ageOf, ATTENDANCE, FEE_STATUS, GENDER, METHODS, money, periodLabel, shortDate, today } from "@/app/utils/format";

type Range = "all" | "year" | "3m";
type Part = "attendance" | "fees" | "progress" | "measure" | "health" | "notes";

const PARTS: { key: Part; label: string }[] = [
    { key: "attendance", label: "Ирц" },
    { key: "fees", label: "Төлбөр" },
    { key: "progress", label: "Ахиц" },
    { key: "measure", label: "Хэмжилт" },
    { key: "health", label: "Эрүүл мэнд" },
    { key: "notes", label: "Тэмдэглэл" },
];

// One child's whole history on A4, for printing or "Save as PDF" from the browser's print dialog
// (desktop, Android and iPhone all offer it) - no PDF library, nothing to install. The coach picks
// the period and the sections first, e.g. leaving payments out of a report for the parents.
export default function KidReport({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const kid = useData<Student>(`/api/vh/backoffice/students/${id}`);
    const settings = useData<Settings>("/api/vh/backoffice/settings");
    const att = useData<AttendanceSummary>(`/api/vh/backoffice/students/${id}/attendance`);
    const fees = useData<Fee[]>(`/api/vh/backoffice/fees?studentid=${id}`);
    const notes = useData<Note[]>(`/api/vh/backoffice/students/${id}/notes`);
    const ratings = useData<RatingMonth[]>(`/api/vh/backoffice/students/${id}/ratings`);
    const skills = useData<Skill[]>("/api/vh/backoffice/skills");
    const types = useData<MeasureType[]>("/api/vh/backoffice/measure-types");
    const measures = useData<Measurement[]>(`/api/vh/backoffice/students/${id}/measurements`);
    const injuries = useData<Injury[]>(`/api/vh/backoffice/students/${id}/injuries`);

    const [range, setRange] = useState<Range>("year");
    const [parts, setParts] = useState<Part[]>(["attendance", "fees", "progress", "measure", "health", "notes"]);
    const has = (p: Part) => parts.includes(p);

    // The first day that counts, as YYYY-MM-DD (dates compare as strings).
    const from = useMemo(() => {
        const d = new Date();
        if (range === "all") return "0000-00-00";
        if (range === "year") return `${d.getFullYear()}-01-01`;
        d.setMonth(d.getMonth() - 3);
        return d.toISOString().slice(0, 10);
    }, [range]);
    const inRange = (date: string) => date.slice(0, 10) >= from;
    const periodIn = (period: string) => `${period}-31` >= from;

    const s = kid.data;
    const history = (att.data?.history ?? []).filter((h) => inRange(h.session_date));
    const counts = history.reduce<Record<number, number>>((a, h) => ({ ...a, [h.status]: (a[h.status] ?? 0) + 1 }), {});
    const excused = counts[3] ?? 0;
    const rate = history.length - excused > 0 ? Math.round((((counts[1] ?? 0) + (counts[4] ?? 0)) / (history.length - excused)) * 100) : null;
    const feeRows = (fees.data ?? []).filter((f) => periodIn(f.period)).sort((a, b) => a.period.localeCompare(b.period));
    const owed = feeRows.filter((f) => f.status === 1 || f.status === 2).reduce((n, f) => n + f.balance, 0);
    const ratingRows = (ratings.data ?? []).filter((r) => periodIn(r.period)).slice().reverse();
    const noteRows = (notes.data ?? []).filter((n) => inRange(n.created));
    const injuryRows = (injuries.data ?? []).filter((i) => inRange(i.occurred_on) || i.status === 1);
    const a = s ? ageOf(s) : null;

    const loading = kid.loading && !s;

    return (
        <div className="report-wrap">
            <div className="report-tools no-print">
                <button className="btn sm" onClick={() => router.back()}><ChevronLeft size={16} /> Буцах</button>
                <div className="seg" style={{ flex: 1, minWidth: 240 }}>
                    <button className={range === "3m" ? "on" : ""} onClick={() => setRange("3m")}>3 сар</button>
                    <button className={range === "year" ? "on" : ""} onClick={() => setRange("year")}>Энэ он</button>
                    <button className={range === "all" ? "on" : ""} onClick={() => setRange("all")}>Бүгд</button>
                </div>
                <button className="btn primary sm" onClick={() => window.print()} disabled={loading}><Printer size={16} /> Хэвлэх / PDF</button>
                <div className="chips" style={{ flexBasis: "100%", flexWrap: "wrap" }}>
                    {PARTS.map((p) => (
                        <button key={p.key} className={`chip${has(p.key) ? " on" : ""}`}
                            onClick={() => setParts(has(p.key) ? parts.filter((x) => x !== p.key) : [...parts, p.key])}>{p.label}</button>
                    ))}
                </div>
                <p className="caption" style={{ flexBasis: "100%", margin: 0 }}>
                    PDF болгох бол хэвлэх цонхноос «Save as PDF / PDF-ээр хадгалах»-ыг сонгоно.
                </p>
            </div>

            {loading ? <div className="doc"><Loading rows={5} /></div> : kid.error ? <div className="doc"><ErrorBox code={kid.error} retry={kid.reload} /></div> : s && (
                <article className="doc">
                    <header className="doc-head">
                        <div>
                            <div className="doc-org">{settings.data?.tenantname ?? ""}</div>
                            <h1>{s.last_name} {s.first_name}</h1>
                            <div className="doc-sub">Хүүхдийн хөгжлийн тайлан · {range === "all" ? "Бүх хугацаа" : `${shortDate(from)} – ${shortDate(today())}`}</div>
                        </div>
                        <div className="doc-date">Хэвлэсэн: {shortDate(new Date().toISOString())}</div>
                    </header>

                    <section className="doc-grid">
                        <dl>
                            <dt>Хүйс, нас</dt><dd>{[s.gender ? GENDER[s.gender] : null, a !== null ? `${a} нас` : null].filter(Boolean).join(", ") || "—"}</dd>
                            <dt>Анги</dt><dd>{s.groupname ?? "—"}</dd>
                            <dt>Эхэлсэн</dt><dd>{s.start_date ? shortDate(s.start_date) : "—"}</dd>
                            <dt>Төлөв</dt><dd>{s.status === 3 ? `Гарсан${s.left_date ? ` (${shortDate(s.left_date)})` : ""}` : "Идэвхтэй"}</dd>
                        </dl>
                        <dl>
                            <dt>Холбоо барих</dt><dd>{[s.emergency_relation, s.emergency_name].filter(Boolean).join(" ") || "—"}</dd>
                            <dt>Утас</dt><dd>{s.emergency_phone ?? s.phone ?? "—"}</dd>
                            {has("fees") && <><dt>Сарын төлбөр</dt><dd>{s.fee_amount != null ? money(s.fee_amount) : "—"}{s.discountname ? ` (${s.discountname})` : ""}</dd></>}
                        </dl>
                    </section>

                    {has("attendance") && (
                        <section>
                            <h2>Ирц</h2>
                            {history.length === 0 ? <p className="doc-empty">Энэ хугацаанд ирц бүртгэгдээгүй.</p> : (
                                <>
                                    <div className="doc-kpis">
                                        <div><b>{rate ?? "—"}{rate !== null ? "%" : ""}</b><span>Ирцийн хувь</span></div>
                                        <div><b>{history.length}</b><span>Хичээл</span></div>
                                        <div><b>{counts[1] ?? 0}</b><span>Ирсэн</span></div>
                                        <div><b>{counts[4] ?? 0}</b><span>Хоцорсон</span></div>
                                        <div><b>{counts[2] ?? 0}</b><span>Ирээгүй</span></div>
                                        <div><b>{excused}</b><span>Чөлөөтэй</span></div>
                                    </div>
                                    <div className="doc-dots" aria-label="Хичээл бүрийн ирц">
                                        {history.slice().reverse().map((h) => (
                                            <i key={h.sessionid} className={`d${h.status}`} title={`${shortDate(h.session_date)} ${ATTENDANCE[h.status as 1 | 2 | 3 | 4]?.label ?? ""}`} />
                                        ))}
                                    </div>
                                    <p className="doc-legend"><i className="d1" />Ирсэн <i className="d4" />Хоцорсон <i className="d2" />Ирээгүй <i className="d3" />Чөлөөтэй</p>
                                    {history.some((h) => h.status !== 1) && (
                                        <table>
                                            <thead><tr><th>Огноо</th><th>Анги</th><th>Төлөв</th><th>Тэмдэглэл</th></tr></thead>
                                            <tbody>
                                                {history.filter((h) => h.status !== 1).map((h) => (
                                                    <tr key={h.sessionid}>
                                                        <td>{shortDate(h.session_date)}</td><td>{h.groupname}</td>
                                                        <td>{ATTENDANCE[h.status as 1 | 2 | 3 | 4]?.label}</td><td>{h.note ?? ""}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </>
                            )}
                        </section>
                    )}

                    {has("progress") && (
                        <section>
                            <h2>Ур чадварын үнэлгээ (1–5)</h2>
                            {ratingRows.length === 0 || !skills.data?.length ? <p className="doc-empty">Үнэлгээ хийгдээгүй.</p> : (
                                <table>
                                    <thead>
                                        <tr><th>Ур чадвар</th>{ratingRows.map((r) => <th key={r.period} className="num">{Number(r.period.slice(5))}/{r.period.slice(2, 4)}</th>)}</tr>
                                    </thead>
                                    <tbody>
                                        {skills.data.map((k) => (
                                            <tr key={k.skillid}>
                                                <td>{k.name}</td>
                                                {ratingRows.map((r) => <td key={r.period} className="num">{r.scores[k.skillid] ?? "–"}</td>)}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            {ratingRows.filter((r) => r.note).map((r) => (
                                <p key={r.period} className="doc-note"><b>{periodLabel(r.period)}:</b> {r.note}</p>
                            ))}
                        </section>
                    )}

                    {has("measure") && (
                        <section>
                            <h2>Биеийн хөгжил</h2>
                            {(types.data ?? []).every((t) => !(measures.data ?? []).some((m) => m.typeid === t.typeid && inRange(m.measured_on))) ? (
                                <p className="doc-empty">Энэ хугацаанд хэмжилт алга.</p>
                            ) : (
                                <div className="doc-charts">
                                    {(types.data ?? []).map((t) => {
                                        const pts = (measures.data ?? []).filter((m) => m.typeid === t.typeid && inRange(m.measured_on));
                                        if (pts.length === 0) return null;
                                        const change = pts.length > 1 ? pts[pts.length - 1].value - pts[0].value : null;
                                        return (
                                            <div key={t.typeid} className="doc-chart">
                                                <div className="doc-chart-head">
                                                    <b>{t.name}{t.unit ? ` (${t.unit})` : ""}</b>
                                                    {change !== null && <span>{change > 0 ? "+" : ""}{Math.round(change * 10) / 10} {t.unit}</span>}
                                                </div>
                                                <LineChart height={120} unit={t.unit}
                                                    points={pts.map((p) => ({ label: `${Number(p.measured_on.slice(5, 7))}/${p.measured_on.slice(2, 4)}`, value: p.value }))} />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    )}

                    {has("fees") && (
                        <section>
                            <h2>Төлбөр</h2>
                            {feeRows.length === 0 ? <p className="doc-empty">Энэ хугацаанд төлбөр алга.</p> : (
                                <>
                                    <table>
                                        <thead><tr><th>Сар</th><th className="num">Дүн</th><th className="num">Төлсөн</th><th>Огноо</th><th>Төлөв</th></tr></thead>
                                        <tbody>
                                            {feeRows.map((f) => (
                                                <tr key={f.feeid}>
                                                    <td>{periodLabel(f.period)}</td>
                                                    <td className="num">{money(f.amount)}</td>
                                                    <td className="num">{money(f.paid_amount)}</td>
                                                    <td>{f.payments.map((p) => `${shortDate(p.paid_at)} ${METHODS[p.method] ?? ""}`).join(", ")}</td>
                                                    <td>{FEE_STATUS[f.status]?.label}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td>Нийт</td>
                                                <td className="num">{money(feeRows.filter((f) => f.status !== 4).reduce((n, f) => n + f.amount, 0))}</td>
                                                <td className="num">{money(feeRows.reduce((n, f) => n + f.paid_amount, 0))}</td>
                                                <td colSpan={2}>{owed > 0 ? `Үлдэгдэл ${money(owed)}` : "Өргүй"}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </>
                            )}
                        </section>
                    )}

                    {has("health") && (
                        <section>
                            <h2>Эрүүл мэнд</h2>
                            <dl className="doc-inline">
                                <dt>Харшил</dt><dd>{s.allergies || "Байхгүй"}</dd>
                                <dt>Цусны бүлэг</dt><dd>{s.blood_type || "—"}</dd>
                                <dt>Өвчин, эм</dt><dd>{s.medical_notes || "—"}</dd>
                            </dl>
                            {injuryRows.length > 0 && (
                                <table>
                                    <thead><tr><th>Огноо</th><th>Хаана</th><th>Юу болсон</th><th>Төлөв</th></tr></thead>
                                    <tbody>
                                        {injuryRows.map((i) => (
                                            <tr key={i.injuryid}>
                                                <td>{shortDate(i.occurred_on)}</td><td>{i.body_part ?? ""}</td><td>{i.description}</td>
                                                <td>{i.status === 2 ? `Эдгэрсэн${i.recovered_on ? ` ${shortDate(i.recovered_on)}` : ""}` : "Эдгэрч байгаа"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </section>
                    )}

                    {has("notes") && noteRows.length > 0 && (
                        <section>
                            <h2>Багшийн тэмдэглэл</h2>
                            {noteRows.map((n) => (
                                <p key={n.noteid} className="doc-note"><b>{shortDate(n.created)}:</b> {n.body}</p>
                            ))}
                        </section>
                    )}

                    <footer className="doc-foot">
                        <span>{settings.data?.tenantname ?? ""}{settings.data?.contactphone ? ` · ${settings.data.contactphone}` : ""}</span>
                        <span>Багшийн гарын үсэг: ____________________</span>
                    </footer>
                </article>
            )}
        </div>
    );
}
