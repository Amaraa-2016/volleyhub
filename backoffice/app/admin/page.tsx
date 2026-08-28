"use client";

import { Button, Input, Layout, Modal, Table, Tabs, Tag, App } from "antd";
import { useCallback, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { LogOut, Volleyball } from "lucide-react";
import { AccountAPI, AccountAPIWithError, errorText } from "@/app/utils/API";
import type { ClubSearchResult, TenantRequest } from "@/app/types/api";

const { Header, Content } = Layout;

// Platform console. Cross-club, so it renders outside AppShell (which assumes a selected club) and
// talks to /api/vh/platform/* through the account proxy.
export default function AdminPage() {
    const router = useRouter();
    const { message } = App.useApp();
    const [requests, setRequests] = useState<TenantRequest[]>([]);
    const [clubs, setClubs] = useState<ClubSearchResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [reviewing, setReviewing] = useState<{ request: TenantRequest; approve: boolean } | null>(null);
    const [note, setNote] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        const [r, c] = await Promise.all([
            AccountAPI<TenantRequest[]>("/api/vh/platform/requests"),
            AccountAPI<ClubSearchResult[]>("/api/vh/platform/tenants"),
        ]);
        setRequests(r ?? []);
        setClubs(c ?? []);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const review = async () => {
        if (!reviewing) return;
        const action = reviewing.approve ? "approve" : "reject";
        const res = await AccountAPIWithError(
            `/api/vh/platform/requests/${reviewing.request.tenantrequestid}/${action}`,
            { data: { note } },
        );

        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        message.success(reviewing.approve ? "Клуб үүслээ" : "Татгалзлаа");
        setReviewing(null);
        setNote("");
        load();
    };

    return (
        <Layout style={{ minHeight: "100vh" }}>
            <Header
                style={{
                    background: "#141922", display: "flex", alignItems: "center",
                    justifyContent: "space-between", padding: "0 20px",
                }}
            >
                <div style={{ color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                    <Volleyball size={20} color="#F26522" />
                    Volleyhub — Платформ
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <Button type="text" style={{ color: "#fff" }} onClick={() => router.push("/club")}>
                        Клуб
                    </Button>
                    <Button
                        type="text"
                        style={{ color: "#fff" }}
                        icon={<LogOut size={14} />}
                        onClick={() => signOut({ callbackUrl: "/login" })}
                    >
                        Гарах
                    </Button>
                </div>
            </Header>
            <Content style={{ padding: 20 }}>
                <Tabs
                    items={[
                        {
                            key: "requests",
                            label: "Бүртгүүлэх хүсэлт",
                            children: (
                                <Table
                                    rowKey="tenantrequestid"
                                    loading={loading}
                                    dataSource={requests}
                                    columns={[
                                        { title: "Клуб", dataIndex: "tenantname" },
                                        { title: "Хүсэлт гаргагч", dataIndex: "applicantname" },
                                        { title: "Утас", dataIndex: "applicantphone", width: 130 },
                                        { title: "Хаяг", dataIndex: "address" },
                                        {
                                            title: "Огноо",
                                            dataIndex: "created",
                                            width: 130,
                                            render: (v: string) => dayjs(v).format("YYYY/MM/DD"),
                                        },
                                        {
                                            title: "Төлөв",
                                            dataIndex: "status",
                                            width: 140,
                                            render: (s: string) => (
                                                <Tag color={s === "approved" ? "green" : s === "rejected" ? "red" : "orange"}>
                                                    {s === "approved" ? "Батлагдсан" : s === "rejected" ? "Татгалзсан" : "Хүлээгдэж буй"}
                                                </Tag>
                                            ),
                                        },
                                        {
                                            title: "",
                                            width: 190,
                                            render: (_: unknown, r: TenantRequest) =>
                                                r.status === "pending" && (
                                                    <div style={{ display: "flex", gap: 8 }}>
                                                        <Button
                                                            size="small"
                                                            type="primary"
                                                            onClick={() => setReviewing({ request: r, approve: true })}
                                                        >
                                                            Батлах
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            danger
                                                            onClick={() => setReviewing({ request: r, approve: false })}
                                                        >
                                                            Татгалзах
                                                        </Button>
                                                    </div>
                                                ),
                                        },
                                    ]}
                                />
                            ),
                        },
                        {
                            key: "clubs",
                            label: "Клубууд",
                            children: (
                                <Table
                                    rowKey="tenantid"
                                    loading={loading}
                                    dataSource={clubs}
                                    columns={[
                                        { title: "ID", dataIndex: "tenantid", width: 80 },
                                        { title: "Нэр", dataIndex: "tenantname" },
                                        { title: "Хаяг", dataIndex: "address" },
                                    ]}
                                />
                            ),
                        },
                    ]}
                />
            </Content>

            <Modal
                open={!!reviewing}
                title={reviewing?.approve ? "Клуб батлах" : "Хүсэлт татгалзах"}
                onCancel={() => setReviewing(null)}
                onOk={review}
                okText={reviewing?.approve ? "Батлах" : "Татгалзах"}
                cancelText="Болих"
            >
                <p>
                    <b>{reviewing?.request.tenantname}</b> — {reviewing?.request.applicantname}
                </p>
                {reviewing?.approve && (
                    <p style={{ color: "#79808a" }}>
                        Батласнаар клубын schema үүсч, хүсэлт гаргагч эзэмшигч эрхтэй болно.
                    </p>
                )}
                <Input.TextArea
                    rows={3}
                    placeholder="Тайлбар (заавал биш)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />
            </Modal>
        </Layout>
    );
}
