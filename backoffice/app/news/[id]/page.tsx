"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button, Skeleton } from "antd";
import { ArrowLeft } from "lucide-react";
import dayjs from "dayjs";
import SiteShell from "@/app/components/SiteShell";
import { PublicAPI } from "@/app/utils/API";
import { NEWS_CATEGORIES, type News } from "@/app/types/api";

export default function NewsDetailPage() {
    const params = useParams<{ id: string }>();
    const [post, setPost] = useState<News | null>();

    useEffect(() => {
        PublicAPI<News>(`/api/vh/public/news/${params.id}`).then((n) => setPost(n ?? null));
    }, [params.id]);

    return (
        <SiteShell>
            <section className="site-section">
                <div className="site-container" style={{ maxWidth: 760 }}>
                    <Link href="/news">
                        <Button type="text" icon={<ArrowLeft size={16} />} style={{ marginBottom: 16 }}>
                            Мэдээ рүү буцах
                        </Button>
                    </Link>

                    {post === undefined ? (
                        <Skeleton active paragraph={{ rows: 8 }} />
                    ) : post === null ? (
                        <div className="site-empty">Мэдээ олдсонгүй.</div>
                    ) : (
                        <article>
                            <div className="site-card__meta" style={{ marginBottom: 8 }}>
                                {NEWS_CATEGORIES[post.category]}
                                {post.published_at ? ` · ${dayjs(post.published_at).format("YYYY/MM/DD")}` : ""}
                                {` · ${post.view_count} үзсэн`}
                            </div>
                            <h1 style={{ fontSize: 30, letterSpacing: -0.6, margin: "0 0 16px" }}>{post.title}</h1>

                            {!!post.cover && (
                                <img
                                    src={post.cover}
                                    alt={post.title}
                                    style={{ width: "100%", borderRadius: 12, marginBottom: 20 }}
                                />
                            )}

                            {!!post.summary && (
                                <p style={{ fontSize: 17, color: "#4a5058", lineHeight: 1.7 }}>{post.summary}</p>
                            )}

                            {/* Plain text, deliberately: the body is typed by an admin, so rendering it as
                                HTML would turn the console into an XSS vector on the public site. */}
                            {!!post.body && (
                                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, fontSize: 16 }}>{post.body}</div>
                            )}

                            {!!post.source && (
                                <div style={{ marginTop: 28, color: "#79808A" }}>
                                    Эх сурвалж:{" "}
                                    {post.source_url ? (
                                        <a href={post.source_url} target="_blank" rel="noreferrer">{post.source}</a>
                                    ) : post.source}
                                </div>
                            )}
                        </article>
                    )}
                </div>
            </section>
        </SiteShell>
    );
}
