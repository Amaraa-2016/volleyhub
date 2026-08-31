"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { money, type CourseCard } from "@/app/types/api";

// Every course with coordinates, pinned on one map. Leaflet with OpenStreetMap tiles rather than a
// Google embed: showing more than one marker on a Google map needs an API key, and the coordinates
// were already read out of each centre's Maps link when the course was saved.
//
// Leaflet is loaded inside the effect, not imported at module level, because it reaches for
// `window` the moment it is evaluated and this page is server-rendered first.
export default function CourseMap({
    courses,
    selected,
    onSelect,
}: {
    courses: CourseCard[];
    selected?: CourseCard;
    onSelect: (course: CourseCard) => void;
}) {
    const holder = useRef<HTMLDivElement>(null);
    const map = useRef<LeafletMap>(null);
    const markers = useRef(new Map<string, Marker>());
    const resize = useRef<ResizeObserver>(null);
    // Re-framing the pins after a resize, kept in a ref so the observer always runs the current one.
    const refit = useRef<() => void>(null);
    // The handler changes on every render; the markers are bound once, so they read it from here.
    const select = useRef(onSelect);
    select.current = onSelect;

    const key = (c: CourseCard) => `${c.tenantid}-${c.groupid}`;

    useEffect(() => {
        let cancelled = false;

        (async () => {
            const L = await import("leaflet");
            if (cancelled || !holder.current) return;

            if (!map.current) {
                // Ulaanbaatar, as the starting view before any pin is placed.
                map.current = L.map(holder.current).setView([47.9188, 106.9176], 12);
                L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
                    maxZoom: 19,
                    attribution: "&copy; OpenStreetMap",
                }).addTo(map.current);

                // Leaflet measures its container once, at creation, and places every pin against
                // that. A map built while the container is still collapsed - a hidden tab, a
                // narrow pane, a layout that settles a frame later - then scatters its markers,
                // some of them outside the visible box. Watching the element and re-measuring is
                // what keeps the pins where they belong, and it covers window resizes too.
                resize.current = new ResizeObserver(() => {
                    map.current?.invalidateSize();
                    refit.current?.();
                });
                resize.current.observe(holder.current);
            }

            // Leaflet's default icon points at image files that a bundler renames, so the marker
            // would silently render as a broken image. A div icon avoids the whole problem and can
            // carry the brand colour.
            const icon = (active: boolean) => L.divIcon({
                className: "",
                html: `<span style="
                    display:block;width:18px;height:18px;border-radius:50%;
                    background:${active ? "#F26522" : "#1F2329"};
                    border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);
                "></span>`,
                iconSize: [18, 18],
                iconAnchor: [9, 9],
            });

            const wanted = new Set<string>();

            for (const course of courses) {
                if (course.latitude == null || course.longitude == null) continue;
                const id = key(course);
                wanted.add(id);

                const active = !!selected && key(selected) === id;
                const existing = markers.current.get(id);

                if (existing) {
                    existing.setIcon(icon(active));
                    continue;
                }

                const marker = L.marker([course.latitude, course.longitude], { icon: icon(active) })
                    .addTo(map.current!)
                    .bindTooltip(`${course.name} — ${money(course.fee_amount)}`, { direction: "top" })
                    .on("click", () => select.current(course));

                markers.current.set(id, marker);
            }

            // Drop pins for courses that fell out of the filter.
            for (const [id, marker] of markers.current) {
                if (!wanted.has(id)) {
                    marker.remove();
                    markers.current.delete(id);
                }
            }

            // Frame everything on the first render, then follow the selection rather than
            // re-framing - refitting on every click would yank the map about.
            const points = courses
                .filter((c) => c.latitude != null && c.longitude != null)
                .map((c) => [c.latitude!, c.longitude!] as [number, number]);

            refit.current = () => {
                if (points.length === 0) return;
                map.current?.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
            };

            if (selected?.latitude != null && selected.longitude != null) {
                map.current!.panTo([selected.latitude, selected.longitude]);
            } else {
                refit.current();
            }
        })();

        return () => { cancelled = true; };
    }, [courses, selected]);

    // Tearing the map down belongs to unmount alone: doing it in the effect above would rebuild it
    // on every filter change.
    useEffect(() => () => {
        resize.current?.disconnect();
        resize.current = null;
        map.current?.remove();
        map.current = null;
        markers.current.clear();
    }, []);

    return <div ref={holder} className="map-frame" />;
}
