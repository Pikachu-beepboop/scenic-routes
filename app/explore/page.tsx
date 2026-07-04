"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useTheme } from "next-themes";
import { ThemeSwitch } from "../components/ThemeSwitch";
import {
  SlidersHorizontal, ChevronDown, Star, X, CornerDownRight,
  User as UserIcon, Map as MapIcon, Compass, LogOut, Clock, Navigation, Heart, ArrowRight, Globe,
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

const fmtKm = (km?: number) =>
  km != null ? `${km.toLocaleString("en-US")} km` : "—";

const LANGUAGES = [
  { code: "DE", label: "Deutsch" },
  { code: "EN", label: "English" },
  { code: "RU", label: "Русский" },
];

function ExplorePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
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
    duration: string;
    minRating: number;
    countries: string[];
  }>({
    difficulty: searchParams.get("terrain")?.split(",").filter(Boolean) || [],
    duration: searchParams.get("dur") || "any",
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
    if (filters.duration !== "any") params.set("dur", filters.duration);
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
  const [username, setUsername] = useState("");
  const [language, setLanguage] = useState("DE");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const searchBarRef = useRef<HTMLDivElement | null>(null);
  const displayName = username || user?.email?.split("@")[0] || "";

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
    setFilters({ difficulty: [], duration: "any", minRating: 0, countries: [] });
  };

  const activeFilterCount =
    filters.difficulty.length + filters.countries.length +
    (filters.duration !== "any" ? 1 : 0) + (filters.minRating > 0 ? 1 : 0);

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
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (user) fetchSavedRoutes(); }, [user]);

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
      )).sort();
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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=Inter:wght@300;400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

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

        html { scroll-behavior:smooth; }
        body { background:var(--bg); overflow-x:hidden; }
        a { color:inherit; text-decoration:none; }
        button { border:none; font:inherit; cursor:pointer; }
        input, select { font:inherit; }
        img { display:block; }
        .page { min-height:100vh; background:var(--bg); color:var(--cream); font-family:var(--sans); transition:background .35s, color .35s; }

        .nav { position:fixed; inset:0 0 auto; z-index:200; height:72px; padding:0 clamp(20px,4vw,60px); display:flex; align-items:center; justify-content:space-between; background:transparent; border-bottom:1px solid transparent; transition:background .35s,border-color .35s; }
        .nav.scrolled { background:color-mix(in srgb, var(--bg) 92%, transparent); backdrop-filter:blur(20px); border-bottom-color:var(--border); }
        .nav-logo span { font-size:13px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--cream); }
        .nav-logo { display:flex; flex-direction:column; line-height:1; }
        .nav-links { display:flex; gap:36px; }
        .nav-link { position:relative; font-size:13px; font-weight:600; letter-spacing:0.16em; text-transform:uppercase; color:var(--muted); transition:color .2s; }
        .nav-link::after { content:""; position:absolute; left:0; bottom:-8px; width:0; height:1px; background:var(--gold); transition:width .25s; }
        .nav-link:hover { color:var(--cream); }
        .nav-link:hover::after { width:100%; }
        .nav-link-active { color:var(--cream) !important; font-weight:700; }
        .nav-right { display:flex; align-items:center; gap:16px; }
        .login-btn { padding:10px 22px; border:1px solid var(--border); border-radius:999px; font-size:10px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:var(--cream); background:color-mix(in srgb, var(--border) 40%, transparent); transition:all .25s; }
        .login-btn:hover { background:var(--cream); color:var(--bg); }
        .user-avatar { width:48px; height:48px; border-radius:50%; border:1.5px solid var(--border); background:var(--bg2); overflow:hidden; display:flex; align-items:center; justify-content:center; font-family:var(--serif); font-size:20px; font-weight:700; color:var(--cream); cursor:pointer; transition:border-color .2s, transform .2s; box-shadow:0 6px 18px rgba(0,0,0,0.35); }
        .user-avatar:hover { border-color:var(--gold); transform:translateY(-1px); }
        .user-avatar img { width:100%; height:100%; object-fit:cover; }

        .theme-switch { position:relative; display:flex; align-items:center; width:66px; height:33px; border-radius:999px; background:color-mix(in srgb, var(--border) 70%, transparent); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid var(--border); box-shadow:0 8px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06); cursor:pointer; transition:background .35s, border-color .35s; flex-shrink:0; }
        .theme-switch:hover { border-color: var(--gold); }
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
        .hero-eyebrow { font-size:11px; font-weight:800; letter-spacing:0.4em; text-transform:uppercase; color:black; margin-bottom:22px; }
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

        .content { padding:0 clamp(20px,4vw,60px) clamp(60px,8vw,100px); max-width:1440px; margin:0 auto; }

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

        .route-card { position:relative; border-radius:20px; overflow:hidden; background:var(--bg3); border:1px solid var(--border); transition:transform .4s cubic-bezier(.25,.46,.45,.94),box-shadow .4s,border-color .4s; cursor:pointer; }
        .route-card:hover { transform:translateY(-6px); box-shadow:0 32px 80px rgba(0,0,0,0.3); border-color:rgba(201,168,106,0.22); }
        .route-card-img { position:relative; height:240px; overflow:hidden; }
        .route-card-img img { width:100%; height:100%; object-fit:cover; transition:transform .7s ease; filter:brightness(0.88); }
        .route-card:hover .route-card-img img { transform:scale(1.07); }
        .route-card-img::after { content:""; position:absolute; inset:0; background:linear-gradient(to bottom,transparent 50%,rgba(0,0,0,0.6) 100%); pointer-events:none; }
        .save-btn { position:absolute; top:12px; right:12px; z-index:5; width:36px; height:36px; border-radius:50%; background:rgba(12,11,9,0.55); backdrop-filter:blur(12px); border:1px solid rgba(237,229,212,0.18); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity .25s,background .25s; }
        .route-card:hover .save-btn { opacity:1; }
        .save-btn:hover { background:rgba(12,11,9,0.85); }
        .route-card-type { position:absolute; bottom:12px; left:12px; z-index:5; padding:5px 10px; border-radius:999px; background:rgba(12,11,9,0.65); backdrop-filter:blur(12px); border:1px solid rgba(237,229,212,0.16); font-size:8px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:rgba(237,229,212,0.8); }
        .route-card-body { padding:18px 18px 20px; }
        .route-card-country { font-size:9px; font-weight:700; letter-spacing:0.22em; text-transform:uppercase; color:var(--gold); margin-bottom:6px; }
        .route-card-title { font-family:var(--serif); font-size:22px; font-weight:400; color:var(--cream); line-height:1.05; letter-spacing:-0.02em; margin-bottom:8px; }
        .route-card-desc { font-size:12px; color:var(--dim); line-height:1.65; font-weight:300; margin-bottom:14px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .route-card-meta { display:flex; align-items:center; gap:14px; margin-bottom:16px; }
        .route-card-meta-item { display:flex; align-items:center; gap:5px; font-size:10px; color:var(--dim); font-weight:500; }
        .route-card-meta-item svg { opacity:0.65; flex-shrink:0; }
        .route-card-footer { display:flex; align-items:center; justify-content:space-between; padding-top:14px; border-top:1px solid var(--border); }
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
        .filter-country-list { display:flex; flex-direction:column; gap:8px; max-height:160px; overflow-y:auto; }
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
        .footer-top { display:grid; grid-template-columns:1.3fr 1fr 1fr 1fr; gap:36px; padding-bottom:40px; border-bottom:1px solid var(--border); margin-bottom:22px; }
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
      `}</style>

      <div className={`page ${themeClass}`}>
        {/* NAV */}
        <nav className={`nav ${navScrolled ? "scrolled" : ""}`}>
          <Link href="/" className="nav-logo">
            <span>SCENIC</span>
            <span>ROUTES</span>
          </Link>

          <div className="nav-links">
            {[["Explore Routes", "/explore"], ["About", "/about"]].map(([l, h]) => (
              <Link key={l} href={h} className="nav-link">{l}</Link>
            ))}
            {user && (
              <Link href="/my-trips" className="nav-link nav-link-active">
                My Trips
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
                        <p className="ud-role">Scenic Route Explorer</p>
                      </div>
                    </div>

                    <div className="ud-theme-row">
                      <span className="ud-theme-label">Theme</span>
                      <ThemeSwitch />
                    </div>

                    <div className="ud-links">
                      <Link href="/profile" className="ud-link" onClick={() => setShowUserMenu(false)}><span className="ud-link-icon"><UserIcon size={14} strokeWidth={1.8} /></span> Profile</Link>
                      <Link href="/my-trips" className="ud-link" onClick={() => setShowUserMenu(false)}><span className="ud-link-icon"><MapIcon size={14} strokeWidth={1.8} /></span> My Trips</Link>
                      <Link href="/explore" className="ud-link" onClick={() => setShowUserMenu(false)}><span className="ud-link-icon"><Compass size={14} strokeWidth={1.8} /></span> Explore Routes</Link>
                      <div className="ud-divider" />
                      <button className="ud-logout" onClick={handleLogout}><span className="ud-link-icon" style={{ color: "#e08080" }}><LogOut size={14} strokeWidth={1.8} /></span> Sign Out</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href={loginHref} className="login-btn">Login</Link>
            )}
          </div>
        </nav>

        {/* HERO */}
        <section className="hero">
          <div className="hero-bg">
            <img src="/iceland.jpg" alt="Scenic roads" onError={(e) => { e.currentTarget.src = "/iceland.jpg"; }} />
          </div>
          <div className="hero-inner">
            <div className="hero-content">
              <p className="hero-eyebrow">Discover · Explore · Drive</p>
              <h1 className="hero-h1">Find your<br />perfect route</h1>

              <div className="search-bar" ref={searchBarRef}>
                <div className={`search-field ${isOpen ? "open" : ""}`} style={{ position: "relative" }} onClick={() => { setIsOpen((p) => !p); setIsOpenDate(false); }}>
                  <div className="search-field-label">Country</div>
                  <div className="search-field-value">
                    {selected ? <span>{selected}</span> : <span className="placeholder">Choose destination</span>}
                    <span className="arrow"><ChevronDown size={12} strokeWidth={2.5} /></span>
                  </div>
                  {isOpen && (
                    <div className="search-dropdown">
                      <div className="search-dropdown-header"><span className="search-dropdown-header-label">Destination</span></div>
                      <div className="search-dropdown-scroll">
                        <div className="search-dropdown-item all-item" onClick={(e) => { e.stopPropagation(); setSelected(""); setIsOpen(false); }}><CornerDownRight size={12} strokeWidth={2} /> All countries</div>
                        {countries.map((c) => (
                          <div key={c} className="search-dropdown-item" onClick={(e) => { e.stopPropagation(); setSelected(c); setIsOpen(false); }}>
                            <span className="item-dot" />{c}
                          </div>
                        ))}
                      </div>
                      <div className="search-dropdown-footer">{countries.length} destinations available</div>
                    </div>
                  )}
                </div>

                <div className="search-divider" />

                <div className={`search-field ${isOpenDate ? "open" : ""}`} style={{ position: "relative" }} onClick={() => { setIsOpenDate((p) => !p); setIsOpen(false); }}>
                  <div className="search-field-label">Duration</div>
                  <div className="search-field-value">
                    {selectedDate ? <span>{selectedDate}</span> : <span className="placeholder">Choose duration</span>}
                    <span className="arrow"><ChevronDown size={12} strokeWidth={2.5} /></span>
                  </div>
                  {isOpenDate && (
                    <div className="search-dropdown">
                      <div className="search-dropdown-header"><span className="search-dropdown-header-label">Duration</span></div>
                      <div className="search-dropdown-scroll">
                        <div className="search-dropdown-item all-item" onClick={(e) => { e.stopPropagation(); setSelectedDate(""); setIsOpenDate(false); }}><CornerDownRight size={12} strokeWidth={2} /> Any duration</div>
                        {durations.map((d) => (
                          <div key={d} className="search-dropdown-item" onClick={(e) => { e.stopPropagation(); setSelectedDate(d); setIsOpenDate(false); }}>
                            <span className="item-dot" />{d}
                          </div>
                        ))}
                      </div>
                      <div className="search-dropdown-footer">{durations.length} durations available</div>
                    </div>
                  )}
                </div>

                <button className="search-btn" onClick={() => { setAppliedSelected(selected); setAppliedSelectedDate(selectedDate); }}>Find Route <ArrowRight size={30} strokeWidth={2.5} /></button>
              </div>

              <p className="hero-sub">Search through hundreds of handpicked scenic drives — filtered by country, duration.</p>
            </div>
          </div>
        </section>

        {/* CONTENT */}
        <div className="content">
          <div className="toolbar">
            <p className="results-count">
              {loading ? "Loading routes…" : <><strong>{routes.length}</strong> routes found</>}
            </p>
            <div style={{ position: "relative" }}>
              <button className="filter-btn" onClick={() => setShowFilters((p) => !p)}>
                <SlidersHorizontal size={14} strokeWidth={2} />
                Filters
                {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
              </button>

              {showFilters && (
                <>
                  <div className="filter-overlay" onClick={() => setShowFilters(false)} />
                  <div className="filter-panel">
                    <div className="filter-panel-header">
                      <span className="filter-panel-title">Filters</span>
                      <button className="filter-reset" onClick={() => setFilters({ difficulty: [], duration: "any", minRating: 0, countries: [] })}>Reset all</button>
                    </div>
                    <div className="filter-section">
                      <p className="filter-section-title">Terrain</p>
                      <div className="filter-chips">
                        {["Forest", "Deserts", "Coastal", "Mountains"].map((t) => (
                          <button key={t} className={`filter-chip ${filters.difficulty.includes(t) ? "active" : ""}`} onClick={() => toggleFilter("difficulty", t)}>{t}</button>
                        ))}
                      </div>
                    </div>
                    <div className="filter-section">
                      <p className="filter-section-title">Duration</p>
                      <div className="filter-radio">
                        {[{v:"any",l:"Any duration"},{v:"half",l:"Half day (< 4h)"},{v:"full",l:"Full day (4–8h)"},{v:"weekend",l:"Weekend trip"},{v:"multiday",l:"Multi-day journey"}].map(({v,l}) => (
                          <label key={v} className="filter-radio-item">
                            <input type="radio" name="duration" checked={filters.duration === v} onChange={() => setFilters((p) => ({...p, duration: v}))} />
                            <span>{l}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="filter-section">
                      <p className="filter-section-title">Minimum Rating</p>
                      <div className="filter-stars">
                        {[1,2,3,4,5].map((s) => (
                          <button key={s} className={`filter-star ${s <= filters.minRating ? "active" : ""}`} onClick={() => setFilters((p) => ({...p, minRating: p.minRating === s ? 0 : s}))}>
                            <Star size={20} strokeWidth={1.8} fill={s <= filters.minRating ? "currentColor" : "none"} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="filter-section">
                      <p className="filter-section-title">Country</p>
                      <div className="filter-country-list">
                        {countries.map((c) => (
                          <label key={c} className="filter-country-item">
                            <input type="checkbox" checked={filters.countries.includes(c)} onChange={() => toggleFilter("countries", c)} />
                            <span>{c}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <button className="filter-apply-btn" onClick={() => setShowFilters(false)}>Apply Filters</button>
                  </div>
                </>
              )}
            </div>
          </div>

          {(activeFilterCount > 0 || appliedSelected || appliedSelectedDate) && (
            <div className="active-tags">
              {filters.difficulty.map((t) => (<span key={t} className="active-tag">{t}<button onClick={() => toggleFilter("difficulty", t)}><X size={11} strokeWidth={2.5} /></button></span>))}
              {filters.countries.map((c) => (<span key={c} className="active-tag">{c}<button onClick={() => toggleFilter("countries", c)}><X size={11} strokeWidth={2.5} /></button></span>))}
              {appliedSelected && (<span className="active-tag">{appliedSelected}<button onClick={() => { setSelected(""); setAppliedSelected(""); }}><X size={11} strokeWidth={2.5} /></button></span>)}
              {appliedSelectedDate && (<span className="active-tag">{appliedSelectedDate}<button onClick={() => { setSelectedDate(""); setAppliedSelectedDate(""); }}><X size={11} strokeWidth={2.5} /></button></span>)}
              <button className="clear-all-btn" onClick={clearAllFilters}>Clear all</button>
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
              <h3>No routes found.</h3>
              <p>Try adjusting your filters or search for a different destination.</p>
              <button className="filter-apply-btn" style={{ width:"auto", padding:"14px 28px", borderRadius:999, display:"inline-flex" }} onClick={clearAllFilters}>Clear Filters</button>
            </div>
          ) : (
            <div className="route-grid">
              {routes.map((route) => (
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
                    <div className="route-card-country">{route.country}</div>
                    <Link href={`/routedetail/${route.id}`}><div className="route-card-title">{route.title}</div></Link>
                    {route.description && <p className="route-card-desc">{route.description}</p>}
                    <div className="route-card-meta">
                      {route.duration && <div className="route-card-meta-item"><Clock size={12} strokeWidth={2} />{route.duration}</div>}
                      {route.distance_km && <div className="route-card-meta-item"><Navigation size={12} strokeWidth={2} />{fmtKm(route.distance_km)}</div>}
                    </div>
                    <div className="route-card-footer">
                      <div className="route-card-rating"><Star size={13} strokeWidth={1.8} fill="currentColor" /> {route.rating ? route.rating.toFixed(1) : "—"}</div>
                      <Link href={`/routedetail/${route.id}`} className="view-route-btn">View Route <ArrowRight size={12} strokeWidth={2.5} /></Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
                  Thoughtfully curated road trips for people who value the
                  journey as much as the destination
                </p>
              </div>

              {[
                ["Explore", ["All Routes", "Destinations", "Experiences", "Journal"]],
                ["Company", ["About Us", "Membership", "Gift Cards", "Careers"]],
                ["Support", ["FAQ", "Travel Policies", "Contact Us", "Privacy Policy"]],
              ].map(([heading, links]) => (
                <div className="footer-col" key={heading as string}>
                  <p className="footer-col-title">{heading as string}</p>

                  {(links as string[]).map((link) => (
                    <a href="#" key={link}>{link}</a>
                  ))}
                </div>
              ))}
            </div>

            <div className="footer-bottom">
              <p className="footer-copy">
                © {new Date().getFullYear()} Explore Scenic Routes. All Rights Reserved.
              </p>

              <div className="footer-controls">
                <div className="footer-lang-wrap">
                  <button
                    className="footer-lang-btn"
                    onClick={() => setShowLangMenu((p) => !p)}
                  >
                    <Globe size={12} strokeWidth={2} /> {language}
                  </button>

                  {showLangMenu && (
                    <div className="footer-lang-menu">
                      {LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          className={`footer-lang-option ${lang.code === language ? "active" : ""}`}
                          onClick={() => {
                            setLanguage(lang.code);
                            setShowLangMenu(false);
                          }}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <ThemeSwitch />

                <div className="footer-legal">
                  <a href="#">Terms & Conditions</a>
                  <a href="#">Privacy</a>
                </div>
              </div>
            </div>
          </div>
        </footer>
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
