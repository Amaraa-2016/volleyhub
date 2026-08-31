"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton, Tag } from "antd";
import dayjs from "dayjs";
import SiteShell from "@/app/components/SiteShell";
import { PublicAPI } from "@/app/utils/API";
import { NEWS_CATEGORIES, type News } from "@/app/types/api";

const FILTERS = [
    { value: undefined, label: "Бүгд" },
    { value: 2, label: "Монгол" },
    { value: 1, label: "Дэлхий" },
    { value: 3, label: "Платформ" },
];

export default function NewsPage() {
    const [rows, setRows] = useState<News[]>();
    const [category, setCategory] = useState<number>();

    const load = useCallback(async () => {
        const suffix = category ? `?category=${category}` : "";
        setRows(await PublicAPI<News[]>(`/api/vh/public/news${suffix}`) ?? []);
    }, [category]);

    useEffect(() => { load(); }, [load]);

    return (
        <SiteShell>
            <section className="site-detail-hero">
                <div className="site-container">
                    <h1>Мэдээ</h1>
                    <p style={{ margin: 0, color: "#9AA3B0" }}>Дэлхий болон Монголын волейболын мэдээ</p>
                </div>
            </section>

            <section className="site-section">
                <div className="site-container">
                    <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
                        {FILTERS.map((f) => (
                            <Tag.CheckableTag
                                key={f.label}
                                checked={category === f.value}
                                onChange={() => setCategory(f.value)}
                                style={{ padding: "4px 14px", fontSize: 14 }}
                            >
                                {f.label}
                            </Tag.CheckableTag>
                        ))}
                    </div>

                    {!rows ? (
                        <Skeleton active />
                    ) : rows.length === 0 ? (
                        <div className="site-empty">Мэдээ алга байна.</div>
                    ) : (
                        <div className="site-grid">
                            {rows.map((n) => (
                                <Link key={n.newsid} href={`/news/${n.newsid}`} className="site-card">
                                    <div className="site-card__media">
                                        {n.cover ? <img src={n.cover} alt={n.title} /> : <span>Volleyhub</span>}
                                    </div>
                                    <div className="site-card__body">
                                        <div className="site-card__meta">
                                            {NEWS_CATEGORIES[n.category]}
                                            {n.published_at ? ` · ${dayjs(n.published_at).format("YYYY/MM/DD")}` : ""}
                                        </div>
                                        <div className="site-card__title">{n.title}</div>
                                        {!!n.summary && <div className="site-card__meta">{n.summary}</div>}
                                        {/* Plain text, not a link: the whole card is already an
                                            anchor, and an anchor inside an anchor is invalid. The
                                            detail page carries the clickable source. */}
                                        {!!n.source && (
                                            <div className="site-card__meta" style={{ marginTop: "auto", paddingTop: 8 }}>
                                                Эх сурвалж: {n.source}
                                            </div>
                                        )}
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
