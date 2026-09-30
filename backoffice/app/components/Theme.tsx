"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";

export type ThemeChoice = "system" | "light" | "dark";
const KEY = "vh-theme";

// Runs in <head> before the page paints, so a coach who chose dark never sees a white flash.
export const themeScript = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

const read = (): ThemeChoice => {
    try {
        const t = localStorage.getItem(KEY);
        return t === "light" || t === "dark" ? t : "system";
    } catch {
        return "system";
    }
};

const apply = (t: ThemeChoice) => {
    const root = document.documentElement;
    if (t === "system") delete root.dataset.theme;
    else root.dataset.theme = t;
    try {
        if (t === "system") localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, t);
    } catch { /* private mode: the choice lasts until reload */ }
    window.dispatchEvent(new Event("vh-theme"));
};

const isDarkNow = (t: ThemeChoice) =>
    t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

export function useTheme() {
    const [theme, setTheme] = useState<ThemeChoice>("system");
    const [dark, setDark] = useState(false);

    useEffect(() => {
        const sync = () => {
            const t = read();
            setTheme(t);
            setDark(isDarkNow(t));
        };
        sync();
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        mq.addEventListener("change", sync);
        window.addEventListener("vh-theme", sync);
        return () => {
            mq.removeEventListener("change", sync);
            window.removeEventListener("vh-theme", sync);
        };
    }, []);

    return { theme, dark, set: apply };
}

// One tap flips between light and dark, whatever the system says.
export function ThemeToggle({ withLabel }: { withLabel?: boolean }) {
    const { dark, set } = useTheme();
    const Icon = dark ? Sun : Moon;
    const label = dark ? "Цайвар горим" : "Харанхуй горим";
    return (
        <button className={withLabel ? "theme-btn" : "icon-btn"} aria-label={label} title={label} onClick={() => set(dark ? "light" : "dark")}>
            <Icon size={withLabel ? 20 : 21} />
            {withLabel && label}
        </button>
    );
}

export function ThemePicker() {
    const { theme, set } = useTheme();
    const options: { v: ThemeChoice; label: string; icon: typeof Sun }[] = [
        { v: "system", label: "Автомат", icon: Monitor },
        { v: "light", label: "Цайвар", icon: Sun },
        { v: "dark", label: "Харанхуй", icon: Moon },
    ];
    return (
        <div className="seg">
            {options.map(({ v, label, icon: Icon }) => (
                <button key={v} type="button" className={theme === v ? "on" : ""} onClick={() => set(v)}
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Icon size={16} /> {label}
                </button>
            ))}
        </div>
    );
}
