"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../../lib/supabase";
import AuthModal from "../AuthModal";
import { useTheme } from "next-themes";
import { ThemeSwitch } from "../components/ThemeSwitch";
import { useLanguage } from "../LanguageContext";
import {
  Bookmark, Globe2, Navigation, Clock, Heart, ChevronRight, X,
  User as UserIcon, Map as MapIcon, Compass, LogOut, Globe,
  Menu, ChevronDown,
} from "lucide-react";

const fmtKm = (km?: number) =>
  km != null ? `${km.toLocaleString("en-US")} km` : "—";

// NEU (Mobile): Footer-Linkdaten mit stabiler id fürs Akkordeon
const FOOTER_COLUMNS = [
  { id: "explore", headingKey: "footer.col.explore" as const, linkKeys: ["footer.link.allRoutes", "footer.link.myTrips", "footer.link.profile"] as const },
  { id: "about", headingKey: "footer.col.about" as const, linkKeys: ["footer.link.travellerPass", "footer.link.about", "footer.link.ourTeam"] as const },
  { id: "support", headingKey: "footer.col.support" as const, linkKeys: ["footer.link.faq", "footer.link.contact", "footer.link.reportProblem", "footer.link.reportRouteIssue"] as const },
  { id: "legal", headingKey: "footer.col.legal" as const, linkKeys: ["footer.link.termsOfUse", "footer.link.privacyPolicy", "footer.link.imprint"] as const },
];

// NEU (Mobile): wie viele Route-Einträge initial + pro "Load more"-Klick angezeigt werden
const MOBILE_PAGE_SIZE = 4;

export default function MyTripsPage() {
  const [user, setUser] = useState<any>(null);
  const [savedRoutes, setSavedRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [navScrolled, setNavScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const { t, lang, setLang } = useLanguage();
  const { theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  const [username, setUsername] = useState("");
  const displayName = username || user?.email?.split("@")[0] || "";

  // NEU (Mobile): Hamburger-Menü, Saved/Planned-Tabs, Pagination, Footer-Akkordeon
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [visibleCount, setVisibleCount] = useState(MOBILE_PAGE_SIZE);
  const [openFooterSection, setOpenFooterSection] = useState<string | null>(null);

  // NEU: eigener, abgerundeter Scrollbar-Indikator für die Saved-Routes-Liste
  // (native scrollbar-color/webkit-Radien werden von Browsern uneinheitlich
  // gerendert -> stattdessen selbst positionieren, native scrollbar wird versteckt)
  const savedListRef = useRef<HTMLDivElement>(null);
  const [savedThumb, setSavedThumb] = useState({ top: 0, height: 0, visible: false });

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

  // NEU (Mobile): Body-Scroll sperren, solange das Hamburger-Menü offen ist
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  // NEU (Mobile): erkennt den Mobile-Breakpoint JS-seitig, damit die
  // Pagination NUR auf Mobile greift — Desktop zeigt weiterhin alle
  // gespeicherten Routen ohne "Load more" auf einmal.
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 760);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  async function fetchSavedRoutes(userId: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("saved_routes")
      .select("route_id, routes(*)")
      .eq("user_id", userId);
    if (!error && data) setSavedRoutes(data.map((r: any) => r.routes).filter(Boolean));
    setLoading(false);
    // NEU (Mobile): Pagination nur bei einem echten Neuladen zurücksetzen
    // (z.B. nach Seitenwechsel/erneutem Mount) — NICHT beim lokalen Entfernen
    // einer einzelnen Route via handleUnsave, damit "Load more" nicht
    // verlorengeht, wenn man danach eine Route löscht.
    setVisibleCount(MOBILE_PAGE_SIZE);
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
    setMobileMenuOpen(false);
    router.push("/");
  }

  // NEU: berechnet Höhe/Position des eigenen Scrollbar-Thumbs anhand des
  // tatsächlichen Scroll-Zustands der Liste. min. 30px Thumb-Höhe, damit er
  // bei vielen Einträgen nicht zum unsichtbaren Punkt schrumpft.
  const updateSavedThumb = () => {
    const el = savedListRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight <= clientHeight + 1) {
      setSavedThumb({ top: 0, height: 0, visible: false });
      return;
    }
    const thumbHeight = Math.max((clientHeight / scrollHeight) * clientHeight, 30);
    const maxTop = clientHeight - thumbHeight;
    const thumbTop = (scrollTop / (scrollHeight - clientHeight)) * maxTop;
    setSavedThumb({ top: thumbTop, height: thumbHeight, visible: true });
  };

  useEffect(() => {
    updateSavedThumb();
    window.addEventListener("resize", updateSavedThumb);
    return () => window.removeEventListener("resize", updateSavedThumb);
  }, [savedRoutes, loading, user]);

  // NEU (Mobile): auf Mobile nur die sichtbare Teilmenge rendern, Desktop unverändert alles
  const displayedRoutes = isMobile ? savedRoutes.slice(0, visibleCount) : savedRoutes;
  const hasMoreMobile = isMobile && visibleCount < savedRoutes.length;

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
        .saved-preview-panel { width:100%; border:1px solid var(--border); border-radius:26px; background:color-mix(in srgb, var(--bg) 78%, transparent); backdrop-filter:blur(26px); box-shadow:0 34px 100px rgba(0,0,0,0.25),inset 0 1px 0 rgba(255,255,255,0.06); padding:34px; overflow:hidden; transition:background .35s, border-color .35s; }
        .saved-preview-head { display:flex; align-items:center; justify-content:space-between; gap:20px; margin-bottom:24px; }
        .saved-preview-title { font-family:var(--serif); font-size:28px; font-weight:400; color:var(--cream); }
        .saved-preview-count { font-size:10px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--gold); white-space:nowrap; }
        .light .saved-preview-count { color:#8A6A2E; }
        .saved-preview-list-wrap { position:relative; }
        .saved-preview-list {
          display:flex;
          flex-direction:column;
          height:auto;
          max-height:520px;
          overflow-y:auto;
          padding-right:14px;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .saved-preview-list::-webkit-scrollbar { display:none; width:0; height:0; }
        /* NEU: eigener, garantiert abgerundeter Scrollbar-Track/Thumb statt nativer Browser-Scrollbar */
        .custom-scrollbar-track { position:absolute; top:0; right:0; bottom:0; width:4px; border-radius:999px; background:color-mix(in srgb, var(--border) 55%, transparent); overflow:hidden; pointer-events:none; }
        .custom-scrollbar-thumb { width:4px; border-radius:999px; background:rgba(201,168,106,0.5); transition:background .2s; }
        .saved-preview-list-wrap:hover .custom-scrollbar-thumb { background:rgba(201,168,106,0.75); }
        .saved-preview-item { display:grid; grid-template-columns:170px 1fr auto; gap:26px; align-items:center; min-height:130px; padding:14px 0; border-bottom:1px solid var(--border); }
        .saved-preview-item:first-child { padding-top:0; }
        .saved-preview-item:last-child { border-bottom:none; }
        .saved-preview-thumb { position:relative; height:104px; border-radius:13px; overflow:hidden; background:var(--bg3); border:1px solid var(--border); }
        .saved-preview-thumb img { width:100%; height:100%; object-fit:cover; filter:brightness(0.88) saturate(0.9); transition:transform .7s ease; }
        .saved-preview-item:hover .saved-preview-thumb img { transform:scale(1.07); }
        .saved-preview-country { font-size:10px; font-weight:800; letter-spacing:0.26em; text-transform:uppercase; color:var(--gold); margin-bottom:8px; }
        .light .saved-preview-country { color:#8A6A2E; }
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
          .footer-top { grid-template-columns:1fr 1fr 1fr; }
          .footer-top > div:first-child { grid-column:1 / -1; }
        }
        @media (max-width:760px) {
          .nav-links { display:none; }
          .page-header { min-height:88vh; padding:120px 20px 64px; align-items:flex-end; }
          .page-h1 { font-size:clamp(58px,17vw,82px); }
          .page-header-bg img { transform:scale(1.18) translateY(-8%) !important; }
          .page-h1 { color:#EDE5D4 !important; }
          .page-sub { font-size:15px; color:#EDE5D4 !important; text-shadow:0 2px 10px rgba(0,0,0,0.45); }
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

        /* ==================================================================
           NEU (Mobile-Design) — ab hier ausschließlich neue Regeln/Klassen.
           Nichts oberhalb dieser Zeile wurde verändert.

           WICHTIG: jede "eingeklappt"-Voreinstellung (max-height:0 etc.) steht
           ausschließlich innerhalb der @media(max-width:760px)-Blöcke weiter
           unten. Basis-Regeln setzen bewusst "immer sichtbar", damit PC exakt
           das bisherige Verhalten behält.

           .mobile-only ist standardmäßig unsichtbar und wird nur innerhalb
           der Mobile-Media-Query wieder eingeblendet.
           ================================================================== */

        .mobile-only { display:none; }

        /* Hamburger-Button */
        .mobile-menu-btn { width:42px; height:42px; align-items:center; justify-content:center; border:1px solid var(--border); border-radius:50%; color:var(--cream); background:color-mix(in srgb, var(--border) 40%, transparent) !important; flex-shrink:0; }

        /* Mobile Popup-Menü (zentriertes Fenster, gleiches Muster wie die anderen Seiten) */
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

        /* Stats — kompakte 2-Spalten-Cards statt gestapelt */
        .mobile-collection-stats .collection-stat { width:auto; min-width:0; }

        /* Mobile Liste — kompakte horizontale Zeilen statt gestapelter Karten */
        .mobile-saved-section { background:var(--bg); border-top:1px solid var(--border); border-radius:28px 28px 0 0; box-shadow:0 -10px 40px rgba(0,0,0,0.12); padding:32px 20px 8px; }
        .mobile-saved-head { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:18px; }
        .mobile-route-row { display:flex; align-items:center; gap:14px; padding:14px 0; border-bottom:1px solid var(--border); }
        .mobile-route-row:last-child { border-bottom:none; }
        .mobile-route-thumb { width:76px; height:76px; border-radius:12px; overflow:hidden; flex-shrink:0; background:var(--bg3); border:1px solid var(--border); }
        .mobile-route-thumb img { width:100%; height:100%; object-fit:cover; }
        .mobile-route-info { flex:1; min-width:0; }
        .mobile-route-country { font-size:8px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:var(--gold); margin-bottom:4px; }
        .mobile-route-title { font-family:var(--serif); font-size:16px; font-weight:400; color:var(--cream); line-height:1.15; margin-bottom:6px; }
        .mobile-route-meta { display:flex; align-items:center; gap:10px; font-size:10px; color:var(--dim); font-weight:500; flex-wrap:wrap; }
        .mobile-route-meta span { display:inline-flex; align-items:center; gap:4px; }
        .mobile-route-actions { display:flex; flex-direction:column; align-items:center; gap:8px; flex-shrink:0; }
        button.mobile-route-open { width:30px; height:30px; border-radius:50%; border:1px solid rgba(201,168,106,0.45); color:var(--gold); display:flex; align-items:center; justify-content:center; }
        button.mobile-route-remove { width:26px; height:26px; border-radius:50%; border:1px solid var(--border); color:var(--dim); display:flex; align-items:center; justify-content:center; }

        /* Load more / Zähler */
        button.mobile-load-more { width:100%; padding:14px; margin-top:20px; border:1px dashed rgba(201,168,106,0.4); border-radius:999px; color:var(--gold); font-size:9px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; display:flex; align-items:center; justify-content:center; gap:8px; background:color-mix(in srgb, var(--gold) 6%, transparent) !important; }
        .mobile-showing-count { text-align:center; font-size:10px; color:var(--dim); margin-top:12px; margin-bottom:32px; letter-spacing:0.08em; }

        /* CTA — "Ready for your next journey?" */
        /* Footer — Social Icons + Akkordeon */
        .footer-col-header { display:flex; align-items:center; justify-content:space-between; width:100%; background:none !important; border:none; padding:0; cursor:default; pointer-events:none; text-align:left; }
        .footer-col-chevron { color:var(--dim); transition:transform .3s; flex-shrink:0; }
        .footer-col-chevron.open { transform:rotate(180deg); color:var(--gold); }
        .footer-col-links-wrap { overflow:visible; max-height:none; }

        @media (max-width:760px) {
          .mobile-menu-btn { display:flex; }
          .user-menu-wrap { display:none; }

          .saved-preview-panel { display:none; }
          .mobile-saved-section { display:block; margin:-32px 0 0; position:relative; z-index:15; }

          .collection-stats { display:none; }
          .mobile-collection-stats { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:24px; }

          .mobile-route-list { display:block; }

          .footer-col-header { cursor:pointer; pointer-events:auto; }
          .footer-lang-menu { left:0; right:auto; }
          .footer-top > div:first-child { text-align:center; }
          .footer-logo-container { justify-content:center; margin:0 auto; }
          .footer-tagline { margin-left:auto; margin-right:auto; }
          .footer-col-links-wrap { display:block; overflow:hidden; max-height:0; transition:max-height .3s ease; }
          .footer-col-links-wrap.open { max-height:400px; }
          .footer-col-chevron { display:block; }
        }
      `}</style>

      <div className="mt">
        {/* NAV */}
        <nav className={`nav ${navScrolled ? 'scrolled' : ''}`}>
          <Link href="/" className="nav-logo"><span>SCENIC</span><span>ROUTES</span></Link>
          <div className="nav-links">
            {[['nav.explore','/explore'],['nav.about','/about']].map(([key,h])=>(
              <Link key={key} href={h} className={`nav-link ${pathname === h ? "nav-link-active" : ""}`}>{t(key as any)}</Link>
            ))}
            {user && <Link href="/my-trips" className={`nav-link ${pathname === "/my-trips" ? "nav-link-active" : ""}`}>{t("nav.myTrips")}</Link>}
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
                        <p className="ud-role">{t("common.roleExplorer")}</p>
                      </div>
                    </div>

                    <div className="ud-theme-row">
                      <span className="ud-theme-label">{t("common.theme")}</span>
                      <ThemeSwitch />
                    </div>

                    <div className="ud-links">
                      <Link href="/profile" className="ud-link" onClick={()=>setShowUserMenu(false)}><span className="ud-link-icon"><UserIcon size={14} strokeWidth={1.8} /></span> {t("nav.profile")}</Link>
                      <Link href="/my-trips" className="ud-link" onClick={()=>setShowUserMenu(false)}><span className="ud-link-icon"><MapIcon size={14} strokeWidth={1.8} /></span> {t("nav.myTrips")}</Link>
                      <Link href="/explore" className="ud-link" onClick={()=>setShowUserMenu(false)}><span className="ud-link-icon"><Compass size={14} strokeWidth={1.8} /></span> {t("nav.explore")}</Link>
                      <div className="ud-divider"/>
                      <button className="ud-logout" onClick={handleLogout}><span className="ud-link-icon" style={{color:'#e08080'}}><LogOut size={14} strokeWidth={1.8} /></span> {t("nav.signOut")}</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="login-btn">{t("nav.login")}</Link>
            )}

            {/* NEU (Mobile): Hamburger-Button */}
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
        <div className={`mobile-nav-backdrop ${mobileMenuOpen ? "open" : ""}`} onClick={() => setMobileMenuOpen(false)} />

        <div className={`mobile-nav-drawer ${mobileMenuOpen ? "open" : ""}`}>
          <div className="mobile-nav-top">
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.18em" }}>SCENIC ROUTES</span>
            <button className="mobile-nav-close" onClick={() => setMobileMenuOpen(false)} aria-label="Menü schließen">
              <X size={18} strokeWidth={1.8} />
            </button>
          </div>

          {user ? (
            <div className="mobile-profile-card">
              <div className="ud-header">
                <div className="ud-avatar">
                  {avatarUrl ? <img src={avatarUrl} alt="avatar" onError={() => setAvatarUrl("")} /> : displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
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
                  <span className="ud-link-icon"><Compass size={14} strokeWidth={1.8} /></span>
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
                <Link href="/login" className="mobile-nav-login" onClick={() => setMobileMenuOpen(false)}>{t("nav.login")}</Link>
                <ThemeSwitch />
              </div>
            </>
          )}
        </div>

        {/* HERO */}
        <section className="page-header">
          <div className="page-header-bg">
            <img src="/road and mountains.jpg" alt="Hero" onError={(e) => { e.currentTarget.src = "/Trollstigen.jpg"; }} />
          </div>

          <div className="page-header-inner">
            <div className="collection-copy">
              <div className="collection-eyebrow-wrap">
                <span className="collection-line" />
                <p className="page-eyebrow">{t("mytrips.eyebrow")}</p>
              </div>
              <h1 className="page-h1">{t("mytrips.h1")}</h1>
              <p className="page-sub">{t("mytrips.subtitle")}</p>

              {/* Desktop-Stats — unverändert */}
              <div className="collection-stats">
                <div className="collection-stat">
                  <div className="collection-stat-icon"><Bookmark size={19} strokeWidth={1.8} /></div>
                  <div className="collection-stat-main">
                    <span className="collection-stat-number">{user ? savedRoutes.length : 0}</span>
                    <span className="collection-stat-label">{t("mytrips.stats.saved")}</span>
                  </div>
                </div>
                <div className="collection-stat">
                  <div className="collection-stat-icon"><Globe2 size={19} strokeWidth={1.8} /></div>
                  <div className="collection-stat-main">
                    <span className="collection-stat-number">{user ? savedCountriesCount : 0}</span>
                    <span className="collection-stat-label">{t("mytrips.stats.countries")}</span>
                  </div>
                </div>
              </div>

              {/* NEU (Mobile): Stats als kompaktes 2-Spalten-Grid, eigenes
                  Markup, per .mobile-only auf PC unsichtbar */}
              <div className="mobile-collection-stats mobile-only">
                <div className="collection-stat">
                  <div className="collection-stat-icon"><Bookmark size={17} strokeWidth={1.8} /></div>
                  <div className="collection-stat-main">
                    <span className="collection-stat-number">{user ? savedRoutes.length : 0}</span>
                    <span className="collection-stat-label">{t("mytrips.stats.saved")}</span>
                  </div>
                </div>
                <div className="collection-stat">
                  <div className="collection-stat-icon"><Globe2 size={17} strokeWidth={1.8} /></div>
                  <div className="collection-stat-main">
                    <span className="collection-stat-number">{user ? savedCountriesCount : 0}</span>
                    <span className="collection-stat-label">{t("mytrips.stats.countries")}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="saved-preview-panel">
              <div className="saved-preview-head">
                <h2 className="saved-preview-title">{t("mytrips.savedTitle")}</h2>
              </div>

              {/* Planned-Tab wurde entfernt */}

              {!user ? (
                <div className="saved-preview-empty">
                  <div className="saved-preview-empty-icon"><Heart size={24} strokeWidth={1.8} /></div>
                  <h3>{t("mytrips.empty.signInTitle")}</h3>
                  <p>{t("mytrips.empty.signInText")}</p>
                  <button className="btn-gold-filled" onClick={() => setIsAuthOpen(true)}>{t("mytrips.empty.loginBtn")}</button>
                </div>
              ) : loading ? (
                <div className="saved-preview-empty">
                  <div className="spinner" />
                </div>
              ) : savedRoutes.length === 0 ? (
                <div className="saved-preview-empty">
                  <div className="saved-preview-empty-icon"><Heart size={24} strokeWidth={1.8} /></div>
                  <h3>{t("mytrips.empty.noRoutesTitle")}</h3>
                  <p>{t("mytrips.empty.noRoutesText")}</p>
                  <Link href="/explore" className="btn-gold-filled">{t("mytrips.empty.exploreBtn")}</Link>
                </div>
              ) : (
                <div className="saved-preview-list-wrap">
                  <div className="saved-preview-list" ref={savedListRef} onScroll={updateSavedThumb}>
                    {savedRoutes.map((route: any) => (
                      <div key={route.id} className="saved-preview-item">
                        <Link href={`/routedetail/${route.id}`} className="saved-preview-thumb">
                          <img src={route.image_url || "/Amalfi coast road.jpg"} alt={route.title} onError={(e) => { e.currentTarget.src = "/Amalfi coast road.jpg"; }} />
                        </Link>
                        <div>
                          <p className="saved-preview-country">{route.country || t("home.popular.fallbackType")}</p>
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
                          <Link href={`/routedetail/${route.id}`} className="saved-preview-action" title={t("mytrips.openRoute")}><ChevronRight size={19} strokeWidth={2} /></Link>
                          <button className="saved-preview-remove" onClick={() => handleUnsave(route.id)} title={t("mytrips.removeFromSaved")}><X size={15} strokeWidth={2} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {savedThumb.visible && (
                    <div className="custom-scrollbar-track">
                      <div
                        className="custom-scrollbar-thumb"
                        style={{ height: savedThumb.height, transform: `translateY(${savedThumb.top}px)` }}
                      />
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </section>

        {/* NEU (Mobile): eigenständige Card AUSSERHALB der Hero-Section, mit
            deckendem Hintergrund statt durchscheinendem Hero-Bild dahinter.
            Ersetzt visuell die (auf Mobile ausgeblendete) .saved-preview-panel. */}
        <div className="mobile-saved-section mobile-only">
          <div className="mobile-saved-head">
            <h2 className="saved-preview-title">{t("mytrips.savedTitle")}</h2>
            {user && savedRoutes.length > 0 && (
              <span className="saved-preview-count">{savedRoutes.length} {t("mytrips.savedSuffix")}</span>
            )}
          </div>

          <div className="mobile-route-list">
            {!user ? (
              <div className="saved-preview-empty">
                <div className="saved-preview-empty-icon"><Heart size={24} strokeWidth={1.8} /></div>
                <h3>{t("mytrips.empty.signInTitle")}</h3>
                <p>{t("mytrips.empty.signInText")}</p>
                <button className="btn-gold-filled" onClick={() => setIsAuthOpen(true)}>{t("mytrips.empty.loginBtn")}</button>
              </div>
            ) : loading ? (
              <div className="saved-preview-empty">
                <div className="spinner" />
              </div>
            ) : savedRoutes.length === 0 ? (
              <div className="saved-preview-empty">
                <div className="saved-preview-empty-icon"><Heart size={24} strokeWidth={1.8} /></div>
                <h3>{t("mytrips.empty.noRoutesTitle")}</h3>
                <p>{t("mytrips.empty.noRoutesText")}</p>
                <Link href="/explore" className="btn-gold-filled">{t("mytrips.empty.exploreBtn")}</Link>
              </div>
            ) : (
              <>
                {displayedRoutes.map((route: any) => (
                  <div key={route.id} className="mobile-route-row">
                    <Link href={`/routedetail/${route.id}`} className="mobile-route-thumb">
                      <img src={route.image_url || "/Amalfi coast road.jpg"} alt={route.title} onError={(e) => { e.currentTarget.src = "/Amalfi coast road.jpg"; }} />
                    </Link>
                    <div className="mobile-route-info">
                      <p className="mobile-route-country">{route.country || t("home.popular.fallbackType")}</p>
                      <Link href={`/routedetail/${route.id}`}>
                        <h3 className="mobile-route-title">{route.title}</h3>
                      </Link>
                      <div className="mobile-route-meta">
                        {route.distance_km && <span><Navigation size={11} strokeWidth={1.8} /> {fmtKm(route.distance_km)}</span>}
                        {route.duration && <span><Clock size={11} strokeWidth={1.8} /> {route.duration}</span>}
                      </div>
                    </div>
                    <div className="mobile-route-actions">
                      <Link href={`/routedetail/${route.id}`} className="mobile-route-open" title={t("mytrips.openRoute")}><ChevronRight size={15} strokeWidth={2} /></Link>
                      <button className="mobile-route-remove" onClick={() => handleUnsave(route.id)} title={t("mytrips.remove")}><X size={12} strokeWidth={2} /></button>
                    </div>
                  </div>
                ))}

                {/* NEU (Mobile): "Load more" + Zähler, echte Pagination —
                    Desktop zeigt weiterhin alle gespeicherten Routen auf einmal */}
                {hasMoreMobile && (
                  <button
                    className="mobile-load-more"
                    onClick={() => setVisibleCount((p) => p + MOBILE_PAGE_SIZE)}
                  >
                    + {t("mytrips.loadMore")}
                  </button>
                )}
                <p className="mobile-showing-count">
                  {t("mytrips.showing")} {displayedRoutes.length} {t("common.of")} {savedRoutes.length} {t("common.routes")}
                </p>
              </>
            )}
          </div>
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
                    className={`footer-logo-img ${mounted && theme === "light" ? "footer-logo-light" : "footer-logo-dark"}`}
                  />
                </div>

                <p className="footer-tagline">
                  {t("home.footer.tagline")}
                </p>

                {/* NEU (Mobile): Social-Icons */}
                {/* Social-Icons wurden entfernt */}
              </div>

              {FOOTER_COLUMNS.map(({ id, headingKey, linkKeys }) => {
                const isOpen = openFooterSection === id;
                return (
                  <div className="footer-col" key={id}>
                    {/* NEU (Mobile): Header klickbar (Akkordeon). Auf PC durch
                        pointer-events:none wirkungslos, Links bleiben über
                        .footer-col-links-wrap (max-height:none Basis-Regel)
                        immer sichtbar. */}
                    <button
                      className="footer-col-header"
                      onClick={() => setOpenFooterSection(isOpen ? null : id)}
                    >
                      <p className="footer-col-title" style={{ marginBottom: 0 }}>{t(headingKey)}</p>
                      <ChevronDown size={14} className={`footer-col-chevron mobile-only ${isOpen ? "open" : ""}`} />
                    </button>

                    <div className={`footer-col-links-wrap ${isOpen ? "open" : ""}`}>
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
      </div>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}