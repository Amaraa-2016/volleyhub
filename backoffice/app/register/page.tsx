"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Brand from "@/app/components/Brand";
import { Field } from "@/app/components/ui";
import { AccountAPI, errorText } from "@/app/utils/API";

// Registering is all it takes: the backend creates the training's workspace on the spot, and
// signing in straight after lands the coach on an empty home screen ready for their first class.
export default function RegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState({ tenantname: "", lastname: "", firstname: "", phone: "", password: "" });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm({ ...form, [k]: e.target.value });

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const res = await AccountAPI("/api/vh/account/register", {
            data: { ...form, phone: form.phone.trim() },
        });
        if (res.error) {
            setBusy(false);
            setError(errorText(res.error));
            return;
        }
        const login = await signIn("credentials", { phone: form.phone.trim(), password: form.password, redirect: false });
        setBusy(false);
        if (!login || login.error) {
            router.replace("/login");
            return;
        }
        router.replace("/home");
        router.refresh();
    };

    return (
        <main className="auth">
            <Brand sub="Шинэ бүртгэл" />
            <form onSubmit={submit}>
                <Field label="Сургалтын нэр" hint="Жишээ: Од волейболын сургалт">
                    <input className="input" autoComplete="organization" value={form.tenantname} onChange={set("tenantname")} required autoFocus />
                </Field>
                <div className="grid-2">
                    <Field label="Овог">
                        <input className="input" autoComplete="family-name" value={form.lastname} onChange={set("lastname")} required />
                    </Field>
                    <Field label="Нэр">
                        <input className="input" autoComplete="given-name" value={form.firstname} onChange={set("firstname")} required />
                    </Field>
                </div>
                <Field label="Утасны дугаар" hint="Нэвтрэхдээ энэ дугаарыг ашиглана">
                    <input className="input" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} required />
                </Field>
                <Field label="Нууц үг" hint="Хамгийн багадаа 6 тэмдэгт">
                    <input className="input" type="password" autoComplete="new-password" minLength={6} value={form.password} onChange={set("password")} required />
                </Field>
                {error && <p className="alert tone-absent" role="alert">{error}</p>}
                <button className="btn primary block" disabled={busy}>{busy ? "Бүртгэж байна…" : "Бүртгүүлэх"}</button>
                <p className="center muted" style={{ marginTop: 20 }}>
                    Бүртгэлтэй юу? <Link href="/login" style={{ color: "var(--brand)", fontWeight: 800 }}>Нэвтрэх</Link>
                </p>
            </form>
        </main>
    );
}
