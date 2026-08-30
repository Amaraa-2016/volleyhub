"use client";

import { Button, Form, Input, InputNumber, Modal, Select, Switch, Table, Tag, App, Popconfirm } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import AppShell from "@/app/components/AppShell";
import { API, APIWithError, errorText } from "@/app/utils/API";
import {
    GENDERS, WEEKDAYS, minuteToTime, money,
    type Group, type Staff, type Venue,
} from "@/app/types/api";

export default function GroupsPage() {
    const router = useRouter();
    const { message } = App.useApp();
    const [rows, setRows] = useState<Group[]>([]);
    const [staff, setStaff] = useState<Staff[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Group | null>(null);
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        setRows(await API<Group[]>("/api/vh/backoffice/groups?includeInactive=true") ?? []);
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
        API<Staff[]>("/api/vh/backoffice/staff").then((s) => setStaff(s ?? []));
        API<Venue[]>("/api/vh/backoffice/venues").then((v) => setVenues(v ?? []));
    }, [load]);

    const openForm = (group: Group | null) => {
        setEditing(group);
        form.setFieldsValue(group ?? { gender: 3, isactive: true, capacity: 0, fee_amount: 0 });
        setOpen(true);
    };

    const save = async () => {
        const values = await form.validateFields();
        const res = await APIWithError("/api/vh/backoffice/groups", {
            data: { ...values, groupid: editing?.groupid ?? 0 },
        });

        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        setOpen(false);
        message.success("Хадгаллаа");
        load();
    };

    const remove = async (groupid: number) => {
        const res = await APIWithError<{ archived: boolean }>(`/api/vh/backoffice/groups/${groupid}`, { method: "DELETE" });
        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        message.success(res.data?.archived ? "Түүхтэй тул архивлав" : "Устгалаа");
        load();
    };

    return (
        <AppShell>
            <div className="page-header">
                <h1 className="page-title">Группүүд</h1>
                <Button type="primary" icon={<Plus size={16} />} onClick={() => openForm(null)}>
                    Групп нэмэх
                </Button>
            </div>

            <Table
                rowKey="groupid"
                loading={loading}
                dataSource={rows}
                scroll={{ x: 900 }}
                onRow={(group) => ({ onClick: () => router.push(`/manage/groups/${group.groupid}`) })}
                rowClassName={() => "clickable"}
                columns={[
                    {
                        title: "Нэр",
                        render: (_: unknown, g: Group) => (
                            <>
                                <div style={{ fontWeight: 600 }}>{g.name}</div>
                                <div style={{ color: "#79808A", fontSize: 12 }}>
                                    {[g.level, g.agegroup, GENDERS[g.gender]].filter(Boolean).join(" · ")}
                                </div>
                            </>
                        ),
                    },
                    {
                        title: "Хуваарь",
                        render: (_: unknown, g: Group) =>
                            g.schedule.length === 0 ? <span style={{ color: "#9AA3B0" }}>-</span> : (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                    {g.schedule.map((s) => (
                                        <Tag key={s.scheduleid} style={{ marginInlineEnd: 0 }}>
                                            {WEEKDAYS[s.weekday]} {minuteToTime(s.start_minute)}
                                        </Tag>
                                    ))}
                                </div>
                            ),
                    },
                    { title: "Дасгалжуулагч", dataIndex: "coachname", width: 150 },
                    { title: "Заал", dataIndex: "venuename", width: 130 },
                    {
                        title: "Суралцагч",
                        width: 110,
                        render: (_: unknown, g: Group) =>
                            g.capacity > 0 ? `${g.studentcount}/${g.capacity}` : g.studentcount,
                    },
                    {
                        title: "Сарын төлбөр",
                        width: 130,
                        render: (_: unknown, g: Group) => money(g.fee_amount),
                    },
                    {
                        title: "",
                        width: 150,
                        render: (_: unknown, g: Group) => (
                            <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 8 }}>
                                <Button size="small" onClick={() => openForm(g)}>Засах</Button>
                                <Popconfirm title="Устгах уу?" onConfirm={() => remove(g.groupid)}>
                                    <Button size="small" danger>Устгах</Button>
                                </Popconfirm>
                            </div>
                        ),
                    },
                ]}
            />

            <Modal
                open={open}
                title={editing ? "Групп засах" : "Шинэ групп"}
                onCancel={() => setOpen(false)}
                onOk={save}
                okText="Хадгалах"
                cancelText="Болих"
                destroyOnHidden
            >
                <Form form={form} layout="vertical" requiredMark={false}>
                    <Form.Item name="name" label="Нэр" rules={[{ required: true, message: "Нэр оруулна уу" }]}>
                        <Input placeholder="Анхан шат А" />
                    </Form.Item>
                    <Form.Item name="level" label="Түвшин">
                        <Input placeholder="Анхан / Дунд / Ахисан" />
                    </Form.Item>
                    <Form.Item name="agegroup" label="Насны ангилал">
                        <Input placeholder="U14, 8-12 нас" />
                    </Form.Item>
                    <Form.Item name="gender" label="Хүйс">
                        <Select options={Object.entries(GENDERS).map(([v, l]) => ({ value: Number(v), label: l }))} />
                    </Form.Item>
                    <Form.Item name="coach_staffid" label="Дасгалжуулагч">
                        <Select allowClear options={staff.map((s) => ({ value: s.staffid, label: s.staffname ?? s.phone }))} />
                    </Form.Item>
                    <Form.Item name="venueid" label="Заал">
                        <Select allowClear options={venues.map((v) => ({ value: v.venueid, label: v.name }))} />
                    </Form.Item>
                    <Form.Item name="capacity" label="Багтаамж" tooltip="0 бол хязгааргүй">
                        <InputNumber min={0} max={200} style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item name="fee_amount" label="Сарын төлбөр (₮)">
                        <InputNumber min={0} step={10000} style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item name="notes" label="Тэмдэглэл">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item name="isactive" label="Идэвхтэй" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </AppShell>
    );
}
