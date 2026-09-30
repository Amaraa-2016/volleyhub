"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { API, errorText, type APIResult } from "@/app/utils/API";

// ---- toast --------------------------------------------------------------

interface ToastState {
    text: string;
    error?: boolean;
    action?: { label: string; run: () => void };
}

const ToastContext = createContext<(t: ToastState) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toast, setToast] = useState<ToastState | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const show = useCallback((t: ToastState) => {
        if (timer.current) clearTimeout(timer.current);
        setToast(t);
        // An undo needs time to be reached for; a plain confirmation does not.
        timer.current = setTimeout(() => setToast(null), t.action ? 6000 : 2600);
    }, []);

    return (
        <ToastContext.Provider value={show}>
            {children}
            {toast && (
                <div className={`toast${toast.error ? " error" : ""}`} role="status">
                    <span>{toast.text}</span>
                    {toast.action && (
                        <button
                            onClick={() => {
                                toast.action?.run();
                                setToast(null);
                            }}
                        >
                            {toast.action.label}
                        </button>
                    )}
                </div>
            )}
        </ToastContext.Provider>
    );
}

export const useToast = () => {
    const show = useContext(ToastContext);
    return {
        ok: (text: string, action?: ToastState["action"]) => show({ text, action }),
        fail: (code?: string) => show({ text: errorText(code), error: true }),
    };
};

// ---- data loading -------------------------------------------------------

// Loads one backoffice path and re-loads on demand. `null` path means "not yet" (waiting on a
// parameter), which keeps callers free of conditional hooks.
export function useData<T>(path: string | null) {
    const [data, setData] = useState<T | undefined>(undefined);
    const [error, setError] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!path) return;
        setLoading(true);
        const res: APIResult<T> = await API<T>(path);
        if (res.error) setError(res.error);
        else {
            setError(undefined);
            setData(res.data);
        }
        setLoading(false);
    }, [path]);

    useEffect(() => {
        load();
    }, [load]);

    return { data, error, loading, reload: load, setData };
}

// ---- chrome -------------------------------------------------------------

export function TopBar({ title, sub, back, right }: {
    title: string;
    sub?: string;
    back?: boolean | string;
    right?: React.ReactNode;
}) {
    const router = useRouter();
    return (
        <header className="topbar">
            {back && (
                <button
                    className="icon-btn"
                    aria-label="Буцах"
                    onClick={() => (typeof back === "string" ? router.push(back) : router.back())}
                    style={{ marginLeft: -10 }}
                >
                    <ChevronLeft size={24} />
                </button>
            )}
            <h1>
                {sub && <span className="sub">{sub}</span>}
                {title}
            </h1>
            {right}
        </header>
    );
}

export function Sheet({ open, onClose, title, children }: {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
}) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        // Stop the page behind from scrolling while the sheet is up.
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onClose]);

    if (!open) return null;
    return (
        <div className="scrim" onClick={onClose}>
            <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
                <div className="grab" />
                {title && <h3>{title}</h3>}
                {children}
            </div>
        </div>
    );
}

export function Empty({ title, text, children }: { title: string; text?: string; children?: React.ReactNode }) {
    return (
        <div className="empty">
            <strong>{title}</strong>
            {text}
            {children && <div>{children}</div>}
        </div>
    );
}

export function Loading({ rows = 3 }: { rows?: number }) {
    return (
        <div className="stack" aria-busy="true">
            {Array.from({ length: rows }, (_, i) => (
                <div key={i} className="skeleton" style={{ height: 64 }} />
            ))}
        </div>
    );
}

export function ErrorBox({ code, retry }: { code?: string; retry?: () => void }) {
    return (
        <Empty title="Ачаалж чадсангүй" text={errorText(code)}>
            {retry && <button className="btn" onClick={retry}>Дахин оролдох</button>}
        </Empty>
    );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <label className="field">
            <span>{label}</span>
            {children}
            {hint && <small>{hint}</small>}
        </label>
    );
}
