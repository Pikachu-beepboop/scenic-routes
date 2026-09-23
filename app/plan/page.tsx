"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { MapPin, Flag, Navigation, Clock, Search, Compass, ArrowRight } from "lucide-react";

import PlannerNav from "../components/PlannerNav";
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
  computeDirections,
  fetchPlaceSuggestions,
  loadGoogleMaps,
  overviewPathToLngLat,
  summarizeDirections,
  type DirectionsWaypoint,
  type PlaceSuggestion,
} from "../../lib/googleMaps";
import { createTrip } from "../../lib/trips";
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

/** Karten-Mittelpunkt, bevor eine Route berechnet wurde (Mitteleuropa). */
const DEFAULT_MAP_CENTER = { lat: 47.2, lng: 10.5 };
const DEFAULT_MAP_ZOOM = 5;

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes} min`;
  return `${hours} h ${String(minutes).padStart(2, "0")} min`;
}

/**
 * Unterhalb dieser Mehrfahrzeit wird der Umweg nicht als Zahl ausgewiesen,
 * sondern als "fast ohne Umweg" — fünf Minuten liegen innerhalb dessen, was
 * eine Directions-Schätzung ohnehin schwankt.
 */
const NEGLIGIBLE_DETOUR_SECONDS = 300;

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
}: {
  label: string;
  placeholder: string;
  icon: ReactNode;
  value: string;
  /** Ohne Google-Maps-Zustimmung werden keine Places-Requests geschickt. */
  enabled: boolean;
  onChange: (next: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Nach dem Übernehmen eines Vorschlags soll die Änderung keine neue Abfrage
  // auslösen — sonst klappt die Liste sofort wieder auf.
  const skipNextLookup = useRef(false);

  useEffect(() => {
    if (skipNextLookup.current) {
      skipNextLookup.current = false;
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
          onChange={(e) => onChange(e.target.value)}
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
                skipNextLookup.current = true;
                onChange(suggestion.text);
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

export default function PlanPage() {
  const { t } = useLanguage();
  const { unit } = useUnit();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const [routes, setRoutes] = useState<PlannerRoute[]>([]);
  // Die Kandidaten samt gemessener Mehrfahrzeit. Sie gehören zur zuletzt
  // berechneten Start/Ziel-Kombination und bleiben unverändert liegen, bis
  // erneut "Calculate Route" gedrückt wird — der Regler unten arbeitet
  // ausschliesslich auf diesem Zwischenspeicher (Issue #28).
  const [candidates, setCandidates] = useState<ScoredCandidate<PlannerRoute>[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detourLimitPct, setDetourLimitPct] = useState(DEFAULT_DETOUR_LIMIT_PCT);
  /** > 0, solange Schritt 2 die Umwege dieser vielen Kandidaten misst. */
  const [scoringCount, setScoringCount] = useState(0);

  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [summary, setSummary] = useState<{ km: number; seconds: number } | null>(null);
  // Fehler werden als Übersetzungs-Key gehalten, damit ein Sprachwechsel auch
  // eine bereits sichtbare Meldung mit umschaltet.
  const [errorKey, setErrorKey] = useState<TranslationKey | "">("");

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
  // Zählt die "Calculate Route"-Läufe. Ein neuer Lauf entwertet die noch
  // laufenden Umweg-Messungen des vorherigen.
  const calcRunRef = useRef(0);

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
        rendererRef.current = new maps.DirectionsRenderer({ map });

        // Wurde die Route berechnet, bevor der Consent-Gate die Karte
        // freigegeben hat, wird sie hier nachgezogen.
        if (lastResultRef.current) rendererRef.current.setDirections(lastResultRef.current);
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
  }, []);

  // ------------------------------------------------------------- Berechnung
  /**
   * Zweistufiges Umweg-Matching (Issue #28):
   *   1. direkte Strecke berechnen — liefert Referenz-Fahrzeit und Polylinie,
   *   2. lokale Vorauswahl aus allen kuratierten Routen (kein Netzwerk),
   *   3. eine Directions-Anfrage je Kandidat, um die echte Mehrfahrzeit zu
   *      messen; das Ergebnis bleibt anschliessend im State liegen.
   */
  async function handleCalculate() {
    const origin = start.trim();
    const destination = end.trim();

    if (!origin || !destination) {
      setErrorKey("plan.error.missingInput");
      return;
    }

    const run = ++calcRunRef.current;
    const isCancelled = () => calcRunRef.current !== run;

    setErrorKey("");
    setCalculating(true);
    setCandidates([]);
    setSelectedIds([]);
    setScoringCount(0);
    // Zusammen mit der geleerten Auswahl zurücksetzen, sonst hält der Effekt
    // unten die leere Auswahl für eine Änderung und schickt eine überflüssige
    // Directions-Anfrage für die alte Strecke los.
    renderedSelectionRef.current = "";

    try {
      const result = await computeDirections(origin, destination);
      if (isCancelled()) return;

      const line: LngLat[] = overviewPathToLngLat(result);

      // Ohne Streckenverlauf kann das Matching nichts finden — das ist dann ein
      // Fehler in der Antwort, kein echtes "keine Treffer" (Issue #26).
      if (line.length < 2) {
        console.warn("plan: Directions-Antwort ohne verwertbaren Streckenverlauf");
      }

      const baseline = summarizeDirections(result);

      queryRef.current = { start: origin, end: destination };

      setSummary(baseline);
      setHasResult(true);
      showDirections(result);

      // Schritt 1: grobe Vorauswahl, rein lokal.
      const preselected = selectDetourCandidates(routes, line);
      setScoringCount(preselected.length);

      // Schritt 2: Directions ausschliesslich für diese Vorauswahl.
      const scored = await scoreDetourCandidates(
        origin,
        destination,
        baseline.seconds,
        preselected,
        { isCancelled }
      );
      if (isCancelled()) return;

      setCandidates(scored);
    } catch (err) {
      console.error("plan: Directions-Anfrage fehlgeschlagen", err);
      if (isCancelled()) return;
      setCandidates([]);
      setSelectedIds([]);
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
    () => filterByDetourLimit(candidates, detourLimitPct, selectedIds),
    [candidates, detourLimitPct, selectedIds]
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

  // Auswahl geändert -> Strecke mit den gewählten Routen als Wegpunkte neu
  // berechnen, Karte aktualisiert sich dadurch live.
  useEffect(() => {
    if (!hasResult) return;

    const selectionKey = selectedCandidates.map((candidate) => candidate.route.id).join(",");
    if (renderedSelectionRef.current === selectionKey) return;
    renderedSelectionRef.current = selectionKey;

    const waypoints: DirectionsWaypoint[] = selectedCandidates.flatMap(candidateWaypoints);

    let cancelled = false;

    (async () => {
      try {
        const result = await computeDirections(
          queryRef.current.start,
          queryRef.current.end,
          waypoints
        );
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
  }, [selectedCandidates, hasResult, showDirections]);

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

    const userId = await resolveUserId();

    // Wirklich nicht eingeloggt: Auswahl merken und über das bestehende
    // Login-Muster zurück nach /plan schicken. Der Trip entsteht dann
    // automatisch (siehe Effekt unten), der User landet nahtlos im Builder.
    if (!userId) {
      setSaving(false);
      savePendingTrip(pending);
      router.push(`/login?redirect=${encodeURIComponent("/plan")}`);
      return;
    }

    const { tripId, error } = await createTrip(userId, pending);
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
    router.push(`/trip?id=${tripId}`);
  }

  // Rückkehr vom Login mit gemerkter Auswahl -> Trip anlegen und weiterleiten.
  useEffect(() => {
    if (authLoading || resumedRef.current) return;

    const pending = readPendingTrip();
    if (!pending || pending.routeIds.length === 0) return;

    resumedRef.current = true;

    (async () => {
      const userId = await resolveUserId();
      if (!userId) {
        // Noch kein Login — die gemerkte Auswahl bleibt liegen, der nächste
        // Anlauf (oder das nächste Auth-Update) greift sie wieder auf.
        resumedRef.current = false;
        return;
      }

      const { tripId, error } = await createTrip(userId, pending);

      if (!tripId) {
        console.error("plan: gemerkter Trip konnte nicht angelegt werden", error);
        setErrorKey("plan.error.save");
        return;
      }

      // Erst nach dem erfolgreichen Anlegen verwerfen — vorher würde ein
      // Fehlschlag die Auswahl des Nutzers endgültig vernichten.
      clearPendingTrip();
      router.replace(`/trip?id=${tripId}`);
    })();
  }, [authLoading, resolveUserId, router]);

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
        <div className="rp-wrap">
          <header className="rp-hero">
            <span className="rp-hero-icon">
              <Compass size={20} strokeWidth={1.6} />
            </span>
            <p className="rp-eyebrow">{t("plan.eyebrow")}</p>
            <h1 className="rp-title">{t("plan.title")}</h1>
            <p className="rp-sub">{t("plan.sub")}</p>
          </header>

          {/* -------------------------------------------------- Eingabe */}
          <section className="rp-card">
            <h2 className="rp-card-title">{t("plan.form.title")}</h2>

            <div className="rp-form">
              <PlaceField
                label={t("plan.form.start")}
                placeholder={t("plan.form.startPlaceholder")}
                icon={<MapPin size={13} strokeWidth={2} />}
                value={start}
                enabled={mapsConsent}
                onChange={setStart}
              />
              <PlaceField
                label={t("plan.form.end")}
                placeholder={t("plan.form.endPlaceholder")}
                icon={<Flag size={13} strokeWidth={2} />}
                value={end}
                enabled={mapsConsent}
                onChange={setEnd}
              />
              <button
                className="rp-calc-btn"
                onClick={handleCalculate}
                disabled={calculating || !mapsConsent}
              >
                <Search size={13} strokeWidth={2.4} />
                {calculating ? t("plan.form.calculating") : t("plan.form.calculate")}
              </button>
            </div>

            {!mapsConsent && <p className="rp-hint">{t("plan.consentHint")}</p>}
            {errorKey && <p className="rp-error">{t(errorKey)}</p>}
          </section>

          {/* ---------------------------------------------------- Karte */}
          <section className="rp-card">
            <div className="rp-card-head">
              <h2 className="rp-card-title">{t("plan.map.title")}</h2>
              {summary && (
                <div className="rp-summary">
                  <span>
                    <Navigation size={12} strokeWidth={2} />
                    {t("plan.map.distance")}: {formatDistance(summary.km, unit)}
                  </span>
                  <span>
                    <Clock size={12} strokeWidth={2} />
                    {t("plan.map.duration")}: {formatDuration(summary.seconds)}
                  </span>
                </div>
              )}
            </div>

            {/* Die Höhe steckt im Rahmen, nicht in der Karte: so folgt auch
                der Consent-Platzhalter des Gates den Media-Queries. */}
            <div className="rp-map-frame">
              <GoogleMapsGate height="100%" onConsentChange={handleConsentChange}>
                <div ref={setMapEl} className="rp-map" />
              </GoogleMapsGate>
            </div>

            {!hasResult && <p className="rp-hint">{t("plan.map.empty")}</p>}
          </section>

          {/* -------------------------------------------- Passende Routen */}
          {hasResult && (
            <section className="rp-card">
              <div className="rp-card-head">
                <div>
                  <h2 className="rp-card-title">{t("plan.matches.title")}</h2>
                  <p className="rp-card-sub">{t("plan.matches.subtitle")}</p>
                </div>
                <div className="rp-counts">
                  <span className="rp-count">
                    {t("plan.matches.count").replace("{n}", String(visibleCandidates.length))}
                  </span>
                  {selectedIds.length > 0 && (
                    <span className="rp-count rp-count-gold">
                      {t("plan.matches.selected").replace("{n}", String(selectedIds.length))}
                    </span>
                  )}
                </div>
              </div>

              {/* Der Regler filtert ausschliesslich die oben bereits
                  gemessenen Umwege — er löst keine Anfrage aus. */}
              <div className="rp-detour">
                <div className="rp-detour-head">
                  <label className="rp-field-label" htmlFor="rp-detour-slider">
                    {t("plan.detour.label")}
                  </label>
                  <span className="rp-detour-value">+{detourLimitPct}%</span>
                </div>
                {/* --rp-detour-fill faerbt den bereits zurueckgelegten Teil
                    der Schiene ein; ::-webkit-slider-runnable-track kennt den
                    Wert des Reglers nicht und kann das nicht selbst. */}
                <input
                  id="rp-detour-slider"
                  className="rp-detour-slider"
                  type="range"
                  min={MIN_DETOUR_LIMIT_PCT}
                  max={MAX_DETOUR_LIMIT_PCT}
                  step={1}
                  value={detourLimitPct}
                  onChange={(event) => setDetourLimitPct(Number(event.target.value))}
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
                <div className="rp-detour-scale">
                  <span>+{MIN_DETOUR_LIMIT_PCT}%</span>
                  <span>+{MAX_DETOUR_LIMIT_PCT}%</span>
                </div>
                <p className="rp-note">{t("plan.detour.hint")}</p>
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
                <div className="rp-route-grid">
                  {visibleCandidates.map((candidate) => (
                    <RouteCard
                      key={candidate.route.id}
                      route={candidate.route}
                      viewRouteLabel={t("explore.viewRoute")}
                      selectable
                      selected={selectedIds.includes(candidate.route.id)}
                      onToggleSelect={toggleSelect}
                      selectLabel={t("plan.select")}
                      selectedLabel={t("plan.selected")}
                      badge={detourBadge(candidate)}
                      badgeMuted={
                        candidate.detourRatio === null ||
                        candidate.detourRatio * 100 > detourLimitPct
                      }
                    />
                  ))}
                </div>
              )}

              {routesWithoutCoordinates > 0 && (
                <p className="rp-note">
                  {t("plan.matches.skipped").replace("{n}", String(routesWithoutCoordinates))}
                </p>
              )}

              <div className="rp-actions">
                <button
                  className="rp-save-btn"
                  onClick={handleSaveTrip}
                  disabled={saving || selectedIds.length === 0}
                >
                  {saving ? t("plan.saving") : t("plan.save")}
                  <ArrowRight size={13} strokeWidth={2.4} />
                </button>
                {selectedIds.length === 0 && <p className="rp-hint">{t("plan.saveHint")}</p>}
              </div>
            </section>
          )}

          <Link href="/" className="rp-back">
            {t("plan.back")}
          </Link>
        </div>
      </div>

      <style>{`
        .rp-wrap { width:100%; max-width:1180px; display:flex; flex-direction:column; gap:22px; }

        .rp-hero { text-align:center; padding:4px 0 8px; }
        .rp-hero-icon { display:inline-grid; place-items:center; width:52px; height:52px; margin-bottom:20px; border:1px solid color-mix(in srgb, var(--gold) 38%, transparent); border-radius:16px; background:color-mix(in srgb, var(--gold) 12%, transparent); color:var(--gold); }
        .rp-eyebrow { font-size:9px; font-weight:800; letter-spacing:0.34em; text-transform:uppercase; color:var(--gold); margin-bottom:14px; }
        .rp-title { font-family:var(--serif); font-size:clamp(38px,5vw,60px); font-weight:300; line-height:0.98; letter-spacing:-0.04em; color:var(--cream); }
        .rp-sub { margin:18px auto 0; max-width:620px; font-size:15px; font-weight:300; line-height:1.75; color:var(--muted); }

        .rp-card { background:color-mix(in srgb, var(--bg2) 82%, transparent); border:1px solid var(--border); border-radius:28px; padding:28px; box-shadow:0 40px 100px rgba(0,0,0,0.45); display:flex; flex-direction:column; gap:20px; }
        .light .rp-card { background:#FFFFFF; box-shadow:0 30px 80px rgba(58,44,16,0.12); }
        .rp-card-head { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; flex-wrap:wrap; }
        .rp-card-title { font-family:var(--serif); font-size:26px; font-weight:400; color:var(--cream); letter-spacing:-0.01em; }
        .rp-card-sub { margin-top:6px; font-size:12px; font-weight:300; line-height:1.6; color:var(--dim); max-width:520px; }

        .rp-form { display:grid; grid-template-columns:1fr 1fr auto; gap:14px; align-items:end; }
        .rp-field { position:relative; display:flex; flex-direction:column; gap:8px; min-width:0; }
        .rp-field-label { font-size:9px; font-weight:800; letter-spacing:0.24em; text-transform:uppercase; color:var(--dim); }
        .rp-field-input { display:flex; align-items:center; gap:10px; padding:14px 16px; border:1px solid var(--border); border-radius:14px; background:color-mix(in srgb, var(--bg3) 70%, transparent); transition:border-color .2s; }
        .rp-field-input:focus-within { border-color:var(--gold); }
        .rp-field-icon { display:flex; color:var(--gold); flex-shrink:0; }
        .rp-field-input input { flex:1; min-width:0; background:none; border:none; outline:none; font:inherit; font-size:14px; color:var(--cream); }
        .rp-field-input input::placeholder { color:var(--dim); }

        .rp-suggestions { position:absolute; top:calc(100% + 8px); left:0; right:0; z-index:60; border:1px solid var(--border); border-radius:14px; overflow:hidden; background:color-mix(in srgb, var(--bg) 98%, transparent); backdrop-filter:blur(22px); box-shadow:0 28px 70px rgba(0,0,0,0.45); }
        button.rp-suggestion { display:flex; align-items:center; gap:10px; width:100%; padding:12px 14px; text-align:left; font-size:12.5px; color:var(--muted); background:none; transition:background .15s, color .15s; }
        button.rp-suggestion:hover { background:color-mix(in srgb, var(--border) 60%, transparent); color:var(--cream); }
        button.rp-suggestion svg { color:var(--gold); flex-shrink:0; }

        button.rp-calc-btn { display:flex; align-items:center; justify-content:center; gap:9px; height:50px; padding:0 28px; border:1px solid var(--gold); border-radius:14px; background:var(--gold); color:#0c0b09; font-size:10px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; transition:opacity .2s, transform .2s; }
        button.rp-calc-btn:hover:not(:disabled) { transform:translateY(-1px); }
        button.rp-calc-btn:disabled { opacity:0.55; cursor:not-allowed; }

        .rp-error { padding:12px 16px; border:1px solid rgba(224,128,128,0.35); border-radius:12px; background:rgba(224,128,128,0.08); font-size:12.5px; color:#e08080; }
        .rp-hint { font-size:12.5px; line-height:1.7; color:var(--dim); }
        .rp-note { font-size:11px; line-height:1.6; color:var(--dim); font-style:italic; }

        /* Karte: deutlich groesser als die fruehen 420px (Issue #28). Die
           Hoehe haengt am Rahmen, damit Karte und Consent-Platzhalter
           gemeinsam skalieren; 62vh mit harten Grenzen haelt sie auf flachen
           Laptops im Bild und laesst sie auf grossen Schirmen wachsen. */
        .rp-map-frame { border:1px solid var(--border); border-radius:20px; overflow:hidden; height:clamp(520px, 62vh, 720px); }
        .rp-map { width:100%; height:100%; }

        .rp-detour { display:flex; flex-direction:column; gap:10px; padding:18px 20px; border:1px solid var(--border); border-radius:18px; background:color-mix(in srgb, var(--bg3) 55%, transparent); }
        .rp-detour-head { display:flex; align-items:baseline; justify-content:space-between; gap:14px; }
        .rp-detour-value { font-size:20px; font-weight:700; color:var(--gold); font-variant-numeric:tabular-nums; }
        .rp-detour-scale { display:flex; justify-content:space-between; font-size:9px; font-weight:800; letter-spacing:0.18em; color:var(--dim); }
        input.rp-detour-slider { -webkit-appearance:none; appearance:none; width:100%; height:4px; border-radius:999px; background:linear-gradient(to right, var(--gold) 0%, var(--gold) var(--rp-detour-fill,40%), color-mix(in srgb, var(--border) 90%, transparent) var(--rp-detour-fill,40%)); outline:none; cursor:pointer; }
        input.rp-detour-slider::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:18px; height:18px; border-radius:50%; background:var(--gold); border:2px solid var(--bg); box-shadow:0 2px 10px rgba(0,0,0,0.35); cursor:pointer; }
        input.rp-detour-slider::-moz-range-thumb { width:18px; height:18px; border:2px solid var(--bg); border-radius:50%; background:var(--gold); cursor:pointer; }
        input.rp-detour-slider:focus-visible { box-shadow:0 0 0 3px color-mix(in srgb, var(--gold) 35%, transparent); }

        .rp-summary { display:flex; flex-wrap:wrap; gap:16px; }
        .rp-summary span { display:inline-flex; align-items:center; gap:7px; font-size:11px; font-weight:600; letter-spacing:0.04em; color:var(--muted); }
        .rp-summary svg { color:var(--gold); flex-shrink:0; }

        .rp-counts { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .rp-count { padding:7px 14px; border:1px solid var(--border); border-radius:999px; font-size:9px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase; color:var(--muted); white-space:nowrap; }
        .rp-count-gold { border-color:color-mix(in srgb, var(--gold) 45%, transparent); background:color-mix(in srgb, var(--gold) 12%, transparent); color:var(--gold); }

        .rp-route-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }

        .rp-actions { display:flex; align-items:center; gap:18px; flex-wrap:wrap; padding-top:8px; border-top:1px solid var(--border); }
        button.rp-save-btn { display:inline-flex; align-items:center; gap:10px; margin-top:16px; padding:15px 30px; border:1px solid var(--gold); border-radius:999px; background:var(--gold); color:#0c0b09; font-size:10px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; transition:opacity .2s, transform .2s; }
        button.rp-save-btn:hover:not(:disabled) { transform:translateY(-1px); }
        button.rp-save-btn:disabled { opacity:0.45; cursor:not-allowed; }

        .rp-back { align-self:center; display:inline-flex; align-items:center; gap:8px; padding:6px 0 10px; font-size:10px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase; color:var(--muted); transition:color .2s; }
        .rp-back:hover { color:var(--gold); }

        ${ROUTE_CARD_STYLES}

        @media (max-width:1100px) {
          .rp-route-grid { grid-template-columns:repeat(2,1fr); }
          .rp-map-frame { height:clamp(460px, 58vh, 600px); }
        }

        @media (max-width:760px) {
          .rp-card { padding:18px; border-radius:22px; box-shadow:0 24px 60px rgba(0,0,0,0.35); }
          .rp-form { grid-template-columns:1fr; align-items:stretch; }
          button.rp-calc-btn { width:100%; }
          .rp-card-title { font-size:21px; }
          .rp-map-frame { height:clamp(380px, 55vh, 480px); }
          .rp-route-grid { grid-template-columns:repeat(2,1fr); gap:12px; }
          .rp-detour { padding:14px 16px; }
          .rp-detour-value { font-size:17px; }
          button.rp-save-btn { width:100%; justify-content:center; }
        }

        @media (max-width:480px) {
          .rp-route-grid { grid-template-columns:1fr; }
        }
      `}</style>
    </div>
  );
}
