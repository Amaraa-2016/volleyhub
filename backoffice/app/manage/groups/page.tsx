"use client";

import { App, Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Switch, Table, Tag, TimePicker } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { Plus, Trash2 } from "lucide-react";
import AppShell from "@/app/components/AppShell";
import { API, APIWithError, errorText } from "@/app/utils/API";
import {
    GENDERS, WEEKDAYS, minuteToTime, money, timeToMinute,
    type Group, type Staff, type Venue,
} from "@/app/types/api";

// A row of the weekly timetable inside the group form. `scheduleid` is absent for a row the user
// just added, which is what tells the save which rows to create and which to update.
interface SlotRow {
    scheduleid?: number;
    weekday: number;
    time: [dayjs.Dayjs, dayjs.Dayjs];
    venueid?: number | null;
}

export default function GroupsPage() {
    const router = useRouter();
    const { message } = App.useApp();
    const [rows, setRows] = useState<Group[]>([]);
    const [staff, setStaff] = useState<Staff[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<Group | null>(null);
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();

    // Watched so the "N times a week" hint updates as slots are added.
    const slots: SlotRow[] = Form.useWatch("slots", form) ?? [];

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
        form.resetFields();
        form.setFieldsValue(
            group
                ? {
                    ...group,
                    slots: group.schedule.map((s) => ({
                        scheduleid: s.scheduleid,
                        weekday: s.weekday,
                        time: [
                            dayjs().startOf("day").add(s.start_minute, "minute"),
                            dayjs().startOf("day").add(s.end_minute, "minute"),
                        ],
                        venueid: s.venueid,
                    })),
                }
                : {
                    gender: 3,
                    isactive: true,
                    capacity: 0,
                    fee_amount: 0,
                    slots: [{
                        weekday: 1,
                        time: [dayjs().hour(18).minute(0).second(0), dayjs().hour(19).minute(30).second(0)],
                    }],
                },
        );
        setOpen(true);
    };

    // The group and its timetable are saved together because that is how they are entered. The
    // group has to land first: a slot cannot reference a group that does not exist yet.
    const save = async () => {
        const { slots: rawSlots, ...values } = await form.validateFields();
        setSaving(true);

        const res = await APIWithError<{ groupid: number }>("/api/vh/backoffice/groups", {
            data: { ...values, groupid: editing?.groupid ?? 0 },
        });
        if (res.error || !res.data) {
            setSaving(false);
            message.error(errorText(res.error));
            return;
        }

        const groupId = res.data.groupid;
        const listed = (rawSlots ?? []) as SlotRow[];

        // Slots the user removed from the form are deleted; the rest are created or updated.
        const kept = new Set(listed.map((s) => s.scheduleid).filter(Boolean));
        for (const existing of editing?.schedule ?? []) {
            if (!kept.has(existing.scheduleid)) {
                await APIWithError(`/api/vh/backoffice/schedule/${existing.scheduleid}`, { method: "DELETE" });
            }
        }

        for (const slot of listed) {
            if (!slot?.time) continue;
            const slotRes = await APIWithError("/api/vh/backoffice/schedule", {
                data: {
                    scheduleid: slot.scheduleid ?? 0,
                    groupid: groupId,
                    venueid: slot.venueid ?? values.venueid ?? null,
                    weekday: slot.weekday,
                    start_minute: timeToMinute(slot.time[0].format("HH:mm")),
                    end_minute: timeToMinute(slot.time[1].format("HH:mm")),
                    isactive: true,
                },
            });
            if (slotRes.error) {
                // The group itself is already saved, so report which slot failed rather than
                // pretending the whole save was lost.
                setSaving(false);
                message.error(`${WEEKDAYS[slot.weekday]}: ${errorText(slotRes.error)}`);
                load();
                return;
            }
        }

        setSaving(false);
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
                                <>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                        {g.schedule.map((s) => (
                                            <Tag key={s.scheduleid} style={{ marginInlineEnd: 0 }}>
                                                {WEEKDAYS[s.weekday]} {minuteToTime(s.start_minute)}
                                            </Tag>
                                        ))}
                                    </div>
                                    <div style={{ color: "#79808A", fontSize: 12, marginTop: 4 }}>
                                        7 хоногт {g.schedule.length} удаа
                                    </div>
                                </>
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
                confirmLoading={saving}
                okText="Хадгалах"
                cancelText="Болих"
                width={620}
                destroyOnHidden
            >
                <Form form={form} layout="vertical" requiredMark={false}>
                    <Form.Item name="name" label="Группийн нэр" rules={[{ required: true, message: "Нэр оруулна уу" }]}>
                        <Input placeholder="Насанд хүрэгчдийн анги" />
                    </Form.Item>
                    <Form.Item name="level" label="Түвшин">
                        <Input placeholder="Анхан / Дунд / Ахисан" />
                    </Form.Item>
                    <Form.Item name="agegroup" label="Насны ангилал">
                        <Input placeholder="U14, 18+" />
                    </Form.Item>
                    <Form.Item name="gender" label="Хүйс">
                        <Select options={Object.entries(GENDERS).map(([v, l]) => ({ value: Number(v), label: l }))} />
                    </Form.Item>
                    <Form.Item name="capacity" label="Хамгийн олондоо авах хүний тоо" tooltip="0 бол хязгааргүй">
                        <InputNumber min={0} max={200} style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item name="fee_amount" label="Сарын төлбөр (₮)">
                        <InputNumber min={0} step={10000} style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item name="venueid" label="Байршил (заал)">
                        <Select allowClear options={venues.map((v) => ({ value: v.venueid, label: v.name }))} />
                    </Form.Item>
                    <Form.Item name="coach_staffid" label="Дасгалжуулагч">
                        <Select allowClear options={staff.map((s) => ({ value: s.staffid, label: s.staffname ?? s.phone }))} />
                    </Form.Item>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <label style={{ fontWeight: 500 }}>Долоо хоногийн хуваарь</label>
                        <span style={{ color: "#79808A", fontSize: 13 }}>
                            7 хоногт {slots.filter(Boolean).length} удаа
                        </span>
                    </div>

                    <Form.List name="slots">
                        {(fields, { add, remove: removeSlot }) => (
                            <div style={{ marginTop: 8 }}>
                                {fields.map((field) => (
                                    <div key={field.key} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                                        <Form.Item name={[field.name, "scheduleid"]} hidden><Input /></Form.Item>
                                        <Form.Item
                                            name={[field.name, "weekday"]}
                                            noStyle
                                            rules={[{ required: true, message: "" }]}
                                        >
                                            <Select
                                                style={{ width: 120 }}
                                                options={WEEKDAYS.map((label, value) => ({ value, label }))}
                                            />
                                        </Form.Item>
                                        <Form.Item
                                            name={[field.name, "time"]}
                                            noStyle
                                            rules={[{ required: true, message: "" }]}
                                        >
                                            <TimePicker.RangePicker format="HH:mm" minuteStep={5} style={{ flex: 1 }} />
                                        </Form.Item>
                                        <Button danger icon={<Trash2 size={14} />} onClick={() => removeSlot(field.name)} />
                                    </div>
                                ))}
                                <Button
                                    type="dashed"
                                    block
                                    icon={<Plus size={14} />}
                                    onClick={() => add({
                                        weekday: 1,
                                        time: [
                                            dayjs().hour(18).minute(0).second(0),
                                            dayjs().hour(19).minute(30).second(0),
                                        ],
                                    })}
                                >
                                    Цаг нэмэх
                                </Button>
                            </div>
                        )}
                    </Form.List>

                    <Form.Item name="notes" label="Тэмдэглэл" style={{ marginTop: 16 }}>
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
