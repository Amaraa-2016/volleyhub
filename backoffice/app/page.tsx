"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Skeleton } from "antd";
import { ArrowRight, CalendarCheck, MapPin, Users, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import SiteShell from "@/app/components/SiteShell";
import CenterStrip from "@/app/components/CenterStrip";
import { PublicAPI } from "@/app/utils/API";
import { money, type CenterCard, type CourseCard, type News, type Product } from "@/app/types/api";

export default function HomePage() {
    const router = useRouter();
    const [trainings, setTrainings] = useState<CourseCard[]>();
    const [centers, setCenters] = useState<CenterCard[]>([]);
    const [news, setNews] = useState<News[]>();
    const [products, setProducts] = useState<Product[]>();

    useEffect(() => {
        PublicAPI<CourseCard[]>("/api/vh/public/trainings").then((rows) => setTrainings(rows ?? []));
        PublicAPI<CenterCard[]>("/api/vh/public/centers").then((rows) => setCenters(rows ?? []));
        PublicAPI<News[]>("/api/vh/public/news?take=3").then((rows) => setNews(rows ?? []));
        PublicAPI<Product[]>("/api/vh/public/products").then((rows) => setProducts(rows ?? []));
    }, []);

    return (
        <SiteShell>
            <section className="site-hero">
                <div className="site-container">
                    <h1>Волейболын сургалтуудыг нэг дороос</h1>
                    <p>
                        Хүүхэд, залуучуудад зориулсан волейболын сургалтуудыг хайж олоод, хуваарь,
                        үнэ, байршлыг нь харьцуулаарай. Сургалт эрхлэгчид бүртгэл, ирц, төлбөрөө
                        нэг системээс удирдана.
                    </p>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <Link href="/trainings">
                            <Button type="primary" size="large">Сургалт хайх</Button>
                        </Link>
                        <Link href="/club">
                            <Button size="large" ghost>Сургалтаа бүртгүүлэх</Button>
                        </Link>
                    </div>
                </div>
            </section>

            <section className="site-section">
                <div className="site-container">
                    <div className="site-grid">
                        <Feature icon={<MapPin size={20} />} title="Ойрхон сургалт">
                            Дүүрэг, хот, насны ангиллаар шүүж өөрт тохирох сургалтаа олно.
                        </Feature>
                        <Feature icon={<CalendarCheck size={20} />} title="Хуваарь ил тод">
                            Ямар өдөр, хэдэн цагт, аль зааланд хичээллэдэг нь сургалтын хуудсанд бий.
                        </Feature>
                        <Feature icon={<Users size={20} />} title="Ирц бүртгэл">
                            Дасгалжуулагч ирцээ утаснаасаа бүртгэж, эцэг эх нь шууд хардаг.
                        </Feature>
                        <Feature icon={<Wallet size={20} />} title="Төлбөрийн хяналт">
                            Сар бүрийн төлбөр, төлөлтийн түүх, үлдэгдэл нэг дор.
                        </Feature>
                    </div>
                </div>
            </section>

            {centers.length > 0 && (
                <section className="site-section site-section--muted">
                    <div className="site-container">
                        <div className="site-section__head">
                            <h2>Сургалтын төвүүд</h2>
                            <Link href="/trainings">
                                Бүгдийг харах <ArrowRight size={14} style={{ verticalAlign: "-2px" }} />
                            </Link>
                        </div>
                        {/* Clicking a logo opens the course list already filtered to that centre. */}
                        <CenterStrip
                            centers={centers}
                            onSelect={(tenantid) =>
                                router.push(tenantid ? `/trainings?center=${tenantid}` : "/trainings")}
                        />
                    </div>
                </section>
            )}

            <section className="site-section">
                <div className="site-container">
                    <div className="site-section__head">
                        <h2>Сургалтууд</h2>
                        <Link href="/trainings">
                            Бүгдийг харах <ArrowRight size={14} style={{ verticalAlign: "-2px" }} />
                        </Link>
                    </div>

                    {!trainings ? (
                        <Skeleton active />
                    ) : trainings.length === 0 ? (
                        <div className="site-empty">Одоогоор нийтлэгдсэн сургалт алга байна.</div>
                    ) : (
                        <div className="site-grid">
                            {trainings.slice(0, 6).map((c) => (
                                <Link
                                    key={`${c.tenantid}-${c.groupid}`}
                                    href={`/trainings/${c.tenantid}/${c.groupid}`}
                                    className="site-card"
                                >
                                    <div className="site-card__media">
                                        {c.cover ? <img src={c.cover} alt={c.name} /> : <Users size={28} />}
                                    </div>
                                    <div className="site-card__body">
                                        <div className="site-card__title">{c.name}</div>
                                        <div className="site-card__meta">{c.tenantname}</div>
                                        {!!(c.level || c.agegroup) && (
                                            <div className="site-card__meta">
                                                {[c.level, c.agegroup && `Нас: ${c.agegroup}`]
                                                    .filter(Boolean).join(" · ")}
                                            </div>
                                        )}
                                        {!!c.address && <div className="site-card__meta">{c.address}</div>}
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

            <section className="site-section site-section--muted">
                <div className="site-container">
                    <div className="site-section__head">
                        <h2>Мэдээ</h2>
                        <Link href="/news">
                            Бүгдийг харах <ArrowRight size={14} style={{ verticalAlign: "-2px" }} />
                        </Link>
                    </div>

                    {!news ? (
                        <Skeleton active />
                    ) : news.length === 0 ? (
                        <div className="site-empty">Одоогоор мэдээ алга байна.</div>
                    ) : (
                        <div className="site-grid">
                            {news.map((n) => (
                                <Link key={n.newsid} href={`/news/${n.newsid}`} className="site-card">
                                    <div className="site-card__media">
                                        {n.cover ? <img src={n.cover} alt={n.title} /> : <span>Volleyhub</span>}
                                    </div>
                                    <div className="site-card__body">
                                        <div className="site-card__title">{n.title}</div>
                                        {!!n.summary && <div className="site-card__meta">{n.summary}</div>}
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

            {!!products?.length && (
                <section className="site-section">
                    <div className="site-container">
                        <div className="site-section__head">
                            <h2>Дэлгүүр</h2>
                            <Link href="/shop">
                                Бүгдийг харах <ArrowRight size={14} style={{ verticalAlign: "-2px" }} />
                            </Link>
                        </div>
                        <div className="site-grid">
                            {products.slice(0, 4).map((p) => (
                                <Link key={p.productid} href={`/shop/${p.productid}`} className="site-card">
                                    <div className="site-card__media">
                                        {p.images[0] ? <img src={p.images[0]} alt={p.name} /> : <span>Бараа</span>}
                                    </div>
                                    <div className="site-card__body">
                                        <div className="site-card__title">{p.name}</div>
                                        {!!p.brand && <div className="site-card__meta">{p.brand}</div>}
                                        <div className="site-card__price">{money(p.price)}</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </SiteShell>
    );
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div className="site-card" style={{ padding: 20 }}>
            <div style={{ color: "#F26522", marginBottom: 10 }}>{icon}</div>
            <div className="site-card__title" style={{ marginBottom: 6 }}>{title}</div>
            <div className="site-card__meta">{children}</div>
        </div>
    );
}
