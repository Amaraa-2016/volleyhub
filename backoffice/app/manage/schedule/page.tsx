"use client";

import { App, Button, Card, DatePicker, Form, Modal, Popconfirm, Select, TimePicker } from "antd";
import { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import { CalendarPlus, Plus, X } from "lucide-react";
import AppShell from "@/app/components/AppShell";
import { API, APIWithError, errorText } from "@/app/utils/API";
import { WEEKDAYS, minuteToTime, timeToMinute, type Group, type ScheduleEntry, type Venue } from "@/app/types/api";

// The recurring weekly timetable. Dated classes are generated from it on the Хичээл page, which is
// why nothing here ever touches attendance.
export default function SchedulePage() {
    const { message } = App.useApp();
    const [entries, setEntries] = useState<ScheduleEntry[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [generateOpen, setGenerateOpen] = useState(false);
    const [form] = Form.useForm();
    const [generateForm] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        setEntries(await API<ScheduleEntry[]>("/api/vh/backoffice/schedule") ?? []);
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
        API<Group[]>("/api/vh/backoffice/groups").then((g) => setGroups(g ?? []));
        API<Venue[]>("/api/vh/backoffice/venues").then((v) => setVenues(v ?? []));
    }, [load]);

    const openForm = (weekday?: number) => {
        form.resetFields();
        form.setFieldsValue({
            weekday: weekday ?? 1,
            time: [dayjs().hour(18).minute(0), dayjs().hour(19).minute(30)],
        });
        setOpen(true);
    };

    const save = async () => {
        const { time, ...values } = await form.validateFields();
        const res = await APIWithError("/api/vh/backoffice/schedule", {
            data: {
                ...values,
                start_minute: timeToMinute(time[0].format("HH:mm")),
                end_minute: timeToMinute(time[1].format("HH:mm")),
                isactive: true,
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

    const remove = async (scheduleid: number) => {
        const res = await APIWithError(`/api/vh/backoffice/schedule/${scheduleid}`, { method: "DELETE" });
        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        load();
    };

    const generate = async () => {
        const { range, groupid } = await generateForm.validateFields();
        const res = await APIWithError<{ created: number }>("/api/vh/backoffice/sessions/generate", {
            data: {
                groupid: groupid ?? null,
                from: range[0].startOf("day").toISOString(),
                to: range[1].startOf("day").toISOString(),
            },
        });
        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        setGenerateOpen(false);
        message.success(`${res.data?.created ?? 0} хичээл үүслээ`);
    };

    // Monday first: that is how a Mongolian week reads, even though the backend stores 0=Sunday.
    const orderedDays = [1, 2, 3, 4, 5, 6, 0];

    return (
        <AppShell>
            <div className="page-header">
                <h1 className="page-title">Долоо хоногийн хуваарь</h1>
                <div style={{ display: "flex", gap: 8 }}>
                    <Button icon={<CalendarPlus size={16} />} onClick={() => {
                        generateForm.setFieldsValue({ range: [dayjs(), dayjs().add(1, "month")] });
                        setGenerateOpen(true);
                    }}>
                        Хичээл үүсгэх
                    </Button>
                    <Button type="primary" icon={<Plus size={16} />} onClick={() => openForm()}>Цаг нэмэх</Button>
                </div>
            </div>

            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
                {orderedDays.map((day) => {
                    const slots = entries
                        .filter((e) => e.weekday === day)
                        .sort((a, b) => a.start_minute - b.start_minute);

                    return (
                        <Card
                            key={day}
                            size="small"
                            loading={loading}
                            title={WEEKDAYS[day]}
                            extra={
                                <Button type="text" size="small" icon={<Plus size={14} />} onClick={() => openForm(day)} />
                            }
                            styles={{ body: { minHeight: 120, padding: 12 } }}
                        >
                            {slots.length === 0 ? (
                                <div style={{ color: "#B7BCC4", fontSize: 13 }}>—</div>
                            ) : slots.map((s) => (
                                <div
                                    key={s.scheduleid}
                                    style={{
                                        border: "1px solid #eceef1", borderRadius: 8, padding: "8px 10px",
                                        marginBottom: 8, position: "relative",
                                    }}
                                >
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                                        {minuteToTime(s.start_minute)}-{minuteToTime(s.end_minute)}
                                    </div>
                                    <div style={{ fontSize: 13 }}>{s.groupname}</div>
                                    {!!s.venuename && (
                                        <div style={{ color: "#79808A", fontSize: 12 }}>{s.venuename}</div>
                                    )}
                                    <Popconfirm title="Устгах уу?" onConfirm={() => remove(s.scheduleid)}>
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={<X size={13} />}
                                            style={{ position: "absolute", top: 2, right: 2 }}
                                        />
                                    </Popconfirm>
                                </div>
                            ))}
                        </Card>
                    );
                })}
            </div>

            <Modal
                open={open}
                title="Хуваарийн цаг"
                onCancel={() => setOpen(false)}
                onOk={save}
                okText="Хадгалах"
                cancelText="Болих"
                destroyOnHidden
            >
                <Form form={form} layout="vertical" requiredMark={false}>
                    <Form.Item name="groupid" label="Групп" rules={[{ required: true, message: "Групп сонгоно уу" }]}>
                        <Select options={groups.map((g) => ({ value: g.groupid, label: g.name }))} />
                    </Form.Item>
                    <Form.Item name="weekday" label="Гараг" rules={[{ required: true, message: "Гараг сонгоно уу" }]}>
                        <Select options={WEEKDAYS.map((label, value) => ({ value, label }))} />
                    </Form.Item>
                    <Form.Item name="time" label="Цаг" rules={[{ required: true, message: "Цаг сонгоно уу" }]}>
                        <TimePicker.RangePicker format="HH:mm" minuteStep={5} style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item name="venueid" label="Заал">
                        <Select allowClear options={venues.map((v) => ({ value: v.venueid, label: v.name }))} />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                open={generateOpen}
                title="Хичээл үүсгэх"
                onCancel={() => setGenerateOpen(false)}
                onOk={generate}
                okText="Үүсгэх"
                cancelText="Болих"
                destroyOnHidden
            >
                <p style={{ color: "#79808A" }}>
                    Долоо хоногийн хуваариас өдөр тутмын хичээлүүдийг үүсгэнэ. Аль хэдийн үүссэн
                    хичээлд хүрэхгүй тул дахин ажиллуулахад давхардахгүй.
                </p>
                <Form form={generateForm} layout="vertical" requiredMark={false}>
                    <Form.Item name="groupid" label="Групп" tooltip="Хоосон бол бүх групп">
                        <Select allowClear options={groups.map((g) => ({ value: g.groupid, label: g.name }))} />
                    </Form.Item>
                    <Form.Item name="range" label="Хугацаа" rules={[{ required: true, message: "Хугацаа сонгоно уу" }]}>
                        <DatePicker.RangePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
                    </Form.Item>
                </Form>
            </Modal>
        </AppShell>
    );
}
