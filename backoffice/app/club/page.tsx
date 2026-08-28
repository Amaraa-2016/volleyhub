"use client";

import { Button, Form, Input, Typography, App, List, Tag, Tabs, Empty, Select, Spin } from "antd";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Volleyball } from "lucide-react";
import { AccountAPI, AccountAPIWithError, errorText } from "@/app/utils/API";
import type { ClubSearchResult, TenantRequest } from "@/app/types/api";

interface SwitchResult {
    tenantid: number;
    tenantname: string;
    role: string;
    token: string;
}

// Where a user lands with no club selected: pick one they already belong to, apply to register a
// new club, or ask to join an existing one. Also reachable later via "Клуб солих".
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

    useEffect(() => {
        AccountAPI<TenantRequest[]>("/api/vh/account/tenant/request")
            .then((rows) => setRequests(rows ?? []))
            .finally(() => setLoadingRequests(false));
    }, []);

    const select = async (tenantid: number) => {
        setBusy(true);
        const res = await AccountAPIWithError<SwitchResult>("/api/vh/account/switch", { data: { tenantid } });
        setBusy(false);

        if (res.error || !res.data) {
            message.error(errorText(res.error));
            return;
        }
        // The per-club token lives in the session, so the proxy can pair it with the tenantid.
        await update({
            selectedTenantId: String(res.data.tenantid),
            selectedTenantName: res.data.tenantname,
            selectedRole: res.data.role,
            accessToken: res.data.token,
        });
        router.push("/dashboard");
        router.refresh();
    };

    const searchClubs = async (q: string) => {
        const rows = await AccountAPI<ClubSearchResult[]>(`/api/vh/account/clubs?q=${encodeURIComponent(q)}`);
        setClubs(rows ?? []);
    };

    const applyForClub = async (values: { tenantname: string; registernumber?: string; address?: string; contactphone?: string }) => {
        setBusy(true);
        const res = await AccountAPIWithError("/api/vh/account/tenant/request", { data: values });
        setBusy(false);

        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        message.success("Хүсэлт илгээгдлээ. Платформын админ шалгах болно");
        setRequests(await AccountAPI<TenantRequest[]>("/api/vh/account/tenant/request") ?? []);
    };

    const join = async (values: { tenantid: number; role: string }) => {
        setBusy(true);
        const res = await AccountAPIWithError("/api/vh/account/join", { data: values });
        setBusy(false);

        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        message.success("Хүсэлт илгээгдлээ. Клубын админ баталгаажуулна");
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
                        <Typography.Title level={5} style={{ marginTop: 0 }}>Клуб сонгох</Typography.Title>
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
                                    <List.Item.Meta title={m.tenantname} description={m.role} />
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
                            label: "Клубд нэгдэх",
                            children: (
                                <Form layout="vertical" onFinish={join} requiredMark={false}>
                                    <Form.Item name="tenantid" label="Клуб" rules={[{ required: true, message: "Клуб сонгоно уу" }]}>
                                        <Select
                                            showSearch
                                            placeholder="Клубын нэрээр хайх"
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
                                                { value: "player", label: "Тамирчин" },
                                                { value: "coach", label: "Дасгалжуулагч" },
                                                { value: "fan", label: "Дэмжигч" },
                                            ]}
                                        />
                                    </Form.Item>
                                    <Button type="primary" htmlType="submit" loading={busy}>Хүсэлт илгээх</Button>
                                </Form>
                            ),
                        },
                        {
                            key: "new",
                            label: "Шинэ клуб бүртгүүлэх",
                            children: (
                                <>
                                    <Form layout="vertical" onFinish={applyForClub} requiredMark={false}>
                                        <Form.Item name="tenantname" label="Клубын нэр" rules={[{ required: true, message: "Нэр оруулна уу" }]}>
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

                <div style={{ marginTop: 24, textAlign: "center" }}>
                    <Button type="link" onClick={() => signOut({ callbackUrl: "/login" })}>Гарах</Button>
                </div>
            </div>
        </div>
    );
}
