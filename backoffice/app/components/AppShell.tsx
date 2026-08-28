"use client";

import { Layout, Menu, Dropdown, Avatar, Button } from "antd";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
    LayoutDashboard, Users, User, Trophy, CalendarDays, MapPin,
    Megaphone, UserCog, ShieldCheck, LogOut, Repeat, Volleyball,
} from "lucide-react";
import { useMemo } from "react";

const { Header, Sider, Content } = Layout;

// Chrome for every authenticated page. Kept as a component rather than a layout.tsx so the bare
// screens (login, register, club select) can opt out simply by not using it.
export default function AppShell({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { data: session } = useSession();

    const role = session?.selectedRole ?? "";
    const isManager = role === "owner" || role === "admin";

    const items = useMemo(() => {
        const base = [
            { key: "/dashboard", icon: <LayoutDashboard size={16} />, label: "Хяналтын самбар" },
            { key: "/teams", icon: <Users size={16} />, label: "Багууд" },
            { key: "/players", icon: <User size={16} />, label: "Тамирчид" },
            { key: "/tournaments", icon: <Trophy size={16} />, label: "Тэмцээн" },
            { key: "/matches", icon: <CalendarDays size={16} />, label: "Тоглолт" },
            { key: "/venues", icon: <MapPin size={16} />, label: "Заал" },
            { key: "/announcements", icon: <Megaphone size={16} />, label: "Мэдээ" },
        ];
        if (isManager) base.push({ key: "/members", icon: <UserCog size={16} />, label: "Гишүүд" });
        if (session?.isPlatformAdmin) {
            base.push({ key: "/admin", icon: <ShieldCheck size={16} />, label: "Платформ" });
        }
        return base;
    }, [isManager, session?.isPlatformAdmin]);

    // /teams/12 has to light up /teams, so match on the first path segment.
    const selected = "/" + (pathname?.split("/")[1] ?? "");

    return (
        <Layout style={{ minHeight: "100vh" }}>
            <Sider breakpoint="lg" collapsedWidth="0" width={220} style={{ background: "#141922" }}>
                <div
                    style={{
                        display: "flex", alignItems: "center", gap: 8, color: "#fff",
                        padding: "18px 20px", fontWeight: 700, fontSize: 17, letterSpacing: -0.3,
                    }}
                >
                    <Volleyball size={20} color="#F26522" />
                    Volleyhub
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    style={{ background: "transparent" }}
                    selectedKeys={[selected]}
                    items={items}
                    onClick={(e) => router.push(e.key)}
                />
            </Sider>
            <Layout>
                <Header
                    style={{
                        background: "#fff", display: "flex", alignItems: "center",
                        justifyContent: "space-between", padding: "0 20px",
                        borderBottom: "1px solid #eceef1",
                    }}
                >
                    <div style={{ fontWeight: 600 }}>{session?.selectedTenantName ?? ""}</div>
                    <Dropdown
                        menu={{
                            items: [
                                {
                                    key: "switch",
                                    icon: <Repeat size={14} />,
                                    label: "Клуб солих",
                                    onClick: () => router.push("/club"),
                                },
                                {
                                    key: "logout",
                                    icon: <LogOut size={14} />,
                                    label: "Гарах",
                                    onClick: () => signOut({ callbackUrl: "/login" }),
                                },
                            ],
                        }}
                    >
                        <Button type="text" style={{ height: 44, display: "flex", alignItems: "center", gap: 8 }}>
                            <Avatar size={28} style={{ background: "#F26522" }}>
                                {(session?.firstname ?? session?.phone ?? "?").slice(0, 1).toUpperCase()}
                            </Avatar>
                            <span>{session?.name ?? session?.phone}</span>
                        </Button>
                    </Dropdown>
                </Header>
                <Content style={{ padding: 20 }}>{children}</Content>
            </Layout>
        </Layout>
    );
}
