import "next-auth";
import "next-auth/jwt";

export interface TenantMembership {
    tenantid: number;
    tenantname: string;
    role: string;
    status: string;
    staffid: number;
    logo?: string | null;
}

declare module "next-auth" {
    interface Session {
        // Account-level token: identity only, no workspace. Used for the account endpoints.
        accountToken?: string;
        // Per-workspace token, paired with selectedTenantId. Both are sent by the backoffice proxy.
        accessToken?: string;
        selectedTenantId?: string;
        selectedTenantName?: string;
        selectedRole?: string;
        accountid?: number;
        name?: string | null;
        lastname?: string | null;
        photo?: string | null;
        firstname?: string | null;
        phone?: string;
        tenants?: TenantMembership[];
    }

    interface User {
        accountToken?: string;
        accessToken?: string;
        selectedTenantId?: string;
        selectedTenantName?: string;
        selectedRole?: string;
        accountid?: number;
        lastname?: string | null;
        photo?: string | null;
        firstname?: string | null;
        phone?: string;
        tenants?: TenantMembership[];
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accountToken?: string;
        accessToken?: string;
        selectedTenantId?: string;
        selectedTenantName?: string;
        selectedRole?: string;
        accountid?: number;
        lastname?: string | null;
        photo?: string | null;
        firstname?: string | null;
        phone?: string;
        tenants?: TenantMembership[];
    }
}
