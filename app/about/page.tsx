"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useTheme } from 'next-themes';
import { ThemeSwitch } from '../components/ThemeSwitch';

const TEAM = [
  { initials: "LA", name: "Lavr",  role: "Co-Founder & Product",     bio: "Road tripper at heart. Built Scenic Routes because every great drive deserves to be discovered." },
  { initials: "US", name: "Usman",    role: "Co-Founder & Engineering",  bio: "The brain behind the tech. Builds every feature from the ground up and keeps everything running smoothly." },
  { initials: "MD", name: "Madalina", role: "Design Manager",            bio: "Makes sure every pixel is in its right place. Turns complex ideas into clean, beautiful interfaces." },
];

const STATS = [
  { value: "150+", label: "Curated Routes" },
  { value: "40+",  label: "Countries" },
  { value: "18K+", label: "Travellers" },
  { value: "6",    label: "Continents" },
];

const VALUES = [
  { num: "01", title: "Slow Down",      text: "The fastest route is rarely the best one. We celebrate roads that make you pull over, breathe deep, and stay a little longer." },
  { num: "02", title: "Go Off-Script",  text: "Every great road trip has an unplanned detour. We build tools that help you discover those moments — not avoid them." },
  { num: "03", title: "Leave It Better",text: "We only feature routes where travellers are welcome and nature is respected. Beautiful roads deserve careful guests." },
];

export default function AboutPage() {
  const [user,         setUser]         = useState<any>(null);
  const [avatarUrl,    setAvatarUrl]    = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [navScrolled,  setNavScrolled]  = useState(false);
  const [mounted,      setMounted]      = useState(false);
  const { theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const loginHref = `/login?redirect=${encodeURIComponent(pathname)}`;
  const [username, setUsername] = useState("");
  const displayName = username || user?.email?.split("@")[0] || "";

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
      if (u) fetchProfile(u.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => {
      const u = s?.user ?? null;
      setUser(u);
      if (u) fetchProfile(u.id);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from("profiles").select("avatar_url, username").eq("id", userId).single();
    if (data) {
      setAvatarUrl(data.avatar_url || "");
      setUsername(data.username || "");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null); setUsername(""); setAvatarUrl(""); setShowUserMenu(false);
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
        .nav-logo span { font-size:13px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--cream); }
        .nav-links { display:flex; gap:36px; }
        .nav-link { position:relative; font-size:13px; font-weight:600; letter-spacing:0.16em; text-transform:uppercase; color:var(--muted); transition:color .2s; }
        .nav-link::after { content:""; position:absolute; left:0; bottom:-8px; width:0; height:1px; background:var(--gold); transition:width .25s; }
        .nav-link:hover { color:var(--cream); }
        .nav-link:hover::after { width:100%; }
        .nav-link-active { color:var(--cream) !important; font-weight:700; }
        .nav-right { display:flex; align-items:center; gap:16px; }
        .login-btn { padding:10px 22px; border:1px solid var(--border); border-radius:999px; font-size:10px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:var(--cream); background:color-mix(in srgb, var(--border) 40%, transparent); transition:all .25s; }
        .login-btn:hover { background:var(--cream); color:var(--bg); }

        /* THEME SWITCH */
        .theme-switch { position:relative; display:flex; align-items:center; width:88px; height:38px; border-radius:999px; background:color-mix(in srgb, var(--border) 70%, transparent); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid var(--border); box-shadow:0 8px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06); cursor:pointer; transition:background .35s, border-color .35s; flex-shrink:0; }
        .theme-switch:hover { border-color:var(--gold); }
        .theme-switch-knob { position:absolute; top:3px; left:3px; width:30px; height:30px; border-radius:50%; background:linear-gradient(to bottom, rgba(255,255,255,0.96), rgba(237,229,212,0.85)); box-shadow:0 4px 10px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.6); display:flex; align-items:center; justify-content:center; transition:transform .45s cubic-bezier(0.22,1,0.36,1); }
        .theme-switch-knob.is-light { transform:translateX(50px); }
        .theme-switch-icon { width:14px; height:14px; }
        .theme-switch-placeholder { width:88px; height:38px; border-radius:999px; background:color-mix(in srgb, var(--border) 50%, transparent); border:1px solid var(--border); flex-shrink:0; }
        .user-avatar { width:38px; height:38px; border-radius:50%; border:1px solid rgba(201,168,106,0.35); background:rgba(201,168,106,0.1); overflow:hidden; display:flex; align-items:center; justify-content:center; font-family:var(--serif); font-size:16px; font-weight:300; color:var(--gold); cursor:pointer; transition:border-color .2s; }
        .user-avatar:hover { border-color:var(--gold); }
        .user-avatar img { width:100%; height:100%; object-fit:cover; }

        /* USER DROPDOWN */
        .user-menu-wrap { position:relative; }
        .user-dropdown { position:absolute; top:54px; right:0; width:290px; background:color-mix(in srgb, var(--bg) 97%, transparent); border:1px solid var(--border); border-radius:20px; overflow:hidden; box-shadow:0 32px 80px rgba(0,0,0,0.65); backdrop-filter:blur(28px); animation:dropIn .2s cubic-bezier(0.22,1,0.36,1); z-index:300; }
        @keyframes dropIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .ud-header { padding:20px 20px 18px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:14px; }
        .ud-avatar { width:46px; height:46px; border-radius:11px; border:1px solid rgba(201,168,106,0.3); background:rgba(201,168,106,0.1); display:flex; align-items:center; justify-content:center; font-family:var(--serif); font-size:22px; font-weight:300; color:var(--gold); flex-shrink:0; overflow:hidden; }
        .ud-avatar img { width:100%; height:100%; object-fit:cover; }
        .ud-name { font-family:var(--serif); font-size:18px; font-weight:300; color:var(--cream); letter-spacing:-0.01em; line-height:1.2; }
        .ud-email { font-size:10px; color:var(--dim); margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px; }
        .ud-role { font-size:8px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase; color:var(--gold); margin-top:4px; opacity:0.7; }
        .ud-links { padding:8px; }
        .ud-link { display:flex; align-items:center; gap:12px; width:100%; padding:10px 12px; border-radius:10px; font-size:12px; font-weight:600; letter-spacing:0.04em; color:var(--muted); background:none; border:none; cursor:pointer; transition:all .18s; text-decoration:none; }
        .ud-link:hover { background:color-mix(in srgb, var(--border) 60%, transparent); color:var(--cream); }
        .ud-link-icon { font-size:14px; width:18px; text-align:center; color:var(--gold); flex-shrink:0; }
        .ud-divider { height:1px; background:var(--border); margin:4px 8px; }
        .ud-logout { display:flex; align-items:center; gap:12px; width:100%; padding:10px 12px; border-radius:10px; font-size:12px; font-weight:600; letter-spacing:0.04em; color:rgba(224,128,128,0.55); background:none; border:none; cursor:pointer; transition:all .18s; }
        .ud-logout:hover { background:rgba(224,128,128,0.07); color:#e08080; }

        /* HERO */
        .about-hero { position:relative; min-height:100vh; display:flex; align-items:flex-end; overflow:hidden; }
        .about-hero-bg { position:absolute; inset:0; }
        .about-hero-bg img { width:100%; height:100%; object-fit:cover; object-position:center 35%; filter:brightness(0.45) contrast(1.1) saturate(0.85); transition:filter .35s; }
        .light .about-hero-bg img { filter:brightness(0.78) contrast(1.05) saturate(0.9); }
        .about-hero-bg::after { content:""; position:absolute; inset:0; background:linear-gradient(to bottom, rgba(12,11,9,0.15) 0%, rgba(12,11,9,0.05) 35%, rgba(12,11,9,0.7) 70%, rgba(12,11,9,0.98) 100%), linear-gradient(to right, rgba(12,11,9,0.8) 0%, rgba(12,11,9,0.3) 50%, transparent 100%); }
        .light .about-hero-bg::after { background:linear-gradient(to bottom, rgba(244,240,232,0.1) 0%, transparent 30%, rgba(244,240,232,0.55) 70%, rgba(244,240,232,0.95) 100%), linear-gradient(to right, rgba(244,240,232,0.7) 0%, rgba(244,240,232,0.2) 50%, transparent 100%); }
        .about-hero-content { position:relative; z-index:10; width:100%; max-width:1380px; margin:0 auto; padding:0 clamp(24px,5vw,80px) clamp(60px,8vh,100px); }
        .about-eyebrow { font-size:9px; font-weight:800; letter-spacing:0.38em; text-transform:uppercase; color:var(--gold); margin-bottom:24px; }
        .about-h1 { font-family:var(--serif); font-size:clamp(56px,8vw,110px); font-weight:300; line-height:0.88; letter-spacing:-0.045em; color:var(--cream); margin-bottom:32px; text-shadow:0 20px 60px rgba(0,0,0,0.5); max-width:900px; }
        .light .about-h1 { text-shadow:0 4px 20px rgba(0,0,0,0.18); }
        .about-h1 em { font-style:italic; color:var(--muted); }
        .about-hero-sub { font-size:16px; font-weight:300; color:var(--muted); line-height:1.8; max-width:520px; border-left:2px solid var(--gold); padding-left:20px; margin-bottom:40px; }
        .about-hero-actions { display:flex; align-items:center; gap:20px; flex-wrap:wrap; }
        .btn-gold-filled { display:inline-flex; align-items:center; gap:10px; padding:14px 28px; background:var(--gold); border:1px solid var(--gold); border-radius:999px; font-size:9px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:#0c0b09; transition:all .25s; }
        .btn-gold-filled:hover { background:#d8b978; transform:translateY(-1px); }
        .btn-outline { display:inline-flex; align-items:center; gap:10px; padding:14px 28px; background:transparent; border:1px solid var(--border); border-radius:999px; font-size:9px; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; color:var(--muted); transition:all .25s; }
        .btn-outline:hover { border-color:var(--cream); color:var(--cream); }

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
        .value-num  { font-family:var(--serif); font-size:48px; font-weight:300; color:rgba(201,168,106,0.25); line-height:1; margin-bottom:24px; }
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
        .team-section { background:var(--bg); border-top:1px solid var(--border); }
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
        .team-footer-link { font-size:9px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase; color:var(--gold); transition:color .2s; }
        .team-footer-link:hover { color:var(--cream); }

        /* CTA */
        .cta-section { background:var(--bg2); border-top:1px solid var(--border); }
        .cta-inner { background:color-mix(in srgb, var(--gold) 8%, var(--bg3)); border:1px solid rgba(201,168,106,0.2); border-radius:30px; padding:clamp(48px,7vw,80px) clamp(32px,5vw,72px); display:flex; flex-direction:column; align-items:center; text-align:center; }
        .cta-h2  { font-family:var(--serif); font-size:clamp(42px,5vw,72px); font-weight:300; line-height:0.92; letter-spacing:-0.04em; color:var(--cream); margin-bottom:16px; }
        .cta-sub { font-size:15px; color:var(--dim); font-weight:300; margin-bottom:36px; }
        .cta-actions { display:flex; gap:16px; flex-wrap:wrap; justify-content:center; }

        /* FOOTER */
        .footer { background:var(--bg); border-top:1px solid var(--border); padding:56px clamp(24px,5vw,80px) 28px; }
        .footer-inner  { max-width:1380px; margin:0 auto; }
        .footer-top    { display:grid; grid-template-columns:1.4fr 1fr 1fr 1fr 1.5fr; gap:40px; padding-bottom:40px; border-bottom:1px solid var(--border); margin-bottom:22px; }
        .footer-brand  { font-size:13px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--cream); line-height:1.1; margin-bottom:12px; }
        .footer-tagline{ font-size:12px; color:var(--dim); line-height:1.7; font-weight:300; margin-bottom:20px; max-width:200px; }
        .footer-socials{ display:flex; gap:8px; }
        .footer-social { width:32px; height:32px; border-radius:50%; border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:11px; color:var(--dim); transition:all .2s; }
        .footer-social:hover { border-color:var(--gold); color:var(--gold); }
        .footer-col-title { font-size:9px; font-weight:800; letter-spacing:0.28em; text-transform:uppercase; color:var(--dim); margin-bottom:16px; }
        .footer-col-link { display:block; font-size:12px; color:var(--dim); margin-bottom:10px; font-weight:300; transition:color .2s; }
        .footer-col-link:hover { color:var(--cream); }
        .footer-bottom { display:flex; justify-content:space-between; align-items:center; gap:16px; }
        .footer-copy   { font-size:10px; color:var(--dim); letter-spacing:0.08em; text-transform:uppercase; }
        .footer-legal  { display:flex; gap:22px; }
        .footer-legal a{ font-size:10px; color:var(--dim); letter-spacing:0.08em; text-transform:uppercase; transition:color .2s; }
        .footer-legal a:hover { color:var(--cream); }

        @media (max-width:1024px) {
          .values-grid  { grid-template-columns:1fr; }
          .mission-grid { grid-template-columns:1fr; }
          .team-grid    { grid-template-columns:1fr 1fr; }
          .stats-inner  { grid-template-columns:1fr 1fr; }
          .footer-top   { grid-template-columns:1fr 1fr; }
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
      `}</style>

      <div className="ab">

        {/* NAV */}
        <nav className={`nav ${navScrolled ? 'scrolled' : ''}`}>
          <Link href="/" className="nav-logo"><span>SCENIC</span><span>ROUTES</span></Link>
          <div className="nav-links">
            {[['Explore Routes','/explore'],['About','/about']].map(([l,h])=>(
              <Link key={l} href={h} className="nav-link">{l}</Link>
            ))}
            {user && <Link href="/my-trips" className="nav-link nav-link-active">My Trips</Link>}
          </div>
          <div className="nav-right">
            <ThemeSwitch />
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
                    <div className="ud-links">
                      <Link href="/profile" className="ud-link" onClick={()=>setShowUserMenu(false)}>
                        <span className="ud-link-icon">◎</span> Profile
                      </Link>
                      <Link href="/my-trips" className="ud-link" onClick={()=>setShowUserMenu(false)}>
                        <span className="ud-link-icon">△</span> My Trips
                      </Link>
                      <Link href="/explore" className="ud-link" onClick={()=>setShowUserMenu(false)}>
                        <span className="ud-link-icon">⬡</span> Explore Routes
                      </Link>
                      <div className="ud-divider"/>
                      <button className="ud-logout" onClick={handleLogout}>
                        <span className="ud-link-icon" style={{color:'#e08080'}}>→</span> Sign Out
                      </button>
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
        <section className="about-hero">
          <div className="about-hero-bg">
            <img src="/Toscana.jpg" alt="Scenic road" onError={e=>{e.currentTarget.src="/Amalfi coast road.jpg";}}/>
          </div>
          <div className="about-hero-content">
            <p className="about-eyebrow">About Us</p>
            <h1 className="about-h1">
              Built by road lovers,<br/>
              <em>for road lovers.</em>
            </h1>
            <p className="about-hero-sub">
              We started Scenic Routes because we were tired of GPS apps routing us through motorways.
              Every trip should feel like an adventure — we map the roads that make you pull over and stare.
            </p>
            <div className="about-hero-actions">
              <Link href="/explore" className="btn-gold-filled">Explore Routes →</Link>
              <a href="mailto:hello@scenicroutes.app" className="btn-outline">Say Hello →</a>
            </div>
          </div>
        </section>

        {/* STATS */}
        <div className="stats-section">
          <div className="stats-inner">
            {STATS.map(({value,label})=>(
              <div className="stat-item" key={label}>
                <div className="stat-num">{value}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* VALUES */}
        <section className="section values-section">
          <div className="container">
            <p className="section-eyebrow">What we believe</p>
            <h2 className="section-h2">Three principles<br/>that guide us.</h2>
            <div className="values-grid">
              {VALUES.map(({num,title,text})=>(
                <div className="value-card" key={title}>
                  <div className="value-num">{num}</div>
                  <div className="value-title">{title}</div>
                  <p className="value-text">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* MISSION */}
        <section className="section mission-section">
          <div className="container">
            <p className="section-eyebrow">Our Mission</p>
            <h2 className="section-h2">Every road tells<br/>a story.</h2>
            <div className="mission-grid">
              <div className="mission-image">
                <img src="/Garden Route.jpg" alt="Road" onError={e=>{e.currentTarget.src="/Trollstigen.jpg";}}/>
              </div>
              <div>
                <p className="mission-text">
                  We believe the best journeys happen on roads that haven't been optimised for speed.
                  <br/><br/>
                  <strong>Scenic Routes</strong> is a curated collection of the world's most breathtaking drives — each one handpicked by people who understand that the journey is the destination.
                  <br/><br/>
                  From alpine passes to coastal curves, we map the roads that reward the curious traveller with moments that GPS will never understand.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* TEAM */}
        <section className="section team-section">
          <div className="container">
            <div className="team-header">
              <div>
                <p className="section-eyebrow">The Team</p>
                <h2 className="section-h2">The people behind<br/>the roads.</h2>
              </div>
              <p className="team-sub">
                A small crew of passionate drivers, designers and engineers building the tool we always wished existed.
              </p>
            </div>

            <div className="team-grid">
              {TEAM.map(({initials,name,role,bio})=>(
                <div className="team-card" key={name}>
                  <div className="team-avatar">{initials}</div>
                  <div className="team-name">{name}</div>
                  <div className="team-role">{role}</div>
                  <p className="team-bio">{bio}</p>
                </div>
              ))}
            </div>

            <div className="team-footer-bar">
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <div style={{display:"flex"}}>
                  {[["#C9A86A","LV"],["#6A8EC9","US"],["#C9956A","MD"]].map(([bg,i],idx)=>(
                    <div key={i} style={{width:"28px",height:"28px",borderRadius:"50%",background:bg,border:"2px solid var(--bg3)",marginLeft:idx===0?"0":"-6px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"9px",fontWeight:800,color:"#0c0b09"}}>
                      {i}
                    </div>
                  ))}
                </div>
                <span style={{fontSize:"12px",color:"var(--dim)",fontWeight:300}}>A small team, big passion for the road.</span>
              </div>
              <a href="mailto:jobs@scenicroutes.app" className="team-footer-link">Join the team →</a>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section cta-section">
          <div className="container">
            <div className="cta-inner">
              <p className="section-eyebrow">Ready to explore?</p>
              <h2 className="cta-h2">Your next great<br/>road trip starts here.</h2>
              <p className="cta-sub">Hundreds of handpicked routes. Endless open road.</p>
              <div className="cta-actions">
                <Link href="/explore" className="btn-gold-filled">Browse Routes →</Link>
                {!user && (
                  <Link href={loginHref} className="btn-outline">Create Account →</Link>
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
                <div className="footer-brand">SCENIC<br/>ROUTES</div>
                <p className="footer-tagline">Thoughtfully curated road trips for people who value the journey.</p>
                <div className="footer-socials">
                  {["IG","FB","YT"].map(s=><a key={s} href="#" className="footer-social">{s[0]}</a>)}
                </div>
              </div>
              {[["Explore",["All Routes","Destinations","Experiences","Journal"]],["Company",["About Us","Careers","Gift Cards","Membership"]],["Support",["FAQ","Contact Us","Privacy Policy","Terms"]]].map(([heading,links])=>(
                <div key={heading as string}>
                  <p className="footer-col-title">{heading as string}</p>
                  {(links as string[]).map(l=><a href="#" key={l} className="footer-col-link">{l}</a>)}
                </div>
              ))}
              <div>
                <p className="footer-col-title">Get in touch</p>
                <a href="mailto:hello@scenicroutes.app" style={{display:"block",fontSize:"13px",color:"var(--gold)",marginBottom:"8px",fontWeight:300}}>hello@scenicroutes.app</a>
                <a href="mailto:jobs@scenicroutes.app"  style={{display:"block",fontSize:"13px",color:"var(--dim)",fontWeight:300}}>jobs@scenicroutes.app</a>
              </div>
            </div>
            <div className="footer-bottom">
              <p className="footer-copy">© {new Date().getFullYear()} Scenic Routes. All Rights Reserved.</p>
              <div className="footer-legal">
                <a href="#">Terms & Conditions</a>
                <a href="#">Privacy</a>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}