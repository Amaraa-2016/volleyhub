"use client";

import { App, Button, Popconfirm, Select, Table, Tag } from "antd";
import { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import AppShell from "@/app/components/AppShell";
import { API, APIWithError, errorText } from "@/app/utils/API";
import { ROLES, type Member } from "@/app/types/api";

const ROLE_OPTIONS = Object.entries(ROLES)
    .filter(([value]) => value !== "owner")
    .map(([value, label]) => ({ value, label }));

// Membership lives in the shared schema (public.account_tenant), not in the centre's own schema -
// which is why approving someone here is what materialises their staff row on the next switch.
export default function MembersPage() {
    const { message } = App.useApp();
    const [rows, setRows] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        setRows(await API<Member[]>("/api/vh/backoffice/members") ?? []);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const act = async (path: string, data?: object, method?: string) => {
        const res = await APIWithError(path, { data, method });
        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        load();
    };

    return (
        <AppShell>
            <div className="page-header">
                <h1 className="page-title">Гишүүд</h1>
            </div>

            <Table
                rowKey="accounttenantid"
                loading={loading}
                dataSource={rows}
                scroll={{ x: 800 }}
                columns={[
                    {
                        title: "Нэр",
                        render: (_: unknown, m: Member) => `${m.lastname ?? ""} ${m.firstname ?? ""}`.trim() || "-",
                    },
                    { title: "Утас", dataIndex: "phone", width: 130 },
                    {
                        title: "Эрх",
                        width: 180,
                        render: (_: unknown, m: Member) =>
                            m.role === "owner" || m.status !== "active" ? (
                                <Tag>{ROLES[m.role] ?? m.role}</Tag>
                            ) : (
                                <Select
                                    size="small"
                                    style={{ width: 150 }}
                                    value={m.role}
                                    options={ROLE_OPTIONS}
                                    onChange={(role) =>
                                        act(`/api/vh/backoffice/members/${m.accounttenantid}/role`, { role })
                                    }
                                />
                            ),
                    },
                    {
                        title: "Төлөв",
                        dataIndex: "status",
                        width: 130,
                        render: (s: string) =>
                            s === "active" ? <Tag color="green">Идэвхтэй</Tag> : <Tag color="orange">Хүлээгдэж буй</Tag>,
                    },
                    {
                        title: "Нэгдсэн",
                        dataIndex: "joined",
                        width: 130,
                        render: (v: string) => dayjs(v).format("YYYY/MM/DD"),
                    },
                    {
                        title: "",
                        width: 200,
                        render: (_: unknown, m: Member) => (
                            <div style={{ display: "flex", gap: 8 }}>
                                {m.status !== "active" && (
                                    <Button
                                        size="small"
                                        type="primary"
                                        onClick={() => act(`/api/vh/backoffice/members/${m.accounttenantid}/approve`, {})}
                                    >
                                        Батлах
                                    </Button>
                                )}
                                {m.role !== "owner" && (
                                    <Popconfirm
                                        title="Гишүүнээс хасах уу?"
                                        onConfirm={() => act(`/api/vh/backoffice/members/${m.accounttenantid}`, undefined, "DELETE")}
                                    >
                                        <Button size="small" danger>Хасах</Button>
                                    </Popconfirm>
                                )}
                            </div>
                        ),
                    },
                ]}
            />
        </AppShell>
    );
}
