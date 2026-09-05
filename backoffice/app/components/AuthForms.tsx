"use client";

import { App, Button, Form, Input } from "antd";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { AccountAPIWithError, errorText } from "@/app/utils/API";

// The two account forms, without any page or dialog chrome around them: they are shown both in
// [AuthModal] over whatever page the visitor is on and on the standalone /login and /register
// pages that middleware redirects to. Where to go afterwards differs between the two, so that is
// the caller's to decide - these only report success.

export function LoginFields({ onSuccess }: { onSuccess: () => void }) {
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
        onSuccess();
    };

    return (
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
    );
}

interface RegisterValues {
    lastname?: string;
    firstname: string;
    phone: string;
    password: string;
}

export function RegisterFields({ onSuccess }: { onSuccess: () => void }) {
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
            message.error("Бүртгэл үүслээ. Нэвтэрнэ үү");
            return;
        }
        onSuccess();
    };

    return (
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
    );
}
