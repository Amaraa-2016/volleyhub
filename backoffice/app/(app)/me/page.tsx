"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { LogOut } from "lucide-react";
import { TopBar, Field, useToast, useData } from "@/app/components/ui";
import type { Settings } from "@/app/types/api";
import SkillsEditor from "@/app/components/SkillsEditor";
import { ThemePicker } from "@/app/components/Theme";
import { AccountAPI, API } from "@/app/utils/API";
import { initials } from "@/app/utils/format";

export default function MePage() {
    const { data: session, update } = useSession();
    const toast = useToast();
    const [name, setName] = useState({ lastname: session?.lastname ?? "", firstname: session?.firstname ?? "" });
    const [pw, setPw] = useState({ oldpassword: "", newpassword: "" });
    const [busy, setBusy] = useState(false);
    const settings = useData<Settings>("/api/vh/backoffice/settings");
    const [org, setOrg] = useState({ tenantname: "", contactphone: "", bank_name: "", bank_account: "", bank_holder: "" });

    useEffect(() => {
        const s = settings.data;
        if (s) setOrg({
            tenantname: s.tenantname, contactphone: s.contactphone ?? "", bank_name: s.bank_name ?? "",
            bank_account: s.bank_account ?? "", bank_holder: s.bank_holder ?? "",
        });
    }, [settings.data]);

    const saveOrg = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        const res = await API<Settings>("/api/vh/backoffice/settings", { method: "PUT", data: org });
        setBusy(false);
        if (res.error) return toast.fail(res.error);
        await update({ selectedTenantName: org.tenantname });
        toast.ok("Сургалтын мэдээлэл хадгалагдлаа");
    };

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
            <TopBar title="Тохиргоо" back="/home" />
            <main className="page">
                <div className="card pad" style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div className="avatar lg">{initials(session?.lastname, session?.firstname)}</div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 18 }}>{session?.name ?? session?.firstname}</div>
                        <div className="muted num">{session?.phone}</div>
                    </div>
                </div>

                <section className="section">
                    <div className="section-head"><h2>Харагдах байдал</h2></div>
                    <ThemePicker />
                </section>

                <form className="section" onSubmit={saveOrg}>
                    <div className="section-head"><h2>Сургалт</h2></div>
                    <div className="form-section">
                        <Field label="Сургалтын нэр"><input className="input" value={org.tenantname} onChange={(e) => setOrg({ ...org, tenantname: e.target.value })} required /></Field>
                        <Field label="Холбоо барих утас"><input className="input" inputMode="tel" value={org.contactphone} onChange={(e) => setOrg({ ...org, contactphone: e.target.value })} /></Field>
                    </div>
                    <div className="form-section">
                        <h4>Төлбөр хүлээн авах данс</h4>
                        <div className="grid-2">
                            <Field label="Банк"><input className="input" placeholder="Хаан банк" value={org.bank_name} onChange={(e) => setOrg({ ...org, bank_name: e.target.value })} /></Field>
                            <Field label="Дансны дугаар"><input className="input num" inputMode="numeric" value={org.bank_account} onChange={(e) => setOrg({ ...org, bank_account: e.target.value })} /></Field>
                        </div>
                        <Field label="Данс эзэмшигч" hint="Нэхэмжлэхийн SMS-д орно"><input className="input" value={org.bank_holder} onChange={(e) => setOrg({ ...org, bank_holder: e.target.value })} /></Field>
                    </div>
                    {settings.data && (
                        <p className={`alert ${settings.data.sms_enabled ? "tone-present" : "tone-sun"}`}>
                            {settings.data.sms_enabled
                                ? "SMS үйлчилгээ холбогдсон. Нэхэмжлэх эцэг эхийн утсанд очно."
                                : "SMS үйлчилгээ (gateway) хараахан тохируулагдаагүй. Серверийн appsettings-ийн Sms хэсгийг бөглөнө."}
                        </p>
                    )}
                    <button className="btn primary block" disabled={busy}>Хадгалах</button>
                </form>

                <section className="section" id="skills">
                    <div className="section-head"><h2>Үнэлгээний үзүүлэлт</h2></div>
                    <p className="caption" style={{ marginTop: 0 }}>Хүүхдийн ахицыг сар бүр эдгээрээр 1–5 оноогоор үнэлнэ.</p>
                    <SkillsEditor />
                </section>

                <form className="section" onSubmit={saveName}>
                    <div className="section-head"><h2>Миний нэр</h2></div>
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
