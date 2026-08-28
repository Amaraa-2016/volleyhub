"use client";

import { Button, Card, Descriptions, Form, InputNumber, Modal, Select, Switch, Table, Tag, App, Popconfirm } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import AppShell from "@/app/components/AppShell";
import { API, APIWithError, errorText } from "@/app/utils/API";
import type { Player, RosterEntry, Team } from "@/app/types/api";
import { GENDERS, PLAYER_STATUS, POSITIONS } from "@/app/types/api";

export default function TeamDetailPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const { message } = App.useApp();
    const teamId = Number(params.id);

    const [team, setTeam] = useState<Team>();
    const [roster, setRoster] = useState<RosterEntry[]>([]);
    const [free, setFree] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        const [t, r] = await Promise.all([
            API<Team>(`/api/vh/backoffice/teams/${teamId}`),
            API<RosterEntry[]>(`/api/vh/backoffice/teams/${teamId}/roster`),
        ]);
        setTeam(t);
        setRoster(r ?? []);
        setLoading(false);
    }, [teamId]);

    useEffect(() => { load(); }, [load]);

    // Only players who are not on a squad yet can be added, so nobody ends up on two rosters.
    const openAdd = async () => {
        setFree(await API<Player[]>("/api/vh/backoffice/players?unassigned=true") ?? []);
        form.resetFields();
        setOpen(true);
    };

    const add = async () => {
        const values = await form.validateFields();
        const res = await APIWithError(`/api/vh/backoffice/teams/${teamId}/roster`, { data: values });
        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        setOpen(false);
        load();
    };

    const removeFromRoster = async (playerid: number) => {
        const res = await APIWithError(`/api/vh/backoffice/teams/${teamId}/roster/${playerid}`, { method: "DELETE" });
        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        load();
    };

    return (
        <AppShell>
            <div className="page-header">
                <Button icon={<ArrowLeft size={16} />} onClick={() => router.push("/teams")}>Буцах</Button>
                <h1 className="page-title" style={{ flex: 1 }}>{team?.name ?? ""}</h1>
                <Button type="primary" icon={<Plus size={16} />} onClick={openAdd}>Тамирчин нэмэх</Button>
            </div>

            <Card style={{ marginBottom: 16 }} loading={loading}>
                <Descriptions size="small" column={{ xs: 1, md: 3 }}>
                    <Descriptions.Item label="Хүйс">{team ? GENDERS[team.gender] : ""}</Descriptions.Item>
                    <Descriptions.Item label="Насны ангилал">{team?.agegroup ?? "-"}</Descriptions.Item>
                    <Descriptions.Item label="Дивиз">{team?.division ?? "-"}</Descriptions.Item>
                    <Descriptions.Item label="Дасгалжуулагч">{team?.coachname ?? "-"}</Descriptions.Item>
                    <Descriptions.Item label="Тамирчид">{roster.length}</Descriptions.Item>
                </Descriptions>
            </Card>

            <Table
                rowKey="teamplayerid"
                loading={loading}
                dataSource={roster}
                pagination={false}
                columns={[
                    { title: "#", dataIndex: "jersey_no", width: 60 },
                    {
                        title: "Тамирчин",
                        render: (_: unknown, p: RosterEntry) => (
                            <>
                                {p.last_name} {p.first_name}
                                {p.is_captain && <Tag color="gold" style={{ marginLeft: 8 }}>Ахлагч</Tag>}
                            </>
                        ),
                    },
                    { title: "Байрлал", dataIndex: "position", render: (v: number) => POSITIONS[v] ?? "-", width: 180 },
                    { title: "Өндөр", dataIndex: "height_cm", render: (v?: number) => (v ? `${v} см` : "-"), width: 100 },
                    { title: "Төлөв", dataIndex: "status", render: (v: number) => PLAYER_STATUS[v], width: 110 },
                    {
                        title: "",
                        width: 110,
                        render: (_: unknown, p: RosterEntry) => (
                            <Popconfirm title="Багаас хасах уу?" onConfirm={() => removeFromRoster(p.playerid)}>
                                <Button size="small" danger>Хасах</Button>
                            </Popconfirm>
                        ),
                    },
                ]}
            />

            <Modal
                open={open}
                title="Тамирчин нэмэх"
                onCancel={() => setOpen(false)}
                onOk={add}
                okText="Нэмэх"
                cancelText="Болих"
                destroyOnHidden
            >
                <Form form={form} layout="vertical" requiredMark={false}>
                    <Form.Item name="playerid" label="Тамирчин" rules={[{ required: true, message: "Тамирчин сонгоно уу" }]}>
                        <Select
                            showSearch
                            optionFilterProp="label"
                            options={free.map((p) => ({
                                value: p.playerid,
                                label: `${p.last_name} ${p.first_name}`,
                            }))}
                        />
                    </Form.Item>
                    <Form.Item name="jersey_no" label="Хувцасны дугаар">
                        <InputNumber min={1} max={99} style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item name="is_captain" label="Ахлагч" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </AppShell>
    );
}
