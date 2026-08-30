"use client";

import { App, Button, DatePicker, Select, Table, Tag } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import AppShell from "@/app/components/AppShell";
import { API } from "@/app/utils/API";
import { SESSION_STATUS, minuteToTime, type Group, type Session } from "@/app/types/api";

export default function SessionsPage() {
    const router = useRouter();
    const { message } = App.useApp();
    const [rows, setRows] = useState<Session[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [groupFilter, setGroupFilter] = useState<number>();
    const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
        dayjs().startOf("week"),
        dayjs().endOf("week").add(1, "week"),
    ]);

    const load = useCallback(async () => {
        setLoading(true);
        const query = new URLSearchParams({
            from: range[0].startOf("day").toISOString(),
            to: range[1].startOf("day").toISOString(),
        });
        if (groupFilter) query.set("groupid", String(groupFilter));
        setRows(await API<Session[]>(`/api/vh/backoffice/sessions?${query}`) ?? []);
        setLoading(false);
    }, [groupFilter, range]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { API<Group[]>("/api/vh/backoffice/groups").then((g) => setGroups(g ?? [])); }, []);

    return (
        <AppShell>
            <div className="page-header">
                <h1 className="page-title">Хичээл, ирц</h1>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Select
                        allowClear
                        placeholder="Групп"
                        style={{ width: 180 }}
                        onChange={setGroupFilter}
                        options={groups.map((g) => ({ value: g.groupid, label: g.name }))}
                    />
                    <DatePicker.RangePicker
                        value={range}
                        format="YYYY-MM-DD"
                        allowClear={false}
                        onChange={(v) => v && setRange(v as [dayjs.Dayjs, dayjs.Dayjs])}
                    />
                </div>
            </div>

            <Table
                rowKey="sessionid"
                loading={loading}
                dataSource={rows}
                scroll={{ x: 800 }}
                onRow={(session) => ({
                    onClick: () => {
                        if (session.status === 3) {
                            message.info("Цуцлагдсан хичээлд ирц бүртгэхгүй");
                            return;
                        }
                        router.push(`/manage/sessions/${session.sessionid}`);
                    },
                })}
                rowClassName={() => "clickable"}
                columns={[
                    {
                        title: "Огноо",
                        width: 140,
                        render: (_: unknown, s: Session) => dayjs(s.session_date).format("YYYY/MM/DD (dd)"),
                    },
                    {
                        title: "Цаг",
                        width: 120,
                        render: (_: unknown, s: Session) =>
                            `${minuteToTime(s.start_minute)}-${minuteToTime(s.end_minute)}`,
                    },
                    { title: "Групп", dataIndex: "groupname" },
                    { title: "Заал", dataIndex: "venuename", width: 140 },
                    { title: "Дасгалжуулагч", dataIndex: "coachname", width: 150 },
                    {
                        title: "Ирц",
                        width: 130,
                        render: (_: unknown, s: Session) =>
                            s.attendance_taken
                                ? <Tag color="green">{s.present_count}/{s.student_count}</Tag>
                                : <Tag color={s.status === 3 ? "red" : "default"}>{SESSION_STATUS[s.status]}</Tag>,
                    },
                    {
                        title: "",
                        width: 120,
                        render: (_: unknown, s: Session) => (
                            <Button
                                size="small"
                                disabled={s.status === 3}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/manage/sessions/${s.sessionid}`);
                                }}
                            >
                                {s.attendance_taken ? "Ирц засах" : "Ирц авах"}
                            </Button>
                        ),
                    },
                ]}
            />
        </AppShell>
    );
}
