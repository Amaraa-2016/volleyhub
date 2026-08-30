"use client";

import { App, Button, Form, Input, InputNumber, Modal, Popconfirm, Table } from "antd";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import AppShell from "@/app/components/AppShell";
import { API, APIWithError, errorText } from "@/app/utils/API";
import type { Venue } from "@/app/types/api";

export default function VenuesPage() {
    const { message } = App.useApp();
    const [rows, setRows] = useState<Venue[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Venue | null>(null);
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        setRows(await API<Venue[]>("/api/vh/backoffice/venues") ?? []);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const openForm = (venue: Venue | null) => {
        setEditing(venue);
        form.setFieldsValue(venue ?? { courts: 1 });
        setOpen(true);
    };

    const save = async () => {
        const values = await form.validateFields();
        const res = await APIWithError("/api/vh/backoffice/venues", {
            data: { ...values, venueid: editing?.venueid ?? 0 },
        });
        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        setOpen(false);
        message.success("Хадгаллаа");
        load();
    };

    const remove = async (venueid: number) => {
        const res = await APIWithError(`/api/vh/backoffice/venues/${venueid}`, { method: "DELETE" });
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
                <h1 className="page-title">Заал</h1>
                <Button type="primary" icon={<Plus size={16} />} onClick={() => openForm(null)}>Заал нэмэх</Button>
            </div>

            <Table
                rowKey="venueid"
                loading={loading}
                dataSource={rows}
                scroll={{ x: 700 }}
                columns={[
                    { title: "Нэр", dataIndex: "name" },
                    { title: "Хаяг", dataIndex: "address" },
                    { title: "Талбайн тоо", dataIndex: "courts", width: 120 },
                    { title: "Утас", dataIndex: "contactphone", width: 130 },
                    {
                        title: "",
                        width: 150,
                        render: (_: unknown, v: Venue) => (
                            <div style={{ display: "flex", gap: 8 }}>
                                <Button size="small" onClick={() => openForm(v)}>Засах</Button>
                                <Popconfirm title="Устгах уу?" onConfirm={() => remove(v.venueid)}>
                                    <Button size="small" danger>Устгах</Button>
                                </Popconfirm>
                            </div>
                        ),
                    },
                ]}
            />

            <Modal
                open={open}
                title={editing ? "Заал засах" : "Шинэ заал"}
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
                    <Form.Item name="address" label="Хаяг">
                        <Input />
                    </Form.Item>
                    <Form.Item name="courts" label="Талбайн тоо">
                        <InputNumber min={1} max={20} style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item name="contactphone" label="Утас">
                        <Input />
                    </Form.Item>
                    <Form.Item name="notes" label="Тэмдэглэл">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                </Form>
            </Modal>
        </AppShell>
    );
}
