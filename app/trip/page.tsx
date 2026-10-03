"use client";

// Trip Builder.
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
  CalendarDays, Route as RouteIcon, ArrowLeft, Compass, ChevronRight, Globe,
} from "lucide-react";
import { useTheme } from "next-themes";

import PlannerNav from "../components/PlannerNav";
import { ThemeSwitch } from "../components/ThemeSwitch";
import ConfirmDialog from "../components/ConfirmDialog";
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
  fetchTrips,
  persistDayNumbers,
  persistStopOrder,
  touchTrip,
  updateTripTitle,
  type Trip,
  type TripRoute,
} from "../../lib/trips";

import "../profile/profile.css";

// NEU: Texte für die "Routen ergänzen"-Links. Lokal statt in
// lib/translations, gleiches Muster wie GoogleMapsGate — kann später in die
// zentrale Übersetzungsdatei wandern.
const ADD_TEXT = {
  de: {
    findRoutes: "Passende Routen finden",
    addRoutes: "Routen hinzufügen",
    newTrip: "Neuen Trip planen",
    allTrips: "Alle Trips",
    backToAll: "Zurück zu allen Trips",
    overviewTitle: "Deine Trips",
    overviewSub: "Alles, was du im Route Planner gebaut hast. Öffne einen Trip, um Tage und Routen zu bearbeiten.",
    overviewEmpty: "Du hast noch keinen Trip geplant.",
    overviewEmptyText: "Gib im Route Planner Start und Ziel ein, wähle Panoramarouten entlang der Strecke und speichere sie als Trip.",
    overviewError: "Deine Trips konnten nicht geladen werden.",
    retry: "Erneut versuchen",
    noRoutes: "Noch keine Routen",
    updated: "Bearbeitet am {date}",
    more: "+{n} weitere",
  },
  en: {
    findRoutes: "Find routes for this trip",
    addRoutes: "Add routes",
    newTrip: "Plan a new trip",
    allTrips: "All trips",
    backToAll: "Back to all trips",
    overviewTitle: "Your trips",
    overviewSub: "Everything you've built in the Route Planner. Open a trip to edit its days and routes.",
    overviewEmpty: "You haven't planned a trip yet.",
    overviewEmptyText: "Enter a start and destination in the Route Planner, pick scenic routes along the way and save them as a trip.",
    overviewError: "Your trips couldn't be loaded.",
    retry: "Try again",
    noRoutes: "No routes yet",
    updated: "Edited {date}",
    more: "+{n} more",
  },
  ru: {
    findRoutes: "Найти маршруты для поездки",
    addRoutes: "Добавить маршруты",
    newTrip: "Спланировать новую поездку",
    allTrips: "Все поездки",
    backToAll: "Назад ко всем поездкам",
    overviewTitle: "Ваши поездки",
    overviewSub: "Всё, что вы создали в планировщике маршрутов. Откройте поездку, чтобы изменить дни и маршруты.",
    overviewEmpty: "Вы ещё не спланировали ни одной поездки.",
    overviewEmptyText: "Укажите старт и цель в планировщике, выберите живописные маршруты по пути и сохраните их как поездку.",
    overviewError: "Не удалось загрузить ваши поездки.",
    retry: "Повторить",
    noRoutes: "Пока нет маршрутов",
    updated: "Изменено {date}",
    more: "+{n} ещё",
  },
} as const;

type AddLang = keyof typeof ADD_TEXT;

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
  // NEU: "mytrips" = über My Trips -> Trip -> "All trips" in die Übersicht
  // gekommen. Nur dann bietet die Übersicht "Back to my trips" an.
  const fromMyTrips = searchParams.get("from") === "mytrips";
  const router = useRouter();

  const { t, lang } = useLanguage();
  const tx = ADD_TEXT[(lang as AddLang) in ADD_TEXT ? (lang as AddLang) : "de"];
  const { unit } = useUnit();
  const { user, loading: authLoading } = useAuth();

  const [days, setDays] = useState<BuilderDay[]>([]);
  const [title, setTitle] = useState("");
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

  // NEU: Übersicht aller Trips (/trip ohne ?id=)
  const [overviewTrips, setOverviewTrips] = useState<Trip[]>([]);
  const [overviewError, setOverviewError] = useState(false);
  const [overviewReload, setOverviewReload] = useState(0);

  // ----------------------------------------------------------------- Laden
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    // NEU: Ohne ?id= zeigt /trip die Übersicht aller Trips (vorher:
    // "nicht gefunden"). Gleiche Abfrage wie /my-trips, neueste zuerst.
    if (!tripId) {
      setLoading(true);
      (async () => {
        const data = await fetchTrips(user.id);
        if (cancelled) return;
        setOverviewTrips(data ?? []);
        setOverviewError(data === null);
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }

    // Beim Wechsel aus der Übersicht (oder von einem anderen Trip) keinen
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
  }, [tripId, user, authLoading, overviewReload]);

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

      <PlannerNav activePath="/plan" />

      <div className="pp-layout">
        <div className="tb-wrap">
          {authLoading || loading ? (
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
          ) : !tripId ? (
            // ------------------------------------------------ NEU: Übersicht
            <>
              <header className="tb-card tb-header">
                <p className="tb-eyebrow">{t("trip.eyebrow")}</p>
                <h1 className="tb-overview-title">{tx.overviewTitle}</h1>
                <p className="tb-overview-sub">{tx.overviewSub}</p>
              </header>

              {overviewError ? (
                <div className="tb-card tb-state">
                  <h2 className="tb-state-title">{tx.overviewError}</h2>
                  <button
                    className="tb-add-day"
                    onClick={() => setOverviewReload((value) => value + 1)}
                  >
                    {tx.retry}
                  </button>
                </div>
              ) : overviewTrips.length === 0 ? (
                <div className="tb-card tb-state">
                  <span className="tb-state-icon">
                    <Compass size={22} strokeWidth={1.6} />
                  </span>
                  <h2 className="tb-state-title">{tx.overviewEmpty}</h2>
                  <p>{tx.overviewEmptyText}</p>
                  <Link href="/plan" className="tb-primary-link">
                    {tx.newTrip}
                  </Link>
                </div>
              ) : (
                <div className="tb-card tb-overview-list">
                  {overviewTrips.map((trip) => {
                    const stops = trip.trip_days.flatMap((day) => day.trip_stops);
                    const preview =
                      stops.map((stop) => stop.routes?.image_url).find(Boolean) ||
                      "/amalfi_coast_road.jpg";
                    const countries = [
                      ...new Set(stops.map((stop) => stop.routes?.country).filter(Boolean)),
                    ];
                    const titles = stops
                      .map((stop) => localizedTitle(stop.routes, lang))
                      .filter(Boolean);
                    const shown = titles.slice(0, 4);
                    const updated = trip.updated_at
                      ? new Date(trip.updated_at).toLocaleDateString(lang, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "";

                    return (
                      <Link
                        key={trip.id}
                        href={`/trip?id=${trip.id}&from=builder`}
                        className="tb-overview-item"
                      >
                        <span className="tb-overview-thumb">
                          <img
                            src={preview}
                            alt={trip.title}
                            onError={(e) => {
                              e.currentTarget.src = "/amalfi_coast_road.jpg";
                            }}
                          />
                        </span>

                        <span className="tb-overview-info">
                          {countries.length > 0 && (
                            <span className="tb-stop-country">{countries.join(" · ")}</span>
                          )}
                          <span className="tb-overview-name">{trip.title}</span>
                          <span className="tb-overview-meta">
                            <span>
                              <CalendarDays size={11} strokeWidth={2} />
                              {trip.trip_days.length} {t("trip.stats.days")}
                            </span>
                            <span>
                              <RouteIcon size={11} strokeWidth={2} />
                              {stops.length} {t("trip.stats.routes")}
                            </span>
                            {updated && <span>{tx.updated.replace("{date}", updated)}</span>}
                          </span>
                          <span className="tb-overview-routes">
                            {shown.length === 0 ? (
                              <span className="tb-overview-chip is-empty">{tx.noRoutes}</span>
                            ) : (
                              shown.map((name, index) => (
                                <span key={`${name}-${index}`} className="tb-overview-chip">
                                  {name}
                                </span>
                              ))
                            )}
                            {titles.length > shown.length && (
                              <span className="tb-overview-chip is-more">
                                {tx.more.replace("{n}", String(titles.length - shown.length))}
                              </span>
                            )}
                          </span>
                        </span>

                        <span className="tb-overview-open" aria-hidden="true">
                          <ChevronRight size={18} strokeWidth={2} />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}

              <div className="tb-footer-actions">
                <Link href="/plan" className="tb-add-day tb-add-day-link">
                  <Plus size={14} strokeWidth={2.4} /> {tx.newTrip}
                </Link>
                {fromMyTrips && (
                  <Link href="/my-trips" className="tb-secondary-link">
                    <ArrowLeft size={13} strokeWidth={2} /> {t("trip.backToTrips")}
                  </Link>
                )}
              </div>
            </>
          ) : notFound ? (
            <div className="tb-card tb-state">
              <span className="tb-state-icon">
                <Compass size={22} strokeWidth={1.6} />
              </span>
              <h1 className="tb-state-title">{t("trip.notFound")}</h1>
              <Link href="/my-trips" className="tb-primary-link">
                {t("trip.backToTrips")}
              </Link>
            </div>
          ) : (
            <>
              <header className="tb-card tb-header">
                <div className="tb-header-top">
                  <p className="tb-eyebrow">{t("trip.eyebrow")}</p>
                  <div className="tb-header-actions">
                    <span className={`tb-saved ${saveState === "error" ? "is-error" : ""}`}>
                      {saveLabel()}
                    </span>
                    <button
                      className="tb-delete-trip"
                      onClick={() => setConfirmDelete(true)}
                      title={t("trip.delete")}
                    >
                      <Trash2 size={13} strokeWidth={2} /> {t("trip.delete")}
                    </button>
                  </div>
                </div>

                <input
                  className="tb-title-input"
                  value={title}
                  placeholder={t("trip.titlePlaceholder")}
                  onChange={(e) => {
                    titleTouched.current = true;
                    setTitle(e.target.value);
                  }}
                />

                <div className="tb-stats">
                  <span>
                    <CalendarDays size={13} strokeWidth={2} />
                    {days.length} {t("trip.stats.days")}
                  </span>
                  <span>
                    <RouteIcon size={13} strokeWidth={2} />
                    {totalStops} {t("trip.stats.routes")}
                  </span>
                </div>
              </header>

              {days.map((day, dayIndex) => (
                <section
                  key={day.id}
                  className="tb-card tb-day"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(day.id, day.stops.length)}
                >
                  <div className="tb-day-head">
                    <h2 className="tb-day-title">
                      {t("trip.day")} {day.dayNumber}
                    </h2>
                    <div className="tb-day-head-actions">
                      {/* NEU: Routen gezielt für diesen Tag ergänzen */}
                      {day.stops.length > 0 && (
                        <Link href={planHref(day.id)} className="tb-day-add" draggable={false}>
                          <Plus size={12} strokeWidth={2.4} /> {tx.addRoutes}
                        </Link>
                      )}
                      {days.length > 1 && (
                        <button
                          className="tb-icon-btn tb-icon-danger"
                          onClick={() => handleRemoveDay(day.id)}
                          title={t("trip.removeDay")}
                          aria-label={t("trip.removeDay")}
                        >
                          <Trash2 size={14} strokeWidth={2} />
                        </button>
                      )}
                    </div>
                  </div>

                  {day.stops.length === 0 ? (
                    <div className="tb-day-empty">
                      <p>{t("trip.emptyDay")}</p>
                      {/* NEU: direkt passende Routen für diese Strecke suchen */}
                      <Link href={planHref(day.id)} className="tb-find-routes" draggable={false}>
                        <Compass size={13} strokeWidth={2} /> {tx.findRoutes}
                      </Link>
                    </div>
                  ) : (
                    <div className="tb-stops">
                      {day.stops.map((stop, stopIndex) => (
                        <div
                          key={stop.id}
                          className={`tb-stop ${
                            dropTarget?.dayId === day.id && dropTarget.index === stopIndex
                              ? "is-drop-target"
                              : ""
                          }`}
                          draggable
                          onDragStart={() => {
                            dragged.current = { dayId: day.id, stopId: stop.id };
                          }}
                          onDragEnd={() => {
                            dragged.current = null;
                            setDropTarget(null);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDropTarget({ dayId: day.id, index: stopIndex });
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDrop(day.id, stopIndex);
                          }}
                        >
                          <span className="tb-stop-handle" aria-hidden="true">
                            <GripVertical size={14} strokeWidth={2} />
                          </span>

                          <Link
                            href={`/routedetail/${stop.routeId}`}
                            prefetch={false}
                            className="tb-stop-thumb"
                          >
                            <img
                              src={stop.route?.image_url || "/amalfi_coast_road.jpg"}
                              alt={localizedTitle(stop.route, lang)}
                              onError={(e) => {
                                e.currentTarget.src = "/amalfi_coast_road.jpg";
                              }}
                            />
                          </Link>

                          <div className="tb-stop-info">
                            <p className="tb-stop-country">{stop.route?.country}</p>
                            <Link href={`/routedetail/${stop.routeId}`} prefetch={false}>
                              <h3 className="tb-stop-title">{localizedTitle(stop.route, lang)}</h3>
                            </Link>
                            <p className="tb-stop-meta">
                              <Navigation size={11} strokeWidth={2} />
                              {formatDistance(
                                stop.route?.distance_km as number | null | undefined,
                                unit
                              )}
                            </p>
                          </div>

                          {/* Pfeile zusaetzlich zum Ziehen — auf Touch-Geraeten
                              ist HTML5-Drag unzuverlaessig. */}
                          <div className="tb-stop-actions">
                            <button
                              className="tb-icon-btn"
                              onClick={() => shiftStop(dayIndex, stopIndex, -1)}
                              disabled={dayIndex === 0 && stopIndex === 0}
                              title={t("trip.moveUp")}
                              aria-label={t("trip.moveUp")}
                            >
                              <ChevronUp size={14} strokeWidth={2.2} />
                            </button>
                            <button
                              className="tb-icon-btn"
                              onClick={() => shiftStop(dayIndex, stopIndex, 1)}
                              disabled={
                                dayIndex === days.length - 1 &&
                                stopIndex === day.stops.length - 1
                              }
                              title={t("trip.moveDown")}
                              aria-label={t("trip.moveDown")}
                            >
                              <ChevronDown size={14} strokeWidth={2.2} />
                            </button>
                            <button
                              className="tb-icon-btn tb-icon-danger"
                              onClick={() => handleRemoveStop(day.id, stop.id)}
                              title={t("trip.removeStop")}
                              aria-label={t("trip.removeStop")}
                            >
                              <Trash2 size={13} strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ))}

              <div className="tb-footer-actions">
                <button className="tb-add-day" onClick={handleAddDay}>
                  <Plus size={14} strokeWidth={2.4} /> {t("trip.addDay")}
                </button>
                {/* Startet einen komplett neuen Trip im leeren Planner. Das
                    Ergänzen dieses Trips läuft über "Routen hinzufügen" am Tag. */}
                <Link href="/plan" className="tb-secondary-link">
                  <Compass size={13} strokeWidth={2} /> {tx.newTrip}
                </Link>
                {/* NEU: Rückweg je nach Herkunft — aus der Übersicht nur
                    "Zurück zu allen Trips", sonst wie bisher */}
                {fromBuilder ? (
                  <Link href="/trip" className="tb-secondary-link">
                    <ArrowLeft size={13} strokeWidth={2} /> {tx.backToAll}
                  </Link>
                ) : (
                  <>
                    <Link href="/trip?from=mytrips" className="tb-secondary-link">
                      <RouteIcon size={13} strokeWidth={2} /> {tx.allTrips}
                    </Link>
                    <Link href="/my-trips" className="tb-secondary-link">
                      <ArrowLeft size={13} strokeWidth={2} /> {t("trip.backToTrips")}
                    </Link>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* NEU: Footer wie auf /my-trips (Abschnitt "Footer" oben in dieser Datei) */}
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
        .tb-wrap { width:100%; max-width:920px; display:flex; flex-direction:column; gap:18px; }

        .tb-card { background:color-mix(in srgb, var(--bg2) 82%, transparent); border:1px solid var(--border); border-radius:26px; padding:24px; box-shadow:0 40px 100px rgba(0,0,0,0.45); }
        .light .tb-card { background:#FFFFFF; box-shadow:0 30px 80px rgba(58,44,16,0.12); }

        .tb-state { display:flex; flex-direction:column; align-items:center; gap:16px; text-align:center; padding:52px 26px; }
        .tb-state-icon { display:grid; place-items:center; width:52px; height:52px; border:1px solid color-mix(in srgb, var(--gold) 38%, transparent); border-radius:16px; background:color-mix(in srgb, var(--gold) 12%, transparent); color:var(--gold); }
        .tb-state-title { font-family:var(--serif); font-size:28px; font-weight:300; color:var(--cream); }
        .tb-state p { font-size:13px; color:var(--dim); }
        .tb-spinner { width:32px; height:32px; border:2px solid var(--border); border-top-color:var(--gold); border-radius:50%; animation:tbSpin .7s linear infinite; }
        @keyframes tbSpin { to { transform:rotate(360deg); } }

        .tb-header-top { display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; }
        .tb-eyebrow { font-size:9px; font-weight:800; letter-spacing:0.3em; text-transform:uppercase; color:var(--gold); }
        .tb-saved { font-size:10px; font-weight:600; letter-spacing:0.06em; color:var(--dim); }
        .tb-saved.is-error { color:#e08080; }
        .tb-header-actions { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
        button.tb-delete-trip { display:inline-flex; align-items:center; gap:7px; padding:8px 14px; border:1px solid var(--border); border-radius:999px; background:none; color:var(--muted); font-size:9px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase; transition:all .18s; }
        button.tb-delete-trip:hover { color:#e08080; border-color:rgba(224,128,128,0.45); background:rgba(224,128,128,0.08); }

        .tb-title-input { width:100%; margin:14px 0 16px; padding:10px 0; border:none; border-bottom:1px solid var(--border); background:none; outline:none; font-family:var(--serif); font-size:clamp(26px,4vw,38px); font-weight:300; letter-spacing:-0.02em; color:var(--cream); transition:border-color .2s; }
        .tb-title-input:focus { border-bottom-color:var(--gold); }
        .tb-title-input::placeholder { color:var(--dim); }

        .tb-stats { display:flex; gap:18px; flex-wrap:wrap; }
        .tb-stats span { display:inline-flex; align-items:center; gap:7px; font-size:10px; font-weight:700; letter-spacing:0.16em; text-transform:uppercase; color:var(--muted); }
        .tb-stats svg { color:var(--gold); flex-shrink:0; }

        .tb-day-head { display:flex; align-items:center; justify-content:space-between; gap:14px; padding-bottom:14px; border-bottom:1px solid var(--border); margin-bottom:6px; }
        .tb-day-title { font-family:var(--serif); font-size:24px; font-weight:400; color:var(--cream); }
        .tb-day-head-actions { display:flex; align-items:center; gap:12px; }
        .tb-day-add { display:inline-flex; align-items:center; gap:6px; font-size:9px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase; color:var(--gold); white-space:nowrap; transition:opacity .2s; }
        .tb-day-add:hover { opacity:0.75; }

        .tb-day-empty { display:flex; flex-direction:column; align-items:center; gap:14px; padding:24px; margin-top:10px; border:1px dashed var(--border); border-radius:16px; text-align:center; }
        .tb-day-empty p { font-size:12.5px; color:var(--dim); }
        .tb-find-routes { display:inline-flex; align-items:center; gap:8px; padding:11px 22px; border:1px solid var(--gold); border-radius:999px; background:var(--gold); color:#0c0b09; font-size:9px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; transition:transform .2s; }
        .tb-find-routes:hover { transform:translateY(-1px); }

        .tb-stops { display:flex; flex-direction:column; }
        .tb-stop { display:grid; grid-template-columns:auto 84px 1fr auto; align-items:center; gap:14px; padding:14px 0; border-bottom:1px solid var(--border); background:transparent; transition:background .15s, box-shadow .15s; }
        .tb-stop:last-child { border-bottom:none; }
        .tb-stop.is-drop-target { box-shadow:inset 0 2px 0 var(--gold); }
        .tb-stop-handle { display:flex; align-items:center; color:var(--dim); cursor:grab; }
        .tb-stop-thumb { width:84px; height:62px; border-radius:12px; overflow:hidden; background:var(--bg3); border:1px solid var(--border); flex-shrink:0; }
        .tb-stop-thumb img { width:100%; height:100%; object-fit:cover; }
        .tb-stop-info { min-width:0; }
        .tb-stop-country { font-size:8px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:var(--gold); margin-bottom:4px; }
        .tb-stop-title { font-family:var(--serif); font-size:19px; font-weight:400; color:var(--cream); line-height:1.15; margin-bottom:5px; }
        .tb-stop-meta { display:inline-flex; align-items:center; gap:6px; font-size:10.5px; color:var(--dim); font-weight:500; }
        .tb-stop-actions { display:flex; align-items:center; gap:6px; flex-shrink:0; }

        button.tb-icon-btn { width:30px; height:30px; display:flex; align-items:center; justify-content:center; border:1px solid var(--border); border-radius:50%; color:var(--muted); background:none; transition:all .18s; }
        button.tb-icon-btn:hover:not(:disabled) { color:var(--gold); border-color:color-mix(in srgb, var(--gold) 45%, transparent); }
        button.tb-icon-btn:disabled { opacity:0.3; cursor:not-allowed; }
        button.tb-icon-danger:hover:not(:disabled) { color:#e08080; border-color:rgba(224,128,128,0.45); background:rgba(224,128,128,0.08); }

        /* NEU: Übersicht aller Trips */
        .tb-overview-title { margin:14px 0 10px; font-family:var(--serif); font-size:clamp(30px,4.4vw,44px); font-weight:300; letter-spacing:-0.02em; color:var(--cream); }
        .tb-overview-sub { margin-bottom:16px; max-width:560px; font-size:13px; line-height:1.7; color:var(--dim); }
        .tb-overview-list { display:flex; flex-direction:column; padding-top:10px; padding-bottom:10px; }
        .tb-overview-item { display:grid; grid-template-columns:120px 1fr auto; align-items:center; gap:18px; padding:16px 0; border-bottom:1px solid var(--border); color:inherit; text-decoration:none; transition:background .15s; }
        .tb-overview-item:last-child { border-bottom:none; }
        .tb-overview-thumb { display:block; width:120px; height:86px; border-radius:14px; overflow:hidden; background:var(--bg3); border:1px solid var(--border); }
        .tb-overview-thumb img { width:100%; height:100%; object-fit:cover; transition:transform .6s ease; }
        .tb-overview-item:hover .tb-overview-thumb img { transform:scale(1.06); }
        .tb-overview-info { display:flex; flex-direction:column; gap:6px; min-width:0; }
        .tb-overview-name { font-family:var(--serif); font-size:22px; font-weight:400; line-height:1.15; color:var(--cream); transition:color .2s; }
        .tb-overview-item:hover .tb-overview-name { color:var(--gold); }
        .tb-overview-meta { display:flex; flex-wrap:wrap; gap:14px; font-size:10.5px; font-weight:500; color:var(--dim); }
        .tb-overview-meta > span { display:inline-flex; align-items:center; gap:5px; }
        .tb-overview-meta svg { color:var(--gold); }
        .tb-overview-routes { display:flex; flex-wrap:wrap; gap:6px; margin-top:4px; }
        .tb-overview-chip { padding:4px 10px; border:1px solid var(--border); border-radius:999px; font-size:10px; font-weight:600; color:var(--muted); white-space:nowrap; }
        .tb-overview-chip.is-more { color:var(--gold); border-color:color-mix(in srgb, var(--gold) 40%, transparent); }
        .tb-overview-chip.is-empty { font-style:italic; color:var(--dim); }
        .tb-overview-open { display:flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:50%; border:1px solid color-mix(in srgb, var(--gold) 45%, transparent); color:var(--gold); transition:all .2s; }
        .tb-overview-item:hover .tb-overview-open { background:var(--gold); color:var(--bg); transform:translateX(2px); }
        .tb-add-day-link { display:inline-flex; align-items:center; gap:9px; padding:14px 26px; border:1px dashed color-mix(in srgb, var(--gold) 45%, transparent); border-radius:999px; background:color-mix(in srgb, var(--gold) 8%, transparent); color:var(--gold); font-size:10px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; transition:background .2s; }
        .tb-add-day-link:hover { background:color-mix(in srgb, var(--gold) 16%, transparent); }

        .tb-footer-actions { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
        button.tb-add-day { display:inline-flex; align-items:center; gap:9px; padding:14px 26px; border:1px dashed color-mix(in srgb, var(--gold) 45%, transparent); border-radius:999px; background:color-mix(in srgb, var(--gold) 8%, transparent); color:var(--gold); font-size:10px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; transition:background .2s; }
        button.tb-add-day:hover { background:color-mix(in srgb, var(--gold) 16%, transparent); }
        .tb-secondary-link { display:inline-flex; align-items:center; gap:8px; font-size:10px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase; color:var(--muted); transition:color .2s; }
        .tb-secondary-link:hover { color:var(--gold); }
        .tb-primary-link { display:inline-flex; align-items:center; gap:9px; padding:14px 28px; border:1px solid var(--gold); border-radius:999px; background:var(--gold); color:#0c0b09; font-size:10px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; }

        @media (max-width:760px) {
          .tb-card { padding:18px; border-radius:20px; box-shadow:0 24px 60px rgba(0,0,0,0.35); }
          .tb-day-title { font-size:20px; }
          /* Tages-Bloecke stapeln ohnehin untereinander; die Stopp-Zeile wird
             kompakter und der Griff verschwindet zugunsten der Pfeile. */
          .tb-stop { grid-template-columns:64px 1fr auto; gap:11px; }
          .tb-stop-handle { display:none; }
          .tb-stop-thumb { width:64px; height:52px; }
          .tb-stop-title { font-size:15px; }
          .tb-stop-actions { flex-direction:column; gap:5px; }
          .tb-footer-actions { flex-direction:column; align-items:stretch; }
          .tb-overview-item { grid-template-columns:72px 1fr auto; gap:12px; }
          .tb-overview-thumb { width:72px; height:58px; }
          .tb-overview-name { font-size:17px; }
          .tb-overview-open { width:32px; height:32px; }
          .tb-add-day-link { justify-content:center; }
          button.tb-add-day { justify-content:center; }
          .tb-secondary-link { justify-content:center; }
        }
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