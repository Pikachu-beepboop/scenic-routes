"use client";

// Die Routenkarte der Explore-Seite — 1:1 aus app/explore/page.tsx
// herausgezogen (Markup + CSS unverändert), damit /plan exakt dieselbe Karte
// benutzt, statt eine zweite zu bauen.
//
// Auf /explore (ohne `selectable`) sieht und verhält sich die Karte exakt wie
// bisher: Bild, Titel und "View Route" verlinken zur Detailseite.
//
// GEÄNDERT — Auswahl-Modus (`selectable`, nur Route Planner):
//   - Die ganze Karte ist die Klickfläche zum Auswählen/Abwählen. Dafür liegt
//     ein unsichtbarer, echter <button> über der Karte (bleibt per Tastatur und
//     Screenreader bedienbar und vermeidet verschachtelte Links/Buttons).
//   - Nur "View Route" führt zur Detailseite; Bild und Titel sind in diesem
//     Modus keine Links, damit man nicht versehentlich wegnavigiert.
//   - Die Add/Added-Pille ist eine reine Anzeige (<span>) mit deckendem
//     Hintergrund — auf hellen Fotos gut lesbar und von den globalen
//     Button-Resets aus profile.css nicht betroffen (die hatten auf /plan
//     Hintergrund und Schriftgröße der alten Pille überschrieben).
//   - Neuer Zustand `removing`: Trip-Route, die beim Speichern entfernt wird.
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
   * NEU: Trip-Route, die abgewählt wurde und beim Speichern entfernt wird
   * (Trip-bearbeiten-Modus auf /plan). Nur Optik.
   */
  removing?: boolean;

  /**
   * Freie Pille unten rechts auf dem Bild — der Route Planner zeigt darin die
   * gemessene Mehrfahrzeit des Umwegs. Ohne Wert bleibt die Karte unverändert.
   */
  badge?: ReactNode;
  /** true färbt die Pille als "liegt über der eingestellten Grenze" ein. */
  badgeMuted?: boolean;

  /**
   * NEU: Ziel des "View Route"-Links. Standard ist /routedetail/<id>; der
   * Route Planner hängt ?from=<Planner-Adresse> an, damit die Detailseite
   * dorthin zurückführt.
   */
  detailHref?: string;
  /** NEU: wird vor dem Wechsel zur Detailseite aufgerufen (Planner: Stand merken). */
  onViewRoute?: (routeId: string) => void;
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
  removing = false,
  badge,
  badgeMuted = false,
  detailHref,
  onViewRoute,
}: RouteCardProps) {
  const { lang } = useLanguage();
  const { unit } = useUnit();

  const title = localizedRouteText(route, "title", lang);
  const detailLink = detailHref ?? `/routedetail/${route.id}`;
  const selectMode = selectable && Boolean(onToggleSelect);
  const isSelected = selectMode && selected;
  const isRemoving = selectMode && !selected && removing;

  const image = (
    <img
      src={route.image_url || fallbackImage}
      alt={title}
      onError={(e) => {
        e.currentTarget.src = fallbackImage;
      }}
    />
  );

  const cardClass = [
    "route-card",
    selectMode ? "route-card-selectable" : "",
    isSelected ? "route-card-selected" : "",
    isRemoving ? "route-card-removing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cardClass}>
      {/* NEU: unsichtbare Klickfläche über der ganzen Karte (nur Auswahl-Modus) */}
      {selectMode && (
        <button
          type="button"
          className="route-card-hit"
          onClick={() => onToggleSelect?.(route.id)}
          aria-pressed={isSelected}
          aria-label={`${title} – ${isSelected ? selectedLabel : selectLabel}`}
        />
      )}

      <div className="route-card-img">
        {selectMode ? (
          image
        ) : (
          // prefetch={false}: /routedetail/[id] wird nicht vorgerendert -> Prefetch-Payload existiert nicht (siehe ROUTING.md)
          <Link href={`/routedetail/${route.id}`} prefetch={false}>
            {image}
          </Link>
        )}

        {/* NEU: goldener Schleier für ausgewählte Karten */}
        {selectMode && <span className="route-card-tint" aria-hidden="true" />}

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

        {/* GEÄNDERT: reine Anzeige statt Button — die Klickfläche ist die Karte */}
        {selectMode && (
          <span
            className={`route-card-select ${isSelected ? "is-selected" : ""}`}
            aria-hidden="true"
          >
            {/* Beide Icons/Labels liegen übereinander und blenden ineinander
                über — keine Breitensprünge, kein harter Austausch. */}
            <span className="route-card-select-icon">
              <Plus size={12} strokeWidth={2.4} className="rcs-icon rcs-icon-add" />
              <Check size={12} strokeWidth={3} className="rcs-icon rcs-icon-check" />
            </span>
            <span className="route-card-select-label">
              <span className="rcs-label rcs-label-add">{selectLabel}</span>
              <span className="rcs-label rcs-label-check">{selectedLabel}</span>
            </span>
          </span>
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
        {selectMode ? (
          <div className="route-card-title">{title}</div>
        ) : (
          <Link href={`/routedetail/${route.id}`} prefetch={false}>
            <div className="route-card-title">{title}</div>
          </Link>
        )}
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
          {/* Liegt über der Klickfläche: führt immer zur Detailseite und
              wählt die Karte nicht aus. */}
          <Link
            href={detailLink}
            prefetch={false}
            className="view-route-btn"
            onClick={() => onViewRoute?.(route.id)}
          >
            {viewRouteLabel} <ArrowRight size={12} strokeWidth={2.5} className="view-route-arrow" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * CSS der Karte — wortgleich aus app/explore/page.tsx übernommen, inklusive
 * der Mobile-Overrides. Die Regeln für den Auswahl-Modus stehen gesammelt im
 * Abschnitt "Auswahl-Modus" und benutzen ausschliesslich bestehende
 * CSS-Variablen.
 */
export const ROUTE_CARD_STYLES = `
        .route-card { position:relative; border-radius:20px; overflow:hidden; background:var(--bg3); border:1px solid var(--border); transition:transform .4s cubic-bezier(.25,.46,.45,.94),box-shadow .4s,border-color .4s; cursor:pointer; display:flex; flex-direction:column; height:100%; }
        .route-card:hover { transform:translateY(-6px); box-shadow:0 32px 80px rgba(0,0,0,0.3); border-color:rgba(201,168,106,0.22); }
        .route-card-img { position:relative; height:240px; flex-shrink:0; overflow:hidden; }
        .route-card-img img { width:100%; height:100%; object-fit:cover; transition:transform .7s ease, filter .45s ease; filter:brightness(0.88); }
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

        /* ------------------------------------------------ Auswahl-Modus
           Nur Route Planner. Die ganze Karte ist die Klickfläche
           (.route-card-hit), Pille/Badges lassen Klicks durch, nur
           "View Route" und der Herz-Button liegen darüber. Selektoren mit
           Element-Präfix bzw. doppelter Klasse, damit globale Button-Resets
           aus profile.css nicht greifen. */
        .route-card button.route-card-hit { position:absolute; inset:0; z-index:4; width:100%; height:100%; margin:0; padding:0; border:none; border-radius:inherit; background:transparent; cursor:pointer; font:inherit; color:inherit; }
        .route-card button.route-card-hit:focus-visible { outline:2px solid var(--gold); outline-offset:-3px; }
        .route-card-selectable .route-card-type,
        .route-card-selectable .route-card-badge,
        .route-card-selectable .route-card-select,
        .route-card-selectable .route-card-tint { pointer-events:none; }
        .route-card-selectable .save-btn { z-index:6; }
        .route-card-selectable .view-route-btn { position:relative; z-index:6; }

        /* Ein gemeinsames, weiches Timing für den ganzen Auswahl-Modus */
        .route-card-selectable { --rc-ease:cubic-bezier(.22,1,.36,1); --rc-dur:.55s; transition:transform .45s var(--rc-ease), box-shadow var(--rc-dur) var(--rc-ease), border-color var(--rc-dur) var(--rc-ease); }

        /* Pille oben links — Milchglas (Glassmorphism) */
        .route-card-select { position:absolute; top:14px; left:14px; z-index:5; display:inline-flex; align-items:center; gap:9px; padding:5px 15px 5px 5px; border-radius:999px;
          background:linear-gradient(135deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.08) 100%);
          backdrop-filter:blur(22px) saturate(180%); -webkit-backdrop-filter:blur(22px) saturate(180%);
          border:1px solid rgba(255,255,255,0.38);
          box-shadow:0 10px 30px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(255,255,255,0.06);
          font-family:var(--sans, 'Inter', system-ui, sans-serif); font-size:9.5px; font-weight:600; line-height:1; letter-spacing:0.16em; text-transform:uppercase; color:#fff; text-shadow:0 1px 6px rgba(0,0,0,0.35);
          transition:background var(--rc-dur) var(--rc-ease), border-color var(--rc-dur) var(--rc-ease), box-shadow var(--rc-dur) var(--rc-ease), transform var(--rc-dur) var(--rc-ease); }
        .route-card-select-icon { position:relative; display:grid; place-items:center; width:24px; height:24px; border-radius:50%;
          background:rgba(255,255,255,0.18); border:1px solid rgba(255,255,255,0.45);
          transition:background var(--rc-dur) var(--rc-ease), border-color var(--rc-dur) var(--rc-ease), transform var(--rc-dur) var(--rc-ease); }
        .rcs-icon { grid-area:1/1; transition:opacity var(--rc-dur) var(--rc-ease), transform var(--rc-dur) var(--rc-ease); }
        .rcs-icon-add { opacity:1; transform:rotate(0deg) scale(1); color:#fff; }
        .rcs-icon-check { opacity:0; transform:rotate(-90deg) scale(.5); color:#8a6a2e; }
        .route-card-select-label { display:grid; }
        .rcs-label { grid-area:1/1; padding-top:1px; transition:opacity var(--rc-dur) var(--rc-ease), transform var(--rc-dur) var(--rc-ease); }
        .rcs-label-add { opacity:1; transform:translateY(0); }
        .rcs-label-check { opacity:0; transform:translateY(5px); }

        /* Hover (nicht ausgewählt): Glas wird klarer, Plus dreht sich an */
        .route-card-selectable:hover .route-card-select:not(.is-selected) { background:linear-gradient(135deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.14) 100%); border-color:rgba(255,255,255,0.6); transform:translateY(-1px); }
        .route-card-selectable:hover .route-card-select:not(.is-selected) .rcs-icon-add { transform:rotate(90deg) scale(1.05); }

        /* Ausgewählt: warm getöntes Goldglas, Plus dreht in den Haken */
        .route-card-select.is-selected { background:linear-gradient(135deg, rgba(214,180,112,0.62) 0%, rgba(201,168,106,0.30) 100%); border-color:rgba(240,214,160,0.75); box-shadow:0 10px 30px rgba(120,90,30,0.30), inset 0 1px 0 rgba(255,240,210,0.55), inset 0 -1px 0 rgba(255,255,255,0.08); }
        .route-card-select.is-selected .route-card-select-icon { background:rgba(255,255,255,0.95); border-color:rgba(255,255,255,0.95); transform:scale(1.04); }
        .route-card-select.is-selected .rcs-icon-add { opacity:0; transform:rotate(90deg) scale(.5); }
        .route-card-select.is-selected .rcs-icon-check { opacity:1; transform:rotate(0deg) scale(1); }
        .route-card-select.is-selected .rcs-label-add { opacity:0; transform:translateY(-5px); }
        .route-card-select.is-selected .rcs-label-check { opacity:1; transform:translateY(0); }

        /* "View Route" im Auswahl-Modus: schlanke Outline-Pille, füllt sich sanft */
        .route-card-selectable .view-route-btn { gap:8px; padding:9px 16px; border-radius:999px; border:1px solid color-mix(in srgb, var(--gold) 40%, transparent); background:color-mix(in srgb, var(--gold) 6%, transparent); color:var(--gold); transition:background .4s var(--rc-ease), color .4s var(--rc-ease), border-color .4s var(--rc-ease), box-shadow .4s var(--rc-ease); }
        .route-card-selectable .view-route-btn:hover { background:var(--gold); border-color:var(--gold); color:#0c0b09; box-shadow:0 8px 22px color-mix(in srgb, var(--gold) 30%, transparent); }
        .route-card-selectable .view-route-arrow { transition:transform .4s var(--rc-ease); }
        .route-card-selectable .view-route-btn:hover .view-route-arrow { transform:translateX(3px); }

        /* Goldener Schleier + Rahmen bei Auswahl — weich ein- und ausgeblendet */
        .route-card-tint { position:absolute; inset:0; z-index:1; background:linear-gradient(160deg, color-mix(in srgb, var(--gold) 30%, transparent) 0%, transparent 50%); opacity:0; transition:opacity var(--rc-dur) var(--rc-ease); }
        .route-card-selected .route-card-tint { opacity:1; }
        .route-card-selected { border-color:color-mix(in srgb, var(--gold) 85%, transparent); box-shadow:0 0 0 1px color-mix(in srgb, var(--gold) 60%, transparent), 0 24px 60px color-mix(in srgb, var(--gold) 16%, transparent); }
        .route-card-selected:hover { border-color:var(--gold); }

        /* Wird entfernt (Trip-bearbeiten-Modus) */
        .route-card-removing { border-color:rgba(224,128,128,0.4); }
        .route-card-removing .route-card-img img { filter:grayscale(.85) brightness(.5); }
        .route-card-removing .route-card-title { color:var(--dim); }

        /* Freie Pille unten rechts (Route Planner: gemessene Mehrfahrzeit). */
        .route-card-badge { position:absolute; bottom:12px; right:12px; z-index:5; display:inline-flex; align-items:center; gap:5px; padding:6px 11px; border-radius:999px;
          background:linear-gradient(135deg, rgba(12,11,9,0.42) 0%, rgba(12,11,9,0.22) 100%); backdrop-filter:blur(18px) saturate(160%); -webkit-backdrop-filter:blur(18px) saturate(160%);
          border:1px solid rgba(232,207,150,0.45); box-shadow:0 6px 18px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12);
          font-size:8px; font-weight:700; letter-spacing:0.16em; text-transform:uppercase; color:#EBD5A4; text-shadow:0 1px 4px rgba(0,0,0,0.4);
          transition:color .5s ease, border-color .5s ease; }
        .route-card-badge.is-muted { border-color:rgba(255,255,255,0.2); color:rgba(255,255,255,0.78); }
        .route-card-removing .route-card-badge { border-color:rgba(224,128,128,0.55); color:#e08080; }

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
          .route-card-select { top:8px; left:8px; gap:7px; padding:4px 12px 4px 4px; font-size:8.5px; }
          .route-card-select-icon { width:20px; height:20px; }
          .route-card-selectable .view-route-btn { padding:7px 12px; }
          .route-card-badge { bottom:8px; right:8px; padding:4px 9px; font-size:7px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .route-card-selectable, .route-card-select, .route-card-select-icon, .rcs-icon, .rcs-label,
          .route-card-tint, .route-card-selectable .view-route-arrow { transition:none; }
        }
`;