"use client";

import {
    App, AutoComplete, Button, DatePicker, Divider, Form, Input, InputNumber, Modal, Popconfirm,
    Select, Switch, Table, Tag, TimePicker,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { Plus, Trash2 } from "lucide-react";
import AppShell from "@/app/components/AppShell";
import { ImageUpload } from "@/app/components/ImageUpload";
import { API, APIWithError, errorText } from "@/app/utils/API";
import {
    GENDERS, LEVELS, WEEKDAYS, minuteToTime, money, timeToMinute,
    type Coach, type Group,
} from "@/app/types/api";

// A row of the weekly timetable inside the course form. `scheduleid` is absent for a row the user
// just added, which is what tells the save which rows to create and which to update.
interface SlotRow {
    scheduleid?: number;
    weekday: number;
    time: [dayjs.Dayjs, dayjs.Dayjs];
}

export default function CoursesPage() {
    const router = useRouter();
    const { message } = App.useApp();
    const [rows, setRows] = useState<Group[]>([]);
    const [coaches, setCoaches] = useState<Coach[]>([]);
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
        API<Coach[]>("/api/vh/backoffice/coaches").then((c) => setCoaches(c ?? []));
    }, [load]);

    const openForm = (group: Group | null) => {
        setEditing(group);
        form.resetFields();
        form.setFieldsValue(
            group
                ? {
                    ...group,
                    start_date: group.start_date ? dayjs(group.start_date) : null,
                    coachids: group.coaches.map((c) => c.coachid),
                    slots: group.schedule.map((s) => ({
                        scheduleid: s.scheduleid,
                        weekday: s.weekday,
                        time: [
                            dayjs().startOf("day").add(s.start_minute, "minute"),
                            dayjs().startOf("day").add(s.end_minute, "minute"),
                        ],
                    })),
                }
                : {
                    gender: 3,
                    isactive: true,
                    capacity: 0,
                    fee_amount: 0,
                    coachids: [],
                    slots: [{
                        weekday: 1,
                        time: [dayjs().hour(18).minute(0).second(0), dayjs().hour(19).minute(30).second(0)],
                    }],
                },
        );
        setOpen(true);
    };

    // The course and its timetable are saved together because that is how they are entered. The
    // course has to land first: a slot cannot reference a course that does not exist yet.
    const save = async () => {
        const { slots: rawSlots, start_date, ...values } = await form.validateFields();
        setSaving(true);

        const res = await APIWithError<{ groupid: number }>("/api/vh/backoffice/groups", {
            data: {
                ...values,
                groupid: editing?.groupid ?? 0,
                // Midnight UTC, so a start date never shifts a day across timezones.
                start_date: start_date ? start_date.startOf("day").toISOString() : null,
            },
        });
        if (res.error || !res.data) {
            setSaving(false);
            message.error(errorText(res.error));
            return;
        }

        const groupId = res.data.groupid;
        const listed = (rawSlots ?? []) as SlotRow[];

        // Slots the user removed from the form are deleted; the rest are created or updated.
        const kept = new Set(listed.map((s) => s?.scheduleid).filter(Boolean));
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
                    // No hall on a course any more, so a slot carries none either.
                    venueid: null,
                    weekday: slot.weekday,
                    start_minute: timeToMinute(slot.time[0].format("HH:mm")),
                    end_minute: timeToMinute(slot.time[1].format("HH:mm")),
                    isactive: true,
                },
            });
            if (slotRes.error) {
                // The course itself is already saved, so name the slot that failed rather than
                // implying the whole save was lost.
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
                <h1 className="page-title">Сургалт</h1>
                <Button type="primary" icon={<Plus size={16} />} onClick={() => openForm(null)}>
                    Сургалт нэмэх
                </Button>
            </div>

            <Table
                rowKey="groupid"
                loading={loading}
                dataSource={rows}
                scroll={{ x: 1000 }}
                onRow={(group) => ({ onClick: () => router.push(`/manage/groups/${group.groupid}`) })}
                rowClassName={() => "clickable"}
                columns={[
                    {
                        title: "Сургалт",
                        render: (_: unknown, g: Group) => (
                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                {g.cover
                                    ? <img src={g.cover} alt="" style={{ width: 52, height: 40, objectFit: "cover", borderRadius: 6 }} />
                                    : <div style={{ width: 52, height: 40, borderRadius: 6, background: "#eceef1" }} />}
                                <div>
                                    <div style={{ fontWeight: 600 }}>{g.name}</div>
                                    <div style={{ color: "#79808A", fontSize: 12 }}>
                                        {[g.agegroup, g.level, GENDERS[g.gender]].filter(Boolean).join(" · ")}
                                    </div>
                                </div>
                            </div>
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
                    {
                        title: "Багш",
                        width: 170,
                        render: (_: unknown, g: Group) =>
                            g.coaches.length === 0 ? <span style={{ color: "#9AA3B0" }}>-</span> : (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                    {g.coaches.map((c) => (
                                        <Tag key={c.coachid} style={{ marginInlineEnd: 0 }}>
                                            {`${c.last_name} ${c.first_name}`.trim()}
                                        </Tag>
                                    ))}
                                </div>
                            ),
                    },
                    {
                        title: "Эхлэх",
                        width: 120,
                        render: (_: unknown, g: Group) =>
                            g.start_date ? dayjs(g.start_date).format("YYYY/MM/DD") : "-",
                    },
                    { title: "Хаяг", dataIndex: "address", width: 180, render: (v?: string) => v ?? "-" },
                    {
                        title: "Хүний тоо",
                        width: 110,
                        render: (_: unknown, g: Group) =>
                            g.capacity > 0 ? `${g.studentcount}/${g.capacity}` : g.studentcount,
                    },
                    {
                        title: "Үнэ",
                        width: 120,
                        render: (_: unknown, g: Group) => money(g.fee_amount),
                    },
                    {
                        title: "Төлөв",
                        width: 110,
                        render: (_: unknown, g: Group) =>
                            g.isactive ? <Tag color="green">Идэвхтэй</Tag> : <Tag>Идэвхгүй</Tag>,
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
                title={editing ? "Сургалт засах" : "Шинэ сургалт"}
                onCancel={() => setOpen(false)}
                onOk={save}
                confirmLoading={saving}
                okText="Хадгалах"
                cancelText="Болих"
                width={680}
                destroyOnHidden
            >
                <Form form={form} layout="vertical" requiredMark={false}>
                    <Form.Item name="name" label="Сургалтын нэр" rules={[{ required: true, message: "Нэр оруулна уу" }]}>
                        <Input placeholder="Насанд хүрэгчдийн анги" />
                    </Form.Item>

                    <Form.Item name="cover" label="Зураг" tooltip="Сайт дээрх сургалтын жагсаалтад харагдана">
                        <ImageUpload height={150} />
                    </Form.Item>

                    <Form.Item name="agegroup" label="Насны ангилал">
                        <Input placeholder="18+, 8-12 нас, U16" />
                    </Form.Item>

                    <Form.Item
                        name="level"
                        label="Түвшин"
                        tooltip="Жагсаалтаас сонгох, эсвэл өөрийн нэршлээ бичиж болно"
                    >
                        <AutoComplete
                            allowClear
                            placeholder="Анхан шат"
                            options={LEVELS.map((value) => ({ value }))}
                            filterOption={(input, option) =>
                                (option?.value ?? "").toLowerCase().includes(input.toLowerCase())}
                        />
                    </Form.Item>

                    <Form.Item name="start_date" label="Эхлэх огноо">
                        <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" placeholder="Огноо сонгох" />
                    </Form.Item>

                    <Form.Item name="fee_amount" label="Үнэ — сарын төлбөр (₮)">
                        <InputNumber min={0} step={10000} style={{ width: "100%" }} />
                    </Form.Item>

                    <Form.Item name="capacity" label="Нийт хэдэн хүн авах" tooltip="0 бол хязгааргүй">
                        <InputNumber min={0} max={500} style={{ width: "100%" }} />
                    </Form.Item>

                    <Form.Item name="address" label="Хаягийн мэдээлэл">
                        <Input.TextArea rows={2} placeholder="Дүүрэг, хороо, барилга, заалны нэр" />
                    </Form.Item>

                    <Form.Item
                        name="map_url"
                        label="Google map холбоос"
                        tooltip="Google Maps дээрээс Share → Copy link хийж энд буулгана"
                    >
                        <Input placeholder="https://maps.app.goo.gl/..." />
                    </Form.Item>

                    <Form.Item name="phone" label="Утасны дугаар">
                        <Input placeholder="99001122" />
                    </Form.Item>

                    <Divider style={{ margin: "8px 0 16px" }} />

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <label style={{ fontWeight: 500 }}>Хичээллэх цаг</label>
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
                                        <Form.Item name={[field.name, "weekday"]} noStyle rules={[{ required: true, message: "" }]}>
                                            <Select
                                                style={{ width: 120 }}
                                                options={WEEKDAYS.map((label, value) => ({ value, label }))}
                                            />
                                        </Form.Item>
                                        <Form.Item name={[field.name, "time"]} noStyle rules={[{ required: true, message: "" }]}>
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

                    <Divider style={{ margin: "16px 0" }} />

                    <Form.Item name="gender" label="Хүйс">
                        <Select options={Object.entries(GENDERS).map(([v, l]) => ({ value: Number(v), label: l }))} />
                    </Form.Item>
                    <Form.Item
                        name="coachids"
                        label="Багш нар"
                        tooltip="Нэг сургалтад хэд хэдэн багш байж болно"
                    >
                        <Select
                            mode="multiple"
                            allowClear
                            placeholder="Багш сонгох"
                            optionFilterProp="label"
                            notFoundContent="Багш бүртгээгүй байна — Багш цэснээс нэмнэ үү"
                            options={coaches.map((c) => ({
                                value: c.coachid,
                                label: `${c.last_name} ${c.first_name}`.trim() + (c.position ? ` — ${c.position}` : ""),
                            }))}
                        />
                    </Form.Item>
                    <Form.Item name="notes" label="Тайлбар" tooltip="Сайт дээрх дэлгэрэнгүй хуудсанд харагдана">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                    <Form.Item
                        name="isactive"
                        label="Идэвхтэй"
                        valuePropName="checked"
                        tooltip="Унтраасан үед сайт дээрх сургалтын жагсаалтад харагдахгүй"
                    >
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </AppShell>
    );
}
