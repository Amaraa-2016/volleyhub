"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { LogOut } from "lucide-react";
import { TopBar, Field, useToast } from "@/app/components/ui";
import { AccountAPI } from "@/app/utils/API";
import { initials } from "@/app/utils/format";

export default function MePage() {
    const { data: session, update } = useSession();
    const toast = useToast();
    const [name, setName] = useState({ lastname: session?.lastname ?? "", firstname: session?.firstname ?? "" });
    const [pw, setPw] = useState({ oldpassword: "", newpassword: "" });
    const [busy, setBusy] = useState(false);

    const saveName = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        const res = await AccountAPI<{ name?: string }>("/api/vh/account/me", { method: "PUT", data: { ...name, photo: session?.photo } });
        setBusy(false);
        if (res.error) return toast.fail(res.error);
        await update({ ...name, name: res.data?.name ?? null });
        toast.ok("Хадгаллаа");
    };

    const savePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        const res = await AccountAPI("/api/vh/account/password", { data: pw });
        setBusy(false);
        if (res.error) return toast.fail(res.error);
        setPw({ oldpassword: "", newpassword: "" });
        toast.ok("Нууц үг солигдлоо");
    };

    return (
        <>
            <TopBar title="Миний бүртгэл" back="/home" />
            <main className="page">
                <div className="card pad" style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div className="avatar lg">{initials(session?.lastname, session?.firstname)}</div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 18 }}>{session?.name ?? session?.firstname}</div>
                        <div className="muted num">{session?.phone}</div>
                    </div>
                </div>

                <form className="section" onSubmit={saveName}>
                    <div className="section-head"><h2>Нэр</h2></div>
                    <div className="grid-2">
                        <Field label="Овог"><input className="input" value={name.lastname} onChange={(e) => setName({ ...name, lastname: e.target.value })} /></Field>
                        <Field label="Нэр"><input className="input" value={name.firstname} onChange={(e) => setName({ ...name, firstname: e.target.value })} required /></Field>
                    </div>
                    <button className="btn block" disabled={busy}>Хадгалах</button>
                </form>

                <form className="section" onSubmit={savePassword}>
                    <div className="section-head"><h2>Нууц үг солих</h2></div>
                    <Field label="Одоогийн нууц үг"><input className="input" type="password" autoComplete="current-password" value={pw.oldpassword} onChange={(e) => setPw({ ...pw, oldpassword: e.target.value })} required /></Field>
                    <Field label="Шинэ нууц үг" hint="Хамгийн багадаа 6 тэмдэгт"><input className="input" type="password" autoComplete="new-password" minLength={6} value={pw.newpassword} onChange={(e) => setPw({ ...pw, newpassword: e.target.value })} required /></Field>
                    <button className="btn block" disabled={busy}>Солих</button>
                </form>

                <div className="section">
                    <button className="btn block danger" onClick={() => signOut({ callbackUrl: "/login" })}>
                        <LogOut size={18} /> Гарах
                    </button>
                </div>
            </main>
        </>
    );
}
