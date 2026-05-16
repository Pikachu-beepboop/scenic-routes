"use client";

// ─────────────────────────────────────────────────────────────────────────────
// app/page.tsx  —  Scenic Routes Homepage
// ─────────────────────────────────────────────────────────────────────────────
//
// Sections (in order):
//   1. NAV          — fixed top bar, scrolled-state via class
//   2. HERO         — full-height, auto-cycling background images (crossfade)
//   3. POPULAR      — large carousel card with prev/next + dot navigation
//   4. BUILDER      — 3-step route planner with timeline layout
//   5. TESTIMONIAL  — rotating quote slider
//   6. FEATURES     — 4-card "why us" grid
//   7. FOOTER       — links + newsletter
//
// Data flow:
//   - Supabase `routes` table → displayRoutes (fallback to FALLBACK_ROUTES)
//   - Supabase `profiles`    → avatar URL
//   - Supabase `newsletter_subscribers` → newsletter form
//   - Supabase auth          → login / logout
//
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import AuthModal from "./AuthModal";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Always produces the same string on server + client → no hydration mismatch */
const fmtKm = (km?: number) =>
  km != null ? `${km.toLocaleString("en-US")} km` : "—";

// ─── Static data ─────────────────────────────────────────────────────────────

const FALLBACK_ROUTES = [
  { id: "1", title: "Dolomites",          country: "Italy",        distance_km: 320,  image_url: "/stelvio.jpg",       duration: "6 Days",           type: "Mountain Road",  terrain: "Mountains", description: "Legendary hairpin roads through pale limestone towers." },
  { id: "2", title: "Iceland Ring Road",  country: "Iceland",      distance_km: 1332, image_url: "/iceland.jpg",       duration: "Multi-day journey", type: "Circular Route", terrain: "Mountains", description: "A complete circumnavigation of Iceland's raw wilderness." },
  { id: "3", title: "Amalfi Coast",       country: "Italy",        distance_km: 250,  image_url: "/pacific.jpg",       duration: "Weekend trip",      type: "Coastal Highway",terrain: "Coastal",   description: "Dramatic cliffs, turquoise sea and timeless Italian villages." },
  { id: "4", title: "Swiss Alps",         country: "Switzerland",  distance_km: 280,  image_url: "/grossglockner.jpg", duration: "Full day (4-8h)",   type: "Alpine Pass",    terrain: "Mountains", description: "World-class passes through the heart of the Alps." },
  { id: "5", title: "Trollstigen",        country: "Norway",       distance_km: 27,   image_url: "/trollstigen.jpg",   duration: "Half day (< 4h)",   type: "Scenic Pass",    terrain: "Mountains", description: "Norway's most dramatic mountain road with 11 hairpins." },
  { id: "6", title: "Black Forest Road",  country: "Germany",      distance_km: 60,   image_url: "/blackforest.jpg",   duration: "Half day (< 4h)",   type: "Forest Route",   terrain: "Forest",    description: "A legendary drive through deep forest and sweeping viewpoints." },
];

const TESTIMONIALS = [
  { quote: "Scenic Routes didn't just plan a trip — they crafted the most unforgettable journey of our lives.", name: "Alex Morgan",   role: "World Traveler",       since: "Member since 2022" },
  { quote: "Every detail was perfect. The routes, the timing, the hidden gems along the way — absolutely flawless.",  name: "Sarah Chen",    role: "Photographer",         since: "Member since 2023" },
  { quote: "I've driven roads all over the world. Scenic Routes showed me places I never would have found alone.",    name: "Marcus Klein",  role: "Automotive Journalist",since: "Member since 2021" },
];

const FEATURES = [
  { icon: "◎", title: "Curated Experiences", text: "Handpicked scenic routes with useful travel details." },
  { icon: "△", title: "Smart Filters",       text: "Find routes by terrain, duration, country and rating." },
  { icon: "⬡", title: "Scenic Details",      text: "Every route includes distance, country, route type and duration." },
  { icon: "◈", title: "Built For Drivers",   text: "Designed for people who love beautiful roads and unforgettable drives." },
];

const FOOTER_COLS = {
  Explore:  ["All Routes", "Destinations", "Experiences", "Journal"],
  Company:  ["About Us",   "Membership",   "Gift Cards",  "Careers"],
  Support:  ["FAQs",       "Travel Policies", "Contact Us", "Privacy Policy"],
};

// Builder steps — `as const` keeps key types narrow (no stale closures)
const BUILDER_STEPS = [
  { step: 1, label: "Terrain",  title: "What kind of road are you chasing?",  subtitle: "Choose the landscape that fits your next drive.",       key: "terrain",  options: ["Forest","Deserts","Coastal","Mountains"] },
  { step: 2, label: "Duration", title: "How long should the escape be?",       subtitle: "Pick the travel time that matches your plan.",          key: "duration", options: ["Half day (< 4h)","Full day (4-8h)","Weekend trip","Multi-day journey"] },
  { step: 3, label: "Country",  title: "Where should the journey begin?",      subtitle: "Choose a country and discover matching scenic routes.",  key: "country",  options: ["Austria","France","Germany","Iceland","Italy"] },
] as const;

type BuilderKey = "terrain" | "duration" | "country";
type Route = {
  id: string; title: string; country: string;
  distance_km?: number; image_url?: string; duration?: string;
  type?: string; terrain?: string; description?: string;
};

// ─── Sub-component: Popular carousel ─────────────────────────────────────────
// Displays one large card at a time with prev/next arrows and dot navigation.

function PopularCarousel({ routes }: { routes: Route[] }) {
  const [idx, setIdx] = useState(0);
  const items = routes.slice(0, 6);
  const route = items[idx] ?? items[0];

  if (!route) return null;

  const prev = () => setIdx(i => (i === 0 ? items.length - 1 : i - 1));
  const next = () => setIdx(i => (i + 1) % items.length);

  return (
    <section className="popular-section">
      <div className="container">

        {/* Header */}
        <div className="popular-header">
          <div>
            <p className="section-eyebrow">Popular Destinations</p>
            <h2 className="section-h2">Roads made<br />for the journey.</h2>
          </div>
          <Link href="/explore" className="view-all-btn">View all destinations →</Link>
        </div>

        {/* Card */}
        <div className="popular-card-wrap">
          <button className="carousel-arrow carousel-left"  onClick={prev} aria-label="Previous">←</button>
          <button className="carousel-arrow carousel-right" onClick={next} aria-label="Next">→</button>

          <Link href={`/routedetail/${route.id}`} className="popular-card">
            <img src={route.image_url || "/iceland.jpg"} alt={route.title}
              onError={e => { e.currentTarget.src = "/iceland.jpg"; }} />
            <div className="popular-card-overlay" />

            <span className="popular-card-counter">
              {String(idx + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
            </span>
            <span className="popular-card-type">
              {route.terrain || route.type || "Scenic Route"}
            </span>

            <div className="popular-card-content">
              <p>{route.country}</p>
              <h3>{route.title}</h3>
              <span>{route.description || "One of the world's most scenic driving routes."}</span>
              <div className="popular-card-meta">
                <small>{route.duration || "Plan trip"}</small>
                <small>{fmtKm(route.distance_km)}</small>
                <small>View route →</small>
              </div>
            </div>
          </Link>
        </div>

        {/* Dots */}
        <div className="popular-dots">
          {items.map((r, i) => (
            <button key={r.id} className={i === idx ? "active" : ""}
              onClick={() => setIdx(i)} aria-label={`Show ${r.title}`}>
              {String(i + 1).padStart(2, "0")}
            </button>
          ))}
        </div>

      </div>
    </section>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────

export default function HomePage() {

  // ── Data & auth state ──────────────────────────────────────────────────────
  const [routes,       setRoutes]       = useState<Route[]>([]);
  const [user,         setUser]         = useState<any>(null);
  const [avatarUrl,    setAvatarUrl]    = useState("");
  const [email,        setEmail]        = useState("");
  const [emailSent,    setEmailSent]    = useState(false);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [isAuthOpen,     setIsAuthOpen]     = useState(false);
  const [showUserMenu,   setShowUserMenu]   = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [navScrolled,    setNavScrolled]    = useState(false);
  const [heroVisible,    setHeroVisible]    = useState(false);   // triggers fade-in animation
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  // ── Hero crossfade state ───────────────────────────────────────────────────
  // We keep TWO image slots and crossfade between them so there's never a
  // hard cut. activeSlot alternates 0/1; both imgs are stacked via CSS.
  const [activeSlot,  setActiveSlot]  = useState(0);          // which img is on top
  const [slotSrcs,    setSlotSrcs]    = useState(["", ""]);   // src for each slot
  const [activeIdx,   setActiveIdx]   = useState(0);          // which route is showing
  const crossfadeInFlight = useRef(false);

  // ── Builder state ──────────────────────────────────────────────────────────
  const [builderStep,       setBuilderStep]       = useState(1);
  const [builderSelections, setBuilderSelections] = useState<Record<BuilderKey, string>>({
    terrain: "", duration: "", country: "",
  });

  // ── Derived values ─────────────────────────────────────────────────────────
  const displayRoutes = useMemo(
    () => (routes.length ? routes : FALLBACK_ROUTES),
    [routes]
  );

  // Builder "Discover" URL — only recomputed when selections change
  const builderHref = useMemo(() => {
    const p = new URLSearchParams();
    if (builderSelections.terrain)  p.set("terrain",  builderSelections.terrain);
    if (builderSelections.duration) p.set("duration", builderSelections.duration);
    if (builderSelections.country)  p.set("country",  builderSelections.country);
    return p.toString() ? `/explore?${p}` : "/explore";
  }, [builderSelections]);

  const currentBuilderStep = BUILDER_STEPS[builderStep - 1];

  // ── Callbacks ──────────────────────────────────────────────────────────────

  /** Toggle a builder chip on/off */
  const selectBuilder = useCallback((key: BuilderKey, value: string) => {
    setBuilderSelections(prev => ({
      ...prev,
      [key]: prev[key] === value ? "" : value,
    }));
  }, []);

  /** Crossfade hero to a new route image */
  const crossfadeTo = useCallback((src: string) => {
    if (crossfadeInFlight.current) return;
    crossfadeInFlight.current = true;

    setActiveSlot(prev => {
      const next = prev === 0 ? 1 : 0;
      // Pre-load the new image into the inactive slot, then flip
      setSlotSrcs(srcs => {
        const updated = [...srcs] as [string, string];
        updated[next] = src;
        return updated;
      });
      // Small delay so the browser has time to decode the new image
      setTimeout(() => {
        setActiveSlot(next);
        crossfadeInFlight.current = false;
      }, 60);
      return prev; // return prev here — the timeout does the real flip
    });
  }, []);

  // ── Effects ────────────────────────────────────────────────────────────────

  // Nav scroll detection (class-based — doesn't re-render <style>)
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auth + data loading
  useEffect(() => {
    let mounted = true;

    // Auth
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setUser(data.session?.user ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_, s) => {
      setUser(s?.user ?? null);
    });

    // Routes
    supabase.from("routes").select("*").limit(6).then(({ data }) => {
      if (!mounted) return;
      const r = data?.length ? data : FALLBACK_ROUTES;
      setRoutes(r);
      // Seed both slots with the first image so there's no empty flash
      setSlotSrcs([r[0]?.image_url || "/iceland.jpg", r[0]?.image_url || "/iceland.jpg"]);
    });

    // Hero entrance animation — two rAFs ensure layout is painted first
    requestAnimationFrame(() => requestAnimationFrame(() => setHeroVisible(true)));

    // Auto-rotate testimonials every 6 s
    const tTestimonial = setInterval(
      () => setTestimonialIdx(p => (p + 1) % TESTIMONIALS.length),
      6000
    );

    // Auto-cycle hero image every 4.5 s
    const tHero = setInterval(() => {
      setActiveIdx(prev => {
        const next = (prev + 1) % 3; // cycle through first 3 routes
        return next;
      });
    }, 4500);

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      clearInterval(tTestimonial);
      clearInterval(tHero);
    };
  }, []);

  // When activeIdx changes → crossfade to the new route's image
  useEffect(() => {
    const src = displayRoutes[activeIdx]?.image_url || "/iceland.jpg";
    crossfadeTo(src);
  }, [activeIdx, displayRoutes, crossfadeTo]);

  // Load avatar when user logs in
  useEffect(() => {
    if (!user) { setAvatarUrl(""); return; }
    supabase.from("profiles").select("avatar_url").eq("id", user.id).single()
      .then(({ data }) => setAvatarUrl(data?.avatar_url || ""));
  }, [user]);

  // Newsletter form submit
  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;
    await supabase.from("newsletter_subscribers")
      .insert({ email: cleanEmail, created_at: new Date().toISOString() });
    setEmailSent(true);
    setEmail("");
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ─── Global styles ─────────────────────────────────────────────────── */}
      {/*                                                                        */}
      {/* IMPORTANT: All selectors are scoped to `.page` so they don't leak     */}
      {/* into /explore, /routedetail or any other page when Next.js keeps this  */}
      {/* style tag alive during client-side navigation.                         */}
      {/*                                                                        */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500;600;700;800&display=swap');

        /* ── CSS variables — intentionally global so child components can use them ── */
        :root {
          --bg:    #0c0b09;
          --bg2:   #131109;
          --bg3:   #1a1710;
          --gold:  #C9A86A;
          --cream: #EDE5D4;
          --muted: rgba(237,229,212,0.56);
          --dim:   rgba(237,229,212,0.32);
          --border:rgba(237,229,212,0.12);
          --serif: 'Cormorant Garamond', Georgia, serif;
          --sans:  'Inter', system-ui, sans-serif;
        }

        /* ── Reset — scoped to .page so it doesn't affect other pages ── */
        .page *, .page *::before, .page *::after { box-sizing:border-box; margin:0; padding:0; }
        .page a   { color:inherit; text-decoration:none; }
        .page button { border:none; font:inherit; cursor:pointer; }
        .page input  { font:inherit; }
        .page img    { display:block; }

        /* ── Page wrapper ── */
        .page {
          min-height:100vh;
          background: radial-gradient(circle at 18% 0%, rgba(201,168,106,0.09), transparent 30%), var(--bg);
          color:var(--cream);
          font-family:var(--sans);
          overflow-x:hidden;
          scroll-behavior:smooth;
        }

        /* ════════════════════════════════════════
           NAV
        ════════════════════════════════════════ */
        .nav {
          position:fixed; inset:0 0 auto; z-index:200;
          height:72px; padding:0 clamp(20px,4vw,60px);
          display:flex; align-items:center; justify-content:space-between;
          background:transparent; border-bottom:1px solid transparent;
          transition:background .35s, backdrop-filter .35s, border-color .35s;
        }
        .nav.scrolled {
          background:rgba(12,11,9,0.92);
          backdrop-filter:blur(20px);
          border-bottom-color:var(--border);
        }
        .nav-logo { display:flex; flex-direction:column; line-height:1; }
        .nav-logo span { font-size:13px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--cream); }
        .nav-links { display:flex; gap:36px; }
        .nav-link {
          position:relative;
          font-size:11px; font-weight:600; letter-spacing:0.16em; text-transform:uppercase;
          color:var(--muted); transition:color .2s;
        }
        .nav-link::after {
          content:""; position:absolute; left:0; bottom:-8px;
          width:0; height:1px; background:var(--gold); transition:width .25s;
        }
        .nav-link:hover { color:var(--cream); }
        .nav-link:hover::after { width:100%; }
        .nav-right { display:flex; align-items:center; gap:12px; }
        .membership-btn {
          padding:10px 22px; border:1px solid rgba(237,229,212,0.28); border-radius:999px;
          font-size:10px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase;
          color:var(--cream); background:rgba(237,229,212,0.04); transition:all .25s;
        }
        .membership-btn:hover { background:var(--cream); color:var(--bg); transform:translateY(-1px); }
        .menu-icon {
          width:38px; height:38px; display:grid; place-items:center;
          border:1px solid var(--border); border-radius:50%;
          background:rgba(237,229,212,0.04); color:var(--muted); font-size:18px;
          transition:border-color .2s, color .2s;
        }
        .menu-icon:hover { border-color:rgba(201,168,106,0.45); color:var(--gold); }
        .user-avatar {
          width:38px; height:38px; border-radius:50%;
          border:1px solid var(--border); background:rgba(237,229,212,0.06);
          overflow:hidden; display:flex; align-items:center; justify-content:center;
          font-size:13px; font-weight:700; color:var(--cream);
        }
        .user-avatar img { width:100%; height:100%; object-fit:cover; }
        .user-dropdown {
          position:absolute; top:50px; right:0; width:210px;
          background:rgba(20,18,12,0.98); border:1px solid var(--border);
          border-radius:16px; overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,0.52);
        }
        .user-dropdown-email {
          padding:12px 14px; border-bottom:1px solid var(--border);
          font-size:10px; color:var(--dim);
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .user-dropdown a,
        .user-dropdown button {
          display:block; width:100%; padding:12px 14px;
          font-size:13px; color:var(--cream); text-align:left;
          background:none; transition:background .15s;
        }
        .user-dropdown a:hover,
        .user-dropdown button:hover { background:rgba(237,229,212,0.06); }
        .user-dropdown button { color:#E08080; }
        .mobile-menu {
          position:fixed; top:84px; left:16px; right:16px; z-index:199;
          background:rgba(18,16,10,0.98); border:1px solid var(--border);
          border-radius:18px; padding:14px;
          backdrop-filter:blur(20px); box-shadow:0 20px 60px rgba(0,0,0,0.45);
        }
        .mobile-menu a {
          display:block; padding:13px 14px; border-radius:12px;
          font-size:13px; font-weight:700; letter-spacing:0.12em;
          text-transform:uppercase; color:var(--cream);
        }
        .mobile-menu a:hover { background:rgba(237,229,212,0.06); }

        /* ════════════════════════════════════════
           HERO
           Two image slots stacked, crossfaded via opacity.
           .slot-0 and .slot-1 are always rendered; the active
           one gets opacity:1, the inactive gets opacity:0.
        ════════════════════════════════════════ */
        .hero {
          position:relative; height:100vh; min-height:760px;
          display:flex; align-items:center; overflow:hidden;
        }
        .hero-bg { position:absolute; inset:-5%; width:110%; height:110%; }

        /* Both slots are stacked on top of each other */
        .hero-slot {
          position:absolute; inset:0;
          transition:opacity 1.2s ease;
        }
        .hero-slot img {
          width:100%; height:100%;
          object-fit:cover; object-position:center 34%;
          filter:brightness(0.58) contrast(1.08) saturate(0.95);
        }
        /* Active slot = fully visible; inactive = transparent */
        .hero-slot.active  { opacity:1; z-index:2; }
        .hero-slot.inactive{ opacity:0; z-index:1; }

        .hero-bg::after {
          content:""; position:absolute; inset:0; z-index:3;
          background:
            radial-gradient(circle at 72% 42%, rgba(201,168,106,0.12), transparent 28%),
            linear-gradient(to right,  rgba(12,11,9,0.96) 0%, rgba(12,11,9,0.74) 36%, rgba(12,11,9,0.2) 72%, rgba(12,11,9,0.42) 100%),
            linear-gradient(to bottom, rgba(12,11,9,0.2) 0%, transparent 32%, rgba(12,11,9,0.88) 100%);
        }
        .hero-content {
          position:relative; z-index:10;
          width:100%; max-width:1440px; margin:0 auto;
          padding:0 clamp(20px,4vw,60px); padding-top:72px;
          display:grid;
          grid-template-columns: minmax(0,1.15fr) minmax(340px,0.85fr);
          gap:clamp(32px,6vw,90px);
          align-items:end;
        }

        /* Hero text — fades up on load */
        .hero-copy {
          max-width:780px; padding-bottom:clamp(40px,8vh,90px);
          opacity:0; transform:translateY(26px);
          transition:opacity .9s, transform .9s;
        }
        .hero-copy.visible { opacity:1; transform:translateY(0); }

        /* Hero featured-routes panel */
        .hero-route-panel {
          position:relative; margin-bottom:clamp(40px,8vh,90px);
          padding:26px; border-radius:24px;
          background: linear-gradient(135deg, rgba(237,229,212,0.1), rgba(237,229,212,0.03)), rgba(12,11,9,0.42);
          border:1px solid rgba(237,229,212,0.14); backdrop-filter:blur(28px);
          box-shadow:0 34px 100px rgba(0,0,0,0.48); overflow:hidden;
          opacity:0; transform:translateY(26px);
          transition:opacity .9s .16s, transform .9s .16s;
        }
        .hero-route-panel.visible { opacity:1; transform:translateY(0); }

        .hero-eyebrow, .section-eyebrow {
          font-size:9px; font-weight:800; letter-spacing:0.38em;
          text-transform:uppercase; color:var(--gold); margin-bottom:24px;
        }
        .hero-h1 {
          font-family:var(--serif);
          font-size:clamp(64px,9vw,132px); font-weight:300;
          line-height:0.82; max-width:820px; margin-bottom:30px;
          letter-spacing:-0.055em; color:var(--cream);
          text-shadow:0 30px 90px rgba(0,0,0,0.75);
        }
        .hero-sub {
          max-width:500px; font-size:15px; font-weight:300;
          line-height:1.85; color:rgba(237,229,212,0.68); margin-bottom:36px;
        }
        .hero-actions { display:flex; align-items:center; gap:20px; flex-wrap:wrap; }

        /* ── Shared button ── */
        .btn-gold {
          display:inline-flex; align-items:center; justify-content:center; gap:10px;
          padding:15px 28px; background:var(--gold); color:var(--bg);
          border:1px solid var(--gold); border-radius:999px;
          font-size:10px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase;
          transition:all .25s;
          box-shadow:0 14px 40px rgba(201,168,106,0.22), inset 0 1px 0 rgba(255,255,255,0.3);
        }
        .btn-gold:hover { background:#d8b978; border-color:#d8b978; transform:translateY(-2px); }

        .watch-btn {
          display:inline-flex; align-items:center; gap:12px;
          font-size:10px; font-weight:700; letter-spacing:0.2em;
          text-transform:uppercase; color:var(--muted); background:none; transition:color .2s;
        }
        .watch-btn:hover { color:var(--cream); }
        .watch-circle {
          width:38px; height:38px; border-radius:50%;
          border:1px solid rgba(237,229,212,0.28);
          display:flex; align-items:center; justify-content:center;
          font-size:12px; transition:border-color .2s, background .2s;
        }
        .watch-btn:hover .watch-circle { border-color:var(--gold); background:rgba(201,168,106,0.1); }

        .hero-stats { display:flex; gap:clamp(26px,4vw,56px); margin-top:52px; }
        .hero-stats div { display:flex; flex-direction:column; gap:6px; }
        .hero-stats strong { font-family:var(--serif); font-size:clamp(28px,3vw,42px); font-weight:300; color:var(--cream); line-height:1; }
        .hero-stats span   { font-size:9px; font-weight:800; letter-spacing:0.24em; text-transform:uppercase; color:rgba(237,229,212,0.42); }

        /* Featured routes list inside hero panel */
        .featured-label { position:relative; z-index:2; font-size:9px; font-weight:800; letter-spacing:0.32em; text-transform:uppercase; color:rgba(237,229,212,0.42); margin-bottom:18px; }
        .featured-list  { position:relative; z-index:2; display:flex; flex-direction:column; gap:8px; }
        .featured-item {
          display:grid; grid-template-columns:36px 52px 1fr auto; gap:14px;
          align-items:center; padding:14px 16px; border-radius:16px;
          color:var(--cream); background:rgba(237,229,212,0.035);
          border:1px solid transparent;
          transition:background .25s, border-color .25s, transform .25s;
        }
        .featured-item:hover,
        .featured-item.active {
          background:rgba(237,229,212,0.085);
          border-color:rgba(201,168,106,0.28);
          transform:translateX(-4px);
        }
        .featured-num   { font-family:var(--serif); font-size:24px; color:rgba(201,168,106,0.8); line-height:1; }
        .featured-thumb { width:52px; height:38px; border-radius:8px; overflow:hidden; }
        .featured-thumb img { width:100%; height:100%; object-fit:cover; }
        .featured-title   { font-size:12px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; margin-bottom:4px; }
        .featured-country { font-size:9px; letter-spacing:0.18em; text-transform:uppercase; color:rgba(237,229,212,0.42); }
        .featured-arrow { color:rgba(237,229,212,0.5); transition:transform .25s, color .25s; }
        .featured-item:hover .featured-arrow,
        .featured-item.active .featured-arrow { transform:translateX(4px); color:var(--gold); }
        .view-all-link {
          position:relative; z-index:2; display:inline-flex; margin-top:18px;
          font-size:10px; font-weight:800; letter-spacing:0.2em;
          text-transform:uppercase; color:rgba(237,229,212,0.5); transition:color .2s;
        }
        .view-all-link:hover { color:var(--cream); }

        /* ════════════════════════════════════════
           SHARED SECTION UTILITIES
        ════════════════════════════════════════ */
        .section   { padding:clamp(70px,8vw,110px) clamp(20px,4vw,60px); }
        .container { max-width:1380px; margin:0 auto; }
        .section-top {
          display:flex; align-items:flex-end; justify-content:space-between;
          gap:24px; margin-bottom:38px;
        }
        .section-h2 {
          font-family:var(--serif); font-size:clamp(36px,4.8vw,64px);
          font-weight:300; line-height:0.95; letter-spacing:-0.04em; color:var(--cream);
        }
        .view-all-btn {
          display:flex; align-items:center; gap:10px;
          font-size:10px; font-weight:800; letter-spacing:0.18em;
          text-transform:uppercase; color:var(--muted); white-space:nowrap; transition:color .2s;
        }
        .view-all-btn:hover { color:var(--cream); }

        /* ════════════════════════════════════════
           POPULAR CAROUSEL
        ════════════════════════════════════════ */
        .popular-section {
          padding:clamp(76px,8vw,116px) clamp(20px,4vw,60px);
          background:
            radial-gradient(circle at 72% 22%, rgba(201,168,106,0.13), transparent 28rem),
            var(--bg);
          border-top:1px solid var(--border); border-bottom:1px solid var(--border);
        }
        .popular-header {
          display:flex; align-items:flex-end; justify-content:space-between;
          gap:24px; margin-bottom:40px;
        }
        .popular-card-wrap { position:relative; }
        .popular-card {
          position:relative; display:block;
          height:clamp(520px,58vw,680px); overflow:hidden;
          border-radius:34px; border:1px solid rgba(237,229,212,0.14);
          background:var(--bg3); box-shadow:0 36px 110px rgba(0,0,0,0.52);
          isolation:isolate;
        }
        .popular-card img {
          width:100%; height:100%; object-fit:cover;
          filter:brightness(0.82) contrast(1.06) saturate(0.98);
          transition:transform 1s ease, filter 1s ease;
        }
        .popular-card:hover img { transform:scale(1.04); filter:brightness(0.94) contrast(1.1) saturate(1.08); }
        .popular-card-overlay {
          position:absolute; inset:0; z-index:1;
          background:
            linear-gradient(to top,  rgba(0,0,0,0.9), rgba(0,0,0,0.28) 48%, rgba(0,0,0,0.18)),
            linear-gradient(to right, rgba(0,0,0,0.5), transparent 58%);
        }
        .popular-card-counter {
          position:absolute; top:28px; left:32px; z-index:2;
          font-family:var(--serif); font-size:clamp(26px,3vw,42px);
          font-weight:300; letter-spacing:-0.03em; color:rgba(255,255,255,0.76);
        }
        .popular-card-type {
          position:absolute; top:34px; right:34px; z-index:2;
          color:rgba(255,255,255,0.66); font-size:9px; font-weight:800;
          letter-spacing:0.24em; text-transform:uppercase;
        }
        .popular-card-content {
          position:absolute; z-index:2;
          left:clamp(28px,5vw,70px); right:clamp(28px,5vw,70px); bottom:clamp(34px,6vw,74px);
          max-width:min(1120px, calc(100% - 80px));
        }
        .popular-card-content p    { margin-bottom:12px; color:var(--gold); font-size:10px; font-weight:800; letter-spacing:0.24em; text-transform:uppercase; }
        .popular-card-content h3   { margin-bottom:22px; color:#fff; font-family:var(--serif); font-size:clamp(48px,6.2vw,92px); font-weight:300; line-height:0.9; letter-spacing:-0.055em; text-shadow:0 20px 60px rgba(0,0,0,0.65); }
        .popular-card-content span { display:block; max-width:500px; color:rgba(255,255,255,0.68); font-size:14px; font-weight:300; line-height:1.8; }
        .popular-card-meta { display:flex; flex-wrap:wrap; gap:10px; margin-top:26px; }
        .popular-card-meta small {
          padding:9px 13px; border-radius:999px;
          border:1px solid rgba(255,255,255,0.18); background:rgba(255,255,255,0.08);
          backdrop-filter:blur(12px); color:rgba(255,255,255,0.78);
          font-size:9px; font-weight:800; letter-spacing:0.13em; text-transform:uppercase;
        }
        .carousel-arrow {
          position:absolute; top:50%; z-index:20; transform:translateY(-50%);
          width:48px; height:48px; display:grid; place-items:center;
          border:1px solid rgba(255,255,255,0.22); border-radius:999px;
          background:rgba(0,0,0,0.35); color:#fff; backdrop-filter:blur(14px);
          transition:all .2s;
        }
        .carousel-arrow:hover { background:var(--gold); border-color:var(--gold); color:var(--bg); }
        .carousel-left  { left:24px; }
        .carousel-right { right:24px; }
        .popular-dots { display:flex; justify-content:center; gap:16px; margin-top:28px; }
        .popular-dots button {
          position:relative; min-width:42px; height:36px;
          color:rgba(237,229,212,0.36); background:transparent;
          font-size:10px; font-weight:800; letter-spacing:0.18em; transition:color .2s;
        }
        .popular-dots button::after {
          content:""; position:absolute; left:8px; right:8px; bottom:4px;
          height:2px; border-radius:999px; background:transparent; transition:background .2s;
        }
        .popular-dots button.active { color:var(--cream); }
        .popular-dots button.active::after { background:var(--gold); }

        /* ════════════════════════════════════════
           BUILDER
        ════════════════════════════════════════ */
        .builder-section {
          background:
            radial-gradient(circle at 18% 18%, rgba(201,168,106,0.08), transparent 24%),
            linear-gradient(to bottom, var(--bg), var(--bg2));
          border-top:1px solid var(--border); border-bottom:1px solid var(--border);
        }
        .builder-panel {
          display:grid; grid-template-columns:0.95fr 1.05fr;
          max-width:1120px; margin:0 auto;
          border-radius:30px; border:1px solid var(--border);
          background:linear-gradient(135deg, rgba(237,229,212,0.055), rgba(237,229,212,0.018));
          overflow:hidden; box-shadow:0 32px 90px rgba(0,0,0,0.34);
        }
        .builder-image {
          position:relative; min-height:560px; overflow:hidden;
          border-right:1px solid var(--border);
        }
        .builder-image img {
          width:100%; height:100%; object-fit:cover;
          filter:brightness(0.72) contrast(1.05) saturate(0.9); transform:scale(1.02);
        }
        .builder-image-overlay {
          position:absolute; inset:0;
          background:
            linear-gradient(to bottom, rgba(12,11,9,0.1), rgba(12,11,9,0.52)),
            radial-gradient(circle at 35% 30%, rgba(237,229,212,0.18), transparent 34%);
        }
        .builder-content { padding:clamp(38px,5vw,58px); display:flex; flex-direction:column; justify-content:center; }
        .builder-intro   { margin-top:18px; max-width:470px; font-size:15px; line-height:1.75; color:rgba(237,229,212,0.62); }

        /* Timeline */
        .builder-timeline {
          position:relative; margin:40px 0 36px; display:grid; gap:0;
        }
        .builder-timeline::before {
          content:""; position:absolute; left:26px; top:58px; bottom:58px;
          width:1px; background:linear-gradient(to bottom, rgba(201,168,106,0.72), rgba(201,168,106,0.2));
          z-index:0;
        }
        .builder-timeline-item {
          position:relative; z-index:1;
          display:grid; grid-template-columns:52px 52px 1fr;
          gap:22px; align-items:center; min-height:110px; padding:18px 0;
        }
        .builder-timeline-item:not(:last-child)::after {
          content:""; position:absolute; left:132px; right:0; bottom:0;
          height:1px; background:rgba(237,229,212,0.1);
        }
        .builder-step-num {
          position:relative; z-index:3;
          width:52px; height:52px; display:grid; place-items:center;
          border-radius:50%; border:1px solid rgba(201,168,106,0.62); background:#15130d;
          color:var(--cream); font-size:19px; font-weight:700; line-height:1;
          box-shadow:0 0 22px rgba(201,168,106,0.08);
        }
        .builder-step-icon { width:52px; height:52px; display:grid; place-items:center; color:var(--gold); }
        .builder-step-icon svg { width:32px; height:32px; stroke:currentColor; fill:none; stroke-width:1.45; stroke-linecap:round; stroke-linejoin:round; }
        .builder-step-copy h3 { font-family:var(--serif); font-size:clamp(26px,2.4vw,34px); font-weight:300; line-height:1; letter-spacing:-0.025em; color:var(--cream); margin-bottom:8px; }
        .builder-step-copy p  { max-width:340px; color:rgba(237,229,212,0.52); font-size:13px; line-height:1.55; }
        .builder-cta { width:min(340px,100%); justify-content:center; margin-left:calc(52px + 74px); }

        /* ════════════════════════════════════════
           TESTIMONIAL
        ════════════════════════════════════════ */
        .testimonial-section { background:var(--bg2); border-top:1px solid var(--border); border-bottom:1px solid var(--border); }
        .testimonial-inner {
          max-width:1380px; margin:0 auto; padding:70px clamp(20px,4vw,60px);
          display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:40px;
        }
        .quote-mark     { font-family:var(--serif); font-size:90px; color:var(--gold); opacity:0.5; line-height:0.6; }
        .testimonial-body { text-align:center; }
        .testimonial-text {
          font-family:var(--serif); font-size:clamp(22px,2.8vw,34px);
          font-weight:300; font-style:italic; color:var(--cream); line-height:1.42; margin-bottom:28px;
        }
        .testimonial-dots { display:flex; justify-content:center; gap:4px; }
        /* Dots: 44px hit area wrapper, actual dot via ::after */
        .testimonial-dot {
          min-width:44px; min-height:44px;
          display:flex; align-items:center; justify-content:center;
          background:transparent; border:none;
        }
        .testimonial-dot::after {
          content:""; display:block; width:8px; height:8px; border-radius:50%;
          background:var(--border); border:1px solid var(--dim); transition:all .3s;
        }
        .testimonial-dot.active::after { width:24px; background:var(--gold); border-color:var(--gold); border-radius:999px; }
        .testimonial-author { display:flex; flex-direction:column; align-items:center; gap:8px; min-width:170px; }
        .author-avatar {
          width:64px; height:64px; border-radius:50%;
          border:2px solid var(--gold); background:var(--bg3);
          display:flex; align-items:center; justify-content:center; font-size:22px; color:var(--dim);
        }
        .author-name  { font-size:11px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:var(--cream); text-align:center; }
        .author-role,
        .author-since { font-size:9px; letter-spacing:0.18em; text-transform:uppercase; color:var(--dim); text-align:center; }

        /* ════════════════════════════════════════
           FEATURES
        ════════════════════════════════════════ */
        .features-section {
          background:
            radial-gradient(circle at 80% 20%, rgba(201,168,106,0.08), transparent 26%),
            var(--bg);
        }
        .features-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-top:48px; }
        .feature-card {
          padding:30px 24px 34px;
          background:rgba(237,229,212,0.035); border:1px solid var(--border); border-radius:22px;
          transition:border-color .3s, transform .3s, background .3s;
        }
        .feature-card:hover { border-color:rgba(201,168,106,0.32); transform:translateY(-4px); background:rgba(237,229,212,0.055); }
        .feature-icon  { font-size:25px; color:var(--gold); margin-bottom:20px; }
        .feature-title { font-size:10px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--cream); margin-bottom:12px; }
        .feature-text  { font-size:13px; color:var(--dim); line-height:1.75; font-weight:300; }

        /* ════════════════════════════════════════
           FOOTER
        ════════════════════════════════════════ */
        .footer { background:var(--bg); border-top:1px solid var(--border); padding:60px clamp(20px,4vw,60px) 30px; }
        .footer-inner { max-width:1380px; margin:0 auto; }
        .footer-top {
          display:grid; grid-template-columns:1.4fr 1fr 1fr 1fr 1.5fr; gap:40px;
          padding-bottom:44px; border-bottom:1px solid var(--border); margin-bottom:24px;
        }
        .footer-brand   { font-size:15px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase; color:var(--cream); line-height:1.1; margin-bottom:14px; }
        .footer-tagline { font-size:12px; color:var(--dim); line-height:1.7; font-weight:300; margin-bottom:20px; max-width:220px; }
        .footer-socials { display:flex; gap:10px; }
        .footer-social  {
          width:34px; height:34px; border-radius:50%;
          border:1px solid var(--border); display:flex; align-items:center; justify-content:center;
          font-size:13px; color:var(--dim); transition:all .2s;
        }
        .footer-social:hover { border-color:var(--gold); color:var(--gold); }
        .footer-col-title,
        .footer-nl-title { font-size:9px; font-weight:800; letter-spacing:0.28em; text-transform:uppercase; color:var(--dim); margin-bottom:18px; }
        .footer-col a    { display:block; font-size:13px; color:rgba(237,229,212,0.4); margin-bottom:11px; font-weight:300; transition:color .2s; }
        .footer-col a:hover { color:var(--cream); }
        .footer-nl-sub  { font-size:12px; color:var(--dim); line-height:1.6; margin-bottom:16px; font-weight:300; }
        .footer-nl-form { display:flex; }
        .footer-nl-input {
          flex:1; padding:12px 16px; border:1px solid var(--border); border-right:none;
          border-radius:999px 0 0 999px; background:rgba(237,229,212,0.04);
          color:var(--cream); font-size:13px; outline:none;
        }
        .footer-nl-input::placeholder { color:var(--dim); }
        .footer-nl-btn  {
          width:48px; background:var(--gold); border:1px solid var(--gold);
          border-radius:0 999px 999px 0; color:var(--bg); font-size:16px; font-weight:800; transition:background .2s;
        }
        .footer-nl-btn:hover { background:#d8b978; }
        .footer-bottom  { display:flex; justify-content:space-between; align-items:center; gap:16px; }
        .footer-copy    { font-size:10px; color:var(--dim); letter-spacing:0.1em; text-transform:uppercase; }
        .footer-legal   { display:flex; gap:24px; }
        .footer-legal a { font-size:10px; color:var(--dim); letter-spacing:0.1em; text-transform:uppercase; transition:color .2s; }
        .footer-legal a:hover { color:var(--cream); }

        /* ════════════════════════════════════════
           RESPONSIVE
        ════════════════════════════════════════ */
        @media (max-width:1100px) {
          .hero-content    { grid-template-columns:1fr; align-items:center; }
          .hero-copy       { padding-bottom:0; padding-top:90px; }
          .hero-route-panel{ margin-bottom:40px; }
          .builder-panel   { max-width:820px; grid-template-columns:1fr; }
          .builder-image   { min-height:240px; }
          .builder-content { padding:38px 34px; }
          .features-grid   { grid-template-columns:repeat(2,1fr); }
          .footer-top      { grid-template-columns:1fr 1fr; }
          .testimonial-inner { grid-template-columns:auto 1fr; }
          .testimonial-author{ display:none; }
        }
        @media (max-width:760px) {
          .nav-links       { display:none; }
          .hero            { min-height:760px; }
          .hero-content    { padding-top:120px; }
          .hero-h1         { font-size:clamp(54px,16vw,78px); }
          .hero-sub        { font-size:14px; max-width:340px; }
          .hero-stats      { gap:22px; margin-top:36px; }
          .hero-stats strong{ font-size:28px; }
          .hero-route-panel{ padding:18px; border-radius:18px; }
          .featured-item   { grid-template-columns:28px 44px 1fr auto; gap:10px; padding:12px; }
          .featured-num    { font-size:18px; }
          .featured-thumb  { width:44px; height:34px; }
          .popular-header  { align-items:flex-start; flex-direction:column; }
          .popular-card    { height:520px; border-radius:26px; }
          .carousel-arrow  { display:none; }
          .popular-card-type{ display:none; }
          .popular-card-content h3 { font-size:clamp(42px,12vw,66px); line-height:0.94; }
          .builder-content { padding:30px 22px; }
          .builder-timeline::before { left:22px; top:50px; bottom:50px; }
          .builder-timeline-item { grid-template-columns:44px 40px 1fr; gap:14px; min-height:96px; }
          .builder-timeline-item:not(:last-child)::after { left:98px; }
          .builder-step-num { width:44px; height:44px; font-size:17px; }
          .builder-step-icon{ width:40px; height:40px; }
          .builder-step-icon svg { width:27px; height:27px; }
          .builder-cta     { width:100%; margin-left:0; }
          .testimonial-inner { grid-template-columns:1fr; text-align:center; gap:20px; }
          .quote-mark      { display:none; }
          .features-grid   { grid-template-columns:1fr; }
          .footer-top      { grid-template-columns:1fr; }
          .footer-bottom   { flex-direction:column; align-items:flex-start; }
          .footer-legal    { flex-wrap:wrap; }
        }
      `}</style>

      <main className="page">

        {/* ── NAV ─────────────────────────────────────────────── */}
        <nav className={`nav ${navScrolled ? "scrolled" : ""}`}>
          <Link href="/" className="nav-logo">
            <span>SCENIC</span>
            <span>ROUTES</span>
          </Link>

          <div className="nav-links">
            {[["Routes","/explore"],["Destinations","/explore"],["Experiences","#experiences"],["Journal","#"],["About","/about"]].map(([label,href])=>(
              <Link key={label} href={href} className="nav-link">{label}</Link>
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
                    <Link href="/profile"  onClick={()=>setShowUserMenu(false)}>Profile</Link>
                    <Link href="/my-trips" onClick={()=>setShowUserMenu(false)}>My Trips</Link>
                    <button onClick={async()=>{ await supabase.auth.signOut(); setUser(null); setShowUserMenu(false); }}>
                      Sign Out
                    </button>
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
            {[["Routes","/explore"],["Destinations","/explore"],["Experiences","#experiences"],["About","/about"]].map(([label,href])=>(
              <Link key={label} href={href} onClick={()=>setShowMobileMenu(false)}>{label}</Link>
            ))}
          </div>
        )}

        {/* ── HERO ────────────────────────────────────────────── */}
        {/*                                                         */}
        {/* Two image slots are stacked. The active slot has         */}
        {/* opacity:1, the inactive has opacity:0. When we cycle,    */}
        {/* we write the new src into the inactive slot THEN flip    */}
        {/* activeSlot — the CSS transition does the smooth crossfade*/}
        {/*                                                         */}
        <section className="hero">
          <div className="hero-bg">
            {/* Slot 0 */}
            <div className={`hero-slot ${activeSlot === 0 ? "active" : "inactive"}`}>
              <img src={slotSrcs[0] || "/iceland.jpg"} alt=""
                onError={e=>{ e.currentTarget.src="/iceland.jpg"; }}/>
            </div>
            {/* Slot 1 */}
            <div className={`hero-slot ${activeSlot === 1 ? "active" : "inactive"}`}>
              <img src={slotSrcs[1] || "/iceland.jpg"} alt=""
                onError={e=>{ e.currentTarget.src="/iceland.jpg"; }}/>
            </div>
          </div>

          <div className="hero-content">

            {/* Left — headline + CTA */}
            <div className={`hero-copy ${heroVisible ? "visible" : ""}`}>
              <p className="hero-eyebrow">Curated cinematic road trips</p>
              <h1 className="hero-h1">Roads worth<br/>disappearing into.</h1>
              <p className="hero-sub">
                Discover breathtaking drives, hidden viewpoints and unforgettable routes —
                crafted for people who travel for the feeling.
              </p>
              <div className="hero-actions">
                <Link href="/explore" className="btn-gold">Find Your Route →</Link>
                <button className="watch-btn">
                  <div className="watch-circle">▶</div>
                  Watch Film
                </button>
              </div>
              <div className="hero-stats">
                <div><strong>150+</strong><span>Routes</span></div>
                <div><strong>40+</strong><span>Countries</span></div>
                <div><strong>100K+</strong><span>Travelers</span></div>
              </div>
            </div>

            {/* Right — featured routes panel */}
            <div className={`hero-route-panel ${heroVisible ? "visible" : ""}`}>
              <p className="featured-label">Featured Routes</p>
              <div className="featured-list">
                {displayRoutes.slice(0,3).map((route,i)=>(
                  <Link href={`/routedetail/${route.id}`} key={route.id}
                    className={`featured-item ${activeIdx===i ? "active" : ""}`}
                    onMouseEnter={()=>setActiveIdx(i)}>
                    <span className="featured-num">0{i+1}</span>
                    <div className="featured-thumb">
                      <img src={route.image_url||"/iceland.jpg"} alt={route.title}
                        onError={e=>{ e.currentTarget.src="/iceland.jpg"; }}/>
                    </div>
                    <div>
                      <div className="featured-title">{route.title}</div>
                      <div className="featured-country">{route.country}</div>
                    </div>
                    <span className="featured-arrow">→</span>
                  </Link>
                ))}
              </div>
              <Link href="/explore" className="view-all-link">Explore all routes →</Link>
            </div>

          </div>
        </section>

        {/* ── POPULAR CAROUSEL ────────────────────────────────── */}
        <PopularCarousel routes={displayRoutes} />

        {/* ── BUILDER ─────────────────────────────────────────── */}
        <section className="section builder-section" id="experiences">
          <div className="container">
            <div className="builder-panel">

              {/* Left — route image (changes with builder step) */}
              <div className="builder-image">
                <img
                  src={displayRoutes[builderStep % displayRoutes.length]?.image_url || "/iceland.jpg"}
                  alt="Route planning"
                  onError={e=>{ e.currentTarget.src="/iceland.jpg"; }}
                />
                <div className="builder-image-overlay"/>
              </div>

              {/* Right — 3-step timeline */}
              <div className="builder-content">
                <p className="section-eyebrow">Plan your escape</p>
                <h2 className="section-h2">Build your route<br/>in 3 simple steps.</h2>
                <p className="builder-intro">
                  Craft a journey that fits your time, your interests, and the kind of adventure you're chasing.
                </p>

                <div className="builder-timeline">
                  <div className="builder-timeline-item">
                    <div className="builder-step-num">1</div>
                    <div className="builder-step-icon" aria-hidden="true">
                      <svg viewBox="0 0 48 48"><path d="M5 38L17 18L26 32L32 23L43 38H5Z"/></svg>
                    </div>
                    <div className="builder-step-copy">
                      <h3>Choose your terrain</h3>
                      <p>Pick the landscapes you love to explore.</p>
                    </div>
                  </div>

                  <div className="builder-timeline-item">
                    <div className="builder-step-num">2</div>
                    <div className="builder-step-icon" aria-hidden="true">
                      <svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="17"/><path d="M24 13V25L32 30"/></svg>
                    </div>
                    <div className="builder-step-copy">
                      <h3>Set your time</h3>
                      <p>Tell us how long you have for your escape.</p>
                    </div>
                  </div>

                  <div className="builder-timeline-item">
                    <div className="builder-step-num">3</div>
                    <div className="builder-step-icon" aria-hidden="true">
                      <svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="17"/><path d="M7 24H41"/><path d="M24 7C29 12 31 18 31 24C31 30 29 36 24 41"/><path d="M24 7C19 12 17 18 17 24C17 30 19 36 24 41"/></svg>
                    </div>
                    <div className="builder-step-copy">
                      <h3>Pick your country</h3>
                      <p>Choose where the journey begins.</p>
                    </div>
                  </div>
                </div>

                <Link href={builderHref} className="btn-gold builder-cta">
                  Build My Route →
                </Link>
              </div>

            </div>
          </div>
        </section>

        {/* ── TESTIMONIAL ─────────────────────────────────────── */}
        <section className="testimonial-section">
          <div className="testimonial-inner">
            <div className="quote-mark">"</div>

            <div className="testimonial-body">
              <p className="testimonial-text">{TESTIMONIALS[testimonialIdx].quote}</p>
              <div className="testimonial-dots">
                {TESTIMONIALS.map((_,i)=>(
                  <button key={i}
                    className={`testimonial-dot ${i===testimonialIdx ? "active" : ""}`}
                    onClick={()=>setTestimonialIdx(i)}
                    aria-label={`Testimonial ${i+1}`}
                  />
                ))}
              </div>
            </div>

            <div className="testimonial-author">
              <div className="author-avatar"><span>◎</span></div>
              <div className="author-name"> {TESTIMONIALS[testimonialIdx].name}</div>
              <div className="author-role"> {TESTIMONIALS[testimonialIdx].role}</div>
              <div className="author-since">{TESTIMONIALS[testimonialIdx].since}</div>
            </div>
          </div>
        </section>

        {/* ── FEATURES ────────────────────────────────────────── */}
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

        {/* ── FOOTER ──────────────────────────────────────────── */}
        <footer className="footer">
          <div className="footer-inner">
            <div className="footer-top">
              <div>
                <div className="footer-brand">SCENIC<br/>ROUTES</div>
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
                <p className="footer-nl-title">Stay Inspired</p>
                <p className="footer-nl-sub">Subscribe for exclusive routes, travel stories, and offers.</p>
                <form className="footer-nl-form" onSubmit={handleNewsletter}>
                  <input type="email" required className="footer-nl-input"
                    value={email} onChange={e=>setEmail(e.target.value)}
                    placeholder={emailSent ? "Subscribed!" : "Enter your email"}/>
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