"use client";

import { App, Button, Card, Form, Input, Skeleton, Tag } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import dayjs from "dayjs";
import { LayoutGrid } from "lucide-react";
import SiteShell from "@/app/components/SiteShell";
import { ImageUpload } from "@/app/components/ImageUpload";
import { AccountAPI, AccountAPIWithError, errorText } from "@/app/utils/API";
import { ROLES, type AccountProfile, type TenantRequest } from "@/app/types/api";

interface ProfileValues {
    lastname?: string;
    firstname?: string;
    photo?: string;
}

// The signed-in person's own account: their photo and name, their password, and the state of
// whatever they have applied for. Lives on the public site rather than in the console, because
// someone with no centre still has an account - and that is exactly who needs this page.
export default function ProfilePage() {
    const router = useRouter();
    const { data: session, update } = useSession();
    const { message } = App.useApp();
    const [account, setAccount] = useState<AccountProfile>();
    const [requests, setRequests] = useState<TenantRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [changing, setChanging] = useState(false);
    const [form] = Form.useForm<ProfileValues>();
    const [passwordForm] = Form.useForm();

    const load = useCallback(async () => {
        const [me, reqs] = await Promise.all([
            AccountAPI<AccountProfile>("/api/vh/account/me"),
            AccountAPI<TenantRequest[]>("/api/vh/account/tenant/request"),
        ]);
        setAccount(me);
        setRequests(reqs ?? []);
        if (me) {
            form.setFieldsValue({ lastname: me.lastname ?? "", firstname: me.firstname ?? "", photo: me.photo ?? undefined });
        }
        setLoading(false);
    }, [form]);

    useEffect(() => { load(); }, [load]);

    const save = async () => {
        const values = await form.validateFields();
        setSaving(true);
        const res = await AccountAPIWithError<{ name?: string }>("/api/vh/account/me", {
            method: "PUT",
            data: values,
        });
        setSaving(false);

        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        // Push the new values into the session so the header avatar and name change immediately,
        // rather than only after the next sign-in.
        await update({
            photo: values.photo ?? null,
            lastname: values.lastname ?? null,
            firstname: values.firstname ?? null,
            name: res.data?.name ?? [values.lastname, values.firstname].filter(Boolean).join(" "),
        });
        message.success("Хадгаллаа");
    };

    const changePassword = async () => {
        const values = await passwordForm.validateFields();
        setChanging(true);
        const res = await AccountAPIWithError("/api/vh/account/password", { data: values });
        setChanging(false);

        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        passwordForm.resetFields();
        message.success("Нууц үг солигдлоо");
    };

    const managed = (account?.tenants ?? []).filter((t) => t.status === "active");

    return (
        <SiteShell>
            <section className="site-detail-hero">
                <div className="site-container">
                    <h1>Профайл</h1>
                    <p style={{ margin: 0, color: "#9AA3B0" }}>{account?.phone ?? session?.phone}</p>
                </div>
            </section>

            <section className="site-section">
                <div className="site-container">
                    {loading ? <Skeleton active /> : (
                        <div style={{ display: "grid", gap: 24, gridTemplateColumns: "minmax(0,1fr) minmax(280px,1fr)" }}>
                            <div>
                                <Card
                                    title="Миний мэдээлэл"
                                    extra={<Button type="primary" loading={saving} onClick={save}>Хадгалах</Button>}
                                >
                                    <Form form={form} layout="vertical" requiredMark={false}>
                                        <Form.Item name="photo" label="Зураг">
                                            <ImageUpload scope="account" height={120} />
                                        </Form.Item>
                                        <Form.Item name="lastname" label="Овог">
                                            <Input />
                                        </Form.Item>
                                        <Form.Item name="firstname" label="Нэр">
                                            <Input />
                                        </Form.Item>
                                        <Form.Item
                                            label="Утасны дугаар"
                                            tooltip="Дугаар нь нэвтрэх нэр тул өөрчлөгдөхгүй"
                                        >
                                            <Input value={account?.phone ?? ""} disabled />
                                        </Form.Item>
                                    </Form>
                                </Card>

                                <Card title="Нууц үг солих" style={{ marginTop: 20 }}>
                                    <Form form={passwordForm} layout="vertical" requiredMark={false} onFinish={changePassword}>
                                        <Form.Item
                                            name="oldpassword"
                                            label="Одоогийн нууц үг"
                                            rules={[{ required: true, message: "Одоогийн нууц үгээ оруулна уу" }]}
                                        >
                                            <Input.Password autoComplete="current-password" />
                                        </Form.Item>
                                        <Form.Item
                                            name="newpassword"
                                            label="Шинэ нууц үг"
                                            rules={[{ required: true, min: 6, message: "Хамгийн багадаа 6 тэмдэгт" }]}
                                        >
                                            <Input.Password autoComplete="new-password" />
                                        </Form.Item>
                                        <Button htmlType="submit" loading={changing}>Солих</Button>
                                    </Form>
                                </Card>
                            </div>

                            <div>
                                <Card title="Миний сургалтын төв">
                                    {managed.length > 0 ? (
                                        <>
                                            {managed.map((t) => (
                                                <div
                                                    key={t.tenantid}
                                                    style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}
                                                >
                                                    <span style={{ fontWeight: 600 }}>{t.tenantname}</span>
                                                    <Tag>{ROLES[t.role] ?? t.role}</Tag>
                                                </div>
                                            ))}
                                            <Button
                                                type="primary"
                                                block
                                                icon={<LayoutGrid size={15} />}
                                                style={{ marginTop: 12 }}
                                                onClick={() => router.push(
                                                    session?.selectedTenantId ? "/manage/dashboard" : "/club",
                                                )}
                                            >
                                                Удирдлага руу орох
                                            </Button>
                                        </>
                                    ) : (
                                        <div style={{ color: "#79808A" }}>
                                            Танд баталгаажсан сургалтын төв алга байна.
                                        </div>
                                    )}
                                </Card>

                                {requests.length > 0 && (
                                    <Card title="Миний хүсэлтүүд" style={{ marginTop: 20 }}>
                                        {requests.map((r) => (
                                            <div key={r.tenantrequestid} style={{ padding: "8px 0" }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                                    <span style={{ fontWeight: 600 }}>{r.tenantname}</span>
                                                    <Tag color={r.status === "approved" ? "green" : r.status === "rejected" ? "red" : "orange"}>
                                                        {r.status === "approved" ? "Батлагдсан"
                                                            : r.status === "rejected" ? "Татгалзсан" : "Хүлээгдэж буй"}
                                                    </Tag>
                                                </div>
                                                <div style={{ color: "#79808A", fontSize: 13 }}>
                                                    {dayjs(r.created).format("YYYY/MM/DD")}
                                                    {r.note ? ` · ${r.note}` : ""}
                                                </div>
                                            </div>
                                        ))}
                                    </Card>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </SiteShell>
    );
}
