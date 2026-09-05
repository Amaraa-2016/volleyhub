"use client";

import { Modal } from "antd";
import { Volleyball } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { LoginFields, RegisterFields } from "@/app/components/AuthForms";
import Wordmark from "@/app/components/Wordmark";

export type AuthMode = "login" | "register";

// The caller may hand over what it was in the middle of doing; it runs once the visitor is signed
// in, so an action interrupted by the dialog finishes by itself.
type OpenAuthFn = (mode: AuthMode, onSuccess?: () => void) => void;

const OpenAuth = createContext<OpenAuthFn | null>(null);

// Signing in and signing up happen over the page the visitor is already on: someone who came to
// read about a centre and decided to apply should not lose that page to a full-screen form.
//
// The provider sits above the public site's chrome so the header, the drawer and the application
// form all reach the same dialog.
export function AuthDialogProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [mode, setMode] = useState<AuthMode>();
    // Not state: it is read once, after signing in, and re-rendering on it would be pointless.
    const pending = useRef<() => void>(null);

    // Closing without signing in drops the interrupted action too - it must not fire days later
    // when the visitor signs in for some other reason.
    const close = useCallback(() => {
        pending.current = null;
        setMode(undefined);
    }, []);

    const open = useCallback<OpenAuthFn>((next, onSuccess) => {
        pending.current = onSuccess ?? null;
        setMode(next);
    }, []);

    // Whatever is on screen was rendered for a signed-out visitor, so it has to be re-rendered
    // with the new session - the dialog itself changes no route. The interrupted action runs
    // straight away: signing in has already set the session cookie, so its request carries it even
    // before React hears about the new session.
    const done = () => {
        const interrupted = pending.current;
        close();
        router.refresh();
        interrupted?.();
    };

    return (
        <OpenAuth.Provider value={open}>
            {children}

            <Modal
                open={!!mode}
                onCancel={close}
                footer={null}
                width={420}
                destroyOnHidden
                title={
                    <span className="auth-modal__brand">
                        <Volleyball size={20} color="#F26522" />
                        <Wordmark />
                    </span>
                }
            >
                <h3 className="auth-modal__title">
                    {mode === "register" ? "Бүртгүүлэх" : "Нэвтрэх"}
                </h3>

                {mode === "register"
                    ? <RegisterFields onSuccess={done} />
                    : <LoginFields onSuccess={done} />}

                <div className="auth-modal__switch">
                    {mode === "register" ? (
                        <>
                            Бүртгэлтэй юу?{" "}
                            <button type="button" onClick={() => setMode("login")}>Нэвтрэх</button>
                        </>
                    ) : (
                        <>
                            Бүртгэл байхгүй юу?{" "}
                            <button type="button" onClick={() => setMode("register")}>Бүртгүүлэх</button>
                        </>
                    )}
                </div>
            </Modal>
        </OpenAuth.Provider>
    );
}

// Falls back to the standalone pages when there is no provider above - the console shell has none,
// and a caller should not have to know which shell it is rendered under.
export function useAuthDialog() {
    const open = useContext(OpenAuth);
    const router = useRouter();
    return open ?? ((mode: AuthMode) => router.push(`/${mode}`));
}
