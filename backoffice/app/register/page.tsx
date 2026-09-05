"use client";

import { Typography } from "antd";
import { useRouter } from "next/navigation";
import { Volleyball } from "lucide-react";
import Link from "next/link";
import { RegisterFields } from "@/app/components/AuthForms";
import Wordmark from "@/app/components/Wordmark";

// Registering from the site itself happens in a dialog; this page stays for direct links and for
// anyone sent here from the sign-in page.
export default function RegisterPage() {
    const router = useRouter();

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-brand">
                    <Volleyball size={24} color="#F26522" />
                    <Wordmark />
                </div>
                <Typography.Title level={4} style={{ marginTop: 0 }}>Бүртгүүлэх</Typography.Title>
                <RegisterFields
                    onSuccess={() => {
                        // A new account belongs to no centre yet: the home page is where they can apply.
                        router.push("/");
                        router.refresh();
                    }}
                />
                <div style={{ marginTop: 16, textAlign: "center" }}>
                    Бүртгэлтэй юу? <Link href="/login">Нэвтрэх</Link>
                </div>
            </div>
        </div>
    );
}
