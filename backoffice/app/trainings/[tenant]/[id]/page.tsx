"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button, Card, Descriptions, Skeleton, Tag } from "antd";
import { ArrowLeft, CalendarDays, MapPin, Phone, UserRound, Users } from "lucide-react";
import dayjs from "dayjs";
import SiteShell from "@/app/components/SiteShell";
import { PublicAPI } from "@/app/utils/API";
import { GENDERS, WEEKDAYS, minuteToTime, money, type CourseDetail } from "@/app/types/api";

export default function CourseDetailPage() {
    const params = useParams<{ tenant: string; id: string }>();
    const [course, setCourse] = useState<CourseDetail | null>();

    useEffect(() => {
        PublicAPI<CourseDetail>(`/api/vh/public/trainings/${params.tenant}/${params.id}`)
            .then((c) => setCourse(c ?? null));
    }, [params.tenant, params.id]);

    if (course === undefined) {
        return (
            <SiteShell>
                <div className="site-container" style={{ padding: "48px 20px" }}><Skeleton active /></div>
            </SiteShell>
        );
    }

    if (course === null) {
        return (
            <SiteShell>
                <div className="site-empty">Сургалт олдсонгүй.</div>
            </SiteShell>
        );
    }

    const spotsLeft = course.capacity > 0 ? Math.max(course.capacity - course.enrolled, 0) : null;

    return (
        <SiteShell>
            <section className="site-detail-hero">
                <div className="site-container">
                    <h1>{course.name}</h1>
                    <p style={{ margin: 0, color: "#9AA3B0" }}>{course.tenantname}</p>
                </div>
            </section>

            <section className="site-section">
                <div className="site-container">
                    <Link href="/trainings">
                        <Button type="text" icon={<ArrowLeft size={16} />} style={{ marginBottom: 16 }}>
                            Сургалтууд руу буцах
                        </Button>
                    </Link>

                    <div style={{ display: "grid", gap: 24, gridTemplateColumns: "minmax(0,2fr) minmax(260px,1fr)" }}>
                        <div>
                            {!!course.cover && (
                                <img
                                    src={course.cover}
                                    alt={course.name}
                                    style={{ width: "100%", borderRadius: 14, marginBottom: 20 }}
                                />
                            )}

                            {!!course.notes && (
                                <Card title="Танилцуулга" style={{ marginBottom: 20 }}>
                                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{course.notes}</div>
                                </Card>
                            )}

                            {course.coaches.length > 0 && (
                                <Card title="Багш нар" style={{ marginBottom: 20 }}>
                                    {course.coaches.map((c) => (
                                        <div
                                            key={c.coachid}
                                            style={{
                                                display: "flex", gap: 16, padding: "14px 0",
                                                borderTop: "1px solid #f0f1f3",
                                            }}
                                        >
                                            {c.photo ? (
                                                <img
                                                    src={c.photo}
                                                    alt=""
                                                    style={{
                                                        width: 76, height: 76, objectFit: "cover",
                                                        borderRadius: "50%", flexShrink: 0,
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    style={{
                                                        width: 76, height: 76, borderRadius: "50%",
                                                        background: "#eceef1", flexShrink: 0,
                                                        display: "flex", alignItems: "center",
                                                        justifyContent: "center", color: "#9AA3B0",
                                                    }}
                                                >
                                                    <UserRound size={28} />
                                                </div>
                                            )}
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: 15 }}>
                                                    {`${c.last_name} ${c.first_name}`.trim()}
                                                </div>
                                                {!!c.position && (
                                                    <div style={{ color: "#79808A", fontSize: 13 }}>{c.position}</div>
                                                )}
                                                {!!c.rank && <Tag color="orange" style={{ marginTop: 6 }}>{c.rank}</Tag>}
                                                {!!c.bio && (
                                                    <div style={{ marginTop: 8, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                                                        {c.bio}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </Card>
                            )}

                            <Card title="Хичээллэх цаг">
                                {course.schedule.length === 0 ? (
                                    <div style={{ color: "#79808A" }}>Хуваарь оруулаагүй байна.</div>
                                ) : (
                                    <>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                            {course.schedule.map((s, i) => (
                                                <Tag key={i} style={{ padding: "4px 10px", fontSize: 14 }}>
                                                    {WEEKDAYS[s.weekday]} {minuteToTime(s.start_minute)}-{minuteToTime(s.end_minute)}
                                                </Tag>
                                            ))}
                                        </div>
                                        <div style={{ color: "#79808A", marginTop: 10 }}>
                                            7 хоногт {course.schedule.length} удаа
                                        </div>
                                    </>
                                )}
                            </Card>
                        </div>

                        <div>
                            <Card>
                                <div style={{ fontSize: 24, fontWeight: 800, color: "#F26522", marginBottom: 4 }}>
                                    {course.fee_amount > 0 ? money(course.fee_amount) : "—"}
                                </div>
                                <div style={{ color: "#79808A", marginBottom: 16 }}>сарын төлбөр</div>

                                <Descriptions size="small" column={1} styles={{ label: { width: 110 } }}>
                                    {!!course.agegroup && (
                                        <Descriptions.Item label="Насны ангилал">{course.agegroup}</Descriptions.Item>
                                    )}
                                    {!!course.level && (
                                        <Descriptions.Item label="Түвшин">{course.level}</Descriptions.Item>
                                    )}
                                    <Descriptions.Item label="Хүйс">{GENDERS[course.gender]}</Descriptions.Item>
                                    {!!course.start_date && (
                                        <Descriptions.Item label="Эхлэх огноо">
                                            {dayjs(course.start_date).format("YYYY/MM/DD")}
                                        </Descriptions.Item>
                                    )}
                                    {spotsLeft !== null && (
                                        <Descriptions.Item label="Сул орон">
                                            {spotsLeft > 0 ? `${spotsLeft} хүн` : <Tag color="red">Дүүрсэн</Tag>}
                                        </Descriptions.Item>
                                    )}
                                    {!!course.venuename && (
                                        <Descriptions.Item label="Заал">{course.venuename}</Descriptions.Item>
                                    )}
                                </Descriptions>
                            </Card>

                            <Card title="Байршил, холбоо барих" style={{ marginTop: 16 }}>
                                {!!course.address && (
                                    <Row icon={<MapPin size={15} />} value={course.address} />
                                )}
                                {!!(course.phone || course.tenantphone) && (
                                    <Row
                                        icon={<Phone size={15} />}
                                        value={course.phone ?? course.tenantphone!}
                                        href={`tel:${course.phone ?? course.tenantphone}`}
                                    />
                                )}
                                {!!course.start_date && (
                                    <Row
                                        icon={<CalendarDays size={15} />}
                                        value={`Эхлэх: ${dayjs(course.start_date).format("YYYY/MM/DD")}`}
                                    />
                                )}
                                <Row icon={<Users size={15} />} value={course.tenantname} />

                                {!!course.map_url && (
                                    <a href={course.map_url} target="_blank" rel="noreferrer">
                                        <Button block type="primary" icon={<MapPin size={15} />} style={{ marginTop: 12 }}>
                                            Газрын зураг дээр харах
                                        </Button>
                                    </a>
                                )}
                            </Card>
                        </div>
                    </div>
                </div>
            </section>
        </SiteShell>
    );
}

function Row({ icon, value, href }: { icon: React.ReactNode; value: string; href?: string }) {
    const content = (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 0" }}>
            <span style={{ color: "#F26522", marginTop: 2 }}>{icon}</span>
            <span style={{ wordBreak: "break-word" }}>{value}</span>
        </div>
    );
    return href ? <a href={href}>{content}</a> : content;
}
