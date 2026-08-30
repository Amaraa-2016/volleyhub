"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, Skeleton, Table, Tag } from "antd";
import { Facebook, Globe, Instagram, Mail, MapPin, Phone } from "lucide-react";
import SiteShell from "@/app/components/SiteShell";
import { PublicAPI } from "@/app/utils/API";
import {
    GENDERS, WEEKDAYS, minuteToTime, money,
    type PublicGroup, type TrainingDetail,
} from "@/app/types/api";

export default function TrainingDetailPage() {
    const params = useParams<{ id: string }>();
    const [training, setTraining] = useState<TrainingDetail | null>();

    useEffect(() => {
        PublicAPI<TrainingDetail>(`/api/vh/public/trainings/${params.id}`)
            .then((t) => setTraining(t ?? null));
    }, [params.id]);

    if (training === undefined) {
        return (
            <SiteShell>
                <div className="site-container" style={{ padding: "48px 20px" }}>
                    <Skeleton active />
                </div>
            </SiteShell>
        );
    }

    if (training === null) {
        return (
            <SiteShell>
                <div className="site-empty">Сургалт олдсонгүй.</div>
            </SiteShell>
        );
    }

    return (
        <SiteShell>
            <section className="site-detail-hero">
                <div className="site-container">
                    <h1>{training.tenantname}</h1>
                    {!!training.tagline && <p style={{ margin: 0, color: "#9AA3B0" }}>{training.tagline}</p>}
                </div>
            </section>

            <section className="site-section">
                <div className="site-container" style={{ display: "grid", gap: 24, gridTemplateColumns: "minmax(0,2fr) minmax(240px,1fr)" }}>
                    <div>
                        {!!training.description && (
                            <Card title="Танилцуулга" style={{ marginBottom: 20 }}>
                                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{training.description}</div>
                            </Card>
                        )}

                        <Card title="Группүүд ба хуваарь">
                            {training.groups.length === 0 ? (
                                <div style={{ color: "#79808A" }}>Групп нийтлээгүй байна.</div>
                            ) : (
                                <Table
                                    rowKey="groupid"
                                    dataSource={training.groups}
                                    pagination={false}
                                    scroll={{ x: 640 }}
                                    columns={[
                                        {
                                            title: "Групп",
                                            render: (_: unknown, g: PublicGroup) => (
                                                <>
                                                    <div style={{ fontWeight: 600 }}>{g.name}</div>
                                                    <div style={{ color: "#79808A", fontSize: 13 }}>
                                                        {[g.level, g.agegroup, GENDERS[g.gender]].filter(Boolean).join(" · ")}
                                                    </div>
                                                </>
                                            ),
                                        },
                                        {
                                            title: "Хуваарь",
                                            render: (_: unknown, g: PublicGroup) =>
                                                g.schedule.length === 0 ? "-" : (
                                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                                        {g.schedule.map((s, i) => (
                                                            <Tag key={i}>
                                                                {WEEKDAYS[s.weekday]} {minuteToTime(s.start_minute)}-{minuteToTime(s.end_minute)}
                                                            </Tag>
                                                        ))}
                                                    </div>
                                                ),
                                        },
                                        { title: "Заал", dataIndex: "venuename", width: 140 },
                                        {
                                            title: "Сарын төлбөр",
                                            width: 130,
                                            render: (_: unknown, g: PublicGroup) => <b>{money(g.fee_amount)}</b>,
                                        },
                                        {
                                            title: "Сул орон",
                                            width: 100,
                                            render: (_: unknown, g: PublicGroup) =>
                                                g.capacity > 0 ? `${Math.max(g.capacity - g.enrolled, 0)}` : "-",
                                        },
                                    ]}
                                />
                            )}
                        </Card>

                        {training.photos.length > 0 && (
                            <Card title="Зурагнууд" style={{ marginTop: 20 }}>
                                <div className="site-grid">
                                    {training.photos.map((src, i) => (
                                        <img
                                            key={i}
                                            src={src}
                                            alt=""
                                            style={{ width: "100%", borderRadius: 10, objectFit: "cover", aspectRatio: "4/3" }}
                                        />
                                    ))}
                                </div>
                            </Card>
                        )}
                    </div>

                    <div>
                        <Card title="Холбоо барих">
                            <ContactRow icon={<MapPin size={15} />} value={[training.city, training.district, training.address].filter(Boolean).join(", ")} />
                            <ContactRow icon={<Phone size={15} />} value={training.contactphone} href={training.contactphone ? `tel:${training.contactphone}` : undefined} />
                            <ContactRow icon={<Mail size={15} />} value={training.email} href={training.email ? `mailto:${training.email}` : undefined} />
                            <ContactRow icon={<Globe size={15} />} value={training.website} href={training.website ?? undefined} />
                            <ContactRow icon={<Facebook size={15} />} value={training.facebook} href={training.facebook ?? undefined} />
                            <ContactRow icon={<Instagram size={15} />} value={training.instagram} href={training.instagram ?? undefined} />
                            {(training.age_from || training.age_to) && (
                                <div style={{ marginTop: 12, color: "#79808A" }}>
                                    Насны хязгаар: {training.age_from ?? "?"}-{training.age_to ?? "?"}
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            </section>
        </SiteShell>
    );
}

function ContactRow({ icon, value, href }: { icon: React.ReactNode; value?: string | null; href?: string }) {
    if (!value) return null;
    const content = (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 0" }}>
            <span style={{ color: "#F26522", marginTop: 2 }}>{icon}</span>
            <span style={{ wordBreak: "break-word" }}>{value}</span>
        </div>
    );
    return href ? <a href={href} target="_blank" rel="noreferrer">{content}</a> : content;
}
