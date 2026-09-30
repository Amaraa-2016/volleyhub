import AppShell from "@/app/components/AppShell";

// Every signed-in screen: the bottom tab bar around the page. Login and register sit outside this
// group and render bare.
export default function AppLayout({ children }: { children: React.ReactNode }) {
    return <AppShell>{children}</AppShell>;
}
