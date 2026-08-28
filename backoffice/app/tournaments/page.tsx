"use client";

import { Button, DatePicker, Form, Input, Modal, Select, Table, App, Popconfirm, Tag } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { Plus } from "lucide-react";
import AppShell from "@/app/components/AppShell";
import { API, APIWithError, errorText } from "@/app/utils/API";
import type { Season, Tournament, Venue } from "@/app/types/api";
import { GENDERS, TOURNAMENT_FORMATS, TOURNAMENT_STATUS } from "@/app/types/api";

const STATUS_COLOR: Record<number, string> = { 1: "default", 2: "blue", 3: "green", 4: "purple", 5: "red" };

export default function TournamentsPage() {
    const router = useRouter();
    const { message } = App.useApp();
    const [rows, setRows] = useState<Tournament[]>([]);
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Tournament | null>(null);
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        setRows(await API<Tournament[]>("/api/vh/backoffice/tournaments") ?? []);
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
        API<Season[]>("/api/vh/backoffice/seasons").then((s) => setSeasons(s ?? []));
        API<Venue[]>("/api/vh/backoffice/venues").then((v) => setVenues(v ?? []));
    }, [load]);

    const openForm = (tournament: Tournament | null) => {
        setEditing(tournament);
        form.setFieldsValue(
            tournament
                ? { ...tournament, dates: [dayjs(tournament.startdate), dayjs(tournament.enddate)] }
                : { format: 1, gender: 1, status: 1, best_of: 5, seasonid: seasons.find((s) => s.isactive)?.seasonid },
        );
        setOpen(true);
    };

    const save = async () => {
        const { dates, ...values } = await form.validateFields();
        const res = await APIWithError("/api/vh/backoffice/tournaments", {
            data: {
                ...values,
                tournamentid: editing?.tournamentid ?? 0,
                startdate: dates[0].startOf("day").toISOString(),
                enddate: dates[1].endOf("day").toISOString(),
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

    const remove = async (id: number) => {
        const res = await APIWithError(`/api/vh/backoffice/tournaments/${id}`, { method: "DELETE" });
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
                <h1 className="page-title">Тэмцээн</h1>
                <Button type="primary" icon={<Plus size={16} />} onClick={() => openForm(null)}>
                    Тэмцээн нэмэх
                </Button>
            </div>

            <Table
                rowKey="tournamentid"
                loading={loading}
                dataSource={rows}
                onRow={(t) => ({ onClick: () => router.push(`/tournaments/${t.tournamentid}`) })}
                rowClassName={() => "clickable"}
                columns={[
                    { title: "Нэр", dataIndex: "name" },
                    { title: "Улирал", dataIndex: "seasonname", width: 140 },
                    { title: "Хэлбэр", dataIndex: "format", render: (f: number) => TOURNAMENT_FORMATS[f], width: 110 },
                    { title: "Хүйс", dataIndex: "gender", render: (g: number) => GENDERS[g], width: 100 },
                    {
                        title: "Хугацаа",
                        width: 200,
                        render: (_: unknown, t: Tournament) =>
                            `${dayjs(t.startdate).format("YYYY/MM/DD")} - ${dayjs(t.enddate).format("MM/DD")}`,
                    },
                    { title: "Баг", dataIndex: "teamcount", width: 70 },
                    { title: "Тоглолт", dataIndex: "matchcount", width: 90 },
                    {
                        title: "Төлөв",
                        dataIndex: "status",
                        width: 130,
                        render: (s: number) => <Tag color={STATUS_COLOR[s]}>{TOURNAMENT_STATUS[s]}</Tag>,
                    },
                    {
                        title: "",
                        width: 150,
                        render: (_: unknown, t: Tournament) => (
                            <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 8 }}>
                                <Button size="small" onClick={() => openForm(t)}>Засах</Button>
                                <Popconfirm title="Устгах уу?" onConfirm={() => remove(t.tournamentid)}>
                                    <Button size="small" danger>Устгах</Button>
                                </Popconfirm>
                            </div>
                        ),
                    },
                ]}
            />

            <Modal
                open={open}
                title={editing ? "Тэмцээн засах" : "Шинэ тэмцээн"}
                onCancel={() => setOpen(false)}
                onOk={save}
                okText="Хадгалах"
                cancelText="Болих"
                destroyOnHidden
            >
                <Form form={form} layout="vertical" requiredMark={false}>
                    <Form.Item name="name" label="Нэр" rules={[{ required: true, message: "Нэр оруулна уу" }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="seasonid" label="Улирал">
                        <Select
                            allowClear
                            options={seasons.map((s) => ({ value: s.seasonid, label: s.name }))}
                        />
                    </Form.Item>
                    <Form.Item name="dates" label="Хугацаа" rules={[{ required: true, message: "Хугацаа сонгоно уу" }]}>
                        <DatePicker.RangePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
                    </Form.Item>
                    <Form.Item name="format" label="Хэлбэр">
                        <Select options={Object.entries(TOURNAMENT_FORMATS).map(([v, l]) => ({ value: Number(v), label: l }))} />
                    </Form.Item>
                    <Form.Item name="gender" label="Хүйс">
                        <Select options={Object.entries(GENDERS).map(([v, l]) => ({ value: Number(v), label: l }))} />
                    </Form.Item>
                    <Form.Item name="best_of" label="Сетийн тоо" tooltip="5 сеттэй бол 3 сет түрүүлсэн баг хожно">
                        <Select options={[{ value: 5, label: "5 сет" }, { value: 3, label: "3 сет" }]} />
                    </Form.Item>
                    <Form.Item name="venueid" label="Заал">
                        <Select allowClear options={venues.map((v) => ({ value: v.venueid, label: v.name }))} />
                    </Form.Item>
                    <Form.Item name="status" label="Төлөв">
                        <Select options={Object.entries(TOURNAMENT_STATUS).map(([v, l]) => ({ value: Number(v), label: l }))} />
                    </Form.Item>
                    <Form.Item name="notes" label="Тэмдэглэл">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                </Form>
            </Modal>

            <style jsx global>{`
                .clickable {
                    cursor: pointer;
                }
            `}</style>
        </AppShell>
    );
}
