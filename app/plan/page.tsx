"use client";

import Link from "next/link";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MapPin, Flag, Navigation, Clock, ArrowRight, ArrowLeft, Check, X,
  ChevronDown, Globe,
} from "lucide-react";
import { useTheme } from "next-themes";

import PlannerNav from "../components/PlannerNav";
import { ThemeSwitch } from "../components/ThemeSwitch";
import GoogleMapsGate from "../components/GoogleMapsGate";
import RouteCard, { ROUTE_CARD_STYLES } from "../components/RouteCard";
import { useLanguage } from "../LanguageContext";
import { useUnit } from "../UnitContext";
import { formatDistance } from "@/lib/formatDistance";
import { supabasePublic, safeQuery, getSessionSafe } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import type { TranslationKey } from "@/lib/translations";
import {
  hasUsableCoordinates,
  selectDetourCandidates,
  type LngLat,
} from "../../lib/routeCorridor";
import {
  DEFAULT_DETOUR_LIMIT_PCT,
  MAX_DETOUR_LIMIT_PCT,
  MIN_DETOUR_LIMIT_PCT,
  candidateWaypoints,
  filterByDetourLimit,
  scoreDetourCandidates,
  type ScoredCandidate,
} from "../../lib/routeDetour";
import {
  computeBaselineDirections,
  computeDirections,
  fetchPlaceSuggestions,
  listRouteOptions,
  loadGoogleMaps,
  overviewPathToLngLat,
  pickRoute,
  summarizeDirections,
  type DirectionsWaypoint,
  type PlaceSuggestion,
  type RouteOption,
} from "../../lib/googleMaps";
import { addStopsToDay, createTrip, deleteTripStop, fetchTrip, touchTrip } from "../../lib/trips";
import { clearPendingTrip, readPendingTrip, savePendingTrip } from "../../lib/tripHandoff";

// Gleiches CSS wie Profile/Support: liefert das bestehende Farb-Variablen-System
// (--bg, --cream, --gold ...) und die .pp-*-Klassen für Wrapper und Nav.
// Kein eigenes Farbschema.
import "../profile/profile.css";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Genau die Spalten, die Karte und Matching brauchen. */
const ROUTE_COLUMNS =
  "id, title, title_en, title_de, title_ru, description, description_en, description_de, description_ru, " +
  "country, duration, distance_km, image_url, start_lat, start_lng, end_lat, end_lng";

type PlannerRoute = {
  id: string;
  title: string | null;
  country: string | null;
  duration: string | null;
  distance_km: number | null;
  image_url: string | null;
  start_lat: number | string | null;
  start_lng: number | string | null;
  end_lat: number | string | null;
  end_lng: number | string | null;
};

/**
 * "Trip ergänzen"-Modus (/plan?trip=<id>[&day=<dayId>]).
 * Der Planner übernimmt Start/Ziel eines bestehenden Trips, rechnet
 * automatisch und hängt die Auswahl an einen Tag dieses Trips an, statt
 * einen neuen Trip anzulegen.
 */
type TargetTrip = {
  id: string;
  title: string;
  dayId: string;
  dayNumber: number;
  /** Anzahl Stopps des Zieltags — neue Stopps werden dahinter einsortiert. */
  dayStopCount: number;
  /** Routen, die schon irgendwo im Trip liegen — werden nicht erneut angeboten. */
  existingRouteIds: string[];
  /** NEU: Stopp-IDs je Route (eine Route kann an mehreren Tagen liegen) — zum Entfernen. */
  stopIdsByRoute: Record<string, string[]>;
};

// Texte für die neuen Planner-Funktionen. Lokal statt in lib/translations,
// gleiches Muster wie GoogleMapsGate — kann später in die zentrale
// Übersetzungsdatei wandern.
const TRIP_TEXT = {
  de: {
    banner: "Du bearbeitest deinen Trip „{title}“ – neue Routen landen an Tag {day}, abgewählte werden entfernt.",
    backToTrip: "Zurück zum Trip",
    addToTrip: "Zum Trip hinzufügen",
    adding: "Wird hinzugefügt…",
    inTrip: "Im Trip",
    willRemove: "Wird entfernt",
    applyChanges: "Änderungen speichern",
    applying: "Wird gespeichert…",
    changesAdd: "+{n} hinzufügen",
    changesRemove: "−{n} entfernen",
    noChanges: "Wähle Routen aus oder ab, um deinen Trip zu ändern.",
    addError: "Die Änderungen konnten nicht gespeichert werden. Bitte versuch es erneut.",
    tripLoadError: "Der Trip konnte nicht geladen werden. Du kannst hier trotzdem einen neuen Trip planen.",
    toBuilder: "Zum Trip Builder",
    restored: "Deine Auswahl von vorhin wurde wiederhergestellt.",
    detourRemembered: "Deine Einstellung wird gespeichert und beim nächsten Besuch übernommen.",
    editingEyebrow: "Routenplaner · Trip bearbeiten",
    selection: "Deine Auswahl",
    selectionEmpty: "Noch nichts ausgewählt – tippe unten auf eine Route, um sie hinzuzufügen.",
    removeRoute: "Entfernen",
    liveAuto: "Route passt sich automatisch an",
    liveUpdating: "Route wird berechnet …",
    alongTheWay: "Entlang der Strecke",
    variantsLabel: "Streckenvariante",
    via: "über {road}",
    variantN: "Variante {n}",
    variantsHint: "Mit ausgewählten Routen fährt der Planer automatisch die beste Strecke über deine Auswahl. Entferne alle Routen, um wieder eine Variante zu wählen.",
    withSelection: "inkl. Auswahl",
    bestWithSelection: "Beste Route mit Auswahl",
    recommended: "Empfohlen",
    sameAsBest: "wie beste Route",
  },
  en: {
    banner: "You're editing “{title}” – new routes go to day {day}, deselected ones will be removed.",
    backToTrip: "Back to trip",
    addToTrip: "Add to trip",
    adding: "Adding…",
    inTrip: "In your trip",
    willRemove: "Will be removed",
    applyChanges: "Save changes",
    applying: "Saving…",
    changesAdd: "+{n} to add",
    changesRemove: "−{n} to remove",
    noChanges: "Select or deselect routes to change your trip.",
    addError: "Your changes couldn't be saved. Please try again.",
    tripLoadError: "The trip couldn't be loaded. You can still plan a new trip here.",
    toBuilder: "Open Trip Builder",
    restored: "Your previous selection has been restored.",
    detourRemembered: "Your setting is saved and applied on your next visit.",
    editingEyebrow: "Route planner · editing trip",
    selection: "Your selection",
    selectionEmpty: "Nothing selected yet – tap a route below to add it.",
    removeRoute: "Remove",
    liveAuto: "Route updates automatically",
    liveUpdating: "Calculating route …",
    alongTheWay: "Along the way",
    variantsLabel: "Route option",
    via: "via {road}",
    variantN: "Option {n}",
    variantsHint: "With routes selected, the planner automatically takes the best way through your selection. Remove all routes to choose an option again.",
    withSelection: "incl. selection",
    bestWithSelection: "Best route with selection",
    recommended: "Recommended",
    sameAsBest: "same as best route",
  },
  ru: {
    banner: "Вы редактируете поездку «{title}» – новые маршруты попадут в день {day}, снятые будут удалены.",
    backToTrip: "Назад к поездке",
    addToTrip: "Добавить в поездку",
    adding: "Добавляем…",
    inTrip: "В поездке",
    willRemove: "Будет удалён",
    applyChanges: "Сохранить изменения",
    applying: "Сохраняем…",
    changesAdd: "+{n} добавить",
    changesRemove: "−{n} удалить",
    noChanges: "Выберите или снимите маршруты, чтобы изменить поездку.",
    addError: "Не удалось сохранить изменения. Попробуйте ещё раз.",
    tripLoadError: "Не удалось загрузить поездку. Вы всё равно можете спланировать новую.",
    toBuilder: "Открыть конструктор поездки",
    restored: "Ваш предыдущий выбор восстановлен.",
    detourRemembered: "Ваша настройка сохраняется и применяется при следующем визите.",
    editingEyebrow: "Планировщик · редактирование поездки",
    selection: "Ваш выбор",
    selectionEmpty: "Пока ничего не выбрано – нажмите на маршрут ниже, чтобы добавить его.",
    removeRoute: "Удалить",
    liveAuto: "Маршрут обновляется автоматически",
    liveUpdating: "Маршрут рассчитывается …",
    alongTheWay: "По пути",
    variantsLabel: "Вариант маршрута",
    via: "через {road}",
    variantN: "Вариант {n}",
    variantsHint: "С выбранными маршрутами планировщик сам прокладывает лучший путь через ваш выбор. Удалите все маршруты, чтобы снова выбрать вариант.",
    withSelection: "с выбором",
    bestWithSelection: "Лучший маршрут с выбором",
    recommended: "Рекомендуем",
    sameAsBest: "как лучший маршрут",
  },
} as const;

type TripLang = keyof typeof TRIP_TEXT;

/**
 * NEU: Firefox stellt beim Neuladen den alten disabled-Zustand von Buttons
 * wieder her, bevor React die Seite übernimmt -> Hydration-Warnung.
 * autocomplete="off" verhindert das. Als Spread-Objekt übergeben, weil die
 * React-Typen autoComplete an <button> nicht kennen (der Browser schon).
 */
const NO_FORM_STATE_RESTORE = { autoComplete: "off" };

/** Karten-Mittelpunkt, bevor eine Route berechnet wurde (Mitteleuropa). */
const DEFAULT_MAP_CENTER = { lat: 47.2, lng: 10.5 };
const DEFAULT_MAP_ZOOM = 5;

/**
 * NEU: Linienfarben wie auf google.com/maps — gewählte Strecke blau obenauf,
 * Alternativen grau darunter, beim Überfahren dunkler.
 */
const ACTIVE_ROUTE_COLOR = "#1A73E8";
const ALT_ROUTE_COLOR = "#9AA0A6";
const ALT_ROUTE_HOVER_COLOR = "#5F6368";

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes} min`;
  return `${hours} h ${String(minutes).padStart(2, "0")} min`;
}

/**
 * NEU: Innenabstand für fitBounds — auf breiten Bildschirmen liegt links das
 * Glas-Panel über der Karte, die Strecke soll daneben sichtbar sein.
 */
function mapPadding() {
  if (typeof window !== "undefined" && window.innerWidth > 900) {
    return { top: 120, right: 70, bottom: 90, left: 500 };
  }
  return { top: 70, right: 30, bottom: 50, left: 30 };
}

/** NEU: Routentitel in der aktuellen Sprache (für die Auswahl-Liste im Panel). */
function localizedTitle(route: unknown, lang: string): string {
  const record = (route ?? {}) as Record<string, unknown>;
  const value = record[`title_${lang}`] || record.title_en || record.title_de || record.title;
  return typeof value === "string" ? value : "";
}

/** Verzögerung, bevor nach einer Eingabe automatisch gerechnet wird. */
const AUTO_CALC_DELAY_MS = 150;

/**
 * Unterhalb dieser Mehrfahrzeit wird der Umweg nicht als Zahl ausgewiesen,
 * sondern als "fast ohne Umweg" — fünf Minuten liegen innerhalb dessen, was
 * eine Directions-Schätzung ohnehin schwankt.
 */
const NEGLIGIBLE_DETOUR_SECONDS = 300;

/**
 * NEU: Kurzfristiger Entwurf des Planners.
 *
 * Wird gespeichert, kurz bevor ein nicht eingeloggter Nutzer beim Klick auf
 * "Als Trip speichern" zum Login geschickt wird. Kommt er ohne Login zurück
 * (z.B. über "Go back"), stellt /plan Start, Ziel, Streckenvariante, Regler
 * und die gewählten Routen wieder her.
 *
 * sessionStorage statt localStorage: gilt nur für diesen Tab und verschwindet
 * beim Schließen — wirklich nur ein kurzfristiger Zwischenstand. Nach einer
 * Stunde gilt er als veraltet und wird ignoriert.
 */
const PLAN_DRAFT_KEY = "scenicRoutes.planDraft";

/**
 * NEU: Dauerhaft gemerkter Stand des Umweg-Reglers (localStorage, pro Browser).
 * Damit der Nutzer ihn nicht bei jedem Besuch neu einstellen muss.
 */
const DETOUR_PREF_KEY = "scenicRoutes.detourLimitPct";

function readDetourPref(): number | null {
  try {
    const raw = window.localStorage.getItem(DETOUR_PREF_KEY);
    if (raw === null) return null;
    const value = Number(raw);
    if (!Number.isFinite(value)) return null;
    return Math.min(MAX_DETOUR_LIMIT_PCT, Math.max(MIN_DETOUR_LIMIT_PCT, Math.round(value)));
  } catch {
    return null;
  }
}

function saveDetourPref(value: number) {
  try {
    window.localStorage.setItem(DETOUR_PREF_KEY, String(value));
  } catch {
    // Speicher gesperrt (z.B. privater Modus) — dann eben ohne Merken.
  }
}
const PLAN_DRAFT_MAX_AGE_MS = 60 * 60 * 1000;

type PlanDraft = {
  start: string;
  end: string;
  routeIds: string[];
  routeIndex: number;
  detourLimitPct: number;
  savedAt: number;
  /**
   * NEU: Planner-Adresse inkl. Parametern (z.B. "/plan?trip=…&day=…"), zu der
   * der Entwurf gehört. Wird nur dort wiederhergestellt — ein Entwurf aus dem
   * Trip-bearbeiten-Modus landet so nie in einem anderen Trip.
   */
  context?: string;
  /** NEU: ohne Hinweis "wiederhergestellt" (Rückkehr von der Detailseite). */
  silent?: boolean;
};

function savePlanDraft(draft: PlanDraft) {
  try {
    window.sessionStorage.setItem(PLAN_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Speicher voll oder gesperrt (z.B. privater Modus) — dann eben ohne Entwurf.
  }
}

function readPlanDraft(): PlanDraft | null {
  try {
    const raw = window.sessionStorage.getItem(PLAN_DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<PlanDraft>;
    if (
      typeof draft.start !== "string" ||
      typeof draft.end !== "string" ||
      !Array.isArray(draft.routeIds) ||
      typeof draft.savedAt !== "number" ||
      Date.now() - draft.savedAt > PLAN_DRAFT_MAX_AGE_MS
    ) {
      window.sessionStorage.removeItem(PLAN_DRAFT_KEY);
      return null;
    }
    return {
      start: draft.start,
      end: draft.end,
      routeIds: draft.routeIds.filter((id): id is string => typeof id === "string"),
      routeIndex: typeof draft.routeIndex === "number" ? draft.routeIndex : 0,
      detourLimitPct:
        typeof draft.detourLimitPct === "number" ? draft.detourLimitPct : DEFAULT_DETOUR_LIMIT_PCT,
      savedAt: draft.savedAt,
      context: typeof draft.context === "string" ? draft.context : undefined,
      silent: draft.silent === true,
    };
  } catch {
    return null;
  }
}

function clearPlanDraft() {
  try {
    window.sessionStorage.removeItem(PLAN_DRAFT_KEY);
  } catch {
    // ignorieren
  }
}

/**
 * Freitextfeld mit Google-Places-Vorschlägen. Die Liste wird bewusst selbst
 * gerendert (statt mit dem Google-Widget), damit sie dem bestehenden
 * Design-/Variablensystem folgt.
 */
function PlaceField({
  label,
  placeholder,
  icon,
  value,
  enabled,
  onChange,
  onCommit,
}: {
  label: string;
  placeholder: string;
  icon: ReactNode;
  value: string;
  /** Ohne Google-Maps-Zustimmung werden keine Places-Requests geschickt. */
  enabled: boolean;
  onChange: (next: string) => void;
  /**
   * NEU: Der Nutzer hat einen Ort festgelegt — Vorschlag angeklickt oder mit
   * Enter bestätigt. Erst dann rechnet der Planner automatisch.
   */
  onCommit?: (value: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  // GEÄNDERT: Vorschläge nur für Text, den der Nutzer selbst getippt hat.
  // Wird der Wert von außen gesetzt (Entwurf wiederhergestellt, Trip-ergänzen-
  // Modus) oder ein Vorschlag übernommen, weicht er vom zuletzt getippten Text
  // ab — dann keine Abfrage und keine aufklappende Liste. Ersetzt das frühere
  // skipNextLookup, das nur den Fall "Vorschlag übernommen" abdeckte.
  const lastTypedRef = useRef<string | null>(null);

  useEffect(() => {
    if (value !== lastTypedRef.current) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    if (!enabled || value.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      fetchPlaceSuggestions(value)
        .then((result) => {
          if (cancelled) return;
          setSuggestions(result.slice(0, 5));
          setOpen(result.length > 0);
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, enabled]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="rp-field" ref={wrapRef}>
      <label className="rp-field-label">{label}</label>
      <div className="rp-field-input">
        <span className="rp-field-icon">{icon}</span>
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => {
            lastTypedRef.current = e.target.value;
            onChange(e.target.value);
          }}
          onKeyDown={(e) => {
            // Enter übernimmt den ersten Vorschlag bzw. den getippten Text
            if (e.key !== "Enter") return;
            e.preventDefault();
            const chosen = (open && suggestions[0]?.text) || value.trim();
            if (!chosen) return;
            if (chosen !== value) onChange(chosen);
            setSuggestions([]);
            setOpen(false);
            onCommit?.(chosen);
          }}
          onFocus={() => setOpen(suggestions.length > 0)}
        />
      </div>

      {open && suggestions.length > 0 && (
        <div className="rp-suggestions">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              className="rp-suggestion"
              onClick={() => {
                onChange(suggestion.text);
                onCommit?.(suggestion.text);
                setSuggestions([]);
                setOpen(false);
              }}
            >
              <MapPin size={12} strokeWidth={2} />
              <span>{suggestion.text}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
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

function PlanPageContent() {
  const { t, lang } = useLanguage();
  const tx = TRIP_TEXT[(lang as TripLang) in TRIP_TEXT ? (lang as TripLang) : "de"];
  const { unit } = useUnit();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripParam = searchParams.get("trip") ?? "";
  const dayParam = searchParams.get("day") ?? "";
  // NEU: Herkunft aus dem Trip Builder durchreichen, damit der Builder nach
  // der Rückkehr weiterhin den passenden Rückweg anbietet.
  const fromSuffix = searchParams.get("from") === "builder" ? "&from=builder" : "";
  // NEU: aktuelle Planner-Adresse — Rückweg für die Detailseite und Schlüssel
  // für den Entwurf.
  const searchString = searchParams.toString();
  const planUrl = searchString ? `/plan?${searchString}` : "/plan";
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const [routes, setRoutes] = useState<PlannerRoute[]>([]);
  // Die Kandidaten samt gemessener Mehrfahrzeit. Sie gehören zur zuletzt
  // berechneten Start/Ziel-Kombination (und Streckenvariante) und bleiben
  // unverändert liegen, bis neu gerechnet wird — der Regler unten arbeitet
  // ausschliesslich auf diesem Zwischenspeicher (Issue #28).
  const [candidates, setCandidates] = useState<ScoredCandidate<PlannerRoute>[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detourLimitPct, setDetourLimitPct] = useState(DEFAULT_DETOUR_LIMIT_PCT);
  /** > 0, solange die Umwege dieser vielen Kandidaten gemessen werden. */
  const [scoringCount, setScoringCount] = useState(0);

  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [summary, setSummary] = useState<{ km: number; seconds: number } | null>(null);
  // Fehler werden als Übersetzungs-Key gehalten, damit ein Sprachwechsel auch
  // eine bereits sichtbare Meldung mit umschaltet.
  const [errorKey, setErrorKey] = useState<TranslationKey | "">("");

  // NEU: Streckenvarianten der Grundstrecke (wie auf google.com/maps)
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [activeRouteIndex, setActiveRouteIndex] = useState(0);
  // Die komplette Antwort mit allen Varianten — daraus wird beim Umschalten
  // ohne neue Anfrage die gewählte Variante geschnitten.
  const baseResultRef = useRef<any>(null);
  const activeRouteIndexRef = useRef(0);

  // NEU: Alternativen als graue, anklickbare Linien auf der Karte
  const mapsApiRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const altLinesRef = useRef<{ index: number; line: any }[]>([]);
  // Immer die aktuelle Umschalt-Funktion — die Klick-Listener der Linien
  // werden nur beim Zeichnen angehängt und sollen trotzdem nie veralten.
  const selectRouteOptionRef = useRef<(index: number) => void>(() => {});

  // Trip-ergänzen-Modus
  const [targetTrip, setTargetTrip] = useState<TargetTrip | null>(null);
  const [tripLoadFailed, setTripLoadFailed] = useState(false);
  const [addError, setAddError] = useState(false);
  const autoCalcDoneRef = useRef(false);

  // NEU: Wiederherstellung nach Rückkehr vom Login ohne Anmeldung
  const [restoreDraft, setRestoreDraft] = useState<PlanDraft | null>(null);
  const [restoredNotice, setRestoredNotice] = useState(false);
  // Routen, die nach der nächsten Umweg-Messung wieder ausgewählt werden
  const restoreIdsRef = useRef<string[] | null>(null);

  // Google Maps darf erst nach der Cookie-Zustimmung angesprochen werden —
  // das gilt hier nicht nur für die Karte, sondern auch für Places und
  // Directions. Den Zustand meldet der bestehende GoogleMapsGate-Wrapper.
  const [mapsConsent, setMapsConsent] = useState(false);
  const handleConsentChange = useCallback((granted: boolean) => {
    setMapsConsent(granted);
  }, []);

  const [mapEl, setMapEl] = useState<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const lastResultRef = useRef<any>(null);

  // Start/Ziel zum Zeitpunkt der Berechnung — spätere Tippänderungen sollen
  // die Karte nicht ungefragt neu laden.
  const queryRef = useRef({ start: "", end: "" });
  const renderedSelectionRef = useRef<string | null>(null);
  const resumedRef = useRef(false);
  // Zählt die Berechnungs-Läufe. Ein neuer Lauf (neue Strecke oder andere
  // Variante) entwertet die noch laufenden Umweg-Messungen des vorherigen.
  const calcRunRef = useRef(0);
  // NEU: zuletzt angefragte Start/Ziel-Kombination — verhindert doppelte
  // automatische Berechnungen für dieselbe Eingabe.
  const lastRequestedRef = useRef({ start: "", end: "" });
  // NEU: Auswahl im Glas-Panel auf- und zugeklappt
  const [selectionOpen, setSelectionOpen] = useState(false);
  // NEU: Orte, die der Nutzer festgelegt hat (Vorschlag gewählt / Enter /
  // aus Trip oder Entwurf übernommen). Automatisch gerechnet wird nur, wenn
  // beide Felder genau diesen Wert enthalten.
  const [committed, setCommitted] = useState({ start: "", end: "" });
  // NEU: berechnete "beste Route mit Auswahl" je Auswahl — An- und Abwählen
  // derselben Kombination kostet so keine neue Anfrage. Wird bei neuer
  // Strecke geleert.
  const routeCacheRef = useRef<Map<string, any>>(new Map());
  // NEU: Routenleiste — Pfeile links/rechts
  const railRef = useRef<HTMLDivElement>(null);
  const [railEdges, setRailEdges] = useState({ left: false, right: false });

  // ---------------------------------------------------------------- Routen
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const data = await safeQuery<PlannerRoute[]>(
        supabasePublic.from("routes").select(ROUTE_COLUMNS),
        "plan.fetchRoutes"
      );
      if (!cancelled) setRoutes(data ?? []);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const routesWithoutCoordinates = useMemo(
    () => routes.filter((route) => !hasUsableCoordinates(route)).length,
    [routes]
  );

  // ------------------------------------------------ Ziel-Trip laden
  // Hängt an der User-ID statt am User-Objekt: ein Token-Refresh soll nicht
  // erneut laden und dabei bereits geänderte Start/Ziel-Felder überschreiben.
  useEffect(() => {
    if (!tripParam || authLoading || !userId) return;

    let cancelled = false;

    (async () => {
      const trip = await fetchTrip(tripParam, userId);
      if (cancelled) return;

      if (!trip || trip.trip_days.length === 0) {
        setTripLoadFailed(true);
        return;
      }

      // Gewünschter Tag, sonst der letzte.
      const day =
        trip.trip_days.find((candidate) => candidate.id === dayParam) ??
        trip.trip_days[trip.trip_days.length - 1];

      setTripLoadFailed(false);
      setTargetTrip({
        id: trip.id,
        title: trip.title,
        dayId: day.id,
        dayNumber: day.day_number,
        dayStopCount: day.trip_stops.length,
        existingRouteIds: trip.trip_days.flatMap((d) => d.trip_stops.map((stop) => stop.route_id)),
        stopIdsByRoute: trip.trip_days
          .flatMap((d) => d.trip_stops)
          .reduce<Record<string, string[]>>((acc, stop) => {
            (acc[stop.route_id] ??= []).push(stop.id);
            return acc;
          }, {}),
      });

      if (trip.start_location) setStart(trip.start_location);
      if (trip.end_location) setEnd(trip.end_location);
      setCommitted({ start: trip.start_location ?? "", end: trip.end_location ?? "" });
    })();

    return () => {
      cancelled = true;
    };
  }, [tripParam, dayParam, userId, authLoading]);

  const existingRouteIds = useMemo(
    () => new Set(targetTrip?.existingRouteIds ?? []),
    [targetTrip]
  );

  // ------------------------------------------------------------------ Karte
  useEffect(() => {
    if (!mapEl || mapRef.current) return;
    let cancelled = false;

    loadGoogleMaps()
      .then((maps) => {
        if (cancelled) return;

        const map = new maps.Map(mapEl, {
          center: DEFAULT_MAP_CENTER,
          zoom: DEFAULT_MAP_ZOOM,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        mapRef.current = map;
        mapsApiRef.current = maps;
        // Gewählte Strecke blau und über den grauen Alternativen (zIndex).
        rendererRef.current = new maps.DirectionsRenderer({
          map,
          // Ausschnitt setzt showDirections selbst, mit Platz für das Panel
          preserveViewport: true,
          polylineOptions: {
            strokeColor: ACTIVE_ROUTE_COLOR,
            strokeOpacity: 0.95,
            strokeWeight: 6,
            zIndex: 10,
          },
        });
        setMapReady(true);

        // Wurde die Route berechnet, bevor der Consent-Gate die Karte
        // freigegeben hat, wird sie hier nachgezogen.
        if (lastResultRef.current) {
          rendererRef.current.setDirections(lastResultRef.current);
          const bounds = lastResultRef.current?.routes?.[0]?.bounds;
          if (bounds) map.fitBounds(bounds, mapPadding());
        }
      })
      .catch((err) => {
        console.error("plan: Google Maps konnte nicht geladen werden", err);
        if (!cancelled) setErrorKey("plan.error.maps");
      });

    return () => {
      cancelled = true;
    };
  }, [mapEl]);

  const showDirections = useCallback((result: any) => {
    lastResultRef.current = result;
    rendererRef.current?.setDirections(result);
    // NEU: Ausschnitt mit Platz für das Glas-Panel
    const bounds = result?.routes?.[0]?.bounds;
    if (bounds) mapRef.current?.fitBounds(bounds, mapPadding());
  }, []);

  // ------------------------------------------------------------- Berechnung
  /**
   * Matching für EINE Streckenvariante der Grundstrecke:
   *   1. Variante aus der gespeicherten Antwort schneiden (keine Anfrage),
   *   2. lokale Vorauswahl aus allen kuratierten Routen entlang dieser
   *      Variante (kein Netzwerk),
   *   3. eine Directions-Anfrage je Kandidat, um die echte Mehrfahrzeit
   *      gegenüber dieser Variante zu messen.
   */
  async function runMatching(routeIndex: number, run: number) {
    const isCancelled = () => calcRunRef.current !== run;
    const base = baseResultRef.current;
    if (!base) return;

    const route = pickRoute(base, routeIndex);
    const line: LngLat[] = overviewPathToLngLat(route);

    // Ohne Streckenverlauf kann das Matching nichts finden — das ist dann ein
    // Fehler in der Antwort, kein echtes "keine Treffer" (Issue #26).
    if (line.length < 2) {
      console.warn("plan: Directions-Antwort ohne verwertbaren Streckenverlauf");
    }

    const baseline = summarizeDirections(route);
    setSummary(baseline);
    showDirections(route);

    const preselected = selectDetourCandidates(routes, line);
    setScoringCount(preselected.length);

    const scored = await scoreDetourCandidates(
      queryRef.current.start,
      queryRef.current.end,
      baseline.seconds,
      preselected,
      { isCancelled }
    );
    if (isCancelled()) return;

    setCandidates(scored);

    // NEU: Vorauswahl setzen — aus dem wiederhergestellten Entwurf und im
    // Trip-bearbeiten-Modus die Routen, die schon im Trip liegen. Jeweils nur
    // Routen, die für diese Strecke tatsächlich gefunden wurden.
    const available = new Set(scored.map((candidate) => candidate.route.id));
    const initial = new Set<string>();
    const restoreIds = restoreIdsRef.current;
    if (restoreIds) {
      // Entwurf hat Vorrang: er enthält auch bewusst abgewählte Trip-Routen.
      restoreIdsRef.current = null;
      for (const id of restoreIds) if (available.has(id)) initial.add(id);
    } else {
      for (const id of existingRouteIds) if (available.has(id)) initial.add(id);
    }
    if (initial.size > 0) setSelectedIds([...initial]);
  }

  async function handleCalculate(preferredRouteIndex = 0) {
    const origin = start.trim();
    const destination = end.trim();

    if (!origin || !destination) {
      setErrorKey("plan.error.missingInput");
      return;
    }

    const run = ++calcRunRef.current;
    const isCancelled = () => calcRunRef.current !== run;
    lastRequestedRef.current = { start: origin, end: destination };
    routeCacheRef.current.clear();

    setErrorKey("");
    setAddError(false);
    setCalculating(true);
    setCandidates([]);
    setSelectedIds([]);
    setScoringCount(0);
    setRouteOptions([]);
    // Zusammen mit der geleerten Auswahl zurücksetzen, sonst hält der Effekt
    // unten die leere Auswahl für eine Änderung.
    renderedSelectionRef.current = "|best";

    try {
      // Grundstrecke mit Alternativen (und Verkehrslage, siehe googleMaps.ts)
      const result = await computeBaselineDirections(origin, destination);
      if (isCancelled()) return;

      baseResultRef.current = result;
      queryRef.current = { start: origin, end: destination };

      const options = listRouteOptions(result);
      setRouteOptions(options);
      // Normalfall 0 (Googles Empfehlung); beim Wiederherstellen die Variante
      // von vorhin, sofern es sie wieder gibt.
      const startIndex =
        preferredRouteIndex > 0 && preferredRouteIndex < options.length ? preferredRouteIndex : 0;
      activeRouteIndexRef.current = startIndex;
      setActiveRouteIndex(startIndex);
      setHasResult(true);

      // Variante 0 = Googles Empfehlung
      await runMatching(startIndex, run);
    } catch (err) {
      console.error("plan: Directions-Anfrage fehlgeschlagen", err);
      if (isCancelled()) return;
      baseResultRef.current = null;
      setCandidates([]);
      setSelectedIds([]);
      setRouteOptions([]);
      setHasResult(false);
      setSummary(null);
      setErrorKey("plan.error.directions");
    } finally {
      if (!isCancelled()) {
        setScoringCount(0);
        setCalculating(false);
      }
    }
  }

  /**
   * NEU: Andere Streckenvariante gewählt. Die Varianten liegen schon vor —
   * neu gemessen werden nur die Umwege, weil sich Vorauswahl und
   * Vergleichszeit mit der Variante ändern. Die bisherige Auswahl wird
   * verworfen, ihre Umwegzeiten gehörten zur alten Variante.
   */
  async function handleSelectRouteOption(index: number) {
    if (index === activeRouteIndexRef.current || !baseResultRef.current) return;

    const run = ++calcRunRef.current;
    const isCancelled = () => calcRunRef.current !== run;

    activeRouteIndexRef.current = index;
    setActiveRouteIndex(index);
    setErrorKey("");
    setAddError(false);
    // GEÄNDERT: Auswahl beim Wechsel behalten — runMatching setzt sie für die
    // neue Variante wieder (nur Routen, die dort ebenfalls gefunden werden).
    restoreIdsRef.current = selectedIds;
    setCandidates([]);
    setSelectedIds([]);
    setScoringCount(0);
    renderedSelectionRef.current = "|best";
    setCalculating(true);

    try {
      await runMatching(index, run);
    } catch (err) {
      console.error("plan: Umschalten der Streckenvariante fehlgeschlagen", err);
      if (!isCancelled()) setErrorKey("plan.error.directions");
    } finally {
      if (!isCancelled()) {
        setScoringCount(0);
        setCalculating(false);
      }
    }
  }

  // NEU: Klick auf eine graue Linie nutzt immer die aktuelle Funktion.
  useEffect(() => {
    selectRouteOptionRef.current = (index: number) => {
      void handleSelectRouteOption(index);
    };
  });

  // NEU: Gemerkten Reglerwert beim Laden übernehmen. Steht vor dem
  // Entwurf-Effekt: ein wiederhergestellter Entwurf hat Vorrang.
  useEffect(() => {
    const saved = readDetourPref();
    if (saved !== null) setDetourLimitPct(saved);
  }, []);

  // NEU: Entwurf beim Laden übernehmen — nur, wenn er zu genau dieser
  // Planner-Adresse gehört (Entwürfe ohne Adresse stammen vom Login-Umweg und
  // gelten nur für den normalen Planner ohne Trip).
  useEffect(() => {
    const draft = readPlanDraft();
    if (!draft) return;
    const matches = draft.context ? draft.context === planUrl : !tripParam;
    if (!matches) return;
    clearPlanDraft();
    setStart(draft.start);
    setEnd(draft.end);
    setCommitted({ start: draft.start, end: draft.end });
    setDetourLimitPct(draft.detourLimitPct);
    setRestoreDraft(draft);
    // nur beim ersten Laden
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NEU: Mit dem Entwurf einmalig automatisch rechnen, sobald Google Maps
  // freigegeben und die Routen geladen sind; danach Variante und Auswahl
  // wiederherstellen (siehe runMatching).
  useEffect(() => {
    if (!restoreDraft || autoCalcDoneRef.current) return;
    if (!mapsConsent || routes.length === 0) return;
    if (!start.trim() || !end.trim()) return;

    autoCalcDoneRef.current = true;
    restoreIdsRef.current = restoreDraft.routeIds;
    if (!restoreDraft.silent) setRestoredNotice(true);
    const routeIndex = restoreDraft.routeIndex;
    setRestoreDraft(null);
    void handleCalculate(routeIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoreDraft, mapsConsent, routes, start, end]);

  // NEU: Automatisch rechnen statt "Calculate Route"-Button — aber erst,
  // wenn Start UND Ziel festgelegt sind (Vorschlag gewählt oder Enter) und die
  // Felder noch genau diesen Wert enthalten. Reines Tippen löst nichts aus,
  // und dieselbe Kombination wird nie doppelt berechnet.
  useEffect(() => {
    const origin = start.trim();
    const destination = end.trim();
    if (!mapsConsent || routes.length === 0) return;
    if (!origin || !destination) return;
    if (origin !== committed.start.trim() || destination !== committed.end.trim()) return;
    if (
      lastRequestedRef.current.start === origin &&
      lastRequestedRef.current.end === destination
    ) {
      return;
    }
    // Entwurf/Trip-Modus rechnen selbst (mit Variante und Vorauswahl)
    if (restoreDraft || (tripParam && !autoCalcDoneRef.current && !tripLoadFailed)) return;

    const timer = setTimeout(() => {
      setRestoredNotice(false);
      void handleCalculate();
    }, AUTO_CALC_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end, committed, mapsConsent, routes, restoreDraft, tripParam, tripLoadFailed]);

  // Im Trip-ergänzen-Modus einmalig automatisch rechnen, sobald Start/Ziel
  // übernommen, die Routen geladen und Google Maps freigegeben sind.
  useEffect(() => {
    if (!targetTrip || autoCalcDoneRef.current) return;
    if (!mapsConsent || routes.length === 0) return;
    if (!start.trim() || !end.trim()) return;

    autoCalcDoneRef.current = true;
    void handleCalculate();
    // handleCalculate liest Start/Ziel/Routen aus dem aktuellen Render —
    // genau die Werte, auf die dieser Effekt wartet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetTrip, mapsConsent, routes, start, end]);

  // GEÄNDERT: Routen, die schon im Ziel-Trip liegen, sind vorausgewählt und
  // dürfen abgewählt werden — sie werden dann beim Speichern entfernt.
  const toggleSelect = useCallback((routeId: string) => {
    setSelectedIds((prev) =>
      prev.includes(routeId) ? prev.filter((id) => id !== routeId) : [...prev, routeId]
    );
  }, []);

  /**
   * Was die Liste zeigt. Hängt am Regler — und bewusst an nichts anderem: hier
   * wird nur gefiltert, nie nachgeladen.
   */
  const visibleCandidates = useMemo(
    () =>
      // Trip-Routen bleiben immer sichtbar — auch abgewählt, damit man sie
      // wieder dazunehmen kann.
      filterByDetourLimit(candidates, detourLimitPct, [...selectedIds, ...existingRouteIds]),
    [candidates, detourLimitPct, selectedIds, existingRouteIds]
  );

  /**
   * Was in Karte und Trip landet. Hängt bewusst NICHT am Regler, sondern an
   * der vollständigen Kandidatenliste: eine getroffene Auswahl darf durch das
   * Verschieben des Reglers weder verschwinden noch eine Neuberechnung der
   * Karte auslösen.
   *
   * Sortiert wird nach Position entlang der Strecke (`candidates` selbst ist
   * nach Mehrfahrzeit sortiert), damit die Wegpunkte in Fahrtrichtung an
   * Directions gehen.
   */
  const selectedCandidates = useMemo(
    () =>
      candidates
        .filter((candidate) => selectedIds.includes(candidate.route.id))
        .sort((a, b) => a.alongTrackKm - b.alongTrackKm),
    [candidates, selectedIds]
  );

  /** NEU: Schlüssel der aktuellen Auswahl (für Gesamtwerte je Variante). */
  const selectionKey = useMemo(
    () => selectedCandidates.map((candidate) => candidate.route.id).join(","),
    [selectedCandidates]
  );

  // Auswahl geändert -> Karte neu zeichnen. Mit Auswahl immer die beste Route
  // über die gewählten Panoramarouten (Googles Weg), ohne Auswahl die
  // gewählte Streckenvariante.
  useEffect(() => {
    if (!hasResult) return;

    const withSelection = selectedCandidates.length > 0;
    const renderKey = `${selectionKey}|best`;
    if (renderedSelectionRef.current === renderKey) return;
    renderedSelectionRef.current = renderKey;

    // Keine Auswahl -> gewählte Streckenvariante ohne neue Anfrage zeigen
    if (!withSelection) {
      const base = baseResultRef.current;
      if (base) {
        const route = pickRoute(base, activeRouteIndexRef.current);
        setSummary(summarizeDirections(route));
        showDirections(route);
      }
      return;
    }

    const cached = routeCacheRef.current.get(renderKey);
    if (cached) {
      setSummary(summarizeDirections(cached));
      showDirections(cached);
      return;
    }

    const waypoints: DirectionsWaypoint[] = selectedCandidates.flatMap(candidateWaypoints);

    let cancelled = false;

    (async () => {
      try {
        const result = await computeDirections(
          queryRef.current.start,
          queryRef.current.end,
          waypoints
        );
        routeCacheRef.current.set(renderKey, result);
        if (cancelled) return;
        setSummary(summarizeDirections(result));
        showDirections(result);
      } catch (err) {
        console.error("plan: Directions mit Wegpunkten fehlgeschlagen", err);
        if (!cancelled) setErrorKey("plan.error.directions");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedCandidates, hasResult, showDirections, selectionKey]);



  // ------------------------------------ NEU: Alternativen auf der Karte
  /**
   * Zeichnet alle nicht gewählten Streckenvarianten als graue Linien unter
   * die blaue, gewählte Strecke — wie auf google.com/maps. Ein Klick auf eine
   * graue Linie wählt diese Variante.
   *
   * Sobald Panoramarouten ausgewählt sind, verschwinden die grauen Linien:
   * dann zeigt die Karte die Strecke über die Wegpunkte, und die Varianten
   * der Grundstrecke würden nur noch verwirren.
   */
  const hasSelection = selectedIds.length > 0;

  useEffect(() => {
    const maps = mapsApiRef.current;
    const map = mapRef.current;
    const base = baseResultRef.current;
    if (!mapReady || !maps || !map || !base) return;
    if (routeOptions.length < 2 || hasSelection) return;

    const lines: { index: number; line: any }[] = [];
    const allRoutes: any[] = base.routes ?? [];

    allRoutes.forEach((_route, index) => {
      if (index === activeRouteIndex) return;

      const path = overviewPathToLngLat(pickRoute(base, index)).map(([lng, lat]) => ({
        lat,
        lng,
      }));
      if (path.length < 2) return;

      const line = new maps.Polyline({
        path,
        map,
        strokeColor: ALT_ROUTE_COLOR,
        strokeOpacity: 0.8,
        strokeWeight: 6,
        zIndex: 1,
        clickable: true,
      });

      line.addListener("click", () => selectRouteOptionRef.current(index));
      line.addListener("mouseover", () =>
        line.setOptions({ strokeColor: ALT_ROUTE_HOVER_COLOR, zIndex: 2 })
      );
      line.addListener("mouseout", () =>
        line.setOptions({ strokeColor: ALT_ROUTE_COLOR, zIndex: 1 })
      );

      lines.push({ index, line });
    });

    altLinesRef.current = lines;

    // Ausschnitt so wählen, dass alle Varianten sichtbar sind — der Renderer
    // zoomt sonst nur auf die gewählte.
    const bounds = new maps.LatLngBounds();
    for (const route of allRoutes) {
      if (route?.bounds) bounds.union(route.bounds);
    }
    if (!bounds.isEmpty()) map.fitBounds(bounds, mapPadding());

    return () => {
      for (const { line } of lines) {
        maps.event?.clearInstanceListeners?.(line);
        line.setMap(null);
      }
      altLinesRef.current = [];
    };
  }, [mapReady, routeOptions, activeRouteIndex, hasSelection]);

  /** NEU: Beim Überfahren einer Varianten-Kachel die passende Linie hervorheben. */
  const highlightAlternative = useCallback((index: number | null) => {
    for (const { index: lineIndex, line } of altLinesRef.current) {
      const active = lineIndex === index;
      line.setOptions({
        strokeColor: active ? ALT_ROUTE_HOVER_COLOR : ALT_ROUTE_COLOR,
        zIndex: active ? 2 : 1,
      });
    }
  }, []);

  // ---------------------------------------------------------------- Speichern
  const buildPendingTrip = useCallback(
    () => ({
      title: `${start.trim() || "?"} → ${end.trim() || "?"}`,
      startLocation: start.trim(),
      endLocation: end.trim(),
      routeIds: selectedCandidates.map((candidate) => candidate.route.id),
    }),
    [start, end, selectedCandidates]
  );

  /**
   * Die User-ID zum Zeitpunkt des Klicks — notfalls über eine frische
   * Session-Prüfung statt über den zwischengespeicherten Auth-Snapshot.
   *
   * Warum (Issue #28): `useAuth()` fällt laut lib/supabase.ts bewusst auf
   * "ausgeloggt" zurück, wenn `getSessionSafe()` in ein Timeout läuft, obwohl
   * der Token im Storage gültig bleibt. Wer in genau diesem Zustand auf "Als
   * Trip speichern" drückt, wurde bisher wortlos nach /login geschickt — und
   * /login sieht dieselbe, gültige Session und schickt sofort zurück nach
   * /plan. Die Seite montiert dabei neu, Strecke und Auswahl sind weg, und
   * gespeichert wurde nie etwas.
   */
  const resolveUserId = useCallback(async (): Promise<string | null> => {
    if (user?.id) return user.id;
    const { session } = await getSessionSafe(6000);
    return session?.user?.id ?? null;
  }, [user]);

  async function handleSaveTrip() {
    const pending = buildPendingTrip();
    if (pending.routeIds.length === 0) {
      setErrorKey("plan.saveHint");
      return;
    }

    setErrorKey("");
    setSaving(true);

    const resolvedUserId = await resolveUserId();

    // Wirklich nicht eingeloggt: Auswahl merken und über das bestehende
    // Login-Muster zurück nach /plan schicken. Der Trip entsteht dann
    // automatisch (siehe Effekt unten), der User landet nahtlos im Builder.
    if (!resolvedUserId) {
      setSaving(false);
      savePendingTrip(pending);
      // NEU: zusätzlich den sichtbaren Planner-Stand merken, falls der Nutzer
      // ohne Login zurückkommt
      savePlanDraft({
        start: start.trim(),
        end: end.trim(),
        routeIds: pending.routeIds,
        routeIndex: activeRouteIndexRef.current,
        detourLimitPct,
        savedAt: Date.now(),
        context: planUrl,
      });
      router.push(`/login?redirect=${encodeURIComponent("/plan")}`);
      return;
    }

    const { tripId, error } = await createTrip(resolvedUserId, pending);
    setSaving(false);

    if (!tripId) {
      console.error("plan: Trip konnte nicht angelegt werden", error);
      setErrorKey("plan.error.save");
      return;
    }

    // Der Trip steht — ein Fehler in Tag/Stopps macht ihn nicht wertlos, wird
    // aber protokolliert, damit er nicht wieder unsichtbar bleibt.
    if (error) console.error("plan: Trip angelegt, aber unvollständig", error);

    clearPendingTrip();
    clearPlanDraft();
    router.push(`/trip?id=${tripId}`);
  }

  /**
   * GEÄNDERT: Änderungen am bestehenden Trip übernehmen und zurück in den
   * Builder. Neu gewählte Routen werden an den Zieltag angehängt, abgewählte
   * Trip-Routen entfernt (an allen Tagen, an denen sie liegen).
   *
   * Entfernt werden nur Routen, die hier als Kandidat angezeigt wurden —
   * Trip-Routen, die für diese Strecke gar nicht vorkommen, bleiben unberührt.
   */
  async function handleApplyTripChanges() {
    if (!targetTrip) return;

    const { toAdd, toRemove } = tripChanges;
    if (toAdd.length === 0 && toRemove.length === 0) return;

    setErrorKey("");
    setAddError(false);
    setSaving(true);

    const removeStopIds = toRemove.flatMap((routeId) => targetTrip.stopIdsByRoute[routeId] ?? []);
    const results = await Promise.all([
      toAdd.length > 0
        ? addStopsToDay(targetTrip.dayId, toAdd, targetTrip.dayStopCount)
        : Promise.resolve(true),
      ...removeStopIds.map((stopId) => deleteTripStop(stopId)),
    ]);

    if (results.some((ok) => !ok)) {
      setSaving(false);
      setAddError(true);
      return;
    }

    // updated_at nachziehen, damit der Trip auf /my-trips nach oben rutscht.
    await touchTrip(targetTrip.id, targetTrip.title);
    router.push(`/trip?id=${targetTrip.id}${fromSuffix}`);
  }

  // Rückkehr vom Login mit gemerkter Auswahl -> Trip anlegen und weiterleiten.
  useEffect(() => {
    if (authLoading || resumedRef.current) return;

    const pending = readPendingTrip();
    if (!pending || pending.routeIds.length === 0) return;

    resumedRef.current = true;

    (async () => {
      const resolvedUserId = await resolveUserId();
      if (!resolvedUserId) {
        // Noch kein Login — die gemerkte Auswahl bleibt liegen, der nächste
        // Anlauf (oder das nächste Auth-Update) greift sie wieder auf.
        resumedRef.current = false;
        return;
      }

      const { tripId, error } = await createTrip(resolvedUserId, pending);

      if (!tripId) {
        console.error("plan: gemerkter Trip konnte nicht angelegt werden", error);
        setErrorKey("plan.error.save");
        return;
      }

      // Erst nach dem erfolgreichen Anlegen verwerfen — vorher würde ein
      // Fehlschlag die Auswahl des Nutzers endgültig vernichten.
      clearPendingTrip();
      clearPlanDraft();
      router.replace(`/trip?id=${tripId}`);
    })();
  }, [authLoading, resolveUserId, router]);

  /**
   * NEU: Vor dem Wechsel zur Detailseite den sichtbaren Stand merken, damit
   * der Rückweg (über ?from=) genau dorthin zurückführt — mit Strecke,
   * Variante, Regler und Auswahl, ohne Hinweis-Banner.
   */
  const handleViewRoute = useCallback(() => {
    if (!queryRef.current.start || !queryRef.current.end) return;
    savePlanDraft({
      start: queryRef.current.start,
      end: queryRef.current.end,
      routeIds: selectedIds,
      routeIndex: activeRouteIndexRef.current,
      detourLimitPct,
      savedAt: Date.now(),
      context: planUrl,
      silent: true,
    });
  }, [selectedIds, detourLimitPct, planUrl]);

  /** Variante anklicken (nur ohne Auswahl sichtbar). */
  function selectVariant(index: number) {
    if (index !== activeRouteIndexRef.current) void handleSelectRouteOption(index);
  }

  /** Text der Umweg-Pille auf der Routenkarte. */
  const detourBadge = useCallback(
    (candidate: ScoredCandidate<PlannerRoute>): string => {
      if (candidate.detourSeconds === null || candidate.detourRatio === null) {
        return t("plan.detour.unknown");
      }
      if (candidate.detourSeconds < NEGLIGIBLE_DETOUR_SECONDS) {
        return t("plan.detour.none");
      }
      return t("plan.detour.badge")
        .replace("{time}", formatDuration(candidate.detourSeconds))
        .replace("{pct}", String(Math.round(candidate.detourRatio * 100)));
    },
    [t]
  );

  // Neue (noch nicht im Trip liegende) Auswahl — steuert den Button im
  // Trip-ergänzen-Modus.
  // NEU: Pfeile der Routenleiste ein-/ausblenden, je nach Scrollposition
  const updateRailEdges = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const left = rail.scrollLeft > 4;
    const right = rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 4;
    setRailEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);

  useEffect(() => {
    updateRailEdges();
    window.addEventListener("resize", updateRailEdges);
    return () => window.removeEventListener("resize", updateRailEdges);
  }, [updateRailEdges, visibleCandidates]);

  const scrollRail = useCallback((direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    // etwa zwei Drittel der sichtbaren Breite, damit eine Karte als Anker bleibt
    rail.scrollBy({ left: direction * Math.max(320, rail.clientWidth * 0.66), behavior: "smooth" });
  }, []);

  const tripChanges = useMemo(() => {
    const candidateIds = new Set(candidates.map((candidate) => candidate.route.id));
    // In Fahrtrichtung sortiert, wie beim Anlegen eines neuen Trips
    const toAdd = selectedCandidates
      .map((candidate) => candidate.route.id)
      .filter((id) => !existingRouteIds.has(id));
    const toRemove = [...existingRouteIds].filter(
      (id) => candidateIds.has(id) && !selectedIds.includes(id)
    );
    return { toAdd, toRemove };
  }, [candidates, selectedCandidates, selectedIds, existingRouteIds]);
  const hasTripChanges = tripChanges.toAdd.length > 0 || tripChanges.toRemove.length > 0;

  // Ziel des "Zum Trip Builder"-Links: im Trip-ergänzen-Modus der gerade
  // ergänzte Trip, sonst die Übersicht aller Trips (/trip ohne ID).
  const builderHref = targetTrip ? `/trip?id=${targetTrip.id}${fromSuffix}` : "/trip";

  // NEU: Statuszeile im Panel (ersetzt den "Calculate Route"-Button)
  const liveState: "off" | "busy" | "live" = !mapsConsent
    ? "off"
    : calculating || scoringCount > 0
      ? "busy"
      : hasResult && summary
        ? "live"
        : "off";
  const liveText = !mapsConsent
    ? t("plan.consentHint")
    : liveState === "busy"
      ? tx.liveUpdating
      : liveState === "live" && summary
        ? `${tx.liveAuto} · ${formatDistance(summary.km, unit)} · ${formatDuration(summary.seconds)}`
        : t("plan.map.empty");

  // NEU: Mit Auswahl gibt es nur noch die beste Route über die Auswahl —
  // ihre Werte sind die der gezeichneten Route (summary).
  const withSelectionNow = selectedCandidates.length > 0;

  // NEU: Planungsblock und Auswahl wechseln sich ab (nur mit Ergebnis)
  const planCollapsed = hasResult && selectionOpen;
  const activeOption = routeOptions.find((option) => option.index === activeRouteIndex) ?? null;

  const changeSummary = [
    tripChanges.toAdd.length > 0 &&
      tx.changesAdd.replace("{n}", String(tripChanges.toAdd.length)),
    tripChanges.toRemove.length > 0 &&
      tx.changesRemove.replace("{n}", String(tripChanges.toRemove.length)),
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <div className="pp rp-page">
      <PlannerNav activePath="/plan" />

      {/* ------------------------------------------------ Karte als Titelbild */}
      <section className="rp-hero">
        <div className="rp-hero-map">
          <GoogleMapsGate height="100%" onConsentChange={handleConsentChange}>
            <div ref={setMapEl} className="rp-map" />
          </GoogleMapsGate>
        </div>
        <span className="rp-hero-fade" aria-hidden="true" />

        {summary && (
          <div className="rp-hero-stats">
            <span>
              <Navigation size={12} strokeWidth={2} />
              {formatDistance(summary.km, unit)}
            </span>
            <span>
              <Clock size={12} strokeWidth={2} />
              {formatDuration(summary.seconds)}
            </span>
          </div>
        )}

        {/* ---------------------------------------------- Glas-Panel links */}
        <aside className="rp-panel">
          <div className="rp-panel-head">
            <span className="rp-eyebrow">{targetTrip ? tx.editingEyebrow : t("plan.eyebrow")}</span>
            <h1 className="rp-panel-title">{targetTrip ? targetTrip.title : t("plan.title")}</h1>
            {targetTrip ? (
              <Link href={`/trip?id=${targetTrip.id}${fromSuffix}`} className="rp-back-link">
                <ArrowLeft size={12} strokeWidth={2.4} /> {tx.backToTrip}
              </Link>
            ) : (
              !planCollapsed && <p className="rp-panel-sub">{t("plan.sub")}</p>
            )}
          </div>

          {restoredNotice && <p className="rp-notice">{tx.restored}</p>}
          {tripLoadFailed && <p className="rp-error">{tx.tripLoadError}</p>}

          {/* NEU: Planungsblock — klappt zusammen, wenn "Deine Auswahl" offen
              ist; dann bleibt eine kompakte Zusammenfassung zum Wiederöffnen */}
          {planCollapsed && (
            <button
              type="button"
              className="rp-plan-summary"
              onClick={() => setSelectionOpen(false)}
              aria-expanded={false}
            >
              <span className="rp-plan-summary-text">
                <span className="rp-plan-summary-route">
                  {queryRef.current.start || start} → {queryRef.current.end || end}
                </span>
                {activeOption && (
                  <span className="rp-plan-summary-meta">
                    {withSelectionNow
                      ? tx.bestWithSelection
                      : activeOption.summary
                        ? tx.via.replace("{road}", activeOption.summary)
                        : tx.variantN.replace("{n}", String(activeOption.index + 1))}
                    {summary
                      ? ` · ${formatDistance(summary.km, unit)} · ${formatDuration(summary.seconds)}`
                      : ""}
                  </span>
                )}
              </span>
              <span className="rp-acc-chev" aria-hidden="true">
                <ChevronDown size={14} strokeWidth={2.2} />
              </span>
            </button>
          )}

          <div className={`rp-plan ${planCollapsed ? "" : "is-open"}`}>
          <div className="rp-plan-inner">
          <PlaceField
            label={t("plan.form.start")}
            placeholder={t("plan.form.startPlaceholder")}
            icon={<MapPin size={14} strokeWidth={2} />}
            value={start}
            enabled={mapsConsent}
            onChange={setStart}
            onCommit={(value) => setCommitted((prev) => ({ ...prev, start: value }))}
          />
          <PlaceField
            label={t("plan.form.end")}
            placeholder={t("plan.form.endPlaceholder")}
            icon={<Flag size={14} strokeWidth={2} />}
            value={end}
            enabled={mapsConsent}
            onChange={setEnd}
            onCommit={(value) => setCommitted((prev) => ({ ...prev, end: value }))}
          />

          {withSelectionNow ? (
            // NEU: Mit Auswahl nur die beste Route über die Auswahl
            <div className="rp-variants">
              <span className="rp-field-label">{tx.variantsLabel}</span>
              <div className="rp-variant rp-variant-best is-active" role="status">
                <span className="rp-variant-row">
                  <span className="rp-variant-name">{tx.bestWithSelection}</span>
                  <span className="rp-variant-tag">{tx.recommended}</span>
                </span>
                {summary && liveState !== "busy" ? (
                  <span className="rp-variant-meta">
                    {formatDuration(summary.seconds)} · {formatDistance(summary.km, unit)}
                  </span>
                ) : (
                  <span className="rp-variant-meta rp-variant-loading">…</span>
                )}
              </div>
              <p className="rp-note">{tx.variantsHint}</p>
            </div>
          ) : (
            routeOptions.length > 1 && (
              <div className="rp-variants">
                <span className="rp-field-label">{tx.variantsLabel}</span>
                <div className="rp-variant-list">
                  {routeOptions.map((option) => (
                    <button
                      key={option.index}
                      type="button"
                      className={`rp-variant ${option.index === activeRouteIndex ? "is-active" : ""}`}
                      aria-pressed={option.index === activeRouteIndex}
                      onClick={() => selectVariant(option.index)}
                      onMouseEnter={() => highlightAlternative(option.index)}
                      onMouseLeave={() => highlightAlternative(null)}
                    >
                      <span className="rp-variant-name">
                        {option.summary
                          ? tx.via.replace("{road}", option.summary)
                          : tx.variantN.replace("{n}", String(option.index + 1))}
                      </span>
                      <span className="rp-variant-meta">{formatDuration(option.seconds)}</span>
                      <span className="rp-variant-meta">{formatDistance(option.km, unit)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          )}

          {/* NEU: Status statt "Calculate Route" — die Route rechnet automatisch */}
          <div className={`rp-live is-${liveState}`} role="status">
            <span className="rp-live-dot" aria-hidden="true" />
            <span>{liveText}</span>
          </div>
          {errorKey && <p className="rp-error">{t(errorKey)}</p>}
          </div>
          </div>

          {hasResult && (
            <>
              <div className="rp-divider" />

              {/* NEU: aufklappbare Auswahl — gewählte Routen erscheinen hier */}
              <div className={`rp-acc ${selectionOpen ? "is-open" : ""}`}>
                <button
                  type="button"
                  className="rp-acc-head"
                  onClick={() => setSelectionOpen((open) => !open)}
                  aria-expanded={selectionOpen}
                >
                  <span className="rp-acc-title">
                    {tx.selection}
                    <span className="rp-acc-count">{selectedCandidates.length}</span>
                  </span>
                  <span className="rp-acc-chev" aria-hidden="true">
                    <ChevronDown size={14} strokeWidth={2.2} />
                  </span>
                </button>
                <div className="rp-acc-body">
                  <div className="rp-acc-inner">
                    {selectedCandidates.length === 0 ? (
                      <p className="rp-acc-empty">{tx.selectionEmpty}</p>
                    ) : (
                      <div className="rp-acc-list">
                        {selectedCandidates.map((candidate) => {
                          const name = localizedTitle(candidate.route, lang);
                          return (
                            <div key={candidate.route.id} className="rp-acc-item">
                              <img
                                src={candidate.route.image_url || "/iceland.jpg"}
                                alt={name}
                                onError={(e) => {
                                  e.currentTarget.src = "/iceland.jpg";
                                }}
                              />
                              <div className="rp-acc-text">
                                <div className="rp-acc-name">{name}</div>
                                <div className="rp-acc-meta">
                                  {[
                                    candidate.route.country,
                                    candidate.route.distance_km
                                      ? formatDistance(candidate.route.distance_km, unit)
                                      : null,
                                    candidate.route.duration,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </div>
                              </div>
                              <button
                                type="button"
                                className="rp-acc-remove"
                                onClick={() => toggleSelect(candidate.route.id)}
                                aria-label={`${tx.removeRoute}: ${name}`}
                              >
                                <X size={13} strokeWidth={2.2} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Speichern — ausserhalb des Klappbereichs, immer sichtbar */}
              <div className="rp-save">
                {targetTrip
                  ? hasTripChanges && <p className="rp-save-summary">{changeSummary}</p>
                  : selectedIds.length === 0 && <p className="rp-hint">{t("plan.saveHint")}</p>}
                {targetTrip ? (
                  <button
                    className="rp-save-btn"
                    {...NO_FORM_STATE_RESTORE}
                    onClick={handleApplyTripChanges}
                    disabled={saving || !hasTripChanges}
                  >
                    <Check size={13} strokeWidth={2.6} />
                    {saving ? tx.applying : tx.applyChanges}
                  </button>
                ) : (
                  <button
                    className="rp-save-btn"
                    {...NO_FORM_STATE_RESTORE}
                    onClick={handleSaveTrip}
                    disabled={saving || selectedIds.length === 0}
                  >
                    {saving ? t("plan.saving") : t("plan.save")}
                    <ArrowRight size={13} strokeWidth={2.4} />
                  </button>
                )}
                {addError && <p className="rp-error">{tx.addError}</p>}
              </div>
            </>
          )}
        </aside>
      </section>

      {/* ------------------------------------------------ Routen entlang der Strecke */}
      {hasResult && (
        <section className="rp-results">
          <div className="rp-results-head">
            <div>
              <span className="rp-eyebrow">
                {tx.alongTheWay} ·{" "}
                {t("plan.matches.count").replace("{n}", String(visibleCandidates.length))}
              </span>
              <h2 className="rp-results-title">{t("plan.matches.title")}</h2>
              <p className="rp-results-sub">{t("plan.matches.subtitle")}</p>
            </div>

            {/* Der Regler filtert nur die bereits gemessenen Umwege */}
            <div className="rp-detour">
              <div className="rp-detour-head">
                <label className="rp-field-label" htmlFor="rp-detour-slider">
                  {t("plan.detour.label")}
                </label>
                <span className="rp-detour-value">+{detourLimitPct}%</span>
              </div>
              <input
                id="rp-detour-slider"
                className="rp-detour-slider"
                type="range"
                min={MIN_DETOUR_LIMIT_PCT}
                max={MAX_DETOUR_LIMIT_PCT}
                step={1}
                value={detourLimitPct}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setDetourLimitPct(value);
                  saveDetourPref(value);
                }}
                style={
                  {
                    "--rp-detour-fill": `${
                      ((detourLimitPct - MIN_DETOUR_LIMIT_PCT) /
                        (MAX_DETOUR_LIMIT_PCT - MIN_DETOUR_LIMIT_PCT)) *
                      100
                    }%`,
                  } as CSSProperties
                }
              />
              <p className="rp-note">{tx.detourRemembered}</p>
            </div>
          </div>

          {scoringCount > 0 ? (
            <p className="rp-hint">
              {t("plan.matches.scoring").replace("{n}", String(scoringCount))}
            </p>
          ) : candidates.length === 0 ? (
            <p className="rp-hint">{t("plan.matches.none")}</p>
          ) : visibleCandidates.length === 0 ? (
            <p className="rp-hint">
              {t("plan.matches.noneWithin").replace("{pct}", String(detourLimitPct))}
            </p>
          ) : (
            <div
              className={`rp-rail-wrap ${railEdges.left ? "has-left" : ""} ${railEdges.right ? "has-right" : ""}`}
            >
              {/* NEU: Pfeile zum Blättern — nur sichtbar, wenn es weitergeht */}
              <button
                type="button"
                className="rp-rail-arrow is-left"
                onClick={() => scrollRail(-1)}
                aria-label="Previous routes"
                tabIndex={railEdges.left ? 0 : -1}
              >
                <ArrowLeft size={18} strokeWidth={2} />
              </button>
              <button
                type="button"
                className="rp-rail-arrow is-right"
                onClick={() => scrollRail(1)}
                aria-label="Next routes"
                tabIndex={railEdges.right ? 0 : -1}
              >
                <ArrowRight size={18} strokeWidth={2} />
              </button>
              <div className="rp-rail" ref={railRef} onScroll={updateRailEdges}>
                {visibleCandidates.map((candidate) => {
                  // Trip-Route: ausgewählt = bleibt drin, abgewählt = wird entfernt
                  const inTrip = existingRouteIds.has(candidate.route.id);
                  const selected = selectedIds.includes(candidate.route.id);
                  return (
                    <div key={candidate.route.id} className="rp-rail-item">
                      <RouteCard
                        route={candidate.route}
                        viewRouteLabel={t("explore.viewRoute")}
                        selectable
                        selected={selected}
                        removing={inTrip && !selected}
                        onToggleSelect={toggleSelect}
                        detailHref={`/routedetail/${candidate.route.id}?from=${encodeURIComponent(planUrl)}`}
                        onViewRoute={handleViewRoute}
                        selectLabel={t("plan.select")}
                        selectedLabel={t("plan.selected")}
                        badge={
                          inTrip ? (selected ? tx.inTrip : tx.willRemove) : detourBadge(candidate)
                        }
                        badgeMuted={
                          (inTrip && !selected) ||
                          (!inTrip &&
                            (candidate.detourRatio === null ||
                              candidate.detourRatio * 100 > detourLimitPct))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {routesWithoutCoordinates > 0 && (
            <p className="rp-note">
              {t("plan.matches.skipped").replace("{n}", String(routesWithoutCoordinates))}
            </p>
          )}
        </section>
      )}

      <div className="rp-bottom-links">
        <Link href="/" className="rp-back">
          {t("plan.back")}
        </Link>
        {userId && (
          <Link href={builderHref} className="rp-back">
            {tx.toBuilder}
            <ArrowRight size={12} strokeWidth={2.4} />
          </Link>
        )}
      </div>

      <PageFooter />

      <style>{`
        /* =========================================================
           Route Planner — Variante C: Karte als Titelbild, Glas-Panel
           links, Routen als horizontale Leiste. Farben aus profile.css
           (--bg, --bg2, --bg3, --cream, --muted, --dim, --border, --gold),
           ergänzt um Glas- und Goldtext-Töne je Theme.
           ========================================================= */
        .rp-page { --rp-ease:cubic-bezier(.22,1,.36,1); --rp-gold-text:#D8BC84; --rp-glass:rgba(16,14,11,0.62); --rp-glass-line:rgba(255,255,255,0.12); --rp-field:rgba(12,11,9,0.55); --rp-shadow:0 30px 80px rgba(0,0,0,0.45); min-height:100vh; background:var(--bg); }
        .light .rp-page, .rp-page.light { --rp-gold-text:#8A6727; --rp-glass:rgba(255,255,255,0.68); --rp-glass-line:rgba(255,255,255,0.75); --rp-field:rgba(255,255,255,0.75); --rp-shadow:0 24px 60px rgba(70,52,20,0.14); }

        /* ---------- Titelbild mit Karte */
        .rp-hero { position:relative; height:clamp(760px, 92vh, 960px); overflow:hidden; }
        .rp-hero-map { position:absolute; inset:0; }
        .rp-map { width:100%; height:100%; }
        .rp-hero-fade { position:absolute; inset:0; z-index:1; pointer-events:none; background:linear-gradient(to bottom, color-mix(in srgb, var(--bg) 92%, transparent) 0%, transparent 14%), linear-gradient(to top, color-mix(in srgb, var(--bg) 70%, transparent) 0%, color-mix(in srgb, var(--bg) 22%, transparent) 40px, transparent 90px), linear-gradient(to right, color-mix(in srgb, var(--bg) 50%, transparent) 0%, transparent 40%); }
        .rp-hero-stats { position:absolute; top:104px; right:clamp(20px,4vw,56px); z-index:3; display:flex; gap:18px; padding:11px 18px; border-radius:999px; background:var(--rp-glass); backdrop-filter:blur(20px) saturate(160%); -webkit-backdrop-filter:blur(20px) saturate(160%); border:1px solid var(--border); box-shadow:inset 0 1px 0 var(--rp-glass-line); }
        .rp-hero-stats span { display:inline-flex; align-items:center; gap:7px; font-size:11.5px; font-weight:600; color:var(--cream); font-variant-numeric:tabular-nums; }
        .rp-hero-stats svg { color:var(--rp-gold-text); }

        /* ---------- Glas-Panel */
        .rp-panel { position:absolute; top:96px; left:clamp(20px,4vw,56px); z-index:4; width:420px; max-height:calc(100% - 120px); overflow-y:auto; display:flex; flex-direction:column; gap:16px; padding:24px; border-radius:26px; background:var(--rp-glass); backdrop-filter:blur(26px) saturate(170%); -webkit-backdrop-filter:blur(26px) saturate(170%); border:1px solid var(--border); box-shadow:var(--rp-shadow), inset 0 1px 0 var(--rp-glass-line); scrollbar-width:thin; scrollbar-color:color-mix(in srgb, var(--gold) 45%, transparent) transparent; }
        .rp-panel-head { display:flex; flex-direction:column; gap:8px; }
        .rp-eyebrow { font-size:9.5px; font-weight:700; letter-spacing:.3em; text-transform:uppercase; color:var(--rp-gold-text); }
        .rp-panel-title { margin:0; font-family:var(--serif); font-size:38px; font-weight:400; line-height:1.02; letter-spacing:-.01em; color:var(--cream); }
        .rp-panel-sub { margin:0; font-size:12.5px; line-height:1.65; color:var(--muted); }
        .rp-back-link { display:inline-flex; align-items:center; gap:6px; font-size:9px; font-weight:700; letter-spacing:.2em; text-transform:uppercase; color:var(--rp-gold-text); transition:opacity .2s; }
        .rp-back-link:hover { opacity:.75; }
        .rp-notice { margin:0; padding:10px 14px; border-radius:12px; border:1px solid color-mix(in srgb, var(--gold) 35%, transparent); background:color-mix(in srgb, var(--gold) 10%, transparent); font-size:12px; color:var(--cream); }
        .rp-divider { height:1px; background:var(--border); }

        /* Planungsblock: klappt zusammen, wenn die Auswahl offen ist */
        .rp-plan { display:grid; grid-template-rows:0fr; transition:grid-template-rows .55s var(--rp-ease), opacity .45s var(--rp-ease); opacity:0; margin-top:-16px; }
        .rp-plan.is-open { grid-template-rows:1fr; opacity:1; margin-top:0; }
        .rp-plan-inner { min-height:0; overflow:hidden; display:flex; flex-direction:column; gap:16px; }
        .rp-plan.is-open .rp-plan-inner { overflow:visible; }
        button.rp-plan-summary { display:flex; align-items:center; justify-content:space-between; gap:12px; width:100%; padding:12px 14px; border-radius:16px; border:1px solid var(--border); background:color-mix(in srgb, var(--bg3) 45%, transparent); color:var(--cream); font-family:inherit; text-align:left; cursor:pointer; animation:rpItemIn .45s var(--rp-ease); transition:border-color .3s; }
        button.rp-plan-summary:hover { border-color:color-mix(in srgb, var(--gold) 50%, transparent); }
        .rp-plan-summary-text { display:flex; flex-direction:column; gap:3px; min-width:0; }
        .rp-plan-summary-route { font-family:var(--serif); font-size:19px; line-height:1.15; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .rp-plan-summary-meta { font-size:10.5px; color:var(--rp-gold-text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

        /* Felder */
        .rp-field { position:relative; display:flex; flex-direction:column; gap:8px; min-width:0; }
        .rp-field-label { font-size:9px; font-weight:700; letter-spacing:.24em; text-transform:uppercase; color:var(--dim); }
        .rp-field-input { display:flex; align-items:center; gap:10px; height:50px; padding:0 16px; border:1px solid var(--border); border-radius:14px; background:var(--rp-field); transition:border-color .3s var(--rp-ease); }
        .rp-field-input:hover { border-color:color-mix(in srgb, var(--gold) 45%, transparent); }
        .rp-field-input:focus-within { border-color:var(--gold); }
        .rp-field-icon { display:flex; color:var(--rp-gold-text); flex-shrink:0; }
        .rp-field-input input { flex:1; min-width:0; background:none; border:none; outline:none; font:inherit; font-size:14px; color:var(--cream); }
        .rp-field-input input::placeholder { color:var(--dim); }
        /* Im Fluss statt absolut: das Panel scrollt in sich und würde eine
           schwebende Liste abschneiden */
        .rp-suggestions { position:relative; z-index:2; margin-top:2px; border:1px solid var(--border); border-radius:14px; overflow:hidden; background:color-mix(in srgb, var(--bg) 92%, transparent); box-shadow:0 18px 40px rgba(0,0,0,0.30); animation:rpItemIn .3s var(--rp-ease); }
        button.rp-suggestion { display:flex; align-items:center; gap:10px; width:100%; padding:12px 14px; text-align:left; font-size:12.5px; color:var(--muted); background:none; transition:background .15s, color .15s; }
        button.rp-suggestion:hover { background:color-mix(in srgb, var(--border) 60%, transparent); color:var(--cream); }
        button.rp-suggestion svg { color:var(--rp-gold-text); flex-shrink:0; }

        /* Streckenvarianten */
        .rp-variants { display:flex; flex-direction:column; gap:8px; }
        .rp-variant-list { display:grid; grid-template-columns:repeat(auto-fit, minmax(110px, 1fr)); gap:8px; }
        button.rp-variant { display:flex; flex-direction:column; align-items:flex-start; gap:2px; padding:10px 12px; border:1px solid var(--border); border-radius:14px; background:color-mix(in srgb, var(--bg3) 50%, transparent); font-family:inherit; text-align:left; cursor:pointer; transition:border-color .35s var(--rp-ease), background .35s var(--rp-ease); }
        button.rp-variant:hover { border-color:color-mix(in srgb, var(--gold) 50%, transparent); }
        button.rp-variant.is-active { border-color:var(--gold); background:color-mix(in srgb, var(--gold) 14%, transparent); }
        .rp-variant-name { font-size:11.5px; font-weight:600; color:var(--cream); }
        .rp-variant-meta { font-size:10.5px; line-height:1.35; color:var(--dim); font-variant-numeric:tabular-nums; }
        .rp-variant-best { grid-column:1 / -1; }
        div.rp-variant { display:flex; flex-direction:column; align-items:flex-start; gap:4px; padding:12px 14px; border:1px solid var(--gold); border-radius:14px; background:color-mix(in srgb, var(--gold) 14%, transparent); animation:rpItemIn .45s var(--rp-ease); }
        div.rp-variant .rp-variant-meta { color:var(--rp-gold-text); font-size:11.5px; }
        div.rp-variant .rp-variant-tag { border-color:color-mix(in srgb, var(--gold) 45%, transparent); color:var(--rp-gold-text); }
        .rp-variant-row { display:flex; align-items:center; justify-content:space-between; gap:10px; width:100%; }
        .rp-variant-delta { font-size:13px; font-weight:700; color:var(--cream); font-variant-numeric:tabular-nums; }
        button.rp-variant.is-active .rp-variant-delta { color:var(--rp-gold-text); }
        .rp-variant-row .rp-variant-tag { margin-top:0; }
        .rp-variant-tag { margin-top:4px; padding:2px 7px; border-radius:999px; border:1px solid var(--border); font-size:8.5px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); }
        button.rp-variant.is-active .rp-variant-tag { border-color:color-mix(in srgb, var(--gold) 45%, transparent); color:var(--rp-gold-text); }
        .rp-variant-loading { animation:rpBlink 1.4s ease-in-out infinite; }
        @keyframes rpBlink { 0%,100%{opacity:.35} 50%{opacity:1} }
        button.rp-variant.is-active .rp-variant-meta { color:var(--rp-gold-text); }

        /* Statuszeile */
        .rp-live { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:12px; border:1px solid var(--border); background:color-mix(in srgb, var(--bg3) 40%, transparent); font-size:11.5px; line-height:1.5; color:var(--muted); }
        /* Statuspunkt mit "Sonar": zwei weiche Lichtringe, zeitversetzt.
           Die Ringe werden in voller Grösse (34px) gezeichnet und von klein
           auf gross gezoomt — so bleiben sie in jedem Bild scharf, statt einen
           8px-Punkt hochzuskalieren (das rastete sichtbar). Der Punkt selbst
           bewegt sich nicht; er hat nur einen ruhigen Lichthof. */
        .rp-live-dot { position:relative; width:9px; height:9px; border-radius:50%; background:var(--dim); flex-shrink:0; }
        .rp-live.is-live .rp-live-dot { --rp-dot:92,194,138; }
        .rp-live.is-busy .rp-live-dot { --rp-dot:201,168,106; }
        .rp-live.is-live .rp-live-dot, .rp-live.is-busy .rp-live-dot { background:rgb(var(--rp-dot)); box-shadow:0 0 0 3px rgba(var(--rp-dot),0.16), 0 0 14px rgba(var(--rp-dot),0.55); transition:background .6s ease, box-shadow .6s ease; }
        .rp-live.is-live .rp-live-dot::before, .rp-live.is-live .rp-live-dot::after,
        .rp-live.is-busy .rp-live-dot::before, .rp-live.is-busy .rp-live-dot::after {
          content:""; position:absolute; left:50%; top:50%; width:34px; height:34px; margin:-17px 0 0 -17px; border-radius:50%;
          background:radial-gradient(circle, rgba(var(--rp-dot),0.55) 0%, rgba(var(--rp-dot),0.22) 38%, rgba(var(--rp-dot),0) 70%);
          opacity:0; transform:scale(.22); will-change:transform, opacity; pointer-events:none;
          animation:rpSonar 3.4s cubic-bezier(.25,.1,.25,1) infinite;
        }
        .rp-live.is-live .rp-live-dot::after { animation-delay:1.7s; }
        .rp-live.is-busy .rp-live-dot::before, .rp-live.is-busy .rp-live-dot::after { animation-duration:1.8s; }
        .rp-live.is-busy .rp-live-dot::after { animation-delay:.9s; }
        @keyframes rpSonar {
          0%   { transform:scale(.22); opacity:0; }
          12%  { opacity:1; }
          100% { transform:scale(1); opacity:0; }
        }

        /* Aufklappbare Auswahl */
        .rp-acc { border-radius:18px; border:1px solid var(--border); background:color-mix(in srgb, var(--bg2) 45%, transparent); overflow:hidden; }
        button.rp-acc-head { display:flex; align-items:center; justify-content:space-between; gap:12px; width:100%; padding:14px 16px; border:none; background:transparent; color:var(--cream); font-family:inherit; text-align:left; cursor:pointer; }
        .rp-acc-title { display:flex; align-items:center; gap:10px; font-size:10px; font-weight:700; letter-spacing:.22em; text-transform:uppercase; transition:color .3s; }
        button.rp-acc-head:hover .rp-acc-title { color:var(--rp-gold-text); }
        .rp-acc-count { display:grid; place-items:center; min-width:22px; height:22px; padding:0 6px; border-radius:999px; background:linear-gradient(135deg,#DDC08A,#C2A061); color:#1A150C; font-size:10.5px; font-weight:700; letter-spacing:0; }
        .rp-acc-chev { display:grid; place-items:center; width:28px; height:28px; border-radius:50%; border:1px solid var(--border); color:var(--muted); transition:transform .45s var(--rp-ease), border-color .3s, color .3s; }
        .rp-acc.is-open .rp-acc-chev { transform:rotate(180deg); border-color:color-mix(in srgb, var(--gold) 55%, transparent); color:var(--rp-gold-text); }
        .rp-acc-body { display:grid; grid-template-rows:0fr; transition:grid-template-rows .5s var(--rp-ease); }
        .rp-acc.is-open .rp-acc-body { grid-template-rows:1fr; }
        .rp-acc-inner { overflow:hidden; }
        .rp-acc-empty { margin:0; padding:2px 16px 16px; font-size:12px; line-height:1.6; color:var(--dim); }
        /* bis zu 4 Einträge vollständig sichtbar (je 64px + 8px Abstand), danach scrollt nur die Liste */
        .rp-acc-list { display:flex; flex-direction:column; gap:8px; padding:0 12px 12px; max-height:calc(4 * 66px + 3 * 8px + 12px); overflow-y:auto; scrollbar-width:thin; scrollbar-color:color-mix(in srgb, var(--gold) 45%, transparent) transparent; }
        .rp-acc-item { display:grid; grid-template-columns:48px minmax(0,1fr) auto; align-items:center; gap:12px; padding:8px; border-radius:14px; border:1px solid var(--border); background:color-mix(in srgb, var(--bg3) 55%, transparent); animation:rpItemIn .5s var(--rp-ease); }
        @keyframes rpItemIn { from{opacity:0;transform:translateY(-6px) scale(.98)} to{opacity:1;transform:none} }
        .rp-acc-item img { width:48px; height:48px; border-radius:11px; object-fit:cover; display:block; }
        .rp-acc-text { min-width:0; }
        .rp-acc-name { font-family:var(--serif); font-size:18px; line-height:1.1; color:var(--cream); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .rp-acc-meta { margin-top:3px; font-size:10.5px; color:var(--dim); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        button.rp-acc-remove { width:32px; height:32px; display:grid; place-items:center; border-radius:50%; border:1px solid var(--border); background:transparent; color:var(--muted); cursor:pointer; transition:all .3s; }
        button.rp-acc-remove:hover { color:#e08080; border-color:rgba(224,128,128,0.5); background:rgba(224,128,128,0.08); }

        /* Speichern */
        .rp-save { display:flex; flex-direction:column; gap:10px; }
        .rp-save-summary { margin:0; font-size:12.5px; font-weight:600; color:var(--cream); }
        button.rp-save-btn { display:inline-flex; align-items:center; justify-content:center; gap:10px; width:100%; height:50px; padding:0 24px; border:none; border-radius:999px; background:linear-gradient(135deg,#DDC08A 0%,#C2A061 100%); color:#1A150C; font-family:inherit; font-size:10px; font-weight:700; letter-spacing:.2em; text-transform:uppercase; cursor:pointer; box-shadow:0 10px 26px rgba(194,160,97,0.30); transition:transform .3s var(--rp-ease), box-shadow .3s var(--rp-ease), opacity .3s; }
        button.rp-save-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 14px 32px rgba(194,160,97,0.40); }
        button.rp-save-btn:disabled { opacity:.42; box-shadow:none; cursor:not-allowed; }

        .rp-error { margin:0; padding:11px 14px; border:1px solid rgba(224,128,128,0.35); border-radius:12px; background:rgba(224,128,128,0.08); font-size:12px; color:#e08080; }
        .rp-hint { margin:0; font-size:12.5px; line-height:1.7; color:var(--dim); }
        .rp-note { margin:0; font-size:11px; line-height:1.6; color:var(--dim); font-style:italic; }

        /* ---------- Routen entlang der Strecke */
        .rp-results { position:relative; z-index:2; margin:12px 0 0; padding:0 clamp(20px,4vw,56px); display:flex; flex-direction:column; gap:24px; }
        .rp-results-head { display:grid; grid-template-columns:minmax(0,1fr) 420px; align-items:end; gap:32px; }
        .rp-results-title { margin:8px 0 0; font-family:var(--serif); font-size:clamp(32px,3.4vw,44px); font-weight:400; line-height:1.02; color:var(--cream); }
        .rp-results-sub { margin:8px 0 0; font-size:12.5px; line-height:1.6; color:var(--dim); }
        .rp-detour { display:flex; flex-direction:column; gap:10px; padding-bottom:4px; }
        .rp-detour-head { display:flex; align-items:baseline; justify-content:space-between; gap:14px; }
        .rp-detour-value { font-size:20px; font-weight:600; color:var(--rp-gold-text); font-variant-numeric:tabular-nums; }
        input.rp-detour-slider { -webkit-appearance:none; appearance:none; width:100%; height:4px; border-radius:999px; background:linear-gradient(to right, var(--gold) 0%, var(--gold) var(--rp-detour-fill,40%), color-mix(in srgb, var(--border) 90%, transparent) var(--rp-detour-fill,40%)); outline:none; cursor:pointer; }
        input.rp-detour-slider::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:20px; height:20px; border-radius:50%; background:#fff; border:3px solid var(--gold); box-shadow:0 4px 12px rgba(0,0,0,0.25); cursor:pointer; }
        input.rp-detour-slider::-moz-range-thumb { width:20px; height:20px; border:3px solid var(--gold); border-radius:50%; background:#fff; cursor:pointer; }
        input.rp-detour-slider:focus-visible { box-shadow:0 0 0 3px color-mix(in srgb, var(--gold) 35%, transparent); }

        .rp-rail-wrap { position:relative; margin:0 calc(-1 * clamp(20px,4vw,56px)); }
        .rp-rail-wrap::before, .rp-rail-wrap::after { content:""; position:absolute; top:0; bottom:24px; z-index:2; width:90px; pointer-events:none; opacity:0; transition:opacity .4s var(--rp-ease); }
        .rp-rail-wrap::before { left:0; background:linear-gradient(to left, transparent, var(--bg)); }
        .rp-rail-wrap::after { right:0; background:linear-gradient(to right, transparent, var(--bg)); }
        .rp-rail-wrap.has-left::before, .rp-rail-wrap.has-right::after { opacity:1; }
        .rp-rail { display:grid; grid-auto-flow:column; grid-auto-columns:300px; gap:18px; overflow-x:auto; padding:6px clamp(20px,4vw,56px) 24px; scroll-snap-type:x proximity; scroll-padding:0 clamp(20px,4vw,56px); scrollbar-width:thin; scrollbar-color:color-mix(in srgb, var(--gold) 40%, transparent) transparent; }
        .rp-rail-item { scroll-snap-align:start; }
        button.rp-rail-arrow { position:absolute; top:calc(50% - 12px); z-index:6; width:52px; height:52px; margin-top:-26px; display:grid; place-items:center; border-radius:50%; border:1px solid var(--border); background:var(--rp-glass); backdrop-filter:blur(20px) saturate(160%); -webkit-backdrop-filter:blur(20px) saturate(160%); color:var(--cream); box-shadow:var(--rp-shadow), inset 0 1px 0 var(--rp-glass-line); cursor:pointer; opacity:0; pointer-events:none; transform:scale(.9); transition:opacity .35s var(--rp-ease), transform .35s var(--rp-ease), border-color .3s, color .3s; }
        button.rp-rail-arrow.is-left { left:clamp(12px,2.5vw,32px); }
        button.rp-rail-arrow.is-right { right:clamp(12px,2.5vw,32px); }
        .rp-rail-wrap.has-left button.rp-rail-arrow.is-left, .rp-rail-wrap.has-right button.rp-rail-arrow.is-right { opacity:1; pointer-events:auto; transform:scale(1); }
        button.rp-rail-arrow:hover { border-color:var(--gold); color:var(--rp-gold-text); transform:scale(1.06); }

        .rp-bottom-links { display:flex; align-items:center; justify-content:center; gap:32px; flex-wrap:wrap; padding:36px 20px 48px; }
        .rp-back { display:inline-flex; align-items:center; gap:8px; font-size:10px; font-weight:800; letter-spacing:.18em; text-transform:uppercase; color:var(--muted); transition:color .2s; }
        .rp-back:hover { color:var(--rp-gold-text); }

        ${ROUTE_CARD_STYLES}

        /* ---------- Tablet & Handy: Panel unter die Karte */
        @media (max-width:900px) {
          .rp-hero { height:auto; overflow:visible; }
          .rp-hero-map { position:relative; height:clamp(320px, 52vh, 460px); }
          .rp-hero-fade { height:clamp(320px, 52vh, 460px); }
          .rp-hero-stats { top:auto; bottom:auto; top:clamp(250px, calc(52vh - 70px), 390px); right:16px; }
          .rp-panel { position:relative; top:auto; left:auto; width:auto; max-height:none; margin:-48px 16px 0; }
          .rp-results { margin-top:28px; }
          .rp-results-head { grid-template-columns:1fr; gap:20px; }
          .rp-rail { grid-auto-columns:78vw; }
          button.rp-rail-arrow { display:none; }
        }
        @media (max-width:480px) {
          .rp-panel { padding:18px; border-radius:22px; }
          .rp-panel-title { font-size:30px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .rp-live-dot, .rp-live-dot::before, .rp-live-dot::after, .rp-acc-item { animation:none !important; }
          .rp-acc-body, .rp-acc-chev { transition:none; }
        }
      `}</style>
    </div>
  );
}

export default function PlanPage() {
  // useSearchParams braucht eine Suspense-Grenze (gleiches Muster wie /trip
  // und /explore) — sonst bricht der statische Build ab.
  return (
    <Suspense fallback={null}>
      <PlanPageContent />
    </Suspense>
  );
}