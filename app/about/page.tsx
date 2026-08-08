"use client";

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase, safeQuery } from '../../lib/supabase';
import { useAuth, signOutSafe } from '../../lib/useAuth';
import { useTheme } from 'next-themes';
import { ThemeSwitch } from '../components/ThemeSwitch';
import { useLanguage } from '../LanguageContext';
import {
  User as UserIcon, Map as MapIcon, Compass, LogOut, ArrowRight, Globe,
  Menu, X, ChevronRight, ChevronDown, Mail,
} from 'lucide-react';

// NEU (Mobile): eigene Instagram/YouTube-Icons im lucide-Stroke-Stil,
// da diese Marken-Icons in lucide-react nicht mehr enthalten sind.
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

const TEAM = [
  { initials: "LA", name: "Lavr", roleKey: "about.team.role1" as const, bioKey: "about.team.bio1" as const },
  { initials: "UM", name: "Usman", roleKey: "about.team.role2" as const, bioKey: "about.team.bio2" as const },
  { initials: "MB", name: "Madalina", roleKey: "about.team.role3" as const, bioKey: "about.team.bio3" as const },
];

const STATS = [
  { value: "90+", labelKey: "about.stats.routes" as const },
  { value: "10+", labelKey: "about.stats.countries" as const },
  { value: "10+", labelKey: "about.stats.travellers" as const },
  { value: "6", labelKey: "about.stats.continents" as const },
];

const VALUES = [
  { num: "01", titleKey: "about.values.v1.title" as const, textKey: "about.values.v1.text" as const },
  { num: "02", titleKey: "about.values.v2.title" as const, textKey: "about.values.v2.text" as const },
  { num: "03", titleKey: "about.values.v3.title" as const, textKey: "about.values.v3.text" as const },
];

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
      // Our Team ist der Anchor-Abschnitt weiter unten auf dieser Page (id="team")
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

export default function AboutPage() {
  // GEÄNDERT: zentraler Auth-State statt eigenem getSession()/Listener.
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const { t, lang, setLang } = useLanguage();
  const { theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const loginHref = `/login?redirect=${encodeURIComponent(pathname)}`;
  const [username, setUsername] = useState("");
  const displayName = username || user?.email?.split("@")[0] || "";

  // NEU (Mobile): Hamburger-Menü, Values-Akkordeon, Team-Karussell, Footer-Akkordeon
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openValueIndex, setOpenValueIndex] = useState<number | null>(0);
  const [teamActiveIndex, setTeamActiveIndex] = useState(0);
  const [openFooterSection, setOpenFooterSection] = useState<string | null>(null);
  const teamScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // GEÄNDERT: Profil-Lookup hängt jetzt am zentralen Auth-State und läuft über
  // safeQuery (Timeout, kein Throw) — vorher lief er direkt im
  // onAuthStateChange-Callback, also innerhalb des Supabase-Auth-Locks. Genau
  // solche Queries im Callback können die gesamte App verklemmen.
  useEffect(() => {
    if (!user) { setUsername(""); setAvatarUrl(""); return; }

    let mounted = true;
    (async () => {
      const data = await safeQuery<{ avatar_url: string | null; username: string | null }>(
        supabase.from("profiles").select("avatar_url, username").eq("id", user.id).single(),
        "fetchProfile"
      );
      if (!mounted || !data) return;
      setAvatarUrl(data.avatar_url || "");
      setUsername(data.username || "");
    })();

    return () => { mounted = false; };
  }, [user]);

  async function handleLogout() {
    await signOutSafe();
    setUsername(""); setAvatarUrl(""); setShowUserMenu(false);
    setMobileMenuOpen(false);
    router.push("/");
  }

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

  // NEU (Mobile): aktiven Dot beim horizontalen Scrollen der Team-Cards ermitteln
  const handleTeamScroll = () => {
    const el = teamScrollRef.current;
    if (!el) return;
    const cardWidth = el.scrollWidth / TEAM.length;
    const idx = Math.round(el.scrollLeft / cardWidth);
    setTeamActiveIndex(Math.min(TEAM.length - 1, Math.max(0, idx)));
  };

  const scrollToTeamCard = (idx: number) => {
    const el = teamScrollRef.current;
    if (!el) return;
    const cardWidth = el.scrollWidth / TEAM.length;
    el.scrollTo({ left: cardWidth * idx, behavior: "smooth" });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500;600;700;800&display=swap');

        /* DARK THEME */
        .dark {
          --bg:#0c0b09; --bg2:#111009; --bg3:#181510;
          --gold:#C9A86A; --cream:#EDE5D4;
          --muted:rgba(237,229,212,0.56); --dim:rgba(237,229,212,0.32);
          --border:rgba(237,229,212,0.10);
          --serif:'Cormorant Garamond',Georgia,serif;
          --sans:'Inter',system-ui,sans-serif;
        }

        /* LIGHT THEME */
        .light {
          --bg:#F4F0E8; --bg2:#EDE8DC; --bg3:#E5DFD0;
          --gold:#C9A86A; --cream:#2B2620;
          --muted:rgba(43,38,32,0.62); --dim:rgba(43,38,32,0.38);
          --border:rgba(43,38,32,0.12);
          --serif:'Cormorant Garamond',Georgia,serif;
          --sans:'Inter',system-ui,sans-serif;
        }

        .ab *, .ab *::before, .ab *::after { box-sizing:border-box; margin:0; padding:0; }
        .ab a      { color:inherit; text-decoration:none; }
        .ab button { border:none; font:inherit; cursor:pointer; background:none; }
        .ab img    { display:block; }
        .ab { min-height:100vh; background:var(--bg); color:var(--cream); font-family:var(--sans); overflow-x:hidden; transition:background .35s, color .35s; }

        /* NAV */
        .nav { position:fixed; inset:0 0 auto; z-index:200; height:72px; padding:0 clamp(20px,4vw,60px); display:flex; align-items:center; justify-content:space-between; background:transparent; border-bottom:1px solid transparent; transition:background .35s,border-color .35s; }
        .nav.scrolled { background:color-mix(in srgb, var(--bg) 92%, transparent); backdrop-filter:blur(20px); border-bottom-color:var(--border); }
        .nav-logo { display:flex; flex-direction:column; line-height:1; }
        .nav-logo span { font-size:11px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--cream); }
        .nav-links { display:flex; gap:36px; }
        .nav-link { position:relative; font-size:13px; font-weight:600; letter-spacing:0.16em; text-transform:uppercase; color:var(--muted); opacity:0.5; transition:color .2s, opacity .2s; }
        .nav-link::after { content:""; position:absolute; left:0; bottom:-8px; width:0; height:1px; background:var(--gold); transition:width .25s; }
        .nav-link:hover { color:var(--cream); opacity:1; }
        .nav-link:hover::after { width:100%; }
        .nav-link-active { color:var(--cream) !important; font-weight:700; opacity:1; }
        .nav-right { display:flex; align-items:center; gap:16px; }
        .login-btn { padding:10px 22px; border:1px solid var(--border); border-radius:999px; font-size:10px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:var(--cream); background:color-mix(in srgb, var(--border) 40%, transparent); transition:all .25s; }
        .login-btn:hover { background:var(--cream); color:var(--bg); }

        /* THEME SWITCH */
        .theme-switch { position:relative; display:flex; align-items:center; width:66px; height:33px; border-radius:999px; background:color-mix(in srgb, var(--border) 70%, transparent) !important; backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid var(--border) !important; box-shadow:0 8px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06); cursor:pointer; transition:background .35s, border-color .35s; flex-shrink:0; }
        .theme-switch:hover { border-color:var(--gold) !important; }
        .theme-switch-knob { position:absolute; top:4.5px; left:3.5px; width:22px; height:22px; border-radius:50%; background:linear-gradient(to bottom, rgba(255,255,255,0.96), rgba(237,229,212,0.85)); box-shadow:0 4px 10px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.6); display:flex; align-items:center; justify-content:center; transition:transform .45s cubic-bezier(0.22,1,0.36,1); }
        .theme-switch-knob.is-light { transform:translateX(36px); }
        .theme-switch-icon { width:14px; height:14px; }
        .theme-switch-placeholder { width:66px; height:33px; border-radius:999px; background:color-mix(in srgb, var(--border) 50%, transparent); border:1px solid var(--border); flex-shrink:0; }
        button.user-avatar { width:48px; height:48px; border-radius:50%; border:1.5px solid var(--border); background:var(--bg2); overflow:hidden; display:flex; align-items:center; justify-content:center; font-family:var(--serif); font-size:20px; font-weight:700; color:var(--cream); cursor:pointer; transition:border-color .2s, transform .2s; box-shadow:0 6px 18px rgba(0,0,0,0.35); }
        button.user-avatar:hover { border-color:var(--gold); transform:translateY(-1px); }
        .user-avatar img { width:100%; height:100%; object-fit:cover; }

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
        .about-hero { position:relative; min-height:100vh; display:flex; align-items:flex-end; overflow:hidden; }
        .about-hero-bg { position:absolute; inset:0; }
        .about-hero-bg img { width:100%; height:100%; object-fit:cover; object-position:center 35%; filter:brightness(0.45) contrast(1.1) saturate(0.85); transition:filter .35s; }
        .light .about-hero-bg img { filter:brightness(0.78) contrast(1.05) saturate(0.9); }
        .about-hero-bg::after { content:""; position:absolute; inset:0; background:linear-gradient(to bottom, rgba(12,11,9,0.15) 0%, rgba(12,11,9,0.05) 35%, rgba(12,11,9,0.7) 70%, rgba(12,11,9,0.98) 100%), linear-gradient(to right, rgba(12,11,9,0.8) 0%, rgba(12,11,9,0.3) 50%, transparent 100%); }
        .light .about-hero-bg::after { display:none; }
        .about-hero-content { position:relative; z-index:10; width:100%; max-width:1380px; margin:0; padding:0 clamp(24px,5vw,80px) clamp(60px,8vh,100px) clamp(24px,3vw,48px); }
        .about-eyebrow { font-size:11px; font-weight:800; letter-spacing:0.38em; text-transform:uppercase; color:var(--gold); margin-bottom:24px; }
        .light .about-eyebrow { text-shadow:0 2px 10px rgba(0,0,0,0.3); }
        .about-h1 { font-family:var(--serif); font-size:clamp(56px,8vw,110px); font-weight:300; line-height:1; letter-spacing:-0.045em; color:var(--cream); margin-bottom:32px; text-shadow:0 20px 60px rgba(0,0,0,0.5); max-width:900px; }
        .light .about-h1 { color:#fff; text-shadow:0 4px 24px rgba(0,0,0,0.45); }
        .about-h1 em { font-style:italic; color:var(--muted); }
        .light .about-h1 em { color:rgba(255,255,255,0.78); }
        .about-hero-sub { font-size:16px; font-weight:300; color:var(--muted); line-height:1.8; max-width:520px; border-left:2px solid var(--gold); padding-left:20px; margin-bottom:40px; }
        .light .about-hero-sub { color:rgba(255,255,255,0.9); text-shadow:0 2px 10px rgba(0,0,0,0.35); }
        .about-hero-actions { display:flex; align-items:center; gap:20px; flex-wrap:wrap; }
        .btn-gold-filled { display:inline-flex; align-items:center; gap:10px; padding:14px 28px; background:var(--gold); border:1px solid var(--gold); border-radius:999px; font-size:9px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:#0c0b09; transition:all .25s; }
        .btn-gold-filled:hover { background:#d8b978; transform:translateY(-1px); }
        .btn-outline { display:inline-flex; align-items:center; gap:10px; padding:14px 28px; background:transparent; border:1px solid var(--border); border-radius:999px; font-size:9px; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; color:var(--muted); transition:all .25s; }
        .btn-outline:hover { border-color:var(--cream); color:var(--cream); }
        .light .about-hero-actions .btn-outline { color:#fff; border-color:rgba(255,255,255,0.5); }
        .light .about-hero-actions .btn-outline:hover { border-color:#fff; color:#fff; }

        /* STATS */
        .stats-section { background:var(--bg); border-top:1px solid var(--border); border-bottom:1px solid var(--border); transition:background .35s; }
        .stats-inner { max-width:1380px; margin:0 auto; padding:0 clamp(24px,5vw,80px); display:grid; grid-template-columns:repeat(4,1fr); }
        .stat-item { padding:36px clamp(16px,3vw,48px); border-right:1px solid var(--border); display:flex; flex-direction:column; align-items:center; gap:8px; }
        .stat-item:first-child { padding-left:0; align-items:flex-start; }
        .stat-item:last-child  { border-right:none; }
        .stat-num   { font-family:var(--serif); font-size:clamp(32px,3.5vw,48px); font-weight:300; color:var(--cream); line-height:1; }
        .stat-label { font-size:9px; font-weight:800; letter-spacing:0.26em; text-transform:uppercase; color:var(--dim); }

        /* SECTIONS */
        .section { padding:clamp(80px,10vw,130px) clamp(24px,5vw,80px); transition:background .35s; }
        .container { max-width:1380px; margin:0 auto; }
        .section-eyebrow { font-size:9px; font-weight:800; letter-spacing:0.38em; text-transform:uppercase; color:var(--gold); margin-bottom:20px; }
        .section-h2 { font-family:var(--serif); font-size:clamp(38px,5vw,68px); font-weight:300; line-height:0.92; letter-spacing:-0.04em; color:var(--cream); }

        /* VALUES */
        .values-section { background:var(--bg2); border-top:1px solid var(--border); border-bottom:1px solid var(--border); }
        .values-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:var(--border); margin-top:56px; border-radius:24px; overflow:hidden; }
        .value-card { background:var(--bg2); padding:44px 36px; transition:background .3s; }
        .value-card:hover { background:var(--bg3); }
        .value-num  { font-family:var(--serif); font-size:48px; font-weight:300; color:var(--gold); line-height:1; margin-bottom:24px; }
        .value-title{ font-size:12px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:var(--cream); margin-bottom:14px; }
        .value-text { font-size:14px; color:var(--dim); line-height:1.8; font-weight:300; }

        /* MISSION */
        .mission-section { background:var(--bg); }
        .mission-grid { display:grid; grid-template-columns:1fr 1fr; gap:clamp(40px,6vw,100px); align-items:center; margin-top:60px; }
        .mission-image { position:relative; border-radius:24px; overflow:hidden; aspect-ratio:4/3; border:1px solid var(--border); }
        .mission-image img { width:100%; height:100%; object-fit:cover; filter:brightness(0.85) contrast(1.05) saturate(0.9); transition:transform .8s ease, filter .35s; }
        .light .mission-image img { filter:brightness(0.95) contrast(1.02) saturate(0.95); }
        .mission-image:hover img { transform:scale(1.03); }
        .mission-text { font-size:16px; color:var(--dim); line-height:1.9; font-weight:300; }
        .mission-text strong { color:var(--cream); font-weight:600; }

        /* TEAM */
        .team-section { background:var(--bg); border-top:1px solid var(--border); scroll-margin-top:96px; }
        .team-header { display:flex; align-items:flex-end; justify-content:space-between; gap:24px; margin-bottom:52px; }
        .team-sub { font-size:13px; color:var(--dim); line-height:1.7; font-weight:300; max-width:280px; text-align:right; }
        .team-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
        .team-card { background:var(--bg3); border:1px solid var(--border); border-radius:22px; padding:32px 28px; transition:border-color .3s,transform .3s,background .3s; }
        .team-card:hover { border-color:rgba(201,168,106,0.28); transform:translateY(-4px); }
        .team-avatar { width:52px; height:52px; border-radius:14px; background:linear-gradient(135deg,rgba(201,168,106,0.3),rgba(201,168,106,0.08)); border:1px solid rgba(201,168,106,0.3); display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:800; color:var(--gold); letter-spacing:0.05em; margin-bottom:22px; }
        .team-name { font-size:13px; font-weight:800; letter-spacing:0.1em; color:var(--cream); margin-bottom:4px; }
        .team-role { font-size:9px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--gold); margin-bottom:14px; }
        .team-bio  { font-size:13px; color:var(--dim); line-height:1.7; font-weight:300; }
        .team-footer-bar { margin-top:16px; background:var(--bg3); border:1px solid var(--border); border-radius:16px; padding:18px 24px; display:flex; align-items:center; justify-content:space-between; }
        .team-footer-link { display:inline-flex; align-items:center; gap:6px; font-size:9px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase; color:var(--gold); transition:color .2s; }
        .team-footer-link:hover { color:var(--cream); }

        /* CTA */
        .cta-section { background:var(--bg2); border-top:1px solid var(--border); }
        .cta-inner { background:color-mix(in srgb, var(--gold) 8%, var(--bg3)); border:1px solid rgba(201,168,106,0.2); border-radius:30px; padding:clamp(48px,7vw,80px) clamp(32px,5vw,72px); display:flex; flex-direction:column; align-items:center; text-align:center; }
        .cta-h2  { font-family:var(--serif); font-size:clamp(42px,5vw,72px); font-weight:300; line-height:0.92; letter-spacing:-0.04em; color:var(--cream); margin-bottom:16px; }
        .cta-sub { font-size:15px; color:var(--dim); font-weight:300; margin-bottom:36px; }
        .cta-actions { display:flex; gap:16px; flex-wrap:wrap; justify-content:center; }

        /* FOOTER */
        .footer { background:var(--bg); border-top:1px solid var(--border); padding:56px clamp(24px,5vw,80px) 28px; }
        .footer-inner  { max-width:1200px; margin:0 auto; }
        .footer-top    { display:grid; grid-template-columns:1.1fr 1fr 1fr 1fr 1fr; gap:28px; padding-bottom:40px; border-bottom:1px solid var(--border); margin-bottom:22px; }
        .footer-brand  { font-size:11px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--cream); line-height:1.2; margin-bottom:12px; }
        .footer-logo-container { width:220px; height:147px; display:flex; align-items:center; flex-shrink:0; }
        .footer-logo-img { height:auto; display:block; }
        .footer-logo-light { width:180px; }
        .footer-logo-dark  { width:220px; filter:invert(33%) sepia(46%) saturate(600%) hue-rotate(4deg) brightness(96%) drop-shadow(0 4px 10px rgba(0,0,0,0.6)); }
        .footer-tagline{ font-size:12px; color:var(--dim); line-height:1.7; font-weight:300; margin-bottom:18px; max-width:200px; }
        .footer-col-title { font-size:9px; font-weight:800; letter-spacing:0.28em; text-transform:uppercase; color:var(--dim); margin-bottom:16px; }
        a.footer-col-link { display:block; font-size:12px; color:var(--dim); margin-bottom:10px; font-weight:300; transition:color .2s; }
        a.footer-col-link:hover { color:var(--cream); }
        .footer-bottom { display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; }
        .footer-copy   { font-size:10px; color:var(--dim); letter-spacing:0.08em; text-transform:uppercase; }
        .footer-controls { display:flex; align-items:center; gap:22px; flex-wrap:wrap; }
        .footer-legal  { display:flex; gap:22px; }
        .footer-legal a{ font-size:10px; color:var(--dim); letter-spacing:0.08em; text-transform:uppercase; transition:color .2s; }
        .footer-legal a:hover { color:var(--cream); }

        /* FOOTER — Sprachauswahl */
        .footer-lang-wrap { position:relative; }
        .footer-lang-btn { display:flex; align-items:center; gap:6px; padding:8px 14px; border:1px solid var(--border); border-radius:999px; background:color-mix(in srgb, var(--border) 30%, transparent); font-size:10px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:var(--muted); transition:color .2s, border-color .2s; }
        .footer-lang-btn:hover { color:var(--cream); border-color:var(--gold); }
        .footer-lang-menu { position:absolute; bottom:calc(100% + 10px); right:0; min-width:150px; background:color-mix(in srgb, var(--bg) 97%, transparent); border:1px solid var(--border); border-radius:12px; overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,0.55); backdrop-filter:blur(24px); z-index:50; animation:dropIn .2s cubic-bezier(0.22,1,0.36,1); }
        .footer-lang-option { display:block; width:100%; text-align:left; padding:10px 14px; font-size:12px; font-weight:500; color:var(--muted); background:none; transition:background .15s,color .15s; }
        .footer-lang-option:hover { background:color-mix(in srgb, var(--border) 60%, transparent); color:var(--cream); }
        .footer-lang-option.active { color:var(--gold); font-weight:700; }

        @media (max-width:1024px) {
          .values-grid  { grid-template-columns:1fr; }
          .mission-grid { grid-template-columns:1fr; }
          .team-grid    { grid-template-columns:1fr 1fr; }
          .stats-inner  { grid-template-columns:1fr 1fr; }
          .footer-top   { grid-template-columns:1fr 1fr 1fr; }
          .footer-top > div:first-child { grid-column:1 / -1; }
          .team-header  { flex-direction:column; align-items:flex-start; }
          .team-sub     { text-align:left; }
        }
        @media (max-width:640px) {
          .nav-links    { display:none; }
          .team-grid    { grid-template-columns:1fr; }
          .stats-inner  { grid-template-columns:1fr 1fr; }
          .footer-top   { grid-template-columns:1fr; }
          .footer-bottom{ flex-direction:column; align-items:flex-start; }
          .cta-actions  { flex-direction:column; align-items:center; }
        }

        /* ==================================================================
           NEU (Mobile-Design) — ab hier ausschließlich neue Regeln/Klassen.
           Nichts oberhalb dieser Zeile wurde verändert.

           WICHTIG: jede "eingeklappt"-Voreinstellung (max-height:0 etc.)
           steht ausschließlich INNERHALB der @media(max-width:760px)-Blöcke
           weiter unten. Die Basis-Regeln hier (außerhalb der Media Query)
           setzen alles bewusst auf "immer sichtbar", damit auf PC exakt das
           bisherige Verhalten erhalten bleibt, egal welchen React-State die
           Komponente gerade hat.

           .mobile-only ist standardmäßig unsichtbar und wird nur innerhalb
           der Mobile-Media-Query wieder eingeblendet.
           ================================================================== */

        .mobile-only { display:none; }
        .hero-stack { display:contents; }

        /* Hamburger-Button */
        .mobile-menu-btn { width:42px; height:42px; align-items:center; justify-content:center; border:1px solid var(--border); border-radius:50%; color:var(--cream); background:color-mix(in srgb, var(--border) 40%, transparent) !important; flex-shrink:0; }

        /* Mobile Popup-Menü (zentriertes Fenster) */
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

        /* Stats — mobile Card-Variante (eigenes Markup, siehe JSX weiter unten),
           standardmäßig unsichtbar (per .mobile-only), Größe/Position nur mobil relevant */
        .mobile-stats-card { grid-template-columns:1fr 1fr; }
        .mobile-stats-card .stat-item { border-right:1px solid var(--border); border-bottom:1px solid var(--border); align-items:flex-start; padding:22px 20px; }
        .mobile-stats-card .stat-item:nth-child(2n) { border-right:none; }
        .mobile-stats-card .stat-item:nth-last-child(-n+2) { border-bottom:none; }

        /* Values — Akkordeon-Optik (Chevron), Klick-Handler ist auf PC durch
           pointer-events:none wirkungslos; der Text bleibt auf PC über
           .value-text-wrap IMMER sichtbar (siehe Regel direkt darunter) */
        .value-card-header { display:flex; align-items:center; justify-content:space-between; width:100%; background:none !important; border:none; padding:0; cursor:default; pointer-events:none; text-align:left; }
        .value-chevron { color:var(--gold); transition:transform .3s; flex-shrink:0; }
        .value-chevron.open { transform:rotate(180deg); }
        .value-text-wrap { overflow:visible; max-height:none; }

        /* Team — horizontales Karussell + Dots (eigenes Markup, .mobile-only) */
        .team-scroll { gap:12px; overflow-x:auto; scroll-snap-type:x mandatory; -webkit-overflow-scrolling:touch; scrollbar-width:none; margin:0 -20px; padding:0 20px; }
        .team-scroll::-webkit-scrollbar { display:none; }
        .team-scroll .team-card { flex:0 0 64%; scroll-snap-align:start; padding:22px 18px; }
        .team-scroll .team-avatar { width:42px; height:42px; border-radius:50%; margin-bottom:14px; font-size:13px; }
        .team-scroll .team-name { font-size:12px; margin-bottom:3px; }
        .team-scroll .team-role { font-size:7.5px; letter-spacing:0.16em; margin-bottom:10px; }
        .team-scroll .team-bio { font-size:11px; line-height:1.55; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
        .team-dots { justify-content:center; gap:8px; margin-top:20px; }
        button.team-dot { width:7px; height:7px; border-radius:50%; background:var(--border) !important; border:1px solid var(--dim) !important; padding:0; transition:all .25s; }
        button.team-dot.active { width:22px; border-radius:999px; background:var(--gold) !important; border-color:var(--gold) !important; }

        /* Footer — Social Icons (nur mobil) + Akkordeon (Klick auf PC wirkungslos,
           Links bleiben auf PC IMMER sichtbar) + Back to top (nur mobil) */
        .footer-social { gap:10px; margin-top:16px; margin-bottom:6px; }
        .footer-social a { width:34px; height:34px; border-radius:50%; border:1px solid var(--border); display:flex; align-items:center; justify-content:center; color:var(--muted); transition:all .2s; }
        .footer-social a:hover { color:var(--gold); border-color:rgba(201,168,106,0.4); }
        .footer-col-header { display:flex; align-items:center; justify-content:space-between; width:100%; background:none !important; border:none; padding:0; cursor:default; pointer-events:none; text-align:left; }
        .footer-col-chevron { color:var(--dim); transition:transform .3s; flex-shrink:0; }
        .footer-col-chevron.open { transform:rotate(180deg); color:var(--gold); }
        .footer-col-links-wrap { overflow:visible; max-height:none; }

        @media (max-width:760px) {
          .mobile-menu-btn { display:flex; }
          .user-menu-wrap { display:none; }

          .hero-stack { display:flex; flex-direction:column; min-height:100vh; }
          .about-hero { flex:1 1 auto; min-height:0; padding-bottom:0; align-items:flex-end; }
          .about-hero-bg img { object-position:75% 35% !important; }
          .about-hero-content { padding-top:0; padding-bottom:56px; }
          .about-eyebrow { font-size:10px; margin-bottom:14px; }
          .about-h1 { font-size:clamp(26px,7.5vw,34px); margin-bottom:12px; }
          .about-hero-sub { font-size:12px; line-height:1.6; margin-bottom:18px; padding-left:14px; }
          .about-hero-actions { gap:9px; }
          .about-hero-actions .btn-gold-filled,
          .about-hero-actions .btn-outline { width:100%; justify-content:center; padding:11px 22px; font-size:8px; }

          .stats-section { display:none; }
          .mobile-stats-card {
            display:grid; margin:-40px 0 0; position:relative; z-index:15;
            border-radius:24px; background:var(--bg); border:1px solid var(--border);
            box-shadow:0 20px 50px rgba(0,0,0,0.18); overflow:hidden;
          }
          .mobile-stats-card .stat-item { padding:34px 22px; }
          .mobile-stats-card .stat-num { font-size:34px; }
          .mobile-stats-card .stat-label { font-size:10px; }

          .value-card-header { cursor:pointer; pointer-events:auto; }
          .value-chevron { display:block; }
          .value-text-wrap { display:block; overflow:hidden; max-height:0; transition:max-height .3s ease; }
          .value-text-wrap.open { max-height:300px; }
          .value-card { padding:26px 22px; }

          .team-header { margin-bottom:32px; }
          .team-grid { display:none; }
          .team-scroll { display:flex; }
          .team-dots { display:flex; }
          .team-footer-bar { flex-direction:column; align-items:flex-start; gap:14px; }

          .footer-social { display:flex; }
          .footer-col-header { cursor:pointer; pointer-events:auto; }
          .footer-col-links-wrap { display:block; overflow:hidden; max-height:0; transition:max-height .3s ease; }
          .footer-col-links-wrap.open { max-height:400px; }
          .footer-col-chevron { display:block; }
          .footer-lang-menu { left:0; right:auto; }
          .footer-top > div:first-child { text-align:center; }
          .footer-logo-container { justify-content:center; margin:0 auto; }
          .footer-tagline { margin-left:auto; margin-right:auto; }
          .footer-social { justify-content:center; }

          .team-section { scroll-margin-top:80px; }
        }
      `}</style>

      <div className="ab">

        {/* NAV */}
        <nav className={`nav ${navScrolled ? 'scrolled' : ''}`}>
          <Link href="/" className="nav-logo"><span>EXPLORE</span><span>SCENIC</span><span>ROUTES</span></Link>
          <div className="nav-links">
            {[['nav.explore', '/explore'], ['nav.about', '/about']].map(([key, h]) => (
              <Link key={key} href={h} className={`nav-link ${pathname === h ? "nav-link-active" : ""}`}>{t(key as any)}</Link>
            ))}
            {user && <Link href="/my-trips" className={`nav-link ${pathname === "/my-trips" ? "nav-link-active" : ""}`}>{t("nav.myTrips")}</Link>}
          </div>
          <div className="nav-right">
            {!user && <ThemeSwitch />}
            {user ? (
              <div className="user-menu-wrap">
                <button className="user-avatar" onClick={() => setShowUserMenu(p => !p)}>
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
                      <Link href="/profile" className="ud-link" onClick={() => setShowUserMenu(false)}>
                        <span className="ud-link-icon"><UserIcon size={14} strokeWidth={1.8} /></span> {t("nav.profile")}
                      </Link>
                      <Link href="/my-trips" className="ud-link" onClick={() => setShowUserMenu(false)}>
                        <span className="ud-link-icon"><MapIcon size={14} strokeWidth={1.8} /></span> {t("nav.myTrips")}
                      </Link>
                      <Link href="/explore" className="ud-link" onClick={() => setShowUserMenu(false)}>
                        <span className="ud-link-icon"><Compass size={14} strokeWidth={1.8} /></span> {t("nav.explore")}
                      </Link>
                      <div className="ud-divider" />
                      <button className="ud-logout" onClick={handleLogout}>
                        <span className="ud-link-icon" style={{ color: '#e08080' }}><LogOut size={14} strokeWidth={1.8} /></span> {t("nav.signOut")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href={loginHref} className="login-btn">{t("nav.login")}</Link>
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
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.18em" }}>EXPLORE SCENIC ROUTES</span>
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
                <Link href={loginHref} className="mobile-nav-login" onClick={() => setMobileMenuOpen(false)}>{t("nav.login")}</Link>
                <ThemeSwitch />
              </div>
            </>
          )}
        </div>

        {/* NEU (Mobile): Wrapper, der Hero + Stats-Card auf Mobile zu einem
            100vh-hohen Flex-Stack macht (Card endet bündig am Bildschirmrand).
            Auf PC per display:contents komplett wirkungslos — strukturell
            identisch zum bisherigen Markup. */}
        <div className="hero-stack">

          {/* HERO */}
          <section className="about-hero">
            <div className="about-hero-bg">
              <img src="/3.jpg" alt="Scenic road" onError={e => { e.currentTarget.src = "/Amalfi coast road.jpg"; }} />
            </div>
            <div className="about-hero-content">
              <p className="about-eyebrow">{t("about.eyebrow")}</p>
              <h1 className="about-h1">
                {t("about.h1.line1")}<br />
                <em>{t("about.h1.emphasis")}</em>
              </h1>
              <p className="about-hero-sub">
                {t("about.hero.sub")}
              </p>
              <div className="about-hero-actions">
                <Link href="/explore" className="btn-gold-filled">{t("about.hero.explore")} <ArrowRight size={13} strokeWidth={2.5} /></Link>
              </div>
            </div>
          </section>

          {/* STATS (Desktop) */}
          <div className="stats-section">
            <div className="stats-inner">
              {STATS.map(({ value, labelKey }) => (
                <div className="stat-item" key={labelKey}>
                  <div className="stat-num">{value}</div>
                  <div className="stat-label">{t(labelKey)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* NEU (Mobile): Stats als schwebende Card über dem Hero-Rand, eigenes
            Markup, per .mobile-only auf PC unsichtbar */}
          <div className="mobile-stats-card mobile-only">
            {STATS.map(({ value, labelKey }) => (
              <div className="stat-item" key={labelKey}>
                <div className="stat-num">{value}</div>
                <div className="stat-label">{t(labelKey)}</div>
              </div>
            ))}
          </div>

        </div>{/* /hero-stack */}

        {/* VALUES */}
        <section className="section values-section">
          <div className="container">
            <p className="section-eyebrow">{t("about.values.eyebrow")}</p>
            <h2 className="section-h2">{t("about.values.heading1")}<br />{t("about.values.heading2")}</h2>
            <div className="values-grid">
              {VALUES.map(({ num, titleKey, textKey }, i) => {
                const isOpen = openValueIndex === i;
                return (
                  <div className="value-card" key={titleKey}>
                    {/* NEU (Mobile): Header klickbar fürs Akkordeon. Auf PC ist
                        der Klick durch pointer-events:none wirkungslos, und der
                        Text bleibt über .value-text-wrap (max-height:none als
                        Basis-Regel) so oder so immer sichtbar. */}
                    <button
                      className="value-card-header"
                      onClick={() => setOpenValueIndex(isOpen ? null : i)}
                    >
                      <div>
                        <div className="value-num">{num}</div>
                        <div className="value-title">{t(titleKey)}</div>
                      </div>
                      <ChevronDown size={16} className={`value-chevron mobile-only ${isOpen ? "open" : ""}`} />
                    </button>
                    <div className={`value-text-wrap ${isOpen ? "open" : ""}`}>
                      <p className="value-text" style={{ paddingTop: 14 }}>{t(textKey)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* MISSION */}
        <section className="section mission-section">
          <div className="container">
            <p className="section-eyebrow">{t("about.mission.eyebrow")}</p>
            <h2 className="section-h2">{t("about.mission.heading1")}<br />{t("about.mission.heading2")}</h2>
            <div className="mission-grid">
              <div className="mission-image">
                <img src="/Garden Route.jpg" alt="Road" onError={e => { e.currentTarget.src = "/Trollstigen.jpg"; }} />
              </div>
              <div>
                <p className="mission-text">
                  {t("about.mission.p1")}
                  <br /><br />
                  <strong>Explore Scenic Routes</strong> {t("about.mission.p2")}
                  <br /><br />
                  {t("about.mission.p3")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* TEAM */}
        <section id="team" className="section team-section">
          <div className="container">
            <div className="team-header">
              <div>
                <p className="section-eyebrow">{t("about.team.eyebrow")}</p>
                <h2 className="section-h2">{t("about.team.heading1")}<br />{t("about.team.heading2")}</h2>
              </div>
              <p className="team-sub">
                {t("about.team.sub")}
              </p>
            </div>

            {/* Desktop-Grid — unverändert */}
            <div className="team-grid">
              {TEAM.map(({ initials, name, roleKey, bioKey }) => (
                <div className="team-card" key={name}>
                  <div className="team-avatar">{initials}</div>
                  <div className="team-name">{name}</div>
                  <div className="team-role">{t(roleKey)}</div>
                  <p className="team-bio">{t(bioKey)}</p>
                </div>
              ))}
            </div>

            {/* NEU (Mobile): horizontales Swipe-Karussell statt Grid, eigenes
                Markup, per .mobile-only auf PC unsichtbar */}
            <div className="team-scroll mobile-only" ref={teamScrollRef} onScroll={handleTeamScroll}>
              {TEAM.map(({ initials, name, roleKey, bioKey }) => (
                <div className="team-card" key={name}>
                  <div className="team-avatar">{initials}</div>
                  <div className="team-name">{name}</div>
                  <div className="team-role">{t(roleKey)}</div>
                  <p className="team-bio">{t(bioKey)}</p>
                </div>
              ))}
            </div>

            <div className="team-dots mobile-only">
              {TEAM.map((_, i) => (
                <button
                  key={i}
                  className={`team-dot ${i === teamActiveIndex ? "active" : ""}`}
                  onClick={() => scrollToTeamCard(i)}
                  aria-label={`Team member ${i + 1}`}
                />
              ))}
            </div>
            {/*
            <div className="team-footer-bar">
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <div style={{display:"flex"}}>
                  {[["#C9A86A","LV"],["#6A8EC9","US"],["#C9956A","MD"]].map(([bg,i],idx)=>(
                    <div key={i} style={{width:"28px",height:"28px",borderRadius:"50%",background:bg,border:"2px solid var(--bg3)",marginLeft:idx===0?"0":"-6px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"9px",fontWeight:800,color:"#0c0b09"}}>
                      {i}
                    </div>
                  ))}
                </div>
                <span style={{fontSize:"12px",color:"var(--dim)",fontWeight:300}}>{t("about.team.smallTeam")}</span>
              </div>
              <a href="mailto:jobs@scenicroutes.app" className="team-footer-link">{t("about.team.joinTeam")} <ArrowRight size={11} strokeWidth={2.5} /></a>
            </div>
            */}
          </div>

        </section>

        {/* CTA */}
        <section className="section cta-section">
          <div className="container">
            <div className="cta-inner">
              <p className="section-eyebrow">{t("about.cta.eyebrow")}</p>
              <h2 className="cta-h2">{t("about.cta.heading1")}<br />{t("about.cta.heading2")}</h2>
              <p className="cta-sub">{t("about.cta.sub")}</p>
              <div className="cta-actions">
                <Link href="/explore" className="btn-gold-filled">{t("about.cta.browseRoutes")} <ArrowRight size={13} strokeWidth={2.5} /></Link>
                {!user && (
                  <Link href={loginHref} className="btn-outline">{t("about.cta.createAccount")} <ArrowRight size={13} strokeWidth={2.5} /></Link>
                )}
              </div>
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
                  {t("home.footer.tagline")}
                </p>

                {/* NEU (Mobile): Social-Icons */}
                <div className="footer-social mobile-only">
                  <a href="#" aria-label="Instagram"><InstagramIcon size={15} strokeWidth={1.8} /></a>
                  <a href="#" aria-label="YouTube"><YoutubeIcon size={15} strokeWidth={1.8} /></a>
                  <a href="#" aria-label="E-Mail"><Mail size={15} strokeWidth={1.8} /></a>
                </div>
              </div>

              {FOOTER_COLUMNS.map(({ id, headingKey, links }) => {
                const isOpen = openFooterSection === id;
                return (
                  <div key={id}>
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
                            <Link href={finalHref} key={key} className="footer-col-link">
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

      </div>
    </>
  );
}