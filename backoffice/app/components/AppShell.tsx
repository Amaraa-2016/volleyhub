"use client";

import { Layout, Menu, Dropdown, Avatar, Button } from "antd";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
    LayoutDashboard, User, Users, GraduationCap, ShieldCheck, LogOut, Repeat, Volleyball, Store,
} from "lucide-react";
import { useMemo } from "react";

const { Header, Sider, Content } = Layout;

// Chrome for the training centre's console. Kept as a component rather than a layout.tsx so the
// public site and the bare screens (login, register, centre select) simply do not use it.
export default function AppShell({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { data: session } = useSession();

    // Kept deliberately short. The other consoles (schedule, attendance, fees, venues,
    // announcements, members, public profile) still exist and their routes still work - they are
    // just not in the sidebar while the product focuses on courses and students.
    const items = useMemo(() => {
        const base = [
            { key: "/manage/dashboard", icon: <LayoutDashboard size={16} />, label: "Хяналтын самбар" },
            { key: "/manage/groups", icon: <GraduationCap size={16} />, label: "Сургалт" },
            { key: "/manage/coaches", icon: <Users size={16} />, label: "Багш" },
            { key: "/manage/students", icon: <User size={16} />, label: "Суралцагчид" },
        ];
        if (session?.isPlatformAdmin) {
            base.push({ key: "/admin", icon: <ShieldCheck size={16} />, label: "Платформ" });
        }
        return base;
    }, [session?.isPlatformAdmin]);

    // /manage/groups/12 has to light up /manage/groups, so match on the first two segments.
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const selected = "/" + segments.slice(0, 2).join("/");

    return (
        <Layout style={{ minHeight: "100vh" }}>
            <Sider breakpoint="lg" collapsedWidth="0" width={230} style={{ background: "#141922" }}>
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
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Button type="text" icon={<Store size={15} />} onClick={() => router.push("/")}>
                            Сайт
                        </Button>
                        <Dropdown
                            menu={{
                                items: [
                                    {
                                        key: "switch",
                                        icon: <Repeat size={14} />,
                                        label: "Сургалт солих",
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
                    </div>
                </Header>
                <Content style={{ padding: 20 }}>{children}</Content>
            </Layout>
        </Layout>
    );
}
