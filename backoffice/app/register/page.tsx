"use client";

import { Button, Form, Input, Typography, App } from "antd";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Volleyball } from "lucide-react";
import Link from "next/link";
import { AccountAPIWithError, errorText } from "@/app/utils/API";
import Wordmark from "@/app/components/Wordmark";

interface RegisterValues {
    lastname?: string;
    firstname: string;
    phone: string;
    password: string;
}

export default function RegisterPage() {
    const router = useRouter();
    const { message } = App.useApp();
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: RegisterValues) => {
        setLoading(true);
        const res = await AccountAPIWithError("/api/vh/account/register", { data: values });

        if (res.error) {
            setLoading(false);
            message.error(errorText(res.error));
            return;
        }

        // Registration returns a token, but the session is owned by NextAuth - so sign in with the
        // same credentials rather than trying to inject the token by hand.
        const login = await signIn("credentials", {
            phone: values.phone,
            password: values.password,
            redirect: false,
        });
        setLoading(false);

        if (!login?.ok) {
            message.success("Бүртгэл үүслээ. Нэвтэрнэ үү");
            router.push("/login");
            return;
        }
        // A new account belongs to no centre yet: the home page is where they can apply.
        router.push("/");
        router.refresh();
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-brand">
                    <Volleyball size={24} color="#F26522" />
                    <Wordmark />
                </div>
                <Typography.Title level={4} style={{ marginTop: 0 }}>Бүртгүүлэх</Typography.Title>
                <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
                    <Form.Item name="lastname" label="Овог">
                        <Input size="large" />
                    </Form.Item>
                    <Form.Item
                        name="firstname"
                        label="Нэр"
                        rules={[{ required: true, message: "Нэрээ оруулна уу" }]}
                    >
                        <Input size="large" />
                    </Form.Item>
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
                        rules={[{ required: true, min: 6, message: "Хамгийн багадаа 6 тэмдэгт" }]}
                    >
                        <Input.Password size="large" autoComplete="new-password" />
                    </Form.Item>
                    <Button type="primary" size="large" htmlType="submit" loading={loading} block>
                        Бүртгүүлэх
                    </Button>
                </Form>
                <div style={{ marginTop: 16, textAlign: "center" }}>
                    Бүртгэлтэй юу? <Link href="/login">Нэвтрэх</Link>
                </div>
            </div>
        </div>
    );
}
