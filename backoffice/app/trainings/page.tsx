"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Input, InputNumber, Select, Skeleton } from "antd";
import { Search, Users } from "lucide-react";
import SiteShell from "@/app/components/SiteShell";
import { PublicAPI } from "@/app/utils/API";
import { money, type TrainingCard } from "@/app/types/api";

export default function TrainingsPage() {
    const [rows, setRows] = useState<TrainingCard[]>();
    const [cities, setCities] = useState<string[]>([]);
    const [search, setSearch] = useState("");
    const [city, setCity] = useState<string>();
    const [age, setAge] = useState<number | null>(null);

    const load = useCallback(async () => {
        const query = new URLSearchParams();
        if (search) query.set("q", search);
        if (city) query.set("city", city);
        if (age) query.set("age", String(age));
        const suffix = query.toString() ? `?${query}` : "";
        setRows(await PublicAPI<TrainingCard[]>(`/api/vh/public/trainings${suffix}`) ?? []);
    }, [search, city, age]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { PublicAPI<string[]>("/api/vh/public/cities").then((c) => setCities(c ?? [])); }, []);

    return (
        <SiteShell>
            <section className="site-detail-hero">
                <div className="site-container">
                    <h1>Сургалтууд</h1>
                    <p style={{ margin: 0, color: "#9AA3B0" }}>
                        Volleyhub системийг ашиглаж буй волейболын сургалтууд
                    </p>
                </div>
            </section>

            <section className="site-section">
                <div className="site-container">
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
                        <Input
                            prefix={<Search size={14} />}
                            placeholder="Сургалтын нэрээр хайх"
                            allowClear
                            style={{ maxWidth: 280 }}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <Select
                            allowClear
                            placeholder="Хот / аймаг"
                            style={{ width: 180 }}
                            onChange={setCity}
                            options={cities.map((c) => ({ value: c, label: c }))}
                        />
                        <InputNumber
                            placeholder="Нас"
                            min={3}
                            max={60}
                            style={{ width: 120 }}
                            onChange={setAge}
                        />
                    </div>

                    {!rows ? (
                        <Skeleton active />
                    ) : rows.length === 0 ? (
                        <div className="site-empty">Хайлтад тохирох сургалт олдсонгүй.</div>
                    ) : (
                        <div className="site-grid">
                            {rows.map((t) => (
                                <Link key={t.tenantid} href={`/trainings/${t.tenantid}`} className="site-card">
                                    <div className="site-card__media">
                                        {t.cover ? <img src={t.cover} alt={t.tenantname} /> : <Users size={28} />}
                                    </div>
                                    <div className="site-card__body">
                                        <div className="site-card__title">{t.tenantname}</div>
                                        {!!t.tagline && <div className="site-card__meta">{t.tagline}</div>}
                                        <div className="site-card__meta">
                                            {[t.city, t.district].filter(Boolean).join(", ") || t.address}
                                        </div>
                                        {(t.age_from || t.age_to) && (
                                            <div className="site-card__meta">
                                                Нас: {t.age_from ?? "?"}-{t.age_to ?? "?"}
                                            </div>
                                        )}
                                        <div className="site-card__meta">{t.groupcount} групп</div>
                                        <div className="site-card__price">
                                            {t.price_from ? `${money(t.price_from)}-с` : "Үнэ тодорхойгүй"}
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
