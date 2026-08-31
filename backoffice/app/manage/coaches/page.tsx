"use client";

import { App, Button, Form, Input, InputNumber, Modal, Popconfirm, Switch, Table, Tag } from "antd";
import { useCallback, useEffect, useState } from "react";
import { Plus, UserRound } from "lucide-react";
import AppShell from "@/app/components/AppShell";
import { ImageUpload } from "@/app/components/ImageUpload";
import { API, APIWithError, errorText } from "@/app/utils/API";
import type { Coach } from "@/app/types/api";

// Coaches are profiles, not logins: a photo, a title and a biography that the public course page
// shows. Someone who also needs to sign in gets that separately, through club membership.
export default function CoachesPage() {
    const { message } = App.useApp();
    const [rows, setRows] = useState<Coach[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Coach | null>(null);
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        setRows(await API<Coach[]>("/api/vh/backoffice/coaches?includeInactive=true") ?? []);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const openForm = (coach: Coach | null) => {
        setEditing(coach);
        form.resetFields();
        form.setFieldsValue(coach ?? { isactive: true, sort_order: 0 });
        setOpen(true);
    };

    const save = async () => {
        const values = await form.validateFields();
        const res = await APIWithError("/api/vh/backoffice/coaches", {
            data: { ...values, coachid: editing?.coachid ?? 0 },
        });

        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        setOpen(false);
        message.success("Хадгаллаа");
        load();
    };

    const remove = async (coachid: number) => {
        const res = await APIWithError(`/api/vh/backoffice/coaches/${coachid}`, { method: "DELETE" });
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
                <h1 className="page-title">Багш</h1>
                <Button type="primary" icon={<Plus size={16} />} onClick={() => openForm(null)}>
                    Багш нэмэх
                </Button>
            </div>

            <Table
                rowKey="coachid"
                loading={loading}
                dataSource={rows}
                scroll={{ x: 900 }}
                columns={[
                    {
                        title: "Багш",
                        render: (_: unknown, c: Coach) => (
                            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                {c.photo ? (
                                    <img
                                        src={c.photo}
                                        alt=""
                                        style={{ width: 44, height: 44, objectFit: "cover", borderRadius: "50%" }}
                                    />
                                ) : (
                                    <div
                                        style={{
                                            width: 44, height: 44, borderRadius: "50%", background: "#eceef1",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            color: "#9AA3B0",
                                        }}
                                    >
                                        <UserRound size={20} />
                                    </div>
                                )}
                                <div>
                                    <div style={{ fontWeight: 600 }}>
                                        {`${c.last_name} ${c.first_name}`.trim()}
                                    </div>
                                    <div style={{ color: "#79808A", fontSize: 12 }}>{c.position ?? "-"}</div>
                                </div>
                            </div>
                        ),
                    },
                    { title: "Цол зэрэг", dataIndex: "rank", width: 200, render: (v?: string) => v ?? "-" },
                    { title: "Утас", dataIndex: "phone", width: 130, render: (v?: string) => v ?? "-" },
                    {
                        title: "Сургалт",
                        dataIndex: "coursecount",
                        width: 100,
                        render: (n: number) => (n > 0 ? `${n} сургалт` : "-"),
                    },
                    {
                        title: "Төлөв",
                        width: 110,
                        render: (_: unknown, c: Coach) =>
                            c.isactive ? <Tag color="green">Идэвхтэй</Tag> : <Tag>Идэвхгүй</Tag>,
                    },
                    {
                        title: "",
                        width: 150,
                        render: (_: unknown, c: Coach) => (
                            <div style={{ display: "flex", gap: 8 }}>
                                <Button size="small" onClick={() => openForm(c)}>Засах</Button>
                                <Popconfirm
                                    title="Устгах уу?"
                                    description={c.coursecount > 0
                                        ? `${c.coursecount} сургалтаас хасагдана`
                                        : undefined}
                                    onConfirm={() => remove(c.coachid)}
                                >
                                    <Button size="small" danger>Устгах</Button>
                                </Popconfirm>
                            </div>
                        ),
                    },
                ]}
            />

            <Modal
                open={open}
                title={editing ? "Багшийн мэдээлэл засах" : "Шинэ багш"}
                onCancel={() => setOpen(false)}
                onOk={save}
                okText="Хадгалах"
                cancelText="Болих"
                width={620}
                destroyOnHidden
            >
                <Form form={form} layout="vertical" requiredMark={false}>
                    <Form.Item name="photo" label="Зураг">
                        <ImageUpload height={150} />
                    </Form.Item>
                    <Form.Item name="last_name" label="Овог">
                        <Input />
                    </Form.Item>
                    <Form.Item name="first_name" label="Нэр" rules={[{ required: true, message: "Нэр оруулна уу" }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="position" label="Албан тушаал">
                        <Input placeholder="Ахлах дасгалжуулагч" />
                    </Form.Item>
                    <Form.Item name="rank" label="Цол зэрэг">
                        <Input placeholder="Спортын мастер, Олон улсын хэмжээний мастер" />
                    </Form.Item>
                    <Form.Item name="bio" label="Танилцуулга" tooltip="Сургалтын нээлттэй хуудсанд харагдана">
                        <Input.TextArea rows={6} placeholder="Туршлага, амжилт, боловсрол..." />
                    </Form.Item>
                    <Form.Item name="phone" label="Утасны дугаар" tooltip="Зөвхөн дотоод бүртгэлд, сайтад харагдахгүй">
                        <Input />
                    </Form.Item>
                    <Form.Item name="sort_order" label="Эрэмбэ" tooltip="Бага тоо нь эхэнд харагдана">
                        <InputNumber min={0} style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item name="isactive" label="Идэвхтэй" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </AppShell>
    );
}
