"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { ChevronRight, TriangleAlert, Settings, ClipboardList, ChartColumn } from "lucide-react";
import { ThemeToggle } from "@/app/components/Theme";
import { TopBar, useData, Loading, ErrorBox, Empty } from "@/app/components/ui";
import type { Dashboard, Session } from "@/app/types/api";
import { dayLabel, hhmm, money, periodLabel, shortName, today } from "@/app/utils/format";

function SessionRow({ s }: { s: Session }) {
    const cancelled = s.status === 3;
    return (
        <Link href={`/attendance/${s.sessionid}`} className="row">
            <div className="time-pill">{hhmm(s.start_minute)}<small>{hhmm(s.end_minute)}</small></div>
            <div className="grow">
                <div className="title">{s.groupname}</div>
                <div className="meta">
                    {s.venuename ? `${s.venuename} · ` : ""}{s.student_count} хүүхэд
                </div>
            </div>
            {cancelled ? (
                <span className="badge tone-muted">Цуцалсан</span>
            ) : s.attendance_taken ? (
                <span className="badge tone-present">{s.present_count}/{s.student_count} ирсэн</span>
            ) : (
                <span className="badge tone-brand">Ирц авах</span>
            )}
        </Link>
    );
}

export default function HomePage() {
    const { data: session } = useSession();
    const day = useMemo(() => today(), []);
    const { data, error, loading, reload } = useData<Dashboard>(`/api/vh/backoffice/dashboard?date=${day}`);

    const hello = session?.firstname || session?.name || "";
    const pct = data && data.month_expected > 0 ? Math.round((data.month_received / data.month_expected) * 100) : 0;

    return (
        <>
            <TopBar
                sub={dayLabel(day)}
                title={hello ? `Сайн уу, ${hello}` : "Сайн уу"}
                right={<><ThemeToggle /><Link href="/me" className="icon-btn" aria-label="Тохиргоо"><Settings size={22} /></Link></>}
            />
            <main className="page">
                {loading && !data ? <Loading rows={4} /> : error && !data ? <ErrorBox code={error} retry={reload} /> : data && (
                    <>
                        {data.groups === 0 ? (
                            <div className="card pad">
                                <Empty title="Эхний ангиа үүсгэе" text="Анги нэмээд хуваарь, хүүхдүүдээ оруулбал ирц, төлбөр энд харагдана.">
                                    <Link href="/groups?new=1" className="btn primary">Анги нэмэх</Link>
                                </Empty>
                            </div>
                        ) : (
                            <>
                                <Link href="/fees" className="hero" style={{ display: "block" }}>
                                    <span className="ball" />
                                    <div className="label">{periodLabel(data.period)} · орсон төлбөр</div>
                                    <div className="value">{money(data.month_received)} <small>/ {money(data.month_expected)}</small></div>
                                    <div className="bar"><span style={{ width: `${pct}%` }} /></div>
                                    <div className="foot">
                                        <span>{pct}% цугларсан</span>
                                        <span>{data.month_unpaid > 0 ? `${data.month_unpaid} хүүхэд төлөөгүй` : "Бүгд төлсөн"}</span>
                                    </div>
                                </Link>

                                <section className="section">
                                    <div className="section-head">
                                        <h2>Өнөөдрийн хичээл</h2>
                                        <Link href="/attendance">Бүгд</Link>
                                    </div>
                                    {data.today.length === 0 ? (
                                        <div className="card"><Empty title="Өнөөдөр хичээлгүй" text="Амрах өдөр." /></div>
                                    ) : (
                                        <div className="list">{data.today.map((s) => <SessionRow key={s.sessionid} s={s} />)}</div>
                                    )}
                                </section>

                                {data.absent_streaks.length > 0 && (
                                    <section className="section">
                                        <div className="section-head"><h2>Сүүлийн хичээлүүдэд ирээгүй</h2></div>
                                        <div className="list">
                                            {data.absent_streaks.map((a) => (
                                                <Link key={a.studentid} href={`/kids/${a.studentid}`} className="row">
                                                    <TriangleAlert size={20} color="var(--absent)" />
                                                    <div className="grow">
                                                        <div className="title">{shortName(a.last_name, a.first_name)}</div>
                                                        <div className="meta">{a.groupname}</div>
                                                    </div>
                                                    <span className="badge tone-absent">{a.missed} удаа дараалан</span>
                                                </Link>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {data.upcoming.length > 0 && (
                                    <section className="section">
                                        <div className="section-head"><h2>Дараагийн хичээлүүд</h2></div>
                                        <div className="list">
                                            {data.upcoming.map((s) => (
                                                <Link key={s.sessionid} href={`/attendance/${s.sessionid}`} className="row">
                                                    <div className="time-pill">{hhmm(s.start_minute)}</div>
                                                    <div className="grow">
                                                        <div className="title">{s.groupname}</div>
                                                        <div className="meta">{dayLabel(s.session_date)}</div>
                                                    </div>
                                                    <ChevronRight size={18} className="muted" />
                                                </Link>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                <section className="section quick mobile-only">
                                    <Link href="/plans" className="action-tile"><span className="ico tone-court"><ClipboardList size={20} /></span>Төлөвлөгөө</Link>
                                    <Link href="/reports" className="action-tile"><span className="ico tone-brand"><ChartColumn size={20} /></span>Тайлан</Link>
                                    <Link href="/me" className="action-tile"><span className="ico tone-muted"><Settings size={20} /></span>Тохиргоо</Link>
                                </section>

                                <section className="section stats">
                                    <Link href="/kids" className="card stat">
                                        <div className="label">Хүүхэд</div>
                                        <div className="value">{data.students}</div>
                                    </Link>
                                    <Link href="/groups" className="card stat">
                                        <div className="label">Анги</div>
                                        <div className="value">{data.groups}</div>
                                    </Link>
                                </section>
                            </>
                        )}
                    </>
                )}
            </main>
        </>
    );
}
