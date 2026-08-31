"use client";

import { App, Card, Col, Row, Statistic, Table, Tag, Spin } from "antd";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import dayjs from "dayjs";
import AppShell from "@/app/components/AppShell";
import { ImageUpload } from "@/app/components/ImageUpload";
import { API, APIWithError, errorText } from "@/app/utils/API";
import {
    SESSION_STATUS, minuteToTime, money,
    type Dashboard, type Session, type TrainingProfile,
} from "@/app/types/api";

export default function DashboardPage() {
    const { data: session } = useSession();
    const { message } = App.useApp();
    const [data, setData] = useState<Dashboard>();
    const [logo, setLogo] = useState<string>();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        API<Dashboard>("/api/vh/backoffice/dashboard")
            .then(setData)
            .finally(() => setLoading(false));
        API<TrainingProfile>("/api/vh/backoffice/profile").then((p) => setLogo(p?.logo ?? undefined));
    }, []);

    // Saved on its own endpoint so it cannot blank the rest of the profile.
    const saveLogo = async (value: string | undefined) => {
        setLogo(value);
        const res = await APIWithError("/api/vh/backoffice/profile/logo", {
            method: "PUT",
            data: { logo: value ?? null },
        });
        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        message.success("Лого хадгалагдлаа");
    };

    return (
        <AppShell>
            <div className="page-header">
                <h1 className="page-title">Хяналтын самбар</h1>
            </div>

            <Card style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div>
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>Сургалтын төвийн лого</div>
                        <ImageUpload value={logo} onChange={saveLogo} height={96} />
                    </div>
                    <div style={{ color: "#79808A", maxWidth: 420, paddingTop: 26 }}>
                        <b style={{ color: "#1F2329" }}>{session?.selectedTenantName}</b> — энэ лого нь
                        сайтын нүүр болон Сургалтууд хуудасны төвүүдийн жагсаалтад харагдана. Дарахад
                        зөвхөн танай сургалтууд шүүгдэж харагдана.
                    </div>
                </div>
            </Card>

            {loading ? <Spin /> : (
                <>
                    <Row gutter={[12, 12]}>
                        <Col xs={12} md={6}><Card><Statistic title="Групп" value={data?.groups ?? 0} /></Card></Col>
                        <Col xs={12} md={6}><Card><Statistic title="Суралцагч" value={data?.students ?? 0} /></Card></Col>
                        <Col xs={12} md={6}>
                            <Card><Statistic title="Энэ 7 хоногийн хичээл" value={data?.sessions_this_week ?? 0} /></Card>
                        </Col>
                        <Col xs={12} md={6}>
                            <Card>
                                <Statistic
                                    title="Төлөгдөөгүй төлбөр"
                                    value={money(data?.unpaid_total ?? 0)}
                                    valueStyle={{ color: (data?.unpaid_total ?? 0) > 0 ? "#D93025" : undefined }}
                                />
                                <div style={{ color: "#79808A", fontSize: 12 }}>
                                    {data?.unpaid_students ?? 0} суралцагч
                                </div>
                            </Card>
                        </Col>
                    </Row>

                    {(data?.pending_members ?? 0) > 0 && (
                        <Tag color="orange" style={{ marginTop: 12 }}>
                            {data?.pending_members} гишүүнчлэлийн хүсэлт хүлээгдэж байна
                        </Tag>
                    )}

                    <Card title="Дараагийн хичээлүүд" style={{ marginTop: 16 }}>
                        <Table
                            size="small"
                            rowKey="sessionid"
                            pagination={false}
                            dataSource={data?.next_sessions ?? []}
                            columns={[
                                {
                                    title: "Огноо",
                                    width: 130,
                                    render: (_: unknown, s: Session) => dayjs(s.session_date).format("MM/DD (dd)"),
                                },
                                {
                                    title: "Цаг",
                                    width: 120,
                                    render: (_: unknown, s: Session) =>
                                        `${minuteToTime(s.start_minute)}-${minuteToTime(s.end_minute)}`,
                                },
                                { title: "Групп", dataIndex: "groupname" },
                                { title: "Заал", dataIndex: "venuename", width: 140 },
                                {
                                    title: "Ирц",
                                    width: 110,
                                    render: (_: unknown, s: Session) =>
                                        s.attendance_taken
                                            ? <Tag color="green">{s.present_count}/{s.student_count}</Tag>
                                            : <Tag>{SESSION_STATUS[s.status]}</Tag>,
                                },
                            ]}
                        />
                    </Card>
                </>
            )}
        </AppShell>
    );
}
