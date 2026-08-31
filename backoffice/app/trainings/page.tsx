"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Segmented, Skeleton, Tag } from "antd";
import { ExternalLink, GraduationCap, List as ListIcon, Map as MapIcon, MapPin, Search } from "lucide-react";
import dayjs from "dayjs";
import SiteShell from "@/app/components/SiteShell";
import CenterStrip from "@/app/components/CenterStrip";
import CourseMap from "@/app/components/CourseMap";
import { PublicAPI } from "@/app/utils/API";
import { WEEKDAYS, minuteToTime, money, type CenterCard, type CourseCard } from "@/app/types/api";

type View = "list" | "map";

const externalMap = (course: CourseCard) =>
    course.map_url ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(course.address ?? "")}`;

function TrainingsList() {
    const router = useRouter();
    const params = useSearchParams();

    // The selected centre lives in the URL so the filtered view can be shared and survives a
    // reload - the home page links straight into it.
    const centerParam = params.get("center");
    const center = centerParam ? Number(centerParam) : undefined;

    const [rows, setRows] = useState<CourseCard[]>();
    const [centers, setCenters] = useState<CenterCard[]>([]);
    const [search, setSearch] = useState("");
    const [view, setView] = useState<View>("list");
    const [focused, setFocused] = useState<CourseCard>();

    const load = useCallback(async () => {
        const query = new URLSearchParams();
        if (search) query.set("q", search);
        if (center) query.set("center", String(center));
        const suffix = query.toString() ? `?${query}` : "";
        setRows(await PublicAPI<CourseCard[]>(`/api/vh/public/trainings${suffix}`) ?? []);
    }, [search, center]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        PublicAPI<CenterCard[]>("/api/vh/public/centers").then((c) => setCenters(c ?? []));
    }, []);

    // A course is pinnable only once its Google Maps link yielded coordinates; the rest are counted
    // under the list rather than silently dropped.
    const mappable = useMemo(
        () => (rows ?? []).filter((c) => c.latitude != null && c.longitude != null),
        [rows],
    );
    const unmappable = useMemo(
        () => (rows ?? []).filter((c) => c.latitude == null || c.longitude == null),
        [rows],
    );

    // Keep the focused course valid as filters change.
    useEffect(() => {
        if (mappable.length === 0) { setFocused(undefined); return; }
        setFocused((current) => {
            const stillThere = current
                && mappable.some((c) => c.tenantid === current.tenantid && c.groupid === current.groupid);
            return stillThere ? current : mappable[0];
        });
    }, [mappable]);

    const selectCenter = (tenantid?: number) => {
        setRows(undefined);
        router.push(tenantid ? `/trainings?center=${tenantid}` : "/trainings");
    };

    const selectedName = centers.find((c) => c.tenantid === center)?.tenantname;

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
                    {centers.length > 0 && (
                        <>
                            <div className="site-section__head" style={{ marginBottom: 12 }}>
                                <h2 style={{ fontSize: 20 }}>Сургалтын төвүүд</h2>
                            </div>
                            <CenterStrip centers={centers} selected={center} onSelect={selectCenter} />
                        </>
                    )}

                    <div className="trainings-toolbar">
                        <Input
                            prefix={<Search size={14} />}
                            placeholder="Сургалт, хаяг, насны ангиллаар хайх"
                            allowClear
                            style={{ maxWidth: 340 }}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <Segmented
                            value={view}
                            onChange={(v) => setView(v as View)}
                            options={[
                                { value: "list", label: "Жагсаалт", icon: <ListIcon size={14} /> },
                                { value: "map", label: "Газрын зураг", icon: <MapIcon size={14} /> },
                            ]}
                        />
                    </div>

                    {!!selectedName && (
                        <div style={{ marginBottom: 16, color: "#79808A" }}>
                            <b style={{ color: "#1F2329" }}>{selectedName}</b>-ийн сургалтууд
                        </div>
                    )}

                    {!rows ? (
                        <Skeleton active />
                    ) : rows.length === 0 ? (
                        <div className="site-empty">
                            {selectedName
                                ? `${selectedName} дээр нээлттэй сургалт алга байна.`
                                : "Одоогоор нээлттэй сургалт алга байна."}
                        </div>
                    ) : view === "list" ? (
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
                                        {!!(c.level || c.agegroup) && (
                                            <div className="site-card__meta">
                                                {[c.level, c.agegroup && `Нас: ${c.agegroup}`]
                                                    .filter(Boolean).join(" · ")}
                                            </div>
                                        )}
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
                    ) : mappable.length === 0 ? (
                        <div className="site-empty">
                            Байршил тэмдэглэсэн сургалт алга байна. Жагсаалт хэсгээс үзнэ үү.
                        </div>
                    ) : (
                        <div className="map-layout">
                            <div className="map-list">
                                {mappable.map((c) => {
                                    const active = focused?.tenantid === c.tenantid && focused?.groupid === c.groupid;
                                    return (
                                        <button
                                            key={`${c.tenantid}-${c.groupid}`}
                                            type="button"
                                            className={`map-item${active ? " map-item--active" : ""}`}
                                            onClick={() => setFocused(c)}
                                        >
                                            <div className="map-item__title">{c.name}</div>
                                            <div className="map-item__meta">{c.tenantname}</div>
                                            <div className="map-item__meta">
                                                <MapPin size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                                                {c.address}
                                            </div>
                                            <div className="map-item__price">
                                                {c.fee_amount > 0 ? `${money(c.fee_amount)} / сар` : "Үнэ тодорхойгүй"}
                                            </div>
                                        </button>
                                    );
                                })}

                                {unmappable.length > 0 && (
                                    <div className="map-item__note">
                                        {unmappable.length} сургалт байршлаа тэмдэглээгүй тул зураг дээр
                                        харагдахгүй.
                                    </div>
                                )}
                            </div>

                            <div className="map-panel">
                                <CourseMap courses={mappable} selected={focused} onSelect={setFocused} />
                                {focused && (
                                    <div className="map-panel__foot">
                                        <div>
                                            <div style={{ fontWeight: 700 }}>{focused.name}</div>
                                            <div style={{ color: "#79808A", fontSize: 13 }}>
                                                {focused.tenantname}
                                                {focused.address ? ` · ${focused.address}` : ""}
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                            <a href={externalMap(focused)} target="_blank" rel="noreferrer">
                                                <Button icon={<ExternalLink size={14} />}>Google Map</Button>
                                            </a>
                                            <Link href={`/trainings/${focused.tenantid}/${focused.groupid}`}>
                                                <Button type="primary">Дэлгэрэнгүй</Button>
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </SiteShell>
    );
}

export default function TrainingsPage() {
    // useSearchParams needs a Suspense boundary under the app router.
    return (
        <Suspense>
            <TrainingsList />
        </Suspense>
    );
}
