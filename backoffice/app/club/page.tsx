"use client";

import { App, Button, List, Skeleton, Typography } from "antd";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Volleyball } from "lucide-react";
import { AccountAPIWithError, errorText } from "@/app/utils/API";
import Wordmark from "@/app/components/Wordmark";
import { ROLES } from "@/app/types/api";

interface SwitchResult {
    tenantid: number;
    tenantname: string;
    role: string;
    token: string;
}

// Nothing but a picker, for the one case that needs one: an account that runs more than one
// training centre and has not chosen which to manage. Applying and joining live on the public site
// now, so this page no longer asks anyone what they came here to do.
export default function ClubPage() {
    const router = useRouter();
    const { data: session, status, update } = useSession();
    const { message } = App.useApp();
    const [busy, setBusy] = useState(false);

    const active = (session?.tenants ?? []).filter((m) => m.status === "active");

    // With nothing to pick there is nothing to show: send them back to the site, where the header
    // and the apply dialog cover everything they can actually do.
    useEffect(() => {
        if (status === "authenticated" && active.length === 0) router.replace("/");
    }, [status, active.length, router]);

    const select = async (tenantid: number) => {
        setBusy(true);
        const res = await AccountAPIWithError<SwitchResult>("/api/vh/account/switch", { data: { tenantid } });
        setBusy(false);

        if (res.error || !res.data) {
            message.error(errorText(res.error));
            return;
        }
        // The per-centre token lives in the session, so the proxy can pair it with the tenantid.
        await update({
            selectedTenantId: String(res.data.tenantid),
            selectedTenantName: res.data.tenantname,
            selectedRole: res.data.role,
            accessToken: res.data.token,
        });
        router.push("/manage/dashboard");
        router.refresh();
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-brand">
                    <Volleyball size={24} color="#F26522" />
                    <Wordmark />
                </div>

                <Typography.Title level={5} style={{ marginTop: 0 }}>Сургалтын төв сонгох</Typography.Title>

                {status === "loading" || active.length === 0 ? (
                    <Skeleton active />
                ) : (
                    <List
                        bordered
                        dataSource={active}
                        renderItem={(m) => (
                            <List.Item
                                actions={[
                                    <Button key="go" type="primary" loading={busy} onClick={() => select(m.tenantid)}>
                                        Сонгох
                                    </Button>,
                                ]}
                            >
                                <List.Item.Meta title={m.tenantname} description={ROLES[m.role] ?? m.role} />
                            </List.Item>
                        )}
                    />
                )}

                <div style={{ marginTop: 20, textAlign: "center" }}>
                    <Button type="link" onClick={() => router.push("/")}>Нүүр хуудас</Button>
                </div>
            </div>
        </div>
    );
}
