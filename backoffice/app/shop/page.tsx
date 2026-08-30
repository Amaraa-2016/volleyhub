"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Input, Skeleton, Tag } from "antd";
import { Search, ShoppingBag } from "lucide-react";
import SiteShell from "@/app/components/SiteShell";
import { PublicAPI } from "@/app/utils/API";
import { money, type Product } from "@/app/types/api";

export default function ShopPage() {
    const [rows, setRows] = useState<Product[]>();
    const [categories, setCategories] = useState<string[]>([]);
    const [category, setCategory] = useState<string>();
    const [search, setSearch] = useState("");

    const load = useCallback(async () => {
        const query = new URLSearchParams();
        if (category) query.set("category", category);
        if (search) query.set("q", search);
        const suffix = query.toString() ? `?${query}` : "";
        setRows(await PublicAPI<Product[]>(`/api/vh/public/products${suffix}`) ?? []);
    }, [category, search]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        PublicAPI<string[]>("/api/vh/public/product-categories").then((c) => setCategories(c ?? []));
    }, []);

    return (
        <SiteShell>
            <section className="site-detail-hero">
                <div className="site-container">
                    <h1>Дэлгүүр</h1>
                    <p style={{ margin: 0, color: "#9AA3B0" }}>
                        Волейболын бөмбөг, тор, хамгаалалт болон бусад хэрэгсэл
                    </p>
                </div>
            </section>

            <section className="site-section">
                <div className="site-container">
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                        <Input
                            prefix={<Search size={14} />}
                            placeholder="Бараа хайх"
                            allowClear
                            style={{ maxWidth: 280 }}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {categories.length > 0 && (
                        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
                            <Tag.CheckableTag
                                checked={!category}
                                onChange={() => setCategory(undefined)}
                                style={{ padding: "4px 14px", fontSize: 14 }}
                            >
                                Бүгд
                            </Tag.CheckableTag>
                            {categories.map((c) => (
                                <Tag.CheckableTag
                                    key={c}
                                    checked={category === c}
                                    onChange={() => setCategory(c)}
                                    style={{ padding: "4px 14px", fontSize: 14 }}
                                >
                                    {c}
                                </Tag.CheckableTag>
                            ))}
                        </div>
                    )}

                    {!rows ? (
                        <Skeleton active />
                    ) : rows.length === 0 ? (
                        <div className="site-empty">Бараа олдсонгүй.</div>
                    ) : (
                        <div className="site-grid">
                            {rows.map((p) => (
                                <Link key={p.productid} href={`/shop/${p.productid}`} className="site-card">
                                    <div className="site-card__media">
                                        {p.images[0] ? <img src={p.images[0]} alt={p.name} /> : <ShoppingBag size={28} />}
                                    </div>
                                    <div className="site-card__body">
                                        <div className="site-card__title">{p.name}</div>
                                        {!!p.brand && <div className="site-card__meta">{p.brand}</div>}
                                        {p.stock <= 0 && <Tag color="red">Дууссан</Tag>}
                                        <div className="site-card__price">
                                            {money(p.price)}
                                            {!!p.old_price && (
                                                <span style={{ marginLeft: 8, color: "#9AA3B0", textDecoration: "line-through", fontWeight: 400 }}>
                                                    {money(p.old_price)}
                                                </span>
                                            )}
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
