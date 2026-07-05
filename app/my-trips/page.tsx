"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../../lib/supabase";
import AuthModal from "../AuthModal";
import { useTheme } from "next-themes";
import { ThemeSwitch } from "../components/ThemeSwitch";
import {
  Bookmark, Globe2, Navigation, Clock, Heart, ChevronRight, X,
  User as UserIcon, Map as MapIcon, Compass, LogOut, Globe,
} from "lucide-react";

const fmtKm = (km?: number) =>
  km != null ? `${km.toLocaleString("en-US")} km` : "—";

const LANGUAGES = [
  { code: "DE", label: "Deutsch" },
  { code: "EN", label: "English" },
  { code: "RU", label: "Русский" },
];

export default function MyTripsPage() {
  const [user, setUser] = useState<any>(null);
  const [savedRoutes, setSavedRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [navScrolled, setNavScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [language, setLanguage] = useState("DE");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const { theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  const [username, setUsername] = useState("");
  const displayName = username || user?.email?.split("@")[0] || "";

  const savedCountriesCount = new Set(
    savedRoutes.map((route: any) => route.country).filter(Boolean)
  ).size;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (!u) { setLoading(false); return; }
      fetchSavedRoutes(u.id);
      fetchProfile(u.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => {
      const u = s?.user ?? null;
      setUser(u);
      if (u) { fetchSavedRoutes(u.id); fetchProfile(u.id); }
      else { setSavedRoutes([]); setAvatarUrl(""); setLoading(false); }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!showUserMenu) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".user-menu-wrap")) setShowUserMenu(false);
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

  async function fetchSavedRoutes(userId: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("saved_routes")
      .select("route_id, routes(*)")
      .eq("user_id", userId);
    if (!error && data) setSavedRoutes(data.map((r: any) => r.routes).filter(Boolean));
    setLoading(false);
  }

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from("profiles").select("avatar_url, username").eq("id", userId).single();
    if (data) { setAvatarUrl(data.avatar_url || ""); setUsername(data.username || ""); }
  }

  async function handleUnsave(routeId: string) {
    if (!user) return;
    await supabase.from("saved_routes").delete().eq("user_id", user.id).eq("route_id", routeId);
    setSavedRoutes((prev) => prev.filter((r: any) => r.id !== routeId));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null); setSavedRoutes([]); setShowUserMenu(false);
    router.push("/");
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500;600;700;800&display=swap');

        /* DARK THEME */
        .dark {
          --bg:#0c0b09; --bg2:#111009; --bg3:#181510;
          --gold:#C9A86A; --cream:#EDE5D4;
          --muted:rgba(237,229,212,0.56); --dim:rgba(237, 212, 212, 0.32);
          --border:rgba(237,229,212,0.10);
          --serif:'Cormorant Garamond',Georgia,serif;
          --sans:'Inter',system-ui,sans-serif;
        }

        /* LIGHT THEME */
        .light {
          --bg:#F4F0E8; --bg2:#EDE8DC; --bg3:#E5DFD0;
          --gold:#C9A86A; --cream:#2B2620;
          --muted:rgb(0, 0, 0); --dim:rgba(43,38,32,0.38);
          --border:rgba(43,38,32,0.12);
          --serif:'Cormorant Garamond',Georgia,serif;
          --sans:'Inter',system-ui,sans-serif;
        }

        .mt *, .mt *::before, .mt *::after { box-sizing:border-box; margin:0; padding:0; }
        .mt a { color:inherit; text-decoration:none; }
        .mt button { border:none; font:inherit; cursor:pointer; background:none; }
        .mt img { display:block; }
        .mt { min-height:100vh; background:var(--bg); color:var(--cream); font-family:var(--sans); overflow-x:hidden; transition:background .35s, color .35s; }

        /* NAV */
        .nav { position:fixed; inset:0 0 auto; z-index:200; height:72px; padding:0 clamp(20px,4vw,60px); display:flex; align-items:center; justify-content:space-between; background:transparent; border-bottom:1px solid transparent; transition:background .35s,border-color .35s; }
        .nav.scrolled { background:color-mix(in srgb, var(--bg) 92%, transparent); backdrop-filter:blur(20px); border-bottom-color:var(--border); }
        .nav-logo { display:flex; flex-direction:column; line-height:1; }
        .nav-logo span { font-size:13px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--cream); }
        .nav-links { display:flex; gap:36px; }
        .nav-link { position:relative; font-size:13px; font-weight:600; letter-spacing:0.16em; text-transform:uppercase; color:var(--muted); opacity:0.5; transition:color .2s, opacity .2s; }
        .nav-link::after { content:""; position:absolute; left:0; bottom:-8px; width:0; height:1px; background:var(--gold); transition:width .25s; }
        .nav-link:hover { color:var(--cream); opacity:1; }
        .nav-link:hover::after { width:100%; }
        .nav-link-active { color:var(--cream) !important; font-weight:700; opacity:1; }
        .nav-right { display:flex; align-items:center; gap:16px; }
        .login-btn { padding:10px 22px; border:1px solid var(--border); border-radius:999px; font-size:10px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:var(--cream); background:color-mix(in srgb, var(--border) 40%, transparent); transition:all .25s; }
        .login-btn:hover { background:var(--cream); color:var(--bg); }
        button.user-avatar { width:48px; height:48px; border-radius:50%; border:1.5px solid var(--border); background:var(--bg2); overflow:hidden; display:flex; align-items:center; justify-content:center; font-family:var(--serif); font-size:20px; font-weight:700; color:var(--cream); cursor:pointer; transition:border-color .2s, transform .2s; box-shadow:0 6px 18px rgba(0,0,0,0.35); }
        button.user-avatar:hover { border-color:var(--gold); transform:translateY(-1px); }
        .user-avatar img { width:100%; height:100%; object-fit:cover; }

        /* THEME SWITCH */
        .theme-switch { position:relative; display:flex; align-items:center; width:66px; height:33px; border-radius:999px; background:color-mix(in srgb, var(--border) 70%, transparent) !important; backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid var(--border) !important; box-shadow:0 8px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06); cursor:pointer; transition:background .35s, border-color .35s; flex-shrink:0; }
        .theme-switch:hover { border-color:var(--gold) !important; }
        .theme-switch-knob { position:absolute; top:4.5px; left:3.5px; width:22px; height:22px; border-radius:50%; background:linear-gradient(to bottom, rgba(255,255,255,0.96), rgba(237,229,212,0.85)); box-shadow:0 4px 10px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.6); display:flex; align-items:center; justify-content:center; transition:transform .45s cubic-bezier(0.22,1,0.36,1); }
        .theme-switch-knob.is-light { transform:translateX(36px); }
        .theme-switch-icon { width:14px; height:14px; }
        .theme-switch-placeholder { width:66px; height:33px; border-radius:999px; background:color-mix(in srgb, var(--border) 50%, transparent); border:1px solid var(--border); flex-shrink:0; }

        /* USER DROPDOWN */
        .user-menu-wrap { position:relative; }
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

        /* HERO */
        .page-header { position:relative; min-height:100vh; padding:120px clamp(24px,5vw,80px) 58px; overflow:hidden; display:flex; align-items:center; }
        .page-header-bg { position:absolute; inset:0; z-index:0; }
        .page-header-bg img { width:100%; height:100%; object-fit:cover; object-position:center 55%; filter:brightness(0.56) contrast(1.08) saturate(0.9); transition:filter .35s; }
        .light .page-header-bg img { filter:brightness(0.85) contrast(1) saturate(1); }
        .page-header-bg::after { content:""; position:absolute; inset:0; background:radial-gradient(circle at 65% 42%,rgba(201,168,106,0.13) 0%,transparent 28%),linear-gradient(to right,rgba(12,11,9,0.96) 0%,rgba(12,11,9,0.75) 42%,rgba(12,11,9,0.48) 100%),linear-gradient(to bottom,rgba(12,11,9,0.20) 0%,rgba(12,11,9,0.42) 55%,rgba(12,11,9,0.94) 100%); }
        .light .page-header-bg::after { background:linear-gradient(to right,rgba(244,240,232,0.35) 0%,rgba(244,240,232,0.15) 40%,rgba(244,240,232,0.05) 70%,transparent 100%); }
        .page-header-inner { position:relative; z-index:10; width:100%; max-width:1380px; margin:0 auto; display:grid; grid-template-columns:minmax(340px,0.85fr) minmax(560px,1.15fr); align-items:center; gap:clamp(48px,7vw,96px); }

        /* LEFT SIDE */
        .collection-copy { max-width:560px; }
        .collection-eyebrow-wrap { display:flex; align-items:center; gap:18px; margin-bottom:22px; }
        .collection-line { width:58px; height:1px; background:linear-gradient(to right,transparent,rgba(201,168,106,0.75)); }
        .page-eyebrow { font-size:10px; font-weight:800; letter-spacing:0.38em; text-transform:uppercase; color:var(--gold); }
        .page-h1 { font-family:var(--serif); font-size:clamp(76px,7vw,118px); font-weight:300; line-height:0.86; letter-spacing:-0.055em; color:var(--cream); text-shadow:0 24px 70px rgba(0,0,0,0.55); }
        .light .page-h1{color:#111; text-shadow:0 2px 8px rgba(0,0,0,.08);}
        .page-sub { margin-top:30px; font-size:18px; color:var(--muted); font-weight:500; line-height:1.8; max-width:470px; }
        .collection-stats { display:flex; gap:14px; margin-top:46px; }
        .collection-stat { min-width:180px; padding:22px 24px; border:1px solid var(--border); border-radius:18px; background:color-mix(in srgb, var(--border) 70%, transparent); backdrop-filter:blur(20px); box-shadow:0 18px 60px rgba(0,0,0,0.12); transition:background .35s, border-color .35s; }
        .collection-stat-icon { color:var(--gold); margin-bottom:10px; display:flex; align-items:center; }
        .collection-stat-main { display:flex; align-items:flex-end; gap:8px; }
        .collection-stat-number { font-family:var(--serif); font-size:42px; font-weight:300; line-height:0.8; color:var(--cream); }
        .collection-stat-label { font-size:9px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--dim); padding-bottom:3px; }
        .light .collection-stat { background:color-mix(in srgb, var(--bg) 80%, transparent); border-color:rgba(43,38,32,0.10); box-shadow:0 18px 50px rgba(0,0,0,0.28); }
        .light .collection-stat-icon { color:var(--gold); }
        .light .collection-stat-number { color:#2B2620; }
        .light .collection-stat-label { color:rgba(43,38,32,0.55); }

        /* RIGHT PANEL */
        .saved-preview-panel { width:100%; border:1px solid var(--border); border-radius:26px; background:color-mix(in srgb, var(--bg) 60%, transparent); backdrop-filter:blur(26px); box-shadow:0 34px 100px rgba(0,0,0,0.25),inset 0 1px 0 rgba(255,255,255,0.06); padding:34px; overflow:hidden; transition:background .35s, border-color .35s; }
        .saved-preview-head { display:flex; align-items:center; justify-content:space-between; gap:20px; margin-bottom:24px; }
        .saved-preview-title { font-family:var(--serif); font-size:28px; font-weight:400; color:var(--cream); }
        .saved-preview-count { font-size:10px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--gold); opacity:0.88; white-space:nowrap; }
        .saved-preview-list { display:flex; flex-direction:column; height:auto; max-height:520px; overflow-y:auto; padding-right:10px; }
        .saved-preview-list::-webkit-scrollbar { width:4px; }
        .saved-preview-list::-webkit-scrollbar-track { background:color-mix(in srgb, var(--border) 40%, transparent); border-radius:999px; }
        .saved-preview-list::-webkit-scrollbar-thumb { background:rgba(201,168,106,0.38); border-radius:999px; }
        .saved-preview-item { display:grid; grid-template-columns:170px 1fr auto; gap:26px; align-items:center; min-height:130px; padding:14px 0; border-bottom:1px solid var(--border); }
        .saved-preview-item:first-child { padding-top:0; }
        .saved-preview-item:last-child { border-bottom:none; }
        .saved-preview-thumb { position:relative; height:104px; border-radius:13px; overflow:hidden; background:var(--bg3); border:1px solid var(--border); }
        .saved-preview-thumb img { width:100%; height:100%; object-fit:cover; filter:brightness(0.88) saturate(0.9); transition:transform .7s ease; }
        .saved-preview-item:hover .saved-preview-thumb img { transform:scale(1.07); }
        .saved-preview-country { font-size:10px; font-weight:800; letter-spacing:0.26em; text-transform:uppercase; color:var(--gold); margin-bottom:8px; }
        .saved-preview-name { font-family:var(--serif); font-size:32px; font-weight:400; line-height:1; color:var(--cream); margin-bottom:12px; }
        .saved-preview-meta { display:flex; align-items:center; flex-wrap:wrap; gap:14px; font-size:12px;  color:rgba(255, 255, 255, 0.62); font-weight:500; }
        .light .saved-preview-meta { display:flex; align-items:center; flex-wrap:wrap; gap:14px; font-size:12px;  color:rgba(0, 0, 0, 0.84); font-weight:500; }
        .saved-preview-meta span { display:inline-flex; align-items:center; gap:6px; }
        .saved-preview-meta svg { flex-shrink:0; opacity:0.85; }
        .saved-preview-action-wrap { display:flex; flex-direction:column; align-items:center; gap:10px; }
        .saved-preview-action { width:42px; height:42px; border-radius:50%; border:1px solid rgba(201,168,106,0.45); color:var(--gold); display:flex; align-items:center; justify-content:center; transition:all .25s; flex-shrink:0; }
        .saved-preview-action:hover { background:var(--gold); color:var(--bg); transform:translateX(2px); }
        .saved-preview-remove { width:32px; height:32px; border-radius:50%; border:1px solid var(--border); color:var(--dim); display:flex; align-items:center; justify-content:center; transition:all .2s; }
        .saved-preview-remove:hover { color:#e08080; border-color:rgba(224,128,128,0.45); background:rgba(224,128,128,0.08); }
        .saved-preview-empty { min-height:360px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; border:1px dashed var(--border); border-radius:20px; background:color-mix(in srgb, var(--border) 30%, transparent); padding:34px; }
        .saved-preview-empty-icon { width:62px; height:62px; border-radius:50%; border:1px solid rgba(201,168,106,0.35); display:flex; align-items:center; justify-content:center; color:var(--gold); margin-bottom:18px; }
        .saved-preview-empty h3 { font-family:var(--serif); font-size:32px; font-weight:300; color:var(--cream); margin-bottom:10px; }
        .saved-preview-empty p { color:var(--dim); font-size:14px; line-height:1.7; max-width:340px; margin-bottom:24px; }
        .btn-gold-filled { display:inline-flex; align-items:center; justify-content:center; gap:10px; padding:14px 28px; background:var(--gold); border:1px solid var(--gold); border-radius:999px; font-size:9px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:#0c0b09; transition:all .25s; }
        .btn-gold-filled:hover { background:#d8b978; transform:translateY(-1px); }
        .spinner { width:36px; height:36px; border:2px solid var(--border); border-top-color:var(--gold); border-radius:50%; animation:spin .7s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }

        /* FOOTER */
        .footer { background:var(--bg); border-top:1px solid var(--border); padding:56px clamp(24px,5vw,80px) 28px; transition:background .35s; }
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
        .footer-lang-btn { display:flex; align-items:center; gap:6px; padding:8px 14px; border:1px solid var(--border); border-radius:999px; background:color-mix(in srgb, var(--border) 30%, transparent); font-size:10px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:var(--muted); transition:color .2s, border-color .2s; }
        .footer-lang-btn:hover { color:var(--cream); border-color:var(--gold); }
        .footer-lang-menu { position:absolute; bottom:calc(100% + 10px); right:0; min-width:150px; background:color-mix(in srgb, var(--bg) 97%, transparent); border:1px solid var(--border); border-radius:12px; overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,0.55); backdrop-filter:blur(24px); z-index:50; animation:dropIn .2s cubic-bezier(0.22,1,0.36,1); }
        .footer-lang-option { display:block; width:100%; text-align:left; padding:10px 14px; font-size:12px; font-weight:500; color:var(--muted); background:none; transition:background .15s,color .15s; }
        .footer-lang-option:hover { background:color-mix(in srgb, var(--border) 60%, transparent); color:var(--cream); }
        .footer-lang-option.active { color:var(--gold); font-weight:700; }

        @media (max-width:1100px) {
          .page-header { min-height:auto; padding-top:140px; }
          .page-header-inner { grid-template-columns:1fr; }
          .saved-preview-panel { max-width:780px; }
          .footer-top { grid-template-columns:1fr 1fr; }
        }
        @media (max-width:760px) {
          .nav-links { display:none; }
          .page-header { padding:120px 20px 56px; }
          .page-h1 { font-size:clamp(58px,17vw,82px); }
          .page-sub { font-size:15px; }
          .collection-stats { flex-direction:column; }
          .collection-stat { width:100%; }
          .saved-preview-panel { padding:20px; border-radius:20px; }
          .saved-preview-head { flex-direction:column; align-items:flex-start; }
          .saved-preview-list { max-height:520px; }
          .saved-preview-item { grid-template-columns:1fr; gap:14px; min-height:auto; }
          .saved-preview-thumb { height:190px; }
          .saved-preview-action-wrap { flex-direction:row; width:100%; }
          .saved-preview-action, .saved-preview-remove { width:100%; border-radius:999px; }
          .footer-top { grid-template-columns:1fr; }
          .footer-bottom { flex-direction:column; align-items:flex-start; }
        }
      `}</style>

      <div className="mt">
        {/* NAV */}
        <nav className={`nav ${navScrolled ? 'scrolled' : ''}`}>
          <Link href="/" className="nav-logo"><span>SCENIC</span><span>ROUTES</span></Link>
          <div className="nav-links">
            {[['Explore Routes','/explore'],['About','/about']].map(([l,h])=>(
              <Link key={l} href={h} className={`nav-link ${pathname === h ? "nav-link-active" : ""}`}>{l}</Link>
            ))}
            {user && <Link href="/my-trips" className={`nav-link ${pathname === "/my-trips" ? "nav-link-active" : ""}`}>My Trips</Link>}
          </div>
          <div className="nav-right">
            {!user && <ThemeSwitch />}
            {user ? (
              <div className="user-menu-wrap">
                <button className="user-avatar" onClick={()=>setShowUserMenu(p=>!p)}>
                  {avatarUrl ? <img src={avatarUrl} alt="avatar"/> : displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                </button>
                {showUserMenu && (
                  <div className="user-dropdown">
                    <div className="ud-header">
                      <div className="ud-avatar">
                        {avatarUrl ? <img src={avatarUrl} alt="avatar"/> : displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                      </div>
                      <div style={{minWidth:0}}>
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
                      <Link href="/profile" className="ud-link" onClick={()=>setShowUserMenu(false)}><span className="ud-link-icon"><UserIcon size={14} strokeWidth={1.8} /></span> Profile</Link>
                      <Link href="/my-trips" className="ud-link" onClick={()=>setShowUserMenu(false)}><span className="ud-link-icon"><MapIcon size={14} strokeWidth={1.8} /></span> My Trips</Link>
                      <Link href="/explore" className="ud-link" onClick={()=>setShowUserMenu(false)}><span className="ud-link-icon"><Compass size={14} strokeWidth={1.8} /></span> Explore Routes</Link>
                      <div className="ud-divider"/>
                      <button className="ud-logout" onClick={handleLogout}><span className="ud-link-icon" style={{color:'#e08080'}}><LogOut size={14} strokeWidth={1.8} /></span> Sign Out</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="login-btn">Login</Link>
            )}
          </div>
        </nav>

        {/* HERO */}
        <section className="page-header">
          <div className="page-header-bg">
            <img src="/road and mountains.jpg" alt="Hero" onError={(e) => { e.currentTarget.src = "/Trollstigen.jpg"; }} />
          </div>

          <div className="page-header-inner">
            <div className="collection-copy">
              <div className="collection-eyebrow-wrap">
                <span className="collection-line" />
                <p className="page-eyebrow">Your Collection</p>
              </div>
              <h1 className="page-h1">My Trips</h1>
              <p className="page-sub">The journeys you've chosen to remember. Revisit your favorite scenic routes and plan your next adventure.</p>
              <div className="collection-stats">
                <div className="collection-stat">
                  <div className="collection-stat-icon"><Bookmark size={19} strokeWidth={1.8} /></div>
                  <div className="collection-stat-main">
                    <span className="collection-stat-number">{user ? savedRoutes.length : 0}</span>
                    <span className="collection-stat-label">Saved Routes</span>
                  </div>
                </div>
                <div className="collection-stat">
                  <div className="collection-stat-icon"><Globe2 size={19} strokeWidth={1.8} /></div>
                  <div className="collection-stat-main">
                    <span className="collection-stat-number">{user ? savedCountriesCount : 0}</span>
                    <span className="collection-stat-label">Countries</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="saved-preview-panel">
              <div className="saved-preview-head">
                <h2 className="saved-preview-title">Your saved scenic routes</h2>
                {user && savedRoutes.length > 0 && (
                  <span className="saved-preview-count">{savedRoutes.length} saved</span>
                )}
              </div>

              {!user ? (
                <div className="saved-preview-empty">
                  <div className="saved-preview-empty-icon"><Heart size={24} strokeWidth={1.8} /></div>
                  <h3>Sign in to build your collection.</h3>
                  <p>Create an account and save the scenic routes you want to drive later.</p>
                  <button className="btn-gold-filled" onClick={() => setIsAuthOpen(true)}>Login →</button>
                </div>
              ) : loading ? (
                <div className="saved-preview-empty">
                  <div className="spinner" />
                </div>
              ) : savedRoutes.length === 0 ? (
                <div className="saved-preview-empty">
                  <div className="saved-preview-empty-icon"><Heart size={24} strokeWidth={1.8} /></div>
                  <h3>No saved routes yet.</h3>
                  <p>Explore the collection and save the routes that speak to you.</p>
                  <Link href="/explore" className="btn-gold-filled">Explore Routes →</Link>
                </div>
              ) : (
                <div className="saved-preview-list">
                  {savedRoutes.map((route: any) => (
                    <div key={route.id} className="saved-preview-item">
                      <Link href={`/routedetail/${route.id}`} className="saved-preview-thumb">
                        <img src={route.image_url || "/Amalfi coast road.jpg"} alt={route.title} onError={(e) => { e.currentTarget.src = "/Amalfi coast road.jpg"; }} />
                      </Link>
                      <div>
                        <p className="saved-preview-country">{route.country || "Scenic Route"}</p>
                        <Link href={`/routedetail/${route.id}`}>
                          <h3 className="saved-preview-name">{route.title}</h3>
                        </Link>
                        <div className="saved-preview-meta">
                          {route.distance_km && <span><Navigation size={13} strokeWidth={1.8} /> {fmtKm(route.distance_km)}</span>}
                          {route.duration && <span><Clock size={13} strokeWidth={1.8} /> {route.duration}</span>}
                          {(route.terrain || route.type) && <span>• {route.terrain || route.type}</span>}
                        </div>
                      </div>
                      <div className="saved-preview-action-wrap">
                        <Link href={`/routedetail/${route.id}`} className="saved-preview-action" title="Open route"><ChevronRight size={19} strokeWidth={2} /></Link>
                        <button className="saved-preview-remove" onClick={() => handleUnsave(route.id)} title="Remove from saved"><X size={15} strokeWidth={2} /></button>
                      </div>
                    </div>
                  ))}
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
                    className={`footer-logo-img ${mounted && theme === "light" ? "footer-logo-light" : "footer-logo-dark"}`}
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

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}