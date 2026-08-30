"use client";

import { App, Button, Card, Form, Input, InputNumber, Spin, Switch } from "antd";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ExternalLink } from "lucide-react";
import AppShell from "@/app/components/AppShell";
import { API, APIWithError, errorText } from "@/app/utils/API";
import type { TrainingProfile } from "@/app/types/api";

// What the public directory shows about this centre. Approval creates the centre; publishing is the
// owner's own decision, which is why is_published lives here rather than on the platform console.
export default function ProfilePage() {
    const { data: session } = useSession();
    const { message } = App.useApp();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [published, setPublished] = useState(false);
    const [form] = Form.useForm<TrainingProfile>();

    useEffect(() => {
        API<TrainingProfile>("/api/vh/backoffice/profile")
            .then((p) => {
                if (p) {
                    form.setFieldsValue(p);
                    setPublished(p.is_published);
                }
            })
            .finally(() => setLoading(false));
    }, [form]);

    const save = async () => {
        const values = await form.validateFields();
        setSaving(true);
        const res = await APIWithError<{ is_published: boolean }>("/api/vh/backoffice/profile", {
            method: "PUT",
            data: values,
        });
        setSaving(false);

        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        setPublished(res.data?.is_published ?? false);
        message.success("Хадгаллаа");
    };

    return (
        <AppShell>
            <div className="page-header">
                <h1 className="page-title">Нээлттэй хуудас</h1>
                <div style={{ display: "flex", gap: 8 }}>
                    {published && session?.selectedTenantId && (
                        <Link href={`/trainings/${session.selectedTenantId}`} target="_blank">
                            <Button icon={<ExternalLink size={15} />}>Хуудсыг харах</Button>
                        </Link>
                    )}
                    <Button type="primary" loading={saving} onClick={save}>Хадгалах</Button>
                </div>
            </div>

            {loading ? <Spin /> : (
                <Form form={form} layout="vertical" requiredMark={false} style={{ maxWidth: 760 }}>
                    <Card title="Танилцуулга" style={{ marginBottom: 16 }}>
                        <Form.Item
                            name="is_published"
                            label="Сайт дээр нийтлэх"
                            valuePropName="checked"
                            tooltip="Унтраасан үед таны сургалт нийтийн жагсаалтад харагдахгүй"
                        >
                            <Switch />
                        </Form.Item>
                        <Form.Item name="tagline" label="Товч танилцуулга" tooltip="Жагсаалтад нэрийн доор харагдана">
                            <Input placeholder="8-16 насны хүүхдийн волейболын сургалт" />
                        </Form.Item>
                        <Form.Item name="description" label="Дэлгэрэнгүй">
                            <Input.TextArea rows={8} placeholder="Сургалтын чиглэл, дасгалжуулагчид, туршлага..." />
                        </Form.Item>
                    </Card>

                    <Card title="Байршил, холбоо барих" style={{ marginBottom: 16 }}>
                        <Form.Item name="city" label="Хот / аймаг">
                            <Input placeholder="Улаанбаатар" />
                        </Form.Item>
                        <Form.Item name="district" label="Дүүрэг / сум">
                            <Input placeholder="Баянзүрх" />
                        </Form.Item>
                        <Form.Item name="address" label="Дэлгэрэнгүй хаяг">
                            <Input />
                        </Form.Item>
                        <Form.Item name="contactphone" label="Утас">
                            <Input />
                        </Form.Item>
                        <Form.Item name="email" label="И-мэйл">
                            <Input />
                        </Form.Item>
                        <Form.Item name="website" label="Вэб хуудас">
                            <Input placeholder="https://" />
                        </Form.Item>
                        <Form.Item name="facebook" label="Facebook">
                            <Input placeholder="https://facebook.com/..." />
                        </Form.Item>
                        <Form.Item name="instagram" label="Instagram">
                            <Input placeholder="https://instagram.com/..." />
                        </Form.Item>
                    </Card>

                    <Card title="Хамрах хүрээ, үнэ" style={{ marginBottom: 16 }}>
                        <Form.Item
                            name="price_from"
                            label="Хамгийн бага сарын төлбөр (₮)"
                            tooltip="Жагсаалтад ийм үнээс эхлэн гэж харагдана"
                        >
                            <InputNumber min={0} step={10000} style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item name="age_from" label="Хамгийн бага нас">
                            <InputNumber min={3} max={60} style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item name="age_to" label="Хамгийн их нас">
                            <InputNumber min={3} max={80} style={{ width: "100%" }} />
                        </Form.Item>
                    </Card>

                    <Card title="Зураг">
                        <Form.Item name="logo" label="Лого (URL)">
                            <Input placeholder="https://..." />
                        </Form.Item>
                        <Form.Item name="cover" label="Ковер зураг (URL)">
                            <Input placeholder="https://..." />
                        </Form.Item>
                        <Form.Item
                            name="photos"
                            label="Бусад зураг"
                            tooltip="Олон зургийг таслалаар тусгаарлана"
                        >
                            <Input.TextArea rows={3} placeholder="https://..., https://..." />
                        </Form.Item>
                    </Card>
                </Form>
            )}
        </AppShell>
    );
}
