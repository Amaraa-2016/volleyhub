"use client";

import { Button, Card, Descriptions, Form, InputNumber, Input, Modal, Select, Table, Tabs, Tag, App, Popconfirm } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dayjs from "dayjs";
import { ArrowLeft, CalendarPlus, Plus } from "lucide-react";
import AppShell from "@/app/components/AppShell";
import ResultModal from "@/app/components/ResultModal";
import { API, APIWithError, errorText } from "@/app/utils/API";
import type { Match, Standing, Team, Tournament, TournamentTeam } from "@/app/types/api";
import { GENDERS, MATCH_STATUS, TOURNAMENT_FORMATS, TOURNAMENT_STATUS } from "@/app/types/api";

export default function TournamentDetailPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const { message } = App.useApp();
    const tournamentId = Number(params.id);

    const [tournament, setTournament] = useState<Tournament>();
    const [entrants, setEntrants] = useState<TournamentTeam[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [standings, setStandings] = useState<Standing[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [addOpen, setAddOpen] = useState(false);
    const [scoring, setScoring] = useState<Match>();
    const [form] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        const [t, e, m, s] = await Promise.all([
            API<Tournament>(`/api/vh/backoffice/tournaments/${tournamentId}`),
            API<TournamentTeam[]>(`/api/vh/backoffice/tournaments/${tournamentId}/teams`),
            API<Match[]>(`/api/vh/backoffice/matches?tournamentid=${tournamentId}`),
            API<Standing[]>(`/api/vh/backoffice/tournaments/${tournamentId}/standings`),
        ]);
        setTournament(t);
        setEntrants(e ?? []);
        setMatches(m ?? []);
        setStandings(s ?? []);
        setLoading(false);
    }, [tournamentId]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { API<Team[]>("/api/vh/backoffice/teams").then((t) => setTeams(t ?? [])); }, []);

    const addTeam = async () => {
        const values = await form.validateFields();
        const res = await APIWithError(`/api/vh/backoffice/tournaments/${tournamentId}/teams`, { data: values });
        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        setAddOpen(false);
        form.resetFields();
        load();
    };

    const removeTeam = async (teamid: number) => {
        const res = await APIWithError(`/api/vh/backoffice/tournaments/${tournamentId}/teams/${teamid}`, { method: "DELETE" });
        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        load();
    };

    // Single round robin, one round per day from the tournament start. Refuses to run once any
    // fixture exists, so a hand-built schedule cannot be wiped by a stray click.
    const generate = async () => {
        const res = await APIWithError<{ created: number }>(`/api/vh/backoffice/tournaments/${tournamentId}/fixtures`, {
            method: "POST",
        });
        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        message.success(`${res.data?.created ?? 0} тоглолт үүслээ`);
        load();
    };

    // The list endpoint omits per-set scores, so load the detail before opening the result form -
    // otherwise correcting a saved result would start from a blank sheet.
    const openResult = async (match: Match) => {
        setScoring(await API<Match>(`/api/vh/backoffice/matches/${match.matchid}`) ?? match);
    };

    const entrantIds = new Set(entrants.map((e) => e.teamid));

    return (
        <AppShell>
            <div className="page-header">
                <Button icon={<ArrowLeft size={16} />} onClick={() => router.push("/tournaments")}>Буцах</Button>
                <h1 className="page-title" style={{ flex: 1 }}>{tournament?.name ?? ""}</h1>
            </div>

            <Card style={{ marginBottom: 16 }} loading={loading}>
                <Descriptions size="small" column={{ xs: 1, md: 4 }}>
                    <Descriptions.Item label="Улирал">{tournament?.seasonname ?? "-"}</Descriptions.Item>
                    <Descriptions.Item label="Хэлбэр">{tournament ? TOURNAMENT_FORMATS[tournament.format] : ""}</Descriptions.Item>
                    <Descriptions.Item label="Хүйс">{tournament ? GENDERS[tournament.gender] : ""}</Descriptions.Item>
                    <Descriptions.Item label="Төлөв">{tournament ? TOURNAMENT_STATUS[tournament.status] : ""}</Descriptions.Item>
                    <Descriptions.Item label="Хугацаа">
                        {tournament && `${dayjs(tournament.startdate).format("YYYY/MM/DD")} - ${dayjs(tournament.enddate).format("YYYY/MM/DD")}`}
                    </Descriptions.Item>
                    <Descriptions.Item label="Заал">{tournament?.venuename ?? "-"}</Descriptions.Item>
                    <Descriptions.Item label="Формат">{tournament?.best_of} сет</Descriptions.Item>
                </Descriptions>
            </Card>

            <Tabs
                items={[
                    {
                        key: "teams",
                        label: `Багууд (${entrants.length})`,
                        children: (
                            <>
                                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                                    <Button type="primary" icon={<Plus size={16} />} onClick={() => setAddOpen(true)}>
                                        Баг бүртгэх
                                    </Button>
                                    <Button icon={<CalendarPlus size={16} />} onClick={generate}>
                                        Хуваарь үүсгэх
                                    </Button>
                                </div>
                                <Table
                                    rowKey="tournamentteamid"
                                    loading={loading}
                                    dataSource={entrants}
                                    pagination={false}
                                    columns={[
                                        { title: "Баг", dataIndex: "teamname" },
                                        { title: "Групп", dataIndex: "pool", width: 100 },
                                        { title: "Seed", dataIndex: "seed", width: 80 },
                                        {
                                            title: "",
                                            width: 110,
                                            render: (_: unknown, e: TournamentTeam) => (
                                                <Popconfirm title="Хасах уу?" onConfirm={() => removeTeam(e.teamid)}>
                                                    <Button size="small" danger>Хасах</Button>
                                                </Popconfirm>
                                            ),
                                        },
                                    ]}
                                />
                            </>
                        ),
                    },
                    {
                        key: "matches",
                        label: `Хуваарь (${matches.length})`,
                        children: (
                            <Table
                                rowKey="matchid"
                                loading={loading}
                                dataSource={matches}
                                pagination={false}
                                columns={[
                                    { title: "Тойрог", dataIndex: "round", width: 110 },
                                    {
                                        title: "Огноо",
                                        dataIndex: "scheduled_at",
                                        width: 140,
                                        render: (v: string) => dayjs(v).format("MM/DD HH:mm"),
                                    },
                                    {
                                        title: "Тоглолт",
                                        render: (_: unknown, m: Match) => `${m.hometeamname} - ${m.awayteamname}`,
                                    },
                                    {
                                        title: "Оноо",
                                        width: 90,
                                        render: (_: unknown, m: Match) =>
                                            m.status === 3 ? <b>{m.home_sets} : {m.away_sets}</b> : "-",
                                    },
                                    {
                                        title: "Төлөв",
                                        dataIndex: "status",
                                        width: 120,
                                        render: (s: number) => <Tag color={s === 3 ? "green" : "default"}>{MATCH_STATUS[s]}</Tag>,
                                    },
                                    {
                                        title: "",
                                        width: 120,
                                        render: (_: unknown, m: Match) => (
                                            <Button size="small" onClick={() => openResult(m)}>Үр дүн</Button>
                                        ),
                                    },
                                ]}
                            />
                        ),
                    },
                    {
                        key: "standings",
                        label: "Хүснэгт",
                        children: (
                            <Table
                                rowKey="teamid"
                                loading={loading}
                                dataSource={standings}
                                pagination={false}
                                columns={[
                                    { title: "#", dataIndex: "position", width: 50 },
                                    { title: "Баг", dataIndex: "teamname" },
                                    { title: "Групп", dataIndex: "pool", width: 80 },
                                    { title: "Тог", dataIndex: "played", width: 60 },
                                    { title: "Х", dataIndex: "won", width: 50 },
                                    { title: "Я", dataIndex: "lost", width: 50 },
                                    {
                                        title: "Сет",
                                        width: 90,
                                        render: (_: unknown, s: Standing) => `${s.sets_won}:${s.sets_lost}`,
                                    },
                                    { title: "Сет харьц.", dataIndex: "set_ratio", width: 100 },
                                    {
                                        title: "Оноо",
                                        width: 100,
                                        render: (_: unknown, s: Standing) => `${s.points_won}:${s.points_lost}`,
                                    },
                                    {
                                        title: "Очко",
                                        dataIndex: "points",
                                        width: 80,
                                        render: (v: number) => <b>{v}</b>,
                                    },
                                ]}
                            />
                        ),
                    },
                ]}
            />

            <Modal
                open={addOpen}
                title="Баг бүртгэх"
                onCancel={() => setAddOpen(false)}
                onOk={addTeam}
                okText="Бүртгэх"
                cancelText="Болих"
                destroyOnHidden
            >
                <Form form={form} layout="vertical" requiredMark={false}>
                    <Form.Item name="teamid" label="Баг" rules={[{ required: true, message: "Баг сонгоно уу" }]}>
                        <Select
                            showSearch
                            optionFilterProp="label"
                            options={teams
                                .filter((t) => !entrantIds.has(t.teamid))
                                .map((t) => ({ value: t.teamid, label: t.name }))}
                        />
                    </Form.Item>
                    <Form.Item name="pool" label="Групп">
                        <Input placeholder="A" />
                    </Form.Item>
                    <Form.Item name="seed" label="Seed">
                        <InputNumber min={1} style={{ width: "100%" }} />
                    </Form.Item>
                </Form>
            </Modal>

            <ResultModal
                match={scoring}
                bestOf={tournament?.best_of ?? 5}
                onClose={() => setScoring(undefined)}
                onSaved={load}
            />
        </AppShell>
    );
}
