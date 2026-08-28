"use client";

import { Button, DatePicker, Form, Input, Modal, Select, Table, Tag, App, Popconfirm } from "antd";
import { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import { Plus } from "lucide-react";
import AppShell from "@/app/components/AppShell";
import ResultModal from "@/app/components/ResultModal";
import { API, APIWithError, errorText } from "@/app/utils/API";
import type { Match, Team, Tournament, Venue } from "@/app/types/api";
import { MATCH_STATUS } from "@/app/types/api";

export default function MatchesPage() {
    const { message } = App.useApp();
    const [rows, setRows] = useState<Match[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<number>();
    const [editing, setEditing] = useState<Match | null>(null);
    const [open, setOpen] = useState(false);
    const [scoring, setScoring] = useState<Match>();
    const [form] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        const suffix = filter ? `?tournamentid=${filter}` : "";
        setRows(await API<Match[]>(`/api/vh/backoffice/matches${suffix}`) ?? []);
        setLoading(false);
    }, [filter]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        API<Team[]>("/api/vh/backoffice/teams").then((t) => setTeams(t ?? []));
        API<Tournament[]>("/api/vh/backoffice/tournaments").then((t) => setTournaments(t ?? []));
        API<Venue[]>("/api/vh/backoffice/venues").then((v) => setVenues(v ?? []));
    }, []);

    const openForm = (match: Match | null) => {
        setEditing(match);
        form.setFieldsValue(
            match
                ? { ...match, scheduled_at: dayjs(match.scheduled_at) }
                : { status: 1, tournamentid: filter },
        );
        setOpen(true);
    };

    const save = async () => {
        const values = await form.validateFields();
        const res = await APIWithError("/api/vh/backoffice/matches", {
            data: {
                ...values,
                matchid: editing?.matchid ?? 0,
                scheduled_at: values.scheduled_at.toISOString(),
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

    const remove = async (matchid: number) => {
        const res = await APIWithError(`/api/vh/backoffice/matches/${matchid}`, { method: "DELETE" });
        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        message.success("Устгалаа");
        load();
    };

    // The list endpoint omits per-set scores, so load the detail before opening the result form -
    // otherwise correcting a saved result would start from a blank sheet.
    const openResult = async (match: Match) => {
        setScoring(await API<Match>(`/api/vh/backoffice/matches/${match.matchid}`) ?? match);
    };

    const bestOf = tournaments.find((t) => t.tournamentid === scoring?.tournamentid)?.best_of ?? 5;

    return (
        <AppShell>
            <div className="page-header">
                <h1 className="page-title">Тоглолт</h1>
                <div style={{ display: "flex", gap: 8 }}>
                    <Select
                        allowClear
                        placeholder="Тэмцээн"
                        style={{ width: 220 }}
                        onChange={setFilter}
                        options={tournaments.map((t) => ({ value: t.tournamentid, label: t.name }))}
                    />
                    <Button type="primary" icon={<Plus size={16} />} onClick={() => openForm(null)}>
                        Тоглолт нэмэх
                    </Button>
                </div>
            </div>

            <Table
                rowKey="matchid"
                loading={loading}
                dataSource={rows}
                columns={[
                    {
                        title: "Огноо",
                        dataIndex: "scheduled_at",
                        width: 150,
                        render: (v: string) => dayjs(v).format("YYYY/MM/DD HH:mm"),
                    },
                    { title: "Тэмцээн", dataIndex: "tournamentname", width: 180 },
                    { title: "Тойрог", dataIndex: "round", width: 110 },
                    {
                        title: "Тоглолт",
                        render: (_: unknown, m: Match) => `${m.hometeamname} - ${m.awayteamname}`,
                    },
                    { title: "Заал", dataIndex: "venuename", width: 140 },
                    {
                        title: "Оноо",
                        width: 90,
                        render: (_: unknown, m: Match) => (m.status === 3 ? <b>{m.home_sets} : {m.away_sets}</b> : "-"),
                    },
                    {
                        title: "Төлөв",
                        dataIndex: "status",
                        width: 120,
                        render: (s: number) => <Tag color={s === 3 ? "green" : s === 2 ? "red" : "default"}>{MATCH_STATUS[s]}</Tag>,
                    },
                    {
                        title: "",
                        width: 210,
                        render: (_: unknown, m: Match) => (
                            <div style={{ display: "flex", gap: 8 }}>
                                <Button size="small" onClick={() => openResult(m)}>Үр дүн</Button>
                                <Button size="small" onClick={() => openForm(m)}>Засах</Button>
                                <Popconfirm title="Устгах уу?" onConfirm={() => remove(m.matchid)}>
                                    <Button size="small" danger>Устгах</Button>
                                </Popconfirm>
                            </div>
                        ),
                    },
                ]}
            />

            <Modal
                open={open}
                title={editing ? "Тоглолт засах" : "Шинэ тоглолт"}
                onCancel={() => setOpen(false)}
                onOk={save}
                okText="Хадгалах"
                cancelText="Болих"
                destroyOnHidden
            >
                <Form form={form} layout="vertical" requiredMark={false}>
                    <Form.Item name="tournamentid" label="Тэмцээн" rules={[{ required: true, message: "Тэмцээн сонгоно уу" }]}>
                        <Select options={tournaments.map((t) => ({ value: t.tournamentid, label: t.name }))} />
                    </Form.Item>
                    <Form.Item name="hometeamid" label="Гэрийн баг" rules={[{ required: true, message: "Баг сонгоно уу" }]}>
                        <Select showSearch optionFilterProp="label" options={teams.map((t) => ({ value: t.teamid, label: t.name }))} />
                    </Form.Item>
                    <Form.Item name="awayteamid" label="Зочны баг" rules={[{ required: true, message: "Баг сонгоно уу" }]}>
                        <Select showSearch optionFilterProp="label" options={teams.map((t) => ({ value: t.teamid, label: t.name }))} />
                    </Form.Item>
                    <Form.Item name="scheduled_at" label="Огноо, цаг" rules={[{ required: true, message: "Огноо сонгоно уу" }]}>
                        <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item name="venueid" label="Заал">
                        <Select allowClear options={venues.map((v) => ({ value: v.venueid, label: v.name }))} />
                    </Form.Item>
                    <Form.Item name="round" label="Тойрог">
                        <Input placeholder="Round 1" />
                    </Form.Item>
                    <Form.Item name="status" label="Төлөв" tooltip="Дууссан төлөв нь үр дүн оруулсны дараа автоматаар тавигдана">
                        <Select
                            options={Object.entries(MATCH_STATUS)
                                .filter(([v]) => v !== "3")
                                .map(([v, l]) => ({ value: Number(v), label: l }))}
                        />
                    </Form.Item>
                    <Form.Item name="notes" label="Тэмдэглэл">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                </Form>
            </Modal>

            <ResultModal
                match={scoring}
                bestOf={bestOf}
                onClose={() => setScoring(undefined)}
                onSaved={load}
            />
        </AppShell>
    );
}
