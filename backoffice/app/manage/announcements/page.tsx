"use client";

import { App, Button, Form, Input, Modal, Popconfirm, Switch, Table, Tag } from "antd";
import { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import { Plus } from "lucide-react";
import AppShell from "@/app/components/AppShell";
import { API, APIWithError, errorText } from "@/app/utils/API";
import type { Announcement } from "@/app/types/api";

// The centre talking to its own students - it shows up in the mobile app, not on the public site.
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
                <h1 className="page-title">Зарлага</h1>
                <Button type="primary" icon={<Plus size={16} />} onClick={() => openForm(null)}>Зарлага нэмэх</Button>
            </div>

            <Table
                rowKey="announcementid"
                loading={loading}
                dataSource={rows}
                scroll={{ x: 700 }}
                columns={[
                    { title: "Гарчиг", dataIndex: "title" },
                    { title: "Нийтэлсэн", dataIndex: "authorname", width: 150 },
                    {
                        title: "Огноо",
                        width: 160,
                        render: (_: unknown, post: Announcement) =>
                            post.published_at
                                ? dayjs(post.published_at).format("YYYY/MM/DD HH:mm")
                                : dayjs(post.created).format("YYYY/MM/DD"),
                    },
                    {
                        title: "Төлөв",
                        width: 120,
                        render: (_: unknown, post: Announcement) =>
                            post.published_at ? <Tag color="green">Нийтэлсэн</Tag> : <Tag>Ноорог</Tag>,
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
                title={editing ? "Зарлага засах" : "Шинэ зарлага"}
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
                        tooltip="Нийтлээгүй зарлага зөвхөн энд харагдана"
                    >
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </AppShell>
    );
}
