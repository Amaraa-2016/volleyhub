import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
    interface Session {
        // The coach's token, for every backend call. Never sent to the browser by the proxies.
        accountToken?: string;
        // The training's name, shown under the coach's name.
        trainingName?: string;
        accountid?: number;
        name?: string | null;
        lastname?: string | null;
        photo?: string | null;
        firstname?: string | null;
        phone?: string;
    }

    interface User {
        accountToken?: string;
        trainingName?: string;
        accountid?: number;
        lastname?: string | null;
        photo?: string | null;
        firstname?: string | null;
        phone?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accountToken?: string;
        trainingName?: string;
        accountid?: number;
        lastname?: string | null;
        photo?: string | null;
        firstname?: string | null;
        phone?: string;
    }
}
