"use client";

import { App, Button, Card, Form, Input, Spin } from "antd";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import AppShell from "@/app/components/AppShell";
import { ImageUpload } from "@/app/components/ImageUpload";
import { API, APIWithError, errorText } from "@/app/utils/API";
import type { TrainingProfile } from "@/app/types/api";

// The training centre's own details. Deliberately short: it holds what is actually used somewhere -
// the logo in the centre strip on the public site, and the phone a course page falls back to when
// the course itself lists none. Fields that fed the old organisation directory (publish switch,
// price range, age range, city, gallery) are left alone in the database but off this form, since
// the public site now lists courses and nothing reads them.
export default function ProfilePage() {
    const { data: session } = useSession();
    const { message } = App.useApp();
    const [profile, setProfile] = useState<TrainingProfile>();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    const role = session?.selectedRole ?? "";
    const canEdit = role === "owner" || role === "admin";

    useEffect(() => {
        API<TrainingProfile>("/api/vh/backoffice/profile")
            .then((p) => {
                setProfile(p);
                if (p) form.setFieldsValue(p);
            })
            .finally(() => setLoading(false));
    }, [form]);

    // Spread over the loaded profile rather than posting the form alone: the endpoint replaces the
    // whole profile, so anything this form omits would otherwise be blanked.
    const save = async () => {
        const values = await form.validateFields();
        setSaving(true);
        const res = await APIWithError("/api/vh/backoffice/profile", {
            method: "PUT",
            data: { ...profile, ...values },
        });
        setSaving(false);

        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        setProfile((prev) => ({ ...(prev as TrainingProfile), ...values }));
        message.success("Хадгаллаа");
    };

    return (
        <AppShell>
            <div className="page-header">
                <h1 className="page-title">Сургалтын төв</h1>
                {canEdit && (
                    <Button type="primary" loading={saving} onClick={save}>Хадгалах</Button>
                )}
            </div>

            {loading ? <Spin /> : (
                <Form form={form} layout="vertical" requiredMark={false} disabled={!canEdit}>
                    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
                        <Card title="Лого" style={{ width: 300 }}>
                            <Form.Item name="logo" style={{ marginBottom: 8 }}>
                                <ImageUpload height={140} />
                            </Form.Item>
                            <div style={{ color: "#79808A", fontSize: 12 }}>
                                Сайтын нүүр болон Сургалтууд хуудасны төвүүдийн эгнээнд харагдана.
                                Дарахад зөвхөн танай сургалтууд шүүгдэнэ.
                            </div>
                        </Card>

                        <Card title="Мэдээлэл" style={{ flex: 1, minWidth: 320, maxWidth: 640 }}>
                            <Form.Item label="Нэр" tooltip="Нэрийг платформын админ өөрчилнө">
                                <Input value={session?.selectedTenantName ?? ""} disabled />
                            </Form.Item>
                            <Form.Item name="tagline" label="Товч танилцуулга">
                                <Input placeholder="8-16 насны хүүхдийн волейболын сургалт" />
                            </Form.Item>
                            <Form.Item
                                name="contactphone"
                                label="Холбоо барих утас"
                                tooltip="Сургалт дээр утас оруулаагүй бол энэ дугаар харагдана"
                            >
                                <Input />
                            </Form.Item>
                            <Form.Item name="address" label="Хаяг">
                                <Input />
                            </Form.Item>
                            <Form.Item name="email" label="И-мэйл">
                                <Input />
                            </Form.Item>
                            <Form.Item name="description" label="Дэлгэрэнгүй танилцуулга" style={{ marginBottom: 0 }}>
                                <Input.TextArea rows={6} placeholder="Сургалтын чиглэл, түүх, амжилт..." />
                            </Form.Item>
                        </Card>
                    </div>
                </Form>
            )}
        </AppShell>
    );
}
