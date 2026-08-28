"use client";

import { Button, DatePicker, Form, Input, InputNumber, Modal, Select, Table, App, Popconfirm, Tag } from "antd";
import { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import { Plus, Search } from "lucide-react";
import AppShell from "@/app/components/AppShell";
import { API, APIWithError, errorText } from "@/app/utils/API";
import type { Player, Team } from "@/app/types/api";
import { GENDERS, PLAYER_STATUS, POSITIONS } from "@/app/types/api";

interface PlayerFormValues extends Omit<Player, "date_of_birth" | "playerid"> {
    date_of_birth?: dayjs.Dayjs | null;
}

export default function PlayersPage() {
    const { message } = App.useApp();
    const [rows, setRows] = useState<Player[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [teamFilter, setTeamFilter] = useState<number>();
    const [editing, setEditing] = useState<Player | null>(null);
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm<PlayerFormValues>();

    const load = useCallback(async () => {
        setLoading(true);
        const query = new URLSearchParams();
        if (search) query.set("search", search);
        if (teamFilter) query.set("teamid", String(teamFilter));
        const suffix = query.toString() ? `?${query}` : "";
        setRows(await API<Player[]>(`/api/vh/backoffice/players${suffix}`) ?? []);
        setLoading(false);
    }, [search, teamFilter]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { API<Team[]>("/api/vh/backoffice/teams").then((t) => setTeams(t ?? [])); }, []);

    const openForm = (player: Player | null) => {
        setEditing(player);
        form.setFieldsValue(
            player
                ? { ...player, date_of_birth: player.date_of_birth ? dayjs(player.date_of_birth) : null }
                : ({ status: 1, gender: 1 } as PlayerFormValues),
        );
        setOpen(true);
    };

    const save = async () => {
        const values = await form.validateFields();
        const res = await APIWithError("/api/vh/backoffice/players", {
            data: {
                ...values,
                playerid: editing?.playerid ?? 0,
                // The backend stores dates as UTC timestamps; send the date at midnight UTC so a
                // birthday never shifts a day across timezones.
                date_of_birth: values.date_of_birth ? values.date_of_birth.startOf("day").toISOString() : null,
            },
        });

        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        setOpen(false);
        message.success("Хадгаллаа");
        load();
    };

    const remove = async (playerid: number) => {
        const res = await APIWithError(`/api/vh/backoffice/players/${playerid}`, { method: "DELETE" });
        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        message.success("Устгалаа");
        load();
    };

    return (
        <AppShell>
            <div className="page-header">
                <h1 className="page-title">Тамирчид</h1>
                <div style={{ display: "flex", gap: 8 }}>
                    <Input
                        prefix={<Search size={14} />}
                        placeholder="Нэрээр хайх"
                        allowClear
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ width: 200 }}
                    />
                    <Select
                        allowClear
                        placeholder="Баг"
                        style={{ width: 180 }}
                        onChange={setTeamFilter}
                        options={teams.map((t) => ({ value: t.teamid, label: t.name }))}
                    />
                    <Button type="primary" icon={<Plus size={16} />} onClick={() => openForm(null)}>
                        Тамирчин нэмэх
                    </Button>
                </div>
            </div>

            <Table
                rowKey="playerid"
                loading={loading}
                dataSource={rows}
                columns={[
                    {
                        title: "Нэр",
                        render: (_: unknown, p: Player) => (
                            <>
                                {p.last_name} {p.first_name}
                                {p.is_captain && <Tag color="gold" style={{ marginLeft: 8 }}>Ахлагч</Tag>}
                            </>
                        ),
                    },
                    { title: "Баг", dataIndex: "teamname", render: (v?: string) => v ?? "-", width: 160 },
                    { title: "#", dataIndex: "jersey_no", width: 60 },
                    { title: "Байрлал", dataIndex: "position", render: (v: number) => POSITIONS[v] ?? "-", width: 170 },
                    { title: "Өндөр", dataIndex: "height_cm", render: (v?: number) => (v ? `${v} см` : "-"), width: 90 },
                    { title: "Утас", dataIndex: "phone", width: 120 },
                    { title: "Төлөв", dataIndex: "status", render: (v: number) => PLAYER_STATUS[v], width: 110 },
                    {
                        title: "",
                        width: 150,
                        render: (_: unknown, p: Player) => (
                            <div style={{ display: "flex", gap: 8 }}>
                                <Button size="small" onClick={() => openForm(p)}>Засах</Button>
                                <Popconfirm title="Устгах уу?" onConfirm={() => remove(p.playerid)}>
                                    <Button size="small" danger>Устгах</Button>
                                </Popconfirm>
                            </div>
                        ),
                    },
                ]}
            />

            <Modal
                open={open}
                title={editing ? "Тамирчин засах" : "Шинэ тамирчин"}
                onCancel={() => setOpen(false)}
                onOk={save}
                okText="Хадгалах"
                cancelText="Болих"
                destroyOnHidden
            >
                <Form form={form} layout="vertical" requiredMark={false}>
                    <Form.Item name="last_name" label="Овог">
                        <Input />
                    </Form.Item>
                    <Form.Item name="first_name" label="Нэр" rules={[{ required: true, message: "Нэр оруулна уу" }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="date_of_birth" label="Төрсөн огноо">
                        <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
                    </Form.Item>
                    <Form.Item name="gender" label="Хүйс">
                        <Select options={[{ value: 1, label: GENDERS[1] }, { value: 2, label: GENDERS[2] }]} />
                    </Form.Item>
                    <Form.Item name="position" label="Байрлал">
                        <Select
                            allowClear
                            options={Object.entries(POSITIONS).map(([v, l]) => ({ value: Number(v), label: l }))}
                        />
                    </Form.Item>
                    <Form.Item name="height_cm" label="Өндөр (см)">
                        <InputNumber min={100} max={250} style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item name="reach_cm" label="Үсрэлтийн өндөр (см)">
                        <InputNumber min={100} max={400} style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item name="phone" label="Утас">
                        <Input />
                    </Form.Item>
                    <Form.Item name="reg_no" label="Регистрийн дугаар">
                        <Input />
                    </Form.Item>
                    <Form.Item name="status" label="Төлөв">
                        <Select options={Object.entries(PLAYER_STATUS).map(([v, l]) => ({ value: Number(v), label: l }))} />
                    </Form.Item>
                    <Form.Item name="notes" label="Тэмдэглэл">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                </Form>
            </Modal>
        </AppShell>
    );
}
