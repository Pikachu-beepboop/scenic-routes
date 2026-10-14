"use client";

// Weltkarte auf der Homepage — "Route of the moment".
//
// NEU: Eine große Karte stellt nacheinander einzelne Routen vor (alle 6 s), mit
// einer gestrichelten Linie zum Punkt auf der Karte. Jeder Punkt ist klickbar:
// ein Klick zeigt diese Route und beendet die automatische Tour. Liegen mehrere
// Routen fast an derselben Stelle (Alpen), blättert ein erneuter Klick zur
// nächsten. Die Tour pausiert, solange die Maus über der Karte ist, die Karte
// nicht im Bild ist oder der Nutzer "weniger Bewegung" eingestellt hat.
//
// Die Punkte sitzen auf den echten Koordinaten (Spalten latitude/longitude).

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { supabasePublic, safeQuery } from "../../lib/supabase";
import { useTheme } from "next-themes";
import { useLanguage } from "../LanguageContext";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const TOUR_MS = 6000;
/** Routen, die näher als dieser Abstand (Grad) beieinander liegen, teilen sich einen Klick. */
const NEAR_DEG = 1.6;

// ------------------------------------------------------------- Punkte ausdünnen
// Fläche (Tsd. km²) je Land: bestimmt, wie viele Punkte ein Land auf der Karte bekommt.
// Kleine Länder (Europa) 1, mittlere 2–3, sehr große (USA, Russland, Kanada …) deutlich mehr.
const COUNTRY_AREA: Record<string, number> = {
  russia: 17098, russland: 17098, canada: 9985, kanada: 9985, usa: 9834, "united states": 9834, "united states of america": 9834, "vereinigte staaten": 9834,
  china: 9597, brazil: 8516, brasilien: 8516, australia: 7692, australien: 7692, india: 3287, indien: 3287, argentina: 2780, argentinien: 2780,
  kazakhstan: 2725, kasachstan: 2725, algeria: 2382, algerien: 2382, greenland: 2166, "grönland": 2166, mexico: 1964, mexiko: 1964,
  indonesia: 1905, indonesien: 1905, "saudi arabia": 2150, "saudi-arabien": 2150, iran: 1648, mongolia: 1564, mongolei: 1564, peru: 1285,
  chile: 756, "south africa": 1221, "südafrika": 1221, namibia: 825, morocco: 447, marokko: 447, turkey: 784, "türkei": 784, "türkiye": 784,
  egypt: 1010, "ägypten": 1010, kenya: 580, kenia: 580, tanzania: 945, tansania: 945, madagascar: 587, madagaskar: 587, colombia: 1142, kolumbien: 1142,
  bolivia: 1099, bolivien: 1099, pakistan: 882, nepal: 147, thailand: 513, vietnam: 331, japan: 378, "new zealand": 268, neuseeland: 268,
  philippines: 300, philippinen: 300, ukraine: 604, france: 644, frankreich: 644, spain: 506, spanien: 506, sweden: 450, schweden: 450,
  norway: 385, norwegen: 385, germany: 357, deutschland: 357, finland: 338, finnland: 338, poland: 313, polen: 313, italy: 301, italien: 301,
  "united kingdom": 244, uk: 244, "großbritannien": 244, scotland: 78, schottland: 78, england: 130, wales: 21, ireland: 70, irland: 70,
  romania: 238, "rumänien": 238, greece: 132, griechenland: 132, portugal: 92, iceland: 103, island: 103, austria: 84, "österreich": 84,
  switzerland: 41, schweiz: 41, slovenia: 20, slowenien: 20, croatia: 57, kroatien: 57, montenegro: 14, bulgaria: 111, bulgarien: 111,
  serbia: 88, serbien: 88, "bosnia and herzegovina": 51, bosnien: 51, albania: 29, albanien: 29, georgia: 70, georgien: 70,
};

/** Wie viele Punkte ein Land höchstens zeigt (1 für Schweiz/Österreich, 2 für DE/IT/NO, ~10 für USA). */
function countryCap(country: string): number {
  const area = COUNTRY_AREA[country.trim().toLowerCase()];
  if (!area) return 1;
  return Math.max(1, Math.min(12, Math.round(Math.sqrt(area * 1000) / 300)));
}

/** Grobe Kontinent-Zuordnung über die Koordinaten (reicht für die Statistik). */
function continentOf(lat: number, lng: number): string {
  if (lng < -30) return lat > 12 ? "north-america" : "south-america";
  if (lng < 60) {
    if (lat > 35) return lng < 40 ? "europe" : "asia";
    return lng < 35 || lat < 30 ? "africa" : "asia";
  }
  return lat < -10 && lng > 110 ? "oceania" : "asia";
}

/**
 * Wählt pro Land höchstens countryCap() Routen aus — möglichst weit voneinander entfernt,
 * Routen mit Foto zuerst. "order" (pro Besuch gemischt) sorgt dafür, dass bei jedem
 * Besuch andere Routen eines Landes auftauchen können.
 */
function thinMarkers(markers: MapRoute[], order: string[]): MapRoute[] {
  const rank = new Map(order.map((id, i) => [id, i]));
  const byCountry = new Map<string, MapRoute[]>();
  for (const m of markers) {
    const key = (m.country || `__${m.id}`).trim().toLowerCase();
    const list = byCountry.get(key) ?? [];
    list.push(m);
    byCountry.set(key, list);
  }
  const dist = (a: MapRoute, b: MapRoute) => {
    const dx = (a.longitude - b.longitude) * Math.cos(((a.latitude + b.latitude) / 2) * (Math.PI / 180));
    return Math.hypot(dx, a.latitude - b.latitude);
  };
  const out: MapRoute[] = [];
  byCountry.forEach((list) => {
    const cap = countryCap(list[0].country || "");
    const pool = [...list].sort((a, b) => Number(!a.image_url) - Number(!b.image_url) || (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
    const picked: MapRoute[] = [pool.shift()!];
    while (picked.length < cap && pool.length) {
      // die Route, die am weitesten von allen bereits gewählten entfernt liegt
      let best = 0, bestD = -1;
      pool.forEach((m, i) => {
        const d = Math.min(...picked.map((p) => dist(p, m))) + (m.image_url ? 0.5 : 0);
        if (d > bestD) { bestD = d; best = i; }
      });
      picked.push(pool.splice(best, 1)[0]);
    }
    out.push(...picked);
  });
  return out;
}

type MapRoute = {
  id: string;
  title: string;
  country: string;
  latitude: number;
  longitude: number;
  image_url?: string | null;
  description?: string;
  distance_km?: number | null;
};

const FALLBACK_MARKERS: MapRoute[] = [
  { id: "1", title: "Amalfi Coast Road", country: "Italy", latitude: 40.6, longitude: 14.6, image_url: "/amalfi_coast_road.jpg" },
  { id: "2", title: "Pacific Coast Highway", country: "USA", latitude: 36.5, longitude: -121.9, image_url: "/pacific_route_highway.jpg" },
  { id: "3", title: "Trollstigen", country: "Norway", latitude: 62.4, longitude: 7.7 },
  { id: "4", title: "Garden Route", country: "South Africa", latitude: -33.9, longitude: 22.4 },
  { id: "5", title: "North Coast 500", country: "Scotland", latitude: 57.8, longitude: -4.2 },
  { id: "6", title: "Grossglockner", country: "Austria", latitude: 47.1, longitude: 12.8 },
  { id: "7", title: "Ring Road", country: "Iceland", latitude: 64.9, longitude: -18.5 },
  { id: "8", title: "Transfagarasan", country: "Romania", latitude: 45.6, longitude: 24.6 },
  { id: "9", title: "Col de la Bonette", country: "France", latitude: 44.3, longitude: 6.8 },
  { id: "10", title: "Milford Road", country: "New Zealand", latitude: -44.7, longitude: 168.0 },
  { id: "11", title: "Icefields Parkway", country: "Canada", latitude: 51.5, longitude: -116.2 },
  { id: "12", title: "Great Ocean Road", country: "Australia", latitude: -38.6, longitude: 143.1 },
  { id: "13", title: "Irohazaka Road", country: "Japan", latitude: 36.7, longitude: 139.5 },
  { id: "14", title: "Ruta 40", country: "Argentina", latitude: -41.1, longitude: -71.3 },
];

const TEXT = {
  en: { kicker: "Route of the moment", view: "View route", routes: "scenic routes", countries: "countries", continents: "continents", prev: "Previous route", next: "Next route", play: "Play tour", pause: "Pause tour" },
  de: { kicker: "Route des Moments", view: "Route ansehen", routes: "Panoramarouten", countries: "Länder", continents: "Kontinente", prev: "Vorherige Route", next: "Nächste Route", play: "Tour abspielen", pause: "Tour anhalten" },
  ru: { kicker: "Маршрут момента", view: "Смотреть маршрут", routes: "живописных маршрутов", countries: "стран", continents: "континентов", prev: "Предыдущий маршрут", next: "Следующий маршрут", play: "Запустить тур", pause: "Остановить тур" },
} as const;
type Lang = keyof typeof TEXT;

function num(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

function localized(row: Record<string, unknown>, field: string, lang: string): string {
  const value = row[`${field}_${lang}`] || row[`${field}_en`] || row[`${field}_de`] || row[field];
  return typeof value === "string" ? value.trim() : "";
}

/** Eine Zeile aus der Datenbank -> Kartenpunkt. Bevorzugt latitude/longitude, sonst Start/Ende der Route. */
function toMapRoute(row: Record<string, unknown>, lang: string): MapRoute | null {
  let lat = num(row.latitude);
  let lng = num(row.longitude);
  if (lat === null || lng === null) {
    const sLat = num(row.start_lat), sLng = num(row.start_lng), eLat = num(row.end_lat), eLng = num(row.end_lng);
    if (sLat !== null && sLng !== null) {
      lat = eLat !== null ? (sLat + eLat) / 2 : sLat;
      lng = eLng !== null ? (sLng + eLng) / 2 : sLng;
    }
  }
  if (lat === null || lng === null) return null;
  return {
    id: String(row.id),
    title: localized(row, "title", lang) || String(row.title ?? ""),
    country: typeof row.country === "string" ? row.country : "",
    latitude: lat,
    longitude: lng,
    image_url: typeof row.image_url === "string" ? row.image_url : null,
    description: localized(row, "description", lang),
    distance_km: num(row.distance_km),
  };
}

/** Gleichmäßig gemischte Reihenfolge, damit die Tour quer über die Welt springt. */
function shuffled<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function WorldMap() {
  const { theme } = useTheme();
  const { lang } = useLanguage();
  const tx = TEXT[(lang in TEXT ? lang : "en") as Lang];
  const [mounted, setMounted] = useState(false);
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);

  // ------------------------------------------------------------- Daten
  useEffect(() => {
    setMounted(true);
    let cancelled = false;
    (async () => {
      // "*" statt fester Spaltenliste: je nach Datenstand gibt es latitude/longitude
      // oder start_lat/start_lng — eine fehlende Spalte würde die Abfrage sonst scheitern lassen.
      // Seitenweise laden: Supabase liefert pro Abfrage höchstens 1000 Zeilen —
      // so stimmen die Zahlen auch bei 1000+ Routen.
      const PAGE = 1000;
      const all: Record<string, unknown>[] = [];
      for (let from = 0; ; from += PAGE) {
        const data = await safeQuery<Record<string, unknown>[]>(
          supabasePublic.from("routes").select("*").order("id", { ascending: true }).range(from, from + PAGE - 1),
          "worldMapRoutes",
        );
        if (!data) break;
        all.push(...data);
        if (data.length < PAGE || cancelled) break;
      }
      if (!cancelled) setRows(all);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const markers = useMemo(() => {
    const fromDb = (rows ?? []).map((row) => toMapRoute(row, lang)).filter((r): r is MapRoute => r !== null);
    return fromDb.length > 0 ? fromDb : FALLBACK_MARKERS;
  }, [rows, lang]);

  // Reihenfolge der Tour einmal pro Besuch mischen (nicht bei jedem Sprachwechsel)
  const [order, setOrder] = useState<string[]>([]);
  useEffect(() => {
    if (rows === null) return;
    setOrder(shuffled(markers.map((m) => m.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);
  // Nur Routen, deren Punkt im sichtbaren Kartenausschnitt liegt (die Karte ist an den
  // Rändern beschnitten — z. B. Neuseeland liegt außerhalb). Wird nach dem Zeichnen gemessen.
  const [visibleIds, setVisibleIds] = useState<Set<string> | null>(null);
  const [forceId, setForceId] = useState<string | null>(null);
  // Ausgedünnte Punkte, die tatsächlich auf der Karte stehen (Statistik zählt weiter alle Routen)
  const dots = useMemo(() => (order.length ? thinMarkers(markers, order) : []), [markers, order]);
  const tour = useMemo(() => {
    const byId = new Map(dots.map((m) => [m.id, m]));
    let list = order.map((id) => byId.get(id)).filter((m): m is MapRoute => Boolean(m));
    if (!list.length) list = dots;
    if (visibleIds && visibleIds.size > 0) list = list.filter((m) => visibleIds.has(m.id) || m.id === forceId);
    return list;
  }, [order, dots, visibleIds, forceId]);

  // ------------------------------------------------------------- Zahlen über der Karte
  // Automatisch aus der Datenbank: ALLE Routen zählen (auch ohne Koordinaten bzw. ohne
  // eigenen Punkt auf der Karte). Die Punkte auf der Karte bleiben ausgedünnt.
  const hasDbRows = (rows?.length ?? 0) > 0;
  const routeCount = hasDbRows ? rows!.length : markers.length;
  const countryCount = useMemo(() => {
    const list = hasDbRows ? rows!.map((r) => (typeof r.country === "string" ? r.country : "")) : markers.map((m) => m.country);
    return new Set(list.map((c) => c.trim().toLowerCase()).filter(Boolean)).size;
  }, [rows, markers, hasDbRows]);
  const continentCount = useMemo(() => new Set(markers.map((m) => continentOf(m.latitude, m.longitude))).size, [markers]);

  // ------------------------------------------------------------- Tour
  const [index, setIndex] = useState(0);
  const active = tour[index % Math.max(1, tour.length)];
  const [userPicked, setUserPicked] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [inView, setInView] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const playing = !userPicked && !hovering && inView && !reducedMotion && tour.length > 1;

  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % tour.length), TOUR_MS);
    return () => clearTimeout(timer);
  }, [playing, index, tour.length]);

  const pendingPick = useRef<string | null>(null);
  useEffect(() => {
    if (!pendingPick.current) return;
    const i = tour.findIndex((m) => m.id === pendingPick.current);
    pendingPick.current = null;
    if (i >= 0) setIndex(i);
  }, [tour]);

  const step = (delta: number) => {
    setUserPicked(true);
    setIndex((i) => (i + delta + tour.length) % tour.length);
  };

  /** Klick auf einen Punkt: diese Route zeigen. Liegt die aktive Route schon in der Nähe, zur nächsten nahen blättern. */
  const pick = (route: MapRoute) => {
    setUserPicked(true);
    const near = tour.filter((m) => Math.abs(m.latitude - route.latitude) < NEAR_DEG && Math.abs(m.longitude - route.longitude) < NEAR_DEG);
    let target = route;
    if (active && near.length > 1 && near.some((m) => m.id === active.id)) {
      const pos = near.findIndex((m) => m.id === active.id);
      target = near[(pos + 1) % near.length];
    }
    const i = tour.findIndex((m) => m.id === target.id);
    if (i >= 0) {
      setIndex(i);
      return;
    }
    // Sicherheitsnetz: Punkt ist anklickbar, aber (noch) nicht in der Tour -> trotzdem anzeigen
    pendingPick.current = target.id;
    setForceId(target.id);
  };

  // ------------------------------------------------------------- Sichtbare Punkte messen
  const measureVisible = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const w = wrap.getBoundingClientRect();
    const inset = 4; // Mittelpunkt muss in der Box liegen — alles, was man sieht und anklicken kann, gehört zur Tour
    const ids = new Set<string>();
    wrap.querySelectorAll<SVGGElement>("[data-rid]").forEach((el) => {
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      if (x > w.left + inset && x < w.right - inset && y > w.top + inset && y < w.bottom - inset) ids.add(el.dataset.rid || "");
    });
    setVisibleIds((prev) => (prev && prev.size === ids.size && [...ids].every((id) => prev.has(id)) ? prev : ids));
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(measureVisible);
    window.addEventListener("resize", measureVisible);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measureVisible);
    };
  }, [measureVisible, dots, mounted]);

  /** Auf welcher Seite die Karte stehen soll, damit sie den Punkt nicht verdeckt. */
  const sideFor = useCallback((id: string): "left" | "right" => {
    const wrap = wrapRef.current;
    const el = wrap?.querySelector<SVGGElement>(`[data-rid="${CSS.escape(id)}"]`);
    if (!wrap || !el) return "left";
    const w = wrap.getBoundingClientRect(), r = el.getBoundingClientRect();
    return r.left + r.width / 2 - w.left < w.width * 0.5 ? "right" : "left";
  }, []);

  // ------------------------------------------------------------- Sanfter Wechsel
  // "shown" ist die Route, die gerade in der Karte steht. Beim Wechsel blendet erst der
  // Inhalt aus (bzw. die ganze Karte, wenn sie die Seite wechselt), dann kommt die neue
  // Route, das Foto blendet weich über das alte.
  const [shown, setShown] = useState<MapRoute | null>(null);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const [cardHidden, setCardHidden] = useState(false);
  const [prevImg, setPrevImg] = useState<string | null>(null);
  const [cardSide, setCardSide] = useState<"left" | "right">("left");

  useEffect(() => {
    if (!active) return;
    if (!shown) {
      setCardSide(sideFor(active.id));
      setShown(active);
      return;
    }
    if (active.id === shown.id) return;
    const nextSide = sideFor(active.id);
    const sideChange = nextSide !== cardSide;
    setPhase("out");
    setCardHidden(sideChange);
    const timer = setTimeout(() => {
      setPrevImg(shown.image_url || null);
      setShown(active);
      setCardSide(nextSide);
      setPhase("in");
      setCardHidden(false);
    }, sideChange ? 380 : 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  // ------------------------------------------------------------- Linie von der Karte zum Punkt
  const activeMarkerRef = useRef<SVGGElement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [line, setLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  const measure = useCallback(() => {
    const wrap = wrapRef.current, card = cardRef.current;
    // Mittelpunkt des eigentlichen Punkts messen (nicht der pulsierende Ring drumherum)
    const dot = activeMarkerRef.current?.querySelector<SVGCircleElement>("circle:last-child") ?? activeMarkerRef.current;
    if (!wrap || !dot || !card || window.innerWidth <= 760) return setLine(null);
    const w = wrap.getBoundingClientRect();
    if (!w.width || !w.height) return;
    // Bildschirm-Pixel -> Koordinaten innerhalb der Box. Rechnet Rahmen (clientLeft/Top) und
    // eine eventuelle Skalierung durch Eltern-Animationen (z. B. Einblend-Effekte) heraus,
    // damit die Linie exakt in der Mitte des Punkts endet.
    const sx = wrap.offsetWidth / w.width, sy = wrap.offsetHeight / w.height;
    const lx = (px: number) => (px - w.left) * sx - wrap.clientLeft;
    const ly = (py: number) => (py - w.top) * sy - wrap.clientTop;
    const d = dot.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    const x1 = lx(d.left + d.width / 2);
    const y1 = ly(d.top + d.height / 2);
    const x2 = cardSide === "left" ? lx(c.right) : lx(c.left);
    const y2 = Math.min(Math.max(y1, ly(c.top) + 40), ly(c.bottom) - 40);
    setLine((prev) =>
      prev && Math.abs(prev.x1 - x1) < 0.25 && Math.abs(prev.y1 - y1) < 0.25 && Math.abs(prev.x2 - x2) < 0.25 && Math.abs(prev.y2 - y2) < 0.25
        ? prev
        : { x1, y1, x2, y2 },
    );
  }, [cardSide]);

  useLayoutEffect(() => {
    measure();
    const frame = requestAnimationFrame(measure);
    // nach Einblend-/Layout-Animationen der Seite noch einmal nachmessen
    const t1 = setTimeout(measure, 450), t2 = setTimeout(measure, 1200);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [measure, shown?.id, mounted]);

  useEffect(() => {
    const wrap = wrapRef.current;
    window.addEventListener("resize", measure);
    // jede Animation/Transition auf der Seite (z. B. Scroll-Reveal der Sektion) kann die Box verschieben
    document.addEventListener("transitionend", measure, true);
    document.addEventListener("animationend", measure, true);
    const ro = wrap && typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => measure()) : null;
    if (wrap && ro) ro.observe(wrap);
    return () => {
      window.removeEventListener("resize", measure);
      document.removeEventListener("transitionend", measure, true);
      document.removeEventListener("animationend", measure, true);
      ro?.disconnect();
    };
  }, [measure]);

  // ------------------------------------------------------------- Mobile: Zoom wie bisher
  const [isMobile, setIsMobile] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([13, 30]);
  const [mapResetKey, setMapResetKey] = useState(0);
  const resetAnimRef = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 680px)");
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => {
      mq.removeEventListener("change", onChange);
      if (resetAnimRef.current) cancelAnimationFrame(resetAnimRef.current);
    };
  }, []);

  function animateResetToOverview(fromZoom: number, fromCenter: [number, number]) {
    if (resetAnimRef.current) cancelAnimationFrame(resetAnimRef.current);
    const target: [number, number] = [13, 30];
    const start = performance.now();
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / 450);
      const e = easeInOutCubic(t);
      setZoom(fromZoom + (1 - fromZoom) * e);
      setCenter([fromCenter[0] + (target[0] - fromCenter[0]) * e, fromCenter[1] + (target[1] - fromCenter[1]) * e]);
      if (t < 1) resetAnimRef.current = requestAnimationFrame(frame);
      else {
        setZoom(1);
        setCenter(target);
        setMapResetKey((k) => k + 1);
        resetAnimRef.current = null;
      }
    };
    resetAnimRef.current = requestAnimationFrame(frame);
  }

  function handleMoveEnd(position: { coordinates: [number, number]; zoom: number }) {
    if (position.zoom <= 1) {
      animateResetToOverview(position.zoom, position.coordinates);
      return;
    }
    setCenter(position.coordinates);
    setZoom(position.zoom);
  }

  // ------------------------------------------------------------- Farben
  const isLight = mounted && theme === "light";
  const c = isLight
    ? { bg: "#F4F0E8", border: "rgba(43,38,32,0.14)", geo: "#E9E2D2", geoStroke: "#D8CFB8", geoHover: "#E0D7C2" }
    : { bg: "#0c0b09", border: "rgba(255,255,255,0.2)", geo: "#1a1710", geoStroke: "#2a2518", geoHover: "#221f14" };
  const k = isMobile ? zoom : 1;

  const geographies = (
    <Geographies geography={GEO_URL}>
      {({ geographies }) =>
        geographies.map((geo) => (
          <Geography
            key={geo.rsmKey}
            geography={geo}
            style={{
              default: { fill: c.geo, stroke: c.geoStroke, strokeWidth: 0.5 / k, outline: "none" },
              hover: { fill: c.geoHover, stroke: c.geoStroke, strokeWidth: 0.5 / k, outline: "none" },
              pressed: { fill: c.geo, outline: "none" },
            }}
          />
        ))
      }
    </Geographies>
  );

  const markerEls = dots.map((route) => {
    if (shown?.id === route.id) return null; // gezeigte Route wird zuletzt gezeichnet (liegt obenauf)
    return (
      <Marker key={route.id} coordinates={[route.longitude, route.latitude]} onClick={() => pick(route)}>
        <g className="wm-dot" data-rid={route.id}>
          <circle r={11 / k} fill="transparent" />
          <circle r={5 / k} fill="rgba(201,168,106,0.22)" />
          <circle r={3.4 / k} fill="#C9A86A" stroke={isLight ? "#F4F0E8" : "#0c0b09"} strokeWidth={1 / k} />
        </g>
      </Marker>
    );
  });

  const activeMarker = shown ? (
    <Marker key={`active-${shown.id}`} coordinates={[shown.longitude, shown.latitude]} onClick={() => pick(shown)}>
      <g ref={activeMarkerRef} className="wm-dot wm-dot-active" data-rid={shown.id}>
        <circle className="wm-pulse" r={16 / k} fill="rgba(201,168,106,0.18)" />
        <circle r={9 / k} fill="rgba(201,168,106,0.32)" />
        <circle r={5.2 / k} fill="#C9A86A" stroke="#FFFFFF" strokeWidth={1.8 / k} />
      </g>
    </Marker>
  ) : null;

  return (
    <>
    <div className={`wm-figures ${isLight ? "wm-light" : "wm-dark"}`}>
      <div><b>{routeCount}</b><span>{tx.routes}</span></div>
      <div><b>{countryCount}</b><span>{tx.countries}</span></div>
      <div><b>{continentCount}</b><span>{tx.continents}</span></div>
    </div>
    <div
      ref={wrapRef}
      className={`wm ${isLight ? "wm-light" : "wm-dark"}`}
      style={{ background: c.bg, borderColor: c.border }}
    >
      <style>{`
        .wm { position:relative; overflow:hidden; line-height:0; margin:0 -7%; border:1px solid; border-radius:15px; transition:background .35s, border-color .35s; }
        .wm-figures { display:flex; justify-content:center; gap:clamp(28px, 5vw, 56px); margin:-6px 0 30px; text-align:center; }
        .wm-figures > div { display:flex; flex-direction:column; align-items:center; gap:4px; min-width:70px; }
        .wm-figures b { font-family:var(--serif, 'Cormorant Garamond', serif); font-weight:400; font-size:38px; line-height:1; }
        .wm-figures span { font-size:11.5px; letter-spacing:.02em; }
        .wm-figures.wm-light b { color:#2B2620; } .wm-figures.wm-light span { color:rgba(43,38,32,.55); }
        .wm-figures.wm-dark b { color:#EDE5D4; } .wm-figures.wm-dark span { color:rgba(237,229,212,.55); }
        @media (max-width:680px) { .wm-figures { margin:-4px 0 20px; gap:22px; } .wm-figures b { font-size:30px; } .wm-figures span { font-size:10.5px; } }
        .wm-map { width:100%; height:580px; display:block; margin-top:-4%; }
        .wm .wm-dot { cursor:pointer; }
        .wm .wm-dot:hover circle:last-child { fill:#E0C48C; }
        .wm-pulse { transform-box:fill-box; transform-origin:center; animation:wmPulse 2.4s ease-out infinite; }
        @keyframes wmPulse { 0% { transform:scale(.6); opacity:.9; } 100% { transform:scale(1.6); opacity:0; } }


        .wm-line { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }
        .wm-line path { fill:none; stroke:#B8914A; stroke-width:1.5; stroke-dasharray:4 5; animation:wmLineIn .7s ease .1s both; transition:opacity .25s ease; }
        .wm-line.out path { opacity:0; animation:none; }
        @keyframes wmLineIn { from { opacity:0; } to { opacity:1; } }

        .wm-card { position:absolute; bottom:28px; width:min(330px, 34%); border-radius:22px; overflow:hidden; line-height:1.4; box-shadow:0 28px 60px rgba(0,0,0,.32); transition:opacity .38s ease, transform .38s cubic-bezier(.22,1,.36,1); }
        .wm-card.is-hidden { opacity:0; transform:translateY(10px) scale(.985); }
        .wm-card.left { left:28px; } .wm-card.right { right:28px; }
        .wm-light .wm-card { background:#1F1A13; color:#F4F0E8; }
        .wm-dark .wm-card { background:rgba(26,23,17,.96); color:#EDE5D4; border:1px solid rgba(201,168,106,.28); }
        .wm-card-img { display:block; height:180px; background:#2a2518; position:relative; overflow:hidden; }
        .wm-card-img img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; }
        .wm-card-img img.wm-img-new { animation:wmImgIn .9s cubic-bezier(.22,1,.36,1) both; }
        @keyframes wmImgIn { from { opacity:0; transform:scale(1.05); } to { opacity:1; transform:scale(1); } }
        .wm-card-body { padding:16px 20px 18px; transition:opacity .3s ease, transform .3s ease; }
        .wm-card.out .wm-card-body { opacity:0; transform:translateY(5px); }
        .wm-kicker { font-size:10.5px; font-weight:700; letter-spacing:.2em; text-transform:uppercase; color:#D9BE86; }
        .wm-title { margin-top:6px; font-family:var(--serif, 'Cormorant Garamond', serif); font-weight:400; font-size:30px; line-height:1.02; }
        .wm-desc { margin-top:8px; font-size:13px; line-height:1.55; color:rgba(244,240,232,.72); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .wm-foot { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:14px; }
        .wm-nav { display:flex; align-items:center; gap:6px; }
        .wm-nav button { width:30px; height:30px; display:grid; place-items:center; border-radius:50%; border:1px solid rgba(244,240,232,.22); background:transparent; color:#F4F0E8; cursor:pointer; font-size:14px; line-height:1; transition:border-color .2s; }
        .wm-nav button:hover { border-color:#D9BE86; }
        .wm a.wm-view { font-size:13px; font-weight:600; color:#D9BE86; text-decoration:none; white-space:nowrap; }
        .wm a.wm-view:hover { text-decoration:underline; }

        @media (max-width:760px) {
          .wm-card { position:relative; left:auto !important; right:auto !important; bottom:auto; width:auto; margin:0 calc(6.2% + 10px) 14px; border-radius:18px; }
          .wm-card-img { height:150px; }
          .wm-line { display:none; }
        }
        @media (max-width:680px) {
          .wm-map { height:300px; margin-top:0; touch-action:none; }
            }
        @media (max-width:420px) { .wm-map { height:260px; } }
        @media (prefers-reduced-motion: reduce) { .wm-pulse, .wm-card-img img.wm-img-new { animation:none; } }
      `}</style>

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 170, center: [13, 30] }}
        viewBox="-130 0 980 600"
        preserveAspectRatio="xMidYMid slice"
        className="wm-map"
      >
        {isMobile ? (
          <ZoomableGroup
            key={mapResetKey}
            zoom={zoom}
            center={center}
            onMoveEnd={handleMoveEnd}
            minZoom={1}
            maxZoom={7}
            translateExtent={[[-150, -150], [1020, 770]]}
          >
            {geographies}
            {markerEls}
            {activeMarker}
          </ZoomableGroup>
        ) : (
          <>
            {geographies}
            {markerEls}
            {activeMarker}
          </>
        )}
      </ComposableMap>


      {line && (
        <svg className={`wm-line ${phase === "out" ? "out" : ""}`} aria-hidden="true">
          <path key={shown?.id} d={`M${line.x1} ${line.y1} C ${(line.x1 + line.x2) / 2} ${line.y1}, ${(line.x1 + line.x2) / 2} ${line.y2}, ${line.x2} ${line.y2}`} />
        </svg>
      )}

      {shown && (
        <div
          ref={cardRef}
          className={`wm-card ${cardSide} ${phase === "out" ? "out" : ""} ${cardHidden ? "is-hidden" : ""}`}
          // Nur über der Karte pausieren (zum Lesen/Klicken) — über der Weltkarte läuft die Tour weiter
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        >
          <Link href={`/routedetail/${shown.id}`} prefetch={false} className="wm-card-img" aria-label={shown.title}>
            {prevImg && <img src={prevImg} alt="" aria-hidden="true" />}
            <img
              key={shown.id}
              className="wm-img-new"
              src={shown.image_url || "/amalfi_coast_road.jpg"}
              alt=""
              onLoad={measure}
              onError={(e) => {
                e.currentTarget.src = "/amalfi_coast_road.jpg";
              }}
            />
          </Link>
          <div className="wm-card-body">
            <div className="wm-kicker">{tx.kicker}{shown.country ? ` · ${shown.country}` : ""}</div>
            <div className="wm-title">{shown.title}</div>
            {shown.description && <p className="wm-desc">{shown.description}</p>}
            <div className="wm-foot">
              <div className="wm-nav">
                <button type="button" onClick={() => step(-1)} aria-label={tx.prev}>‹</button>
                <button type="button" onClick={() => step(1)} aria-label={tx.next}>›</button>
              </div>
              <Link href={`/routedetail/${shown.id}`} prefetch={false} className="wm-view">
                {tx.view} →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}