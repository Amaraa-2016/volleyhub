"use client";

import { Typography } from "antd";
import { getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Volleyball } from "lucide-react";
import Link from "next/link";
import { LoginFields } from "@/app/components/AuthForms";
import Wordmark from "@/app/components/Wordmark";

// Signing in from the site itself happens in a dialog. This page is what middleware redirects to
// when a signed-out visitor asks for a protected route, so it still has to exist - and it is the
// one place that knows where to send them afterwards.
function Login() {
    const router = useRouter();
    const params = useSearchParams();

    const onSuccess = async () => {
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
                <LoginFields onSuccess={onSuccess} />
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
            <Login />
        </Suspense>
    );
}
