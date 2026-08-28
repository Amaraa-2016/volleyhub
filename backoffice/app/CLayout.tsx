"use client";

import { SessionProvider } from "next-auth/react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider, App as AntApp } from "antd";
import mnMN from "antd/locale/mn_MN";

// Root client providers: NextAuth session, AntD SSR style registry, and the AntD theme/App context
// so message/notification work anywhere. The page chrome (sider/header) lives in AppShell, used by
// authenticated pages only - login and club selection render bare.
export default function CLayout({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <AntdRegistry>
                <ConfigProvider
                    locale={mnMN}
                    theme={{ token: { colorPrimary: "#F26522", borderRadius: 8 } }}
                >
                    <AntApp>{children}</AntApp>
                </ConfigProvider>
            </AntdRegistry>
        </SessionProvider>
    );
}
