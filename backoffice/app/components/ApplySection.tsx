"use client";

import { App, Button, Card, Form, Input, Result, Skeleton, Tag } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { ImageUpload } from "@/app/components/ImageUpload";
import { AccountAPI, AccountAPIWithError, errorText } from "@/app/utils/API";
import type { TenantRequest } from "@/app/types/api";

interface ApplyValues {
    tenantname: string;
    logo?: string;
    contactphone?: string;
    address?: string;
    email?: string;
    tagline?: string;
}

// Applying to run a training centre, on the home page where someone actually is when they decide
// to. It needs an account - the application belongs to a person and the console it unlocks is
// theirs - so a visitor is sent to register first rather than being given a form that cannot be
// submitted.
export default function ApplySection() {
    const { data: session, status } = useSession();
    const { message } = App.useApp();
    const router = useRouter();
    const [requests, setRequests] = useState<TenantRequest[]>();
    const [busy, setBusy] = useState(false);
    const [form] = Form.useForm<ApplyValues>();

    const loadRequests = useCallback(async () => {
        if (status !== "authenticated") return;
        setRequests(await AccountAPI<TenantRequest[]>("/api/vh/account/tenant/request") ?? []);
    }, [status]);

    useEffect(() => { loadRequests(); }, [loadRequests]);

    const managed = (session?.tenants ?? []).filter((t) => t.status === "active");
    const pending = (requests ?? []).find((r) => r.status === "pending");

    const submit = async (values: ApplyValues) => {
        setBusy(true);
        const res = await AccountAPIWithError("/api/vh/account/tenant/request", { data: values });
        setBusy(false);

        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        form.resetFields();
        message.success("Хүсэлт илгээгдлээ");
        loadRequests();
    };

    return (
        <section className="site-section site-section--muted" id="apply">
            <div className="site-container">
                <div className="site-section__head">
                    <h2>Сургалтаа Volleyhub дээр бүртгүүлэх</h2>
                </div>

                <div style={{ display: "grid", gap: 24, gridTemplateColumns: "minmax(0,1fr) minmax(300px,1.1fr)" }}>
                    <div style={{ color: "#5b626d", lineHeight: 1.7 }}>
                        <p style={{ marginTop: 0 }}>
                            Волейболын сургалт явуулдаг бол хүсэлтээ илгээнэ үү. Платформын админ
                            баталгаажуулсны дараа танд <b>Удирдлага</b> хэсэг нээгдэж, дараах
                            боломжуудыг ашиглана:
                        </p>
                        <ul style={{ paddingLeft: 18 }}>
                            <li>Сургалтуудаа үнэ, хуваарь, байршилтай нь бүртгэж, сайтад гаргах</li>
                            <li>Багш нарын танилцуулгыг оруулах</li>
                            <li>Суралцагчдаа бүртгэж, ирц болон төлбөрийг хөтлөх</li>
                        </ul>
                    </div>

                    <div>
                        {status === "loading" ? (
                            <Card><Skeleton active /></Card>
                        ) : status !== "authenticated" ? (
                            <Card>
                                <p style={{ marginTop: 0 }}>
                                    Хүсэлт илгээхийн тулд эхлээд бүртгэлээ үүсгэнэ үү. Овог, нэр,
                                    утасны дугаар, нууц үг л хангалттай.
                                </p>
                                <div style={{ display: "flex", gap: 8 }}>
                                    <Link href="/register">
                                        <Button type="primary" size="large">Бүртгүүлэх</Button>
                                    </Link>
                                    <Link href="/login">
                                        <Button size="large">Нэвтрэх</Button>
                                    </Link>
                                </div>
                            </Card>
                        ) : managed.length > 0 ? (
                            <Card>
                                <Result
                                    status="success"
                                    title="Таны сургалт баталгаажсан"
                                    subTitle="Удирдлага хэсгээс сургалт, багш, суралцагчаа бүртгэнэ."
                                    extra={
                                        <Button
                                            type="primary"
                                            icon={<LayoutGrid size={15} />}
                                            onClick={() => router.push(
                                                session?.selectedTenantId ? "/manage/dashboard" : "/club",
                                            )}
                                        >
                                            Удирдлага руу орох
                                        </Button>
                                    }
                                />
                            </Card>
                        ) : pending ? (
                            <Card>
                                <Result
                                    status="info"
                                    title="Хүсэлт хүлээгдэж байна"
                                    subTitle={`${pending.tenantname} — платформын админ шалгаж байна. Баталгаажмагц Удирдлага хэсэг нээгдэнэ.`}
                                />
                            </Card>
                        ) : (
                            <Card title="Хүсэлтийн маягт">
                                <Form form={form} layout="vertical" onFinish={submit} requiredMark={false}>
                                    <Form.Item
                                        name="tenantname"
                                        label="Сургалтын төвийн нэр"
                                        rules={[{ required: true, message: "Нэр оруулна уу" }]}
                                    >
                                        <Input placeholder="Volley Zone" />
                                    </Form.Item>
                                    <Form.Item name="logo" label="Лого">
                                        {/* No centre exists yet, so this goes to the account-scoped
                                            upload and is copied over on approval. */}
                                        <ImageUpload scope="account" height={100} />
                                    </Form.Item>
                                    <Form.Item name="contactphone" label="Холбоо барих утас">
                                        <Input placeholder="99001122" />
                                    </Form.Item>
                                    <Form.Item name="address" label="Хаяг">
                                        <Input placeholder="Баянзүрх дүүрэг, 5-р хороо" />
                                    </Form.Item>
                                    <Form.Item name="email" label="И-мэйл">
                                        <Input placeholder="info@example.mn" />
                                    </Form.Item>
                                    <Form.Item name="tagline" label="Товч танилцуулга">
                                        <Input.TextArea
                                            rows={3}
                                            placeholder="8-16 насны хүүхдэд зориулсан волейболын сургалт"
                                        />
                                    </Form.Item>
                                    <Button type="primary" size="large" htmlType="submit" loading={busy} block>
                                        Хүсэлт илгээх
                                    </Button>
                                </Form>
                            </Card>
                        )}

                        {!!requests?.some((r) => r.status === "rejected") && !pending && managed.length === 0 && (
                            <div style={{ marginTop: 12 }}>
                                <Tag color="red">Өмнөх хүсэлт татгалзсан</Tag>
                                <span style={{ color: "#79808A", fontSize: 13 }}>
                                    {requests.find((r) => r.status === "rejected")?.note ?? "Дахин илгээх боломжтой."}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
