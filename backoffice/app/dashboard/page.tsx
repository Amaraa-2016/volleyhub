"use client";

import { Card, Col, Row, Statistic, Table, Tag, Spin } from "antd";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import AppShell from "@/app/components/AppShell";
import { API } from "@/app/utils/API";
import type { Dashboard, Match } from "@/app/types/api";
import { MATCH_STATUS } from "@/app/types/api";

const matchColumns = [
    {
        title: "Огноо",
        dataIndex: "scheduled_at",
        render: (v: string) => dayjs(v).format("MM/DD HH:mm"),
        width: 120,
    },
    {
        title: "Тоглолт",
        render: (_: unknown, m: Match) => `${m.hometeamname} - ${m.awayteamname}`,
    },
    { title: "Тэмцээн", dataIndex: "tournamentname" },
];

const resultColumns = [
    ...matchColumns,
    {
        title: "Оноо",
        width: 90,
        render: (_: unknown, m: Match) => <b>{m.home_sets} : {m.away_sets}</b>,
    },
];

export default function DashboardPage() {
    const [data, setData] = useState<Dashboard>();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        API<Dashboard>("/api/vh/backoffice/dashboard")
            .then(setData)
            .finally(() => setLoading(false));
    }, []);

    return (
        <AppShell>
            <div className="page-header">
                <h1 className="page-title">Хяналтын самбар</h1>
            </div>

            {loading ? <Spin /> : (
                <>
                    <Row gutter={[12, 12]}>
                        <Col xs={12} md={6}><Card><Statistic title="Багууд" value={data?.teams ?? 0} /></Card></Col>
                        <Col xs={12} md={6}><Card><Statistic title="Тамирчид" value={data?.players ?? 0} /></Card></Col>
                        <Col xs={12} md={6}><Card><Statistic title="Тэмцээн" value={data?.tournaments ?? 0} /></Card></Col>
                        <Col xs={12} md={6}>
                            <Card>
                                <Statistic title="Ирэх тоглолт" value={data?.upcoming_matches ?? 0} />
                            </Card>
                        </Col>
                    </Row>

                    {(data?.pending_members ?? 0) > 0 && (
                        <Tag color="orange" style={{ marginTop: 12 }}>
                            {data?.pending_members} гишүүнчлэлийн хүсэлт хүлээгдэж байна
                        </Tag>
                    )}

                    <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
                        <Col xs={24} lg={12}>
                            <Card title="Дараагийн тоглолтууд">
                                <Table
                                    size="small"
                                    rowKey="matchid"
                                    pagination={false}
                                    dataSource={data?.next_matches ?? []}
                                    columns={[
                                        ...matchColumns,
                                        {
                                            title: "Төлөв",
                                            dataIndex: "status",
                                            width: 110,
                                            render: (s: number) => MATCH_STATUS[s],
                                        },
                                    ]}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} lg={12}>
                            <Card title="Сүүлийн үр дүн">
                                <Table
                                    size="small"
                                    rowKey="matchid"
                                    pagination={false}
                                    dataSource={data?.latest_results ?? []}
                                    columns={resultColumns}
                                />
                            </Card>
                        </Col>
                    </Row>
                </>
            )}
        </AppShell>
    );
}
