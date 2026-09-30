"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ThemeToggle } from "@/app/components/Theme";
import { House, ClipboardCheck, Wallet, Users, LayoutGrid, Volleyball, ClipboardList, ChartColumn, Settings } from "lucide-react";

// Five destinations. On a phone they sit in a bar at the bottom, where the thumb is; on a wide
// screen the same list becomes a sidebar (see the min-width: 960px block in globals.css).
const TABS = [
    { href: "/home", label: "Нүүр", icon: House },
    { href: "/groups", label: "Ангиуд", icon: LayoutGrid },
    { href: "/attendance", label: "Ирц", icon: ClipboardCheck },
    { href: "/fees", label: "Төлбөр", icon: Wallet },
    { href: "/kids", label: "Хүүхдүүд", icon: Users },
];

// Only in the wide-screen sidebar; on a phone these are reached from the home screen.
const MORE = [
    { href: "/plans", label: "Төлөвлөгөө", icon: ClipboardList },
    { href: "/reports", label: "Тайлан", icon: ChartColumn },
    { href: "/me", label: "Тохиргоо", icon: Settings },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() ?? "";
    const { data: session } = useSession();

    return (
        <div className="app">
            {children}
            <div className="tabbar">
                <Link href="/me" className="side-brand">
                    <span className="logo"><Volleyball size={20} /></span>
                    <span>
                        <b>Volleyhub</b>
                        <small>{session?.selectedTenantName ?? ""}</small>
                    </span>
                </Link>
                <nav aria-label="Үндсэн цэс">
                    {TABS.map(({ href, label, icon: Icon }) => {
                        const active = pathname === href || pathname.startsWith(href + "/");
                        return (
                            <Link key={href} href={href} className={`tab${active ? " active" : ""}`} aria-current={active ? "page" : undefined}>
                                <span className="pip"><Icon size={22} strokeWidth={active ? 2.4 : 2} /></span>
                                {label}
                            </Link>
                        );
                    })}
                    {MORE.map(({ href, label, icon: Icon }) => {
                        const active = pathname === href || pathname.startsWith(href + "/");
                        return (
                            <Link key={href} href={href} className={`tab desktop-only${active ? " active" : ""}`} aria-current={active ? "page" : undefined}>
                                <span className="pip"><Icon size={22} strokeWidth={active ? 2.4 : 2} /></span>
                                {label}
                            </Link>
                        );
                    })}
                </nav>
                <ThemeToggle withLabel />
            </div>
        </div>
    );
}
