"use client";

import { App, Button, Card, Col, Form, Input, Row, Statistic, Table, Tag, Spin } from "antd";
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
    const [profile, setProfile] = useState<TrainingProfile>();
    const [savingProfile, setSavingProfile] = useState(false);
    const [loading, setLoading] = useState(true);
    const [form] = Form.useForm();

    const role = session?.selectedRole ?? "";
    const canEdit = role === "owner" || role === "admin";

    useEffect(() => {
        API<Dashboard>("/api/vh/backoffice/dashboard")
            .then(setData)
            .finally(() => setLoading(false));
        API<TrainingProfile>("/api/vh/backoffice/profile").then((p) => {
            setProfile(p);
            if (p) form.setFieldsValue(p);
        });
    }, [form]);

    // Spread over the loaded profile rather than posting the form alone: the endpoint replaces the
    // whole profile, so anything this short form omits would otherwise be blanked.
    const saveProfile = async () => {
        const values = await form.validateFields();
        setSavingProfile(true);
        const res = await APIWithError("/api/vh/backoffice/profile", {
            method: "PUT",
            data: { ...profile, ...values },
        });
        setSavingProfile(false);

        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        setProfile((prev) => ({ ...(prev as TrainingProfile), ...values }));
        message.success("Хадгаллаа");
    };

    return (
        <AppShell>
            <div className="page-header">
                <h1 className="page-title">Хяналтын самбар</h1>
            </div>

            <Card
                title="Сургалтын төвийн мэдээлэл"
                style={{ marginBottom: 16 }}
                extra={canEdit && (
                    <Button type="primary" loading={savingProfile} onClick={saveProfile}>Хадгалах</Button>
                )}
            >
                <Form form={form} layout="vertical" requiredMark={false} disabled={!canEdit}>
                    <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
                        <div>
                            <Form.Item name="logo" label="Лого" style={{ marginBottom: 0 }}>
                                <ImageUpload height={110} />
                            </Form.Item>
                            <div style={{ color: "#79808A", fontSize: 12, maxWidth: 220, marginTop: 8 }}>
                                Сайтын нүүр болон Сургалтууд хуудасны төвүүдийн жагсаалтад харагдана.
                            </div>
                        </div>

                        <div style={{ flex: 1, minWidth: 280 }}>
                            <Form.Item label="Нэр">
                                <Input value={session?.selectedTenantName ?? ""} disabled />
                            </Form.Item>
                            <Form.Item name="tagline" label="Товч танилцуулга">
                                <Input placeholder="8-16 насны хүүхдийн волейболын сургалт" />
                            </Form.Item>
                            <Form.Item name="contactphone" label="Холбоо барих утас">
                                <Input />
                            </Form.Item>
                            <Form.Item name="address" label="Хаяг">
                                <Input />
                            </Form.Item>
                            <Form.Item name="description" label="Дэлгэрэнгүй" style={{ marginBottom: 0 }}>
                                <Input.TextArea rows={3} />
                            </Form.Item>
                        </div>
                    </div>
                </Form>
            </Card>

            {loading ? <Spin /> : (
                <>
                    <Row gutter={[12, 12]}>
                        <Col xs={12} md={6}><Card><Statistic title="Сургалт" value={data?.groups ?? 0} /></Card></Col>
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
