"use client";

import { Button, Form, Input, Typography, App } from "antd";
import { getSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Volleyball } from "lucide-react";
import Link from "next/link";
import Wordmark from "@/app/components/Wordmark";

function LoginForm() {
    const router = useRouter();
    const params = useSearchParams();
    const { message } = App.useApp();
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: { phone: string; password: string }) => {
        setLoading(true);
        const res = await signIn("credentials", { ...values, redirect: false });
        setLoading(false);

        if (!res?.ok) {
            message.error("Утасны дугаар эсвэл нууц үг буруу байна");
            return;
        }

        const callbackUrl = params.get("callbackUrl");
        if (callbackUrl) {
            router.push(callbackUrl);
            router.refresh();
            return;
        }

        // Most people signing in are here to browse, not to manage: land them on the site. Only
        // someone whose single centre was auto-selected at login goes straight to the console -
        // anyone else would just be bounced back out of it for having nothing selected.
        const current = await getSession();
        router.push(current?.selectedTenantId ? "/manage/dashboard" : "/");
        router.refresh();
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-brand">
                    <Volleyball size={24} color="#F26522" />
                    <Wordmark />
                </div>
                <Typography.Title level={4} style={{ marginTop: 0 }}>Нэвтрэх</Typography.Title>
                <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
                    <Form.Item
                        name="phone"
                        label="Утасны дугаар"
                        rules={[{ required: true, message: "Утасны дугаараа оруулна уу" }]}
                    >
                        <Input size="large" placeholder="99001122" autoComplete="tel" />
                    </Form.Item>
                    <Form.Item
                        name="password"
                        label="Нууц үг"
                        rules={[{ required: true, message: "Нууц үгээ оруулна уу" }]}
                    >
                        <Input.Password size="large" autoComplete="current-password" />
                    </Form.Item>
                    <Button type="primary" size="large" htmlType="submit" loading={loading} block>
                        Нэвтрэх
                    </Button>
                </Form>
                <div style={{ marginTop: 16, textAlign: "center" }}>
                    Бүртгэл байхгүй юу? <Link href="/register">Бүртгүүлэх</Link>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    // useSearchParams needs a Suspense boundary under the app router.
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}
