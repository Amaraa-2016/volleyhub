"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker, MarkerClusterGroup, Popup } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { money, type CourseCard } from "@/app/types/api";

type Leaflet = typeof import("leaflet");

// Every course with coordinates, pinned on one map. Leaflet with OpenStreetMap tiles rather than a
// Google embed: showing more than one marker on a Google map needs an API key, and the coordinates
// were already read out of each centre's Maps link when the course was saved.
//
// Leaflet is loaded inside an effect, not imported at module level, because it reaches for `window`
// the moment it is evaluated and this page is server-rendered first.

// Course names, centre names and addresses are typed by centres and go into marker HTML, so they
// are escaped here. Leaflet takes an HTML string, which would otherwise be an injection point.
const esc = (value: string | null | undefined) =>
    (value ?? "").replace(/[&<>"']/g, (ch) => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]!
    ));

const pinIcon = (L: Leaflet, course: CourseCard, active: boolean) => {
    const photo = course.cover
        ? `<img src="${esc(course.cover)}" alt="">`
        : `<span class="vh-pin__blank"></span>`;

    return L.divIcon({
        className: "",
        html: `<span class="vh-pin${active ? " vh-pin--active" : ""}">
                 <span class="vh-pin__photo">${photo}</span>
                 <span class="vh-pin__dot"></span>
               </span>`,
        iconSize: [54, 62],
        // The tail, not the middle of the circle, is what points at the place.
        iconAnchor: [27, 62],
        popupAnchor: [0, -58],
    });
};

const popupHtml = (course: CourseCard) => {
    const price = course.fee_amount > 0 ? `Сарын ${money(course.fee_amount)}` : "Үнэ тодорхойгүй";
    const address = course.address ? `<div class="vh-card__address">${esc(course.address)}</div>` : "";

    return `
        <div class="vh-card">
            <div class="vh-card__media">
                ${course.cover ? `<img src="${esc(course.cover)}" alt="">` : ""}
                <span class="vh-card__price">${esc(price)}</span>
            </div>
            <div class="vh-card__body">
                <div class="vh-card__title">${esc(course.name)}</div>
                <div class="vh-card__center">${esc(course.tenantname)}</div>
                ${address}
                <a class="vh-card__link" href="/trainings/${course.tenantid}/${course.groupid}">
                    Дэлгэрэнгүй →
                </a>
            </div>
        </div>`;
};

// Leaflet's own autoPan measures the popup before it has settled and, on the first card opened
// after load, decides nothing needs to move - leaving the top of a 300px card cut off by the edge
// of the map. Measuring the rendered card against the map box and nudging by the difference is
// both simpler to reason about and what actually holds.
const framePopup = (map: LeafletMap, popup: Popup) => {
    const el = popup.getElement();
    if (!el) return;

    const card = el.getBoundingClientRect();
    const view = map.getContainer().getBoundingClientRect();
    const pad = 16;
    let dx = 0;
    let dy = 0;

    if (card.top < view.top + pad) dy = card.top - view.top - pad;
    else if (card.bottom > view.bottom - pad) dy = card.bottom - view.bottom + pad;

    if (card.left < view.left + pad) dx = card.left - view.left - pad;
    else if (card.right > view.right - pad) dx = card.right - view.right + pad;

    // Not animated: a second card can be opened while an earlier glide is still running, and the
    // two pans then fight over the view.
    if (dx || dy) map.panBy([dx, dy], { animate: false });
};

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
    const leaflet = useRef<Leaflet>(null);
    const map = useRef<LeafletMap>(null);
    const cluster = useRef<MarkerClusterGroup>(null);
    const markers = useRef(new Map<string, { marker: Marker; course: CourseCard }>());
    const resize = useRef<ResizeObserver>(null);
    // Re-framing the pins after a resize, kept in a ref so the observer always runs the current one.
    const refit = useRef<() => void>(null);
    // The handler changes on every render; the markers are bound once, so they read it from here.
    const select = useRef(onSelect);
    select.current = onSelect;
    // Set when the selection came from a pin, so the effect below leaves the view alone: the popup
    // is already opening and framing itself, and moving the map underneath it fights that.
    const fromMap = useRef(false);
    // The marker whose card is currently open, if any.
    const card = useRef<Marker>(null);

    const key = (c: CourseCard) => `${c.tenantid}-${c.groupid}`;

    // Markers depend on the courses alone. Rebuilding them when the selection changes would tear
    // down the marker whose popup is opening, so the popup would vanish on the very click that
    // asked for it - which is exactly what happened before this was split in two.
    useEffect(() => {
        let cancelled = false;

        (async () => {
            // The default export, not the namespace: the clustering plugin patches Leaflet's own
            // module object, and the ESM namespace re-exports its members onto a different, frozen
            // object - so markerClusterGroup would be missing from it.
            const mod = await import("leaflet");
            const L = (mod.default ?? mod) as Leaflet;
            await import("leaflet.markercluster");
            if (cancelled || !holder.current) return;

            leaflet.current = L;

            if (!map.current) {
                // Ulaanbaatar, as the starting view before any pin is placed.
                map.current = L.map(holder.current).setView([47.9188, 106.9176], 12);
                L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
                    maxZoom: 19,
                    attribution: "&copy; OpenStreetMap",
                }).addTo(map.current);

                // Leaflet measures its container once, at creation, and places every pin against
                // that. A map built while the container is still collapsed - a hidden tab, a narrow
                // pane, a layout that settles a frame later - then scatters its markers, some of
                // them outside the visible box. Watching the element and re-measuring is what keeps
                // the pins where they belong, and it covers window resizes too.
                resize.current = new ResizeObserver(() => {
                    if (!map.current) return;
                    map.current.invalidateSize({ animate: false });
                    // While a card is open it, not the whole set of pins, is what has to stay in
                    // view: re-fitting would zoom back out from under it, and with clustering that
                    // swallows the pin the card belongs to and closes it. Re-opening the card runs
                    // the same positioning as a click, a tick later so the new size is settled.
                    if (card.current) setTimeout(() => card.current?.openPopup(), 0);
                    else refit.current?.();
                });
                resize.current.observe(holder.current);

                map.current.on("popupopen", (e) => {
                    for (const { marker } of markers.current.values()) {
                        if (marker.getPopup() === e.popup) card.current = marker;
                    }
                    if (map.current) framePopup(map.current, e.popup);
                });
                map.current.on("popupclose", (e) => {
                    if (card.current?.getPopup() === e.popup) card.current = null;
                });
            }

            // Courses in one hall share coordinates, and a city view would otherwise be a pile of
            // pins on top of each other. Clustering collapses them into a count that opens on click.
            cluster.current?.remove();
            markers.current.clear();
            cluster.current = L.markerClusterGroup({
                showCoverageOnHover: false,
                maxClusterRadius: 46,
                iconCreateFunction: (group) => L.divIcon({
                    className: "",
                    html: `<span class="vh-cluster">${group.getChildCount()}</span>`,
                    iconSize: [44, 44],
                    iconAnchor: [22, 22],
                }),
            });

            for (const course of courses) {
                if (course.latitude == null || course.longitude == null) continue;

                const marker = L.marker([course.latitude, course.longitude], {
                    icon: pinIcon(L, course, false),
                });
                marker.bindPopup(popupHtml(course), {
                    closeButton: true,
                    minWidth: 260,
                    maxWidth: 260,
                    className: "vh-popup",
                    // The card is taller than a stock popup, so it needs a little more room than
                    // Leaflet's default 5px before it decides the map should slide.
                    autoPanPadding: [16, 16],
                });
                marker.on("click", () => {
                    fromMap.current = true;
                    select.current(course);
                });

                markers.current.set(key(course), { marker, course });
                cluster.current.addLayer(marker);
            }

            map.current.addLayer(cluster.current);

            const points = courses
                .filter((c) => c.latitude != null && c.longitude != null)
                .map((c) => [c.latitude!, c.longitude!] as [number, number]);

            refit.current = () => {
                if (points.length === 0) return;
                map.current?.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 15 });
            };
            refit.current();
        })();

        return () => { cancelled = true; };
    }, [courses]);

    // Selection only repaints the icons - no marker is created or removed, so the popup Leaflet is
    // opening on this very click survives.
    useEffect(() => {
        const L = leaflet.current;
        if (!L) return;

        for (const [id, { marker, course }] of markers.current) {
            marker.setIcon(pinIcon(L, course, !!selected && key(selected) === id));
        }

        const clickedPin = fromMap.current;
        fromMap.current = false;
        if (clickedPin || !selected) return;

        // Picked from the list instead: show the same card the pin would have shown. A course
        // hidden inside a cluster needs the cluster opened first, which zoomToShowLayer does before
        // running the callback; the popup's own autoPan then frames the card.
        const entry = markers.current.get(key(selected));
        if (entry) cluster.current?.zoomToShowLayer(entry.marker, () => entry.marker.openPopup());
    }, [selected, courses]);

    // Tearing the map down belongs to unmount alone: doing it in the effects above would rebuild it
    // on every filter change.
    useEffect(() => () => {
        resize.current?.disconnect();
        resize.current = null;
        map.current?.remove();
        map.current = null;
        cluster.current = null;
        markers.current.clear();
    }, []);

    return <div ref={holder} className="map-frame" />;
}
