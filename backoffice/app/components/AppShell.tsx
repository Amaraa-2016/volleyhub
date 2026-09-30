"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ClipboardCheck, Wallet, Users, LayoutGrid } from "lucide-react";

// Five destinations, thumb-reachable at the bottom of the screen: what a coach does every day,
// in the order they do it - look at today, take the register, check who paid.
const TABS = [
    { href: "/home", label: "Нүүр", icon: House },
    { href: "/attendance", label: "Ирц", icon: ClipboardCheck },
    { href: "/fees", label: "Төлбөр", icon: Wallet },
    { href: "/kids", label: "Хүүхдүүд", icon: Users },
    { href: "/groups", label: "Бүлэг", icon: LayoutGrid },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() ?? "";

    return (
        <div className="app">
            {children}
            <div className="tabbar">
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
                </nav>
            </div>
        </div>
    );
}
