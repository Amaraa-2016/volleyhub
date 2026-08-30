"use client";

import { App, Button, Card, Descriptions, Input, Radio, Table } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dayjs from "dayjs";
import { ArrowLeft } from "lucide-react";
import AppShell from "@/app/components/AppShell";
import { API, APIWithError, errorText } from "@/app/utils/API";
import {
    ATTENDANCE_STATUS, SESSION_STATUS, minuteToTime,
    type AttendanceRow, type Session,
} from "@/app/types/api";

// The register. Everyone starts marked present and the coach flips the exceptions, which is how a
// paper register is used - and the backend replaces the whole set on save, so a correction is just
// another save.
export default function AttendancePage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const { message } = App.useApp();
    const sessionId = Number(params.id);

    const [session, setSession] = useState<Session>();
    const [rows, setRows] = useState<AttendanceRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const [s, a] = await Promise.all([
            API<Session>(`/api/vh/backoffice/sessions/${sessionId}`),
            API<AttendanceRow[]>(`/api/vh/backoffice/sessions/${sessionId}/attendance`),
        ]);
        setSession(s);
        setRows(a ?? []);
        setLoading(false);
    }, [sessionId]);

    useEffect(() => { load(); }, [load]);

    const update = (studentid: number, patch: Partial<AttendanceRow>) => {
        setRows((prev) => prev.map((r) => (r.studentid === studentid ? { ...r, ...patch } : r)));
    };

    const save = async () => {
        setSaving(true);
        const res = await APIWithError(`/api/vh/backoffice/sessions/${sessionId}/attendance`, {
            data: { records: rows.map((r) => ({ studentid: r.studentid, status: r.status, note: r.note })) },
        });
        setSaving(false);

        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        message.success("Ирц хадгалагдлаа");
        router.push("/manage/sessions");
    };

    const present = rows.filter((r) => r.status === 1 || r.status === 4).length;

    return (
        <AppShell>
            <div className="page-header">
                <Button icon={<ArrowLeft size={16} />} onClick={() => router.push("/manage/sessions")}>Буцах</Button>
                <h1 className="page-title" style={{ flex: 1 }}>Ирц бүртгэл</h1>
                <Button type="primary" loading={saving} onClick={save} disabled={rows.length === 0}>
                    Хадгалах
                </Button>
            </div>

            <Card style={{ marginBottom: 16 }} loading={loading}>
                <Descriptions size="small" column={{ xs: 1, md: 4 }}>
                    <Descriptions.Item label="Групп">{session?.groupname}</Descriptions.Item>
                    <Descriptions.Item label="Огноо">
                        {session && dayjs(session.session_date).format("YYYY/MM/DD (dd)")}
                    </Descriptions.Item>
                    <Descriptions.Item label="Цаг">
                        {session && `${minuteToTime(session.start_minute)}-${minuteToTime(session.end_minute)}`}
                    </Descriptions.Item>
                    <Descriptions.Item label="Заал">{session?.venuename ?? "-"}</Descriptions.Item>
                    <Descriptions.Item label="Төлөв">{session && SESSION_STATUS[session.status]}</Descriptions.Item>
                    <Descriptions.Item label="Ирсэн">{present}/{rows.length}</Descriptions.Item>
                </Descriptions>
            </Card>

            <Table
                rowKey="studentid"
                loading={loading}
                dataSource={rows}
                pagination={false}
                scroll={{ x: 700 }}
                locale={{ emptyText: "Энэ группд бүртгэлтэй суралцагч алга" }}
                columns={[
                    {
                        title: "Суралцагч",
                        render: (_: unknown, r: AttendanceRow) => `${r.last_name} ${r.first_name}`.trim(),
                    },
                    {
                        title: "Ирц",
                        width: 400,
                        render: (_: unknown, r: AttendanceRow) => (
                            <Radio.Group
                                size="small"
                                optionType="button"
                                buttonStyle="solid"
                                value={r.status}
                                onChange={(e) => update(r.studentid, { status: e.target.value })}
                                options={Object.entries(ATTENDANCE_STATUS).map(([v, l]) => ({
                                    value: Number(v),
                                    label: l,
                                }))}
                            />
                        ),
                    },
                    {
                        title: "Тэмдэглэл",
                        width: 220,
                        render: (_: unknown, r: AttendanceRow) => (
                            <Input
                                size="small"
                                value={r.note ?? ""}
                                placeholder="Шалтгаан"
                                onChange={(e) => update(r.studentid, { note: e.target.value })}
                            />
                        ),
                    },
                ]}
            />
        </AppShell>
    );
}
