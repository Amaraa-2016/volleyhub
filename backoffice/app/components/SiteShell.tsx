"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button, Drawer, Grid } from "antd";
import { Menu as MenuIcon, Volleyball } from "lucide-react";
import { useState } from "react";

const NAV = [
    { href: "/", label: "Нүүр" },
    { href: "/trainings", label: "Сургалтууд" },
    { href: "/news", label: "Мэдээ" },
    { href: "/shop", label: "Дэлгүүр" },
];

// Chrome for the public site. Separate from AppShell on purpose: these pages must render for a
// visitor with no session, so nothing here may read tenant state.
export default function SiteShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { data: session, status } = useSession();
    const [open, setOpen] = useState(false);
    const screens = Grid.useBreakpoint();

    // Where the "my console" button goes depends on what the user actually is.
    const consoleHref = session?.selectedTenantId
        ? "/manage/dashboard"
        : session?.isPlatformAdmin
            ? "/admin"
            : "/club";

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

    return (
        <div className="site">
            <header className="site-header">
                <div className="site-container site-header__inner">
                    <Link href="/" className="site-brand">
                        <Volleyball size={22} color="#F26522" />
                        Volleyhub
                    </Link>

                    {screens.md ? (
                        <nav className="site-nav">{links}</nav>
                    ) : (
                        <Button type="text" icon={<MenuIcon size={20} />} onClick={() => setOpen(true)} />
                    )}

                    {screens.md && (
                        <div className="site-actions">
                            {status === "authenticated" ? (
                                <Link href={consoleHref}>
                                    <Button type="primary">Миний хэсэг</Button>
                                </Link>
                            ) : (
                                <>
                                    <Link href="/login"><Button type="text">Нэвтрэх</Button></Link>
                                    <Link href="/register"><Button type="primary">Бүртгүүлэх</Button></Link>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </header>

            <Drawer open={open} onClose={() => setOpen(false)} placement="right" width={260} title="Volleyhub">
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {links}
                    <Link href={status === "authenticated" ? consoleHref : "/login"} onClick={() => setOpen(false)}>
                        <Button type="primary" block>
                            {status === "authenticated" ? "Миний хэсэг" : "Нэвтрэх"}
                        </Button>
                    </Link>
                </div>
            </Drawer>

            <main className="site-main">{children}</main>

            <footer className="site-footer">
                <div className="site-container site-footer__inner">
                    <div>
                        <div className="site-brand site-brand--footer">
                            <Volleyball size={20} color="#F26522" />
                            Volleyhub
                        </div>
                        <p className="site-footer__text">
                            Волейболын сургалтуудыг нэг дороос. Сургалт эрхлэгчид системд бүртгүүлж,
                            суралцагчид гар утаснаасаа хуваарь, ирц, төлбөрөө хардаг.
                        </p>
                    </div>
                    <div className="site-footer__links">
                        {NAV.map((item) => (
                            <Link key={item.href} href={item.href}>{item.label}</Link>
                        ))}
                        <Link href="/club">Сургалтаа бүртгүүлэх</Link>
                    </div>
                </div>
                <div className="site-container site-footer__bottom">
                    © {new Date().getFullYear()} Volleyhub
                </div>
            </footer>
        </div>
    );
}
