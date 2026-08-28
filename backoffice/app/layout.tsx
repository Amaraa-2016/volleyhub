import type { Metadata, Viewport } from "next";
import "./globals.css";
import CLayout from "./CLayout";

export const metadata: Metadata = {
    title: "Volleyhub Admin",
    description: "Волейболын клуб, тэмцээний удирдлагын систем",
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="mn" suppressHydrationWarning>
            <body>
                <CLayout>{children}</CLayout>
            </body>
        </html>
    );
}
