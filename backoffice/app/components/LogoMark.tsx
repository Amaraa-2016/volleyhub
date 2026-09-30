"use client";

import { useId } from "react";

// The Volleyhub mark: a ball of three panels meeting at one point - the hub. Orange, teal and
// sun are the brand's three colours; the white seams are cut out with a mask so the mark sits on
// any background. Files for print and elsewhere live in /public/brand.
export default function LogoMark({ size = 32, title = "Volleyhub" }: { size?: number; title?: string }) {
    const id = useId().replace(/:/g, "");
    return (
        <svg width={size} height={size} viewBox="0 0 240 240" role="img" aria-label={title}>
            <defs>
            <mask id={id}>
            <rect x="6" y="6" width="228" height="228" fill="#fff"/>
            <path d="M120,120 Q77.25,65.28 120.00,8.00" fill="none" stroke="#000" strokeWidth="9.52" strokeLinecap="round"/>
            <path d="M120,120 Q188.76,110.34 216.99,176.00" fill="none" stroke="#000" strokeWidth="9.52" strokeLinecap="round"/>
            <path d="M120,120 Q93.99,184.38 23.01,176.00" fill="none" stroke="#000" strokeWidth="9.52" strokeLinecap="round"/>
            <circle cx="120" cy="120" r="8.57" fill="#000"/>
            </mask>
            </defs>
            <g mask={`url(#${id})`}>
            <path d="M120,120 Q77.25,65.28 120.00,8.00 A112,112 0 0 1 216.99,176.00 Q188.76,110.34 120,120 Z" fill="#c2410c"/>
            <path d="M120,120 Q188.76,110.34 216.99,176.00 A112,112 0 0 1 23.01,176.00 Q93.99,184.38 120,120 Z" fill="#0f766e"/>
            <path d="M120,120 Q93.99,184.38 23.01,176.00 A112,112 0 0 1 120.00,8.00 Q77.25,65.28 120,120 Z" fill="#f5b82e"/>
            </g>
        </svg>
    );
}
