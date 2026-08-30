"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Input, Skeleton, Tag } from "antd";
import { GraduationCap, Search } from "lucide-react";
import dayjs from "dayjs";
import SiteShell from "@/app/components/SiteShell";
import { PublicAPI } from "@/app/utils/API";
import { WEEKDAYS, minuteToTime, money, type CourseCard } from "@/app/types/api";

export default function TrainingsPage() {
    const [rows, setRows] = useState<CourseCard[]>();
    const [search, setSearch] = useState("");

    const load = useCallback(async () => {
        const suffix = search ? `?q=${encodeURIComponent(search)}` : "";
        setRows(await PublicAPI<CourseCard[]>(`/api/vh/public/trainings${suffix}`) ?? []);
    }, [search]);

    useEffect(() => { load(); }, [load]);

    return (
        <SiteShell>
            <section className="site-detail-hero">
                <div className="site-container">
                    <h1>Сургалтууд</h1>
                    <p style={{ margin: 0, color: "#9AA3B0" }}>
                        Volleyhub дээр бүртгэлтэй волейболын сургалтууд
                    </p>
                </div>
            </section>

            <section className="site-section">
                <div className="site-container">
                    <div style={{ marginBottom: 24 }}>
                        <Input
                            prefix={<Search size={14} />}
                            placeholder="Сургалт, хаяг, насны ангиллаар хайх"
                            allowClear
                            style={{ maxWidth: 340 }}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {!rows ? (
                        <Skeleton active />
                    ) : rows.length === 0 ? (
                        <div className="site-empty">Одоогоор нээлттэй сургалт алга байна.</div>
                    ) : (
                        <div className="site-grid">
                            {rows.map((c) => (
                                <Link
                                    key={`${c.tenantid}-${c.groupid}`}
                                    href={`/trainings/${c.tenantid}/${c.groupid}`}
                                    className="site-card"
                                >
                                    <div className="site-card__media">
                                        {c.cover ? <img src={c.cover} alt={c.name} /> : <GraduationCap size={28} />}
                                    </div>
                                    <div className="site-card__body">
                                        <div className="site-card__title">{c.name}</div>
                                        <div className="site-card__meta">{c.tenantname}</div>
                                        {!!c.agegroup && <div className="site-card__meta">Нас: {c.agegroup}</div>}
                                        {!!c.address && <div className="site-card__meta">{c.address}</div>}

                                        {c.schedule.length > 0 && (
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                                                {c.schedule.map((s, i) => (
                                                    <Tag key={i} style={{ marginInlineEnd: 0 }}>
                                                        {WEEKDAYS[s.weekday]} {minuteToTime(s.start_minute)}
                                                    </Tag>
                                                ))}
                                            </div>
                                        )}

                                        {!!c.start_date && (
                                            <div className="site-card__meta">
                                                Эхлэх: {dayjs(c.start_date).format("YYYY/MM/DD")}
                                            </div>
                                        )}

                                        <div className="site-card__price">
                                            {c.fee_amount > 0 ? `${money(c.fee_amount)} / сар` : "Үнэ тодорхойгүй"}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </SiteShell>
    );
}
