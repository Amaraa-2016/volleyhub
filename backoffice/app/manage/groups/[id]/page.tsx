"use client";

import { App, Button, Card, Descriptions, Form, InputNumber, Modal, Popconfirm, Select, Table, Tag, TimePicker } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dayjs from "dayjs";
import { ArrowLeft, Plus } from "lucide-react";
import AppShell from "@/app/components/AppShell";
import { API, APIWithError, errorText } from "@/app/utils/API";
import {
    GENDERS, STUDENT_STATUS, WEEKDAYS, minuteToTime, money, timeToMinute,
    type Group, type RosterEntry, type ScheduleEntry, type Student, type Venue,
} from "@/app/types/api";

export default function GroupDetailPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const { message } = App.useApp();
    const groupId = Number(params.id);

    const [group, setGroup] = useState<Group>();
    const [roster, setRoster] = useState<RosterEntry[]>([]);
    const [free, setFree] = useState<Student[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [loading, setLoading] = useState(true);
    const [enrollOpen, setEnrollOpen] = useState(false);
    const [slotOpen, setSlotOpen] = useState(false);
    const [enrollForm] = Form.useForm();
    const [slotForm] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        const [g, r] = await Promise.all([
            API<Group>(`/api/vh/backoffice/groups/${groupId}`),
            API<RosterEntry[]>(`/api/vh/backoffice/groups/${groupId}/students`),
        ]);
        setGroup(g);
        setRoster(r ?? []);
        setLoading(false);
    }, [groupId]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { API<Venue[]>("/api/vh/backoffice/venues").then((v) => setVenues(v ?? [])); }, []);

    // Only students who are not in a group yet can be added, so nobody ends up on two rosters.
    const openEnroll = async () => {
        setFree(await API<Student[]>("/api/vh/backoffice/students?unassigned=true") ?? []);
        enrollForm.resetFields();
        enrollForm.setFieldsValue({ fee_amount: group?.fee_amount });
        setEnrollOpen(true);
    };

    const enroll = async () => {
        const values = await enrollForm.validateFields();
        const res = await APIWithError(`/api/vh/backoffice/groups/${groupId}/students`, { data: values });
        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        setEnrollOpen(false);
        load();
    };

    const unenroll = async (studentid: number) => {
        const res = await APIWithError(`/api/vh/backoffice/groups/${groupId}/students/${studentid}`, { method: "DELETE" });
        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        load();
    };

    const openSlot = () => {
        slotForm.resetFields();
        slotForm.setFieldsValue({
            weekday: 1,
            time: [dayjs().hour(18).minute(0), dayjs().hour(19).minute(30)],
            venueid: group?.venueid,
        });
        setSlotOpen(true);
    };

    const saveSlot = async () => {
        const { time, ...values } = await slotForm.validateFields();
        const res = await APIWithError("/api/vh/backoffice/schedule", {
            data: {
                ...values,
                groupid: groupId,
                start_minute: timeToMinute(time[0].format("HH:mm")),
                end_minute: timeToMinute(time[1].format("HH:mm")),
                isactive: true,
            },
        });
        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        setSlotOpen(false);
        load();
    };

    const deleteSlot = async (scheduleid: number) => {
        const res = await APIWithError(`/api/vh/backoffice/schedule/${scheduleid}`, { method: "DELETE" });
        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        load();
    };

    return (
        <AppShell>
            <div className="page-header">
                <Button icon={<ArrowLeft size={16} />} onClick={() => router.push("/manage/groups")}>Буцах</Button>
                <h1 className="page-title" style={{ flex: 1 }}>{group?.name ?? ""}</h1>
                <Button type="primary" icon={<Plus size={16} />} onClick={openEnroll}>Суралцагч нэмэх</Button>
            </div>

            <Card style={{ marginBottom: 16 }} loading={loading}>
                <Descriptions size="small" column={{ xs: 1, md: 3 }}>
                    <Descriptions.Item label="Түвшин">{group?.level ?? "-"}</Descriptions.Item>
                    <Descriptions.Item label="Насны ангилал">{group?.agegroup ?? "-"}</Descriptions.Item>
                    <Descriptions.Item label="Хүйс">{group ? GENDERS[group.gender] : ""}</Descriptions.Item>
                    <Descriptions.Item label="Багш">
                        {group?.coaches.length
                            ? group.coaches.map((c) => `${c.last_name} ${c.first_name}`.trim()).join(", ")
                            : "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Хаяг">{group?.address ?? "-"}</Descriptions.Item>
                    <Descriptions.Item label="Сарын төлбөр">{money(group?.fee_amount)}</Descriptions.Item>
                </Descriptions>
            </Card>

            <Card
                title="Долоо хоногийн хуваарь"
                style={{ marginBottom: 16 }}
                extra={<Button size="small" icon={<Plus size={14} />} onClick={openSlot}>Цаг нэмэх</Button>}
            >
                {group?.schedule.length === 0 ? (
                    <div style={{ color: "#79808A" }}>Хуваарь оруулаагүй байна.</div>
                ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {group?.schedule.map((s: ScheduleEntry) => (
                            <Tag
                                key={s.scheduleid}
                                closable
                                onClose={(e) => { e.preventDefault(); deleteSlot(s.scheduleid); }}
                                style={{ padding: "4px 10px", fontSize: 13 }}
                            >
                                {WEEKDAYS[s.weekday]} {minuteToTime(s.start_minute)}-{minuteToTime(s.end_minute)}
                                {s.venuename ? ` · ${s.venuename}` : ""}
                            </Tag>
                        ))}
                    </div>
                )}
            </Card>

            <Card title={`Суралцагчид (${roster.length})`}>
                <Table
                    rowKey="enrollmentid"
                    loading={loading}
                    dataSource={roster}
                    pagination={false}
                    scroll={{ x: 700 }}
                    columns={[
                        {
                            title: "Нэр",
                            render: (_: unknown, s: RosterEntry) => `${s.last_name} ${s.first_name}`.trim(),
                        },
                        {
                            title: "Нас",
                            width: 80,
                            render: (_: unknown, s: RosterEntry) =>
                                s.date_of_birth ? dayjs().diff(dayjs(s.date_of_birth), "year") : "-",
                        },
                        { title: "Утас", dataIndex: "phone", width: 120 },
                        { title: "Яаралтай үед", dataIndex: "emergency_phone", width: 140 },
                        {
                            title: "Төлбөр",
                            width: 120,
                            render: (_: unknown, s: RosterEntry) => money(s.fee_amount),
                        },
                        {
                            title: "Төлөв",
                            width: 130,
                            render: (_: unknown, s: RosterEntry) => STUDENT_STATUS[s.status],
                        },
                        {
                            title: "",
                            width: 110,
                            render: (_: unknown, s: RosterEntry) => (
                                <Popconfirm title="Группээс хасах уу?" onConfirm={() => unenroll(s.studentid)}>
                                    <Button size="small" danger>Хасах</Button>
                                </Popconfirm>
                            ),
                        },
                    ]}
                />
            </Card>

            <Modal
                open={enrollOpen}
                title="Суралцагч нэмэх"
                onCancel={() => setEnrollOpen(false)}
                onOk={enroll}
                okText="Нэмэх"
                cancelText="Болих"
                destroyOnHidden
            >
                <Form form={enrollForm} layout="vertical" requiredMark={false}>
                    <Form.Item name="studentid" label="Суралцагч" rules={[{ required: true, message: "Суралцагч сонгоно уу" }]}>
                        <Select
                            showSearch
                            optionFilterProp="label"
                            options={free.map((s) => ({
                                value: s.studentid,
                                label: `${s.last_name} ${s.first_name}`.trim(),
                            }))}
                        />
                    </Form.Item>
                    <Form.Item
                        name="fee_amount"
                        label="Тохирсон сарын төлбөр (₮)"
                        tooltip="Хоосон бол группийн үндсэн үнэ хэрэглэгдэнэ"
                    >
                        <InputNumber min={0} step={10000} style={{ width: "100%" }} />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                open={slotOpen}
                title="Хуваарийн цаг нэмэх"
                onCancel={() => setSlotOpen(false)}
                onOk={saveSlot}
                okText="Нэмэх"
                cancelText="Болих"
                destroyOnHidden
            >
                <Form form={slotForm} layout="vertical" requiredMark={false}>
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
        </AppShell>
    );
}
