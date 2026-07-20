"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useTheme } from "next-themes";
import { ThemeSwitch } from "../components/ThemeSwitch";
import { useUnit } from "../UnitContext";
import { useLanguage } from "../LanguageContext";
import { formatDistance } from "@/lib/formatDistance";
import {
  SlidersHorizontal, ChevronDown, Star, X, CornerDownRight,
  User as UserIcon, Map as MapIcon, Compass, LogOut, Clock, Navigation, Heart, ArrowRight, Globe,
  Menu, ChevronRight, MapPin, Mail, BookOpen, Search, ArrowUp,
} from "lucide-react";

type Route = {
  id: string;
  title: string;
  country: string;
  distance_km?: number;
  image_url?: string;
  duration?: string;
  type?: string;
  terrain?: string;
  description?: string;
  rating?: number;
};

// Feste, logische Reihenfolge (kurz → lang) statt alphabetischer Sortierung
const DURATION_ORDER = ["Half day", "Full day", "Weekend trip", "Multi-day journey"];
function sortByDurationLength(a: string, b: string) {
  const idxA = DURATION_ORDER.findIndex((d) => a.startsWith(d));
  const idxB = DURATION_ORDER.findIndex((d) => b.startsWith(d));
  return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
}

// NEU (Mobile): Footer-Linkdaten mit stabiler id fürs Akkordeon
const FOOTER_COLUMNS = [
  { id: "explore", headingKey: "footer.col.explore" as const, linkKeys: ["footer.link.allRoutes", "footer.link.myTrips", "footer.link.profile"] as const },
  { id: "about", headingKey: "footer.col.about" as const, linkKeys: ["footer.link.travellerPass", "footer.link.about", "footer.link.ourTeam"] as const },
  { id: "support", headingKey: "footer.col.support" as const, linkKeys: ["footer.link.faq", "footer.link.contact", "footer.link.reportProblem", "footer.link.reportRouteIssue"] as const },
  { id: "legal", headingKey: "footer.col.legal" as const, linkKeys: ["footer.link.termsOfUse", "footer.link.privacyPolicy", "footer.link.imprint"] as const },
];

// NEU (Mobile): wie viele Route-Cards initial + pro "Load more"-Klick angezeigt werden
const MOBILE_PAGE_SIZE = 6;

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
  const { unit } = useUnit();
  const { t, lang, setLang } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const currentQueryForLogin = searchParams.toString();
  const loginRedirect = `${pathname}${currentQueryForLogin ? `?${currentQueryForLogin}` : ""}`;
  const loginHref = `/login?redirect=${encodeURIComponent(loginRedirect)}`;

  const [selected, setSelected] = useState(
    searchParams.get("destination") || searchParams.get("country") || ""
  );
  const [selectedDate, setSelectedDate] = useState(
    searchParams.get("duration") || ""
  );
  const [appliedSelected, setAppliedSelected] = useState(selected);
  const [appliedSelectedDate, setAppliedSelectedDate] = useState(selectedDate);
  const [filters, setFilters] = useState<{
    difficulty: string[];
    minRating: number;
    countries: string[];
  }>({
    difficulty: searchParams.get("terrain")?.split(",").filter(Boolean) || [],
    minRating: Number(searchParams.get("rating") || 0),
    countries: searchParams.get("countries")?.split(",").filter(Boolean) || [],
  });

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const params = new URLSearchParams();
    if (appliedSelected) params.set("destination", appliedSelected);
    if (appliedSelectedDate) params.set("duration", appliedSelectedDate);
    if (filters.difficulty.length > 0) params.set("terrain", filters.difficulty.join(","));
    if (filters.minRating > 0) params.set("rating", String(filters.minRating));
    if (filters.countries.length > 0) params.set("countries", filters.countries.join(","));
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedSelected, appliedSelectedDate, filters]);

  const [isOpen, setIsOpen] = useState(false);
  const [isOpenDate, setIsOpenDate] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState<string[]>([]);
  const [durations, setDurations] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [savedRoutes, setSavedRoutes] = useState<string[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [navScrolled, setNavScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false); // NEU: steuert Sichtbarkeit des Nach-oben-Buttons
  const [username, setUsername] = useState("");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const searchBarRef = useRef<HTMLDivElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  // NEU (Desktop, auf Wunsch): Ref für das Inline-Eingabefeld im Country-Suchfeld
  const countryInputRef = useRef<HTMLInputElement | null>(null);
  // NEU (Desktop, auf Wunsch): eigener Suchtext + Ref für das Inline-Eingabefeld im Duration-Feld
  const [durationSearch, setDurationSearch] = useState("");
  const durationInputRef = useRef<HTMLInputElement | null>(null);
  const displayName = username || user?.email?.split("@")[0] || "";

  // NEU (Mobile): Hamburger-Menü, Footer-Akkordeon, Pagination
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFooterSection, setOpenFooterSection] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [visibleCount, setVisibleCount] = useState(MOBILE_PAGE_SIZE);

  // NEU (Mobile): eigenständiges Such-Dropdown für die mobile Toolbar,
  // bewusst getrennt vom Desktop-Such-State (isOpen/countrySearch), damit
  // an der Desktop-Logik nichts verändert werden muss
  const [mobileCountryOpen, setMobileCountryOpen] = useState(false);
  const [mobileCountrySearch, setMobileCountrySearch] = useState("");
  const mobileSearchRef = useRef<HTMLDivElement | null>(null);

  const mobileFilteredCountries = mobileCountrySearch.trim()
    ? countries.filter((c) => c.toLowerCase().includes(mobileCountrySearch.trim().toLowerCase()))
    : countries;

  useEffect(() => {
    if (!mobileCountryOpen) return;
    const handler = (e: MouseEvent) => {
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(e.target as Node)) {
        setMobileCountryOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mobileCountryOpen]);

  const isLight = mounted && theme === "light";
  const themeClass = isLight ? "light" : "dark";

  const toggleFilter = (key: "difficulty" | "countries", value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v: string) => v !== value)
        : [...prev[key], value],
    }));
  };

  const clearAllFilters = () => {
    setSelected(""); setSelectedDate(""); setAppliedSelected(""); setAppliedSelectedDate("");
    setFilters({ difficulty: [], minRating: 0, countries: [] });
  };

  const activeFilterCount =
    filters.difficulty.length + filters.countries.length +
    (filters.minRating > 0 ? 1 : 0) +
    (appliedSelected ? 1 : 0) + (appliedSelectedDate ? 1 : 0);

  const filteredCountries = countrySearch.trim()
    ? countries.filter((c) => c.toLowerCase().includes(countrySearch.trim().toLowerCase()))
    : countries;

  // NEU (Desktop, auf Wunsch): Durations werden beim Tippen im Feld live gefiltert
  const filteredDurations = durationSearch.trim()
    ? durations.filter((d) => d.toLowerCase().includes(durationSearch.trim().toLowerCase()))
    : durations;

  useEffect(() => {
    if (!isOpen && !isOpenDate) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchBarRef.current && !searchBarRef.current.contains(target)) {
        setIsOpen(false); setIsOpenDate(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setIsOpen(false); setIsOpenDate(false); }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, isOpenDate]);

  useEffect(() => {
    const onScroll = () => {
      setNavScrolled(window.scrollY > 40);
      setShowScrollTop(window.scrollY > 600); // NEU: Button erscheint erst nach etwas Scroll-Strecke
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { if (!isOpen) setCountrySearch(""); }, [isOpen]);
  // NEU (Desktop, auf Wunsch): Duration-Suchtext beim Schließen zurücksetzen
  useEffect(() => { if (!isOpenDate) setDurationSearch(""); }, [isOpenDate]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (user) fetchSavedRoutes(); }, [user]);

  // NEU (Mobile): erkennt, ob wir uns im Mobile-Breakpoint befinden (JS-seitig),
  // damit die Pagination NUR auf Mobile greift — Desktop zeigt weiterhin,
  // wie bisher, alle Routen ohne "Load more" auf einmal an.
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 760);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // NEU (Mobile): Pagination zurücksetzen, sobald sich die Ergebnisliste ändert
  // (neue Filter, neue Suche, etc.)
  useEffect(() => {
    setVisibleCount(MOBILE_PAGE_SIZE);
  }, [routes]);

  async function fetchSavedRoutes() {
    if (!user) return;
    const { data } = await supabase.from("saved_routes").select("route_id").eq("user_id", user.id);
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
    if (isSaved) {
      await supabase.from("saved_routes").delete().eq("user_id", user.id).eq("route_id", routeId);
      setSavedRoutes((prev) => prev.filter((id) => id !== routeId));
    } else {
      await supabase.from("saved_routes").insert({ user_id: user.id, route_id: routeId });
      setSavedRoutes((prev) => [...prev, routeId]);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null); setSavedRoutes([]); setShowUserMenu(false);
    setMobileMenuOpen(false);
  }

  async function fetchCountries() {
    const { data } = await supabase.from("routes").select("country");
    if (data) {
      const uniqueCountries = Array.from(new Set(
        data.map((r: any) => r.country)
          .filter((c: unknown): c is string => typeof c === "string" && c.trim() !== "")
      )).sort();
      setCountries(uniqueCountries);
    }
  }

  async function fetchDurations() {
    const { data } = await supabase.from("routes").select("duration");
    if (data) {
      const uniqueDurations = Array.from(new Set(
        data.map((r: any) => r.duration)
          .filter((d: unknown): d is string => typeof d === "string" && d.trim() !== "")
      )).sort(sortByDurationLength);
      setDurations(uniqueDurations);
    }
  }

  async function fetchRoutes() {
    setLoading(true);
    let query = supabase.from("routes").select("*");
    if (appliedSelected && appliedSelected !== "Choose destination") query = query.eq("country", appliedSelected);
    if (appliedSelectedDate && appliedSelectedDate !== "Choose duration") query = query.eq("duration", appliedSelectedDate);
    if (filters.countries.length > 0) query = query.in("country", filters.countries);
    if (filters.difficulty.length > 0) query = query.in("terrain", filters.difficulty);
    if (filters.minRating > 0) query = query.gte("rating", filters.minRating);
    const { data } = await query;
    if (data) setRoutes(data);
    setLoading(false);
  }

  useEffect(() => { fetchCountries(); fetchDurations(); }, []);
  useEffect(() => { fetchRoutes(); }, [appliedSelected, appliedSelectedDate, filters]);

  useEffect(() => {
    if (!user) { setAvatarUrl(""); setUsername(""); return; }
    supabase.from("profiles").select("avatar_url, username").eq("id", user.id).single()
      .then(({ data }) => { setAvatarUrl(data?.avatar_url || ""); setUsername(data?.username || ""); });
  }, [user]);

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

  // NEU (Mobile): Body-Scroll sperren, solange das Hamburger-Menü offen ist
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  // NEU (Mobile): auf Mobile nur die sichtbare Teilmenge rendern, Desktop unverändert alles
  const displayedRoutes = isMobile ? routes.slice(0, visibleCount) : routes;
  const hasMoreMobile = isMobile && visibleCount < routes.length;

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
        .nav-logo span { font-size:13px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--cream); transition:color .3s, text-shadow .3s; }
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

        .hero { position:relative; height:100vh; min-height:640px; display:flex; align-items:center; overflow:visible; z-index:20; }
        .hero-bg { position:absolute; inset:0; overflow:hidden; z-index:0; }
        .hero-bg img { width:100%; height:100%; object-fit:cover; object-position:center 40%; filter:brightness(0.48) saturate(0.85); }
        .light .hero-bg img { filter:brightness(1) saturate(1); }
        .hero-bg::after { content:""; position:absolute; inset:0; background: linear-gradient(to right,rgba(12,11,9,0.95) 0%,rgba(12,11,9,0.75) 45%,rgba(12,11,9,0.1) 100%), linear-gradient(to bottom,rgba(12,11,9,0.1) 0%,transparent 35%,rgba(12,11,9,0.9) 100%); }
        .light .hero-bg::after { display:none; }
        .hero-inner { position:relative; z-index:10; width:100%; max-width:1440px; margin:0 auto; padding:0 clamp(20px,4vw,60px); display:flex; align-items:center; }
        .hero-content { max-width:1580px; width:100%; }
        .hero-eyebrow { font-size:11px; font-weight:800; letter-spacing:0.4em; text-transform:uppercase; color:var(--gold); margin-bottom:22px; }
        .hero-h1 { font-family:var(--serif); font-size:clamp(72px,7vw,132px); font-weight:300; line-height:0.87; letter-spacing:-0.04em; color:var(--cream); text-shadow:0 20px 60px rgba(0,0,0,0.5); }
        .light .hero-h1 { color:#fff; text-shadow:0 2px 12px rgba(0,0,0,0.55), 0 8px 32px rgba(0,0,0,0.35); }
        .hero-sub { font-size:20px; font-weight:300; color:var(--muted); font-style:italic; max-width:780px; line-height:1.6; margin-top:45px; }
        .light .hero-sub { color:rgba(255,255,255,0.82); text-shadow:0 2px 8px rgba(0,0,0,0.4); }
        .light .hero-eyebrow { text-shadow:0 2px 8px rgba(0,0,0,0.3); }

        .search-bar { display:inline-flex; align-items:stretch; background:color-mix(in srgb, var(--border) 50%, transparent); backdrop-filter:blur(24px); border:1px solid var(--border); border-radius:20px; overflow:visible; width:100%; max-width:1020px; margin-top:75px; }
        .search-field { position:relative; padding:18px 24px; flex:1; cursor:pointer; transition:background .2s; border-radius:18px; min-width:0; }
        .search-field:hover { background:color-mix(in srgb, var(--border) 50%, transparent); }
        .search-field.open { background:color-mix(in srgb, var(--border) 80%, transparent); }
        .search-field-label { font-size:12px; font-weight:800; letter-spacing:0.32em; text-transform:uppercase; color:var(--gold); margin-bottom:6px; opacity:0.85; }
        .search-field-value { font-size:16px; font-weight:300; font-family:var(--serif); letter-spacing:0.01em; color:var(--cream); display:flex; align-items:center; gap:8px; justify-content:space-between; }
        .search-field-value .placeholder {font-size:18px; color:var(--muted); font-style:italic; }
        .search-field-value .arrow { display:flex; color:rgba(201,168,106,0.55); transition:transform .25s,color .2s; flex-shrink:0; }
        .search-field.open .arrow { transform:rotate(180deg); color:var(--gold); }
        /* NEU (Desktop, auf Wunsch): Inline-Eingabefeld im Country-Suchfeld —
           übernimmt exakt die Optik des bisherigen statischen Werts/Placeholders */
        .search-field-input { flex:1; min-width:0; background:none; border:none; outline:none; font-family:var(--serif); font-size:16px; font-weight:300; letter-spacing:0.01em; color:var(--cream); padding:0; cursor:pointer; }
        .search-field.open .search-field-input { cursor:text; }
        .search-field-input::placeholder { font-family:var(--serif); font-size:18px; color:var(--muted); font-style:italic; }
        .light .search-field-input { color:#fff; }
        .light .search-field-input::placeholder { color:rgba(237,229,212,0.6); }
        .search-divider { width:1px; background:var(--border); margin:14px 0; flex-shrink:0; }
        .search-btn { margin:8px; padding:0 28px; background:var(--gold); color:var(--bg); border-radius:14px; font-size:10px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; transition:all .25s; white-space:nowrap; box-shadow:0 8px 24px rgba(201,168,106,0.2); display:inline-flex; align-items:center; gap:8px; }
        .search-btn:hover { background:#d8b978; transform:translateY(-1px); }

        .light .search-bar { background:rgba(12,11,9,0.42); border-color:rgba(237,229,212,0.18); }
        .light .search-field:hover { background:rgba(237,229,212,0.08); }
        .light .search-field.open { background:rgba(237,229,212,0.14); }
        .light .search-field-value { color:#fff; }
        .light .search-field-value .placeholder { color:rgba(237,229,212,0.6); }
        .light .search-divider { background:rgba(237,229,212,0.22); }

        @keyframes ddOpen { from{opacity:0;transform:translateY(-6px) scale(0.99)} to{opacity:1;transform:translateY(0) scale(1)} }
        .search-dropdown { position:absolute; top:calc(100% + 10px); left:0; right:0; min-width:320px; z-index:9999; background:color-mix(in srgb, var(--bg) 98%, transparent); border:1px solid rgba(201,168,106,0.2); border-radius:16px; overflow:hidden; box-shadow:0 32px 80px rgba(0,0,0,0.8); animation:ddOpen .2s cubic-bezier(0.22,1,0.36,1); }
        .search-dropdown-header { padding:12px 18px 8px; border-bottom:1px solid var(--border); }
        .search-dropdown-header-label { font-size:8px; font-weight:800; letter-spacing:0.32em; text-transform:uppercase; color:rgba(201,168,106,0.5); }
        .search-dropdown-input { width:100%; background:none; border:none; outline:none; font-family:var(--sans); font-size:13px; font-weight:500; color:var(--cream); padding:4px 2px; }
        .search-dropdown-input::placeholder { color:var(--dim); font-weight:400; }
        .search-dropdown-scroll { max-height:190px; overflow-y:auto; padding:6px; }
        .search-dropdown-scroll::-webkit-scrollbar { width:3px; }
        .search-dropdown-scroll::-webkit-scrollbar-thumb { background:rgba(201,168,106,0.2); border-radius:2px; }
        .search-dropdown-item { display:flex; align-items:center; gap:10px; padding:9px 12px; font-size:13px; font-weight:400; color:var(--muted); cursor:pointer; border-radius:10px; transition:background .15s,color .15s; }
        .search-dropdown-item:hover { background:rgba(201,168,106,0.1); color:var(--cream); }
        .search-dropdown-item.all-item { color:rgba(201,168,106,0.7); font-size:11px; font-weight:600; letter-spacing:0.06em; }
        .search-dropdown-item.all-item:hover { color:var(--gold); background:rgba(201,168,106,0.08); }
        .search-dropdown-item .item-dot { width:4px; height:4px; border-radius:50%; background:rgba(201,168,106,0.3); flex-shrink:0; transition:background .15s; }
        .search-dropdown-item:hover .item-dot { background:var(--gold); }
        .search-dropdown-footer { padding:8px 18px 12px; border-top:1px solid var(--border); font-size:10px; color:var(--dim); text-align:center; letter-spacing:0.06em; }

        .content { padding:0 clamp(20px,4vw,60px) clamp(60px,8vw,100px); max-width:1440px; margin:0 auto; scroll-margin-top:92px; }

        .toolbar { display:flex; align-items:center; justify-content:space-between; gap:20px; padding:18px 0 16px; border-bottom:1px solid var(--border); margin-bottom:32px; }
        .results-count { font-size:12px; color:var(--dim); font-weight:500; letter-spacing:0.06em; }
        .results-count strong { color:var(--cream); font-weight:700; }
        .filter-btn { display:flex; align-items:center; gap:8px; padding:10px 18px; border:1px solid var(--border); border-radius:999px; background:color-mix(in srgb, var(--border) 40%, transparent); font-size:10px; font-weight:700; letter-spacing:0.16em; text-transform:uppercase; color:var(--muted); transition:all .25s; }
        .filter-btn:hover { border-color:rgba(201,168,106,0.4); color:var(--cream); background:rgba(201,168,106,0.06); }
        .filter-count { width:18px; height:18px; border-radius:50%; background:var(--gold); color:var(--bg); font-size:9px; font-weight:800; display:flex; align-items:center; justify-content:center; }

        .active-tags { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:28px; }
        .active-tag { display:flex; align-items:center; gap:8px; padding:7px 12px; border-radius:999px; background:rgba(201,168,106,0.12); border:1px solid rgba(201,168,106,0.28); font-size:9px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:var(--cream); }
        .active-tag button { display:flex; align-items:center; color:var(--dim); transition:color .15s; padding:0; background:none; }
        .active-tag button:hover { color:#E08080; }
        .clear-all-btn { padding:7px 12px; border-radius:999px; border:1px solid var(--border); font-size:9px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:var(--dim); background:none; transition:all .2s; }
        .clear-all-btn:hover { color:#E08080; border-color:rgba(224,128,128,0.3); }

        .route-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }

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

        .loading-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
        .skeleton { border-radius:20px; overflow:hidden; background:var(--bg3); border:1px solid var(--border); }
        .skeleton-img { height:240px; background:linear-gradient(90deg,color-mix(in srgb, var(--border) 40%, transparent) 0%,color-mix(in srgb, var(--border) 80%, transparent) 50%,color-mix(in srgb, var(--border) 40%, transparent) 100%); background-size:200% 100%; animation:shimmer 1.6s infinite; }
        .skeleton-body { padding:18px; display:flex; flex-direction:column; gap:10px; }
        .skeleton-line { height:10px; border-radius:6px; background:linear-gradient(90deg,color-mix(in srgb, var(--border) 40%, transparent) 0%,color-mix(in srgb, var(--border) 80%, transparent) 50%,color-mix(in srgb, var(--border) 40%, transparent) 100%); background-size:200% 100%; animation:shimmer 1.6s infinite; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        .filter-overlay { position:fixed; inset:0; z-index:299; }
        .filter-panel { position:absolute; right:0; top:calc(100% + 10px); width:320px; background:color-mix(in srgb, var(--bg) 98%, transparent); border:1px solid var(--border); border-radius:20px; padding:24px; box-shadow:0 28px 80px rgba(0,0,0,0.4); z-index:300; backdrop-filter:blur(20px); }
        .filter-panel-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:22px; }
        .filter-panel-title { font-size:10px; font-weight:800; letter-spacing:0.24em; text-transform:uppercase; color:var(--cream); }
        .filter-reset { font-size:10px; font-weight:600; letter-spacing:0.12em; color:var(--dim); background:none; transition:color .2s; }
        .filter-reset:hover { color:#E08080; }
        .filter-section { margin-bottom:22px; }
        .filter-section-title { font-size:9px; font-weight:800; letter-spacing:0.28em; text-transform:uppercase; color:var(--dim); margin-bottom:12px; }
        .filter-chips { display:flex; flex-wrap:wrap; gap:8px; }
        .filter-chip { padding:8px 14px; border-radius:999px; border:1px solid var(--border); background:color-mix(in srgb, var(--border) 40%, transparent); font-size:9px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:var(--muted); transition:all .2s; }
        .filter-chip:hover { border-color:rgba(201,168,106,0.4); color:var(--cream); }
        .filter-chip.active { border-color:rgba(201,168,106,0.7); background:rgba(201,168,106,0.14); color:var(--cream); }
        .filter-radio { display:flex; flex-direction:column; gap:10px; }
        .filter-radio-item { display:flex; align-items:center; gap:10px; cursor:pointer; }
        .filter-radio-item input { accent-color:var(--gold); }
        .filter-radio-item span { font-size:13px; color:var(--muted); }
        .filter-stars { display:flex; gap:4px; }
        .filter-star { display:flex; color:var(--border); transition:color .15s; background:none; }
        .filter-star.active { color:var(--gold); }
        .filter-country-list { display:flex; flex-direction:column; gap:8px; max-height:240px; overflow-y:auto; }
        .filter-country-list::-webkit-scrollbar { width:3px; }
        .filter-country-list::-webkit-scrollbar-thumb { background:var(--border); border-radius:2px; }
        .filter-country-item { display:flex; align-items:center; gap:10px; cursor:pointer; }
        .filter-country-item input { accent-color:var(--gold); }
        .filter-country-item span { font-size:13px; color:var(--muted); }
        .filter-apply-btn { width:100%; padding:14px; background:var(--gold); color:var(--bg); border-radius:12px; font-size:10px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; transition:background .2s; margin-top:4px; }
        .filter-apply-btn:hover { background:#d8b978; }

        .empty-state { text-align:center; padding:80px 20px; }
        .empty-state h3 { font-family:var(--serif); font-size:40px; font-weight:300; font-style:italic; color:var(--cream); margin-bottom:12px; }
        .empty-state p { font-size:14px; color:var(--dim); font-weight:300; margin-bottom:28px; }

        /* FOOTER */
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

        /* FOOTER — Sprachauswahl */
        .footer-lang-wrap { position:relative; }
        .footer-lang-btn { display:flex; align-items:center; gap:6px; padding:8px 14px; border:none; border-radius:999px; background:none; font-size:16px; font-weight:400; letter-spacing:0.12em; text-transform:uppercase; color:var(--muted); transition:color .2s, border-color .2s; }
        .footer-lang-btn:hover { color:var(--cream); }
        .footer-lang-menu { position:absolute; bottom:calc(100% + 10px); right:0; min-width:150px; background:color-mix(in srgb, var(--bg) 97%, transparent); border:1px solid var(--border); border-radius:12px; overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,0.55); backdrop-filter:blur(24px); z-index:50; animation:dropIn .2s cubic-bezier(0.22,1,0.36,1); }
        .footer-lang-option { display:block; width:100%; text-align:left; padding:10px 14px; font-size:12px; font-weight:500; color:var(--muted); background:none; transition:background .15s,color .15s; }
        .footer-lang-option:hover { background:color-mix(in srgb, var(--border) 60%, transparent); color:var(--cream); }
        .footer-lang-option.active { color:var(--gold); font-weight:700; }

        /* NEU: Nach-oben-Button, taucht per Fade+Slide auf, sobald man weit genug scrollt */
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

        /* Hamburger-Button in der Nav (nur mobil sichtbar) */
        .mobile-menu-btn { width:42px; height:42px; align-items:center; justify-content:center; border:1px solid var(--border); border-radius:50%; color:var(--cream); background:color-mix(in srgb, var(--border) 40%, transparent) !important; flex-shrink:0; }
        .light .nav:not(.scrolled) .mobile-menu-btn { border-color:rgba(255,255,255,0.35); color:#fff; }

        /* Mobile Popup-Menü (zentriertes Fenster, wie auf der Homepage) */
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

        /* Route-Card — Pin-Icon vor dem Land, nur mobil */
        .route-card-pin { display:none; color:var(--gold); flex-shrink:0; }

        /* Pagination */
        .load-more-row { display:none; margin-top:28px; }
        button.load-more-btn { width:100%; padding:16px; background:var(--gold); color:var(--bg); border-radius:999px; font-size:10px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; display:flex; align-items:center; justify-content:center; gap:10px; }

        /* NEU (Mobile): obere Such- + Filter-Leiste */
        .mobile-toolbar { display:none; gap:12px; margin:24px 0 22px; scroll-margin-top:88px; }
        .mobile-search-pill { position:relative; flex:1; display:flex; align-items:center; gap:10px; padding:15px 18px; border:1px solid var(--border); border-radius:999px; background:color-mix(in srgb, var(--border) 35%, transparent); color:var(--muted); font-size:12px; }
        .mobile-search-pill svg { flex-shrink:0; color:var(--gold); }
        .mobile-search-pill input { flex:1; min-width:0; background:none; border:none; outline:none; font:inherit; color:var(--cream); }
        .mobile-search-pill input::placeholder { color:var(--muted); }
        button.mobile-filter-pill { position:relative; width:50px; height:50px; flex-shrink:0; border-radius:50%; border:1px solid var(--border); background:color-mix(in srgb, var(--border) 35%, transparent) !important; color:var(--cream); display:flex; align-items:center; justify-content:center; }
        .mobile-filter-pill .filter-count { position:absolute; top:-4px; right:-4px; }
        .mobile-search-dropdown { position:absolute; top:calc(100% + 10px); left:0; right:0; z-index:60; background:color-mix(in srgb, var(--bg) 98%, transparent); border:1px solid rgba(201,168,106,0.2); border-radius:16px; overflow:hidden; box-shadow:0 32px 80px rgba(0,0,0,0.5); animation:ddOpen .2s cubic-bezier(0.22,1,0.36,1); }

        /* Footer — Social Icons */
        .footer-social { display:flex; gap:10px; margin-top:16px; margin-bottom:6px; }
        .footer-social a { width:34px; height:34px; border-radius:50%; border:1px solid var(--border); display:flex; align-items:center; justify-content:center; color:var(--muted); transition:all .2s; }
        .footer-social a:hover { color:var(--gold); border-color:rgba(201,168,106,0.4); }

        /* Footer — Akkordeon */
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

          .route-card-pin { display:inline-flex; }

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

          .route-card-img { height:140px; }
          .route-card-body { padding:12px 14px 14px; }
          .route-card-country { font-size:8px; margin-bottom:4px; }
          .route-card-title { font-size:16px; min-height:auto; -webkit-line-clamp:1; margin-bottom:5px; }
          .route-card-desc { -webkit-line-clamp:1; min-height:auto; margin-bottom:9px; font-size:11px; }
          .route-card-meta { gap:9px; margin-bottom:9px; }
          .route-card-meta-item { font-size:9px; }
          .route-card-footer { padding-top:9px; }
          .view-route-btn { font-size:9px; }

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
            <span>SCENIC</span>
            <span>ROUTES</span>
          </Link>

          <div className="nav-links">
            {[["nav.explore", "/explore"], ["nav.about", "/about"]].map(([key, h]) => (
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

            {/* NEU (Mobile): Hamburger-Button, nur per CSS auf Mobile sichtbar */}
            <button
              className="mobile-menu-btn mobile-only"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Menü öffnen"
            >
              <Menu size={20} strokeWidth={1.8} />
            </button>
          </div>
        </nav>

        {/* NEU (Mobile): Popup-Menü + Backdrop */}
        <div
          className={`mobile-nav-backdrop ${mobileMenuOpen ? "open" : ""}`}
          onClick={() => setMobileMenuOpen(false)}
        />

        <div className={`mobile-nav-drawer ${mobileMenuOpen ? "open" : ""}`}>
          <div className="mobile-nav-top">
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.18em" }}>SCENIC ROUTES</span>

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
                {[["nav.explore", "/explore"], ["nav.about", "/about"]].map(([key, href]) => (
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

        {/* HERO */}
        <section className="hero">
          <div className="hero-bg">
            <img src="/forest.jpg" alt="Scenic roads" onError={(e) => { e.currentTarget.src = "/forest.jpg"; }} />
          </div>
          <div className="hero-inner">
            <div className="hero-content">
              <p className="hero-eyebrow">{t("explore.hero.eyebrow")}</p>
              <h1 className="hero-h1">{t("explore.hero.titleLine1")}<br />{t("explore.hero.titleLine2")}</h1>

              <div className="search-bar" ref={searchBarRef}>
                <div className={`search-field ${isOpen ? "open" : ""}`} style={{ position: "relative" }} onClick={() => { setIsOpen(true); setIsOpenDate(false); countryInputRef.current?.focus(); }}>
                  <div className="search-field-label">{t("explore.search.country")}</div>
                  <div className="search-field-value">
                    {/* GEÄNDERT (Desktop, auf Wunsch): Land wird direkt hier eingetippt,
                        nicht mehr in einem Eingabefeld innerhalb des Dropdowns */}
                    <input
                      ref={countryInputRef}
                      type="text"
                      className="search-field-input"
                      placeholder={t("explore.search.chooseDest")}
                      value={isOpen ? countrySearch : selected}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      onFocus={() => { setIsOpen(true); setIsOpenDate(false); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && countrySearch.trim()) {
                          const exactMatch = countries.find(
                            (c) => c.toLowerCase() === countrySearch.trim().toLowerCase()
                          );
                          setSelected(exactMatch || countrySearch.trim());
                          setIsOpen(false);
                        } else if (e.key === "Escape") {
                          setIsOpen(false);
                        }
                      }}
                    />
                    <span className="arrow" onClick={(e) => { e.stopPropagation(); setIsOpen((p) => !p); setIsOpenDate(false); }}><ChevronDown size={12} strokeWidth={2.5} /></span>
                  </div>
                  {isOpen && (
                    <div className="search-dropdown" onClick={(e) => e.stopPropagation()}>
                      <div className="search-dropdown-scroll">
                        <div className="search-dropdown-item all-item" onClick={() => { setSelected(""); setIsOpen(false); }}><CornerDownRight size={12} strokeWidth={2} /> {t("explore.search.allCountries")}</div>
                        {filteredCountries.map((c) => (
                          <div key={c} className="search-dropdown-item" onClick={() => { setSelected(c); setIsOpen(false); }}>
                            <span className="item-dot" />{c}
                          </div>
                        ))}
                        {countrySearch.trim() && filteredCountries.length === 0 && (
                          <div className="search-dropdown-item" onClick={() => { setSelected(countrySearch.trim()); setIsOpen(false); }}>
                            <CornerDownRight size={12} strokeWidth={2} /> „{countrySearch.trim()}" verwenden
                          </div>
                        )}
                      </div>
                      <div className="search-dropdown-footer">{filteredCountries.length} {t("explore.search.destAvailable")}</div>
                    </div>
                  )}
                </div>

                <div className="search-divider" />

                <div className={`search-field ${isOpenDate ? "open" : ""}`} style={{ position: "relative" }} onClick={() => { setIsOpenDate(true); setIsOpen(false); durationInputRef.current?.focus(); }}>
                  <div className="search-field-label">{t("explore.search.duration")}</div>
                  <div className="search-field-value">
                    {/* GEÄNDERT (Desktop, auf Wunsch): Duration wird direkt hier eingetippt,
                        analog zum Country-Feld */}
                    <input
                      ref={durationInputRef}
                      type="text"
                      className="search-field-input"
                      placeholder={t("explore.search.chooseDur")}
                      value={isOpenDate ? durationSearch : selectedDate}
                      onChange={(e) => setDurationSearch(e.target.value)}
                      onFocus={() => { setIsOpenDate(true); setIsOpen(false); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && durationSearch.trim()) {
                          const exactMatch = durations.find(
                            (d) => d.toLowerCase() === durationSearch.trim().toLowerCase()
                          );
                          setSelectedDate(exactMatch || durationSearch.trim());
                          setIsOpenDate(false);
                        } else if (e.key === "Escape") {
                          setIsOpenDate(false);
                        }
                      }}
                    />
                    <span className="arrow" onClick={(e) => { e.stopPropagation(); setIsOpenDate((p) => !p); setIsOpen(false); }}><ChevronDown size={12} strokeWidth={2.5} /></span>
                  </div>
                  {isOpenDate && (
                    <div className="search-dropdown" onClick={(e) => e.stopPropagation()}>
                      <div className="search-dropdown-scroll">
                        <div className="search-dropdown-item all-item" onClick={(e) => { e.stopPropagation(); setSelectedDate(""); setIsOpenDate(false); }}><CornerDownRight size={12} strokeWidth={2} /> {t("explore.search.anyDuration")}</div>
                        {filteredDurations.map((d) => (
                          <div key={d} className="search-dropdown-item" onClick={(e) => { e.stopPropagation(); setSelectedDate(d); setIsOpenDate(false); }}>
                            <span className="item-dot" />{d}
                          </div>
                        ))}
                      </div>
                      <div className="search-dropdown-footer">{filteredDurations.length} {t("explore.search.durAvailable")}</div>
                    </div>
                  )}
                </div>

                <button className="search-btn" onClick={() => { setAppliedSelected(selected); setAppliedSelectedDate(selectedDate); resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>{t("explore.search.findRoute")} <ArrowRight size={30} strokeWidth={2.5} /></button>
              </div>

              <p className="hero-sub">{t("explore.hero.sub")}</p>
            </div>
          </div>
        </section>

        {/* CONTENT */}
        <div className="content" ref={resultsRef}>
          {/* NEU (Mobile): kompakte Such- + Filter-Leiste oben, ersetzt visuell
              die versteckte Desktop-Suchleiste im Hero und den bisherigen
              Filter-Button ganz unten */}
          <div className="mobile-toolbar mobile-only" ref={mobileSearchRef}>
            <div className="mobile-search-pill">
              <Search size={14} strokeWidth={2} />
              <input
                type="text"
                placeholder={t("explore.search.searchCountries")}
                value={mobileCountryOpen ? mobileCountrySearch : selected}
                onFocus={() => {
                  setMobileCountryOpen(true); setMobileCountrySearch("");
                  // NEU (Mobile): Seite hochscrollen, damit das aufklappende
                  // Dropdown vollständig sichtbar ist (Toolbar wandert unter
                  // die fixe Nav, s. scroll-margin-top an .mobile-toolbar)
                  setTimeout(() => {
                    mobileSearchRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 60);
                }}
                onChange={(e) => setMobileCountrySearch(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setMobileCountryOpen(false)}
              />

              {mobileCountryOpen && (
                <div className="mobile-search-dropdown" onClick={(e) => e.stopPropagation()}>
                  <div className="search-dropdown-scroll">
                    <div
                      className="search-dropdown-item all-item"
                      onClick={() => {
                        setSelected(""); setAppliedSelected("");
                        setMobileCountryOpen(false); setMobileCountrySearch("");
                      }}
                    >
                      <CornerDownRight size={12} strokeWidth={2} /> {t("explore.search.allCountries")}
                    </div>
                    {mobileFilteredCountries.map((c) => (
                      <div
                        key={c}
                        className="search-dropdown-item"
                        onClick={() => {
                          setSelected(c); setAppliedSelected(c);
                          setMobileCountryOpen(false); setMobileCountrySearch("");
                        }}
                      >
                        <span className="item-dot" />{c}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              className="mobile-filter-pill"
              onClick={() => setShowFilters((p) => !p)}
              aria-label="Filter öffnen"
            >
              <SlidersHorizontal size={15} strokeWidth={2} />
              {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
            </button>
          </div>


          <div className="toolbar">
            <p className="results-count">
              {loading ? t("explore.loading") : <><strong>{routes.length}</strong> {t("explore.routesFound")}</>}
            </p>
            <div style={{ position: "relative" }}>
              <button className="filter-btn" onClick={() => setShowFilters((p) => !p)}>
                <SlidersHorizontal size={14} strokeWidth={2} />
                {t("explore.filters")}
                {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
              </button>

              {showFilters && (
                <>
                  <div className="filter-overlay" onClick={() => setShowFilters(false)} />
                  <div className="filter-panel">
                    <div className="filter-panel-header">
                      <span className="filter-panel-title">{t("explore.filters")}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <button className="filter-reset" onClick={clearAllFilters}>{t("explore.resetAll")}</button>
                        <button
                          className="filter-panel-close mobile-only"
                          onClick={() => setShowFilters(false)}
                          aria-label="Filter schließen"
                        >
                          <X size={16} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                    <div className="filter-section">
                      <p className="filter-section-title">{t("explore.terrain")}</p>
                      <div className="filter-chips">
                        {["Forest", "Deserts", "Coastal", "Mountains"].map((terrain) => (
                          <button key={terrain} className={`filter-chip ${filters.difficulty.includes(terrain) ? "active" : ""}`} onClick={() => toggleFilter("difficulty", terrain)}>{terrain}</button>
                        ))}
                      </div>
                    </div>
                    <div className="filter-section">
                      <p className="filter-section-title">{t("explore.search.duration")}</p>
                      <div className="filter-radio">
                        <label className="filter-radio-item">
                          <input
                            type="radio"
                            name="duration"
                            checked={!appliedSelectedDate}
                            onChange={() => { setSelectedDate(""); setAppliedSelectedDate(""); }}
                          />
                          <span>{t("explore.search.anyDuration")}</span>
                        </label>
                        {durations.map((d) => (
                          <label key={d} className="filter-radio-item">
                            <input
                              type="radio"
                              name="duration"
                              checked={appliedSelectedDate === d}
                              onChange={() => { setSelectedDate(""); setAppliedSelectedDate(d); }}
                            />
                            <span>{d}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="filter-section">
                      <p className="filter-section-title">{t("explore.minRating")}</p>
                      <div className="filter-stars">
                        {[1,2,3,4,5].map((s) => (
                          <button key={s} className={`filter-star ${s <= filters.minRating ? "active" : ""}`} onClick={() => setFilters((p) => ({...p, minRating: p.minRating === s ? 0 : s}))}>
                            <Star size={20} strokeWidth={1.8} fill={s <= filters.minRating ? "currentColor" : "none"} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="filter-section">
                      <p className="filter-section-title">{t("explore.country")}</p>
                      <div className="filter-country-list">
                        {countries.map((c) => {
                          const checked = filters.countries.includes(c) || appliedSelected === c;
                          return (
                            <label key={c} className="filter-country-item">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  if (checked) {
                                    if (filters.countries.includes(c)) toggleFilter("countries", c);
                                    if (appliedSelected === c) { setSelected(""); setAppliedSelected(""); }
                                  } else {
                                    toggleFilter("countries", c);
                                  }
                                }}
                              />
                              <span>{c}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* NEU (Mobile): Ergebnis-Zähler bleibt über der aktiven Filter-Leiste sichtbar,
              auch wenn die Desktop-Toolbar (mit dem "Filters"-Button) auf Mobile
              ausgeblendet ist */}
          <p className="results-count mobile-only" style={{ marginBottom: 16 }}>
            {loading ? t("explore.loading") : <><strong>{routes.length}</strong> {t("explore.routesFound")}</>}
          </p>

          {(activeFilterCount > 0 || appliedSelected || appliedSelectedDate) && (
            <div className="active-tags">
              {filters.difficulty.map((terrain) => (<span key={terrain} className="active-tag">{terrain}<button onClick={() => toggleFilter("difficulty", terrain)}><X size={11} strokeWidth={2.5} /></button></span>))}
              {filters.countries.map((c) => (<span key={c} className="active-tag">{c}<button onClick={() => toggleFilter("countries", c)}><X size={11} strokeWidth={2.5} /></button></span>))}
              {appliedSelected && (<span className="active-tag">{appliedSelected}<button onClick={() => { setSelected(""); setAppliedSelected(""); }}><X size={11} strokeWidth={2.5} /></button></span>)}
              {appliedSelectedDate && (<span className="active-tag">{appliedSelectedDate}<button onClick={() => { setSelectedDate(""); setAppliedSelectedDate(""); }}><X size={11} strokeWidth={2.5} /></button></span>)}
              <button className="clear-all-btn" onClick={clearAllFilters}>{t("explore.clearAll")}</button>
            </div>
          )}

          {loading ? (
            <div className="loading-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton">
                  <div className="skeleton-img" />
                  <div className="skeleton-body">
                    <div className="skeleton-line" style={{ width: "40%" }} />
                    <div className="skeleton-line" style={{ width: "75%", height: 14 }} />
                    <div className="skeleton-line" style={{ width: "60%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : routes.length === 0 ? (
            <div className="empty-state">
              <h3>{t("explore.noRoutesFound")}</h3>
              <p>{t("explore.tryAdjusting")}</p>
              <button className="filter-apply-btn" style={{ width:"auto", padding:"14px 28px", borderRadius:999, display:"inline-flex" }} onClick={clearAllFilters}>{t("explore.clearFilters")}</button>
            </div>
          ) : (
            <>
              <div className="route-grid">
                {displayedRoutes.map((route) => (
                  <div key={route.id} className="route-card">
                    <div className="route-card-img">
                      <Link href={`/routedetail/${route.id}`}>
                        <img src={route.image_url || "/iceland.jpg"} alt={route.title} onError={(e) => { e.currentTarget.src = "/iceland.jpg"; }} />
                      </Link>
                      <button className="save-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSave(route.id); }} aria-label={savedRoutes.includes(route.id) ? "Remove from saved routes" : "Save route"}>
                        <Heart size={16} strokeWidth={2} fill={savedRoutes.includes(route.id) ? "#ef4444" : "transparent"} stroke={savedRoutes.includes(route.id) ? "#ef4444" : "rgba(237,229,212,0.8)"} />
                      </button>
                      {(route.terrain || route.type) && <div className="route-card-type">{route.terrain || route.type}</div>}
                    </div>
                    <div className="route-card-body">
                      <div className="route-card-country">
                        <MapPin size={10} strokeWidth={2.2} className="route-card-pin" />
                        {route.country}
                      </div>
                      <Link href={`/routedetail/${route.id}`}><div className="route-card-title">{route.title}</div></Link>
                      <p className="route-card-desc">{route.description || ""}</p>
                      <div className="route-card-meta">
                        {route.duration && <div className="route-card-meta-item"><Clock size={12} strokeWidth={2} />{route.duration}</div>}
                        {route.distance_km && <div className="route-card-meta-item"><Navigation size={12} strokeWidth={2} />{formatDistance(route.distance_km, unit)}</div>}
                      </div>
                      <div className="route-card-footer" style={!route.rating ? { justifyContent: "flex-end" } : undefined}>
                        {route.rating && (
                          <div className="route-card-rating"><Star size={13} strokeWidth={1.8} fill="currentColor" /> {route.rating.toFixed(1)}</div>
                        )}
                        <Link href={`/routedetail/${route.id}`} className="view-route-btn">{t("explore.viewRoute")} <ArrowRight size={12} strokeWidth={2.5} /></Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* NEU (Mobile): "Load more routes", nur mobil, echte Pagination —
                  Desktop zeigt weiterhin alle Routen ohne diesen Button.
                  Der Filter-Zugriff sitzt jetzt oben in der mobile-toolbar. */}
              {hasMoreMobile && (
                <div className="load-more-row">
                  <button
                    className="load-more-btn"
                    onClick={() => setVisibleCount((p) => p + MOBILE_PAGE_SIZE)}
                  >
                    {t("explore.loadMore")}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

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

                {/* NEU (Mobile): Social-Icons */}
                <div className="footer-social mobile-only">
                  <a href="#" aria-label="Instagram"><InstagramIcon size={15} strokeWidth={1.8} /></a>
                  <a href="#" aria-label="YouTube"><YoutubeIcon size={15} strokeWidth={1.8} /></a>
                  <a href="#" aria-label="E-Mail"><Mail size={15} strokeWidth={1.8} /></a>
                </div>
              </div>

              {FOOTER_COLUMNS.map(({ id, headingKey, linkKeys }) => {
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
                        {linkKeys.map((linkKey) => (
                          <a href="#" key={linkKey}>{t(linkKey)}</a>
                        ))}
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
                    </div>
                  )}
                </div>

                <ThemeSwitch />
              </div>
            </div>
          </div>
        </footer>

        {/* NEU: Nach-oben-Button */}
        <button
          className={`scroll-top-btn ${showScrollTop ? "visible" : ""}`}
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