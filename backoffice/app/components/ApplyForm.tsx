"use client";

import { App, Button, Form, Input, Result, Skeleton } from "antd";
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

// Applying to run a training centre. What it shows depends on where the person already is - no
// account, an application in flight, or an approved centre - so nobody is handed a form that cannot
// be submitted or would duplicate what they already sent.
//
// It lives apart from the page and the dialog that show it, because it appears in both: as a
// section on the home page and inside [ApplyModal] for the buttons in the header and the hero.
export default function ApplyForm({
    // Set to false while the form is out of sight, so a dialog that is never opened never fetches.
    active = true,
    // Given by the dialog, which has somewhere to close to; the page section has not.
    onDone,
}: {
    active?: boolean;
    onDone?: () => void;
}) {
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

    useEffect(() => { if (active) loadRequests(); }, [active, loadRequests]);

    const managed = (session?.tenants ?? []).filter((t) => t.status === "active");
    const pending = (requests ?? []).find((r) => r.status === "pending");
    const rejected = (requests ?? []).find((r) => r.status === "rejected");

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

    const goToConsole = () => {
        onDone?.();
        router.push(session?.selectedTenantId ? "/manage/dashboard" : "/club");
    };

    if (status === "loading") return <Skeleton active />;

    if (status !== "authenticated") {
        return (
            <Result
                status="info"
                title="Эхлээд бүртгэлээ үүсгэнэ үү"
                subTitle="Овог, нэр, утасны дугаар, нууц үг л хангалттай. Хүсэлт таны бүртгэлд холбогдоно."
                extra={[
                    <Link key="register" href="/register">
                        <Button type="primary" size="large">Бүртгүүлэх</Button>
                    </Link>,
                    <Link key="login" href="/login">
                        <Button size="large">Нэвтрэх</Button>
                    </Link>,
                ]}
            />
        );
    }

    if (managed.length > 0) {
        return (
            <Result
                status="success"
                title="Таны сургалт баталгаажсан"
                subTitle="Удирдлага хэсгээс сургалт, багш, суралцагчаа бүртгэнэ."
                extra={
                    <Button type="primary" icon={<LayoutGrid size={15} />} onClick={goToConsole}>
                        Удирдлага руу орох
                    </Button>
                }
            />
        );
    }

    if (pending) {
        return (
            <Result
                status="info"
                title="Хүсэлт хүлээгдэж байна"
                subTitle={`${pending.tenantname} — платформын админ шалгаж байна. Баталгаажмагц Удирдлага хэсэг нээгдэнэ.`}
                extra={onDone ? <Button onClick={onDone}>Хаах</Button> : undefined}
            />
        );
    }

    return (
        <>
            {!!rejected && (
                <div className="apply-rejected">
                    Өмнөх хүсэлт татгалзсан
                    {rejected.note ? `: ${rejected.note}` : "."} Дахин илгээх боломжтой.
                </div>
            )}

            <Form form={form} layout="vertical" onFinish={submit} requiredMark={false}>
                <Form.Item
                    name="tenantname"
                    label="Сургалтын төвийн нэр"
                    rules={[{ required: true, message: "Нэр оруулна уу" }]}
                >
                    <Input size="large" placeholder="Volley Zone" />
                </Form.Item>
                <Form.Item name="logo" label="Лого">
                    {/* No centre exists yet, so this goes to the account-scoped upload and is
                        copied over when the application is approved. */}
                    <ImageUpload scope="account" height={100} />
                </Form.Item>
                <div className="apply-row">
                    <Form.Item name="contactphone" label="Холбоо барих утас">
                        <Input size="large" placeholder="99001122" />
                    </Form.Item>
                    <Form.Item name="email" label="И-мэйл">
                        <Input size="large" placeholder="info@example.mn" />
                    </Form.Item>
                </div>
                <Form.Item name="address" label="Хаяг">
                    <Input size="large" placeholder="Баянзүрх дүүрэг, 5-р хороо" />
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
        </>
    );
}
