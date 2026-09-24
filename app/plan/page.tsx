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
  MapPin, Flag, Navigation, Clock, Search, Compass, ArrowRight, ArrowLeft, Plus,
} from "lucide-react";

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
import { addStopsToDay, createTrip, fetchTrip, fetchTrips, touchTrip } from "../../lib/trips";
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
};

// Texte für die neuen Planner-Funktionen. Lokal statt in lib/translations,
// gleiches Muster wie GoogleMapsGate — kann später in die zentrale
// Übersetzungsdatei wandern.
const TRIP_TEXT = {
  de: {
    banner: "Du ergänzt deinen Trip „{title}“ – neue Routen landen an Tag {day}.",
    backToTrip: "Zurück zum Trip",
    addToTrip: "Zum Trip hinzufügen",
    adding: "Wird hinzugefügt…",
    inTrip: "Bereits im Trip",
    addError: "Die Routen konnten nicht hinzugefügt werden. Bitte versuch es erneut.",
    tripLoadError: "Der Trip konnte nicht geladen werden. Du kannst hier trotzdem einen neuen Trip planen.",
    toBuilder: "Zum Trip Builder",
    variantsLabel: "Streckenvariante",
    via: "über {road}",
    variantN: "Variante {n}",
    variantsHint: "Du kannst auch direkt auf eine graue Linie in der Karte klicken. Die gewählte Variante bestimmt, welche Panoramarouten als passend gelten – beim Wechsel wird deine Auswahl zurückgesetzt.",
  },
  en: {
    banner: "You're adding routes to “{title}” – they'll go to day {day}.",
    backToTrip: "Back to trip",
    addToTrip: "Add to trip",
    adding: "Adding…",
    inTrip: "Already in trip",
    addError: "The routes couldn't be added. Please try again.",
    tripLoadError: "The trip couldn't be loaded. You can still plan a new trip here.",
    toBuilder: "Open Trip Builder",
    variantsLabel: "Route option",
    via: "via {road}",
    variantN: "Option {n}",
    variantsHint: "You can also click a grey line on the map. The selected option decides which scenic routes count as along the way – switching resets your selection.",
  },
  ru: {
    banner: "Вы дополняете поездку «{title}» – новые маршруты попадут в день {day}.",
    backToTrip: "Назад к поездке",
    addToTrip: "Добавить в поездку",
    adding: "Добавляем…",
    inTrip: "Уже в поездке",
    addError: "Не удалось добавить маршруты. Попробуйте ещё раз.",
    tripLoadError: "Не удалось загрузить поездку. Вы всё равно можете спланировать новую.",
    toBuilder: "Открыть конструктор поездки",
    variantsLabel: "Вариант маршрута",
    via: "через {road}",
    variantN: "Вариант {n}",
    variantsHint: "Можно также нажать на серую линию на карте. Выбранный вариант определяет, какие живописные маршруты считаются подходящими – при смене выбор сбрасывается.",
  },
} as const;

type TripLang = keyof typeof TRIP_TEXT;

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

function PlanPageContent() {
  const { t, lang } = useLanguage();
  const tx = TRIP_TEXT[(lang as TripLang) in TRIP_TEXT ? (lang as TripLang) : "de"];
  const { unit } = useUnit();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripParam = searchParams.get("trip") ?? "";
  const dayParam = searchParams.get("day") ?? "";
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

  // Zuletzt bearbeiteter Trip für den "Zum Trip Builder"-Link unten
  const [latestTripId, setLatestTripId] = useState<string | null>(null);

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
      });

      if (trip.start_location) setStart(trip.start_location);
      if (trip.end_location) setEnd(trip.end_location);
    })();

    return () => {
      cancelled = true;
    };
  }, [tripParam, dayParam, userId, authLoading]);

  // ------------------------------------ Zuletzt bearbeiteten Trip laden
  useEffect(() => {
    if (!userId) {
      setLatestTripId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const trips = await fetchTrips(userId);
      if (!cancelled) setLatestTripId(trips?.[0]?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

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
  }

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
    setAddError(false);
    setCalculating(true);
    setCandidates([]);
    setSelectedIds([]);
    setScoringCount(0);
    setRouteOptions([]);
    // Zusammen mit der geleerten Auswahl zurücksetzen, sonst hält der Effekt
    // unten die leere Auswahl für eine Änderung.
    renderedSelectionRef.current = "";

    try {
      // Grundstrecke mit Alternativen (und Verkehrslage, siehe googleMaps.ts)
      const result = await computeBaselineDirections(origin, destination);
      if (isCancelled()) return;

      baseResultRef.current = result;
      queryRef.current = { start: origin, end: destination };

      setRouteOptions(listRouteOptions(result));
      activeRouteIndexRef.current = 0;
      setActiveRouteIndex(0);
      setHasResult(true);

      // Variante 0 = Googles Empfehlung
      await runMatching(0, run);
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
    setCandidates([]);
    setSelectedIds([]);
    setScoringCount(0);
    renderedSelectionRef.current = "";
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

  const toggleSelect = useCallback(
    (routeId: string) => {
      // Routen, die schon im Ziel-Trip liegen, sind nicht wählbar.
      if (existingRouteIds.has(routeId)) return;
      setSelectedIds((prev) =>
        prev.includes(routeId) ? prev.filter((id) => id !== routeId) : [...prev, routeId]
      );
    },
    [existingRouteIds]
  );

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

    // NEU: Auswahl wieder leer -> gewählte Streckenvariante zeigen, ohne
    // neue Anfrage. Vorher hätte hier eine frische Anfrage ohne Wegpunkte
    // Googles Standardroute geladen und die gewählte Variante überschrieben.
    if (selectedCandidates.length === 0) {
      const base = baseResultRef.current;
      if (base) {
        const route = pickRoute(base, activeRouteIndexRef.current);
        setSummary(summarizeDirections(route));
        showDirections(route);
      }
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
    if (!bounds.isEmpty()) map.fitBounds(bounds, 40);

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
    router.push(`/trip?id=${tripId}`);
  }

  /**
   * Auswahl an den Zieltag des bestehenden Trips anhängen und zurück in den
   * Builder. Routen, die schon im Trip liegen, werden sicherheitshalber
   * nochmals herausgefiltert.
   */
  async function handleAddToTrip() {
    if (!targetTrip) return;

    const routeIds = selectedCandidates
      .map((candidate) => candidate.route.id)
      .filter((id) => !existingRouteIds.has(id));

    if (routeIds.length === 0) {
      setErrorKey("plan.saveHint");
      return;
    }

    setErrorKey("");
    setAddError(false);
    setSaving(true);

    const ok = await addStopsToDay(targetTrip.dayId, routeIds, targetTrip.dayStopCount);
    if (!ok) {
      setSaving(false);
      setAddError(true);
      return;
    }

    // updated_at nachziehen, damit der Trip auf /my-trips nach oben rutscht.
    await touchTrip(targetTrip.id, targetTrip.title);
    router.push(`/trip?id=${targetTrip.id}`);
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

  // Neue (noch nicht im Trip liegende) Auswahl — steuert den Button im
  // Trip-ergänzen-Modus.
  const newSelectionCount = selectedIds.filter((id) => !existingRouteIds.has(id)).length;

  // Ziel des "Zum Trip Builder"-Links: der gerade ergänzte Trip, sonst der
  // zuletzt bearbeitete.
  const builderTripId = targetTrip?.id ?? latestTripId;

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

            {/* Hinweis im Trip-ergänzen-Modus */}
            {targetTrip && (
              <div className="rp-trip-banner">
                <p>
                  {tx.banner
                    .replace("{title}", targetTrip.title)
                    .replace("{day}", String(targetTrip.dayNumber))}
                </p>
                <Link href={`/trip?id=${targetTrip.id}`} className="rp-trip-banner-link">
                  <ArrowLeft size={12} strokeWidth={2.4} /> {tx.backToTrip}
                </Link>
              </div>
            )}
            {tripLoadFailed && <p className="rp-error">{tx.tripLoadError}</p>}

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

            {/* NEU: Streckenvarianten, nur wenn Google mehr als eine liefert */}
            {routeOptions.length > 1 && (
              <div className="rp-variants">
                <span className="rp-field-label">{tx.variantsLabel}</span>
                <div className="rp-variant-list">
                  {routeOptions.map((option) => (
                    <button
                      key={option.index}
                      type="button"
                      className={`rp-variant ${option.index === activeRouteIndex ? "is-active" : ""}`}
                      aria-pressed={option.index === activeRouteIndex}
                      onClick={() => handleSelectRouteOption(option.index)}
                      onMouseEnter={() => highlightAlternative(option.index)}
                      onMouseLeave={() => highlightAlternative(null)}
                    >
                      <span className="rp-variant-name">
                        {option.summary
                          ? tx.via.replace("{road}", option.summary)
                          : tx.variantN.replace("{n}", String(option.index + 1))}
                      </span>
                      <span className="rp-variant-meta">
                        {formatDuration(option.seconds)} · {formatDistance(option.km, unit)}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="rp-note">{tx.variantsHint}</p>
              </div>
            )}

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
                  {visibleCandidates.map((candidate) => {
                    // Bereits im Ziel-Trip -> nicht wählbar, eigene Pille
                    const inTrip = existingRouteIds.has(candidate.route.id);
                    return (
                      <RouteCard
                        key={candidate.route.id}
                        route={candidate.route}
                        viewRouteLabel={t("explore.viewRoute")}
                        selectable={!inTrip}
                        selected={selectedIds.includes(candidate.route.id)}
                        onToggleSelect={toggleSelect}
                        selectLabel={t("plan.select")}
                        selectedLabel={t("plan.selected")}
                        badge={inTrip ? tx.inTrip : detourBadge(candidate)}
                        badgeMuted={
                          inTrip ||
                          candidate.detourRatio === null ||
                          candidate.detourRatio * 100 > detourLimitPct
                        }
                      />
                    );
                  })}
                </div>
              )}

              {routesWithoutCoordinates > 0 && (
                <p className="rp-note">
                  {t("plan.matches.skipped").replace("{n}", String(routesWithoutCoordinates))}
                </p>
              )}

              <div className="rp-actions">
                {targetTrip ? (
                  <button
                    className="rp-save-btn"
                    onClick={handleAddToTrip}
                    disabled={saving || newSelectionCount === 0}
                  >
                    <Plus size={13} strokeWidth={2.4} />
                    {saving ? tx.adding : tx.addToTrip}
                  </button>
                ) : (
                  <button
                    className="rp-save-btn"
                    onClick={handleSaveTrip}
                    disabled={saving || selectedIds.length === 0}
                  >
                    {saving ? t("plan.saving") : t("plan.save")}
                    <ArrowRight size={13} strokeWidth={2.4} />
                  </button>
                )}
                {(targetTrip ? newSelectionCount === 0 : selectedIds.length === 0) && (
                  <p className="rp-hint">{t("plan.saveHint")}</p>
                )}
                {addError && <p className="rp-error">{tx.addError}</p>}
              </div>
            </section>
          )}

          <div className="rp-bottom-links">
            <Link href="/" className="rp-back">
              {t("plan.back")}
            </Link>
            {/* Direkt in den Trip Builder — der gerade ergänzte Trip, sonst
                der zuletzt bearbeitete */}
            {builderTripId && (
              <Link href={`/trip?id=${builderTripId}`} className="rp-back rp-back-builder">
                {tx.toBuilder}
                <ArrowRight size={12} strokeWidth={2.4} />
              </Link>
            )}
          </div>
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

        /* Hinweis im Trip-ergänzen-Modus */
        .rp-trip-banner { display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; padding:14px 18px; border:1px solid color-mix(in srgb, var(--gold) 40%, transparent); border-radius:14px; background:color-mix(in srgb, var(--gold) 10%, transparent); }
        .rp-trip-banner p { font-size:12.5px; line-height:1.6; color:var(--cream); }
        .rp-trip-banner-link { display:inline-flex; align-items:center; gap:6px; font-size:9px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase; color:var(--gold); white-space:nowrap; transition:opacity .2s; }
        .rp-trip-banner-link:hover { opacity:0.75; }

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

        /* NEU: Streckenvarianten */
        .rp-variants { display:flex; flex-direction:column; gap:10px; }
        .rp-variant-list { display:flex; gap:10px; flex-wrap:wrap; }
        button.rp-variant { display:flex; flex-direction:column; align-items:flex-start; gap:4px; padding:12px 16px; border:1px solid var(--border); border-radius:14px; background:color-mix(in srgb, var(--bg3) 55%, transparent); font-family:inherit; text-align:left; cursor:pointer; transition:border-color .2s, background .2s; }
        button.rp-variant:hover { border-color:color-mix(in srgb, var(--gold) 45%, transparent); }
        button.rp-variant.is-active { border-color:var(--gold); background:color-mix(in srgb, var(--gold) 12%, transparent); }
        .rp-variant-name { font-size:12px; font-weight:700; letter-spacing:0.02em; color:var(--cream); }
        .rp-variant-meta { font-size:11px; color:var(--dim); font-variant-numeric:tabular-nums; }
        button.rp-variant.is-active .rp-variant-meta { color:var(--gold); }

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
        .rp-bottom-links { align-self:center; display:flex; align-items:center; justify-content:center; gap:32px; flex-wrap:wrap; }
        .rp-back-builder { color:var(--gold); }
        .rp-back-builder:hover { color:var(--cream); }

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
          button.rp-variant { flex:1 1 140px; }
        }

        @media (max-width:480px) {
          .rp-route-grid { grid-template-columns:1fr; }
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