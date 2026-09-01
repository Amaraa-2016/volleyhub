"use client";

import Link from "next/link";
import { ArrowUpRight, Building2 } from "lucide-react";
import type { CenterCard } from "@/app/types/api";

// The centres, as cards on the home page. The compact chips in [CenterStrip] are a filter that acts
// on a list already on screen; here there is no list to filter, so each centre is simply a link
// into its own courses - which also means it can be opened in a new tab.
export default function CenterCards({ centers }: { centers: CenterCard[] }) {
    if (centers.length === 0) return null;

    return (
        <div className="center-cards">
            {centers.map((c) => (
                <Link
                    key={c.tenantid}
                    href={`/trainings?center=${c.tenantid}`}
                    className="center-card"
                >
                    <div className="center-card__logo">
                        {c.logo
                            ? <img src={c.logo} alt={c.tenantname} />
                            : <Building2 size={24} />}
                    </div>
                    <div className="center-card__body">
                        <div className="center-card__name">{c.tenantname}</div>
                        <div className="center-card__count">{c.coursecount} сургалт</div>
                    </div>
                    <ArrowUpRight className="center-card__arrow" size={18} />
                </Link>
            ))}
        </div>
    );
}
