"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Skeleton } from "antd";
import {
    ArrowRight, CalendarCheck, GraduationCap, MapPin, Newspaper, ShoppingBag, Users, Wallet,
} from "lucide-react";
import dayjs from "dayjs";
import SiteShell from "@/app/components/SiteShell";
import CenterStrip from "@/app/components/CenterStrip";
import ApplyModal from "@/app/components/ApplyModal";
import { PublicAPI } from "@/app/utils/API";
import {
    WEEKDAYS, minuteToTime, money,
    type CenterCard, type CourseCard, type News, type Product,
} from "@/app/types/api";

export default function HomePage() {
    const router = useRouter();
    const [trainings, setTrainings] = useState<CourseCard[]>();
    const [centers, setCenters] = useState<CenterCard[]>([]);
    const [news, setNews] = useState<News[]>();
    const [products, setProducts] = useState<Product[]>();
    const [applyOpen, setApplyOpen] = useState(false);

    useEffect(() => {
        PublicAPI<CourseCard[]>("/api/vh/public/trainings").then((rows) => setTrainings(rows ?? []));
        PublicAPI<CenterCard[]>("/api/vh/public/centers").then((rows) => setCenters(rows ?? []));
        PublicAPI<News[]>("/api/vh/public/news?take=3").then((rows) => setNews(rows ?? []));
        PublicAPI<Product[]>("/api/vh/public/products").then((rows) => setProducts(rows ?? []));
    }, []);

    return (
        <SiteShell>
            <section className="site-hero">
                <div className="site-container site-hero__inner">
                    <div className="site-hero__copy">
                        <span className="site-hero__eyebrow">Волейболын сургалтын нэгдсэн платформ</span>
                        <h1>Өөрт тохирох волейболын сургалтаа олоорой</h1>
                        <p>
                            Хуваарь, үнэ, байршил, багш нарыг нь нэг дороос харьцуулаад шууд холбогдоно.
                            Сургалт эрхлэгчид бүртгэл, ирц, төлбөрөө нэг системээс удирдана.
                        </p>
                        <div className="site-hero__actions">
                            <Link href="/trainings">
                                <Button type="primary" size="large">Сургалт хайх</Button>
                            </Link>
                            {/* The primary reason a centre owner is here, so it sits in the hero
                                rather than in a section they would have to scroll to find. */}
                            <Button size="large" ghost onClick={() => setApplyOpen(true)}>
                                Сургалтаа бүртгүүлэх
                            </Button>
                        </div>
                    </div>

                    <div className="site-hero__stats">
                        <Stat value={trainings?.length} label="Нээлттэй сургалт" />
                        <Stat value={centers.length} label="Сургалтын төв" />
                    </div>
                </div>
            </section>

            {centers.length > 0 && (
                <section className="site-section">
                    <div className="site-container">
                        <div className="site-section__head">
                            <div>
                                <h2>Сургалтын төвүүд</h2>
                                <p className="site-section__sub">Логон дээр дарж тухайн төвийн сургалтуудыг үзнэ</p>
                            </div>
                            <Link href="/trainings">
                                Бүгдийг харах <ArrowRight size={14} style={{ verticalAlign: "-2px" }} />
                            </Link>
                        </div>
                        <CenterStrip
                            centers={centers}
                            onSelect={(tenantid) =>
                                router.push(tenantid ? `/trainings?center=${tenantid}` : "/trainings")}
                        />
                    </div>
                </section>
            )}

            <section className="site-section site-section--muted">
                <div className="site-container">
                    <div className="site-section__head">
                        <div>
                            <h2>Сургалтууд</h2>
                            <p className="site-section__sub">Шинээр нээгдсэн болон элсэлт авч буй сургалтууд</p>
                        </div>
                        <Link href="/trainings">
                            Бүгдийг харах <ArrowRight size={14} style={{ verticalAlign: "-2px" }} />
                        </Link>
                    </div>

                    {!trainings ? (
                        <Skeleton active />
                    ) : trainings.length === 0 ? (
                        <div className="site-empty">Одоогоор нээлттэй сургалт алга байна.</div>
                    ) : (
                        <div className="site-grid">
                            {trainings.slice(0, 6).map((c) => (
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
                                        {!!(c.level || c.agegroup) && (
                                            <div className="site-card__meta">
                                                {[c.level, c.agegroup && `Нас: ${c.agegroup}`]
                                                    .filter(Boolean).join(" · ")}
                                            </div>
                                        )}
                                        {!!c.address && <div className="site-card__meta">{c.address}</div>}
                                        {c.schedule.length > 0 && (
                                            <div className="site-card__meta">
                                                {c.schedule
                                                    .map((s) => `${WEEKDAYS[s.weekday]} ${minuteToTime(s.start_minute)}`)
                                                    .join(", ")}
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

            <section className="site-section">
                <div className="site-container">
                    <div className="site-section__head">
                        <div>
                            <h2>Яагаад Volleyhub вэ</h2>
                            <p className="site-section__sub">Сурагч, эцэг эх, дасгалжуулагч гурвуулаа нэг дор</p>
                        </div>
                    </div>
                    <div className="site-grid">
                        <Feature icon={<MapPin size={20} />} title="Ойрхон сургалт">
                            Дүүрэг, насны ангилал, түвшингээр шүүж өөрт тохирохоо олно.
                        </Feature>
                        <Feature icon={<CalendarCheck size={20} />} title="Хуваарь ил тод">
                            Ямар өдөр, хэдэн цагт, хаана хичээллэдэг нь сургалтын хуудсанд бий.
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

            <section className="site-section site-section--muted">
                <div className="site-container">
                    <div className="site-section__head">
                        <div>
                            <h2>Мэдээ</h2>
                            <p className="site-section__sub">Дэлхий болон Монголын волейболын мэдээ</p>
                        </div>
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
                                        {n.cover ? <img src={n.cover} alt={n.title} /> : <Newspaper size={26} />}
                                    </div>
                                    <div className="site-card__body">
                                        <div className="site-card__meta">
                                            {n.published_at ? dayjs(n.published_at).format("YYYY/MM/DD") : ""}
                                        </div>
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
                            <div>
                                <h2>Дэлгүүр</h2>
                                <p className="site-section__sub">Бөмбөг, тор, хамгаалалт болон бусад хэрэгсэл</p>
                            </div>
                            <Link href="/shop">
                                Бүгдийг харах <ArrowRight size={14} style={{ verticalAlign: "-2px" }} />
                            </Link>
                        </div>
                        <div className="site-grid">
                            {products.slice(0, 4).map((p) => (
                                <Link key={p.productid} href={`/shop/${p.productid}`} className="site-card">
                                    <div className="site-card__media">
                                        {p.images[0] ? <img src={p.images[0]} alt={p.name} /> : <ShoppingBag size={26} />}
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

            {/* A second way into the same dialog, for someone who reached the bottom still reading. */}
            <section className="site-cta">
                <div className="site-container site-cta__inner">
                    <div>
                        <h2>Сургалт эрхэлдэг үү?</h2>
                        <p>
                            Хүсэлтээ илгээгээд баталгаажмагц сургалтаа сайтад гаргаж, суралцагчдаа
                            бүртгэж эхэлнэ.
                        </p>
                    </div>
                    <Button type="primary" size="large" onClick={() => setApplyOpen(true)}>
                        Хүсэлт илгээх
                    </Button>
                </div>
            </section>

            <ApplyModal open={applyOpen} onClose={() => setApplyOpen(false)} />
        </SiteShell>
    );
}

function Stat({ value, label }: { value?: number; label: string }) {
    return (
        <div className="site-stat">
            <div className="site-stat__value">{value ?? "—"}</div>
            <div className="site-stat__label">{label}</div>
        </div>
    );
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div className="site-feature">
            <div className="site-feature__icon">{icon}</div>
            <div className="site-card__title" style={{ marginBottom: 6 }}>{title}</div>
            <div className="site-card__meta">{children}</div>
        </div>
    );
}
