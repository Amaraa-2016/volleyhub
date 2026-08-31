"use client";

import { Building2 } from "lucide-react";
import type { CenterCard } from "@/app/types/api";

// The row of training-centre logos. Clicking one narrows the list to that centre; clicking the
// selected one (or "Бүгд") clears the filter. Rendered as buttons rather than links so the page
// filters in place - the whole point is comparing what one centre offers without losing the list.
export default function CenterStrip({
    centers,
    selected,
    onSelect,
}: {
    centers: CenterCard[];
    selected?: number;
    onSelect: (tenantid?: number) => void;
}) {
    if (centers.length === 0) return null;

    return (
        <div className="center-strip">
            <button
                type="button"
                className={`center-chip${selected == null ? " center-chip--active" : ""}`}
                onClick={() => onSelect(undefined)}
            >
                <div className="center-chip__logo">
                    <Building2 size={22} />
                </div>
                <div className="center-chip__name">Бүгд</div>
                <div className="center-chip__count">
                    {centers.reduce((sum, c) => sum + c.coursecount, 0)} сургалт
                </div>
            </button>

            {centers.map((c) => (
                <button
                    key={c.tenantid}
                    type="button"
                    className={`center-chip${selected === c.tenantid ? " center-chip--active" : ""}`}
                    onClick={() => onSelect(selected === c.tenantid ? undefined : c.tenantid)}
                    title={c.tenantname}
                >
                    <div className="center-chip__logo">
                        {c.logo
                            ? <img src={c.logo} alt={c.tenantname} />
                            : <Building2 size={22} />}
                    </div>
                    <div className="center-chip__name">{c.tenantname}</div>
                    <div className="center-chip__count">{c.coursecount} сургалт</div>
                </button>
            ))}
        </div>
    );
}
