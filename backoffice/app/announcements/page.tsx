"use client";

import { Button, Form, Input, Modal, Switch, Table, Tag, App, Popconfirm } from "antd";
import { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import { Plus } from "lucide-react";
import AppShell from "@/app/components/AppShell";
import { API, APIWithError, errorText } from "@/app/utils/API";
import type { Announcement } from "@/app/types/api";

export default function AnnouncementsPage() {
    const { message } = App.useApp();
    const [rows, setRows] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Announcement | null>(null);
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        setRows(await API<Announcement[]>("/api/vh/backoffice/announcements") ?? []);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const openForm = (post: Announcement | null) => {
        setEditing(post);
        form.setFieldsValue(post ? { ...post, publish: !!post.published_at } : { publish: true });
        setOpen(true);
    };

    const save = async () => {
        const values = await form.validateFields();
        const res = await APIWithError("/api/vh/backoffice/announcements", {
            data: { ...values, announcementid: editing?.announcementid ?? 0 },
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
        const res = await APIWithError(`/api/vh/backoffice/announcements/${id}`, { method: "DELETE" });
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
                <h1 className="page-title">Мэдээ</h1>
                <Button type="primary" icon={<Plus size={16} />} onClick={() => openForm(null)}>Мэдээ нэмэх</Button>
            </div>

            <Table
                rowKey="announcementid"
                loading={loading}
                dataSource={rows}
                columns={[
                    { title: "Гарчиг", dataIndex: "title" },
                    { title: "Нийтэлсэн", dataIndex: "authorname", width: 160 },
                    {
                        title: "Огноо",
                        dataIndex: "published_at",
                        width: 160,
                        render: (v: string | null, post: Announcement) =>
                            v ? dayjs(v).format("YYYY/MM/DD HH:mm") : dayjs(post.created).format("YYYY/MM/DD"),
                    },
                    {
                        title: "Төлөв",
                        width: 120,
                        render: (_: unknown, post: Announcement) =>
                            post.published_at
                                ? <Tag color="green">Нийтэлсэн</Tag>
                                : <Tag>Ноорог</Tag>,
                    },
                    {
                        title: "",
                        width: 150,
                        render: (_: unknown, post: Announcement) => (
                            <div style={{ display: "flex", gap: 8 }}>
                                <Button size="small" onClick={() => openForm(post)}>Засах</Button>
                                <Popconfirm title="Устгах уу?" onConfirm={() => remove(post.announcementid)}>
                                    <Button size="small" danger>Устгах</Button>
                                </Popconfirm>
                            </div>
                        ),
                    },
                ]}
            />

            <Modal
                open={open}
                title={editing ? "Мэдээ засах" : "Шинэ мэдээ"}
                onCancel={() => setOpen(false)}
                onOk={save}
                okText="Хадгалах"
                cancelText="Болих"
                width={640}
                destroyOnHidden
            >
                <Form form={form} layout="vertical" requiredMark={false}>
                    <Form.Item name="title" label="Гарчиг" rules={[{ required: true, message: "Гарчиг оруулна уу" }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="body" label="Агуулга">
                        <Input.TextArea rows={8} />
                    </Form.Item>
                    <Form.Item
                        name="publish"
                        label="Нийтлэх"
                        valuePropName="checked"
                        tooltip="Нийтлээгүй мэдээ зөвхөн backoffice-д харагдана"
                    >
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </AppShell>
    );
}
