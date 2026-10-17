"use client";

// Trip Builder.
//
// NEU (Entwurf B): Ein geöffneter Trip erscheint als Vollbild-Karte mit Glas-Panel
// rechts — Tage als Tabs, Routen nummeriert in der Farbe ihres Tages, Fahrstrecke
// über alle Stopps (eine Directions-Anfrage) und Link in Google Maps. Die
// /trip ohne ?id= leitet zu /my-trips weiter (die alte Übersicht ist entfernt).
//
// Bewusst unter dem statischen Segment /trip mit ?id=<uuid> statt als
// dynamische Route /trip/[id]: dynamische Segmente sind auf Cloudflare Pages
// nicht vorgerendert und erzeugen die in ROUTING.md beschriebenen
// Prefetch-404er. Mit Query-Parameter bleibt die Seite eine ganz normale,
// vorgerenderte Client-Page.
//
// NEU: Passende Routen für genau diese Strecke ergänzen. Die Links führen zu
// /plan?trip=<id> (neue Routen landen am letzten Tag) bzw.
// /plan?trip=<id>&day=<dayId> (neue Routen landen an genau diesem Tag).
// Der Planner übernimmt Start/Ziel des Trips und rechnet automatisch.

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus, Trash2, ChevronUp, ChevronDown, GripVertical, Navigation,
  Route as RouteIcon, ArrowLeft, Compass, Globe, Pencil, Info,
} from "lucide-react";
import { useTheme } from "next-themes";

import PlannerNav from "../components/PlannerNav";
import { ThemeSwitch } from "../components/ThemeSwitch";
import ConfirmDialog from "../components/ConfirmDialog";
import GoogleMapsGate from "../components/GoogleMapsGate";
import { computeDirections, loadGoogleMaps, overviewPathToLngLat } from "../../lib/googleMaps";
import { useLanguage } from "../LanguageContext";
import { useUnit } from "../UnitContext";
import { useAuth } from "../../lib/useAuth";
import { formatDistance } from "@/lib/formatDistance";
import {
  addTripDay,
  deleteTrip,
  deleteTripDay,
  deleteTripStop,
  fetchTrip,
  persistDayNumbers,
  persistStopOrder,
  touchTrip,
  updateTripTitle,
  type TripRoute,
} from "../../lib/trips";

import "../profile/profile.css";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Texte für die "Routen ergänzen"-Links. Lokal statt in
// lib/translations, gleiches Muster wie GoogleMapsGate — kann später in die
// zentrale Übersetzungsdatei wandern.
const ADD_TEXT = {
  de: { findRoutes: "Passende Routen finden", addRoutes: "Routen hinzufügen" },
  en: { findRoutes: "Find routes for this trip", addRoutes: "Add routes" },
  ru: { findRoutes: "Найти маршруты для поездки", addRoutes: "Добавить маршруты" },
} as const;

type AddLang = keyof typeof ADD_TEXT;

// NEU: Texte der Kartenansicht (Trip B: Karte + Glas-Panel)
const TV_TEXT = {
  de: {
    allDays: "Alle Tage",
    addDayShort: "Tag",
    scenicKm: "{d} Panoramastrecke",
    driving: "{t} Fahrzeit",
    dayStats: "{d}, {t}",
    openTrip: "Ganze Reise in Google Maps öffnen",
    openDay: "Tag {n} in Google Maps öffnen",
    noCoords: "Für diese Routen fehlen noch Koordinaten",
    yourDrive: "Deine Fahrt: {start} nach {end}",
    myTrips: "My Trips",
    allTrips: "Alle Trips",
    newTrip: "Neuer Trip",
    delete: "Löschen",
    editTitle: "Titel bearbeiten",
    mapLoading: "Strecke wird berechnet …",
    details: "Routendetails",
  },
  en: {
    allDays: "All days",
    addDayShort: "Day",
    scenicKm: "{d} scenic",
    driving: "{t} driving",
    dayStats: "{d}, {t}",
    openTrip: "Open the whole trip in Google Maps",
    openDay: "Open day {n} in Google Maps",
    noCoords: "These routes don't have coordinates yet",
    yourDrive: "Your drive: {start} to {end}",
    myTrips: "My trips",
    allTrips: "All trips",
    newTrip: "New trip",
    delete: "Delete",
    editTitle: "Edit title",
    mapLoading: "Working out the drive …",
    details: "Route details",
  },
  ru: {
    allDays: "Все дни",
    addDayShort: "День",
    scenicKm: "{d} живописных дорог",
    driving: "{t} в пути",
    dayStats: "{d}, {t}",
    openTrip: "Открыть всю поездку в Google Maps",
    openDay: "Открыть день {n} в Google Maps",
    noCoords: "Для этих маршрутов ещё нет координат",
    yourDrive: "Ваш маршрут: {start} — {end}",
    myTrips: "Мои поездки",
    allTrips: "Все поездки",
    newTrip: "Новая поездка",
    delete: "Удалить",
    editTitle: "Изменить название",
    mapLoading: "Рассчитываем маршрут …",
    details: "Подробнее о маршруте",
  },
} as const;

/** Farbe je Tag — Karte, Tabs und Nummern nutzen dieselbe. */
const DAY_COLORS = ["#C9A86A", "#7FA7B5", "#8FB07A", "#C98A7A", "#9C8FC4", "#D0A15B"];
const dayColor = (index: number) => DAY_COLORS[index % DAY_COLORS.length];

type LatLng = { lat: number; lng: number };

function toNum(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

/** Start- und Endpunkt einer Route (falls in der Datenbank gepflegt). */
function routePoints(route: TripRoute | null): { start: LatLng; end: LatLng; mid: LatLng } | null {
  if (!route) return null;
  const r = route as unknown as Record<string, unknown>;
  const sLat = toNum(r.start_lat), sLng = toNum(r.start_lng), eLat = toNum(r.end_lat), eLng = toNum(r.end_lng);
  if (sLat === null || sLng === null) return null;
  const start = { lat: sLat, lng: sLng };
  const end = eLat !== null && eLng !== null ? { lat: eLat, lng: eLng } : start;
  return { start, end, mid: { lat: (start.lat + end.lat) / 2, lng: (start.lng + end.lng) / 2 } };
}

function fmtDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

const pointText = (p: LatLng) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;

/* NEU: Nummern auf die gefahrene Linie setzen. Google liefert Punkte als LatLng-Objekte
   (lat()/lng()) — hier in einfache {lat,lng} umwandeln und rechnen. */
function toLatLng(p: any): LatLng {
  return { lat: typeof p.lat === "function" ? p.lat() : p.lat, lng: typeof p.lng === "function" ? p.lng() : p.lng };
}
function approxDist(a: LatLng, b: LatLng): number {
  const dx = (a.lng - b.lng) * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  return Math.hypot(dx, a.lat - b.lat);
}
/** Punkt in der Mitte eines Linienzugs (nach Länge, nicht nach Anzahl der Punkte). */
function pathMidpoint(path: LatLng[]): LatLng | null {
  if (path.length === 0) return null;
  if (path.length === 1) return path[0];
  let total = 0;
  for (let i = 1; i < path.length; i++) total += approxDist(path[i - 1], path[i]);
  let half = total / 2;
  for (let i = 1; i < path.length; i++) {
    const seg = approxDist(path[i - 1], path[i]);
    if (seg >= half && seg > 0) {
      const t = half / seg;
      return { lat: path[i - 1].lat + (path[i].lat - path[i - 1].lat) * t, lng: path[i - 1].lng + (path[i].lng - path[i - 1].lng) * t };
    }
    half -= seg;
  }
  return path[path.length - 1];
}
/** Nächster Punkt eines Linienzugs zu einem Ziel. */
function nearestOnPath(path: LatLng[], target: LatLng): LatLng | null {
  let best: LatLng | null = null;
  let bestD = Infinity;
  for (const p of path) {
    const d = approxDist(p, target);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}
/** Alle Punkte eines Abschnitts (leg) der Directions-Antwort, in Fahrtrichtung. */
function legPath(leg: any): LatLng[] {
  const out: LatLng[] = [];
  for (const step of leg?.steps ?? []) for (const p of step?.path ?? step?.lat_lngs ?? []) out.push(toLatLng(p));
  return out;
}

/** Google-Maps-Link (Navigation) — höchstens 9 Zwischenziele, mehr nimmt die App nicht an. */
function mapsDirUrl(origin: string, destination: string, waypoints: LatLng[]): string {
  let points = waypoints;
  if (points.length > 9) {
    const step = points.length / 9;
    points = Array.from({ length: 9 }, (_, i) => points[Math.floor(i * step)]);
  }
  const params = new URLSearchParams({ api: "1", origin, destination, travelmode: "driving" });
  if (points.length) params.set("waypoints", points.map(pointText).join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

type BuilderStop = {
  id: string;
  routeId: string;
  route: TripRoute | null;
};

type BuilderDay = {
  id: string;
  dayNumber: number;
  label: string | null;
  stops: BuilderStop[];
};

/** Titel einer Route in der aktuellen Sprache, mit Fallback-Kette. */
function localizedTitle(route: TripRoute | null, lang: string): string {
  if (!route) return "";
  const record = route as unknown as Record<string, unknown>;
  const value =
    record[`title_${lang}`] || record.title_en || record.title_de || record.title;
  return typeof value === "string" ? value : "";
}

/**
 * Verschiebt einen Stopp innerhalb eines Tages oder zwischen zwei Tagen.
 * Rein funktional — liefert eine neue Tagesliste oder null, wenn der Zug
 * nichts verändert hätte.
 */
function moveStop(
  days: BuilderDay[],
  fromDayId: string,
  stopId: string,
  toDayId: string,
  toIndex: number
): BuilderDay[] | null {
  const next = days.map((day) => ({ ...day, stops: [...day.stops] }));

  const from = next.find((day) => day.id === fromDayId);
  const to = next.find((day) => day.id === toDayId);
  if (!from || !to) return null;

  const fromIndex = from.stops.findIndex((stop) => stop.id === stopId);
  if (fromIndex === -1) return null;

  const [moved] = from.stops.splice(fromIndex, 1);

  // Beim Verschieben innerhalb eines Tages rutscht alles hinter der alten
  // Position um eins nach vorne — der Zielindex muss das mitnehmen.
  let insertAt = toIndex;
  if (from === to && fromIndex < toIndex) insertAt -= 1;
  insertAt = Math.max(0, Math.min(insertAt, to.stops.length));

  if (from === to && insertAt === fromIndex) return null;

  to.stops.splice(insertAt, 0, moved);
  return next;
}

// ----------------------------------------------------------------------
// NEU: Footer — Inhalt und Optik 1:1 wie auf /my-trips (Logo, Tagline,
// vier Link-Spalten, Copyright, Sprachauswahl, Theme-Switch, Akkordeon
// auf Mobile). Klassen mit Präfix "sf-", Button-/Link-Selektoren mit
// Element-Präfix wegen der globalen Resets aus profile.css.
// ----------------------------------------------------------------------

// Identisch zu FOOTER_COLUMNS auf /my-trips.
const FOOTER_COLUMNS = [
  {
    id: "explore",
    headingKey: "footer.col.explore" as const,
    links: [
      { key: "footer.link.allRoutes" as const, href: "/explore", protected: false },
      { key: "footer.link.myTrips" as const, href: "/my-trips", protected: true },
      { key: "footer.link.profile" as const, href: "/profile", protected: true },
    ],
  },
  {
    id: "about",
    headingKey: "footer.col.about" as const,
    links: [
      // Traveller Pass ist ein Tab auf der Profile-Page (?tab=pass).
      { key: "footer.link.travellerPass" as const, href: "/profile?tab=pass", protected: true },
      { key: "footer.link.about" as const, href: "/about", protected: false },
      { key: "footer.link.ourTeam" as const, href: "/about#team", protected: false },
    ],
  },
  {
    id: "support",
    headingKey: "footer.col.support" as const,
    links: [
      // Eingeloggt direkt zum Support-Tab im Profil, sonst zur öffentlichen
      // /support-Seite.
      { key: "footer.link.faq" as const, href: "/support", loggedInHref: "/profile?tab=support", protected: false },
      { key: "footer.link.contact" as const, href: "/support", loggedInHref: "/profile?tab=support", protected: false },
      { key: "footer.link.sendFeedback" as const, href: "/support", loggedInHref: "/profile?tab=support", protected: false },
    ],
  },
  {
    id: "legal",
    headingKey: "footer.col.legal" as const,
    links: [
      { key: "footer.link.termsOfUse" as const, href: "/legal/terms", protected: false },
      { key: "footer.link.privacyPolicy" as const, href: "/legal/privacy", protected: false },
      { key: "footer.link.imprint" as const, href: "/legal/imprint", protected: false },
    ],
  },
];

function PageFooter() {
  const { t, lang, setLang } = useLanguage();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);

  // Logo-Variante hängt am Theme — erst nach dem Mount auswerten, sonst
  // weicht das Server-HTML vom Client ab.
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!showLangMenu) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".sf-lang-wrap")) setShowLangMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showLangMenu]);

  return (
    <footer className="sf">
      <div className="sf-inner">
        <div className="sf-top">
          <div className="sf-brand">
            <div className="sf-logo-container">
              <img
                src="/logodark.png"
                alt="Scenic Routes"
                className={`sf-logo ${mounted && theme === "light" ? "sf-logo-light" : "sf-logo-dark"}`}
              />
            </div>
            <p className="sf-tagline">{t("home.footer.tagline")}</p>
          </div>

          {FOOTER_COLUMNS.map(({ id, headingKey, links }) => {
            const isOpen = openSection === id;
            return (
              <div className="sf-col" key={id}>
                {/* Auf Desktop wirkungslos (pointer-events:none), auf Mobile
                    klappt der Kopf die Spalte auf und zu. */}
                <button
                  type="button"
                  className="sf-col-header"
                  onClick={() => setOpenSection(isOpen ? null : id)}
                  aria-expanded={isOpen}
                >
                  <span className="sf-col-title">{t(headingKey)}</span>
                  <ChevronDown size={14} className={`sf-col-chevron ${isOpen ? "open" : ""}`} />
                </button>

                <div className={`sf-col-links ${isOpen ? "open" : ""}`}>
                  <div className="sf-col-links-inner">
                    {links.map((link) => {
                      const target =
                        user && "loggedInHref" in link && link.loggedInHref
                          ? link.loggedInHref
                          : link.href;
                      // Geschützte Links ohne Session erst zum Login, mit
                      // Rücksprung zum eigentlichen Ziel.
                      const finalHref =
                        link.protected && !user
                          ? `/login?redirect=${encodeURIComponent(target)}`
                          : target;

                      return (
                        <Link href={finalHref} key={link.key} className="sf-link">
                          {t(link.key)}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="sf-bottom">
          <p className="sf-copy">
            © {new Date().getFullYear()} Explore Scenic Routes. {t("home.footer.rights")}
          </p>

          <div className="sf-controls">
            <div className="sf-lang-wrap">
              <button
                type="button"
                className="sf-lang-btn"
                onClick={() => setShowLangMenu((prev) => !prev)}
                aria-expanded={showLangMenu}
              >
                <Globe size={12} strokeWidth={2} /> {lang.toUpperCase()}
              </button>

              {showLangMenu && (
                <div className="sf-lang-menu">
                  {(
                    [
                      ["en", "English"],
                      ["de", "Deutsch"],
                      ["ru", "Русский"],
                    ] as const
                  ).map(([code, label]) => (
                    <button
                      key={code}
                      type="button"
                      className={`sf-lang-option ${lang === code ? "active" : ""}`}
                      onClick={() => {
                        setLang(code);
                        setShowLangMenu(false);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <ThemeSwitch />
          </div>
        </div>
      </div>

      <style>{`
        .sf { position:relative; z-index:5; width:100%; background:var(--bg); border-top:1px solid var(--border); padding:56px clamp(24px,5vw,80px) 28px; font-family:var(--sans, 'Inter', system-ui, sans-serif); transition:background .35s; }
        .sf-inner { max-width:1200px; margin:0 auto; }
        .sf-top { display:grid; grid-template-columns:1.1fr 1fr 1fr 1fr 1fr; gap:28px; padding-bottom:40px; border-bottom:1px solid var(--border); margin-bottom:22px; }

        .sf-logo-container { width:220px; height:147px; display:flex; align-items:center; flex-shrink:0; }
        .sf-logo { display:block; height:auto; }
        .sf-logo-light { width:180px; }
        .sf-logo-dark { width:220px; filter:invert(33%) sepia(46%) saturate(600%) hue-rotate(4deg) brightness(96%) drop-shadow(0 4px 10px rgba(0,0,0,0.6)); }
        .sf-tagline { margin:0 0 18px; max-width:200px; font-size:12px; font-weight:300; line-height:1.7; color:var(--dim); }

        .sf button.sf-col-header { display:flex; align-items:center; justify-content:space-between; width:100%; padding:0; border:none; background:none; text-align:left; cursor:default; pointer-events:none; font:inherit; }
        .sf-col-title { font-size:9px; font-weight:800; letter-spacing:0.28em; text-transform:uppercase; color:var(--dim); }
        .sf-col-chevron { display:none; color:var(--dim); flex-shrink:0; transition:transform .3s; }
        .sf-col-chevron.open { transform:rotate(180deg); color:var(--gold); }
        .sf-col-links { overflow:visible; max-height:none; }
        .sf-col-links-inner { padding-top:14px; }
        .sf a.sf-link { display:block; margin-bottom:10px; font-size:12px; font-weight:300; color:var(--dim); text-decoration:none; transition:color .2s; }
        .sf a.sf-link:hover { color:var(--cream); }

        .sf-bottom { display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; }
        .sf-copy { margin:0; font-size:10px; letter-spacing:0.08em; text-transform:uppercase; color:var(--dim); }
        .sf-controls { display:flex; align-items:center; gap:22px; flex-wrap:wrap; }

        .sf-lang-wrap { position:relative; }
        .sf button.sf-lang-btn { display:flex; align-items:center; gap:6px; padding:8px 14px; border:none; border-radius:0; background:none; font-family:inherit; font-size:16px; font-weight:400; letter-spacing:0.12em; text-transform:uppercase; color:var(--muted); cursor:pointer; transition:color .2s; }
        .sf button.sf-lang-btn:hover { color:var(--cream); }
        /* Wie auf /my-trips: im Light-Theme ist --muted reines Schwarz, der
           Button bekommt deshalb in Ruhe die hellere --dim-Farbe. */
        .light .sf button.sf-lang-btn { color:var(--dim); }
        .light .sf button.sf-lang-btn:hover { color:var(--cream); }
        .sf-lang-menu { position:absolute; bottom:calc(100% + 10px); right:0; z-index:50; min-width:150px; overflow:hidden; border:1px solid var(--border); border-radius:12px; background:color-mix(in srgb, var(--bg) 97%, transparent); backdrop-filter:blur(24px); box-shadow:0 24px 60px rgba(0,0,0,0.55); animation:sfDropIn .2s cubic-bezier(0.22,1,0.36,1); }
        @keyframes sfDropIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .sf button.sf-lang-option { display:block; width:100%; padding:10px 14px; border:none; background:none; text-align:left; font-family:inherit; font-size:12px; font-weight:500; color:var(--muted); cursor:pointer; transition:background .15s, color .15s; }
        .sf button.sf-lang-option:hover { background:color-mix(in srgb, var(--border) 60%, transparent); color:var(--cream); }
        .sf button.sf-lang-option.active { color:var(--gold); font-weight:700; }

        @media (max-width:1100px) {
          .sf-top { grid-template-columns:1fr 1fr 1fr; }
          .sf-top > .sf-brand { grid-column:1 / -1; }
        }

        @media (max-width:760px) {
          .sf-top { grid-template-columns:1fr; }
          .sf-brand { text-align:center; }
          .sf-logo-container { justify-content:center; margin:0 auto; }
          .sf-tagline { margin-left:auto; margin-right:auto; }
          .sf button.sf-col-header { cursor:pointer; pointer-events:auto; }
          .sf-col-chevron { display:block; }
          .sf-col-links { overflow:hidden; max-height:0; transition:max-height .3s ease; }
          .sf-col-links.open { max-height:400px; }
          .sf-bottom { flex-direction:column; align-items:flex-start; }
          .sf-lang-menu { left:0; right:auto; }
        }
      `}</style>
    </footer>
  );
}

function TripBuilder() {
  const searchParams = useSearchParams();
  const tripId = searchParams.get("id") ?? "";
  // NEU: Herkunft — "builder" = aus der Übersicht /trip gekommen. Bestimmt,
  // welcher Rückweg unten angeboten wird, und wird durch /plan durchgereicht.
  const fromBuilder = searchParams.get("from") === "builder";
  const router = useRouter();

  const { t, lang } = useLanguage();
  const tx = ADD_TEXT[(lang as AddLang) in ADD_TEXT ? (lang as AddLang) : "de"];
  const { unit } = useUnit();
  const { user, loading: authLoading } = useAuth();

  const [days, setDays] = useState<BuilderDay[]>([]);
  const [title, setTitle] = useState("");
  // NEU: Start und Ziel des Trips (für Fahrstrecke und Google-Maps-Link)
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  // Zwingt die "zuletzt gespeichert vor …"-Anzeige zum Nachziehen.
  const [, tick] = useState(0);

  // Der Titel wird erst nach einer echten Nutzereingabe gespeichert — nicht
  // schon beim initialen Befüllen aus der Datenbank.
  const titleTouched = useRef(false);
  const dragged = useRef<{ dayId: string; stopId: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ dayId: string; index: number } | null>(null);

  // Ganzen Trip löschen (Issue #32): erst Bestätigung, dann Delete + Redirect.
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  // ----------------------------------------------------------------- Laden
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    // Die Liste aller Trips gibt es nur unter My Trips — /trip ohne ?id= leitet dorthin weiter
    if (!tripId) {
      router.replace("/my-trips");
      return;
    }

    // Beim Wechsel von einem anderen Trip keinen
    // alten Stand kurz aufblitzen lassen.
    setLoading(true);
    setNotFound(false);

    (async () => {
      const trip = await fetchTrip(tripId, user.id);
      if (cancelled) return;

      if (!trip) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setTitle(trip.title);
      setStartLocation(trip.start_location ?? "");
      setEndLocation(trip.end_location ?? "");
      setDays(
        trip.trip_days.map((day) => ({
          id: day.id,
          dayNumber: day.day_number,
          label: day.label,
          stops: day.trip_stops.map((stop) => ({
            id: stop.id,
            routeId: stop.route_id,
            route: stop.routes,
          })),
        }))
      );
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [tripId, user, authLoading]);

  useEffect(() => {
    const interval = setInterval(() => tick((value) => value + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  const finishSave = useCallback((ok: boolean) => {
    if (ok) {
      setSaveState("idle");
      setLastSavedAt(Date.now());
    } else {
      setSaveState("error");
    }
  }, []);

  // -------------------------------------------------- Autosave: Titel
  // Debounced, damit nicht jeder Tastendruck einen Request auslöst.
  useEffect(() => {
    // Leere Titel werden nicht gespeichert — trips.title ist NOT NULL und ein
    // namenloser Trip wäre in der Liste nicht wiederzuerkennen.
    if (!titleTouched.current || !tripId || !title.trim()) return;

    const timer = setTimeout(async () => {
      setSaveState("saving");
      finishSave(await updateTripTitle(tripId, title.trim()));
    }, 800);

    return () => clearTimeout(timer);
  }, [title, tripId, finishSave]);

  // ------------------------------------- Autosave: strukturelle Änderungen
  const persistStructure = useCallback(
    async (next: BuilderDay[]) => {
      setSaveState("saving");

      const stops = next.flatMap((day) =>
        day.stops.map((stop, index) => ({ id: stop.id, dayId: day.id, position: index }))
      );

      const ok = await persistStopOrder(stops);
      // updated_at nachziehen, damit die Sortierung auf /my-trips stimmt.
      // Nur mit gefülltem Titel — trips.title ist NOT NULL.
      if (ok && tripId && title.trim()) await touchTrip(tripId, title.trim());
      finishSave(ok);
    },
    [finishSave, tripId, title]
  );

  const applyDays = useCallback(
    (next: BuilderDay[]) => {
      setDays(next);
      void persistStructure(next);
    },
    [persistStructure]
  );

  // ----------------------------------------------------------- Drag & Drop
  function handleDrop(toDayId: string, toIndex: number) {
    const source = dragged.current;
    dragged.current = null;
    setDropTarget(null);
    if (!source) return;

    const next = moveStop(days, source.dayId, source.stopId, toDayId, toIndex);
    if (next) applyDays(next);
  }

  /**
   * Pfeil-Tasten als Ersatz fürs Ziehen — auf Touch-Geräten ist HTML5-Drag
   * unzuverlässig, deshalb hat jede Zeile zusätzlich Hoch/Runter.
   * Am Rand eines Tages springt der Stopp in den Nachbartag.
   */
  function shiftStop(dayIndex: number, stopIndex: number, delta: -1 | 1) {
    const day = days[dayIndex];
    if (!day) return;

    const stop = day.stops[stopIndex];
    if (!stop) return;

    let next: BuilderDay[] | null = null;

    if (delta === -1) {
      if (stopIndex > 0) {
        next = moveStop(days, day.id, stop.id, day.id, stopIndex - 1);
      } else if (dayIndex > 0) {
        const previous = days[dayIndex - 1];
        next = moveStop(days, day.id, stop.id, previous.id, previous.stops.length);
      }
    } else {
      if (stopIndex < day.stops.length - 1) {
        next = moveStop(days, day.id, stop.id, day.id, stopIndex + 2);
      } else if (dayIndex < days.length - 1) {
        next = moveStop(days, day.id, stop.id, days[dayIndex + 1].id, 0);
      }
    }

    if (next) applyDays(next);
  }

  // ------------------------------------------------------------- Mutationen
  async function handleRemoveStop(dayId: string, stopId: string) {
    setSaveState("saving");

    const ok = await deleteTripStop(stopId);
    if (!ok) {
      setSaveState("error");
      return;
    }

    const next = days.map((day) =>
      day.id === dayId ? { ...day, stops: day.stops.filter((stop) => stop.id !== stopId) } : day
    );
    setDays(next);
    // Positionen im betroffenen Tag wieder lückenlos schreiben.
    void persistStructure(next);
  }

  async function handleAddDay() {
    if (!tripId) return;
    setSaveState("saving");

    const created = await addTripDay(tripId, days.length + 1);
    if (!created?.id) {
      setSaveState("error");
      return;
    }

    setDays((prev) => [
      ...prev,
      { id: created.id, dayNumber: prev.length + 1, label: null, stops: [] },
    ]);
    finishSave(true);
  }

  async function handleRemoveDay(dayId: string) {
    // Der letzte Tag bleibt stehen — ein Trip ohne Tag hätte keine Ablagefläche.
    if (days.length <= 1) return;
    setSaveState("saving");

    const ok = await deleteTripDay(dayId);
    if (!ok) {
      setSaveState("error");
      return;
    }

    const next = days
      .filter((day) => day.id !== dayId)
      .map((day, index) => ({ ...day, dayNumber: index + 1 }));

    setDays(next);
    finishSave(
      await persistDayNumbers(next.map((day) => ({ id: day.id, dayNumber: day.dayNumber })))
    );
  }

  async function handleDeleteTrip() {
    if (!tripId) return;
    setDeleting(true);
    setDeleteError(false);

    // trip_days und trip_stops verschwinden per ON DELETE CASCADE mit.
    if (await deleteTrip(tripId)) {
      router.push("/my-trips");
      return;
    }

    setDeleting(false);
    setDeleteError(true);
  }

  const closeDeleteDialog = useCallback(() => {
    setConfirmDelete(false);
    setDeleteError(false);
  }, []);

  // -------------------------------------------------------------- Anzeige
  const totalStops = useMemo(
    () => days.reduce((sum, day) => sum + day.stops.length, 0),
    [days]
  );

  function saveLabel(): string {
    if (saveState === "saving") return t("trip.saved.saving");
    if (saveState === "error") return t("trip.saved.error");
    if (lastSavedAt === null) return "";

    const minutes = Math.floor((Date.now() - lastSavedAt) / 60_000);
    if (minutes < 1) return t("trip.saved.justNow");
    if (minutes < 60) return t("trip.saved.minutesAgo").replace("{n}", String(minutes));
    return t("trip.saved.hoursAgo").replace("{n}", String(Math.floor(minutes / 60)));
  }

  const loginHref = `/login?redirect=${encodeURIComponent(
    tripId ? `/trip?id=${tripId}` : "/trip"
  )}`;

  // NEU: Ziele für "Routen ergänzen" — ohne day landen sie am letzten Tag.
  const planHref = (dayId?: string) =>
    `/plan?trip=${encodeURIComponent(tripId)}` +
    (dayId ? `&day=${encodeURIComponent(dayId)}` : "") +
    (fromBuilder ? "&from=builder" : "");


  // ===================================================================
  // NEU: Kartenansicht (Trip B) — Karte, Markierungen, Fahrstrecke
  // ===================================================================
  const tv = TV_TEXT[(lang as AddLang) in TV_TEXT ? (lang as AddLang) : "de"];
  const [mapsConsent, setMapsConsent] = useState(false);
  const handleConsentChange = useCallback((granted: boolean) => setMapsConsent(granted), []);
  const [mapEl, setMapEl] = useState<HTMLDivElement | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<any>(null);
  const mapsApiRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const markersRef = useRef<{ stopId: string; marker: any }[]>([]);
  // NEU: Position jeder Nummer auf der tatsächlich gefahrenen Linie (aus der Directions-Antwort)
  const onRoadRef = useRef<Record<string, LatLng>>({});
  const [onRoadVersion, setOnRoadVersion] = useState(0);
  // Nummern erst zeigen, wenn ihre Position auf der Linie bekannt ist (kein Springen beim Laden).
  // routeDoneRef = Strecke berechnet (oder nicht berechenbar) -> ab dann alle Nummern zeigen.
  const routeDoneRef = useRef(false);
  const firstRouteRun = useRef(true);
  const markerShown = (stopId: string) => stopId !== activeStop && (routeDoneRef.current || Boolean(onRoadRef.current[stopId]));
  // NEU: Start/Ziel-Markierungen und Linie der ausgewählten Route
  const selectionRef = useRef<any[]>([]);
  const segmentCache = useRef<Map<string, [number, number][]>>(new Map());
  const [activeDay, setActiveDay] = useState<string>("all");
  const [activeStop, setActiveStop] = useState<string | null>(null);
  const [driveStats, setDriveStats] = useState<{ seconds: number; perDay: Record<string, { km: number; seconds: number }> } | null>(null);
  const [routing, setRouting] = useState(false);

  // Gewählter Tag existiert nicht mehr (gelöscht) -> zurück auf "Alle Tage"
  useEffect(() => {
    if (activeDay !== "all" && !days.some((day) => day.id === activeDay)) setActiveDay("all");
  }, [days, activeDay]);

  // Karte einmal anlegen, sobald der Container da ist (nach der Cookie-Zustimmung)
  useEffect(() => {
    if (!mapEl || mapRef.current) return;
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled) return;
        const map = new maps.Map(mapEl, {
          center: { lat: 47.2, lng: 10.5 },
          zoom: 5,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        mapRef.current = map;
        mapsApiRef.current = maps;
        rendererRef.current = new maps.DirectionsRenderer({
          map,
          suppressMarkers: true,
          preserveViewport: true,
          polylineOptions: { strokeColor: "#1A73E8", strokeOpacity: 0.85, strokeWeight: 5 },
        });
        // Klick auf eine freie Stelle der Karte hebt die Auswahl auf (Ziehen/Zoomen nicht)
        map.addListener("click", () => setActiveStop(null));
        setMapReady(true);
      })
      .catch((err) => console.error("trip: Google Maps konnte nicht geladen werden", err));
    return () => {
      cancelled = true;
    };
  }, [mapEl]);

  /** Alle Stopps mit Tag, Nummer und Koordinaten — Grundlage für Karte und Links. */
  const placed = useMemo(
    () =>
      days.flatMap((day, dayIndex) =>
        day.stops.map((stop, stopIndex) => ({
          dayId: day.id,
          dayIndex,
          stopId: stop.id,
          label: `${dayIndex + 1}.${stopIndex + 1}`,
          title: localizedTitle(stop.route, lang),
          points: routePoints(stop.route),
        }))
      ),
    [days, lang]
  );

  // Platz für das Panel rechts (Desktop) bzw. ohne Panel (Handy)
  const fitPadding = () =>
    typeof window !== "undefined" && window.innerWidth > 900
      ? { top: 110, right: 600, bottom: 90, left: 60 }
      : { top: 80, right: 30, bottom: 40, left: 30 };

  // Markierungen je Stopp (Farbe = Tag) und Kartenausschnitt
  useEffect(() => {
    const maps = mapsApiRef.current;
    const map = mapRef.current;
    if (!mapReady || !maps || !map) return;

    markersRef.current.forEach(({ marker }) => marker.setMap(null));
    markersRef.current = [];
    const bounds = new maps.LatLngBounds();
    let any = false;

    for (const item of placed) {
      if (!item.points) continue;
      const dimmed = activeDay !== "all" && item.dayId !== activeDay;
      const marker = new maps.Marker({
        position: onRoadRef.current[item.stopId] ?? item.points.mid,
        map,
        title: item.title,
        visible: markerShown(item.stopId),
        zIndex: dimmed ? 5 : 20,
        opacity: dimmed ? 0.45 : 1,
        label: { text: item.label, color: "#1A150C", fontSize: "11px", fontWeight: "700" },
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: dayColor(item.dayIndex),
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 3,
        },
      });
      marker.addListener("click", () => {
        setActiveStop(item.stopId);
        document.getElementById(`tv-stop-${item.stopId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      markersRef.current.push({ stopId: item.stopId, marker });
      if (!dimmed) {
        bounds.extend(item.points.start);
        bounds.extend(item.points.end);
        any = true;
      }
    }
    if (any) map.fitBounds(bounds, fitPadding());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed, mapReady, activeDay]);

  // NEU: Sobald die Strecke berechnet ist, die Nummern auf die Linie schieben (ohne Neuaufbau/Zoom)
  useEffect(() => {
    markersRef.current.forEach(({ stopId, marker }) => {
      const p = onRoadRef.current[stopId];
      if (p) marker.setPosition(p);
      marker.setVisible(markerShown(stopId));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRoadVersion]);

  /* NEU: Ausgewählte Route auf der Karte zeigen — ihre Nummer verschwindet, stattdessen
     erscheinen Start (A) und Ziel (B) und die Strecke dazwischen in der Farbe des Tages.
     Bleibt beim Zoomen und Verschieben stehen, bis eine andere Route gewählt oder auf eine
     freie Stelle der Karte geklickt wird. */
  useEffect(() => {
    const maps = mapsApiRef.current;
    const map = mapRef.current;
    if (!mapReady || !maps || !map) return;

    markersRef.current.forEach(({ stopId, marker }) => marker.setVisible(markerShown(stopId)));
    selectionRef.current.forEach((overlay) => overlay.setMap(null));
    selectionRef.current = [];

    const item = placed.find((p) => p.stopId === activeStop);
    if (!item?.points) return;
    const color = dayColor(item.dayIndex);
    const pin = (position: LatLng, text: string, fill: string, labelColor: string, title: string) =>
      new maps.Marker({
        position,
        map,
        title,
        zIndex: 40,
        label: { text, color: labelColor, fontSize: "12px", fontWeight: "700" },
        icon: {
          path: "M12 0C5.4 0 0 5.4 0 12c0 8.6 12 24 12 24s12-15.4 12-24C24 5.4 18.6 0 12 0z",
          fillColor: fill,
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 2.5,
          scale: 1.25,
          anchor: new maps.Point(12, 36),
          labelOrigin: new maps.Point(12, 12),
        },
      });
    const startPin = pin(item.points.start, "A", color, "#1A150C", `${item.title} (Start)`);
    const endPin = pin(item.points.end, "B", "#1F1A13", "#FFFFFF", `${item.title} (Ende)`);
    startPin.addListener("click", () => setActiveStop(null));
    endPin.addListener("click", () => setActiveStop(null));
    selectionRef.current.push(startPin, endPin);

    // Ausschnitt einmal auf die gewählte Route setzen — danach darf frei gezoomt werden
    const bounds = new maps.LatLngBounds();
    bounds.extend(item.points.start);
    bounds.extend(item.points.end);
    const sameSpot = item.points.start.lat === item.points.end.lat && item.points.start.lng === item.points.end.lng;
    if (sameSpot) {
      map.panTo(item.points.start);
      if ((map.getZoom() ?? 0) < 11) map.setZoom(11);
    } else {
      map.fitBounds(bounds, fitPadding());
    }

    // Strecke der Route (eine Anfrage pro Route, danach aus dem Zwischenspeicher)
    let cancelled = false;
    const draw = (path: [number, number][]) => {
      if (cancelled || path.length < 2) return;
      const line = new maps.Polyline({
        map,
        path: path.map(([lng, lat]) => ({ lat, lng })),
        strokeColor: color,
        strokeOpacity: 1,
        strokeWeight: 7,
        zIndex: 35,
      });
      const casing = new maps.Polyline({
        map,
        path: path.map(([lng, lat]) => ({ lat, lng })),
        strokeColor: "#FFFFFF",
        strokeOpacity: 0.9,
        strokeWeight: 11,
        zIndex: 34,
      });
      selectionRef.current.push(casing, line);
    };
    const cached = segmentCache.current.get(item.stopId);
    if (cached) draw(cached);
    else if (!sameSpot && mapsConsent) {
      computeDirections(pointText(item.points.start), pointText(item.points.end))
        .then((result) => {
          const path = overviewPathToLngLat(result);
          segmentCache.current.set(item.stopId, path);
          draw(path);
        })
        .catch((err) => console.warn("trip: Strecke der Route konnte nicht berechnet werden", err));
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStop, placed, mapReady]);

  // Klick auf eine Route in der Liste: auf der Karte zeigen (auf dem Handy dafür zur Karte hochscrollen)
  // Nochmal auf die schon gewählte Route klicken = Auswahl aufheben (zurück zur Nummer)
  const selectFromList = (stopId: string) => {
    if (activeStop === stopId) {
      setActiveStop(null);
      return;
    }
    setActiveStop(stopId);
    if (typeof window !== "undefined" && window.innerWidth <= 900) {
      mapEl?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Ausgewählte Route wurde gelöscht -> Auswahl aufheben
  useEffect(() => {
    if (activeStop && !placed.some((p) => p.stopId === activeStop)) setActiveStop(null);
  }, [placed, activeStop]);

  // Fahrstrecke über alle Stopps (eine Directions-Anfrage, nach Änderungen kurz verzögert)
  const routeKey = placed.map((p) => `${p.dayId}:${p.stopId}`).join("|") + `|${startLocation}|${endLocation}`;
  useEffect(() => {
    if (!mapReady) return;
    if (!mapsConsent) {
      // Ohne Google-Strecke: Nummern an der bisherigen Stelle zeigen
      routeDoneRef.current = true;
      setOnRoadVersion((v) => v + 1);
      return;
    }
    const withPoints = placed.filter((p) => p.points);
    if (withPoints.length === 0) {
      rendererRef.current?.setDirections({ routes: [] });
      setDriveStats(null);
      return;
    }
    // Schon einmal berechnet (gleicher Trip, gleiche Reihenfolge)? Dann Positionen sofort aus dem
    // Zwischenspeicher nehmen — die Nummern stehen direkt richtig, die Anfrage läuft trotzdem.
    const cacheKey = `trip-onroad:${routeKey}`;
    routeDoneRef.current = false;
    try {
      const cached = window.localStorage.getItem(cacheKey);
      if (cached) {
        onRoadRef.current = { ...onRoadRef.current, ...(JSON.parse(cached) as Record<string, LatLng>) };
        routeDoneRef.current = withPoints.every((p) => onRoadRef.current[p.stopId]);
      }
    } catch {
      /* Speicher nicht verfügbar — egal */
    }
    setOnRoadVersion((v) => v + 1);
    let cancelled = false;
    // Beim ersten Laden sofort rechnen, bei späteren Änderungen kurz warten (Mehrfach-Klicks)
    const delay = firstRouteRun.current ? 0 : 600;
    firstRouteRun.current = false;
    const timer = setTimeout(async () => {
      // Start und Ende jeder Route als Wegpunkt; bei sehr vielen Routen nur die Mitte (Google erlaubt 25)
      const useMid = withPoints.length * 2 > 23;
      type Waypoint = { lat: number; lng: number; dayId: string; stopId: string; role: "start" | "end" | "mid" };
      const waypoints: Waypoint[] = withPoints
        .flatMap((p): Waypoint[] =>
          useMid
            ? [{ ...p.points!.mid, dayId: p.dayId, stopId: p.stopId, role: "mid" }]
            : [
                { ...p.points!.start, dayId: p.dayId, stopId: p.stopId, role: "start" },
                { ...p.points!.end, dayId: p.dayId, stopId: p.stopId, role: "end" },
              ]
        )
        .slice(0, 23);
      const origin = startLocation || pointText(waypoints[0]);
      const destination = endLocation || pointText(waypoints[waypoints.length - 1]);
      setRouting(true);
      try {
        const result = await computeDirections(origin, destination, waypoints.map(({ lat, lng }) => ({ lat, lng })));
        if (cancelled) return;
        rendererRef.current?.setDirections(result);
        const legs: any[] = result?.routes?.[0]?.legs ?? [];
        const perDay: Record<string, { km: number; seconds: number }> = {};
        let seconds = 0;
        legs.forEach((leg, i) => {
          // Abschnitt i endet am Wegpunkt i — gehört zu dessen Tag (der letzte zum letzten Tag)
          const dayId = (waypoints[i] ?? waypoints[waypoints.length - 1]).dayId;
          const entry = (perDay[dayId] ??= { km: 0, seconds: 0 });
          entry.km += (leg?.distance?.value ?? 0) / 1000;
          entry.seconds += leg?.duration?.value ?? 0;
          seconds += leg?.duration?.value ?? 0;
        });
        setDriveStats({ seconds, perDay });

        // NEU: Nummer jeder Route auf die gefahrene Linie setzen. Ihr eigener Abschnitt ist der
        // Abschnitt, der an ihrem Endpunkt ankommt (von ihrem Start- zum Endpunkt). Ist der zu
        // kurz (Start = Ende) oder fehlt er, nehmen wir den Punkt der Gesamtlinie, der der Mitte
        // am nächsten liegt. So steht die Zahl immer auf der Linie — auch auf einer Umleitung.
        const overview: LatLng[] = (result?.routes?.[0]?.overview_path ?? []).map(toLatLng);
        const next: Record<string, LatLng> = {};
        for (const p of withPoints) {
          let pos: LatLng | null = null;
          const endIdx = waypoints.findIndex((w) => w.stopId === p.stopId && w.role === "end");
          const leg = endIdx >= 0 ? legs[endIdx] : null;
          if (leg && (leg?.distance?.value ?? 0) > 300) pos = pathMidpoint(legPath(leg));
          if (!pos && overview.length) pos = nearestOnPath(overview, p.points!.mid);
          if (pos) next[p.stopId] = pos;
        }
        onRoadRef.current = next;
        try {
          window.localStorage.setItem(cacheKey, JSON.stringify(next));
        } catch {
          /* Speicher voll oder gesperrt — egal */
        }
      } catch (err) {
        console.warn("trip: Fahrstrecke konnte nicht berechnet werden", err);
        if (!cancelled) setDriveStats(null);
      } finally {
        if (!cancelled) {
          setRouting(false);
          routeDoneRef.current = true;
          setOnRoadVersion((v) => v + 1);
        }
      }
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey, mapReady, mapsConsent]);

  const scenicKm = (stops: BuilderStop[]) =>
    stops.reduce((sum, stop) => sum + (toNum(stop.route?.distance_km) ?? 0), 0);
  const totalScenicKm = days.reduce((sum, day) => sum + scenicKm(day.stops), 0);

  // Google-Maps-Link für die ganze Reise oder den gewählten Tag
  const mapsLink = (() => {
    const scopeIndex = activeDay === "all" ? -1 : days.findIndex((day) => day.id === activeDay);
    const scoped = placed.filter((p) => p.points && (scopeIndex === -1 || p.dayIndex === scopeIndex));
    if (scoped.length === 0) return "";
    const pts = scoped.flatMap((p) => [p.points!.start, p.points!.end]);
    if (scopeIndex === -1) {
      return mapsDirUrl(startLocation || pointText(pts[0]), endLocation || pointText(pts[pts.length - 1]), pts);
    }
    const before = placed.filter((p) => p.points && p.dayIndex < scopeIndex);
    const origin = scopeIndex === 0 ? startLocation || pointText(pts[0]) : before.length ? pointText(before[before.length - 1].points!.end) : pointText(pts[0]);
    const isLast = scopeIndex === days.length - 1;
    const destination = isLast && endLocation ? endLocation : pointText(pts[pts.length - 1]);
    return mapsDirUrl(origin, destination, isLast && endLocation ? pts : pts.slice(0, -1));
  })();

  const visibleDays = activeDay === "all" ? days : days.filter((day) => day.id === activeDay);
  const tripView = Boolean(user && tripId && !authLoading && !loading && !notFound);

  // Titel darf umbrechen: Höhe des Textfelds wächst mit dem Inhalt
  const titleAreaRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = titleAreaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title, tripView]);

  if (tripView) {
    return (
      <div className="pp tv-page">
        <PlannerNav activePath="/my-trips" />

        <section className="tv">
          <div className="tv-map">
            <GoogleMapsGate height="100%" onConsentChange={handleConsentChange}>
              <div ref={setMapEl} className="tv-map-el" />
            </GoogleMapsGate>
          </div>
          <span className="tv-fade" aria-hidden="true" />

          {/* Legende unten links — Klick wählt den Tag */}
          <div className="tv-legend">
            {days.map((day, i) => (
              <button key={day.id} type="button" className={activeDay === day.id ? "on" : ""} onClick={() => setActiveDay(activeDay === day.id ? "all" : day.id)}>
                <i style={{ background: dayColor(i) }} /> {t("trip.day")} {day.dayNumber}
              </button>
            ))}
            {startLocation && endLocation && (
              <span className="tv-legend-drive">{tv.yourDrive.replace("{start}", startLocation.split(",")[0]).replace("{end}", endLocation.split(",")[0])}</span>
            )}
          </div>

          <aside className="tv-panel">
            <div className="tv-head">
              <div className="tv-head-top">
                <Link href="/my-trips" className="tv-crumb">
                  <ArrowLeft size={14} strokeWidth={2} /> {tv.myTrips}
                </Link>
                <span className={`tv-saved ${saveState === "error" ? "is-error" : ""}`}>{saveLabel()}</span>
              </div>
              <label className="tv-title-wrap">
                <textarea
                  ref={titleAreaRef}
                  className="tv-title"
                  rows={1}
                  value={title}
                  placeholder={t("trip.titlePlaceholder")}
                  aria-label={tv.editTitle}
                  onKeyDown={(e) => {
                    // Titel bleibt einzeilig gespeichert — Enter beendet nur die Eingabe
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                  }}
                  onChange={(e) => {
                    titleTouched.current = true;
                    setTitle(e.target.value.replace(/\n/g, " "));
                  }}
                />
                <Pencil size={15} strokeWidth={1.8} className="tv-title-pen" aria-hidden="true" />
              </label>
              <div className="tv-meta">
                <span><b>{days.length}</b> {t("trip.stats.days")}</span>
                <span><b>{totalStops}</b> {t("trip.stats.routes")}</span>
                {totalScenicKm > 0 && <span>{tv.scenicKm.replace("{d}", formatDistance(totalScenicKm, unit))}</span>}
                {driveStats && <span>{tv.driving.replace("{t}", fmtDuration(driveStats.seconds))}</span>}
                {routing && !driveStats && <span className="tv-dim">{tv.mapLoading}</span>}
              </div>
            </div>

            <div className="tv-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={activeDay === "all"} className={activeDay === "all" ? "on" : ""} onClick={() => setActiveDay("all")}>
                {tv.allDays}
              </button>
              {days.map((day, i) => (
                <button key={day.id} type="button" role="tab" aria-selected={activeDay === day.id} className={activeDay === day.id ? "on" : ""} onClick={() => setActiveDay(day.id)}>
                  <i style={{ background: dayColor(i) }} /> {t("trip.day")} {day.dayNumber}
                </button>
              ))}
              <button type="button" className="tv-tab-add" onClick={handleAddDay}>
                <Plus size={14} strokeWidth={2.2} /> {tv.addDayShort}
              </button>
            </div>

            <div className="tv-list" onClick={(e) => { if (e.target === e.currentTarget) setActiveStop(null); }}>
              {visibleDays.map((day) => {
                const dayIndex = days.findIndex((d) => d.id === day.id);
                const stats = driveStats?.perDay[day.id];
                const km = scenicKm(day.stops);
                return (
                  <section
                    key={day.id}
                    className="tv-day"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(day.id, day.stops.length)}
                  >
                    <div className="tv-day-head">
                      <div>
                        <h2>{t("trip.day")} {day.dayNumber}</h2>
                        <small>
                          {[km > 0 ? tv.scenicKm.replace("{d}", formatDistance(km, unit)) : "", stats ? tv.driving.replace("{t}", fmtDuration(stats.seconds)) : ""].filter(Boolean).join(", ")}
                        </small>
                      </div>
                      <div className="tv-day-actions">
                        {day.stops.length > 0 && (
                          <Link href={planHref(day.id)} className="tv-chip" draggable={false}>
                            <Plus size={13} strokeWidth={2.2} /> {tx.addRoutes}
                          </Link>
                        )}
                        {days.length > 1 && (
                          <button type="button" className="tv-ic danger" onClick={() => handleRemoveDay(day.id)} title={t("trip.removeDay")} aria-label={t("trip.removeDay")}>
                            <Trash2 size={14} strokeWidth={1.9} />
                          </button>
                        )}
                      </div>
                    </div>

                    {day.stops.length === 0 ? (
                      <div className="tv-empty">
                        <p>{t("trip.emptyDay")}</p>
                        <Link href={planHref(day.id)} className="tv-btn tv-btn-sm" draggable={false}>
                          <Compass size={14} strokeWidth={2} /> {tx.findRoutes}
                        </Link>
                      </div>
                    ) : (
                      <div className="tv-stops">
                        {day.stops.map((stop, stopIndex) => {
                          const name = localizedTitle(stop.route, lang);
                          const detailHref = `/routedetail/${stop.routeId}?from=${encodeURIComponent(`/trip?id=${tripId}${fromBuilder ? "&from=builder" : ""}`)}`;
                          return (
                            <div
                              key={stop.id}
                              id={`tv-stop-${stop.id}`}
                              className={`tv-stop ${activeStop === stop.id ? "on" : ""} ${dropTarget?.dayId === day.id && dropTarget.index === stopIndex ? "is-drop" : ""}`}
                              draggable
                              role="button"
                              tabIndex={0}
                              aria-pressed={activeStop === stop.id}
                              onClick={() => selectFromList(stop.id)}
                              onKeyDown={(e) => {
                                if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                                  e.preventDefault();
                                  selectFromList(stop.id);
                                }
                              }}
                              onDragStart={() => { dragged.current = { dayId: day.id, stopId: stop.id }; }}
                              onDragEnd={() => { dragged.current = null; setDropTarget(null); }}
                              onDragOver={(e) => { e.preventDefault(); setDropTarget({ dayId: day.id, index: stopIndex }); }}
                              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleDrop(day.id, stopIndex); }}
                            >
                              <span className="tv-grip" aria-hidden="true"><GripVertical size={15} strokeWidth={2} /></span>
                              <span className="tv-num" style={{ background: dayColor(dayIndex) }}>{dayIndex + 1}.{stopIndex + 1}</span>
                              <span className="tv-thumb">
                                <img
                                  src={stop.route?.image_url || "/amalfi_coast_road.jpg"}
                                  alt={name}
                                  draggable={false}
                                  onError={(e) => { e.currentTarget.src = "/amalfi_coast_road.jpg"; }}
                                />
                              </span>
                              <div className="tv-info">
                                <b>{name}</b>
                                <small>{[stop.route?.country, formatDistance(stop.route?.distance_km as number | null | undefined, unit)].filter(Boolean).join(", ")}</small>
                              </div>
                              <div className="tv-actions">
                                {/* Zur Detailseite — die Karte selbst wählt die Route nur auf der Karte aus */}
                                <Link href={detailHref} prefetch={false} draggable={false} className="tv-ic tv-ic-link" onClick={(e: { stopPropagation: () => void }) => e.stopPropagation()} title={tv.details} aria-label={tv.details}>
                                  <Info size={15} strokeWidth={1.9} />
                                </Link>
                                {/* Pfeile zusätzlich zum Ziehen — auf Touch-Geräten ist Ziehen unzuverlässig */}
                                <span className="tv-move">
                                  <button type="button" className="tv-ic" onClick={(e) => { e.stopPropagation(); shiftStop(dayIndex, stopIndex, -1); }} disabled={dayIndex === 0 && stopIndex === 0} title={t("trip.moveUp")} aria-label={t("trip.moveUp")}>
                                    <ChevronUp size={15} strokeWidth={2.1} />
                                  </button>
                                  <button type="button" className="tv-ic" onClick={(e) => { e.stopPropagation(); shiftStop(dayIndex, stopIndex, 1); }} disabled={dayIndex === days.length - 1 && stopIndex === day.stops.length - 1} title={t("trip.moveDown")} aria-label={t("trip.moveDown")}>
                                    <ChevronDown size={15} strokeWidth={2.1} />
                                  </button>
                                </span>
                                <button type="button" className="tv-ic danger" onClick={(e) => { e.stopPropagation(); handleRemoveStop(day.id, stop.id); }} title={t("trip.removeStop")} aria-label={t("trip.removeStop")}>
                                  <Trash2 size={14} strokeWidth={1.9} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}

            </div>

            <div className="tv-foot">
              {mapsLink ? (
                <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="tv-btn">
                  <Navigation size={16} strokeWidth={2} />
                  {activeDay === "all" ? tv.openTrip : tv.openDay.replace("{n}", String(days.find((d) => d.id === activeDay)?.dayNumber ?? ""))}
                </a>
              ) : (
                totalStops > 0 && <p className="tv-dim tv-nocoords">{tv.noCoords}</p>
              )}
              <div className="tv-row">
                <Link href="/plan" className="tv-line"><Compass size={14} strokeWidth={2} /> {tv.newTrip}</Link>
                <Link href="/my-trips" className="tv-line"><RouteIcon size={14} strokeWidth={2} /> {tv.allTrips}</Link>
                <button type="button" className="tv-line danger" onClick={() => setConfirmDelete(true)}><Trash2 size={14} strokeWidth={2} /> {tv.delete}</button>
              </div>
            </div>
          </aside>
        </section>

        <PageFooter />

        <ConfirmDialog
          open={confirmDelete}
          title={t("trip.deleteConfirmTitle")}
          text={t("trip.deleteConfirmText").replace("{title}", title.trim() || t("trip.titlePlaceholder"))}
          confirmLabel={t("trip.deleteConfirm")}
          cancelLabel={t("trip.deleteCancel")}
          busyLabel={t("trip.deleting")}
          busy={deleting}
          error={deleteError ? t("trip.deleteError") : undefined}
          onConfirm={handleDeleteTrip}
          onCancel={closeDeleteDialog}
        />

        <style>{`
          /* Klarglas: sehr durchsichtiges Panel mit starker Unschärfe, Routen als Glasplättchen */
          .tv-page { --tv-ease:cubic-bezier(.22,1,.36,1); --tv-gold-text:#D8BC84; --tv-glass:rgba(12,11,9,0.52); --tv-glass-edge:rgba(255,255,255,0.16); --tv-glass-line:rgba(255,255,255,0.35); --tv-divider:rgba(255,255,255,0.18); --tv-card:rgba(255,255,255,0.10); --tv-card-edge:rgba(255,255,255,0.22); --tv-text-2:rgba(241,233,216,0.78); --tv-text-3:rgba(241,233,216,0.6); --tv-shadow:0 30px 80px rgba(0,0,0,0.35); min-height:100vh; background:var(--bg); }
          .light .tv-page, .tv-page.light { --tv-gold-text:#86652A; --tv-glass:linear-gradient(150deg, rgba(255,255,255,0.40) 0%, rgba(255,255,255,0.16) 45%, rgba(255,255,255,0.28) 100%); --tv-glass-edge:rgba(255,255,255,0.7); --tv-glass-line:rgba(255,255,255,0.9); --tv-divider:rgba(43,38,32,0.12); --tv-card:rgba(255,255,255,0.34); --tv-card-edge:rgba(255,255,255,0.75); --tv-text-2:rgba(30,26,20,0.78); --tv-text-3:rgba(30,26,20,0.6); --tv-shadow:0 30px 80px rgba(0,0,0,0.35); }

          .tv { position:relative; height:100vh; height:100dvh; min-height:760px; overflow:hidden; }
          .tv-map { position:absolute; inset:0; }
          .tv-map-el { width:100%; height:100%; }
          .tv-fade { position:absolute; inset:0; z-index:1; pointer-events:none; background:linear-gradient(to bottom, color-mix(in srgb, var(--bg) 92%, transparent) 0%, transparent 14%), linear-gradient(to top, color-mix(in srgb, var(--bg) 60%, transparent) 0%, transparent 90px); }

          .tv-legend { position:absolute; left:clamp(20px,3vw,40px); bottom:28px; z-index:3; display:flex; flex-wrap:wrap; gap:8px; max-width:calc(100% - 640px); }
          .tv-legend button, .tv-legend-drive { display:inline-flex; align-items:center; gap:8px; height:38px; padding:0 16px; border-radius:999px; border:1px solid var(--border); background:var(--tv-glass); backdrop-filter:blur(18px) saturate(150%); -webkit-backdrop-filter:blur(18px) saturate(150%); font-family:inherit; font-size:12.5px; color:var(--cream); cursor:pointer; transition:border-color .2s; }
          .tv-legend button.on, .tv-legend button:hover { border-color:var(--gold); }
          .tv-legend-drive { cursor:default; color:var(--muted); }
          .tv-legend i, .tv-tabs i { display:inline-block; width:9px; height:9px; border-radius:50%; flex:none; }

          .tv-panel { --muted:var(--tv-text-2); --dim:var(--tv-text-3); position:absolute; z-index:4; top:96px; right:clamp(20px,3vw,40px); bottom:28px; width:540px; display:flex; flex-direction:column; border-radius:28px; border:1px solid var(--tv-glass-edge); background:var(--tv-glass); backdrop-filter:blur(24px) saturate(130%) brightness(1.04); -webkit-backdrop-filter:blur(24px) saturate(130%) brightness(1.04); box-shadow:var(--tv-shadow), inset 0 1px 0 var(--tv-glass-line); overflow:hidden; }
          .light .tv-panel, .tv-page.light .tv-panel { box-shadow:0 30px 70px rgba(40,30,10,0.18), inset 0 1px 0 rgba(255,255,255,0.95), inset 1px 0 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(255,255,255,0.35); }
          .light .tv-stop, .tv-page.light .tv-stop { box-shadow:inset 0 1px 0 rgba(255,255,255,0.9), 0 6px 18px rgba(40,30,10,0.06); }
          .tv-head { padding:26px 28px 18px; }
          .tv-head-top { display:flex; align-items:center; justify-content:space-between; gap:12px; }
          .tv-page a.tv-crumb { display:inline-flex; align-items:center; gap:7px; font-size:13px; color:var(--muted); transition:color .2s; }
          .tv-page a.tv-crumb:hover { color:var(--cream); }
          .tv-saved { font-size:11.5px; color:var(--dim); }
          .tv-saved.is-error { color:#e08080; }
          .tv-title-wrap { position:relative; display:block; margin-top:12px; }
          .tv-title { display:block; width:100%; padding:2px 30px 6px 0; border:none; border-bottom:1px solid transparent; background:none; outline:none; resize:none; overflow:hidden; font-family:var(--serif); font-size:clamp(32px,2.9vw,42px); font-weight:300; line-height:1.08; letter-spacing:-.015em; color:var(--cream); transition:border-color .2s; }
          .tv-title:hover { border-bottom-color:var(--border); }
          .tv-title:focus { border-bottom-color:var(--gold); }
          .tv-title-pen { position:absolute; right:2px; top:14px; color:var(--dim); pointer-events:none; opacity:0; transition:opacity .2s; }
          .tv-title-wrap:hover .tv-title-pen, .tv-title:focus + .tv-title-pen { opacity:1; }
          .tv-meta { display:flex; flex-wrap:wrap; gap:6px 16px; margin-top:12px; font-size:13px; color:var(--muted); }
          .tv-meta b { color:var(--cream); font-weight:600; }
          .tv-dim { color:var(--dim); }

          .tv-tabs { display:flex; gap:6px; padding:0 28px 16px; border-bottom:1px solid var(--tv-divider); overflow-x:auto; scrollbar-width:none; }
          .tv-tabs::-webkit-scrollbar { display:none; }
          .tv-page .tv-tabs button { flex:none; display:inline-flex; align-items:center; gap:8px; height:38px; padding:0 15px; border-radius:999px; border:1px solid var(--border); background:transparent; font-family:inherit; font-size:12.5px; font-weight:500; color:var(--muted); cursor:pointer; transition:all .2s; }
          .tv-page .tv-tabs button:hover { color:var(--cream); border-color:color-mix(in srgb, var(--gold) 55%, transparent); }
          .tv-page .tv-tabs button.on { background:var(--cream); border-color:var(--cream); color:var(--bg); }
          .tv-page .tv-tabs button.tv-tab-add { border-style:dashed; color:var(--tv-gold-text); }

          .tv-list { flex:1; min-height:0; overflow-y:auto; padding:8px 20px 18px; scrollbar-width:thin; scrollbar-color:color-mix(in srgb, var(--gold) 40%, transparent) transparent; }
          .tv-day { padding-top:14px; }
          .tv-day-head { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:0 8px 10px; }
          .tv-day-head h2 { margin:0; font-family:var(--serif); font-size:27px; font-weight:400; line-height:1; color:var(--cream); }
          .tv-day-head small { display:block; margin-top:5px; font-size:12px; color:var(--dim); }
          .tv-day-actions { display:flex; align-items:center; gap:8px; }
          .tv-page a.tv-chip { display:inline-flex; align-items:center; gap:6px; height:34px; padding:0 13px; border-radius:999px; border:1px solid var(--border); font-size:12px; font-weight:500; color:var(--tv-gold-text); white-space:nowrap; transition:border-color .2s; }
          .tv-page a.tv-chip:hover { border-color:var(--gold); }

          .tv-stops { display:flex; flex-direction:column; gap:8px; }
          .tv-stop { display:grid; grid-template-columns:16px 34px 76px minmax(0,1fr) auto; align-items:center; gap:12px; padding:10px 12px 10px 8px; border-radius:18px; border:1px solid var(--tv-card-edge); background:var(--tv-card); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); cursor:pointer; transition:border-color .2s, box-shadow .2s; }
          .tv-stop:hover { border-color:color-mix(in srgb, var(--gold) 35%, transparent); }
          .tv-stop.on { border-color:color-mix(in srgb, var(--gold) 60%, transparent); box-shadow:0 0 0 4px color-mix(in srgb, var(--gold) 13%, transparent); }
          .tv-stop.is-drop { box-shadow:inset 0 3px 0 var(--gold); }
          .tv-grip { color:var(--dim); cursor:grab; display:flex; }
          .tv-num { width:32px; height:32px; display:grid; place-items:center; border-radius:50%; font-size:11px; font-weight:700; color:#1A150C; }
          .tv-thumb { display:block; width:76px; height:58px; border-radius:12px; overflow:hidden; background:var(--bg3); }
          .tv-thumb img { width:100%; height:100%; object-fit:cover; }
          .tv-info { min-width:0; }
          .tv-info b { display:block; font-family:var(--serif); font-size:20px; font-weight:400; line-height:1.12; color:var(--cream); overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
          .tv-stop:hover .tv-info b, .tv-stop.on .tv-info b { color:var(--tv-gold-text); }
          .tv-stop:focus-visible { outline:2px solid var(--gold); outline-offset:2px; }
          .tv-page a.tv-ic-link { width:34px; height:34px; display:grid; place-items:center; border-radius:50%; border:1px solid var(--border); color:var(--muted); transition:all .18s; }
          .tv-page a.tv-ic-link:hover { color:var(--tv-gold-text); border-color:color-mix(in srgb, var(--gold) 50%, transparent); }
          .tv-info small { display:block; margin-top:4px; font-size:12px; color:var(--dim); }
          .tv-actions { display:flex; align-items:center; gap:6px; }
          .tv-move { display:flex; gap:6px; opacity:0; transition:opacity .2s; }
          .tv-stop:hover .tv-move, .tv-stop:focus-within .tv-move, .tv-stop.on .tv-move { opacity:1; }
          @media (hover:none) { .tv-move { opacity:1; } }
          .tv-page button.tv-ic { width:34px; height:34px; display:grid; place-items:center; border-radius:50%; border:1px solid var(--border); background:transparent; color:var(--muted); cursor:pointer; transition:all .18s; }
          .tv-page button.tv-ic:hover:not(:disabled) { color:var(--tv-gold-text); border-color:color-mix(in srgb, var(--gold) 50%, transparent); }
          .tv-page button.tv-ic:disabled { opacity:.3; cursor:not-allowed; }
          .tv-page button.tv-ic.danger:hover:not(:disabled) { color:#e08080; border-color:rgba(224,128,128,.45); background:rgba(224,128,128,.08); }

          .tv-empty { display:flex; flex-direction:column; align-items:center; gap:14px; padding:26px 20px; border:1.5px dashed var(--border); border-radius:18px; text-align:center; }
          .tv-empty p { margin:0; font-size:13px; color:var(--dim); }

          .tv-foot { padding:16px 20px 20px; border-top:1px solid var(--tv-divider); display:flex; flex-direction:column; gap:10px; }
          /* Hauptknopf kontrastreich: cremefarben im Dunkeln, fast schwarz im Hellen */
          .tv-page a.tv-btn { display:inline-flex; align-items:center; justify-content:center; gap:10px; height:52px; padding:0 22px; border-radius:999px; background:var(--cream); color:var(--bg); font-size:14px; font-weight:600; box-shadow:0 12px 30px rgba(0,0,0,0.25); transition:transform .3s var(--tv-ease), box-shadow .3s, filter .3s; }
          .tv-page a.tv-btn svg { color:var(--bg); }
          .tv-page a.tv-btn:hover { transform:translateY(-1px); filter:brightness(1.05); box-shadow:0 16px 36px rgba(0,0,0,0.3); }
          .tv-page a.tv-btn-sm { height:42px; font-size:13px; }
          .tv-nocoords { margin:0; text-align:center; font-size:12.5px; }
          .tv-row { display:flex; gap:8px; }
          .tv-page .tv-line { flex:1; display:inline-flex; align-items:center; justify-content:center; gap:7px; height:42px; padding:0 10px; border-radius:999px; border:1px solid var(--border); background:transparent; font-family:inherit; font-size:12.5px; font-weight:500; color:var(--muted); white-space:nowrap; cursor:pointer; transition:all .2s; }
          .tv-page .tv-line:hover { color:var(--cream); border-color:color-mix(in srgb, var(--gold) 50%, transparent); }
          .tv-page button.tv-line.danger:hover { color:#e08080; border-color:rgba(224,128,128,.45); }

          @media (max-width:1180px) { .tv-panel { width:470px; } .tv-legend { max-width:calc(100% - 560px); } }
          @media (max-width:900px) {
            .tv { height:auto; min-height:0; overflow:visible; }
            .tv-map { position:relative; height:clamp(300px, 48vh, 440px); }
            .tv-fade { height:clamp(300px, 48vh, 440px); }
            .tv-legend { top:clamp(250px, calc(48vh - 52px), 390px); bottom:auto; max-width:calc(100% - 40px); flex-wrap:nowrap; overflow-x:auto; scrollbar-width:none; }
            .tv-legend-drive { display:none !important; }
            .tv-panel { position:relative; top:auto; right:auto; bottom:auto; width:auto; margin:16px 14px 40px; border-radius:24px; }
            .tv-list { overflow:visible; }
          }
          @media (max-width:560px) {
            .tv-head { padding:22px 20px 14px; }
            .tv-tabs { padding:0 20px 14px; }
            .tv-list { padding:6px 12px 14px; }
            .tv-stop { grid-template-columns:30px 60px minmax(0,1fr) auto; gap:10px; padding:10px; }
            .tv-grip { display:none; }
            .tv-thumb { width:60px; height:50px; }
            .tv-info b { font-size:17px; }
            .tv-actions { flex-direction:column; gap:4px; }
            .tv-move { flex-direction:row; }
            .tv-day-head { flex-wrap:wrap; }
            .tv-row { flex-wrap:wrap; }
            .tv-page .tv-line { flex:1 1 40%; }
          }
        `}</style>
      </div>
    );
  }

  // Alles außer der Kartenansicht: Laden, nicht eingeloggt, Trip nicht gefunden
  return (
    <div className="pp">
      <div className="pp-bg">
        <img
          src="/stelvio_pass.jpg"
          alt={t("nav.scenicRoadAlt")}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/pacific_route_highway.jpg";
          }}
        />
      </div>

      <PlannerNav activePath="/my-trips" />

      <div className="pp-layout">
        <div className="tb-wrap">
          {authLoading || loading || (user && !tripId) ? (
            <div className="tb-card tb-state">
              <div className="tb-spinner" />
              <p>{t("trip.loading")}</p>
            </div>
          ) : !user ? (
            <div className="tb-card tb-state">
              <span className="tb-state-icon">
                <Compass size={22} strokeWidth={1.6} />
              </span>
              <h1 className="tb-state-title">{t("trip.signInTitle")}</h1>
              <Link href={loginHref} className="tb-primary-link">
                {t("nav.login")}
              </Link>
            </div>
          ) : (
            <div className="tb-card tb-state">
              <span className="tb-state-icon">
                <Compass size={22} strokeWidth={1.6} />
              </span>
              <h1 className="tb-state-title">{t("trip.notFound")}</h1>
              <Link href="/my-trips" className="tb-primary-link">
                {t("trip.backToTrips")}
              </Link>
            </div>
          )}
        </div>
      </div>

      <PageFooter />

      <style>{`
        .tb-wrap { width:100%; max-width:920px; display:flex; flex-direction:column; gap:18px; }
        .tb-card { background:color-mix(in srgb, var(--bg2) 82%, transparent); border:1px solid var(--border); border-radius:26px; padding:24px; box-shadow:0 40px 100px rgba(0,0,0,0.45); }
        .light .tb-card { background:#FFFFFF; box-shadow:0 30px 80px rgba(58,44,16,0.12); }
        .tb-state { display:flex; flex-direction:column; align-items:center; gap:16px; text-align:center; padding:52px 26px; }
        .tb-state-icon { display:grid; place-items:center; width:52px; height:52px; border:1px solid color-mix(in srgb, var(--gold) 38%, transparent); border-radius:16px; background:color-mix(in srgb, var(--gold) 12%, transparent); color:var(--gold); }
        .tb-state-title { font-family:var(--serif); font-size:28px; font-weight:300; color:var(--cream); }
        .tb-state p { font-size:13px; color:var(--dim); }
        .tb-spinner { width:32px; height:32px; border:2px solid var(--border); border-top-color:var(--gold); border-radius:50%; animation:tbSpin .7s linear infinite; }
        @keyframes tbSpin { to { transform:rotate(360deg); } }
        .tb-primary-link { display:inline-flex; align-items:center; gap:9px; padding:14px 28px; border:1px solid var(--gold); border-radius:999px; background:var(--gold); color:#0c0b09; font-size:10px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; }
        @media (max-width:760px) { .tb-card { padding:18px; border-radius:20px; } }
      `}</style>
    </div>
  );
}

export default function TripPage() {
  // useSearchParams braucht eine Suspense-Grenze (gleiches Muster wie /explore).
  return (
    <Suspense fallback={null}>
      <TripBuilder />
    </Suspense>
  );
}