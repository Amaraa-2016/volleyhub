"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Skeleton } from "antd";
import {
    ArrowRight, CalendarCheck, GraduationCap, MapPin, Newspaper, ShoppingBag, Users, Wallet,
} from "lucide-react";
import dayjs from "dayjs";
import SiteShell from "@/app/components/SiteShell";
import CenterCards from "@/app/components/CenterCards";
import Wordmark from "@/app/components/Wordmark";
import ApplyForm from "@/app/components/ApplyForm";
import { PublicAPI } from "@/app/utils/API";
import { money, type CenterCard, type CourseCard, type News, type Product } from "@/app/types/api";

export default function HomePage() {
    const [centers, setCenters] = useState<CenterCard[]>([]);
    const [courses, setCourses] = useState<CourseCard[]>([]);
    const [news, setNews] = useState<News[]>();
    const [products, setProducts] = useState<Product[]>();

    useEffect(() => {
        PublicAPI<CenterCard[]>("/api/vh/public/centers").then((rows) => setCenters(rows ?? []));
        PublicAPI<CourseCard[]>("/api/vh/public/trainings").then((rows) => setCourses(rows ?? []));
        PublicAPI<News[]>("/api/vh/public/news?take=3").then((rows) => setNews(rows ?? []));
        PublicAPI<Product[]>("/api/vh/public/products").then((rows) => setProducts(rows ?? []));
    }, []);

    // The directory returns every course, grouped by centre; newest first is this page's ordering,
    // not the directory's, so it is done here.
    const latest = useMemo(
        () => [...courses]
            .sort((a, b) => (a.created < b.created ? 1 : a.created > b.created ? -1 : 0))
            .slice(0, 3),
        [courses],
    );

    return (
        <SiteShell>
            {/* The page opens on the one thing only it can start: a centre signing up. Browsing
                courses has its own page behind Сургалтууд in the header. */}
            <section className="site-section apply-section" id="apply">
                <div className="site-container apply-layout">
                    <div className="apply-copy">
                        <span className="site-eyebrow">Сургалт эрхлэгчдэд</span>
                        <h2>Сургалтаа <Wordmark /> дээр бүртгүүлээрэй</h2>
                        <p>
                            Хүсэлтээ илгээгээд баталгаажмагц сургалтаа сайтад гаргаж, суралцагч,
                            ирц, төлбөрөө нэг системээс удирдаж эхэлнэ.
                        </p>

                        <ol className="apply-steps">
                            <li>
                                <b>Бүртгэлээ үүсгэнэ</b>
                                Овог, нэр, утасны дугаар, нууц үг л хангалттай.
                            </li>
                            <li>
                                <b>Хүсэлтээ илгээнэ</b>
                                Төвийн нэр, лого, холбоо барих мэдээллээ бөглөнө.
                            </li>
                            <li>
                                <b>Баталгаажсаны дараа</b>
                                Удирдлага хэсэг нээгдэж, сургалт, багш, суралцагчаа бүртгэнэ.
                            </li>
                        </ol>
                    </div>

                    <div className="apply-card">
                        <ApplyForm />
                    </div>
                </div>
            </section>

            {/* Above the centres: what the platform is for, before the list of who is on it. */}
            <section className="site-section site-section--muted">
                <div className="site-container">
                    <div className="site-section__head">
                        <div>
                            <h2>Яагаад <Wordmark /> вэ</h2>
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

            {centers.length > 0 && (
                <section className="site-section">
                    <div className="site-container">
                        <div className="site-section__head">
                            <div>
                                <h2>Сургалтын төвүүд</h2>
                                <p className="site-section__sub">
                                    Төв дээр дарж тухайн төвийн сургалтуудыг үзнэ
                                </p>
                            </div>
                            <Link href="/trainings">
                                Бүгдийг харах <ArrowRight size={14} style={{ verticalAlign: "-2px" }} />
                            </Link>
                        </div>
                        <CenterCards centers={centers} />
                    </div>
                </section>
            )}

            {!!latest.length && (
                <section className="site-section site-section--muted">
                    <div className="site-container">
                        <div className="site-section__head">
                            <div>
                                <h2>Шинэ сургалтууд</h2>
                                <p className="site-section__sub">Хамгийн сүүлд зарлагдсан сургалтууд</p>
                            </div>
                            <Link href="/trainings">
                                Бүгдийг харах <ArrowRight size={14} style={{ verticalAlign: "-2px" }} />
                            </Link>
                        </div>
                        <div className="site-grid site-grid--wide">
                            {latest.map((c) => (
                                <Link
                                    key={`${c.tenantid}-${c.groupid}`}
                                    href={`/trainings/${c.tenantid}/${c.groupid}`}
                                    className="site-card"
                                >
                                    <div className="site-card__media">
                                        {c.cover ? <img src={c.cover} alt={c.name} /> : <GraduationCap size={26} />}
                                    </div>
                                    <div className="site-card__body">
                                        <div className="site-card__meta">{c.tenantname}</div>
                                        <div className="site-card__title">{c.name}</div>
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
                    </div>
                </section>
            )}

            <section className="site-section">
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
                        <div className="site-grid site-grid--wide">
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
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {!!products?.length && (
                <section className="site-section site-section--muted">
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

        </SiteShell>
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
