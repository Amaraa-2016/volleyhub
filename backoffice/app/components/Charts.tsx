"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// Two small hand-drawn SVG charts - no chart library, so nothing extra to install. Marks follow
// one spec: 2px lines, >=8px end dots with a surface ring, columns <=24px with a 4px rounded top
// and a square base, hairline recessive grid, text in ink tokens (never the series colour), and a
// hover tooltip on every mark.

// Drawn at the box's real pixel width, so 11px text stays 11px on a phone and on a monitor.
function useWidth() {
    const ref = useRef<HTMLDivElement>(null);
    const [w, setW] = useState(340);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    return { ref, w };
}

function niceTicks(min: number, max: number, count = 4) {
    if (min === max) { min -= 1; max += 1; }
    const span = max - min;
    const step0 = span / count;
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? step0;
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const ticks: number[] = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
    return ticks;
}

const fmt = (v: number) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString("en-US").replace(/,/g, "'") : String(Math.round(v * 10) / 10));

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: React.ReactNode }) {
    // Kept inside the chart box: flips to the left of the pointer near the right edge.
    const left = x > width * 0.6;
    return (
        <div role="status" style={{
            position: "absolute", top: Math.max(0, y - 8), left: left ? undefined : x + 12, right: left ? width - x + 12 : undefined,
            transform: "translateY(-100%)", background: "var(--card)", border: "1px solid var(--line)", boxShadow: "var(--shadow)",
            borderRadius: 8, padding: "6px 10px", fontSize: 13, lineHeight: "18px", fontWeight: 700, color: "var(--ink)",
            pointerEvents: "none", whiteSpace: "nowrap", zIndex: 2,
        }}>{children}</div>
    );
}

// One measurement over time. Single series, so no legend: the card title names it.
export function LineChart({ points, unit, height = 160 }: {
    points: { label: string; value: number }[];
    unit?: string;
    height?: number;
}) {
    const { ref: box, w: W } = useWidth();
    const [hover, setHover] = useState<number | null>(null);
    const pad = { l: 44, r: 16, t: 22, b: 26 };
    const ticks = useMemo(() => niceTicks(Math.min(...points.map((p) => p.value)), Math.max(...points.map((p) => p.value))), [points]);
    const lo = ticks[0], hi = ticks[ticks.length - 1];
    const x = (i: number) => pad.l + (points.length === 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (points.length - 1));
    const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo || 1)) * (height - pad.t - pad.b);
    const path = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.value)}`).join(" ");
    const last = points.length - 1;

    const onMove = (e: React.PointerEvent) => {
        const r = box.current?.getBoundingClientRect();
        if (!r) return;
        const px = e.clientX - r.left;
        let best = 0;
        points.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i; });
        setHover(best);
    };

    const scale = 1;

    return (
        <div ref={box} style={{ position: "relative" }} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
            <svg viewBox={`0 0 ${W} ${height}`} width={W} height={height} role="img" aria-label={`${points.length} хэмжилт`} style={{ display: "block", overflow: "visible" }}>
                {ticks.map((t) => (
                    <g key={t}>
                        <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
                        <text x={pad.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fontWeight={700} fill="var(--ink-muted)">{fmt(t)}</text>
                    </g>
                ))}
                {points.map((p, i) => (i === 0 || i === last || points.length <= 6) && (
                    <text key={i} x={x(i)} y={height - 6} textAnchor={points.length === 1 ? "middle" : i === 0 ? "start" : i === last ? "end" : "middle"}
                        fontSize={11} fontWeight={700} fill="var(--ink-muted)">{p.label}</text>
                ))}
                <path d={`${path} L${x(last)},${y(lo)} L${x(0)},${y(lo)} Z`} fill="var(--viz-1)" opacity={0.1} />
                <path d={path} fill="none" stroke="var(--viz-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={height - pad.b} stroke="var(--ink-muted)" strokeWidth={1} opacity={0.5} />}
                {points.map((p, i) => (i === last || i === hover) && (
                    <circle key={i} cx={x(i)} cy={y(p.value)} r={5} fill="var(--viz-1)" stroke="var(--card)" strokeWidth={2} />
                ))}
                {/* Latest value labelled at the end - the one number the coach wants. */}
                <text x={x(last)} y={y(points[last].value) - 12} textAnchor={points.length === 1 ? "middle" : "end"} fontSize={13} fontWeight={800} fill="var(--ink)">
                    {fmt(points[last].value)}{unit ? ` ${unit}` : ""}
                </text>
            </svg>
            {hover !== null && (
                <Tooltip x={x(hover) * scale} y={y(points[hover].value) * scale} width={W * scale}>
                    {points[hover].label}: {fmt(points[hover].value)}{unit ? ` ${unit}` : ""}
                </Tooltip>
            )}
        </div>
    );
}

// Months of the year: the column is what was paid, the pale track behind it what was billed.
export function IncomeColumns({ months, height = 200, money }: {
    months: { label: string; billed: number; paid: number }[];
    height?: number;
    money: (n: number) => string;
}) {
    const { ref: box, w: W } = useWidth();
    const [hover, setHover] = useState<number | null>(null);
    const pad = { l: 58, r: 8, t: 12, b: 24 };
    const max = Math.max(1, ...months.map((m) => Math.max(m.billed, m.paid)));
    const ticks = niceTicks(0, max, 4);
    const top = ticks[ticks.length - 1];
    const band = (W - pad.l - pad.r) / months.length;
    const bw = Math.min(24, band * 0.62);
    const y = (v: number) => pad.t + (1 - v / top) * (height - pad.t - pad.b);
    const base = y(0);
    const cx = (i: number) => pad.l + band * i + band / 2;
    const col = (v: number, i: number) => {
        const h = Math.max(0, base - y(v));
        if (h <= 0) return "";
        const r = Math.min(4, h, bw / 2);
        const x0 = cx(i) - bw / 2, x1 = cx(i) + bw / 2, yt = base - h;
        return `M${x0},${base} L${x0},${yt + r} Q${x0},${yt} ${x0 + r},${yt} L${x1 - r},${yt} Q${x1},${yt} ${x1},${yt + r} L${x1},${base} Z`;
    };
    const short = (v: number) => (v >= 1e6 ? `${Math.round(v / 1e5) / 10}сая` : v >= 1000 ? `${Math.round(v / 1000)}мян` : String(v));
    const scale = 1;

    return (
        <div ref={box} style={{ position: "relative" }} onPointerLeave={() => setHover(null)}>
            <svg viewBox={`0 0 ${W} ${height}`} width={W} height={height} role="img" aria-label="Сарын орлого" style={{ display: "block" }}>
                {ticks.map((t) => (
                    <g key={t}>
                        <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
                        <text x={pad.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fontWeight={700} fill="var(--ink-muted)">{short(t)}</text>
                    </g>
                ))}
                {months.map((m, i) => (
                    <g key={i} onPointerEnter={() => setHover(i)} onClick={() => setHover(i)}>
                        {/* Hit target: the whole band, far bigger than the mark. */}
                        <rect x={pad.l + band * i} y={pad.t} width={band} height={height - pad.t - pad.b} fill="transparent" />
                        <path d={col(m.billed, i)} fill="var(--viz-track)" />
                        <path d={col(m.paid, i)} fill="var(--viz-1)" opacity={hover === null || hover === i ? 1 : 0.55} />
                        <text x={cx(i)} y={height - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill={hover === i ? "var(--ink)" : "var(--ink-muted)"}>{m.label}</text>
                    </g>
                ))}
            </svg>
            {hover !== null && (
                <Tooltip x={cx(hover) * scale} y={y(Math.max(months[hover].billed, months[hover].paid)) * scale} width={W * scale}>
                    <div>{months[hover].label}-р сар</div>
                    <div style={{ fontWeight: 600 }}>Нэхэмжилсэн: {money(months[hover].billed)}</div>
                    <div style={{ fontWeight: 600 }}>Төлөгдсөн: {money(months[hover].paid)}</div>
                </Tooltip>
            )}
            <div style={{ display: "flex", gap: 16, fontSize: 12, fontWeight: 700, color: "var(--ink-muted)", marginTop: 6 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: "var(--viz-1)", display: "inline-block" }} />Төлөгдсөн</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: "var(--viz-track)", display: "inline-block" }} />Нэхэмжилсэн</span>
            </div>
        </div>
    );
}
