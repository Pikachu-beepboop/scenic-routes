"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import WorldMap from "./components/WorldMap";
import AuthModal from "./AuthModal";

const fmtKm = (km?: number) => km != null ? `${km.toLocaleString("en-US")} km` : "—";

const FALLBACK_ROUTES = [
  { id: "1", title: "Amalfi Coast Road",    country: "Italy",       distance_km: 50,   image_url: "/Amalfi coast road.jpg",      duration: "Half day (< 4h)",   type: "Coastal Highway", terrain: "Coastal",   description: "A ribbon of coastal beauty — cliffside villages, endless sea, and curves that stay with you." },
  { id: "2", title: "Pacific Coast Highway", country: "USA",         distance_km: 650,  image_url: "/Pacific Route Highway.jpg",  duration: "Multi-day journey", type: "Coastal Highway", terrain: "Coastal",   description: "One of the world's great coastal drives, tracing the California shoreline." },
  { id: "3", title: "Trollstigen",           country: "Norway",      distance_km: 27,   image_url: "/Trollstigen.jpg",            duration: "Half day (< 4h)",   type: "Scenic Pass",     terrain: "Mountains", description: "Norway's most dramatic mountain road with 11 legendary hairpin bends." },
  { id: "4", title: "Stelvio Pass",          country: "Italy",       distance_km: 75,   image_url: "/Stellvio Pass.jpg",          duration: "Half day (< 4h)",   type: "Alpine Pass",     terrain: "Mountains", description: "The highest paved mountain pass in the Eastern Alps." },
  { id: "5", title: "Garden Route",          country: "South Africa",distance_km: 300,  image_url: "/Garden Route.jpg",           duration: "Weekend trip",      type: "Scenic Route",    terrain: "Coastal",   description: "South Africa's lush coastal corridor of forests, lagoons and beaches." },
  { id: "6", title: "North Coast 500",       country: "Scotland",    distance_km: 830,  image_url: "/North Coast 500.jpg",        duration: "Multi-day journey", type: "Circular Route",  terrain: "Mountains", description: "Scotland's iconic 830 km loop through remote Highlands and dramatic sea cliffs." },
];

const DESTINATIONS = [
  { name: "Pacific Coast",  place: "USA",          x: "14%",  y: "38%" },
  { name: "The Andes",      place: "South America",x: "26%",  y: "62%" },
  { name: "Tuscany",        place: "Italy",         x: "50%",  y: "34%" },
  { name: "Garden Route",   place: "South Africa",  x: "52%",  y: "68%" },
  { name: "Great Ocean Road",place: "Australia",    x: "82%",  y: "70%" },
];

const TESTIMONIALS = [
  { quote: "Every curve led to something unforgettable. Scenic Routes turned a trip into a story.", name: "Sarah G.", role: "Traveler" },
  { quote: "I've driven roads all over the world. Scenic Routes showed me places I never would have found alone.", name: "Marcus K.", role: "Automotive Journalist" },
  { quote: "The routes, the timing, the hidden gems along the way — absolutely flawless.", name: "Alex M.", role: "World Traveler" },
];

const FEATURES = [
  { icon: "◎", title: "Curated with care",   text: "Handpicked routes and places researched by real travelers." },
  { icon: "△", title: "Driven by detail",    text: "Maps, tips, and insights that make every mile smoother." },
  { icon: "⬡", title: "Built for freedom",   text: "Flexible plans that adapt to the way you travel." },
  { icon: "◈", title: "Stories that inspire",text: "Journeys, guides, and journals to fuel your next adventure." },
];

type Route = {
  id: string; title: string; country: string;
  distance_km?: number; image_url?: string; duration?: string;
  type?: string; terrain?: string; description?: string;
};

export default function HomePage() {
  const [routes,         setRoutes]         = useState<Route[]>([]);
  const [user,           setUser]           = useState<any>(null);
  const [avatarUrl,      setAvatarUrl]      = useState("");
  const [email,          setEmail]          = useState("");
  const [emailSent,      setEmailSent]      = useState(false);
  const [isAuthOpen,     setIsAuthOpen]     = useState(false);
  const [showUserMenu,   setShowUserMenu]   = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [navScrolled,    setNavScrolled]    = useState(false);
  const [heroVisible,    setHeroVisible]    = useState(false);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [carouselIdx,    setCarouselIdx]    = useState(0);
  const [activeSlot,     setActiveSlot]     = useState(0);
  const [slotSrcs,       setSlotSrcs]       = useState(["", ""]);
  const crossfadeInFlight = useRef(false);

  const displayRoutes = useMemo(() => (routes.length ? routes : FALLBACK_ROUTES), [routes]);

  const crossfadeTo = useCallback((src: string) => {
    if (crossfadeInFlight.current) return;
    crossfadeInFlight.current = true;
    const next = activeSlot === 0 ? 1 : 0;
    setSlotSrcs(srcs => { const u = [...srcs] as [string,string]; u[next] = src; return u; });
    setTimeout(() => { setActiveSlot(next); crossfadeInFlight.current = false; }, 60);
  }, [activeSlot]);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => { if (mounted) setUser(data.session?.user ?? null); });
    const { data: listener } = supabase.auth.onAuthStateChange((_, s) => setUser(s?.user ?? null));
    supabase.from("routes").select("*").limit(6).then(({ data }) => {
      if (!mounted) return;
      const r = data?.length ? data : FALLBACK_ROUTES;
      setRoutes(r);
      setSlotSrcs([r[0]?.image_url || "/Pacific Route Highway.jpg", r[0]?.image_url || "/Pacific Route Highway.jpg"]);
    });
    requestAnimationFrame(() => requestAnimationFrame(() => setHeroVisible(true)));
    const tT = setInterval(() => setTestimonialIdx(p => (p + 1) % TESTIMONIALS.length), 6000);
  }, []);

  useEffect(() => {
    const src = displayRoutes[carouselIdx]?.image_url || "/Pacific Route Highway.jpg";
    crossfadeTo(src);
  }, [carouselIdx, displayRoutes]);

  useEffect(() => {
    if (!user) { setAvatarUrl(""); return; }
    supabase.from("profiles").select("avatar_url").eq("id", user.id).single().then(({ data }) => setAvatarUrl(data?.avatar_url || ""));
  }, [user]);

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;
    await supabase.from("newsletter_subscribers").insert({ email: cleanEmail, created_at: new Date().toISOString() });
    setEmailSent(true); setEmail("");
  };

  const featuredRoute = displayRoutes[carouselIdx] ?? displayRoutes[0];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500;600;700;800&display=swap');
        :root {
          --bg:    #0c0b09;
          --bg2:   #111009;
          --bg3:   #181510;
          --gold:  #C9A86A;
          --cream: #EDE5D4;
          --muted: rgba(237,229,212,0.56);
          --dim:   rgba(237,229,212,0.32);
          --border:rgba(237,229,212,0.10);
          --serif: 'Cormorant Garamond', Georgia, serif;
          --sans:  'Inter', system-ui, sans-serif;
        }
        .pg *, .pg *::before, .pg *::after { box-sizing:border-box; margin:0; padding:0; }
        .pg a { color:inherit; text-decoration:none; }
        .pg button { border:none; font:inherit; cursor:pointer; background:none; }
        .pg input { font:inherit; }
        .pg img { display:block; }
        .pg {
          min-height:100vh;
          background:var(--bg);
          color:var(--cream);
          font-family:var(--sans);
          overflow-x:hidden;
        }

        /* NAV */
        .nav {
          position:fixed; inset:0 0 auto; z-index:200;
          height:64px; padding:0 clamp(20px,4vw,56px);
          display:flex; align-items:center; justify-content:space-between;
          transition:background .3s, border-color .3s;
          border-bottom:1px solid transparent;
        }
        .nav.scrolled { background:rgba(12,11,9,0.94); backdrop-filter:blur(20px); border-bottom-color:var(--border); }
        .nav-logo { font-size:11px; font-weight:800; letter-spacing:0.26em; text-transform:uppercase; line-height:1.2; color:var(--cream); }
        .nav-links { display:flex; gap:32px; }
        .nav-link { font-size:10px; font-weight:600; letter-spacing:0.18em; text-transform:uppercase; color:var(--muted); transition:color .2s; }
        .nav-link:hover { color:var(--cream); }
        .nav-right { display:flex; align-items:center; gap:12px; }
        .nav-cta {
          padding:10px 22px; border:1px solid var(--gold); border-radius:999px;
          font-size:9px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase;
          color:var(--gold); transition:all .25s; display:flex; align-items:center; gap:8px;
        }
        .nav-cta:hover { background:var(--gold); color:var(--bg); }
        .user-avatar-btn {
          width:36px; height:36px; border-radius:50%;
          border:1px solid var(--border); background:rgba(237,229,212,0.06);
          overflow:hidden; display:flex; align-items:center; justify-content:center;
          font-size:12px; font-weight:700; color:var(--cream);
        }
        .user-avatar-btn img { width:100%; height:100%; object-fit:cover; }
        .user-dd {
          position:absolute; top:46px; right:0; width:200px;
          background:rgba(18,16,10,0.98); border:1px solid var(--border);
          border-radius:14px; overflow:hidden; box-shadow:0 20px 50px rgba(0,0,0,0.5);
        }
        .user-dd-email { padding:11px 14px; border-bottom:1px solid var(--border); font-size:10px; color:var(--dim); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .user-dd a, .user-dd button { display:block; width:100%; padding:11px 14px; font-size:12px; color:var(--cream); text-align:left; transition:background .15s; }
        .user-dd a:hover, .user-dd button:hover { background:rgba(237,229,212,0.06); }
        .user-dd button { color:#E08080; }

        /* HERO */
        .hero {
          position:relative; height:100vh; min-height:680px;
          display:flex; flex-direction:column; justify-content:flex-end;
          overflow:hidden;
        }
        .hero-bg { position:absolute; inset:0; }
        .hero-slot { position:absolute; inset:0; transition:opacity 1.4s ease; }
        .hero-slot img { width:100%; height:100%; object-fit:cover; object-position:center 40%; filter:brightness(0.52) contrast(1.08) saturate(0.9); }
        .hero-slot.active  { opacity:1; z-index:2; }
        .hero-slot.inactive{ opacity:0; z-index:1; }
        .hero-bg::after {
          content:""; position:absolute; inset:0; z-index:3;
          background:
            linear-gradient(to bottom, rgba(12,11,9,0.1) 0%, rgba(12,11,9,0.05) 30%, rgba(12,11,9,0.65) 70%, rgba(12,11,9,0.95) 100%),
            linear-gradient(to right, rgba(12,11,9,0.72) 0%, rgba(12,11,9,0.2) 60%, transparent 100%);
        }
        .hero-content {
          position:relative; z-index:10;
          padding:0 clamp(24px,5vw,80px) clamp(50px,7vh,90px);
          max-width:1280px;
        }
        .hero-copy { opacity:0; transform:translateY(22px); transition:opacity .9s, transform .9s; }
        .hero-copy.visible { opacity:1; transform:translateY(0); }
        .hero-h1 {
          font-family:var(--serif); font-size:clamp(56px,8.5vw,122px);
          font-weight:300; line-height:0.88; letter-spacing:-0.045em;
          color:var(--cream); margin-bottom:20px;
          text-shadow:0 20px 60px rgba(0,0,0,0.6);
        }
        .hero-sub { font-size:14px; font-weight:300; color:rgba(237,229,212,0.65); margin-bottom:32px; max-width:420px; line-height:1.7; }
        .btn-gold {
          display:inline-flex; align-items:center; gap:10px;
          padding:14px 28px; background:transparent; border:1px solid var(--gold);
          border-radius:999px; font-size:9px; font-weight:800;
          letter-spacing:0.22em; text-transform:uppercase; color:var(--gold);
          transition:all .25s;
        }
        .btn-gold:hover { background:var(--gold); color:var(--bg); }
        .btn-gold-filled {
          display:inline-flex; align-items:center; gap:10px;
          padding:14px 28px; background:var(--gold); border:1px solid var(--gold);
          border-radius:999px; font-size:9px; font-weight:800;
          letter-spacing:0.22em; text-transform:uppercase; color:var(--bg);
          transition:all .25s;
        }
        .btn-gold-filled:hover { background:#d8b978; border-color:#d8b978; transform:translateY(-1px); }

        /* STATS BAR */
        .stats-bar {
          position:relative; z-index:10;
          background:rgba(12,11,9,0.96); border-top:1px solid var(--border);
          padding:28px clamp(24px,5vw,80px);
          display:flex; gap:0; align-items:center;
        }
        .stat-item { flex:1; padding:0 clamp(16px,3vw,40px); border-right:1px solid var(--border); }
        .stat-item:first-child { padding-left:0; }
        .stat-item:last-child  { border-right:none; }
        .stat-num  { font-family:var(--serif); font-size:clamp(28px,3vw,40px); font-weight:300; color:var(--cream); line-height:1; margin-bottom:6px; }
        .stat-label{ font-size:9px; font-weight:800; letter-spacing:0.26em; text-transform:uppercase; color:rgba(237,229,212,0.35); }

        /* FEATURED ROUTE */
        .featured-section {
          padding:clamp(70px,9vw,120px) clamp(24px,5vw,80px);
          background:var(--bg);
        }
        .featured-inner {
          max-width:1200px; margin:0 auto;
          display:grid; grid-template-columns:1fr 1.4fr; gap:clamp(40px,6vw,90px); align-items:center;
        }
        .featured-left {}
        .eyebrow { font-size:9px; font-weight:800; letter-spacing:0.36em; text-transform:uppercase; color:var(--gold); margin-bottom:20px; }
        .featured-title { font-family:var(--serif); font-size:clamp(38px,5vw,68px); font-weight:300; line-height:0.92; letter-spacing:-0.04em; color:var(--cream); margin-bottom:8px; }
        .featured-country { font-size:12px; color:var(--gold); font-weight:500; letter-spacing:0.1em; margin-bottom:20px; }
        .featured-desc { font-size:14px; color:var(--dim); line-height:1.8; font-weight:300; margin-bottom:32px; max-width:340px; }
        .featured-view {
          display:inline-flex; align-items:center; gap:10px;
          padding:12px 22px; border:1px solid rgba(237,229,212,0.22); border-radius:999px;
          font-size:9px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase;
          color:var(--muted); transition:all .25s;
        }
        .featured-view:hover { border-color:var(--gold); color:var(--gold); }
        .featured-nav { display:flex; align-items:center; gap:20px; margin-top:32px; }
        .featured-arrow {
          width:40px; height:40px; border-radius:50%;
          border:1px solid rgba(237,229,212,0.2); display:grid; place-items:center;
          font-size:14px; color:var(--muted); transition:all .2s;
        }
        .featured-arrow:hover { border-color:var(--gold); color:var(--gold); }
        .featured-counter { font-family:var(--serif); font-size:15px; color:var(--dim); }
        .featured-image {
          position:relative; border-radius:20px; overflow:hidden;
          aspect-ratio:4/3; border:1px solid var(--border);
        }
        .featured-image img { width:100%; height:100%; object-fit:cover; filter:brightness(0.9) contrast(1.05) saturate(0.95); transition:transform .8s ease; }
        .featured-image:hover img { transform:scale(1.03); }

        /* BUILDER */
        .builder-section {
          background:var(--bg2);
          border-top:1px solid var(--border); border-bottom:1px solid var(--border);
        }
        .builder-inner {
          max-width:1200px; margin:0 auto;
          display:grid; grid-template-columns:1fr 1fr; align-items:center;
        }
        .builder-image { position:relative; aspect-ratio:4/5; overflow:hidden; }
        .builder-image img { width:100%; height:100%; object-fit:cover; filter:brightness(0.75) contrast(1.05) saturate(0.88); }
        .builder-image::after {
          content:""; position:absolute; inset:0;
          background:linear-gradient(to right, transparent 60%, var(--bg2));
        }
        .builder-content { padding:clamp(50px,7vw,90px) clamp(30px,5vw,70px); }
        .builder-h2 { font-family:var(--serif); font-size:clamp(36px,4.5vw,58px); font-weight:300; line-height:0.95; letter-spacing:-0.04em; color:var(--cream); margin-bottom:12px; }
        .builder-sub { font-size:14px; color:var(--dim); line-height:1.7; font-weight:300; margin-bottom:40px; max-width:340px; }
        .builder-steps { display:flex; flex-direction:column; gap:28px; margin-bottom:40px; }
        .builder-step { display:flex; align-items:flex-start; gap:20px; }
        .step-icon {
          width:40px; height:40px; border-radius:50%; border:1px solid rgba(201,168,106,0.4);
          display:grid; place-items:center; flex-shrink:0;
          color:var(--gold); font-size:14px;
        }
        .step-text h4 { font-size:13px; font-weight:700; color:var(--cream); margin-bottom:4px; letter-spacing:0.05em; }
        .step-text p  { font-size:12px; color:var(--dim); line-height:1.6; }

        /* DESTINATIONS MAP */
        .dest-section {
          padding:clamp(70px,9vw,120px) clamp(24px,5vw,80px);
          background:var(--bg);
          border-top:1px solid var(--border);
        }
        .dest-header { max-width:1200px; margin:0 auto 48px; display:flex; justify-content:space-between; align-items:flex-end; }
        .dest-h2 { font-family:var(--serif); font-size:clamp(34px,4.5vw,58px); font-weight:300; line-height:0.95; letter-spacing:-0.04em; color:var(--cream); }
        .dest-right { text-align:right; }
        .dest-sub { font-size:12px; color:var(--dim); line-height:1.6; margin-bottom:12px; max-width:200px; }
        .view-all-link { font-size:9px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:var(--gold); display:inline-flex; align-items:center; gap:8px; transition:gap .2s; }
        .view-all-link:hover { gap:14px; }
        .dest-map {
          max-width:1200px; margin:0 auto;
          position:relative; aspect-ratio:16/7; border-radius:20px; overflow:hidden;
          border:1px solid var(--border);
        }
        .dest-map img { width:100%; height:100%; object-fit:cover; }
        .dest-map::after { content:""; position:absolute; inset:0; background:linear-gradient(to bottom, transparent 40%, rgba(12,11,9,0.6)); }
        .dest-pin {
          position:absolute; z-index:10; transform:translate(-50%,-50%);
          display:flex; flex-direction:column; align-items:center; gap:4px;
        }
        .dest-pin-dot {
          width:8px; height:8px; border-radius:50%; background:var(--gold);
          box-shadow:0 0 0 4px rgba(201,168,106,0.22), 0 0 16px rgba(201,168,106,0.4);
        }
        .dest-pin-label { white-space:nowrap; text-align:center; }
        .dest-pin-name  { font-size:9px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:var(--cream); }
        .dest-pin-place { font-size:8px; letter-spacing:0.1em; text-transform:uppercase; color:rgba(237,229,212,0.45); }

        /* TESTIMONIAL */
        .testimonial-section {
          padding:clamp(70px,9vw,110px) clamp(24px,5vw,80px);
          background:var(--bg2); border-top:1px solid var(--border);
          text-align:center;
        }
        .testimonial-qq { font-family:var(--serif); font-size:52px; color:var(--gold); opacity:0.6; line-height:0.5; margin-bottom:28px; }
        .testimonial-text { font-family:var(--serif); font-size:clamp(22px,3vw,38px); font-weight:300; font-style:italic; color:var(--cream); line-height:1.4; max-width:820px; margin:0 auto 28px; }
        .testimonial-name { font-size:10px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--gold); }
        .testimonial-dots { display:flex; justify-content:center; gap:8px; margin-top:24px; }
        .t-dot { width:44px; height:44px; display:flex; align-items:center; justify-content:center; }
        .t-dot::after { content:""; width:6px; height:6px; border-radius:50%; background:var(--border); border:1px solid var(--dim); transition:all .3s; display:block; }
        .t-dot.active::after { width:22px; background:var(--gold); border-color:var(--gold); border-radius:999px; }

        /* FEATURES */
        .features-section {
          padding:clamp(70px,9vw,120px) clamp(24px,5vw,80px);
          background:var(--bg); border-top:1px solid var(--border);
        }
        .features-inner { max-width:1200px; margin:0 auto; }
        .features-h2 { font-family:var(--serif); font-size:clamp(34px,4.5vw,56px); font-weight:300; line-height:0.95; letter-spacing:-0.04em; color:var(--cream); margin-bottom:48px; }
        .features-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
        .feature-card {
          padding:28px 22px 32px;
          border:1px solid var(--border); border-radius:18px;
          background:rgba(237,229,212,0.025);
          transition:border-color .3s, transform .3s, background .3s;
        }
        .feature-card:hover { border-color:rgba(201,168,106,0.28); transform:translateY(-3px); background:rgba(237,229,212,0.045); }
        .feature-icon  { font-size:22px; color:var(--gold); margin-bottom:18px; }
        .feature-title { font-size:10px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:var(--cream); margin-bottom:10px; }
        .feature-text  { font-size:13px; color:var(--dim); line-height:1.7; font-weight:300; }

        /* FOOTER */
        .footer { background:var(--bg); border-top:1px solid var(--border); padding:56px clamp(24px,5vw,80px) 28px; }
        .footer-inner { max-width:1200px; margin:0 auto; }
        .footer-top { display:grid; grid-template-columns:1.3fr 1fr 1fr 1fr 1.4fr; gap:36px; padding-bottom:40px; border-bottom:1px solid var(--border); margin-bottom:22px; }
        .footer-brand { font-size:11px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--cream); line-height:1.2; margin-bottom:12px; }
        .footer-tagline { font-size:12px; color:var(--dim); line-height:1.7; font-weight:300; margin-bottom:18px; max-width:200px; }
        .footer-socials { display:flex; gap:8px; }
        .footer-social { width:32px; height:32px; border-radius:50%; border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:11px; color:var(--dim); transition:all .2s; }
        .footer-social:hover { border-color:var(--gold); color:var(--gold); }
        .footer-col-title { font-size:9px; font-weight:800; letter-spacing:0.28em; text-transform:uppercase; color:var(--dim); margin-bottom:16px; }
        .footer-col a { display:block; font-size:12px; color:rgba(237,229,212,0.38); margin-bottom:10px; font-weight:300; transition:color .2s; }
        .footer-col a:hover { color:var(--cream); }
        .footer-nl-sub { font-size:12px; color:var(--dim); line-height:1.6; margin-bottom:14px; font-weight:300; }
        .footer-nl-form { display:flex; }
        .footer-nl-input { flex:1; padding:11px 14px; border:1px solid var(--border); border-right:none; border-radius:999px 0 0 999px; background:rgba(237,229,212,0.04); color:var(--cream); font-size:12px; outline:none; }
        .footer-nl-input::placeholder { color:var(--dim); }
        .footer-nl-btn { width:44px; background:var(--gold); border:1px solid var(--gold); border-radius:0 999px 999px 0; color:var(--bg); font-size:15px; font-weight:800; transition:background .2s; }
        .footer-nl-btn:hover { background:#d8b978; }
        .footer-bottom { display:flex; justify-content:space-between; align-items:center; gap:16px; }
        .footer-copy { font-size:10px; color:var(--dim); letter-spacing:0.08em; text-transform:uppercase; }
        .footer-legal { display:flex; gap:22px; }
        .footer-legal a { font-size:10px; color:var(--dim); letter-spacing:0.08em; text-transform:uppercase; transition:color .2s; }
        .footer-legal a:hover { color:var(--cream); }

        @media (max-width:1024px) {
          .featured-inner { grid-template-columns:1fr; }
          .builder-inner  { grid-template-columns:1fr; }
          .builder-image  { display:none; }
          .builder-content{ padding:60px 30px; }
          .features-grid  { grid-template-columns:repeat(2,1fr); }
          .footer-top     { grid-template-columns:1fr 1fr; }
          .dest-header    { flex-direction:column; align-items:flex-start; gap:16px; }
        }
        @media (max-width:680px) {
          .nav-links      { display:none; }
          .stat-label     { display:none; }
          .features-grid  { grid-template-columns:1fr; }
          .footer-top     { grid-template-columns:1fr; }
          .footer-bottom  { flex-direction:column; align-items:flex-start; }
        }
      `}</style>

      <main className="pg">

        {/* NAV */}
        <nav className={`nav ${navScrolled ? "scrolled" : ""}`}>
          <Link href="/" className="nav-logo">SCENIC<br/>ROUTES</Link>
          <div className="nav-links">
            {[["Routes","/explore"],["Destinations","/explore"],["Experiences","#experiences"],["Journal","#"],["About","#"]].map(([l,h])=>(
              <Link key={l} href={h} className="nav-link">{l}</Link>
            ))}
          </div>
          <div className="nav-right">
            {user ? (
              <div style={{position:"relative"}}>
                <button className="user-avatar-btn" onClick={()=>setShowUserMenu(p=>!p)}>
                  {avatarUrl ? <img src={avatarUrl} alt="avatar"/> : user.email?.[0]?.toUpperCase()}
                </button>
                {showUserMenu && (
                  <div className="user-dd">
                    <div className="user-dd-email">{user.email}</div>
                    <Link href="/profile"  onClick={()=>setShowUserMenu(false)}>Profile</Link>
                    <Link href="/my-trips" onClick={()=>setShowUserMenu(false)}>My Trips</Link>
                    <button onClick={async()=>{ await supabase.auth.signOut(); setUser(null); setShowUserMenu(false); }}>Sign Out</button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="#" onClick={e=>{ e.preventDefault(); setIsAuthOpen(true); }} className="nav-cta">
                Plan your route →
              </Link>
            )}
          </div>
        </nav>

        {/* HERO */}
        <section className="hero">
          <div className="hero-bg">
  <img src="/hero.png" alt="Hero" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center 40%",filter:"brightness(0.92) contrast(1.08) saturate(0.9)"}}/>
</div>
          <div className="hero-content">
            <div className={`hero-copy ${heroVisible?"visible":""}`}>
              <h1 className="hero-h1">The road<br/>reveals more.</h1>
              <p className="hero-sub">Scenic drives. Hidden places. Stories worth the journey.</p>
              <Link href="/explore" className="btn-gold-filled">Explore Routes →</Link>
            </div>
          </div>
        </section>

        {/* STATS BAR */}
        <div className="stats-bar">
          {[["150+","Curated Routes"],["40+","Countries"],["100K+","Travelers"],["10K+","Hidden Places"]].map(([n,l])=>(
            <div className="stat-item" key={l}>
              <div className="stat-num">{n}</div>
              <div className="stat-label">{l}</div>
            </div>
          ))}
        </div>

        {/* FEATURED ROUTE */}
        <section className="featured-section">
          <div className="featured-inner">
            <div className="featured-left">
              <p className="eyebrow">Featured Route</p>
              <h2 className="featured-title">{featuredRoute?.title || "Amalfi Coast Road"}</h2>
              <p className="featured-country">{featuredRoute?.country || "Italy"}</p>
              <p className="featured-desc">{featuredRoute?.description || "A ribbon of coastal beauty — cliffside villages, endless sea, and curves that stay with you."}</p>
              <Link href={`/routedetail/${featuredRoute?.id || "1"}`} className="featured-view">
                View Route →
              </Link>
              <div className="featured-nav">
                <button className="featured-arrow" onClick={()=>setCarouselIdx(p=>(p===0?displayRoutes.length-1:p-1))}>←</button>
                <span className="featured-counter">{String(carouselIdx+1).padStart(2,"0")} / {String(Math.min(displayRoutes.length,6)).padStart(2,"0")}</span>
                <button className="featured-arrow" onClick={()=>setCarouselIdx(p=>(p+1)%Math.min(displayRoutes.length,6))}>→</button>
              </div>
            </div>
            <div className="featured-image">
              <img
                src={featuredRoute?.image_url||"/Amalfi coast road.jpg"}
                alt={featuredRoute?.title}
                onError={e=>{ e.currentTarget.src="/Amalfi coast road.jpg"; }}
              />
            </div>
          </div>
        </section>

        {/* BUILDER */}
        <section className="builder-section" id="experiences">
          <div className="builder-inner">
            <div className="builder-image">
              <img src="/Toscana.jpg" alt="Tuscany road" onError={e=>{ e.currentTarget.src="/iceland.jpg"; }}/>
            </div>
            <div className="builder-content">
              <p className="eyebrow">Build your route</p>
              <h2 className="builder-h2">Your journey,<br/>your way.</h2>
              <p className="builder-sub">Choose your terrain, pace, and places. We'll craft a route that fits you.</p>
              <div className="builder-steps">
                <div className="builder-step">
                  <div className="step-icon">△</div>
                  <div className="step-text">
                    <h4>Choose your terrain</h4>
                    <p>Mountains, coastlines, deserts, or forests.</p>
                  </div>
                </div>
                <div className="builder-step">
                  <div className="step-icon">◎</div>
                  <div className="step-text">
                    <h4>Set your time</h4>
                    <p>A weekend escape or the long way around.</p>
                  </div>
                </div>
                <div className="builder-step">
                  <div className="step-icon">⬡</div>
                  <div className="step-text">
                    <h4>Pick your style</h4>
                    <p>Relaxed, adventurous, cultural, or off-grid.</p>
                  </div>
                </div>
              </div>
              <Link href="/explore" className="btn-gold-filled">Start Building →</Link>
            </div>
          </div>
        </section>

        {/* DESTINATIONS MAP */}
        <section className="dest-section">
          <div className="dest-header">
            <div>
              <p className="eyebrow">Destinations</p>
              <h2 className="dest-h2">Places that stay with you.</h2>
            </div>
            <div className="dest-right">
              <p className="dest-sub">Explore handpicked regions around the world.</p>
              <Link href="/explore" className="view-all-link">View all destinations →</Link>
            </div>
          </div>
          <div style={{maxWidth:"90%", margin:"0 auto"}}>
  <WorldMap />
</div>
        </section>

        {/* TESTIMONIAL */}
        <section className="testimonial-section">
          <div className="testimonial-qq">"</div>
          <p className="testimonial-text">{TESTIMONIALS[testimonialIdx].quote}</p>
          <p className="testimonial-name">— {TESTIMONIALS[testimonialIdx].name}</p>
          <div className="testimonial-dots">
            {TESTIMONIALS.map((_,i)=>(
              <button key={i} className={`t-dot ${i===testimonialIdx?"active":""}`} onClick={()=>setTestimonialIdx(i)} aria-label={`Testimonial ${i+1}`}/>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section className="features-section">
          <div className="features-inner">
            <p className="eyebrow">Why travel with Scenic Routes</p>
            <h2 className="features-h2">Designed for<br/>the road ahead.</h2>
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
                <div className="footer-brand">SCENIC<br/>ROUTES</div>
                <p className="footer-tagline">Thoughtfully curated road trips for people who value the journey as much as the destination.</p>
                <div className="footer-socials">
                  {["IG","FB","YT"].map(s=><a key={s} href="#" className="footer-social">{s[0]}</a>)}
                </div>
              </div>
              {[
                ["Explore",["All Routes","Destinations","Experiences","Journal"]],
                ["Company",["About Us","Membership","Gift Cards","Careers"]],
                ["Support",["FAQ","Travel Policies","Contact Us","Privacy Policy"]],
              ].map(([heading, links])=>(
                <div className="footer-col" key={heading as string}>
                  <p className="footer-col-title">{heading as string}</p>
                  {(links as string[]).map(l=><a href="#" key={l}>{l}</a>)}
                </div>
              ))}
              <div>
                <p className="footer-col-title">Stay Inspired</p>
                <p className="footer-nl-sub">Subscribe for new routes, stories, and exclusive guides.</p>
                <form className="footer-nl-form" onSubmit={handleNewsletter}>
                  <input type="email" required className="footer-nl-input"
                    value={email} onChange={e=>setEmail(e.target.value)}
                    placeholder={emailSent?"Subscribed!":"Enter your email"}/>
                  <button type="submit" className="footer-nl-btn">→</button>
                </form>
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

      </main>

      <AuthModal isOpen={isAuthOpen} onClose={()=>setIsAuthOpen(false)}/>
    </>
  );
}