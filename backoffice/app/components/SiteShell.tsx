"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Avatar, Button, Drawer, Dropdown, Grid } from "antd";
import { LayoutGrid, LogOut, Menu as MenuIcon, User, Volleyball } from "lucide-react";
import { useState } from "react";
import Wordmark from "@/app/components/Wordmark";
import { AuthDialogProvider, useAuthDialog } from "@/app/components/AuthDialog";

const NAV = [
    { href: "/", label: "Нүүр" },
    { href: "/trainings", label: "Сургалтууд" },
    { href: "/news", label: "Мэдээ" },
    { href: "/shop", label: "Дэлгүүр" },
];

// Chrome for the public site. Separate from AppShell on purpose: these pages must render for a
// visitor with no session, so nothing here may read tenant state.
//
// The auth dialog is provided from out here rather than inside, so the header's own buttons and
// anything on the page below - the application form, say - open the same one.
export default function SiteShell({ children }: { children: React.ReactNode }) {
    return (
        <AuthDialogProvider>
            <Shell>{children}</Shell>
        </AuthDialogProvider>
    );
}

function Shell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session, status } = useSession();
    const [open, setOpen] = useState(false);
    const screens = Grid.useBreakpoint();
    const openAuth = useAuthDialog();

    // The console link appears only once an application has been approved - membership of a centre
    // is exactly what "approved" means, so there is nothing else to check.
    const managed = (session?.tenants ?? []).filter((t) => t.status === "active");
    const canManage = managed.length > 0 || !!session?.isPlatformAdmin;

    const openConsole = () => {
        if (session?.selectedTenantId) router.push("/manage/dashboard");
        else if (managed.length > 0) router.push("/club");
        else router.push("/admin");
    };

    const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname?.startsWith(href));

    const links = NAV.map((item) => (
        <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`site-nav-link${isActive(item.href) ? " site-nav-link--active" : ""}`}
        >
            {item.label}
        </Link>
    ));

    const initial = (session?.firstname ?? session?.name ?? session?.phone ?? "?").slice(0, 1).toUpperCase();

    const account = (
        <Dropdown
            menu={{
                items: [
                    {
                        key: "profile",
                        icon: <User size={14} />,
                        label: "Профайл",
                        onClick: () => router.push("/profile"),
                    },
                    ...(canManage ? [{
                        key: "manage",
                        icon: <LayoutGrid size={14} />,
                        label: "Удирдлага",
                        onClick: openConsole,
                    }] : []),
                    { type: "divider" as const },
                    {
                        key: "logout",
                        icon: <LogOut size={14} />,
                        label: "Гарах",
                        onClick: () => signOut({ callbackUrl: "/" }),
                    },
                ],
            }}
        >
            <Button type="text" style={{ height: 42, display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar size={28} src={session?.photo ?? undefined} style={{ background: "#F26522" }}>
                    {initial}
                </Avatar>
                <span>{session?.firstname ?? session?.name ?? session?.phone}</span>
            </Button>
        </Dropdown>
    );

    return (
        <div className="site">
            <header className="site-header">
                <div className="site-container site-header__inner">
                    <Link href="/" className="site-brand">
                        <Volleyball size={22} color="#F26522" />
                        <Wordmark />
                    </Link>

                    {screens.md ? (
                        <nav className="site-nav">{links}</nav>
                    ) : (
                        <Button type="text" icon={<MenuIcon size={20} />} onClick={() => setOpen(true)} />
                    )}

                    {screens.md && (
                        <div className="site-actions">
                            {status === "authenticated" ? account : (
                                <>
                                    <Button type="text" onClick={() => openAuth("login")}>Нэвтрэх</Button>
                                    <Button type="primary" onClick={() => openAuth("register")}>Бүртгүүлэх</Button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </header>

            <Drawer open={open} onClose={() => setOpen(false)} placement="right" width={260} title={<Wordmark />}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {links}
                    {status === "authenticated" ? (
                        <>
                            <Link href="/profile" onClick={() => setOpen(false)}>
                                <Button block icon={<User size={15} />}>Профайл</Button>
                            </Link>
                            {canManage && (
                                <Button
                                    block
                                    type="primary"
                                    icon={<LayoutGrid size={15} />}
                                    onClick={() => { setOpen(false); openConsole(); }}
                                >
                                    Удирдлага
                                </Button>
                            )}
                            <Button block danger onClick={() => signOut({ callbackUrl: "/" })}>Гарах</Button>
                        </>
                    ) : (
                        <>
                            <Button block onClick={() => { setOpen(false); openAuth("login"); }}>
                                Нэвтрэх
                            </Button>
                            <Button block type="primary" onClick={() => { setOpen(false); openAuth("register"); }}>
                                Бүртгүүлэх
                            </Button>
                        </>
                    )}
                </div>
            </Drawer>

            <main className="site-main">{children}</main>

            <footer className="site-footer">
                <div className="site-container site-footer__inner">
                    <div>
                        <div className="site-brand site-brand--footer">
                            <Volleyball size={20} color="#F26522" />
                            <Wordmark />
                        </div>
                        <p className="site-footer__text">
                            Волейболын сургалтуудыг нэг дороос. Сургалт эрхлэгчид бүртгэл, ирц, төлбөрөө
                            нэг системээс удирдаж, суралцагчид гар утаснаасаа хардаг.
                        </p>
                    </div>
                    <div className="site-footer__links">
                        {NAV.map((item) => (
                            <Link key={item.href} href={item.href}>{item.label}</Link>
                        ))}
                        <Link href="/#apply">Сургалтаа бүртгүүлэх</Link>
                    </div>
                </div>
                <div className="site-container site-footer__bottom">
                    © {new Date().getFullYear()} <Wordmark />
                </div>
            </footer>
        </div>
    );
}
