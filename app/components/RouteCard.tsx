"use client";

// Die Routenkarte der Explore-Seite — 1:1 aus app/explore/page.tsx
// herausgezogen (Markup + CSS unverändert), damit /plan exakt dieselbe Karte
// benutzt, statt eine zweite zu bauen.
//
// Neu gegenüber der Inline-Variante ist ausschliesslich der optionale
// Auswahl-Modus (`selectable`), den der Route Planner braucht: eine zusätzliche
// Pille oben links auf dem Bild. Auf /explore wird dieser Modus nicht gesetzt,
// die Karte sieht und verhält sich dort also unverändert.
//
// `ROUTE_CARD_STYLES` wird von jeder Seite in ihren eigenen <style>-Block
// interpoliert — dieselbe Konvention wie im restlichen Projekt, und es bleibt
// beim bestehenden CSS-Variablensystem (--bg3, --gold, --cream, …).

import Link from "next/link";
import type { ReactNode } from "react";
import { Clock, Navigation, Star, Heart, ArrowRight, MapPin, Check, Plus } from "lucide-react";
import { useLanguage } from "../LanguageContext";
import { useUnit } from "../UnitContext";
import { formatDistance } from "@/lib/formatDistance";

export type RouteCardRoute = {
  id: string;
  title?: string | null;
  country?: string | null;
  distance_km?: number | null;
  image_url?: string | null;
  duration?: string | null;
  type?: string | null;
  description?: string | null;
  rating?: number | null;
};

// Sprachabhängiges Feld lesen. Fallback-Kette: aktuelle Sprache -> Englisch ->
// Deutsch -> alte, einsprachige Spalte.
function localizedRouteText(route: RouteCardRoute, field: string, lang: string): string {
  const record = route as unknown as Record<string, unknown>;
  const value =
    record[`${field}_${lang}`] || record[`${field}_en`] || record[`${field}_de`] || record[field];
  return typeof value === "string" ? value : "";
}

type RouteCardProps = {
  route: RouteCardRoute;
  /** Beschriftung des "View Route"-Links (kommt aus translations.ts). */
  viewRouteLabel: string;
  /** Bild, das bei einem 404 eingesetzt wird — je Seite unterschiedlich. */
  fallbackImage?: string;

  /** Herz-Button: nur rendern, wenn ein Handler übergeben wird. */
  saved?: boolean;
  onToggleSave?: (routeId: string) => void;
  saveLabel?: string;
  unsaveLabel?: string;

  /** Auswahl-Modus für den Route Planner. */
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (routeId: string) => void;
  selectLabel?: string;
  selectedLabel?: string;

  /**
   * Freie Pille unten rechts auf dem Bild — der Route Planner zeigt darin die
   * gemessene Mehrfahrzeit des Umwegs. Ohne Wert bleibt die Karte unverändert.
   */
  badge?: ReactNode;
  /** true färbt die Pille als "liegt über der eingestellten Grenze" ein. */
  badgeMuted?: boolean;
};

export default function RouteCard({
  route,
  viewRouteLabel,
  fallbackImage = "/iceland.jpg",
  saved = false,
  onToggleSave,
  saveLabel = "Save route",
  unsaveLabel = "Remove from saved routes",
  selectable = false,
  selected = false,
  onToggleSelect,
  selectLabel = "Add",
  selectedLabel = "Added",
  badge,
  badgeMuted = false,
}: RouteCardProps) {
  const { lang } = useLanguage();
  const { unit } = useUnit();

  const title = localizedRouteText(route, "title", lang);

  return (
    <div className={`route-card ${selectable && selected ? "route-card-selected" : ""}`}>
      <div className="route-card-img">
        {/* prefetch={false}: /routedetail/[id] wird nicht vorgerendert -> Prefetch-Payload existiert nicht (siehe ROUTING.md) */}
        <Link href={`/routedetail/${route.id}`} prefetch={false}>
          <img
            src={route.image_url || fallbackImage}
            alt={title}
            onError={(e) => {
              e.currentTarget.src = fallbackImage;
            }}
          />
        </Link>

        {onToggleSave && (
          <button
            className="save-btn"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleSave(route.id);
            }}
            aria-label={saved ? unsaveLabel : saveLabel}
          >
            <Heart
              size={16}
              strokeWidth={2}
              fill={saved ? "#ef4444" : "transparent"}
              stroke={saved ? "#ef4444" : "rgba(237,229,212,0.8)"}
            />
          </button>
        )}

        {selectable && onToggleSelect && (
          <button
            className={`route-card-select ${selected ? "is-selected" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleSelect(route.id);
            }}
            aria-pressed={selected}
          >
            {selected ? <Check size={12} strokeWidth={3} /> : <Plus size={12} strokeWidth={3} />}
            {selected ? selectedLabel : selectLabel}
          </button>
        )}

        {route.type && <div className="route-card-type">{route.type}</div>}

        {badge && (
          <div className={`route-card-badge ${badgeMuted ? "is-muted" : ""}`}>{badge}</div>
        )}
      </div>

      <div className="route-card-body">
        <div className="route-card-country">
          <MapPin size={10} strokeWidth={2.2} className="route-card-pin" />
          {route.country}
        </div>
        <Link href={`/routedetail/${route.id}`} prefetch={false}>
          <div className="route-card-title">{title}</div>
        </Link>
        <p className="route-card-desc">{localizedRouteText(route, "description", lang)}</p>
        <div className="route-card-meta">
          {route.duration && (
            <div className="route-card-meta-item">
              <Clock size={12} strokeWidth={2} />
              {route.duration}
            </div>
          )}
          {route.distance_km && (
            <div className="route-card-meta-item">
              <Navigation size={12} strokeWidth={2} />
              {formatDistance(route.distance_km, unit)}
            </div>
          )}
        </div>
        <div
          className="route-card-footer"
          style={!route.rating ? { justifyContent: "flex-end" } : undefined}
        >
          {route.rating && (
            <div className="route-card-rating">
              <Star size={13} strokeWidth={1.8} fill="currentColor" /> {route.rating.toFixed(1)}
            </div>
          )}
          <Link
            href={`/routedetail/${route.id}`}
            prefetch={false}
            className="view-route-btn"
          >
            {viewRouteLabel} <ArrowRight size={12} strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * CSS der Karte — wortgleich aus app/explore/page.tsx übernommen, inklusive
 * der Mobile-Overrides. Neu sind nur die `.route-card-select`-Regeln für den
 * Auswahl-Modus; sie benutzen ausschliesslich bestehende CSS-Variablen.
 */
export const ROUTE_CARD_STYLES = `
        .route-card { position:relative; border-radius:20px; overflow:hidden; background:var(--bg3); border:1px solid var(--border); transition:transform .4s cubic-bezier(.25,.46,.45,.94),box-shadow .4s,border-color .4s; cursor:pointer; display:flex; flex-direction:column; height:100%; }
        .route-card:hover { transform:translateY(-6px); box-shadow:0 32px 80px rgba(0,0,0,0.3); border-color:rgba(201,168,106,0.22); }
        .route-card-img { position:relative; height:240px; flex-shrink:0; overflow:hidden; }
        .route-card-img img { width:100%; height:100%; object-fit:cover; transition:transform .7s ease; filter:brightness(0.88); }
        .route-card:hover .route-card-img img { transform:scale(1.07); }
        .route-card-img::after { content:""; position:absolute; inset:0; background:linear-gradient(to bottom,transparent 50%,rgba(0,0,0,0.6) 100%); pointer-events:none; }
        .save-btn { position:absolute; top:12px; right:12px; z-index:5; width:36px; height:36px; border-radius:50%; background:rgba(12,11,9,0.55); backdrop-filter:blur(12px); border:1px solid rgba(237,229,212,0.18); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity .25s,background .25s; }
        .route-card:hover .save-btn { opacity:1; }
        .save-btn:hover { background:rgba(12,11,9,0.85); }
        .route-card-type { position:absolute; bottom:12px; left:12px; z-index:5; padding:5px 10px; border-radius:999px; background:rgba(12,11,9,0.65); backdrop-filter:blur(12px); border:1px solid rgba(237,229,212,0.16); font-size:8px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:rgba(237,229,212,0.8); }
        .route-card-body { padding:18px 18px 20px; display:flex; flex-direction:column; flex:1; }
        .route-card-country { font-size:9px; font-weight:700; letter-spacing:0.22em; text-transform:uppercase; color:var(--gold); margin-bottom:6px; display:flex; align-items:center; gap:5px; }
        .route-card-title { font-family:var(--serif); font-size:22px; font-weight:400; color:var(--cream); line-height:1.05; letter-spacing:-0.02em; margin-bottom:8px; min-height:46.2px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .route-card-desc { font-size:12px; color:var(--dim); line-height:1.65; font-weight:300; margin-bottom:14px; min-height:39.6px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .route-card-meta { display:flex; align-items:center; gap:14px; margin-bottom:16px; }
        .route-card-meta-item { display:flex; align-items:center; gap:5px; font-size:10px; color:var(--dim); font-weight:500; }
        .route-card-meta-item svg { opacity:0.65; flex-shrink:0; }
        .route-card-footer { display:flex; align-items:center; justify-content:space-between; padding-top:14px; border-top:1px solid var(--border); margin-top:auto; }
        .route-card-rating { display:flex; align-items:center; gap:5px; font-size:11px; color:var(--gold); font-weight:700; }
        .view-route-btn { font-size:10px; font-weight:800; letter-spacing:0.16em; text-transform:uppercase; color:var(--gold); transition:color .2s; display:flex; align-items:center; gap:6px; }
        .view-route-btn:hover { color:var(--cream); }

        .route-card-pin { display:none; color:var(--gold); flex-shrink:0; }

        /* Auswahl-Modus (nur Route Planner) — dauerhaft sichtbar, damit er
           auch ohne Hover auf Touch-Geraeten bedienbar bleibt. */
        .route-card-select { position:absolute; top:12px; left:12px; z-index:6; display:flex; align-items:center; gap:6px; padding:7px 12px; border-radius:999px; background:rgba(12,11,9,0.62); backdrop-filter:blur(12px); border:1px solid rgba(237,229,212,0.22); font-size:8px; font-weight:800; letter-spacing:0.16em; text-transform:uppercase; color:rgba(237,229,212,0.88); transition:background .2s, border-color .2s, color .2s; }
        .route-card-select:hover { border-color:var(--gold); color:#fff; }
        .route-card-select.is-selected { background:var(--gold); border-color:var(--gold); color:#0c0b09; }
        .route-card-selected { border-color:var(--gold); box-shadow:0 0 0 1px var(--gold); }

        /* Freie Pille unten rechts (Route Planner: gemessene Mehrfahrzeit). */
        .route-card-badge { position:absolute; bottom:12px; right:12px; z-index:5; display:inline-flex; align-items:center; gap:5px; padding:5px 10px; border-radius:999px; background:rgba(12,11,9,0.65); backdrop-filter:blur(12px); border:1px solid color-mix(in srgb, var(--gold) 45%, transparent); font-size:8px; font-weight:800; letter-spacing:0.16em; text-transform:uppercase; color:var(--gold); }
        .route-card-badge.is-muted { border-color:rgba(237,229,212,0.16); color:rgba(237,229,212,0.7); }

        @media (max-width:760px) {
          .route-card-pin { display:inline-flex; }
          .route-card-img { height:140px; }
          .route-card-body { padding:12px 14px 14px; }
          .route-card-country { font-size:8px; margin-bottom:4px; }
          .route-card-title { font-size:16px; min-height:auto; -webkit-line-clamp:1; margin-bottom:5px; }
          .route-card-desc { -webkit-line-clamp:1; min-height:auto; margin-bottom:9px; font-size:11px; }
          .route-card-meta { gap:9px; margin-bottom:9px; }
          .route-card-meta-item { font-size:9px; }
          .route-card-footer { padding-top:9px; }
          .view-route-btn { font-size:9px; }
          .route-card-select { top:8px; left:8px; padding:6px 10px; font-size:7px; }
          .route-card-badge { bottom:8px; right:8px; padding:4px 9px; font-size:7px; }
        }
`;
