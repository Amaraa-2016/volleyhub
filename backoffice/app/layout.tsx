import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./Providers";
import { themeScript } from "./components/Theme";

export const metadata: Metadata = {
    title: "Volleyhub",
    description: "Хүүхдийн волейболын дасгалжуулагчийн туслах: ирц, төлбөр, анги, ахиц",
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: "Volleyhub", statusBarStyle: "default" },
    icons: {
        icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/favicon.png", sizes: "32x32", type: "image/png" }],
        apple: "/apple-touch-icon.png",
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#fbf7f0" },
        { media: "(prefers-color-scheme: dark)", color: "#141a24" },
    ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="mn" suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeScript }} />
                {/* Loaded at runtime rather than through next/font so a build never needs to reach
                    Google; without it the system font takes over and nothing breaks. */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
                {/* eslint-disable-next-line @next/next/no-page-custom-font */}
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" />
            </head>
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
