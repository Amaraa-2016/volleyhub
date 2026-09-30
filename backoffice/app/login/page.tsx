"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Brand from "@/app/components/Brand";
import { Field } from "@/app/components/ui";

function LoginForm() {
    const router = useRouter();
    const params = useSearchParams();
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const res = await signIn("credentials", { phone: phone.trim(), password, redirect: false });
        setBusy(false);
        if (!res || res.error) {
            setError("Утасны дугаар эсвэл нууц үг буруу байна");
            return;
        }
        router.replace(params.get("callbackUrl") || "/home");
        router.refresh();
    };

    return (
        <form onSubmit={submit}>
            <Field label="Утасны дугаар">
                <input className="input" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </Field>
            <Field label="Нууц үг">
                <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
            {error && <p className="alert tone-absent" role="alert">{error}</p>}
            <button className="btn primary block" disabled={busy}>{busy ? "Нэвтэрч байна…" : "Нэвтрэх"}</button>
            <p className="center muted" style={{ marginTop: 20 }}>
                Бүртгэлгүй юу? <Link href="/register" style={{ color: "var(--brand)", fontWeight: 800 }}>Бүртгүүлэх</Link>
            </p>
        </form>
    );
}

export default function LoginPage() {
    return (
        <main className="auth">
            <Brand />
            <Suspense>
                <LoginForm />
            </Suspense>
        </main>
    );
}
