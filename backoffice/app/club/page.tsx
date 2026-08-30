"use client";

import { App, Button, Empty, Form, Input, List, Select, Spin, Tabs, Tag, Typography } from "antd";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Volleyball } from "lucide-react";
import { AccountAPI, AccountAPIWithError, errorText } from "@/app/utils/API";
import { ROLES, type ClubSearchResult, type TenantRequest } from "@/app/types/api";

interface SwitchResult {
    tenantid: number;
    tenantname: string;
    role: string;
    token: string;
}

// Where a user lands with no training centre selected: pick one they already belong to, apply to
// register a new one, or ask to join an existing one. Also reachable later via "Сургалт солих".
export default function ClubPage() {
    const router = useRouter();
    const { data: session, update } = useSession();
    const { message } = App.useApp();
    const [busy, setBusy] = useState(false);
    const [clubs, setClubs] = useState<ClubSearchResult[]>([]);
    const [requests, setRequests] = useState<TenantRequest[]>([]);
    const [loadingRequests, setLoadingRequests] = useState(true);

    const memberships = session?.tenants ?? [];
    const active = memberships.filter((m) => m.status === "active");
    const pending = memberships.filter((m) => m.status !== "active");

    const loadRequests = useCallback(async () => {
        setRequests(await AccountAPI<TenantRequest[]>("/api/vh/account/tenant/request") ?? []);
    }, []);

    useEffect(() => {
        loadRequests().finally(() => setLoadingRequests(false));
    }, [loadRequests]);

    const select = async (tenantid: number) => {
        setBusy(true);
        const res = await AccountAPIWithError<SwitchResult>("/api/vh/account/switch", { data: { tenantid } });
        setBusy(false);

        if (res.error || !res.data) {
            message.error(errorText(res.error));
            return;
        }
        // The per-centre token lives in the session, so the proxy can pair it with the tenantid.
        await update({
            selectedTenantId: String(res.data.tenantid),
            selectedTenantName: res.data.tenantname,
            selectedRole: res.data.role,
            accessToken: res.data.token,
        });
        router.push("/manage/dashboard");
        router.refresh();
    };

    const searchClubs = async (q: string) => {
        setClubs(await AccountAPI<ClubSearchResult[]>(`/api/vh/account/clubs?q=${encodeURIComponent(q)}`) ?? []);
    };

    const applyForClub = async (values: {
        tenantname: string; registernumber?: string; address?: string; contactphone?: string;
    }) => {
        setBusy(true);
        const res = await AccountAPIWithError("/api/vh/account/tenant/request", { data: values });
        setBusy(false);

        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        message.success("Хүсэлт илгээгдлээ. Платформын админ шалгах болно");
        loadRequests();
    };

    const join = async (values: { tenantid: number; role: string }) => {
        setBusy(true);
        const res = await AccountAPIWithError("/api/vh/account/join", { data: values });
        setBusy(false);

        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        message.success("Хүсэлт илгээгдлээ. Сургалтын админ баталгаажуулна");
    };

    return (
        <div className="auth-page">
            <div className="auth-card auth-card--wide">
                <div className="auth-brand">
                    <Volleyball size={24} color="#F26522" />
                    Volleyhub
                </div>

                {active.length > 0 && (
                    <>
                        <Typography.Title level={5} style={{ marginTop: 0 }}>Сургалт сонгох</Typography.Title>
                        <List
                            bordered
                            dataSource={active}
                            style={{ marginBottom: 24 }}
                            renderItem={(m) => (
                                <List.Item
                                    actions={[
                                        <Button key="go" type="primary" loading={busy} onClick={() => select(m.tenantid)}>
                                            Сонгох
                                        </Button>,
                                    ]}
                                >
                                    <List.Item.Meta title={m.tenantname} description={ROLES[m.role] ?? m.role} />
                                </List.Item>
                            )}
                        />
                    </>
                )}

                {pending.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                        {pending.map((m) => (
                            <Tag key={m.tenantid} color="orange" style={{ marginBottom: 6 }}>
                                {m.tenantname}: баталгаажуулалт хүлээж байна
                            </Tag>
                        ))}
                    </div>
                )}

                <Tabs
                    items={[
                        {
                            key: "join",
                            label: "Сургалтад нэгдэх",
                            children: (
                                <Form layout="vertical" onFinish={join} requiredMark={false}>
                                    <Form.Item
                                        name="tenantid"
                                        label="Сургалт"
                                        rules={[{ required: true, message: "Сургалт сонгоно уу" }]}
                                    >
                                        <Select
                                            showSearch
                                            placeholder="Сургалтын нэрээр хайх"
                                            filterOption={false}
                                            onSearch={searchClubs}
                                            onFocus={() => searchClubs("")}
                                            notFoundContent={<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                                            options={clubs.map((c) => ({ value: c.tenantid, label: c.tenantname }))}
                                        />
                                    </Form.Item>
                                    <Form.Item name="role" label="Хэн болж нэгдэх" initialValue="player">
                                        <Select
                                            options={[
                                                { value: "player", label: "Суралцагч" },
                                                { value: "coach", label: "Дасгалжуулагч" },
                                                { value: "fan", label: "Эцэг эх / дэмжигч" },
                                            ]}
                                        />
                                    </Form.Item>
                                    <Button type="primary" htmlType="submit" loading={busy}>Хүсэлт илгээх</Button>
                                </Form>
                            ),
                        },
                        {
                            key: "new",
                            label: "Сургалтаа бүртгүүлэх",
                            children: (
                                <>
                                    <Typography.Paragraph type="secondary">
                                        Волейболын сургалт эрхэлдэг бол хүсэлтээ илгээнэ үү. Платформын админ
                                        баталгаажуулсны дараа та системд нэвтэрч, группээ үүсгэн, суралцагчдаа
                                        бүртгэж эхэлнэ.
                                    </Typography.Paragraph>
                                    <Form layout="vertical" onFinish={applyForClub} requiredMark={false}>
                                        <Form.Item
                                            name="tenantname"
                                            label="Сургалтын нэр"
                                            rules={[{ required: true, message: "Нэр оруулна уу" }]}
                                        >
                                            <Input />
                                        </Form.Item>
                                        <Form.Item name="registernumber" label="Регистрийн дугаар">
                                            <Input />
                                        </Form.Item>
                                        <Form.Item name="address" label="Хаяг">
                                            <Input />
                                        </Form.Item>
                                        <Form.Item name="contactphone" label="Холбоо барих утас">
                                            <Input />
                                        </Form.Item>
                                        <Button type="primary" htmlType="submit" loading={busy}>Хүсэлт илгээх</Button>
                                    </Form>

                                    {loadingRequests ? (
                                        <Spin style={{ marginTop: 16 }} />
                                    ) : requests.length > 0 && (
                                        <List
                                            style={{ marginTop: 20 }}
                                            size="small"
                                            header="Миний хүсэлтүүд"
                                            dataSource={requests}
                                            renderItem={(r) => (
                                                <List.Item>
                                                    <span>{r.tenantname}</span>
                                                    <Tag color={r.status === "approved" ? "green" : r.status === "rejected" ? "red" : "orange"}>
                                                        {r.status === "approved" ? "Батлагдсан" : r.status === "rejected" ? "Татгалзсан" : "Хүлээгдэж буй"}
                                                    </Tag>
                                                </List.Item>
                                            )}
                                        />
                                    )}
                                </>
                            ),
                        },
                    ]}
                />

                <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between" }}>
                    <Button type="link" onClick={() => router.push("/")}>Нүүр хуудас</Button>
                    <Button type="link" onClick={() => signOut({ callbackUrl: "/login" })}>Гарах</Button>
                </div>
            </div>
        </div>
    );
}
