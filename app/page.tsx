"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import AuthModal from "./AuthModal";

// ─── Static data ─────────────────────────────────────────────────────────────

const FALLBACK_ROUTES = [
  { id: "1", title: "Dolomites", country: "Italy", distance_km: 320, image_url: "/stelvio.jpg", duration: "6 Days", type: "Mountain Road", terrain: "Mountains", description: "Legendary hairpin roads through pale limestone towers." },
  { id: "2", title: "Iceland Ring Road", country: "Iceland", distance_km: 1332, image_url: "/iceland.jpg", duration: "Multi-day journey", type: "Circular Route", terrain: "Mountains", description: "A complete circumnavigation of Iceland's raw wilderness." },
  { id: "3", title: "Amalfi Coast", country: "Italy", distance_km: 250, image_url: "/pacific.jpg", duration: "Weekend trip", type: "Coastal Highway", terrain: "Coastal", description: "Dramatic cliffs, turquoise sea and timeless Italian villages." },
  { id: "4", title: "Swiss Alps", country: "Switzerland", distance_km: 280, image_url: "/grossglockner.jpg", duration: "Full day (4-8h)", type: "Alpine Pass", terrain: "Mountains", description: "World-class passes through the heart of the Alps." },
  { id: "5", title: "Trollstigen", country: "Norway", distance_km: 27, image_url: "/trollstigen.jpg", duration: "Half day (< 4h)", type: "Scenic Pass", terrain: "Mountains", description: "Norway's most dramatic mountain road with 11 hairpins." },
  { id: "6", title: "Black Forest High Road", country: "Germany", distance_km: 60, image_url: "/blackforest.jpg", duration: "Half day (< 4h)", type: "Forest Route", terrain: "Forest", description: "A legendary drive through deep forest and sweeping viewpoints." },
];

const TESTIMONIALS = [
  { quote: "Scenic Routes didn't just plan a trip — they crafted the most unforgettable journey of our lives.", name: "Alex Morgan", role: "World Traveler", since: "Member since 2022" },
  { quote: "Every detail was perfect. The routes, the timing, the hidden gems along the way — absolutely flawless.", name: "Sarah Chen", role: "Photographer", since: "Member since 2023" },
  { quote: "I've driven roads all over the world. Scenic Routes showed me places I never would have found alone.", name: "Marcus Klein", role: "Automotive Journalist", since: "Member since 2021" },
];

const FEATURES = [
  { icon: "◎", title: "Curated Experiences", text: "Handpicked scenic routes with useful travel details." },
  { icon: "△", title: "Smart Filters", text: "Find routes by terrain, duration, country and rating." },
  { icon: "⬡", title: "Scenic Details", text: "Every route includes distance, country, route type and duration." },
  { icon: "◈", title: "Built For Drivers", text: "Designed for people who love beautiful roads and unforgettable drives." },
];

const FOOTER_COLS = {
  Explore: ["All Routes", "Destinations", "Experiences", "Journal"],
  Company: ["About Us", "Membership", "Gift Cards", "Careers"],
  Support: ["FAQs", "Travel Policies", "Contact Us", "Privacy Policy"],
};

const BUILDER_STEPS = [
  { step: 1, label: "Terrain",  title: "What kind of road are you chasing?",   subtitle: "Choose the landscape that fits your next drive.",        key: "terrain",  options: ["Forest","Deserts","Coastal","Mountains"] },
  { step: 2, label: "Duration", title: "How long should the escape be?",        subtitle: "Pick the travel time that matches your plan.",           key: "duration", options: ["Half day (< 4h)","Full day (4-8h)","Weekend trip","Multi-day journey"] },
  { step: 3, label: "Country",  title: "Where should the journey begin?",       subtitle: "Choose a country and discover matching scenic routes.",   key: "country",  options: ["Austria","France","Germany","Iceland","Italy"] },
] as const;

type BuilderKey = "terrain" | "duration" | "country";
type Route = { id: string; title: string; country: string; distance_km?: number; image_url?: string; duration?: string; type?: string; terrain?: string; description?: string; };

// ─── Component ───────────────────────────────────────────────────────────────

export default function HomePage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [user, setUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  // FIX 1: navScrolled is a boolean state, not interpolated into <style>
  const [navScrolled, setNavScrolled] = useState(false);
  // FIX 2: heroVisible via class toggle, not inline style interpolation
  const [heroVisible, setHeroVisible] = useState(false);

  const [testimonialIdx, setTestimonialIdx] = useState(0);

  // FIX 3: hero image state separate from activeRouteIdx — cross-fade via ref
  const [activeRouteIdx, setActiveRouteIdx] = useState(0);
  const [heroImgSrc, setHeroImgSrc] = useState("");
  const heroImgRef = useRef<HTMLImageElement>(null);

  // Builder — step + selections
  const [builderStep, setBuilderStep] = useState(1);
  const [builderSelections, setBuilderSelections] = useState<Record<BuilderKey, string>>({ terrain: "", duration: "", country: "" });

  const displayRoutes = useMemo(() => (routes.length ? routes : FALLBACK_ROUTES), [routes]);

  // Builder URL
  const builderParams = useMemo(() => {
    const p = new URLSearchParams();
    if (builderSelections.terrain)  p.set("terrain",  builderSelections.terrain);
    if (builderSelections.duration) p.set("duration", builderSelections.duration);
    if (builderSelections.country)  p.set("country",  builderSelections.country);
    return p;
  }, [builderSelections]);
  const builderHref = builderParams.toString() ? `/explore?${builderParams}` : "/explore";

  // FIX 4: select/deselect toggle via single handler — no 3 separate setters
  const handleBuilderSelect = useCallback((key: BuilderKey, value: string) => {
    setBuilderSelections(prev => ({ ...prev, [key]: prev[key] === value ? "" : value }));
  }, []);

  // FIX 1: scroll handler — only touches navScrolled state
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auth + data
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => { if (mounted) setUser(data.session?.user ?? null); });
    const { data: listener } = supabase.auth.onAuthStateChange((_, s) => setUser(s?.user ?? null));

    supabase.from("routes").select("*").limit(6).then(({ data }) => {
      if (!mounted) return;
      const r = data?.length ? data : FALLBACK_ROUTES;
      setRoutes(r);
      setHeroImgSrc(r[0]?.image_url || "/iceland.jpg");
    });

    // FIX 2: heroVisible via rAF, not timeout + style interpolation
    requestAnimationFrame(() => requestAnimationFrame(() => setHeroVisible(true)));

    const tTestimonial = setInterval(() => setTestimonialIdx(p => (p + 1) % TESTIMONIALS.length), 6000);
    // FIX 5: auto-cycle featured routes
    const tRoute = setInterval(() => setActiveRouteIdx(p => (p + 1) % 3), 4500);

    return () => { mounted = false; listener.subscription.unsubscribe(); clearInterval(tTestimonial); clearInterval(tRoute); };
  }, []);

  // FIX 3: smooth cross-fade on hero image change
  useEffect(() => {
    const src = displayRoutes[activeRouteIdx]?.image_url || "/iceland.jpg";
    if (src === heroImgSrc) return;
    const el = heroImgRef.current;
    if (el) el.style.opacity = "0";
    const t = setTimeout(() => { setHeroImgSrc(src); if (el) el.style.opacity = "1"; }, 380);
    return () => clearTimeout(t);
  }, [activeRouteIdx, displayRoutes]);

  useEffect(() => {
    if (!user) { setAvatarUrl(""); return; }
    supabase.from("profiles").select("avatar_url").eq("id", user.id).single()
      .then(({ data }) => setAvatarUrl(data?.avatar_url || ""));
  }, [user]);

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;
    await supabase.from("newsletter_subscribers").insert({ email: cleanEmail, created_at: new Date().toISOString() });
    setEmailSent(true); setEmail("");
  };

  const currentStep = BUILDER_STEPS[builderStep - 1];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg:#0c0b09; --bg2:#131109; --bg3:#1a1710;
          --gold:#C9A86A; --cream:#EDE5D4;
          --muted:rgba(237,229,212,0.56); --dim:rgba(237,229,212,0.32);
          --border:rgba(237,229,212,0.12);
          --serif:'Cormorant Garamond',Georgia,serif;
          --sans:'Inter',system-ui,sans-serif;
        }
        html { scroll-behavior:smooth; }
        body { background:var(--bg); overflow-x:hidden; }
        a { color:inherit; text-decoration:none; }
        button { border:none; font:inherit; cursor:pointer; }
        input { font:inherit; }
        img { display:block; }

        .page { min-height:100vh; background:radial-gradient(circle at 20% 0%,rgba(201,168,106,0.09),transparent 30%),var(--bg); color:var(--cream); font-family:var(--sans); overflow-x:hidden; }

        /* NAV — FIX 1: class-based, no style interpolation */
        .nav { position:fixed; inset:0 0 auto; z-index:200; height:72px; padding:0 clamp(20px,4vw,60px); display:flex; align-items:center; justify-content:space-between; background:transparent; border-bottom:1px solid transparent; transition:background .35s,backdrop-filter .35s,border-color .35s; }
        .nav.scrolled { background:rgba(12,11,9,0.92); backdrop-filter:blur(20px); border-bottom-color:var(--border); }
        .nav-logo { display:flex; flex-direction:column; line-height:1; }
        .nav-logo span { font-size:13px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--cream); }
        .nav-links { display:flex; gap:36px; }
        .nav-link { position:relative; font-size:11px; font-weight:600; letter-spacing:0.16em; text-transform:uppercase; color:var(--muted); transition:color .2s; }
        .nav-link::after { content:""; position:absolute; left:0; bottom:-8px; width:0; height:1px; background:var(--gold); transition:width .25s; }
        .nav-link:hover { color:var(--cream); }
        .nav-link:hover::after { width:100%; }
        .nav-right { display:flex; align-items:center; gap:12px; }
        .membership-btn { padding:10px 22px; border:1px solid rgba(237,229,212,0.28); border-radius:999px; font-size:10px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:var(--cream); background:rgba(237,229,212,0.04); transition:all .25s; }
        .membership-btn:hover { background:var(--cream); color:var(--bg); transform:translateY(-1px); }
        .menu-icon { width:38px; height:38px; display:grid; place-items:center; border:1px solid var(--border); border-radius:50%; background:rgba(237,229,212,0.04); color:var(--muted); font-size:18px; transition:border-color .2s,color .2s; }
        .menu-icon:hover { border-color:rgba(201,168,106,0.45); color:var(--gold); }
        .user-avatar { width:38px; height:38px; border-radius:50%; border:1px solid var(--border); background:rgba(237,229,212,0.06); overflow:hidden; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:var(--cream); }
        .user-avatar img { width:100%; height:100%; object-fit:cover; }
        .user-dropdown { position:absolute; top:50px; right:0; width:210px; background:rgba(20,18,12,0.98); border:1px solid var(--border); border-radius:16px; overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,0.52); }
        .user-dropdown-email { padding:12px 14px; border-bottom:1px solid var(--border); font-size:10px; color:var(--dim); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .user-dropdown a, .user-dropdown button { display:block; width:100%; padding:12px 14px; font-size:13px; color:var(--cream); text-align:left; background:none; transition:background .15s; }
        .user-dropdown a:hover, .user-dropdown button:hover { background:rgba(237,229,212,0.06); }
        .user-dropdown button { color:#E08080; }
        .mobile-menu { position:fixed; top:84px; left:16px; right:16px; z-index:199; background:rgba(18,16,10,0.98); border:1px solid var(--border); border-radius:18px; padding:14px; backdrop-filter:blur(20px); box-shadow:0 20px 60px rgba(0,0,0,0.45); }
        .mobile-menu a { display:block; padding:13px 14px; border-radius:12px; font-size:13px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:var(--cream); }
        .mobile-menu a:hover { background:rgba(237,229,212,0.06); }

        /* HERO */
        .hero { position:relative; height:100vh; min-height:760px; display:flex; align-items:center; overflow:hidden; }
        .hero-bg { position:absolute; inset:-5%; width:110%; height:110%; }
        /* FIX 3: transition on img for cross-fade */
        .hero-bg img { width:100%; height:100%; object-fit:cover; object-position:center 34%; filter:brightness(0.58) contrast(1.08) saturate(0.95); opacity:1; transition:opacity .38s ease; }
        .hero-bg::after { content:""; position:absolute; inset:0; background:radial-gradient(circle at 72% 42%,rgba(201,168,106,0.12),transparent 28%),linear-gradient(to right,rgba(12,11,9,0.96) 0%,rgba(12,11,9,0.74) 36%,rgba(12,11,9,0.2) 72%,rgba(12,11,9,0.42) 100%),linear-gradient(to bottom,rgba(12,11,9,0.2) 0%,transparent 32%,rgba(12,11,9,0.88) 100%); }
        .hero-content { position:relative; z-index:10; width:100%; max-width:1440px; margin:0 auto; padding:0 clamp(20px,4vw,60px); padding-top:72px; display:grid; grid-template-columns:minmax(0,1.15fr) minmax(340px,0.85fr); gap:clamp(32px,6vw,90px); align-items:end; }

        /* FIX 2: fade-in via class, not style interpolation */
        .hero-copy { max-width:780px; padding-bottom:clamp(40px,8vh,90px); opacity:0; transform:translateY(26px); transition:opacity .9s,transform .9s; }
        .hero-copy.visible { opacity:1; transform:translateY(0); }
        .hero-route-panel { position:relative; margin-bottom:clamp(40px,8vh,90px); padding:26px; border-radius:24px; background:linear-gradient(135deg,rgba(237,229,212,0.1),rgba(237,229,212,0.03)),rgba(12,11,9,0.42); border:1px solid rgba(237,229,212,0.14); backdrop-filter:blur(28px); box-shadow:0 34px 100px rgba(0,0,0,0.48); overflow:hidden; opacity:0; transform:translateY(26px); transition:opacity .9s .16s,transform .9s .16s; }
        .hero-route-panel.visible { opacity:1; transform:translateY(0); }

        .hero-eyebrow, .section-eyebrow { font-size:9px; font-weight:800; letter-spacing:0.38em; text-transform:uppercase; color:var(--gold); margin-bottom:24px; }
        .hero-h1 { font-family:var(--serif); font-size:clamp(64px,9vw,132px); font-weight:300; line-height:0.82; max-width:820px; margin-bottom:30px; letter-spacing:-0.055em; color:var(--cream); text-shadow:0 30px 90px rgba(0,0,0,0.75); }
        .hero-sub { max-width:500px; font-size:15px; font-weight:300; line-height:1.85; color:rgba(237,229,212,0.68); margin-bottom:36px; }
        .hero-actions { display:flex; align-items:center; gap:20px; flex-wrap:wrap; }
        .btn-gold { display:inline-flex; align-items:center; justify-content:center; gap:10px; padding:15px 28px; background:var(--gold); color:var(--bg); border:1px solid var(--gold); border-radius:999px; font-size:10px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; transition:all .25s; box-shadow:0 14px 40px rgba(201,168,106,0.22),inset 0 1px 0 rgba(255,255,255,0.3); }
        .btn-gold:hover { background:#d8b978; border-color:#d8b978; transform:translateY(-2px); }
        .watch-btn { display:inline-flex; align-items:center; gap:12px; font-size:10px; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; color:var(--muted); background:none; transition:color .2s; }
        .watch-btn:hover { color:var(--cream); }
        .watch-circle { width:38px; height:38px; border-radius:50%; border:1px solid rgba(237,229,212,0.28); display:flex; align-items:center; justify-content:center; font-size:12px; transition:border-color .2s,background .2s; }
        .watch-btn:hover .watch-circle { border-color:var(--gold); background:rgba(201,168,106,0.1); }
        .hero-stats { display:flex; gap:clamp(26px,4vw,56px); margin-top:52px; }
        .hero-stats div { display:flex; flex-direction:column; gap:6px; }
        .hero-stats strong { font-family:var(--serif); font-size:clamp(28px,3vw,42px); font-weight:300; color:var(--cream); line-height:1; }
        .hero-stats span { font-size:9px; font-weight:800; letter-spacing:0.24em; text-transform:uppercase; color:rgba(237,229,212,0.42); }
        .featured-label { position:relative; z-index:2; font-size:9px; font-weight:800; letter-spacing:0.32em; text-transform:uppercase; color:rgba(237,229,212,0.42); margin-bottom:18px; }
        .featured-list { position:relative; z-index:2; display:flex; flex-direction:column; gap:8px; }
        /* FIX 6: thumbnails in featured items */
        .featured-item { display:grid; grid-template-columns:36px 52px 1fr auto; gap:14px; align-items:center; padding:14px 16px; border-radius:16px; color:var(--cream); background:rgba(237,229,212,0.035); border:1px solid transparent; transition:background .25s,border-color .25s,transform .25s; }
        .featured-item:hover, .featured-item.active { background:rgba(237,229,212,0.085); border-color:rgba(201,168,106,0.28); transform:translateX(-4px); }
        .featured-num { font-family:var(--serif); font-size:24px; color:rgba(201,168,106,0.8); line-height:1; }
        .featured-thumb { width:52px; height:38px; border-radius:8px; overflow:hidden; }
        .featured-thumb img { width:100%; height:100%; object-fit:cover; }
        .featured-title { font-size:12px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; margin-bottom:4px; }
        .featured-country { font-size:9px; letter-spacing:0.18em; text-transform:uppercase; color:rgba(237,229,212,0.42); }
        .featured-arrow { color:rgba(237,229,212,0.5); transition:transform .25s,color .25s; }
        .featured-item:hover .featured-arrow, .featured-item.active .featured-arrow { transform:translateX(4px); color:var(--gold); }
        .view-all-link { position:relative; z-index:2; display:inline-flex; margin-top:18px; font-size:10px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:rgba(237,229,212,0.5); transition:color .2s; }
        .view-all-link:hover { color:var(--cream); }

        /* SECTIONS */
        .section { padding:clamp(70px,8vw,110px) clamp(20px,4vw,60px); }
        .container { max-width:1380px; margin:0 auto; }
        .section-top { display:flex; align-items:flex-end; justify-content:space-between; gap:24px; margin-bottom:38px; }
        .section-h2 { font-family:var(--serif); font-size:clamp(36px,4.8vw,64px); font-weight:300; line-height:0.95; letter-spacing:-0.04em; color:var(--cream); }
        .view-all-btn { display:flex; align-items:center; gap:10px; font-size:10px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase; color:var(--muted); white-space:nowrap; transition:color .2s; }
        .view-all-btn:hover { color:var(--cream); }

        /* DESTINATIONS GRID — FIX 7: only index 0 is large */
        .editorial-routes-grid { display:grid; grid-template-columns:1.05fr 1fr 1fr; grid-auto-rows:215px; gap:14px; }
        .editorial-route-card { position:relative; display:block; overflow:hidden; border-radius:20px; background:var(--bg3); border:1px solid rgba(237,229,212,0.12); box-shadow:0 20px 56px rgba(0,0,0,0.22); isolation:isolate; }
        .editorial-route-card.large { grid-row:span 2; }
        .editorial-route-card img { width:100%; height:100%; object-fit:cover; filter:brightness(0.68) contrast(1.08) saturate(0.95); transform:scale(1.02); transition:transform .8s cubic-bezier(.22,1,.36,1),filter .8s; }
        .editorial-route-card:hover img { transform:scale(1.08); filter:brightness(0.88) contrast(1.12) saturate(1.05); }
        .editorial-route-card::after { content:""; position:absolute; inset:0; background:radial-gradient(circle at 70% 20%,rgba(201,168,106,0.12),transparent 30%),linear-gradient(to bottom,rgba(0,0,0,0.08),rgba(0,0,0,0.82)); z-index:1; }
        .editorial-route-overlay { position:absolute; inset:0; z-index:2; padding:20px; display:flex; flex-direction:column; justify-content:space-between; }
        .editorial-route-top { display:flex; justify-content:space-between; gap:14px; font-size:8px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:rgba(237,229,212,0.62); }
        .editorial-route-top span:first-child { font-family:var(--serif); font-size:28px; font-weight:300; letter-spacing:0; color:rgba(237,229,212,0.86); }
        .editorial-route-overlay h3 { font-family:var(--serif); font-size:clamp(26px,3vw,46px); font-weight:300; line-height:0.94; letter-spacing:-0.035em; color:var(--cream); margin-bottom:7px; }
        .editorial-route-card.large .editorial-route-overlay h3 { font-size:clamp(34px,4vw,56px); }
        .editorial-route-overlay p { font-size:9px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:rgba(237,229,212,0.58); margin-bottom:14px; }
        .editorial-route-meta { display:flex; flex-wrap:wrap; gap:8px; }
        .editorial-route-meta span { padding:7px 10px; border-radius:999px; background:rgba(237,229,212,0.08); border:1px solid rgba(237,229,212,0.12); backdrop-filter:blur(16px); font-size:8px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:rgba(237,229,212,0.76); }
        .editorial-route-meta span:last-child { color:var(--gold); }

        /* BUILDER */
        .builder-section { background:radial-gradient(circle at 18% 18%,rgba(201,168,106,0.08),transparent 24%),linear-gradient(to bottom,var(--bg),var(--bg2)); border-top:1px solid var(--border); border-bottom:1px solid var(--border); }
        .builder-panel { display:grid; grid-template-columns:0.85fr 1fr; max-width:1060px; margin:0 auto; border-radius:26px; border:1px solid var(--border); background:rgba(237,229,212,0.035); overflow:hidden; box-shadow:0 26px 70px rgba(0,0,0,0.24); }
        /* FIX 8: builder image uses live route data */
        .builder-image { position:relative; min-height:390px; overflow:hidden; }
        .builder-image img { width:100%; height:100%; object-fit:cover; filter:brightness(0.55); }
        .builder-image-overlay { position:absolute; inset:0; background:linear-gradient(to bottom,rgba(0,0,0,0.04),rgba(0,0,0,0.68)); }
        .builder-content { padding:42px 46px; display:flex; flex-direction:column; justify-content:center; }
        .builder-intro { margin-top:16px; max-width:470px; font-size:13px; line-height:1.7; color:rgba(237,229,212,0.62); }
        .builder-progress { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:28px; }
        .builder-progress-item { height:38px; border-radius:999px; border:1px solid rgba(237,229,212,0.12); background:rgba(237,229,212,0.04); display:flex; align-items:center; justify-content:center; gap:7px; font-size:8px; font-weight:800; letter-spacing:0.16em; text-transform:uppercase; color:rgba(237,229,212,0.42); transition:all .25s; }
        .builder-progress-item.active { border-color:rgba(201,168,106,0.62); background:rgba(201,168,106,0.13); color:var(--cream); }
        .builder-progress-item.done { border-color:rgba(201,168,106,0.32); color:rgba(237,229,212,0.72); }
        .builder-step-card { margin-top:22px; padding:24px; border-radius:22px; border:1px solid rgba(237,229,212,0.1); background:radial-gradient(circle at 80% 0%,rgba(201,168,106,0.08),transparent 32%),rgba(237,229,212,0.035); }
        .builder-step-label { margin-bottom:10px; font-size:8px; font-weight:800; letter-spacing:0.28em; text-transform:uppercase; color:var(--gold); }
        .builder-step-title { font-family:var(--serif); font-size:clamp(27px,2.7vw,38px); font-weight:300; line-height:0.98; color:var(--cream); letter-spacing:-0.035em; }
        .builder-step-subtitle { margin-top:10px; margin-bottom:20px; font-size:12px; line-height:1.6; color:rgba(237,229,212,0.5); }
        .builder-options { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; }
        .builder-chip { min-height:40px; padding:10px 14px; border-radius:999px; border:1px solid rgba(237,229,212,0.12); background:rgba(237,229,212,0.045); color:rgba(237,229,212,0.72); font-size:9px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; transition:all .25s; }
        .builder-chip:hover { border-color:rgba(201,168,106,0.4); color:var(--cream); background:rgba(201,168,106,0.08); transform:translateY(-1px); }
        .builder-chip.selected { border-color:rgba(201,168,106,0.75); background:rgba(201,168,106,0.16); color:var(--cream); box-shadow:0 0 0 1px rgba(201,168,106,0.18); }
        .builder-chip.selected::before { content:"✓  "; color:var(--gold); }
        .builder-selected-summary { margin-top:18px; display:flex; flex-wrap:wrap; gap:8px; }
        .builder-summary-pill { padding:8px 10px; border-radius:999px; background:rgba(237,229,212,0.06); border:1px solid rgba(237,229,212,0.1); font-size:8px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:rgba(237,229,212,0.58); }
        .builder-controls { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:22px; }
        .builder-back { padding:12px 18px; border-radius:999px; border:1px solid rgba(237,229,212,0.14); background:rgba(237,229,212,0.04); color:rgba(237,229,212,0.58); font-size:9px; font-weight:800; letter-spacing:0.16em; text-transform:uppercase; transition:all .25s; }
        .builder-back:hover { color:var(--cream); border-color:rgba(237,229,212,0.28); }
        .builder-back:disabled { opacity:0.35; cursor:not-allowed; }
        .builder-next { min-width:150px; }

        /* TESTIMONIAL — FIX 9: dots have proper hit area */
        .testimonial-section { background:var(--bg2); border-top:1px solid var(--border); border-bottom:1px solid var(--border); }
        .testimonial-inner { max-width:1380px; margin:0 auto; padding:70px clamp(20px,4vw,60px); display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:40px; }
        .quote-mark { font-family:var(--serif); font-size:90px; color:var(--gold); opacity:0.5; line-height:0.6; }
        .testimonial-body { text-align:center; }
        .testimonial-text { font-family:var(--serif); font-size:clamp(22px,2.8vw,34px); font-weight:300; font-style:italic; color:var(--cream); line-height:1.42; margin-bottom:28px; }
        .testimonial-dots { display:flex; justify-content:center; gap:4px; }
        .testimonial-dot { min-width:44px; min-height:44px; display:flex; align-items:center; justify-content:center; background:transparent; border:none; }
        .testimonial-dot::after { content:""; display:block; width:8px; height:8px; border-radius:50%; background:var(--border); border:1px solid var(--dim); transition:all .3s; }
        .testimonial-dot.active::after { width:24px; background:var(--gold); border-color:var(--gold); border-radius:999px; }
        .testimonial-author { display:flex; flex-direction:column; align-items:center; gap:8px; min-width:170px; }
        .author-avatar { width:64px; height:64px; border-radius:50%; border:2px solid var(--gold); background:var(--bg3); display:flex; align-items:center; justify-content:center; font-size:22px; color:var(--dim); }
        .author-name { font-size:11px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:var(--cream); text-align:center; }
        .author-role, .author-since { font-size:9px; letter-spacing:0.18em; text-transform:uppercase; color:var(--dim); text-align:center; }

        /* FEATURES */
        .features-section { background:radial-gradient(circle at 80% 20%,rgba(201,168,106,0.08),transparent 26%),var(--bg); }
        .features-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-top:48px; }
        .feature-card { padding:30px 24px 34px; background:rgba(237,229,212,0.035); border:1px solid var(--border); border-radius:22px; transition:border-color .3s,transform .3s,background .3s; }
        .feature-card:hover { border-color:rgba(201,168,106,0.32); transform:translateY(-4px); background:rgba(237,229,212,0.055); }
        .feature-icon { font-size:25px; color:var(--gold); margin-bottom:20px; }
        .feature-title { font-size:10px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--cream); margin-bottom:12px; }
        .feature-text { font-size:13px; color:var(--dim); line-height:1.75; font-weight:300; }

        /* FOOTER */
        .footer { background:var(--bg); border-top:1px solid var(--border); padding:60px clamp(20px,4vw,60px) 30px; }
        .footer-inner { max-width:1380px; margin:0 auto; }
        .footer-top { display:grid; grid-template-columns:1.4fr 1fr 1fr 1fr 1.5fr; gap:40px; padding-bottom:44px; border-bottom:1px solid var(--border); margin-bottom:24px; }
        .footer-brand-name { font-size:15px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase; color:var(--cream); line-height:1.1; margin-bottom:14px; }
        .footer-tagline { font-size:12px; color:var(--dim); line-height:1.7; font-weight:300; margin-bottom:20px; max-width:220px; }
        .footer-socials { display:flex; gap:10px; }
        .footer-social { width:34px; height:34px; border-radius:50%; border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:13px; color:var(--dim); transition:all .2s; }
        .footer-social:hover { border-color:var(--gold); color:var(--gold); }
        .footer-col-title, .footer-newsletter-title { font-size:9px; font-weight:800; letter-spacing:0.28em; text-transform:uppercase; color:var(--dim); margin-bottom:18px; }
        .footer-col a { display:block; font-size:13px; color:rgba(237,229,212,0.4); margin-bottom:11px; font-weight:300; transition:color .2s; }
        .footer-col a:hover { color:var(--cream); }
        .footer-newsletter-sub { font-size:12px; color:var(--dim); line-height:1.6; margin-bottom:16px; font-weight:300; }
        .footer-form { display:flex; }
        .footer-input { flex:1; padding:12px 16px; border:1px solid var(--border); border-right:none; border-radius:999px 0 0 999px; background:rgba(237,229,212,0.04); color:var(--cream); font-size:13px; outline:none; }
        .footer-input::placeholder { color:var(--dim); }
        .footer-submit { width:48px; background:var(--gold); border:1px solid var(--gold); border-radius:0 999px 999px 0; color:var(--bg); font-size:16px; font-weight:800; transition:background .2s; }
        .footer-submit:hover { background:#d8b978; }
        .footer-bottom { display:flex; justify-content:space-between; align-items:center; gap:16px; }
        .footer-copy { font-size:10px; color:var(--dim); letter-spacing:0.1em; text-transform:uppercase; }
        .footer-legal { display:flex; gap:24px; }
        .footer-legal a { font-size:10px; color:var(--dim); letter-spacing:0.1em; text-transform:uppercase; transition:color .2s; }
        .footer-legal a:hover { color:var(--cream); }

        /* RESPONSIVE */
        @media (max-width:1100px) {
          .hero-content { grid-template-columns:1fr; align-items:center; }
          .hero-copy { padding-bottom:0; padding-top:90px; }
          .hero-route-panel { margin-bottom:40px; }
          .editorial-routes-grid { grid-template-columns:1fr 1fr; }
          .editorial-route-card.large { grid-row:span 2; }
          .builder-panel { max-width:820px; grid-template-columns:1fr; }
          .builder-image { min-height:240px; }
          .builder-content { padding:38px 34px; }
          .features-grid { grid-template-columns:repeat(2,1fr); }
          .footer-top { grid-template-columns:1fr 1fr; }
          .testimonial-inner { grid-template-columns:auto 1fr; }
          .testimonial-author { display:none; }
        }
        @media (max-width:760px) {
          .nav-links { display:none; }
          .hero { min-height:760px; }
          .hero-content { padding-top:120px; }
          .hero-h1 { font-size:clamp(54px,16vw,78px); }
          .hero-sub { font-size:14px; max-width:340px; }
          .hero-stats { gap:22px; margin-top:36px; }
          .hero-stats strong { font-size:28px; }
          .hero-route-panel { padding:18px; border-radius:18px; }
          .featured-item { grid-template-columns:28px 44px 1fr auto; gap:10px; padding:12px; }
          .featured-num { font-size:18px; }
          .featured-thumb { width:44px; height:34px; }
          .section-top { flex-direction:column; align-items:flex-start; gap:12px; }
          .editorial-routes-grid { grid-template-columns:1fr; }
          .editorial-route-card.large { grid-row:span 1; }
          .builder-content { padding:30px 22px; }
          .builder-progress { grid-template-columns:1fr; }
          .builder-options { grid-template-columns:1fr; }
          .builder-controls { flex-direction:column; align-items:stretch; }
          .builder-back, .builder-next, .builder-controls .btn-gold { width:100%; }
          .testimonial-inner { grid-template-columns:1fr; text-align:center; gap:20px; }
          .quote-mark { display:none; }
          .features-grid { grid-template-columns:1fr; }
          .footer-top { grid-template-columns:1fr; }
          .footer-bottom { flex-direction:column; align-items:flex-start; }
          .footer-legal { flex-wrap:wrap; }
        }
      `}</style>

      <main className="page">

        {/* NAV */}
        <nav className={`nav ${navScrolled ? "scrolled" : ""}`}>
          <Link href="/" className="nav-logo"><span>SCENIC</span><span>ROUTES</span></Link>
          <div className="nav-links">
            {[["Routes","/explore"],["Destinations","/explore"],["Experiences","#experiences"],["Journal","#"],["About","/about"]].map(([l,h])=>(
              <Link key={l} href={h} className="nav-link">{l}</Link>
            ))}
          </div>
          <div className="nav-right">
            {user ? (
              <div style={{position:"relative"}}>
                <button className="user-avatar" onClick={()=>setShowUserMenu(p=>!p)}>
                  {avatarUrl ? <img src={avatarUrl} alt="avatar"/> : user.email?.[0]?.toUpperCase()}
                </button>
                {showUserMenu && (
                  <div className="user-dropdown">
                    <div className="user-dropdown-email">{user.email}</div>
                    <Link href="/profile" onClick={()=>setShowUserMenu(false)}>Profile</Link>
                    <Link href="/my-trips" onClick={()=>setShowUserMenu(false)}>My Trips</Link>
                    <button onClick={async()=>{await supabase.auth.signOut();setUser(null);setShowUserMenu(false);}}>Sign Out</button>
                  </div>
                )}
              </div>
            ) : (
              <button className="membership-btn" onClick={()=>setIsAuthOpen(true)}>Membership</button>
            )}
            <button className="menu-icon" onClick={()=>setShowMobileMenu(p=>!p)} aria-label="Menu">≡</button>
          </div>
        </nav>

        {showMobileMenu && (
          <div className="mobile-menu">
            {[["Routes","/explore"],["Destinations","/explore"],["Experiences","#experiences"],["About","/about"]].map(([l,h])=>(
              <Link key={l} href={h} onClick={()=>setShowMobileMenu(false)}>{l}</Link>
            ))}
          </div>
        )}

        {/* HERO */}
        <section className="hero">
          <div className="hero-bg">
            <img ref={heroImgRef} src={heroImgSrc||"/iceland.jpg"} alt="Scenic road" onError={e=>{e.currentTarget.src="/iceland.jpg";}}/>
          </div>
          <div className="hero-content">
            <div className={`hero-copy ${heroVisible?"visible":""}`}>
              <p className="hero-eyebrow">Curated cinematic road trips</p>
              <h1 className="hero-h1">Roads worth<br/>disappearing into.</h1>
              <p className="hero-sub">Discover breathtaking drives, hidden viewpoints and unforgettable routes — crafted for people who travel for the feeling.</p>
              <div className="hero-actions">
                <Link href="/explore" className="btn-gold">Find Your Route →</Link>
                <button className="watch-btn"><div className="watch-circle">▶</div>Watch Film</button>
              </div>
              <div className="hero-stats">
                <div><strong>150+</strong><span>Routes</span></div>
                <div><strong>40+</strong><span>Countries</span></div>
                <div><strong>100K+</strong><span>Travelers</span></div>
              </div>
            </div>

            <div className={`hero-route-panel ${heroVisible?"visible":""}`}>
              <p className="featured-label">Featured Routes</p>
              <div className="featured-list">
                {displayRoutes.slice(0,3).map((route,i)=>(
                  <Link href={`/routedetail/${route.id}`} key={route.id}
                    className={`featured-item ${activeRouteIdx===i?"active":""}`}
                    onMouseEnter={()=>setActiveRouteIdx(i)}>
                    <span className="featured-num">0{i+1}</span>
                    <div className="featured-thumb">
                      <img src={route.image_url||"/iceland.jpg"} alt={route.title} onError={e=>{e.currentTarget.src="/iceland.jpg";}}/>
                    </div>
                    <div><div className="featured-title">{route.title}</div><div className="featured-country">{route.country}</div></div>
                    <span className="featured-arrow">→</span>
                  </Link>
                ))}
              </div>
              <Link href="/explore" className="view-all-link">Explore all routes →</Link>
            </div>
          </div>
        </section>

        {/* DESTINATIONS */}
        <section className="section">
          <div className="container">
            <div className="section-top">
              <div>
                <p className="section-eyebrow">Popular Destinations</p>
                <h2 className="section-h2">Iconic places.<br/>Curated journeys.</h2>
              </div>
              <Link href="/explore" className="view-all-btn">View All Destinations →</Link>
            </div>
            <div className="editorial-routes-grid">
              {displayRoutes.slice(0,6).map((route,i)=>(
                <Link href={`/routedetail/${route.id}`} key={route.id} className={`editorial-route-card ${i===0?"large":""}`}>
                  <img src={route.image_url||"/iceland.jpg"} alt={route.title} onError={e=>{e.currentTarget.src="/iceland.jpg";}}/>
                  <div className="editorial-route-overlay">
                    <div className="editorial-route-top">
                      <span>0{i+1}</span>
                      <span>{route.terrain||route.type||"Scenic Route"}</span>
                    </div>
                    <div>
                      <h3>{route.title}</h3>
                      <p>{route.country}</p>
                      <div className="editorial-route-meta">
                        <span>{route.duration||"—"}</span>
                        <span>{route.distance_km?`${route.distance_km.toLocaleString()} km`:"—"}</span>
                        <span>View route →</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* BUILDER */}
        <section className="section builder-section" id="experiences">
          <div className="container">
            <div className="builder-panel">
              {/* FIX 8: live image from Supabase */}
              <div className="builder-image">
                <img src={displayRoutes[builderStep % displayRoutes.length]?.image_url||"/iceland.jpg"} alt="Route" onError={e=>{e.currentTarget.src="/iceland.jpg";}}/>
                <div className="builder-image-overlay"/>
              </div>
              <div className="builder-content">
                <p className="section-eyebrow">Plan your escape</p>
                <h2 className="section-h2">Build your route<br/>in 3 steps.</h2>
                <p className="builder-intro">Choose your terrain, travel time and country — then discover scenic routes that match your perfect drive.</p>

                <div className="builder-progress">
                  {BUILDER_STEPS.map(s=>(
                    <button key={s.step} type="button" onClick={()=>setBuilderStep(s.step)}
                      className={`builder-progress-item ${builderStep===s.step?"active":""} ${builderSelections[s.key]&&builderStep!==s.step?"done":""}`}>
                      <span>0{s.step}</span><span>{s.label}</span>
                    </button>
                  ))}
                </div>

                <div className="builder-step-card">
                  <p className="builder-step-label">Step 0{currentStep.step} / 03</p>
                  <h3 className="builder-step-title">{currentStep.title}</h3>
                  <p className="builder-step-subtitle">{currentStep.subtitle}</p>
                  <div className="builder-options">
                    {currentStep.options.map(opt=>(
                      <button key={opt} type="button"
                        className={`builder-chip ${builderSelections[currentStep.key]===opt?"selected":""}`}
                        onClick={()=>handleBuilderSelect(currentStep.key, opt)}>
                        {opt}
                      </button>
                    ))}
                  </div>
                  {/* FIX 10: summary pills */}
                  <div className="builder-selected-summary">
                    {builderSelections.terrain  && <span className="builder-summary-pill">Terrain: {builderSelections.terrain}</span>}
                    {builderSelections.duration && <span className="builder-summary-pill">Duration: {builderSelections.duration}</span>}
                    {builderSelections.country  && <span className="builder-summary-pill">Country: {builderSelections.country}</span>}
                  </div>
                </div>

                <div className="builder-controls">
                  <button type="button" className="builder-back" onClick={()=>setBuilderStep(p=>Math.max(p-1,1))} disabled={builderStep===1}>Back</button>
                  {builderStep < 3
                    ? <button type="button" className="btn-gold builder-next" onClick={()=>setBuilderStep(p=>Math.min(p+1,3))}>Next →</button>
                    : <Link href={builderHref} className="btn-gold builder-next">Discover →</Link>
                  }
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIAL */}
        <section className="testimonial-section">
          <div className="testimonial-inner">
            <div className="quote-mark">"</div>
            <div className="testimonial-body">
              <p className="testimonial-text">{TESTIMONIALS[testimonialIdx].quote}</p>
              <div className="testimonial-dots">
                {TESTIMONIALS.map((_,i)=>(
                  <button key={i} className={`testimonial-dot ${i===testimonialIdx?"active":""}`} onClick={()=>setTestimonialIdx(i)} aria-label={`Testimonial ${i+1}`}/>
                ))}
              </div>
            </div>
            <div className="testimonial-author">
              <div className="author-avatar"><span>◎</span></div>
              <div className="author-name">{TESTIMONIALS[testimonialIdx].name}</div>
              <div className="author-role">{TESTIMONIALS[testimonialIdx].role}</div>
              <div className="author-since">{TESTIMONIALS[testimonialIdx].since}</div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="section features-section">
          <div className="container">
            <p className="section-eyebrow">Beyond the drive</p>
            <h2 className="section-h2">Why travel with<br/>Scenic Routes?</h2>
            <div className="features-grid">
              {FEATURES.map(({icon,title,text})=>(
                <div className="feature-card" key={title}>
                  <div className="feature-icon">{icon}</div>
                  <div className="feature-title">{title}</div>
                  <p className="feature-text">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="footer">
          <div className="footer-inner">
            <div className="footer-top">
              <div>
                <div className="footer-brand-name">SCENIC<br/>ROUTES</div>
                <p className="footer-tagline">Extraordinary roads.<br/>Timeless memories.</p>
                <div className="footer-socials">
                  {["IG","FB","YT"].map(s=><a key={s} href="#" className="footer-social">{s[0]}</a>)}
                </div>
              </div>
              {Object.entries(FOOTER_COLS).map(([heading,links])=>(
                <div className="footer-col" key={heading}>
                  <p className="footer-col-title">{heading}</p>
                  {links.map(l=><a href="#" key={l}>{l}</a>)}
                </div>
              ))}
              <div>
                <p className="footer-newsletter-title">Stay Inspired</p>
                <p className="footer-newsletter-sub">Subscribe for exclusive routes, travel stories, and offers.</p>
                <form className="footer-form" onSubmit={handleNewsletter}>
                  <input type="email" required className="footer-input" value={email} onChange={e=>setEmail(e.target.value)} placeholder={emailSent?"Subscribed!":"Enter your email"}/>
                  <button type="submit" className="footer-submit">→</button>
                </form>
              </div>
            </div>
            <div className="footer-bottom">
              <p className="footer-copy">© {new Date().getFullYear()} Scenic Routes. All Rights Reserved.</p>
              <div className="footer-legal"><a href="#">Terms & Conditions</a><a href="#">Privacy</a></div>
            </div>
          </div>
        </footer>

      </main>
      <AuthModal isOpen={isAuthOpen} onClose={()=>setIsAuthOpen(false)}/>
    </>
  );
}