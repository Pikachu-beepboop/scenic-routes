"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { supabase, supabasePublic, withTimeout, safeQuery } from "../../lib/supabase";
import { useAuth, signOutSafe } from "../../lib/useAuth";
import { useTheme } from "next-themes";
import { ThemeSwitch } from "../components/ThemeSwitch";
import { useLanguage } from "../LanguageContext";
// Die Routenkarte ist jetzt eine eigene Komponente — /plan nutzt exakt dieselbe.
import RouteCard, { ROUTE_CARD_STYLES } from "../components/RouteCard";
import {
  SlidersHorizontal, ChevronDown, X,
  User as UserIcon, Map as MapIcon, Compass, LogOut, Globe,
  Menu, ChevronRight, Mail, BookOpen, Search, ArrowUp,
  Check, Clock, Heart, Mountain, Route as RouteIcon, Sun, LayoutList, LayoutGrid, MapPin,
} from "lucide-react";

type Route = {
  id: string;
  title: string;
  title_en?: string;
  title_de?: string;
  country: string;
  distance_km?: number;
  image_url?: string;
  duration?: string;
  type?: string;
  description?: string;
  description_en?: string;
  description_de?: string;
  rating?: number;
  [key: string]: unknown;
};

// Feste, logische Reihenfolge (kurz → lang) statt alphabetischer Sortierung
const DURATION_ORDER = ["Half day", "Full day", "Weekend trip", "Multi-day journey"];
function sortByDurationLength(a: string, b: string) {
  const idxA = DURATION_ORDER.findIndex((d) => a.startsWith(d));
  const idxB = DURATION_ORDER.findIndex((d) => b.startsWith(d));
  return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
}

/** Text in der aktuellen Sprache (Feld_<lang>, sonst _en, _de, sonst Grundfeld). */
function localized(route: Route, field: string, lang: string): string {
  const value = route[`${field}_${lang}`] || route[`${field}_en`] || route[`${field}_de`] || route[field];
  return typeof value === "string" ? value.trim() : "";
}

/** Erster brauchbarer Text aus mehreren möglichen Spalten ("NULL" zählt als leer). */
function firstText(route: Route, keys: string[]): string {
  for (const key of keys) {
    const value = route[key];
    if (typeof value === "string" && value.trim() && value.trim().toUpperCase() !== "NULL") return value.trim();
    if (typeof value === "number" && !Number.isNaN(value)) return String(value);
  }
  return "";
}

const MONTH_PATTERNS = [/^jan/, /^feb/, /^m(ar|är)/, /^apr/, /^ma[iy]/, /^jun/, /^jul/, /^aug/, /^sep/, /^o[ck]t/, /^nov/, /^de[cz]/];

/**
 * Liest aus einem Saison-Text ("Jun – Oct", "Nov–Apr", "All year", "Mai bis Okt")
 * die Monate, in denen die Route gut befahrbar ist. null = nicht lesbar —
 * solche Routen werden vom Monatsfilter nicht ausgeschlossen.
 */
function seasonMonths(text: string): boolean[] | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (/all year|year[- ]round|ganzjährig|ganzes jahr|круглый год|весь год/.test(lower)) return new Array(12).fill(true);
  const found: number[] = [];
  for (const word of lower.split(/[^a-zäöü]+/)) {
    if (word.length < 3) continue;
    const index = MONTH_PATTERNS.findIndex((pattern) => pattern.test(word));
    if (index >= 0) found.push(index);
  }
  if (found.length === 0) return null;
  const months = new Array(12).fill(false);
  if (found.length === 1) {
    months[found[0]] = true;
    return months;
  }
  let month = found[0];
  for (let i = 0; i < 12; i++) {
    months[month] = true;
    if (month === found[1]) break;
    month = (month + 1) % 12;
  }
  return months;
}

/** Saison-Spalte der Route (die Detailseite nutzt "season"). */
function routeSeason(route: Route): string {
  return firstText(route, ["season", "best_season"]);
}

/**
 * Fahrzeit einer Route in Minuten. Gibt es die Spalte drive_minutes (später
 * per Google berechnet), wird sie genommen — sonst geschätzt aus der Länge und
 * einem Durchschnittstempo je Straßentyp (Passstraßen sind langsamer).
 */
function driveMinutes(route: Route): number | null {
  const exact = Number(route.drive_minutes);
  if (Number.isFinite(exact) && exact > 0) return Math.round(exact);
  const km = typeof route.distance_km === "number" ? route.distance_km : Number(route.distance_km);
  if (!Number.isFinite(km) || km <= 0) return null;
  const kind = `${route.type ?? ""} ${route.title ?? ""}`.toLowerCase();
  const speed = /pass|mountain|alpine|alpen|high|hoch|col |colle|passo|joch|serpentin/.test(kind) ? 35
    : /coast|küste|kust|corniche|sea/.test(kind) ? 45
    : /forest|wald|valley|tal|panorama/.test(kind) ? 50
    : 45;
  return Math.max(10, Math.round(((km / speed) * 60) / 5) * 5);
}

/** Schrittweite und Obergrenze des Fahrzeit-Reglers (Minuten). */
const TIME_STEP = 30;
const TIME_CAP = 480; // ab 8 Std. zählt alles zur letzten Stufe "8 Std.+"

type SortKey = "popular" | "name" | "short" | "long";

/** Neue Texte der Explore-Seite (noch nicht in lib/translations). */
const XP_TEXT = {
  en: {
    eyebrow: "Explore",
    title1: "Roads worth",
    title2: "the detour",
    sub: "Hand-picked drives across the Alps and beyond, chosen for the view from behind the wheel.",
    searchPlaceholder: "Search a road, pass or region",
    searchLabel: "Search routes",
    where: "Where",
    anyCountry: "Any country",
    countriesN: "{n} countries",
    howLong: "How long",
    driveTimeTitle: "Driving time",
    driveTimeHint: "Estimated time behind the wheel, without stops.",
    timeAny: "Any length",
    timeUnder: "Under {b}",
    timeOver: "{a}+",
    timeRange: "{a} – {b}",
    est: "≈ {t}",
    qShort: "< 1 h",
    qMorning: "1–2 h",
    qHalf: "2–4 h",
    qLong: "4 h +",
    unitH: "h",
    unitMin: "min",
    anyLength: "Any length",
    find: "Find routes",
    hint: "Type a name to jump straight to a route, or narrow it down by country and length.",
    statRoutes: "routes",
    statCountries: "countries",
    statOpen: "open this month",
    nowShowing: "Now showing",
    sugRoutes: "Routes",
    sugRegions: "Regions",
    sugRoutesCount: "{n} routes",
    sugAll: "See all results for “{q}”",
    sugNone: "No route or region matches “{q}”.",
    findCountry: "Find a country",
    clear: "Clear",
    showN: "Show {n} routes",
    allRoutes: "All routes",
    allRoutesSub: "Narrow it down on the left, or search for a road by name above.",
    sortBy: "Sort by",
    sortPopular: "Most popular",
    sortName: "Name A–Z",
    sortShort: "Shortest first",
    sortLong: "Longest first",
    list: "List",
    grid: "Grid",
    filters: "Filters",
    country: "Country",
    moreN: "{n} more",
    showLess: "Show less",
    driveTime: "Drive time",
    anyTime: "Any",
    month: "Choose the month",
    anyMonth: "Any month",
    character: "Character",
    resetAll: "Reset all",
    nRoutes: "{n} routes",
    oneRoute: "1 route",
    query: "“{q}”",
    glance: "At a glance",
    length: "Length",
    drive: "Drive time",
    elevation: "Elevation gain",
    season: "Best season",
    viewRoute: "View route",
    save: "Save",
    unsave: "Remove from saved",
    showing: "Showing {a} of {b}",
    showMore: "Show more routes",
    loading: "Loading routes …",
    empty: "No routes match these filters.",
    emptySub: "Remove a filter or try a different name.",
    close: "Close",
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  },
  de: {
    eyebrow: "Entdecken",
    title1: "Straßen, die den",
    title2: "Umweg wert sind",
    sub: "Handverlesene Panoramastraßen in den Alpen und darüber hinaus, ausgewählt für den Blick hinter dem Steuer.",
    searchPlaceholder: "Straße, Pass oder Region suchen",
    searchLabel: "Routen suchen",
    where: "Wo",
    anyCountry: "Alle Länder",
    countriesN: "{n} Länder",
    howLong: "Wie lange",
    driveTimeTitle: "Fahrzeit",
    driveTimeHint: "Geschätzte Zeit hinter dem Steuer, ohne Pausen.",
    timeAny: "Beliebig",
    timeUnder: "Unter {b}",
    timeOver: "{a}+",
    timeRange: "{a} – {b}",
    est: "≈ {t}",
    qShort: "< 1 Std.",
    qMorning: "1–2 Std.",
    qHalf: "2–4 Std.",
    qLong: "4 Std. +",
    unitH: "Std.",
    unitMin: "Min.",
    anyLength: "Beliebig",
    find: "Routen finden",
    hint: "Tippe einen Namen, um direkt zur Route zu springen, oder grenze nach Land und Dauer ein.",
    statRoutes: "Routen",
    statCountries: "Länder",
    statOpen: "diesen Monat offen",
    nowShowing: "Im Bild",
    sugRoutes: "Routen",
    sugRegions: "Regionen",
    sugRoutesCount: "{n} Routen",
    sugAll: "Alle Ergebnisse für „{q}“",
    sugNone: "Keine Route oder Region passt zu „{q}“.",
    findCountry: "Land suchen",
    clear: "Zurücksetzen",
    showN: "{n} Routen anzeigen",
    allRoutes: "Alle Routen",
    allRoutesSub: "Links eingrenzen oder oben direkt nach einer Straße suchen.",
    sortBy: "Sortieren",
    sortPopular: "Beliebteste",
    sortName: "Name A–Z",
    sortShort: "Kürzeste zuerst",
    sortLong: "Längste zuerst",
    list: "Liste",
    grid: "Raster",
    filters: "Filter",
    country: "Land",
    moreN: "{n} weitere",
    showLess: "Weniger",
    driveTime: "Fahrzeit",
    anyTime: "Alle",
    month: "Monat wählen",
    anyMonth: "Alle Monate",
    character: "Charakter",
    resetAll: "Alles zurücksetzen",
    nRoutes: "{n} Routen",
    oneRoute: "1 Route",
    query: "„{q}“",
    glance: "Auf einen Blick",
    length: "Länge",
    drive: "Fahrzeit",
    elevation: "Höhenmeter",
    season: "Beste Saison",
    viewRoute: "Route ansehen",
    save: "Merken",
    unsave: "Nicht mehr merken",
    showing: "{a} von {b}",
    showMore: "Mehr Routen anzeigen",
    loading: "Routen werden geladen …",
    empty: "Keine Route passt zu diesen Filtern.",
    emptySub: "Entferne einen Filter oder versuche einen anderen Namen.",
    close: "Schließen",
    months: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
  },
  ru: {
    eyebrow: "Маршруты",
    title1: "Дороги, ради",
    title2: "которых стоит свернуть",
    sub: "Отобранные вручную панорамные дороги в Альпах и не только — ради вида из-за руля.",
    searchPlaceholder: "Дорога, перевал или регион",
    searchLabel: "Поиск маршрутов",
    where: "Где",
    anyCountry: "Любая страна",
    countriesN: "Стран: {n}",
    howLong: "Сколько",
    driveTimeTitle: "Время в пути",
    driveTimeHint: "Примерное время за рулём, без остановок.",
    timeAny: "Любое",
    timeUnder: "До {b}",
    timeOver: "{a}+",
    timeRange: "{a} – {b}",
    est: "≈ {t}",
    qShort: "< 1 ч",
    qMorning: "1–2 ч",
    qHalf: "2–4 ч",
    qLong: "4 ч +",
    unitH: "ч",
    unitMin: "мин",
    anyLength: "Любая длина",
    find: "Найти маршруты",
    hint: "Введите название, чтобы сразу перейти к маршруту, или сузьте поиск по стране и длительности.",
    statRoutes: "маршрутов",
    statCountries: "стран",
    statOpen: "открыто в этом месяце",
    nowShowing: "На фото",
    sugRoutes: "Маршруты",
    sugRegions: "Регионы",
    sugRoutesCount: "Маршрутов: {n}",
    sugAll: "Все результаты для «{q}»",
    sugNone: "Нет маршрута или региона для «{q}».",
    findCountry: "Найти страну",
    clear: "Сбросить",
    showN: "Показать ({n})",
    allRoutes: "Все маршруты",
    allRoutesSub: "Сузьте выбор слева или найдите дорогу по названию выше.",
    sortBy: "Сортировка",
    sortPopular: "Популярные",
    sortName: "По названию",
    sortShort: "Сначала короткие",
    sortLong: "Сначала длинные",
    list: "Список",
    grid: "Сетка",
    filters: "Фильтры",
    country: "Страна",
    moreN: "Ещё {n}",
    showLess: "Свернуть",
    driveTime: "Время в пути",
    anyTime: "Любое",
    month: "Выберите месяц",
    anyMonth: "Любой месяц",
    character: "Характер",
    resetAll: "Сбросить всё",
    nRoutes: "Маршрутов: {n}",
    oneRoute: "1 маршрут",
    query: "«{q}»",
    glance: "Коротко",
    length: "Длина",
    drive: "Время в пути",
    elevation: "Набор высоты",
    season: "Лучший сезон",
    viewRoute: "Смотреть маршрут",
    save: "Сохранить",
    unsave: "Убрать из сохранённых",
    showing: "{a} из {b}",
    showMore: "Показать ещё",
    loading: "Загрузка маршрутов …",
    empty: "Нет маршрутов с такими фильтрами.",
    emptySub: "Уберите фильтр или попробуйте другое название.",
    close: "Закрыть",
    months: ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"],
  },
} as const;

/** Wie viele Routen anfangs (und pro "Mehr anzeigen") in der Liste stehen. */
const PAGE_SIZE = 10;
/**
 * Im Raster 12 statt 10: 12 lässt sich durch 1, 2 und 3 Spalten teilen
 * (Handy, Tablet, Desktop) — die letzte Reihe ist so immer voll.
 */
const GRID_PAGE_SIZE = 12;
/** Wechselintervall der Titelbilder. */
const SLIDE_MS = 7000;


// Footer-Linkdaten: jeder Link trägt jetzt sein eigenes Ziel (href) und ein
// "protected"-Flag für Links, die einen eingeloggten User voraussetzen
// (Login-Redirect greift dafür weiter unten im Render).
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
      // Traveller Pass ist kein eigener Pfad, sondern ein Tab auf der Profile-Page
      // (subTab="pass"). Die Profile-Page liest ?tab=pass beim Laden aus.
      { key: "footer.link.travellerPass" as const, href: "/profile?tab=pass", protected: true },
      { key: "footer.link.about" as const, href: "/about", protected: false },
      // Our Team ist ein Anchor-Abschnitt auf der About-Page (id="team")
      { key: "footer.link.ourTeam" as const, href: "/about#team", protected: false },
    ],
  },
  {
    id: "support",
    headingKey: "footer.col.support" as const,
    links: [
      // FAQ, Contact und Send Feedback führen nicht eingeloggte User zur
      // öffentlichen /support-Seite. Eingeloggte User werden stattdessen
      // direkt zum "support"-Subtab im Profil weitergeleitet (loggedInHref),
      // da dort derselbe Inhalt bereits eingebettet vorhanden ist.
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


// NEU (Mobile): eigene Instagram/YouTube-Icons im lucide-Stroke-Stil,
// da diese Marken-Icons in der installierten lucide-react-Version nicht
// mehr enthalten sind (Import-Fehler "Element type is invalid").
function InstagramIcon({ size = 15, strokeWidth = 1.8 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function YoutubeIcon({ size = 15, strokeWidth = 1.8 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
    </svg>
  );
}


function ExplorePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const { t, lang, setLang } = useLanguage();
  const tx = XP_TEXT[(lang as keyof typeof XP_TEXT) in XP_TEXT ? (lang as keyof typeof XP_TEXT) : "en"];
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const currentQueryForLogin = searchParams.toString();
  const loginRedirect = `${pathname}${currentQueryForLogin ? `?${currentQueryForLogin}` : ""}`;
  const loginHref = `/login?redirect=${encodeURIComponent(loginRedirect)}`;

  // ---------------------------------------------------------------- Filter-State
  // Ältere Links (?destination=, ?country=) werden in die Länderliste übernommen.
  const [countriesSel, setCountriesSel] = useState<string[]>(() => {
    const fromList = searchParams.get("countries")?.split(",").filter(Boolean) || [];
    const single = searchParams.get("destination") || searchParams.get("country") || "";
    return single && !fromList.includes(single) ? [...fromList, single] : fromList;
  });
  // Fahrzeit-Bereich in Minuten [von, bis]; null = kein Filter. ?time=60-180
  const [timeSel, setTimeSel] = useState<[number, number] | null>(() => {
    const m = (searchParams.get("time") || "").match(/^(\d+)-(\d+)$/);
    return m ? [Number(m[1]), Number(m[2])] : null;
  });
  const [monthsSel, setMonthsSel] = useState<number[]>(() => {
    const raw = searchParams.get("months");
    return raw ? raw.split(",").map(Number).filter((m) => Number.isInteger(m) && m >= 0 && m < 12) : [];
  });
  const [typesSel, setTypesSel] = useState<string[]>(searchParams.get("types")?.split(",").filter(Boolean) || []);
  const [appliedQuery, setAppliedQuery] = useState(searchParams.get("q") || "");
  const [sort, setSort] = useState<SortKey>((searchParams.get("sort") as SortKey) || "popular");
  const [view, setView] = useState<"list" | "grid">(searchParams.get("view") === "grid" ? "grid" : "list");

  // Filter in der Adresse halten, damit Zurück/Teilen den Stand behält
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const params = new URLSearchParams();
    if (appliedQuery) params.set("q", appliedQuery);
    if (countriesSel.length > 0) params.set("countries", countriesSel.join(","));
    if (timeSel) params.set("time", `${timeSel[0]}-${timeSel[1]}`);
    if (monthsSel.length > 0) params.set("months", monthsSel.join(","));
    if (typesSel.length > 0) params.set("types", typesSel.join(","));
    if (sort !== "popular") params.set("sort", sort);
    if (view !== "list") params.set("view", view);
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedQuery, countriesSel, timeSel, monthsSel, typesSel, sort, view]);

  // ---------------------------------------------------------------- Such-UI-State
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [openPanel, setOpenPanel] = useState<"" | "suggest" | "where" | "length" | "sort">("");
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [countrySearch, setCountrySearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false); // Filterleiste auf dem Handy
  const [allCountriesShown, setAllCountriesShown] = useState(false); // Länder-Pillen ausgeklappt
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [slide, setSlide] = useState(0);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const sortRef = useRef<HTMLDivElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  // GEÄNDERT: zentraler Auth-State (siehe lib/useAuth.ts)
  const { user } = useAuth();
  const [savedRoutes, setSavedRoutes] = useState<string[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [navScrolled, setNavScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [username, setUsername] = useState("");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const displayName = username || user?.email?.split("@")[0] || "";

  // Mobile: Hamburger-Menü und Footer-Akkordeon
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFooterSection, setOpenFooterSection] = useState<string | null>(null);

  const isLight = mounted && theme === "light";
  const themeClass = isLight ? "light" : "dark";

  // ---------------------------------------------------------------- Daten
  // Alle Routen einmal laden (öffentlicher Client), gefiltert wird im Browser —
  // so gibt es Live-Vorschläge beim Tippen und Zähler pro Land ohne neue Abfragen.
  async function fetchRoutes() {
    setLoading(true);
    try {
      const { data, error } = await withTimeout(supabasePublic.from("routes").select("*"), 10000);
      if (error) throw error;
      setRoutes((data as Route[]) || []);
    } catch (err) {
      console.error("fetchRoutes failed:", err);
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { fetchRoutes(); }, []);

  async function fetchSavedRoutes() {
    if (!user) return;
    const data = await safeQuery<any[]>(
      supabase.from("saved_routes").select("route_id").eq("user_id", user.id),
      "fetchSavedRoutes"
    );
    if (data) setSavedRoutes(data.map((r: any) => r.route_id));
  }

  async function toggleSave(routeId: string) {
    if (!user) {
      const currentQuery = searchParams.toString();
      const currentUrl = `${pathname}${currentQuery ? `?${currentQuery}` : ""}`;
      router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`);
      return;
    }
    const isSaved = savedRoutes.includes(routeId);
    try {
      if (isSaved) {
        await withTimeout(
          supabase.from("saved_routes").delete().eq("user_id", user.id).eq("route_id", routeId)
        );
        setSavedRoutes((prev) => prev.filter((id) => id !== routeId));
      } else {
        await withTimeout(
          supabase.from("saved_routes").insert({ user_id: user.id, route_id: routeId })
        );
        setSavedRoutes((prev) => [...prev, routeId]);
      }
    } catch (err) {
      console.error("toggleSave failed:", err);
    }
  }

  async function handleLogout() {
    await signOutSafe();
    setSavedRoutes([]); setShowUserMenu(false);
    setMobileMenuOpen(false);
  }

  useEffect(() => {
    if (user) fetchSavedRoutes();
    else setSavedRoutes([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) { setAvatarUrl(""); setUsername(""); return; }
    let alive = true;
    (async () => {
      const data = await safeQuery<{ avatar_url: string | null; username: string | null }>(
        supabase.from("profiles").select("avatar_url, username").eq("id", user.id).single(),
        "profile lookup"
      );
      if (!alive) return;
      setAvatarUrl(data?.avatar_url || "");
      setUsername(data?.username || "");
    })();
    return () => { alive = false; };
  }, [user]);

  // ---------------------------------------------------------------- abgeleitete Daten
  const countryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of routes) {
      if (typeof r.country === "string" && r.country.trim()) counts.set(r.country, (counts.get(r.country) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [routes]);

  const minutesById = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const r of routes) map.set(r.id, driveMinutes(r));
    return map;
  }, [routes]);

  /** Obergrenze des Reglers: längste Route, auf 30 Min. gerundet, max. 8 Std. */
  const timeMax = useMemo(() => {
    let max = 0;
    minutesById.forEach((m) => { if (m && m > max) max = m; });
    return Math.min(TIME_CAP, Math.max(120, Math.ceil(max / TIME_STEP) * TIME_STEP));
  }, [minutesById]);

  const types = useMemo(
    () => Array.from(new Set(routes.map((r) => r.type).filter((v): v is string => typeof v === "string" && v.trim() !== "" && v.trim().toUpperCase() !== "NULL"))).sort(),
    [routes]
  );

  const seasonById = useMemo(() => {
    const map = new Map<string, boolean[] | null>();
    for (const r of routes) map.set(r.id, seasonMonths(routeSeason(r)));
    return map;
  }, [routes]);

  const currentMonth = new Date().getMonth();
  const openThisMonth = useMemo(() => {
    let known = 0;
    let open = 0;
    seasonById.forEach((months) => {
      if (!months) return;
      known++;
      if (months[currentMonth]) open++;
    });
    return known > 0 ? open : null;
  }, [seasonById, currentMonth]);

  /** Prüft alle Filter außer den ausgelassenen (für die Zähler in den Menüs). */
  const matches = useCallback(
    (r: Route, skip: { countries?: boolean; time?: boolean } = {}) => {
      if (!skip.countries && countriesSel.length > 0 && !countriesSel.includes(r.country)) return false;
      if (!skip.time && timeSel) {
        const m = minutesById.get(r.id);
        // Obergrenze am Reglerende = offen ("8 Std.+")
        if (m == null || m < timeSel[0] || (timeSel[1] < timeMax && m > timeSel[1])) return false;
      }
      if (typesSel.length > 0 && !(typeof r.type === "string" && typesSel.includes(r.type))) return false;
      if (monthsSel.length > 0) {
        const months = seasonById.get(r.id);
        if (months && !monthsSel.some((m) => months[m])) return false;
      }
      if (appliedQuery.trim()) {
        const q = appliedQuery.trim().toLowerCase();
        const hay = `${localized(r, "title", lang)} ${r.title} ${r.country} ${localized(r, "description", lang)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    },
    [countriesSel, timeSel, timeMax, minutesById, typesSel, monthsSel, appliedQuery, seasonById, lang]
  );

  const filtered = useMemo(() => {
    const list = routes.filter((r) => matches(r));
    const km = (r: Route) => (typeof r.distance_km === "number" ? r.distance_km : Number(r.distance_km) || 0);
    switch (sort) {
      case "name": return [...list].sort((a, b) => localized(a, "title", lang).localeCompare(localized(b, "title", lang)));
      case "short": return [...list].sort((a, b) => km(a) - km(b));
      case "long": return [...list].sort((a, b) => km(b) - km(a));
      default: return [...list].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    }
  }, [routes, matches, sort, lang]);

  const pageSize = view === "grid" ? GRID_PAGE_SIZE : PAGE_SIZE;
  useEffect(() => { setVisibleCount(pageSize); }, [countriesSel, timeSel, typesSel, monthsSel, appliedQuery, sort, pageSize]);

  // Live-Vorschläge beim Tippen
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return { routes: [] as Route[], regions: [] as [string, number][] };
    return {
      routes: routes.filter((r) => `${localized(r, "title", lang)} ${r.title}`.toLowerCase().includes(q)).slice(0, 5),
      regions: countryCounts.filter(([c]) => c.toLowerCase().includes(q)).slice(0, 3),
    };
  }, [query, routes, countryCounts, lang]);
  const suggestionCount = suggestions.routes.length + suggestions.regions.length;

  // Titelbilder: euer bisheriges Waldbild plus die bestbewerteten Routen mit Foto
  const slides = useMemo(() => {
    const withImage = [...routes]
      .filter((r) => typeof r.image_url === "string" && r.image_url)
      .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
      .slice(0, 4);
    return [{ src: "/forest.jpg", route: null as Route | null }, ...withImage.map((r) => ({ src: r.image_url as string, route: r }))];
  }, [routes]);

  useEffect(() => {
    if (slides.length < 2) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setSlide((s) => (s + 1) % slides.length), SLIDE_MS);
    return () => clearInterval(timer);
  }, [slides.length]);

  // ---------------------------------------------------------------- Interaktionen
  const scrollToResults = () => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const toggleCountry = (c: string) =>
    setCountriesSel((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  const toggleType = (v: string) =>
    setTypesSel((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  const toggleMonth = (m: number) =>
    setMonthsSel((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, b) => a - b)));

  const clearAll = () => {
    setCountriesSel([]); setTimeSel(null); setMonthsSel([]); setTypesSel([]);
    setAppliedQuery(""); setQuery("");
  };

  const runSearch = () => {
    setAppliedQuery(query.trim());
    setOpenPanel("");
    scrollToResults();
  };

  const pickSuggestion = (index: number) => {
    if (index < suggestions.routes.length) {
      router.push(`/routedetail/${suggestions.routes[index].id}`);
      return;
    }
    const region = suggestions.regions[index - suggestions.routes.length];
    if (region) {
      if (!countriesSel.includes(region[0])) setCountriesSel((prev) => [...prev, region[0]]);
      setQuery(""); setAppliedQuery(""); setOpenPanel("");
      scrollToResults();
    }
  };

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && suggestionCount > 0) {
      e.preventDefault();
      setOpenPanel("suggest");
      setActiveSuggestion((i) => (i + 1) % suggestionCount);
    } else if (e.key === "ArrowUp" && suggestionCount > 0) {
      e.preventDefault();
      setActiveSuggestion((i) => (i - 1 + suggestionCount) % suggestionCount);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (openPanel === "suggest" && suggestionCount > 0 && activeSuggestion >= 0) pickSuggestion(activeSuggestion);
      else runSearch();
    } else if (e.key === "Escape") {
      setOpenPanel("");
    }
  };

  // Menüs schließen bei Klick daneben oder Escape
  useEffect(() => {
    if (!openPanel) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchWrapRef.current?.contains(target) || sortRef.current?.contains(target)) return;
      setOpenPanel("");
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenPanel(""); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openPanel]);

  /* Filterleiste (Desktop): Höhe immer so begrenzen, dass ihr unteres Ende im Fenster bleibt.
     Sonst ragt sie unten aus dem Bild, solange sie noch nicht oben „klebt“, und die letzten Filter sind nicht erreichbar. */
  const sideRef = useRef<HTMLElement>(null);
  useEffect(() => {
    let frame = 0;
    const fit = () => {
      frame = 0;
      const el = sideRef.current;
      if (!el) return;
      const top = Math.max(84, el.getBoundingClientRect().top);
      el.style.setProperty("--side-max", `${Math.max(240, window.innerHeight - top - 16)}px`);
    };
    const queue = () => { if (!frame) frame = requestAnimationFrame(fit); };
    fit();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => { if (openPanel !== "where") setCountrySearch(""); }, [openPanel]);

  useEffect(() => {
    const onScroll = () => {
      setNavScrolled(window.scrollY > 40);
      setShowScrollTop(window.scrollY > 600);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!showUserMenu) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".ep-user-menu-wrap")) setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showUserMenu]);

  useEffect(() => {
    if (!showLangMenu) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".footer-lang-wrap")) setShowLangMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showLangMenu]);

  // Body-Scroll sperren, solange Hamburger-Menü oder Filterleiste (Handy) offen sind
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen || filtersOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen, filtersOpen]);

  const fill = (text: string, values: Record<string, string | number>) =>
    Object.entries(values).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), text);

  /** "45 min", "1 h 40 min", "2 h" in der aktuellen Sprache */
  const fmtMin = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    if (h === 0) return `${min} ${tx.unitMin}`;
    return min === 0 ? `${h} ${tx.unitH}` : `${h} ${tx.unitH} ${min} ${tx.unitMin}`;
  };
  const timeLabel = (sel: [number, number] | null) => {
    if (!sel) return tx.timeAny;
    const open = sel[1] >= timeMax;
    if (sel[0] <= 0 && open) return tx.timeAny;
    if (sel[0] <= 0) return fill(tx.timeUnder, { b: fmtMin(sel[1]) });
    if (open) return fill(tx.timeOver, { a: fmtMin(sel[0]) });
    return fill(tx.timeRange, { a: fmtMin(sel[0]), b: fmtMin(sel[1]) });
  };
  const timeRange: [number, number] = timeSel ?? [0, timeMax];
  const setTimeRange = (lo: number, hi: number) => {
    const a = Math.max(0, Math.min(lo, timeMax));
    const b = Math.max(0, Math.min(hi, timeMax));
    setTimeSel(a <= 0 && b >= timeMax ? null : [a, b]);
  };

  // Balken über dem Regler: Anzahl Routen je 30 Min. (mit allen anderen Filtern)
  const timeBars = useMemo(() => {
    const bars = new Array(timeMax / TIME_STEP).fill(0);
    for (const r of routes) {
      if (!matches(r, { time: true })) continue;
      const m = minutesById.get(r.id);
      if (m == null) continue;
      bars[Math.min(bars.length - 1, Math.floor(m / TIME_STEP))]++;
    }
    return bars as number[];
  }, [routes, matches, minutesById, timeMax]);
  const barMax = Math.max(1, ...timeBars);
  const countInTime = routes.filter((r) => matches(r)).length;

  const QUICK: { label: string; range: [number, number] }[] = [
    { label: tx.qShort, range: [0, 60] },
    { label: tx.qMorning, range: [60, 120] },
    { label: tx.qHalf, range: [120, 240] },
    { label: tx.qLong, range: [240, timeMax] },
  ]
    // Nur Schnellwahlen zeigen, die es bei den vorhandenen Routen überhaupt gibt
    .filter((q) => q.range[0] < timeMax)
    .map((q) => ({ ...q, range: [q.range[0], Math.min(q.range[1], timeMax)] as [number, number] }));

  /** Fahrzeit-Regler: Balken, Doppel-Regler, Schnellwahl (oben im Menü und links in der Filterleiste) */
  const renderTimeFilter = (where: "pop" | "side") => (
    <div className={`xp-time xp-time-${where}`}>
      {where === "pop" && (
        <div className="xp-time-head">
          <b>{tx.driveTimeTitle}</b>
          <span>{timeLabel(timeSel)}</span>
        </div>
      )}
      <div className="xp-bars" aria-hidden="true">
        {timeBars.map((n, i) => {
          const from = i * TIME_STEP;
          const inside = from + TIME_STEP > timeRange[0] && (from < timeRange[1] || timeRange[1] >= timeMax);
          return <i key={i} className={inside ? "in" : ""} style={{ height: `${n === 0 ? 4 : 10 + (n / barMax) * 90}%` }} />;
        })}
      </div>
      <div
        className="xp-range"
        style={{ "--lo": `${(timeRange[0] / timeMax) * 100}%`, "--hi": `${(timeRange[1] / timeMax) * 100}%` } as React.CSSProperties}
      >
        <input
          type="range" min={0} max={timeMax} step={TIME_STEP} value={timeRange[0]}
          aria-label={`${tx.driveTimeTitle}: min`}
          aria-valuetext={fmtMin(timeRange[0])}
          onChange={(e) => setTimeRange(Math.min(Number(e.target.value), timeRange[1] - TIME_STEP), timeRange[1])}
        />
        <input
          type="range" min={0} max={timeMax} step={TIME_STEP} value={timeRange[1]}
          aria-label={`${tx.driveTimeTitle}: max`}
          aria-valuetext={timeRange[1] >= timeMax ? `${fmtMin(timeMax)}+` : fmtMin(timeRange[1])}
          onChange={(e) => setTimeRange(timeRange[0], Math.max(Number(e.target.value), timeRange[0] + TIME_STEP))}
        />
      </div>
      <div className="xp-range-ends"><span>0</span><span>{fmtMin(timeMax)}+</span></div>
      {where === "side" && <div className="xp-time-val">{timeLabel(timeSel)}</div>}
      <div className="xp-quick">
        {QUICK.map((q) => {
          const on = timeSel !== null && timeRange[0] === q.range[0] && timeRange[1] === q.range[1];
          return (
            <button key={q.label} type="button" className={on ? "on" : ""} aria-pressed={on} onClick={() => (on ? setTimeSel(null) : setTimeRange(q.range[0], q.range[1]))}>
              {q.label}
            </button>
          );
        })}
      </div>
      {where === "pop" && <p className="xp-time-hint">{tx.driveTimeHint}</p>}
    </div>
  );

  const whereLabel =
    countriesSel.length === 0 ? tx.anyCountry : countriesSel.length === 1 ? countriesSel[0] : fill(tx.countriesN, { n: countriesSel.length });
  const sortLabels: Record<SortKey, string> = { popular: tx.sortPopular, name: tx.sortName, short: tx.sortShort, long: tx.sortLong };
  const countAfterCountries = routes.filter((r) => matches(r)).length;
  const visibleCountries = countrySearch.trim()
    ? countryCounts.filter(([c]) => c.toLowerCase().includes(countrySearch.trim().toLowerCase()))
    : countryCounts;
  const activeChips: { key: string; label: string; remove: () => void }[] = [
    ...(appliedQuery ? [{ key: "q", label: fill(tx.query, { q: appliedQuery }), remove: () => { setAppliedQuery(""); setQuery(""); } }] : []),
    ...countriesSel.map((c) => ({ key: `c-${c}`, label: c, remove: () => toggleCountry(c) })),
    ...(timeSel ? [{ key: "time", label: timeLabel(timeSel), remove: () => setTimeSel(null) }] : []),
    ...monthsSel.map((m) => ({ key: `m-${m}`, label: tx.months[m], remove: () => toggleMonth(m) })),
    ...typesSel.map((v) => ({ key: `t-${v}`, label: v, remove: () => toggleType(v) })),
  ];
  // Raster: auf volle 12er-Blöcke aufrunden, damit keine halbe Reihe entsteht
  const shownCount = view === "grid" ? Math.ceil(visibleCount / GRID_PAGE_SIZE) * GRID_PAGE_SIZE : visibleCount;
  const shown = filtered.slice(0, shownCount);

  // Länder als Pillen: eingeklappt die häufigsten (gewählte bleiben immer sichtbar)
  const COUNTRY_PREVIEW = 10;
  const countriesByCount = [...countryCounts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const countryPills = allCountriesShown
    ? countriesByCount
    : countriesByCount.filter(([c], i) => i < COUNTRY_PREVIEW || countriesSel.includes(c));
  const hiddenCountries = countriesByCount.length - countryPills.length;

  /** Markiert den getippten Teil im Vorschlag. */
  const highlight = (text: string) => {
    const q = query.trim();
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (!q || i < 0) return text;
    return (<>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>);
  };

  /** Eine Zeile der Routenliste (als Funktion, nicht als Komponente — sonst
      würde die Liste bei jedem Bildwechsel im Titel neu aufgebaut). */
  const renderRow = (route: Route) => {
    const title = localized(route, "title", lang) || route.title;
    const description = localized(route, "description", lang);
    const highlights = localized(route, "route_highlights", lang)
      .split("\n").map((s) => s.replace(/^[-•·\s]+/, "").trim()).filter(Boolean).slice(0, 3);
    const tags = highlights.length > 0 ? highlights : typeof route.type === "string" && route.type.trim() ? [route.type] : [];
    const km = typeof route.distance_km === "number" ? route.distance_km : Number(route.distance_km);
    const elevation = Number(firstText(route, ["elevation_gain_m"]));
    const season = routeSeason(route);
    const saved = savedRoutes.includes(route.id);
    const href = `/routedetail/${route.id}`;
    return (
      <article className="xp-row" key={route.id}>
        <Link href={href} prefetch={false} className="xp-row-media" aria-label={title}>
          <img src={route.image_url || "/forest.jpg"} alt="" loading="lazy" onError={(e) => { e.currentTarget.src = "/forest.jpg"; }} />
        </Link>
        <div className="xp-row-info">
          <span className="xp-row-country">{route.country}</span>
          <h3><Link href={href} prefetch={false}>{title}</Link></h3>
          {description && <p>{description}</p>}
          {tags.length > 0 && <div className="xp-row-tags">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
        </div>
        <div className="xp-row-facts">
          <span className="xp-row-glance">{tx.glance}</span>
          <dl>
            {km > 0 && <div><dt><RouteIcon size={13} strokeWidth={1.8} /> {tx.length}</dt><dd>{Math.round(km)} km</dd></div>}
            {minutesById.get(route.id) != null && <div><dt><Clock size={13} strokeWidth={1.8} /> {tx.drive}</dt><dd>{fill(tx.est, { t: fmtMin(minutesById.get(route.id) as number) })}</dd></div>}
            {elevation > 0 && <div><dt><Mountain size={13} strokeWidth={1.8} /> {tx.elevation}</dt><dd>{Math.round(elevation).toLocaleString(lang === "de" ? "de-DE" : "en-GB")} m</dd></div>}
            {season && <div><dt><Sun size={13} strokeWidth={1.8} /> {tx.season}</dt><dd>{season}</dd></div>}
          </dl>
          <div className="xp-row-acts">
            <Link href={href} prefetch={false} className="xp-btn">{tx.viewRoute}</Link>
            <button
              type="button"
              className={`xp-save ${saved ? "on" : ""}`}
              onClick={() => toggleSave(route.id)}
              aria-pressed={saved}
              aria-label={`${saved ? tx.unsave : tx.save}: ${title}`}
            >
              <Heart size={16} strokeWidth={1.9} fill={saved ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
      </article>
    );
  };


  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=Inter:wght@300;400;500;600;700;800&display=swap');

        html { scroll-behavior:smooth; }
        body { background:var(--bg); overflow-x:hidden; }
        .page *, .page *::before, .page *::after { box-sizing:border-box; margin:0; padding:0; }
        .page a { color:inherit; text-decoration:none; }
        .page button { border:none; font:inherit; cursor:pointer; }
        .page input, .page select { font:inherit; }
        .page img { display:block; }

        /* Compound-Selektoren, um explizite Button-Styles gegen den .page button Reset
           (font:inherit, border:none) abzusichern — sonst erben diese Buttons Größe/Gewicht
           vom Elternelement statt ihre eigenen Werte zu behalten. */
        button.search-btn { font-size:10px; font-weight:800; letter-spacing:0.2em; }
        button.filter-btn { font-size:10px; font-weight:700; letter-spacing:0.16em; border:1px solid var(--border); }
        button.clear-all-btn { font-size:9px; font-weight:700; letter-spacing:0.14em; border:1px solid var(--border); }
        button.filter-reset { font-size:10px; font-weight:600; letter-spacing:0.12em; }
        button.filter-chip { font-size:9px; font-weight:800; letter-spacing:0.14em; border:1px solid var(--border); }
        button.filter-apply-btn { font-size:10px; font-weight:800; letter-spacing:0.2em; }
        button.footer-lang-btn { font-size:16px; font-weight:400; letter-spacing:0.12em; }

        .dark {
          --bg:#0c0b09; --bg2:#111009; --bg3:#181510;
          --gold:#C9A86A; --cream:#EDE5D4;
          --muted:rgba(237,229,212,0.56); --dim:rgba(237,229,212,0.32);
          --border:rgba(237,229,212,0.10);
          --serif:'Cormorant Garamond',Georgia,serif;
          --sans:'Inter',system-ui,sans-serif;
        }

        .light {
          --bg:#F4F0E8; --bg2:#EDE8DC; --bg3:#E5DFD0;
          --gold:#C9A86A; --cream:#2B2620;
          --muted:rgba(43,38,32,0.62); --dim:rgba(43,38,32,0.38);
          --border:rgba(43,38,32,0.12);
          --serif:'Cormorant Garamond',Georgia,serif;
          --sans:'Inter',system-ui,sans-serif;
        }
        .page { min-height:100vh; background:var(--bg); color:var(--cream); font-family:var(--sans); transition:background .35s, color .35s; }

        .nav { position:fixed; inset:0 0 auto; z-index:200; height:72px; padding:0 clamp(20px,4vw,60px); display:flex; align-items:center; justify-content:space-between; background:transparent; border-bottom:1px solid transparent; transition:background .35s,border-color .35s; }
        .nav.scrolled { background:color-mix(in srgb, var(--bg) 92%, transparent); backdrop-filter:blur(20px); border-bottom-color:var(--border); }
        .nav-logo span { font-size:11px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--cream); transition:color .3s, text-shadow .3s; }
        .nav-logo { display:flex; flex-direction:column; line-height:1; }
        .nav-links { display:flex; gap:36px; }
        .nav-link { position:relative; font-size:13px; font-weight:600; letter-spacing:0.16em; text-transform:uppercase; color:var(--muted); opacity:0.5; transition:color .2s, text-shadow .3s, opacity .2s; }
        .nav-link::after { content:""; position:absolute; left:0; bottom:-8px; width:0; height:1px; background:var(--gold); transition:width .25s; }
        .nav-link:hover { color:var(--cream); opacity:1; }
        .nav-link:hover::after { width:100%; }
        .nav-link-active { color:var(--cream) !important; font-weight:700; opacity:1; }
        .nav-right { display:flex; align-items:center; gap:16px; }
        .login-btn { padding:10px 22px; border:1px solid var(--border); border-radius:999px; font-size:10px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:var(--cream); background:color-mix(in srgb, var(--border) 40%, transparent); transition:all .25s; }
        .login-btn:hover { background:var(--cream); color:var(--bg); }
        .user-avatar { width:48px; height:48px; border-radius:50%; border:1.5px solid var(--border); background:var(--bg2); overflow:hidden; display:flex; align-items:center; justify-content:center; font-family:var(--serif); font-size:20px; font-weight:700; color:var(--cream); cursor:pointer; transition:border-color .2s, transform .2s; box-shadow:0 6px 18px rgba(0,0,0,0.35); }
        button.user-avatar { font-family:var(--serif); font-size:20px; font-weight:700; }
        .user-avatar:hover { border-color:var(--gold); transform:translateY(-1px); }
        .user-avatar img { width:100%; height:100%; object-fit:cover; }
        .dark .user-avatar { color:var(--cream); }
        .light .user-avatar { color:#000; }

        .light .nav:not(.scrolled) .nav-logo span { color:#fff; text-shadow:0 2px 8px rgba(0,0,0,0.45); }
        .light .nav:not(.scrolled) .nav-link { color:rgba(255,255,255,0.78); text-shadow:0 2px 6px rgba(0,0,0,0.4); opacity:0.55; }
        .light .nav:not(.scrolled) .nav-link:hover { color:#fff; opacity:1; }
        .light .nav:not(.scrolled) .nav-link-active { color:#fff !important; opacity:1; }
        .light .nav:not(.scrolled) .login-btn { color:#fff; border-color:rgba(255,255,255,0.35); background:rgba(0,0,0,0.22); }
        .light .nav:not(.scrolled) .login-btn:hover { background:#fff; color:#2B2620; }
        .light .nav:not(.scrolled) .user-avatar { border-color:rgba(255,255,255,0.35); }

        .theme-switch { position:relative; display:flex; align-items:center; width:66px; height:33px; border-radius:999px; background:color-mix(in srgb, var(--border) 70%, transparent) !important; backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid var(--border) !important; box-shadow:0 8px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06); cursor:pointer; transition:background .35s, border-color .35s; flex-shrink:0; }
        .theme-switch:hover { border-color: var(--gold) !important; }
        .theme-switch-knob { position:absolute; top:4.5px; left:3.5px; width:22px; height:22px; border-radius:50%; background:linear-gradient(to bottom, rgba(255,255,255,0.96), rgba(237,229,212,0.85)); box-shadow:0 4px 10px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.6); display:flex; align-items:center; justify-content:center; transition:transform .45s cubic-bezier(0.22,1,0.36,1); }
        .theme-switch-knob.is-light { transform:translateX(36px); }
        .theme-switch-icon { width:14px; height:14px; }
        .theme-switch-placeholder { width:66px; height:33px; border-radius:999px; background:color-mix(in srgb, var(--border) 50%, transparent); border:1px solid var(--border); flex-shrink:0; }

        .ep-user-menu-wrap { position:relative; }
        .user-dropdown { position:absolute; top:54px; right:0; width:290px; background:color-mix(in srgb, var(--bg) 97%, transparent); border:1px solid var(--border); border-radius:20px; overflow:hidden; box-shadow:0 32px 80px rgba(0,0,0,0.65); backdrop-filter:blur(28px); animation:dropIn .2s cubic-bezier(0.22,1,0.36,1); z-index:300; }
        @keyframes dropIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .ud-header { padding:20px 20px 18px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:14px; }
        .ud-avatar { width:46px; height:46px; border-radius:11px; border:1.5px solid var(--border); background:var(--bg2); display:flex; align-items:center; justify-content:center; font-family:var(--serif); font-size:22px; font-weight:700; color:var(--cream); flex-shrink:0; overflow:hidden; }
        .ud-avatar img { width:100%; height:100%; object-fit:cover; }
        .ud-name { font-family:var(--serif); font-size:18px; font-weight:300; color:var(--cream); letter-spacing:-0.01em; line-height:1.2; }
        .ud-email { font-size:10px; color:var(--dim); margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px; }
        .ud-role { font-size:8px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase; color:var(--gold); margin-top:4px; opacity:0.7; }
        .ud-theme-row { display:flex; align-items:center; justify-content:space-between; padding:14px 20px; border-bottom:1px solid var(--border); }
        .ud-theme-label { font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:var(--muted); }
        .ud-links { padding:8px; }
        .ud-link { display:flex; align-items:center; gap:12px; width:100%; padding:10px 12px; border-radius:10px; font-size:12px; font-weight:600; letter-spacing:0.04em; color:var(--muted); background:none; border:none; cursor:pointer; transition:all .18s; text-decoration:none; }
        .ud-link:hover { background:color-mix(in srgb, var(--border) 60%, transparent); color:var(--cream); }
        .ud-link-icon { width:18px; display:flex; align-items:center; justify-content:center; color:var(--gold); flex-shrink:0; }
        .ud-divider { height:1px; background:var(--border); margin:4px 8px; }
        .ud-logout { display:flex; align-items:center; gap:12px; width:100%; padding:10px 12px; border-radius:10px; font-size:12px; font-weight:600; letter-spacing:0.04em; color:rgba(224,128,128,0.55); background:none; border:none; cursor:pointer; transition:all .18s; }
        .ud-logout:hover { background:rgba(224,128,128,0.07); color:#e08080; }

        .route-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }

        ${ROUTE_CARD_STYLES}

        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        /* ==================================================================
           NEUES EXPLORE-DESIGN (Präfix xp-): Titelbild-Diashow mit Suche,
           Filterleiste links, Routenzeilen rechts.
           ================================================================== */
        .dark { --raise:#16140F; --raise2:#1E1B15; --line2:rgba(237,229,212,0.18); --goldText:#D9BE86; --xp-shadow:0 30px 70px rgba(0,0,0,0.45); }
        .light { --raise:#FFFFFF; --raise2:#F8F3EA; --line2:rgba(43,38,32,0.18); --goldText:#86652A; --xp-shadow:0 26px 60px rgba(70,52,20,0.12); }
        .page { --xp-ease:cubic-bezier(.22,1,.36,1); }

        .xp-btn { display:inline-flex; align-items:center; justify-content:center; gap:10px; height:48px; padding:0 24px; border-radius:999px; background:var(--gold); color:#1A150C; font-size:14px; font-weight:600; white-space:nowrap; transition:transform .3s var(--xp-ease), filter .3s; }
        .xp-btn:hover { transform:translateY(-1px); filter:brightness(1.06); }
        .page a.xp-btn { color:#1A150C; }
        button.xp-btn { font-size:14px; font-weight:600; }
        .xp-btn-line { display:inline-flex; align-items:center; justify-content:center; height:46px; padding:0 22px; border-radius:999px; border:1px solid var(--line2) !important; background:transparent; color:var(--cream); font-size:14px; font-weight:500; transition:border-color .3s; }
        button.xp-btn-line { font-size:14px; font-weight:500; }
        .xp-btn-line:hover { border-color:var(--gold) !important; }
        .xp-link { background:none; color:var(--dim); font-size:12.5px; transition:color .2s; }
        button.xp-link { font-size:12.5px; }
        .xp-link:hover { color:var(--cream); }
        .page :focus-visible { outline:2px solid var(--gold); outline-offset:2px; }
        .page .xp-q input:focus-visible, .page .xp-mini input:focus-visible { outline:none; }
        .xp-q:focus-within { background:rgba(255,255,255,0.10); box-shadow:inset 0 0 0 1px rgba(232,207,150,0.55); }

        /* ---------- Titelbereich */
        .xp-hero { position:relative; min-height:max(720px, 100vh); display:flex; flex-direction:column; align-items:center; justify-content:center; padding:110px clamp(20px,4vw,60px) 150px; color:#fff; z-index:20; }
        .xp-hero-bg { position:absolute; inset:0; overflow:hidden; background:#0B0A08; z-index:0; }
        .xp-slide { position:absolute; inset:0; opacity:0; transition:opacity 1.6s ease; }
        .xp-slide.on { opacity:1; }
        .xp-slide img { width:100%; height:100%; object-fit:cover; transform:scale(1.02); transition:transform 9s linear; }
        .xp-slide.on img { transform:scale(1.08); }
        .xp-veil { position:absolute; inset:0; background:radial-gradient(ellipse 60% 52% at 50% 50%, rgba(11,10,8,0.62) 0%, rgba(11,10,8,0.30) 70%, rgba(11,10,8,0.16) 100%), linear-gradient(to bottom, rgba(11,10,8,0.66) 0%, rgba(11,10,8,0) 22%, rgba(11,10,8,0) 72%, var(--bg) 100%); }
        .xp-center { position:relative; z-index:2; display:flex; flex-direction:column; align-items:center; text-align:center; width:100%; }
        .xp-h1 { font-family:var(--serif); font-weight:300; font-size:clamp(56px,8vw,116px); line-height:.9; letter-spacing:-.03em; color:#fff; text-shadow:0 6px 40px rgba(0,0,0,0.35); }
        .xp-sub { margin-top:22px !important; max-width:560px; font-size:16px; line-height:1.7; color:rgba(255,255,255,0.84); }
        .xp-sw { position:relative; width:min(980px,100%); margin-top:44px !important; text-align:left; }
        .xp-search { display:flex; align-items:center; gap:6px; padding:8px; border-radius:999px; background:rgba(255,255,255,0.13); border:1px solid rgba(255,255,255,0.28); backdrop-filter:blur(26px) saturate(160%); -webkit-backdrop-filter:blur(26px) saturate(160%); box-shadow:0 30px 80px rgba(0,0,0,0.45); }
        .xp-q { flex:1; min-width:0; display:flex; align-items:center; gap:14px; height:58px; padding:0 14px 0 22px; border-radius:999px; cursor:text; transition:background .3s; }
        .xp-q svg { color:#fff; flex-shrink:0; }
        .xp-q input { flex:1; min-width:0; border:none; outline:none; background:transparent; font-size:16.5px; color:#fff; }
        .xp-q input::placeholder { color:rgba(255,255,255,0.68); }
        .xp-search.typing .xp-q { background:rgba(255,255,255,0.10); }
        button.xp-clear { width:26px; height:26px; display:grid; place-items:center; flex-shrink:0; border-radius:50%; background:rgba(255,255,255,0.18); color:#fff; }
        button.xp-opt { display:flex; align-items:center; gap:12px; height:58px; padding:0 18px 0 22px; border-radius:999px; border:1px solid rgba(255,255,255,0.18); background:rgba(255,255,255,0.06); color:#fff; text-align:left; flex-shrink:0; transition:background .3s, border-color .3s; }
        .xp-opt:hover { background:rgba(255,255,255,0.12); }
        .xp-opt small { display:block; font-size:11.5px; color:rgba(255,255,255,0.62); }
        .xp-opt > span > span { display:block; max-width:150px; overflow:hidden; text-overflow:ellipsis; font-size:14.5px; font-weight:500; color:#fff; white-space:nowrap; }
        .xp-opt svg { color:rgba(255,255,255,0.7); transition:transform .35s var(--xp-ease); }
        .xp-opt.open { background:rgba(255,255,255,0.18); border-color:rgba(255,255,255,0.45); }
        .xp-opt.open svg { transform:rotate(180deg); }
        .xp-opt.set { border-color:rgba(232,207,150,0.75); }
        .xp-opt.set small { color:#E8CF96; }
        .xp-find { height:58px; padding:0 28px; flex-shrink:0; }
        .xp-hint { margin-top:16px !important; font-size:13px; color:rgba(255,255,255,0.64); }
        .xp-stats { display:flex; gap:30px; margin-top:22px; font-size:13.5px; color:rgba(255,255,255,0.72); }
        .xp-stats b { color:#fff; font-weight:600; }
        .xp-now { position:absolute; left:clamp(20px,4vw,60px); bottom:110px; z-index:2; font-size:13px; color:rgba(255,255,255,0.75); transition:color .2s, opacity .3s; }
        .page a.xp-now { color:rgba(255,255,255,0.75); }
        .xp-now b { color:#fff; font-weight:600; }
        .page a.xp-now:hover { color:#fff; }
        .xp-dots { position:absolute; right:clamp(20px,4vw,60px); bottom:106px; z-index:2; display:flex; gap:6px; transition:opacity .3s; }
        .xp-dots button { padding:8px 0; background:none; }
        .xp-dots i { display:block; width:40px; height:2px; border-radius:2px; background:rgba(255,255,255,0.32); transition:background .4s; }
        .xp-dots button.on i { background:#fff; }

        /* Menüs unter der Suchleiste */
        .xp-pop { position:absolute; top:calc(100% + 12px); z-index:60; border-radius:24px; background:rgba(20,18,14,0.94); border:1px solid rgba(255,255,255,0.14); backdrop-filter:blur(30px) saturate(160%); -webkit-backdrop-filter:blur(30px) saturate(160%); box-shadow:0 40px 90px rgba(0,0,0,0.55); color:#fff; animation:xpPop .3s var(--xp-ease); }
        @keyframes xpPop { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:none; } }
        .xp-pop-suggest { left:0; width:min(600px,100%); padding:10px; }
        .xp-pl { padding:12px 14px 6px; font-size:12px; color:rgba(255,255,255,0.5); }
        button.xp-sr { display:grid; grid-template-columns:56px 1fr auto; align-items:center; gap:14px; width:100%; padding:8px 12px 8px 8px; border-radius:16px; background:none; color:#fff; text-align:left; }
        .xp-sr.on { background:rgba(255,255,255,0.08); }
        .xp-sr img { width:56px; height:42px; border-radius:10px; object-fit:cover; }
        .xp-sr-ic { width:56px; height:42px; display:grid; place-items:center; border-radius:10px; background:rgba(255,255,255,0.08); color:#E8CF96; }
        .xp-sr b { display:block; font-family:var(--serif); font-weight:400; font-size:21px; line-height:1.1; }
        .xp-sr mark { background:none; color:#E8CF96; }
        .xp-sr small { display:block; margin-top:2px; font-size:12.5px; color:rgba(255,255,255,0.6); }
        .xp-sr em { font-style:normal; font-size:12px; color:#fff; }
        .xp-pop-empty { padding:14px; font-size:14px; color:rgba(255,255,255,0.7); }
        button.xp-pf { display:flex; align-items:center; justify-content:space-between; width:100%; margin-top:8px; padding:12px 14px 6px; border-top:1px solid rgba(255,255,255,0.1); background:none; font-size:13px; color:rgba(255,255,255,0.75); text-align:left; }
        .xp-pf:hover { color:#fff; }
        .xp-pf kbd, .xp-sr em { font-family:var(--sans); }
        .xp-pf kbd { padding:2px 7px; border-radius:6px; border:1px solid rgba(255,255,255,0.3); font-size:11.5px; color:#fff; }
        .xp-pop-where { right:200px; width:330px; padding:14px; }
        .xp-mini { display:flex; align-items:center; gap:10px; height:44px; padding:0 14px; border-radius:14px; background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.55); }
        .xp-mini input { flex:1; min-width:0; border:none; outline:none; background:none; font-size:14px; color:#fff; }
        .xp-mini input::placeholder { color:rgba(255,255,255,0.55); }
        .xp-pop-list { max-height:280px; overflow-y:auto; margin-top:8px; scrollbar-width:thin; }
        .xp-pop .xp-check { color:rgba(255,255,255,0.82); }
        .xp-pop .xp-check:hover { background:rgba(255,255,255,0.06); }
        .xp-pop .xp-check i { border-color:rgba(255,255,255,0.35); }
        .xp-pop .xp-check em { color:rgba(255,255,255,0.45); }
        .xp-pop .xp-check.on { color:#fff; }
        .xp-pop-foot { display:flex; justify-content:space-between; align-items:center; margin-top:8px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.1); }
        .xp-pop-foot .xp-link { color:rgba(255,255,255,0.7); }
        .xp-pop-foot .xp-link:hover { color:#fff; }
        .xp-pop-foot .xp-btn { height:42px; padding:0 20px; font-size:13.5px; }
        .xp-pop-length { right:0; width:400px; padding:18px; }

        /* Fahrzeit-Regler */
        .xp-time-head { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:14px; }
        .xp-time-head b { font-family:var(--serif); font-weight:400; font-size:22px; }
        .xp-time-head span { font-size:14px; color:#E8CF96; }
        .xp-bars { display:flex; align-items:flex-end; gap:3px; height:56px; padding:0 11px; }
        .xp-bars i { flex:1; min-height:3px; border-radius:3px 3px 1px 1px; background:var(--line2); transition:background .25s, height .4s var(--xp-ease); }
        .xp-bars i.in { background:color-mix(in srgb, var(--gold) 75%, transparent); }
        .xp-pop .xp-bars i { background:rgba(255,255,255,0.16); }
        .xp-pop .xp-bars i.in { background:rgba(214,180,112,0.85); }
        .xp-range { position:relative; height:28px; margin-top:-2px; }
        .xp-range::before { content:""; position:absolute; left:11px; right:11px; top:12px; height:4px; border-radius:4px; background:var(--line2); }
        .xp-range::after { content:""; position:absolute; top:12px; height:4px; border-radius:4px; background:var(--gold); left:calc(11px + (100% - 22px) * var(--lo) / 100%); right:calc(11px + (100% - 22px) * (1 - var(--hi) / 100%)); }
        .xp-pop .xp-range::before { background:rgba(255,255,255,0.18); }
        .xp-range input { position:absolute; inset:0; width:100%; height:28px; margin:0; background:none; pointer-events:none; -webkit-appearance:none; appearance:none; z-index:2; }
        .xp-range input::-webkit-slider-runnable-track { background:none; height:28px; }
        .xp-range input::-moz-range-track { background:none; }
        .xp-range input::-webkit-slider-thumb { -webkit-appearance:none; pointer-events:auto; width:22px; height:22px; margin-top:3px; border-radius:50%; background:#fff; border:3px solid var(--gold); box-shadow:0 3px 10px rgba(0,0,0,0.3); cursor:grab; }
        .xp-range input::-moz-range-thumb { pointer-events:auto; width:16px; height:16px; border-radius:50%; background:#fff; border:3px solid var(--gold); box-shadow:0 3px 10px rgba(0,0,0,0.3); cursor:grab; }
        .xp-range input:focus-visible { outline:none; }
        .xp-range input:focus-visible::-webkit-slider-thumb { box-shadow:0 0 0 4px color-mix(in srgb, var(--gold) 40%, transparent); }
        .xp-range-ends { display:flex; justify-content:space-between; padding:2px 4px 0; font-size:11.5px; color:var(--dim); }
        .xp-pop .xp-range-ends { color:rgba(255,255,255,0.5); }
        .xp-time-val { margin-top:8px; font-size:14px; font-weight:500; color:var(--cream); }
        .xp-quick { display:flex; flex-wrap:wrap; gap:6px; margin-top:14px; }
        .xp-quick button { height:34px; padding:0 13px; border-radius:999px; border:1px solid var(--line2) !important; background:transparent; color:var(--muted); font-size:13px; transition:all .2s; }
        .xp-quick button:hover { color:var(--cream); border-color:var(--gold) !important; }
        .xp-time-side .xp-quick { display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:5px; }
        .xp-time-side .xp-quick button { padding:0 4px; font-size:12.5px; white-space:nowrap; }
        .xp-hero.panel-open .xp-dots, .xp-hero.panel-open .xp-now { opacity:0; pointer-events:none; }
        .xp-quick button.on { background:var(--cream); border-color:var(--cream) !important; color:var(--bg); }
        .xp-pop .xp-quick button { border-color:rgba(255,255,255,0.22) !important; color:rgba(255,255,255,0.8); }
        .xp-pop .xp-quick button:hover { color:#fff; border-color:#E8CF96 !important; }
        .xp-pop .xp-quick button.on { background:#fff; border-color:#fff !important; color:#1A150C; }
        .xp-time-hint { margin-top:12px !important; font-size:12px; color:rgba(255,255,255,0.5); }
        @media (pointer:coarse) {
          .xp-range, .xp-range input { height:40px; }
          .xp-range::before, .xp-range::after { top:18px; }
          .xp-range input::-webkit-slider-runnable-track { height:40px; }
          .xp-range input::-webkit-slider-thumb { width:28px; height:28px; margin-top:6px; }
          .xp-range input::-moz-range-thumb { width:22px; height:22px; }
        }
        button.xp-radio { display:flex; align-items:center; gap:12px; width:100%; padding:11px 12px; border-radius:12px; background:none; font-size:14.5px; color:rgba(255,255,255,0.82); text-align:left; }
        .xp-radio:hover { background:rgba(255,255,255,0.06); }
        .xp-radio i { width:18px; height:18px; border-radius:50%; border:1.5px solid rgba(255,255,255,0.4); display:grid; place-items:center; }
        .xp-radio.on { color:#fff; }
        .xp-radio.on i { border-color:#C9A86A; }
        .xp-radio.on i::after { content:""; width:8px; height:8px; border-radius:50%; background:#C9A86A; }

        /* Checkbox (Menü + Filterleiste) */
        .xp-check { display:flex; align-items:center; gap:12px; padding:8px; border-radius:12px; font-size:14px; color:var(--muted); cursor:pointer; transition:background .2s; }
        .xp-check input { position:absolute; opacity:0; width:1px; height:1px; }
        .xp-check i { width:20px; height:20px; display:grid; place-items:center; flex-shrink:0; border-radius:6px; border:1.5px solid var(--line2); color:transparent; transition:all .2s; }
        .xp-check.on { color:var(--cream); }
        .xp-check.on i { background:var(--gold); border-color:var(--gold); color:#1A150C; }
        .xp-check em { margin-left:auto; font-style:normal; font-size:12.5px; color:var(--dim); font-variant-numeric:tabular-nums; }
        .xp-check:has(input:focus-visible) { outline:2px solid var(--gold); outline-offset:1px; }

        /* ---------- Katalog */
        .xp-cat { position:relative; z-index:1; max-width:1440px; margin:0 auto; padding:24px clamp(20px,4vw,60px) clamp(60px,8vw,100px); scroll-margin-top:72px; }
        .xp-cat-head { display:flex; align-items:flex-end; justify-content:space-between; gap:24px; padding-bottom:26px; border-bottom:1px solid var(--border); }
        .xp-cat-head h2 { font-family:var(--serif); font-weight:300; font-size:clamp(44px,5vw,64px); line-height:.95; letter-spacing:-.02em; color:var(--cream); }
        .xp-cat-head p { margin-top:10px !important; font-size:15px; color:var(--muted); }
        .xp-tools { display:flex; align-items:center; gap:12px; }
        button.xp-tool { display:inline-flex; align-items:center; gap:10px; height:50px; padding:0 18px; border-radius:16px; border:1px solid var(--line2); background:transparent; color:var(--cream); font-size:14px; white-space:nowrap; }
        .xp-tool-dim { color:var(--dim); }
        .xp-filter-btn { display:none !important; }
        .xp-count { min-width:20px; height:20px; padding:0 6px; display:grid; place-items:center; border-radius:999px; background:var(--gold); color:#1A150C; font-size:11px; font-weight:700; }
        .xp-sort { position:relative; }
        .xp-menu { position:absolute; right:0; top:calc(100% + 8px); z-index:50; min-width:220px; padding:6px; border-radius:16px; background:var(--raise); border:1px solid var(--line2); box-shadow:var(--xp-shadow); animation:xpPop .25s var(--xp-ease); }
        .xp-menu button { display:flex; align-items:center; justify-content:space-between; width:100%; padding:11px 12px; border-radius:10px; background:none; font-size:14px; color:var(--muted); text-align:left; }
        .xp-menu button:hover { background:var(--raise2); color:var(--cream); }
        .xp-menu button.on { color:var(--cream); }
        .xp-menu button svg { color:var(--goldText); }
        .xp-view { display:flex; padding:4px; border-radius:16px; border:1px solid var(--line2); }
        .xp-view button { display:inline-flex; align-items:center; gap:8px; height:40px; padding:0 14px; border-radius:12px; background:transparent; color:var(--dim); font-size:13.5px; }
        .xp-view button.on { background:var(--raise2); color:var(--cream); }

        .xp-main { display:grid; grid-template-columns:280px minmax(0,1fr); gap:48px; }
        .xp-side { padding:28px 14px 24px 0; margin-right:-14px; display:flex; flex-direction:column; align-self:start; position:sticky; top:84px; max-height:var(--side-max, calc(100vh - 100px)); overflow-y:auto; overscroll-behavior:contain; -webkit-mask-image:linear-gradient(to bottom, transparent 0, #000 18px, #000 calc(100% - 22px), transparent 100%); mask-image:linear-gradient(to bottom, transparent 0, #000 18px, #000 calc(100% - 22px), transparent 100%); scrollbar-width:thin; scrollbar-gutter:stable; scrollbar-color:color-mix(in srgb, var(--gold) 40%, transparent) transparent; }
        .xp-side-top, .xp-side-backdrop { display:none; }
        .xp-group { padding:20px 0; border-bottom:1px solid var(--border); }
        .xp-group:first-of-type { padding-top:0; }
        .xp-gh { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:12px; }
        .xp-gh b { font-size:14.5px; font-weight:600; color:var(--cream); }
        .xp-gh-dim { font-size:12.5px; color:var(--dim); }
        .xp-cpills { display:flex; flex-wrap:wrap; gap:7px; }
        .xp-cpills button { display:inline-flex; align-items:center; gap:7px; height:34px; padding:0 13px; border-radius:999px; border:1px solid var(--line2) !important; background:transparent; color:var(--muted); font-size:13px; transition:background .25s, color .25s, border-color .25s; }
        .xp-cpills button em { font-style:normal; font-size:11.5px; color:var(--dim); font-variant-numeric:tabular-nums; }
        .xp-cpills button:hover { color:var(--cream); border-color:var(--gold) !important; }
        .xp-cpills button.on { background:var(--cream); border-color:var(--cream) !important; color:var(--bg); }
        .xp-cpills button.on em { color:color-mix(in srgb, var(--bg) 62%, transparent); }
        .xp-cpills button.xp-cmore { border-style:dashed !important; color:var(--goldText); }
        .xp-cpills button.xp-cmore svg { transition:transform .3s var(--xp-ease); }
        .xp-cpills button.xp-cmore[aria-expanded="true"] svg { transform:rotate(180deg); }
        .xp-seg { display:flex; flex-wrap:wrap; gap:6px; }
        .xp-seg button, .xp-tags button { height:36px; padding:0 14px; border-radius:999px; border:1px solid var(--line2) !important; background:transparent; color:var(--muted); font-size:13px; transition:all .2s; }
        .xp-seg button:hover, .xp-tags button:hover { color:var(--cream); border-color:var(--gold) !important; }
        .xp-seg button.on { background:var(--cream); border-color:var(--cream) !important; color:var(--bg); }
        .xp-tags { display:flex; flex-wrap:wrap; gap:8px; }
        .xp-tags button.on { border-color:var(--gold) !important; color:var(--goldText); background:color-mix(in srgb, var(--gold) 12%, transparent); }
        .xp-months { display:grid; grid-template-columns:repeat(6,1fr); gap:6px; }
        .xp-months button { height:36px; border-radius:10px; border:1px solid var(--line2) !important; background:transparent; color:var(--muted); font-size:12.5px; transition:all .2s; }
        .xp-months button:hover { color:var(--cream); border-color:var(--gold) !important; }
        .xp-months button.now { border-style:dashed !important; }
        .xp-months button.on { background:var(--cream); border-color:var(--cream) !important; border-style:solid !important; color:var(--bg); }
        .xp-side-foot { display:flex; align-items:center; justify-content:space-between; gap:12px; padding-top:22px; }
        .xp-side-foot .xp-btn { display:none; flex:1; }

        .xp-list { padding-top:28px; min-width:0; }
        .xp-active { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:18px; font-size:14px; color:var(--muted); }
        .xp-active b { color:var(--cream); font-weight:600; margin-right:6px; }
        .xp-pill { display:inline-flex; align-items:center; gap:8px; height:32px; padding:0 6px 0 13px; border-radius:999px; background:var(--raise); border:1px solid var(--line2); font-size:13px; color:var(--cream); }
        .xp-pill button { width:22px; height:22px; display:grid; place-items:center; border-radius:50%; background:var(--raise2); color:var(--dim); }
        .xp-pill button:hover { color:#E08080; }
        .xp-rows { display:flex; flex-direction:column; gap:18px; }
        .xp-row { display:grid; grid-template-columns:300px minmax(0,1fr) 250px; gap:28px; padding:16px; border-radius:24px; background:var(--raise); border:1px solid var(--border); transition:border-color .4s, box-shadow .5s var(--xp-ease); }
        .xp-row:hover { border-color:color-mix(in srgb, var(--gold) 50%, transparent); box-shadow:var(--xp-shadow); }
        .xp-row-media { position:relative; display:block; height:226px; border-radius:16px; overflow:hidden; background:var(--raise2); }
        .xp-row-media img { width:100%; height:100%; object-fit:cover; transition:transform .9s var(--xp-ease); }
        .xp-row:hover .xp-row-media img { transform:scale(1.04); }
        .xp-row-info { display:flex; flex-direction:column; padding:6px 0; min-width:0; }
        .xp-row-country { font-size:13px; font-weight:500; color:var(--goldText); }
        .xp-row-info h3 { margin-top:10px !important; font-family:var(--serif); font-weight:400; font-size:34px; line-height:1.02; color:var(--cream); }
        .xp-row-info h3 a:hover { color:var(--goldText); }
        .xp-row-info p { margin-top:12px !important; font-size:14.5px; line-height:1.65; color:var(--muted); display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
        .xp-row-tags { display:flex; flex-wrap:wrap; gap:8px; margin-top:auto; padding-top:16px; }
        .xp-row-tags span { height:30px; display:inline-flex; align-items:center; padding:0 12px; border-radius:999px; background:var(--raise2); border:1px solid var(--border); font-size:12.5px; color:var(--muted); }
        .xp-row-facts { display:flex; flex-direction:column; padding:6px 4px 4px 24px; border-left:1px solid var(--border); }
        .xp-row-glance { font-size:12.5px; color:var(--dim); margin-bottom:10px; }
        .xp-row-facts dl { display:flex; flex-direction:column; gap:11px; }
        .xp-row-facts dl div { display:flex; justify-content:space-between; gap:10px; font-size:13.5px; }
        .xp-row-facts dt { display:flex; align-items:center; gap:7px; color:var(--dim); white-space:nowrap; }
        .xp-row-facts dd { color:var(--cream); text-align:right; font-variant-numeric:tabular-nums; }
        .xp-row-acts { display:flex; gap:8px; margin-top:auto; padding-top:16px; }
        .xp-row-acts .xp-btn { flex:1; height:44px; padding:0 14px; font-size:13.5px; }
        button.xp-save { width:44px; height:44px; flex-shrink:0; display:grid; place-items:center; border-radius:50%; border:1px solid var(--line2); background:transparent; color:var(--muted); transition:all .3s; }
        .xp-save:hover { border-color:var(--gold); color:var(--goldText); }
        .xp-save.on { color:#D9545C; border-color:#D9545C; }
        .xp-skel .xp-row-media, .xp-skel-lines i { background:linear-gradient(90deg, color-mix(in srgb, var(--border) 40%, transparent) 0%, color-mix(in srgb, var(--border) 90%, transparent) 50%, color-mix(in srgb, var(--border) 40%, transparent) 100%); background-size:200% 100%; animation:shimmer 1.6s infinite; }
        .xp-skel-lines { display:flex; flex-direction:column; gap:12px; padding-top:10px; }
        .xp-skel-lines i { display:block; height:14px; border-radius:6px; }
        .xp-skel-lines i:nth-child(1) { width:30%; }
        .xp-skel-lines i:nth-child(2) { width:70%; height:26px; }
        .xp-skel-lines i:nth-child(3) { width:90%; }
        .xp-empty { padding:72px 20px; text-align:center; border:1px dashed var(--line2); border-radius:24px; }
        .xp-empty h3 { font-family:var(--serif); font-weight:300; font-size:36px; color:var(--cream); }
        .xp-empty p { margin:10px 0 24px !important; font-size:14.5px; color:var(--dim); }
        .xp-pager { display:flex; align-items:center; justify-content:space-between; margin-top:20px; font-size:14px; color:var(--dim); }
        .xp-list .route-grid { grid-template-columns:repeat(3,1fr); }

        /* ---------- Tablet & Handy */
        @media (max-width:1100px) {
          .xp-row { grid-template-columns:240px minmax(0,1fr); }
          .xp-row-facts { grid-column:1 / -1; border-left:none; border-top:1px solid var(--border); padding:16px 4px 0; }
          .xp-row-facts dl { display:grid; grid-template-columns:repeat(2,1fr); gap:10px 24px; }
          .xp-list .route-grid { grid-template-columns:repeat(2,1fr); }
        }
        @media (max-width:900px) {
          .xp-main { grid-template-columns:1fr; }
          .xp-filter-btn { display:inline-flex !important; }
          .xp-side { -webkit-mask-image:none; mask-image:none; margin:0; position:fixed; top:auto; left:0; right:0; bottom:0; z-index:420; max-height:82vh; padding:18px 20px 22px; border-radius:24px 24px 0 0; background:var(--bg); border-top:1px solid var(--line2); box-shadow:0 -30px 80px rgba(0,0,0,0.45); transform:translateY(105%); transition:transform .45s var(--xp-ease); }
          .xp-side.open { transform:none; }
          .xp-side-top { display:flex; align-items:center; justify-content:space-between; padding-bottom:12px; }
          .xp-side-top b { font-family:var(--serif); font-weight:400; font-size:26px; color:var(--cream); }
          button.xp-side-close { width:36px; height:36px; display:grid; place-items:center; border-radius:50%; border:1px solid var(--line2); background:none; color:var(--cream); }
          .xp-side-backdrop { display:block; position:fixed; inset:0; z-index:410; background:rgba(0,0,0,0.5); opacity:0; pointer-events:none; transition:opacity .3s; }
          .xp-side-backdrop.open { opacity:1; pointer-events:auto; }
          .xp-side-foot .xp-btn { display:inline-flex; }
          .xp-side-foot { position:sticky; bottom:-22px; margin:0 -20px -22px; padding:14px 20px 22px; background:var(--bg); border-top:1px solid var(--border); }
          .xp-cat-head { flex-direction:column; align-items:flex-start; }
          .xp-tools { flex-wrap:wrap; }
        }
        @media (max-width:760px) {
          .xp-hero { min-height:auto; padding:120px 20px 96px; }
          .xp-search { flex-wrap:wrap; border-radius:26px; gap:8px; }
          .xp-q { flex:1 1 100%; background:rgba(255,255,255,0.08); }
          button.xp-opt { flex:1 1 0; min-width:0; height:54px; padding:0 14px 0 18px; justify-content:space-between; }
          .xp-opt > span > span { max-width:100%; }
          .xp-find { flex:1 1 100%; height:52px; }
          .xp-pop-where, .xp-pop-length, .xp-pop-suggest { left:0; right:0; width:auto; }
          .xp-hint { display:none; }
          .xp-stats { gap:18px; font-size:12.5px; flex-wrap:wrap; justify-content:center; }
          .xp-now, .xp-dots { bottom:40px; }
          .xp-now { max-width:60%; }
          .xp-row { grid-template-columns:1fr; gap:16px; padding:12px; }
          .xp-row-media { height:200px; }
          .xp-row-info { padding:0 4px; }
          .xp-row-info h3 { font-size:28px; }
          .xp-row-facts { padding:14px 4px 4px; }
          .xp-row-facts dl { grid-template-columns:1fr; gap:9px; }
          .xp-list .route-grid { grid-template-columns:1fr 1fr; }
          .xp-view button { padding:0 12px; }
          .xp-pager { flex-direction:column; gap:14px; }
        }
        @media (max-width:480px) {
          .xp-list .route-grid { grid-template-columns:1fr; }
          .xp-tools .xp-view { display:none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .xp-slide, .xp-slide img { transition:none; }
          .xp-slide.on img { transform:scale(1.02); }
          .xp-pop, .xp-menu { animation:none; }
        }

        .empty-state { text-align:center; padding:80px 20px; }
        .empty-state h3 { font-family:var(--serif); font-size:40px; font-weight:300; font-style:italic; color:var(--cream); margin-bottom:12px; }
        .empty-state p { font-size:14px; color:var(--dim); font-weight:300; margin-bottom:28px; }

        .footer { background:var(--bg); border-top:1px solid var(--border); padding:56px clamp(24px,5vw,80px) 28px; }
        .footer-inner { max-width:1200px; margin:0 auto; }
        .footer-top { display:grid; grid-template-columns:1.1fr 1fr 1fr 1fr 1fr; gap:28px; padding-bottom:40px; border-bottom:1px solid var(--border); margin-bottom:22px; }
        .footer-brand { font-size:11px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--cream); line-height:1.2; margin-bottom:12px; }
        .footer-logo-container { width:220px; height:147px; display:flex; align-items:center; flex-shrink:0; }
        .footer-logo-img { height:auto; display:block; }
        .footer-logo-light { width:180px; }
        .footer-logo-dark  { width:220px; filter:invert(33%) sepia(46%) saturate(600%) hue-rotate(4deg) brightness(96%) drop-shadow(0 4px 10px rgba(0,0,0,0.6)); }
        .footer-tagline { font-size:12px; color:var(--dim); line-height:1.7; font-weight:300; margin-bottom:18px; max-width:200px; }
        .footer-col-title { font-size:9px; font-weight:800; letter-spacing:0.28em; text-transform:uppercase; color:var(--dim); margin-bottom:16px; }
        .footer-col a { display:block; font-size:12px; color:var(--dim); margin-bottom:10px; font-weight:300; transition:color .2s; }
        .footer-col a:hover { color:var(--cream); }
        .footer-bottom { display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; }
        .footer-copy { font-size:10px; color:var(--dim); letter-spacing:0.08em; text-transform:uppercase; }
        .footer-controls { display:flex; align-items:center; gap:22px; flex-wrap:wrap; }
        .footer-legal { display:flex; gap:22px; }
        .footer-legal a { font-size:10px; color:var(--dim); letter-spacing:0.08em; text-transform:uppercase; transition:color .2s; }
        .footer-legal a:hover { color:var(--cream); }

        .footer-lang-wrap { position:relative; }
        .footer-lang-btn { display:flex; align-items:center; gap:6px; padding:8px 14px; border:none; border-radius:999px; background:none; font-size:16px; font-weight:400; letter-spacing:0.12em; text-transform:uppercase; color:var(--muted); transition:color .2s, border-color .2s; }
        .footer-lang-btn:hover { color:var(--cream); }
        .footer-lang-menu { position:absolute; bottom:calc(100% + 10px); right:0; min-width:150px; background:color-mix(in srgb, var(--bg) 97%, transparent); border:1px solid var(--border); border-radius:12px; overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,0.55); backdrop-filter:blur(24px); z-index:50; animation:dropIn .2s cubic-bezier(0.22,1,0.36,1); }
        .footer-lang-option { display:block; width:100%; text-align:left; padding:10px 14px; font-size:12px; font-weight:500; color:var(--muted); background:none; transition:background .15s,color .15s; }
        .footer-lang-option:hover { background:color-mix(in srgb, var(--border) 60%, transparent); color:var(--cream); }
        .footer-lang-option.active { color:var(--gold); font-weight:700; }

        .scroll-top-btn {
          position: fixed;
          bottom: 28px;
          right: 28px;
          z-index: 250;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: var(--gold);
          color: var(--bg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 12px 32px rgba(201,168,106,0.35), 0 4px 12px rgba(0,0,0,0.25);
          opacity: 0;
          transform: translateY(16px) scale(0.9);
          pointer-events: none;
          transition: opacity .3s ease, transform .3s cubic-bezier(0.22,1,0.36,1), background .25s;
        }
        .scroll-top-btn.visible {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }
        .scroll-top-btn:hover {
          background: #d8b978;
          transform: translateY(-3px) scale(1.04);
        }

        @media (max-width:1100px) {
          .route-grid, .loading-grid { grid-template-columns:repeat(3,1fr); }
          .footer-top { grid-template-columns:1fr 1fr; }
        }
        @media (max-width:760px) {
          .nav-links { display:none; }
          .hero-h1 { font-size:clamp(40px,12vw,64px); }
          .search-bar { flex-direction:column; border-radius:16px; max-width:100%; }
          .search-divider { width:100%; height:1px; margin:0; }
          .search-field { width:100%; }
          .search-btn { margin:8px; padding:16px; }
          .route-grid, .loading-grid { grid-template-columns:1fr 1fr; }
          .toolbar { flex-direction:column; align-items:flex-start; gap:12px; }
          .footer-top { grid-template-columns:1fr; }
          .footer-bottom { flex-direction:column; align-items:flex-start; }
        }
        @media (max-width:480px) {
          .route-grid, .loading-grid { grid-template-columns:1fr; }
        }

        /* ==================================================================
           NEU (Mobile-Design) — ab hier ausschließlich neue Regeln/Klassen.
           Nichts oberhalb dieser Zeile wurde verändert.
           .mobile-only ist standardmäßig unsichtbar und wird nur innerhalb
           der Mobile-Media-Queries wieder eingeblendet -> auf PC bleibt
           alles exakt wie zuvor.
           ================================================================== */

        .mobile-only { display:none; }

        .mobile-menu-btn { width:42px; height:42px; align-items:center; justify-content:center; border:1px solid var(--border); border-radius:50%; color:var(--cream); background:color-mix(in srgb, var(--border) 40%, transparent) !important; flex-shrink:0; }
        .light .nav:not(.scrolled) .mobile-menu-btn { border-color:rgba(255,255,255,0.35); color:#fff; }

        .mobile-nav-backdrop { position:fixed; inset:0; z-index:400; background:rgba(0,0,0,0.55); backdrop-filter:blur(2px); opacity:0; pointer-events:none; transition:opacity .3s; }
        .mobile-nav-backdrop.open { opacity:1; pointer-events:auto; }

        .mobile-nav-drawer { position:fixed; top:50%; left:50%; z-index:401; width:min(380px,88vw); max-height:85vh; overflow-y:auto; background:var(--bg); border:1px solid var(--border); border-radius:26px; box-shadow:0 50px 120px rgba(0,0,0,0.55); opacity:0; pointer-events:none; transform:translate(-50%,-50%) scale(0.94); transition:opacity .28s ease, transform .28s ease; padding:22px 22px 26px; }
        .mobile-nav-drawer.open { opacity:1; pointer-events:auto; transform:translate(-50%,-50%) scale(1); }

        .mobile-nav-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:22px; }
        .mobile-nav-close { width:38px; height:38px; display:flex; align-items:center; justify-content:center; border-radius:50%; border:1px solid var(--border); color:var(--cream); background:none !important; }

        .mobile-nav-links { display:flex; flex-direction:column; gap:4px; margin-bottom:auto; }
        .mobile-nav-link { padding:16px 6px; font-family:var(--serif); font-size:26px; font-weight:300; color:var(--cream); border-bottom:1px solid var(--border); }
        .mobile-nav-link-active { color:var(--gold); }

        .mobile-nav-bottom { display:flex; align-items:center; justify-content:space-between; padding-top:20px; border-top:1px solid var(--border); margin-top:20px; }
        .mobile-nav-login { padding:12px 24px; border:1px solid var(--border); border-radius:999px; font-size:11px; font-weight:700; letter-spacing:0.16em; text-transform:uppercase; color:var(--cream); background:color-mix(in srgb, var(--border) 40%, transparent) !important; }

        .mobile-profile-card { border:1px solid var(--border); border-radius:20px; background:color-mix(in srgb, var(--bg2) 80%, transparent); overflow:hidden; }
        .mobile-profile-card .ud-link { font-size:13px; }
        .mobile-profile-card .ud-header,
        .mobile-profile-card .ud-theme-row,
        .mobile-profile-card .ud-links { padding-left:18px; padding-right:18px; }
        .ud-section-label { font-size:9px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:var(--dim); padding:14px 12px 6px; }

        .load-more-row { display:none; margin-top:28px; }
        button.load-more-btn { width:100%; padding:16px; background:var(--gold); color:var(--bg); border-radius:999px; font-size:10px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; display:flex; align-items:center; justify-content:center; gap:10px; }

        .mobile-toolbar { display:none; gap:12px; margin:24px 0 22px; scroll-margin-top:88px; }
        .mobile-search-pill { position:relative; flex:1; display:flex; align-items:center; gap:10px; padding:15px 18px; border:1px solid var(--border); border-radius:999px; background:color-mix(in srgb, var(--border) 35%, transparent); color:var(--muted); font-size:12px; }
        .mobile-search-pill svg { flex-shrink:0; color:var(--gold); }
        .mobile-search-pill input { flex:1; min-width:0; background:none; border:none; outline:none; font:inherit; color:var(--cream); }
        .mobile-search-pill input::placeholder { color:var(--muted); }
        button.mobile-filter-pill { position:relative; width:50px; height:50px; flex-shrink:0; border-radius:50%; border:1px solid var(--border); background:color-mix(in srgb, var(--border) 35%, transparent) !important; color:var(--cream); display:flex; align-items:center; justify-content:center; }
        .mobile-filter-pill .filter-count { position:absolute; top:-4px; right:-4px; }
        .mobile-search-dropdown { position:absolute; top:calc(100% + 10px); left:0; right:0; z-index:60; background:color-mix(in srgb, var(--bg) 98%, transparent); border:1px solid rgba(201,168,106,0.2); border-radius:16px; overflow:hidden; box-shadow:0 32px 80px rgba(0,0,0,0.5); animation:ddOpen .2s cubic-bezier(0.22,1,0.36,1); }

        .footer-social { display:flex; gap:10px; margin-top:16px; margin-bottom:6px; }
        .footer-social a { width:34px; height:34px; border-radius:50%; border:1px solid var(--border); display:flex; align-items:center; justify-content:center; color:var(--muted); transition:all .2s; }
        .footer-social a:hover { color:var(--gold); border-color:rgba(201,168,106,0.4); }

        .footer-col-header { display:flex; align-items:center; justify-content:space-between; width:100%; background:none !important; border:none; padding:0; cursor:default; pointer-events:none; }
        .footer-col-chevron { color:var(--dim); transition:transform .3s; flex-shrink:0; }
        .footer-col-chevron.open { transform:rotate(180deg); color:var(--gold); }
        .footer-col-links { overflow:visible; max-height:none; }

        @media (max-width:760px) {
          .mobile-menu-btn { display:flex; }
          .ep-user-menu-wrap { display:none; }

          .hero { height:auto; min-height:72vh; padding:120px 0 48px; align-items:flex-end; }
          .hero-inner { align-items:flex-end; }
          .hero-sub { font-size:15px; margin-top:18px; }
          .search-bar { display:none; }

          .mobile-toolbar { display:flex; }
          .toolbar { display:contents; }
          .toolbar > .results-count:not(.mobile-only) { display:none; }
          .toolbar button.filter-btn { display:none; }

          .filter-overlay { z-index:399; }
          .filter-panel {
            position:fixed; top:50%; left:50%; right:auto;
            transform:translate(-50%,-50%);
            width:min(360px,88vw); max-height:78vh; overflow-y:auto;
            border-radius:24px; z-index:400;
            padding:20px;
          }
          .filter-panel-header { margin-bottom:16px; }
          .filter-panel-close { display:flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:50%; border:1px solid var(--border); background:none !important; color:var(--cream); }
          .filter-panel-title { font-size:11px; }
          .filter-section { margin-bottom:16px; }
          .filter-section-title { font-size:8px; margin-bottom:8px; }
          .filter-chips { gap:6px; }
          .filter-chip { padding:6px 12px; font-size:8px; }
          .filter-radio { display:grid; grid-template-columns:1fr 1fr; gap:8px 10px; }
          .filter-radio-item span { font-size:11px; }
          .filter-stars { gap:2px; }
          .filter-star svg { width:16px; height:16px; }
          .filter-country-list { max-height:140px; }
          .filter-country-item span { font-size:12px; }
          .filter-apply-btn { padding:12px; font-size:9px; }

          .load-more-row { display:flex; }
          .results-count.mobile-only { display:block; }
          .route-grid, .loading-grid { grid-template-columns:repeat(2,1fr) !important; gap:12px; }

          .footer-social { display:flex; }
          /* Fix (Grundregel 8): Sprachmenü würde sonst mit right:0 links aus dem
             Viewport ragen, da der Footer auf Mobile untereinander stapelt */
          .footer-lang-menu { left:0; right:auto; }
          .footer-col-header { cursor:pointer; pointer-events:auto; }
          .footer-col-links { display:block; overflow:hidden; max-height:0; transition:max-height .3s ease; }
          .footer-col-links.open { max-height:400px; }
          .footer-col-chevron { display:block; }

          /* NEU: Logo + Tagline + Social-Icons im Footer zentrieren, analog
             zur Homepage/About-Page — vorher linksbündig auf Mobile. */
          .footer-top > div:first-child {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .footer-logo-container {
            margin: 0 auto;
            justify-content: center;
          }

          .footer-tagline {
            margin-left: auto;
            margin-right: auto;
          }

          .footer-social {
            justify-content: center;
          }

          /* NEU: Nach-oben-Button auf Mobile etwas kleiner und näher am Rand */
          .scroll-top-btn {
            width: 46px;
            height: 46px;
            bottom: 20px;
            right: 20px;
          }
        }
      `}</style>

      <div className={`page ${themeClass}`}>
        {/* NAV */}
        <nav className={`nav ${navScrolled ? "scrolled" : ""}`}>
          <Link href="/" className="nav-logo">
            <span>EXPLORE</span>
            <span>SCENIC</span>
            <span>ROUTES</span>
          </Link>

          <div className="nav-links">
            {[["nav.explore", "/explore"], ["nav.planTrip", "/plan"], ["nav.about", "/about"]].map(([key, h]) => (
              <Link key={key} href={h} className={`nav-link ${pathname === h ? "nav-link-active" : ""}`}>{t(key as any)}</Link>
            ))}
            {user && (
              <Link href="/my-trips" className={`nav-link ${pathname === "/my-trips" ? "nav-link-active" : ""}`}>
                {t("nav.myTrips")}
              </Link>
            )}
          </div>

          <div className="nav-right">
            {!user && <ThemeSwitch />}

            {user ? (
              <div className="ep-user-menu-wrap">
                <button className="user-avatar" onClick={() => setShowUserMenu((p) => !p)}>
                  {avatarUrl ? <img src={avatarUrl} alt="avatar" /> : displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                </button>

                {showUserMenu && (
                  <div className="user-dropdown">
                    <div className="ud-header">
                      <div className="ud-avatar">
                        {avatarUrl ? <img src={avatarUrl} alt="avatar" /> : displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p className="ud-name">{displayName}</p>
                        <p className="ud-email">{user.email}</p>
                        <p className="ud-role">{t("common.roleExplorer")}</p>
                      </div>
                    </div>

                    <div className="ud-theme-row">
                      <span className="ud-theme-label">{t("common.theme")}</span>
                      <ThemeSwitch />
                    </div>

                    <div className="ud-links">
                      <Link href="/profile" className="ud-link" onClick={() => setShowUserMenu(false)}><span className="ud-link-icon"><UserIcon size={14} strokeWidth={1.8} /></span> {t("nav.profile")}</Link>
                      <Link href="/my-trips" className="ud-link" onClick={() => setShowUserMenu(false)}><span className="ud-link-icon"><MapIcon size={14} strokeWidth={1.8} /></span> {t("nav.myTrips")}</Link>
                      <Link href="/explore" className="ud-link" onClick={() => setShowUserMenu(false)}><span className="ud-link-icon"><Compass size={14} strokeWidth={1.8} /></span> {t("nav.explore")}</Link>
                      <div className="ud-divider" />
                      <button className="ud-logout" onClick={handleLogout}><span className="ud-link-icon" style={{ color: "#e08080" }}><LogOut size={14} strokeWidth={1.8} /></span> {t("nav.signOut")}</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href={loginHref} className="login-btn">{t("nav.login")}</Link>
            )}

            <button
              className="mobile-menu-btn mobile-only"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Menü öffnen"
            >
              <Menu size={20} strokeWidth={1.8} />
            </button>
          </div>
        </nav>

        <div
          className={`mobile-nav-backdrop ${mobileMenuOpen ? "open" : ""}`}
          onClick={() => setMobileMenuOpen(false)}
        />

        <div className={`mobile-nav-drawer ${mobileMenuOpen ? "open" : ""}`}>
          <div className="mobile-nav-top">
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.18em" }}>EXPLORE SCENIC ROUTES</span>

            <button
              className="mobile-nav-close"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Menü schließen"
            >
              <X size={18} strokeWidth={1.8} />
            </button>
          </div>

          {user ? (
            <div className="mobile-profile-card">
              <div className="ud-header">
                <div className="ud-avatar">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" onError={() => setAvatarUrl("")} />
                  ) : (
                    displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p className="ud-name">{displayName}</p>
                  <p className="ud-email">{user.email}</p>
                  <p className="ud-role">{t("common.roleExplorer")}</p>
                </div>
              </div>

              <div className="ud-theme-row">
                <span className="ud-theme-label">{t("common.theme")}</span>
                <ThemeSwitch />
              </div>

              <div className="ud-links">
                <p className="ud-section-label">{t("nav.navigate")}</p>

                <Link href="/explore" className="ud-link" onClick={() => setMobileMenuOpen(false)}>
                  <span className="ud-link-icon"><Compass size={14} strokeWidth={1.8} /></span>
                  {t("nav.explore")}
                  <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
                </Link>

                <Link href="/about" className="ud-link" onClick={() => setMobileMenuOpen(false)}>
                  <span className="ud-link-icon"><BookOpen size={14} strokeWidth={1.8} /></span>
                  {t("nav.about")}
                  <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
                </Link>

                <div className="ud-divider" />

                <p className="ud-section-label">{t("nav.account")}</p>

                <Link href="/profile" className="ud-link" onClick={() => setMobileMenuOpen(false)}>
                  <span className="ud-link-icon"><UserIcon size={14} strokeWidth={1.8} /></span>
                  {t("nav.profile")}
                  <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
                </Link>

                <Link href="/my-trips" className="ud-link" onClick={() => setMobileMenuOpen(false)}>
                  <span className="ud-link-icon"><MapIcon size={14} strokeWidth={1.8} /></span>
                  {t("nav.myTrips")}
                  <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
                </Link>

                <div className="ud-divider" />

                <button className="ud-logout" onClick={handleLogout}>
                  <span className="ud-link-icon" style={{ color: "#e08080" }}><LogOut size={14} strokeWidth={1.8} /></span>
                  {t("nav.signOut")}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mobile-nav-links">
                {[["nav.explore", "/explore"], ["nav.planTrip", "/plan"], ["nav.about", "/about"]].map(([key, href]) => (
                  <Link
                    key={key}
                    href={href}
                    className={`mobile-nav-link ${pathname === href ? "mobile-nav-link-active" : ""}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t(key as any)}
                  </Link>
                ))}
              </div>

              <div className="mobile-nav-bottom">
                <Link href={loginHref} className="mobile-nav-login" onClick={() => setMobileMenuOpen(false)}>
                  {t("nav.login")}
                </Link>
                <ThemeSwitch />
              </div>
            </>
          )}
        </div>

        {/* HERO: wechselnde Routenfotos, Suche, Kennzahlen */}
        <section className={`xp-hero ${openPanel === "where" || openPanel === "length" || openPanel === "suggest" ? "panel-open" : ""}`}>
          <div className="xp-hero-bg" aria-hidden="true">
            {slides.map((s, i) => (
              <div key={s.src + i} className={`xp-slide ${i === slide ? "on" : ""}`}>
                <img src={s.src} alt="" onError={(e) => { e.currentTarget.src = "/forest.jpg"; }} />
              </div>
            ))}
            <div className="xp-veil" />
          </div>

          <div className="xp-center">
            <h1 className="xp-h1">{tx.title1}<br />{tx.title2}</h1>
            <p className="xp-sub">{tx.sub}</p>

            <div className="xp-sw" ref={searchWrapRef}>
              <div className={`xp-search ${query ? "typing" : ""}`}>
                <label className="xp-q">
                  <Search size={19} strokeWidth={2} />
                  <input
                    type="text"
                    value={query}
                    placeholder={tx.searchPlaceholder}
                    aria-label={tx.searchLabel}
                    role="combobox"
                    aria-expanded={openPanel === "suggest"}
                    aria-controls="xp-suggest"
                    autoComplete="off"
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setActiveSuggestion(0);
                      setOpenPanel(e.target.value.trim().length >= 2 ? "suggest" : "");
                    }}
                    onFocus={() => { if (query.trim().length >= 2) setOpenPanel("suggest"); }}
                    onKeyDown={onSearchKey}
                  />
                  {query && (
                    <button type="button" className="xp-clear" aria-label={tx.clear} onClick={() => { setQuery(""); setAppliedQuery(""); setOpenPanel(""); }}>
                      <X size={13} strokeWidth={2.4} />
                    </button>
                  )}
                </label>

                <button
                  type="button"
                  className={`xp-opt ${openPanel === "where" ? "open" : ""} ${countriesSel.length ? "set" : ""}`}
                  aria-expanded={openPanel === "where"}
                  onClick={() => setOpenPanel((p) => (p === "where" ? "" : "where"))}
                >
                  <span><small>{tx.where}</small><span>{whereLabel}</span></span>
                  <ChevronDown size={14} strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  className={`xp-opt ${openPanel === "length" ? "open" : ""} ${timeSel ? "set" : ""}`}
                  aria-expanded={openPanel === "length"}
                  onClick={() => setOpenPanel((p) => (p === "length" ? "" : "length"))}
                >
                  <span><small>{tx.howLong}</small><span>{timeLabel(timeSel)}</span></span>
                  <ChevronDown size={14} strokeWidth={2.2} />
                </button>
                <button type="button" className="xp-btn xp-find" onClick={runSearch}>{tx.find}</button>
              </div>

              {/* Vorschläge beim Tippen */}
              {openPanel === "suggest" && (
                <div className="xp-pop xp-pop-suggest" id="xp-suggest" role="listbox">
                  {suggestionCount === 0 ? (
                    <p className="xp-pop-empty">{fill(tx.sugNone, { q: query.trim() })}</p>
                  ) : (
                    <>
                      {suggestions.routes.length > 0 && <div className="xp-pl">{tx.sugRoutes}</div>}
                      {suggestions.routes.map((r, i) => (
                        <button
                          key={r.id}
                          type="button"
                          role="option"
                          aria-selected={activeSuggestion === i}
                          className={`xp-sr ${activeSuggestion === i ? "on" : ""}`}
                          onMouseEnter={() => setActiveSuggestion(i)}
                          onClick={() => pickSuggestion(i)}
                        >
                          <img src={r.image_url || "/forest.jpg"} alt="" />
                          <span>
                            <b>{highlight(localized(r, "title", lang) || r.title)}</b>
                            <small>{[r.country, r.distance_km ? `${Math.round(Number(r.distance_km))} km` : ""].filter(Boolean).join(", ")}</small>
                          </span>
                          <em>{activeSuggestion === i ? "Enter" : ""}</em>
                        </button>
                      ))}
                      {suggestions.regions.length > 0 && <div className="xp-pl">{tx.sugRegions}</div>}
                      {suggestions.regions.map(([c, n], j) => {
                        const i = suggestions.routes.length + j;
                        return (
                          <button
                            key={c}
                            type="button"
                            role="option"
                            aria-selected={activeSuggestion === i}
                            className={`xp-sr ${activeSuggestion === i ? "on" : ""}`}
                            onMouseEnter={() => setActiveSuggestion(i)}
                            onClick={() => pickSuggestion(i)}
                          >
                            <span className="xp-sr-ic"><MapPin size={16} strokeWidth={1.8} /></span>
                            <span><b>{highlight(c)}</b><small>{fill(tx.sugRoutesCount, { n })}</small></span>
                            <em>{activeSuggestion === i ? "Enter" : ""}</em>
                          </button>
                        );
                      })}
                    </>
                  )}
                  <button type="button" className="xp-pf" onClick={runSearch}>
                    <span>{fill(tx.sugAll, { q: query.trim() })}</span>
                    <kbd>Enter</kbd>
                  </button>
                </div>
              )}

              {/* Länder */}
              {openPanel === "where" && (
                <div className="xp-pop xp-pop-where">
                  <label className="xp-mini">
                    <Search size={15} strokeWidth={2} />
                    <input type="text" value={countrySearch} placeholder={tx.findCountry} onChange={(e) => setCountrySearch(e.target.value)} autoFocus />
                  </label>
                  <div className="xp-pop-list">
                    {visibleCountries.map(([c, n]) => (
                      <label key={c} className={`xp-check ${countriesSel.includes(c) ? "on" : ""}`}>
                        <input type="checkbox" checked={countriesSel.includes(c)} onChange={() => toggleCountry(c)} />
                        <i><Check size={12} strokeWidth={3} /></i>{c}<em>{n}</em>
                      </label>
                    ))}
                  </div>
                  <div className="xp-pop-foot">
                    <button type="button" className="xp-link" onClick={() => setCountriesSel([])}>{tx.clear}</button>
                    <button type="button" className="xp-btn" onClick={() => { setOpenPanel(""); scrollToResults(); }}>
                      {fill(tx.showN, { n: countAfterCountries })}
                    </button>
                  </div>
                </div>
              )}

              {/* Dauer */}
              {openPanel === "length" && (
                <div className="xp-pop xp-pop-length">
                  {renderTimeFilter("pop")}
                  <div className="xp-pop-foot">
                    <button type="button" className="xp-link" onClick={() => setTimeSel(null)}>{tx.clear}</button>
                    <button type="button" className="xp-btn" onClick={() => { setOpenPanel(""); scrollToResults(); }}>
                      {fill(tx.showN, { n: countInTime })}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <p className="xp-hint">{tx.hint}</p>
            {!loading && routes.length > 0 && (
              <div className="xp-stats">
                <span><b>{routes.length}</b> {tx.statRoutes}</span>
                <span><b>{countryCounts.length}</b> {tx.statCountries}</span>
                {openThisMonth !== null && <span><b>{openThisMonth}</b> {tx.statOpen}</span>}
              </div>
            )}
          </div>

          {slides[slide]?.route && (
            <Link href={`/routedetail/${slides[slide].route!.id}`} prefetch={false} className="xp-now">
              {tx.nowShowing} <b>{localized(slides[slide].route!, "title", lang) || slides[slide].route!.title}</b>, {slides[slide].route!.country}
            </Link>
          )}
          {slides.length > 1 && (
            <div className="xp-dots">
              {slides.map((s, i) => (
                <button key={s.src + i} type="button" className={i === slide ? "on" : ""} aria-label={`${i + 1} / ${slides.length}`} onClick={() => setSlide(i)}><i /></button>
              ))}
            </div>
          )}
        </section>

        {/* ALLE ROUTEN */}
        <section className="xp-cat" ref={resultsRef}>
          <div className="xp-cat-head">
            <div>
              <h2>{tx.allRoutes}</h2>
              <p>{tx.allRoutesSub}</p>
            </div>
            <div className="xp-tools">
              <button type="button" className="xp-tool xp-filter-btn" onClick={() => setFiltersOpen(true)}>
                <SlidersHorizontal size={15} strokeWidth={2} /> {tx.filters}
                {activeChips.length > 0 && <span className="xp-count">{activeChips.length}</span>}
              </button>
              <div className="xp-sort" ref={sortRef}>
                <button type="button" className="xp-tool" aria-expanded={openPanel === "sort"} onClick={() => setOpenPanel((p) => (p === "sort" ? "" : "sort"))}>
                  <span className="xp-tool-dim">{tx.sortBy}</span> {sortLabels[sort]} <ChevronDown size={14} strokeWidth={2.2} />
                </button>
                {openPanel === "sort" && (
                  <div className="xp-menu" role="listbox">
                    {(Object.keys(sortLabels) as SortKey[]).map((k) => (
                      <button key={k} type="button" role="option" aria-selected={sort === k} className={sort === k ? "on" : ""} onClick={() => { setSort(k); setOpenPanel(""); }}>
                        {sortLabels[k]} {sort === k && <Check size={14} strokeWidth={2.4} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="xp-view" role="group" aria-label="View">
                <button type="button" className={view === "list" ? "on" : ""} aria-pressed={view === "list"} onClick={() => setView("list")}><LayoutList size={15} strokeWidth={2} /> {tx.list}</button>
                <button type="button" className={view === "grid" ? "on" : ""} aria-pressed={view === "grid"} onClick={() => setView("grid")}><LayoutGrid size={15} strokeWidth={2} /> {tx.grid}</button>
              </div>
            </div>
          </div>

          <div className="xp-main">
            {/* Filterleiste — auf dem Handy als Overlay */}
            <div className={`xp-side-backdrop ${filtersOpen ? "open" : ""}`} onClick={() => setFiltersOpen(false)} />
            <aside ref={sideRef} className={`xp-side ${filtersOpen ? "open" : ""}`} aria-label={tx.filters}>
              <div className="xp-side-top">
                <b>{tx.filters}</b>
                <button type="button" className="xp-side-close" aria-label={tx.close} onClick={() => setFiltersOpen(false)}><X size={16} strokeWidth={2} /></button>
              </div>

              <div className="xp-group">
                <div className="xp-gh"><b>{tx.country}</b>{countriesSel.length > 0 && <button type="button" className="xp-link" onClick={() => setCountriesSel([])}>{tx.clear}</button>}</div>
                {/* Länder als Pillen — ein Klick setzt den Filter sofort */}
                <div className="xp-cpills">
                  {countryPills.map(([c, n]) => (
                    <button key={c} type="button" className={countriesSel.includes(c) ? "on" : ""} aria-pressed={countriesSel.includes(c)} onClick={() => toggleCountry(c)}>
                      {c}<em>{n}</em>
                    </button>
                  ))}
                  {(hiddenCountries > 0 || allCountriesShown) && countriesByCount.length > COUNTRY_PREVIEW && (
                    <button type="button" className="xp-cmore" aria-expanded={allCountriesShown} onClick={() => setAllCountriesShown((v) => !v)}>
                      {allCountriesShown ? tx.showLess : fill(tx.moreN, { n: hiddenCountries })}
                      <ChevronDown size={13} strokeWidth={2.2} />
                    </button>
                  )}
                </div>
              </div>

              <div className="xp-group">
                <div className="xp-gh"><b>{tx.driveTime}</b>{timeSel && <button type="button" className="xp-link" onClick={() => setTimeSel(null)}>{tx.clear}</button>}</div>
                {renderTimeFilter("side")}
              </div>

              <div className="xp-group">
                <div className="xp-gh"><b>{tx.month}</b>{monthsSel.length > 0 ? <button type="button" className="xp-link" onClick={() => setMonthsSel([])}>{tx.clear}</button> : <span className="xp-gh-dim">{tx.anyMonth}</span>}</div>
                <div className="xp-months">
                  {tx.months.map((m, i) => (
                    <button key={m} type="button" className={`${monthsSel.includes(i) ? "on" : ""} ${i === currentMonth ? "now" : ""}`} aria-pressed={monthsSel.includes(i)} onClick={() => toggleMonth(i)}>{m}</button>
                  ))}
                </div>
              </div>

              {types.length > 0 && (
                <div className="xp-group">
                  <div className="xp-gh"><b>{tx.character}</b></div>
                  <div className="xp-tags">
                    {types.map((v) => (
                      <button key={v} type="button" className={typesSel.includes(v) ? "on" : ""} aria-pressed={typesSel.includes(v)} onClick={() => toggleType(v)}>{v}</button>
                    ))}
                  </div>
                </div>
              )}

              <div className="xp-side-foot">
                {activeChips.length > 0 && <button type="button" className="xp-link" onClick={clearAll}>{tx.resetAll}</button>}
                <button type="button" className="xp-btn" onClick={() => { setFiltersOpen(false); scrollToResults(); }}>
                  {fill(tx.showN, { n: filtered.length })}
                </button>
              </div>
            </aside>

            <div className="xp-list">
              <div className="xp-active">
                <b>{loading ? tx.loading : filtered.length === 1 ? tx.oneRoute : fill(tx.nRoutes, { n: filtered.length })}</b>
                {activeChips.map((chip) => (
                  <span key={chip.key} className="xp-pill">{chip.label}<button type="button" aria-label={`${tx.clear}: ${chip.label}`} onClick={chip.remove}><X size={11} strokeWidth={2.6} /></button></span>
                ))}
                {activeChips.length > 1 && <button type="button" className="xp-link" onClick={clearAll}>{tx.resetAll}</button>}
              </div>

              {loading ? (
                <div className="xp-rows">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="xp-row xp-skel"><div className="xp-row-media" /><div className="xp-skel-lines"><i /><i /><i /></div><div /></div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="xp-empty">
                  <h3>{tx.empty}</h3>
                  <p>{tx.emptySub}</p>
                  <button type="button" className="xp-btn-line" onClick={clearAll}>{tx.resetAll}</button>
                </div>
              ) : view === "list" ? (
                <div className="xp-rows">{shown.map((route) => renderRow(route))}</div>
              ) : (
                <div className="route-grid">
                  {shown.map((route) => (
                    <RouteCard
                      key={route.id}
                      route={route}
                      viewRouteLabel={t("explore.viewRoute")}
                      saved={savedRoutes.includes(route.id)}
                      onToggleSave={toggleSave}
                    />
                  ))}
                </div>
              )}

              {!loading && filtered.length > 0 && (
                <div className="xp-pager">
                  <span>{fill(tx.showing, { a: shown.length, b: filtered.length })}</span>
                  {shown.length < filtered.length && (
                    <button type="button" className="xp-btn-line" onClick={() => setVisibleCount(shownCount + pageSize)}>{tx.showMore}</button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>



        {/* FOOTER */}
        <footer className="footer">
          <div className="footer-inner">
            <div className="footer-top">
              <div>
                <div className="footer-logo-container">
                  <img
                    src="/logodark.png"
                    alt="Scenic Routes"
                    className={`footer-logo-img ${isLight ? "footer-logo-light" : "footer-logo-dark"}`}
                  />
                </div>

                <p className="footer-tagline">
                  {t("home.footer.tagline")}
                </p>

                <div className="footer-social mobile-only">
                  <a href="#" aria-label="Instagram"><InstagramIcon size={15} strokeWidth={1.8} /></a>
                  <a href="#" aria-label="YouTube"><YoutubeIcon size={15} strokeWidth={1.8} /></a>
                  <a href="#" aria-label="E-Mail"><Mail size={15} strokeWidth={1.8} /></a>
                </div>
              </div>

              {FOOTER_COLUMNS.map(({ id, headingKey, links }) => {
                const isOpen = openFooterSection === id;
                return (
                  <div className="footer-col" key={id}>
                    {/* NEU (Mobile): Header ist auf Mobile klickbar (Akkordeon).
                        Auf PC ohne Wirkung/Klickbarkeit, da die Collapse-Styles
                        nur innerhalb der Mobile-Media-Query existieren. */}
                    <button
                      className="footer-col-header"
                      onClick={() => setOpenFooterSection(isOpen ? null : id)}
                    >
                      <p className="footer-col-title" style={{ marginBottom: 0 }}>{t(headingKey)}</p>
                      <ChevronDown size={14} className={`footer-col-chevron mobile-only ${isOpen ? "open" : ""}`} />
                    </button>

                    <div className={`footer-col-links ${isOpen ? "open" : ""}`}>
                      <div style={{ paddingTop: 14 }}>
                        {links.map(({ key, href, protected: isProtected, ...rest }) => {
                          // Geschützte Links (My Trips, Profile, Traveller Pass) gehen
                          // ohne Session erst zum Login, mit redirect zurück zum Ziel —
                          // gleiches Verhalten wie in der Navbar (loginHref).
                          // loggedInHref (z.B. Support-Links): eingeloggte User werden
                          // stattdessen direkt auf ein alternatives Ziel geleitet (z.B.
                          // den Support-Tab im Profil), ohne dass ein Login erzwungen wird.
                          const loggedInHref = (rest as { loggedInHref?: string }).loggedInHref;
                          const finalHref =
                            isProtected && !user
                              ? `/login?redirect=${encodeURIComponent(href)}`
                              : user && loggedInHref
                              ? loggedInHref
                              : href;

                          return (
                            <Link href={finalHref} key={key}>
                              {t(key)}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="footer-bottom">
              <p className="footer-copy">
                © {new Date().getFullYear()} Explore Scenic Routes. {t("home.footer.rights")}
              </p>

              <div className="footer-controls">
                <div className="footer-lang-wrap">
                  <button
                    className="footer-lang-btn"
                    onClick={() => setShowLangMenu((p) => !p)}
                  >
                    <Globe size={12} strokeWidth={2} /> {lang.toUpperCase()}
                  </button>

                  {showLangMenu && (
                    <div className="footer-lang-menu">
                      <button
                        className={`footer-lang-option ${lang === "en" ? "active" : ""}`}
                        onClick={() => { setLang("en"); setShowLangMenu(false); }}
                      >
                        English
                      </button>
                      <button
                        className={`footer-lang-option ${lang === "de" ? "active" : ""}`}
                        onClick={() => { setLang("de"); setShowLangMenu(false); }}
                      >
                        Deutsch
                      </button>
                      <button
                        className={`footer-lang-option ${lang === "ru" ? "active" : ""}`}
                        onClick={() => { setLang("ru"); setShowLangMenu(false); }}
                      >
                        Русский
                      </button>
                    </div>
                  )}
                </div>

                <ThemeSwitch />
              </div>
            </div>
          </div>
        </footer>

        <button
          className={`scroll-top-btn ${showScrollTop && !filtersOpen ? "visible" : ""}`}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Nach oben scrollen"
        >
          <ArrowUp size={20} strokeWidth={2.4} />
        </button>
      </div>
    </>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={null}>
      <ExplorePageInner />
    </Suspense>
  );
}