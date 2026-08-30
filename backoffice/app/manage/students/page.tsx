"use client";

import { App, Button, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Select, Table, Tag } from "antd";
import { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import { Plus, Search } from "lucide-react";
import AppShell from "@/app/components/AppShell";
import { API, APIWithError, errorText } from "@/app/utils/API";
import { GENDERS, STUDENT_STATUS, money, type Group, type Student } from "@/app/types/api";

interface StudentFormValues extends Omit<Student, "date_of_birth" | "studentid"> {
    date_of_birth?: dayjs.Dayjs | null;
}

export default function StudentsPage() {
    const { message } = App.useApp();
    const [rows, setRows] = useState<Student[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [groupFilter, setGroupFilter] = useState<number>();
    const [editing, setEditing] = useState<Student | null>(null);
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm<StudentFormValues>();

    const load = useCallback(async () => {
        setLoading(true);
        const query = new URLSearchParams();
        if (search) query.set("search", search);
        if (groupFilter) query.set("groupid", String(groupFilter));
        const suffix = query.toString() ? `?${query}` : "";
        setRows(await API<Student[]>(`/api/vh/backoffice/students${suffix}`) ?? []);
        setLoading(false);
    }, [search, groupFilter]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { API<Group[]>("/api/vh/backoffice/groups").then((g) => setGroups(g ?? [])); }, []);

    const openForm = (student: Student | null) => {
        setEditing(student);
        form.setFieldsValue(
            student
                ? { ...student, date_of_birth: student.date_of_birth ? dayjs(student.date_of_birth) : null }
                : ({ status: 1, gender: 1 } as StudentFormValues),
        );
        setOpen(true);
    };

    const save = async () => {
        const values = await form.validateFields();
        const res = await APIWithError("/api/vh/backoffice/students", {
            data: {
                ...values,
                studentid: editing?.studentid ?? 0,
                // Sent at midnight UTC so a birthday never shifts a day across timezones.
                date_of_birth: values.date_of_birth ? values.date_of_birth.startOf("day").toISOString() : null,
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

    const remove = async (studentid: number) => {
        const res = await APIWithError(`/api/vh/backoffice/students/${studentid}`, { method: "DELETE" });
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
                <h1 className="page-title">Суралцагчид</h1>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Input
                        prefix={<Search size={14} />}
                        placeholder="Нэр, утсаар хайх"
                        allowClear
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ width: 200 }}
                    />
                    <Select
                        allowClear
                        placeholder="Групп"
                        style={{ width: 180 }}
                        onChange={setGroupFilter}
                        options={groups.map((g) => ({ value: g.groupid, label: g.name }))}
                    />
                    <Button type="primary" icon={<Plus size={16} />} onClick={() => openForm(null)}>
                        Суралцагч нэмэх
                    </Button>
                </div>
            </div>

            <Table
                rowKey="studentid"
                loading={loading}
                dataSource={rows}
                scroll={{ x: 900 }}
                columns={[
                    {
                        title: "Нэр",
                        render: (_: unknown, s: Student) => `${s.last_name} ${s.first_name}`.trim(),
                    },
                    {
                        title: "Нас",
                        width: 70,
                        render: (_: unknown, s: Student) =>
                            s.date_of_birth ? dayjs().diff(dayjs(s.date_of_birth), "year") : "-",
                    },
                    { title: "Групп", dataIndex: "groupname", width: 160, render: (v?: string) => v ?? "-" },
                    { title: "Утас", dataIndex: "phone", width: 120 },
                    { title: "Эцэг эх", dataIndex: "parent_phone", width: 130 },
                    {
                        title: "Үлдэгдэл",
                        width: 120,
                        render: (_: unknown, s: Student) =>
                            s.balance > 0
                                ? <Tag color="red">{money(s.balance)}</Tag>
                                : <span style={{ color: "#79808A" }}>-</span>,
                    },
                    {
                        title: "Төлөв",
                        dataIndex: "status",
                        width: 140,
                        render: (v: number) => STUDENT_STATUS[v],
                    },
                    {
                        title: "",
                        width: 150,
                        render: (_: unknown, s: Student) => (
                            <div style={{ display: "flex", gap: 8 }}>
                                <Button size="small" onClick={() => openForm(s)}>Засах</Button>
                                <Popconfirm title="Устгах уу?" onConfirm={() => remove(s.studentid)}>
                                    <Button size="small" danger>Устгах</Button>
                                </Popconfirm>
                            </div>
                        ),
                    },
                ]}
            />

            <Modal
                open={open}
                title={editing ? "Суралцагч засах" : "Шинэ суралцагч"}
                onCancel={() => setOpen(false)}
                onOk={save}
                okText="Хадгалах"
                cancelText="Болих"
                destroyOnHidden
            >
                <Form form={form} layout="vertical" requiredMark={false}>
                    <Form.Item name="last_name" label="Овог">
                        <Input />
                    </Form.Item>
                    <Form.Item name="first_name" label="Нэр" rules={[{ required: true, message: "Нэр оруулна уу" }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="date_of_birth" label="Төрсөн огноо">
                        <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
                    </Form.Item>
                    <Form.Item name="gender" label="Хүйс">
                        <Select options={[{ value: 1, label: GENDERS[1] }, { value: 2, label: GENDERS[2] }]} />
                    </Form.Item>
                    <Form.Item
                        name="phone"
                        label="Утас"
                        tooltip="Апп-д бүртгэлтэй дугаартай таарвал суралцагч гар утаснаасаа хуваарь, төлбөрөө харна"
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item name="parent_name" label="Эцэг/эхийн нэр">
                        <Input />
                    </Form.Item>
                    <Form.Item name="parent_phone" label="Эцэг/эхийн утас">
                        <Input />
                    </Form.Item>
                    <Form.Item name="height_cm" label="Өндөр (см)">
                        <InputNumber min={80} max={250} style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item name="reg_no" label="Регистрийн дугаар">
                        <Input />
                    </Form.Item>
                    <Form.Item name="status" label="Төлөв">
                        <Select options={Object.entries(STUDENT_STATUS).map(([v, l]) => ({ value: Number(v), label: l }))} />
                    </Form.Item>
                    <Form.Item name="notes" label="Тэмдэглэл">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                </Form>
            </Modal>
        </AppShell>
    );
}
