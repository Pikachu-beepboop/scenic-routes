"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";
import dynamic from "next/dynamic";
import AuthModal from "./AuthModal";
import { ThemeSwitch } from "./components/ThemeSwitch";
import { useTheme } from "next-themes";
import { useLanguage } from "./LanguageContext";
import {
  User as UserIcon, Map as MapIcon, Compass, LogOut,
  ArrowLeft, ArrowRight, Wind, BookOpen, Globe,
  Menu, X, ChevronDown, ChevronRight, ShieldCheck,
} from "lucide-react";

const WorldMap = dynamic(() => import("./components/WorldMap"), {
  ssr: false,
});

const FALLBACK_ROUTES = [
  {
    id: "1",
    title: "Amalfi Coast Road",
    country: "Italy",
    distance_km: 50,
    image_url: "/Amalfi coast road.jpg",
    duration: "Half day (< 4h)",
    type: "Coastal Highway",
    terrain: "Coastal",
    description:
      "A ribbon of coastal beauty — cliffside villages, endless sea, and curves that stay with you.",
  },
  {
    id: "2",
    title: "Pacific Coast Highway",
    country: "USA",
    distance_km: 650,
    image_url: "/Pacific Route Highway.jpg",
    duration: "Multi-day journey",
    type: "Coastal Highway",
    terrain: "Coastal",
    description:
      "One of the world's great coastal drives, tracing the California shoreline.",
  },
  {
    id: "3",
    title: "Trollstigen",
    country: "Norway",
    distance_km: 27,
    image_url: "/Trollstigen.jpg",
    duration: "Half day (< 4h)",
    type: "Scenic Pass",
    terrain: "Mountains",
    description:
      "Norway's most dramatic mountain road with 11 legendary hairpin bends.",
  },
  {
    id: "4",
    title: "Stelvio Pass",
    country: "Italy",
    distance_km: 75,
    image_url: "/Stellvio Pass.jpg",
    duration: "Half day (< 4h)",
    type: "Alpine Pass",
    terrain: "Mountains",
    description: "The highest paved mountain pass in the Eastern Alps.",
  },
  {
    id: "5",
    title: "Garden Route",
    country: "South Africa",
    distance_km: 300,
    image_url: "/Garden Route.jpg",
    duration: "Weekend trip",
    type: "Scenic Route",
    terrain: "Coastal",
    description:
      "South Africa's lush coastal corridor of forests, lagoons and beaches.",
  },
  {
    id: "6",
    title: "North Coast 500",
    country: "Scotland",
    distance_km: 830,
    image_url: "/North Coast 500.jpg",
    duration: "Multi-day journey",
    type: "Circular Route",
    terrain: "Mountains",
    description:
      "Scotland's iconic 830 km loop through remote Highlands and dramatic sea cliffs.",
  },
];

const TESTIMONIALS = [
  { quoteKey: "home.testimonial.quote1" as const, name: "Sarah G.", roleKey: "home.testimonial.role1" as const },
  { quoteKey: "home.testimonial.quote2" as const, name: "Marcus K.", roleKey: "home.testimonial.role2" as const },
  { quoteKey: "home.testimonial.quote3" as const, name: "Alex M.", roleKey: "home.testimonial.role3" as const },
];

const FEATURES = [
  { icon: Compass, titleKey: "home.features.curated.title" as const, textKey: "home.features.curated.text" as const },
  { icon: MapIcon, titleKey: "home.features.detail.title" as const, textKey: "home.features.detail.text" as const },
  { icon: Wind, titleKey: "home.features.freedom.title" as const, textKey: "home.features.freedom.text" as const },
  { icon: BookOpen, titleKey: "home.features.stories.title" as const, textKey: "home.features.stories.text" as const },
];

// Admin_Page
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

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
      { key: "footer.link.faq" as const, href: "#", protected: false },
      { key: "footer.link.contact" as const, href: "#", protected: false },
      { key: "footer.link.reportProblem" as const, href: "#", protected: false },
      { key: "footer.link.reportRouteIssue" as const, href: "#", protected: false },
    ],
  },
  {
    id: "legal",
    headingKey: "footer.col.legal" as const,
    links: [
      { key: "footer.link.termsOfUse" as const, href: "#", protected: false },
      { key: "footer.link.privacyPolicy" as const, href: "#", protected: false },
      { key: "footer.link.imprint" as const, href: "#", protected: false },
    ],
  },
];

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
  // NEU (Trilingual): title/description gibt es in Supabase jetzt zusätzlich als
  // _en/_de/_ru-Spalten. Die alten Felder oben (title, description) bleiben als
  // Fallback erhalten, solange nicht jede Route alle Sprachen gepflegt hat, und die
  // FALLBACK_ROUTES oben (ohne _en/_de/_ru) funktionieren dadurch unverändert weiter.
  title_en?: string;
  title_de?: string;
  title_ru?: string;
  description_en?: string;
  description_de?: string;
  description_ru?: string;
  [key: string]: unknown;
};

// NEU (Trilingual): liest ein übersetzbares Feld (title, description) sprachabhängig
// aus der Route. Fallback-Kette: aktuelle Sprache -> Englisch -> Deutsch -> alte
// einsprachige Spalte (Übergangszeit / Fallback-Routen ohne _en/_de/_ru).
function localizedRouteText(route: Route | null | undefined, field: "title" | "description", lang: string): string {
  if (!route) return "";
  const specific = route[`${field}_${lang}`];
  const en = route[`${field}_en`];
  const de = route[`${field}_de`];
  const legacy = route[field];
  const value = specific || en || de || legacy;
  return typeof value === "string" ? value : "";
}

function PopularCarousel({ routes }: { routes: Route[] }) {
  const { t, lang } = useLanguage();
  const [idx, setIdx] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"next" | "prev">("next");

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchDeltaX, setTouchDeltaX] = useState(0);

  const items = useMemo(() => routes.slice(0, 10), [routes]);
  const route = items[idx] ?? items[0];

  // NEU (Trilingual): sprachabhängiger Titel/Beschreibung für die aktuell angezeigte
  // Karte — wechselt automatisch mit, sobald die Sprache im Footer/Navbar geändert wird.
  const routeTitle = localizedRouteText(route, "title", lang);
  const routeDescription = localizedRouteText(route, "description", lang);

  useEffect(() => {
    items.forEach((routeItem) => {
      if (!routeItem.image_url) return;
      const img = new Image();
      img.src = routeItem.image_url;
    });
  }, [items]);

  if (!route) return null;

  const prev = () => {
    setSlideDirection("prev");
    setIdx((i) => (i === 0 ? items.length - 1 : i - 1));
  };

  const next = () => {
    setSlideDirection("next");
    setIdx((i) => (i + 1) % items.length);
  };

  const goTo = (target: number) => {
    setSlideDirection(target > idx ? "next" : "prev");
    setIdx(target);
  };

  const SWIPE_THRESHOLD = 40;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchDeltaX(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    setTouchDeltaX(e.touches[0].clientX - touchStartX);
  };

  const wasSwipeRef = useRef(false);

  const handleTouchEnd = () => {
    if (touchStartX === null) return;

    if (touchDeltaX <= -SWIPE_THRESHOLD) {
      wasSwipeRef.current = true;
      next();
    } else if (touchDeltaX >= SWIPE_THRESHOLD) {
      wasSwipeRef.current = true;
      prev();
    } else {
      wasSwipeRef.current = false;
    }

    setTouchStartX(null);
    setTouchDeltaX(0);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (wasSwipeRef.current) {
      e.preventDefault();
      wasSwipeRef.current = false;
    }
  };

  return (
    <section className="popular-section">
      <div className="popular-container">
        <div className="popular-header">
          <div>
            <p className="popular-eyebrow">{t("home.popular.eyebrow")}</p>
            <h2 className="popular-heading">
              {t("home.popular.headLine1")}
              <br />
              {t("home.popular.headLine2")}
            </h2>
          </div>
        </div>

        <div
          className="popular-card-wrap"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <button
            className="popular-arrow popular-left"
            onClick={prev}
            aria-label="Previous route"
          >
            <ArrowLeft size={18} strokeWidth={2} />
          </button>

          <button
            className="popular-arrow popular-right"
            onClick={next}
            aria-label="Next route"
          >
            <ArrowRight size={18} strokeWidth={2} />
          </button>

          <Link
            key={route.id}
            href={`/routedetail/${route.id}`}
            className={`popular-card slide-${slideDirection}`}
            onClick={handleCardClick}
            style={
              touchStartX !== null
                ? { transform: `translateX(${touchDeltaX * 0.4}px)`, transition: "none" }
                : undefined
            }
          >
            <img
              src={route.image_url || "/Pacific Route Highway.jpg"}
              alt={routeTitle}
              onError={(e) => {
                e.currentTarget.src = "/Pacific Route Highway.jpg";
              }}
            />

            <div className="popular-card-overlay" />

            <span className="popular-counter">
              {String(idx + 1).padStart(2, "0")} /{" "}
              {String(items.length).padStart(2, "0")}
            </span>

            <div className="popular-content">
              <p>{route.country}</p>
              <h3>{routeTitle}</h3>
              <span>
                {routeDescription || t("home.popular.fallbackDesc")}
              </span>
            </div>
          </Link>
        </div>

        <div className="popular-footer-link">
          <Link href="/explore" className="popular-view-all">
            {t("home.popular.viewAll")} <ArrowRight size={14} strokeWidth={2.5} />
          </Link>
        </div>

        <div className="popular-dots mobile-only">
          {items.map((_, i) => (
            <button
              key={i}
              className={`popular-dot ${i === idx ? "active" : ""}`}
              onClick={() => goTo(i)}
              aria-label={`Route ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const pathname = usePathname();
  const loginHref = `/login?redirect=${encodeURIComponent(pathname)}`;
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [routes, setRoutes] = useState<Route[]>([]);
  const [user, setUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const { t, lang, setLang } = useLanguage();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFooterSection, setOpenFooterSection] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const heroImage = mounted && theme === "light" ? "/hero7.jpg" : "/hero7.jpg";

  const displayRoutes = useMemo<Route[]>(
    () => (routes.length ? routes : FALLBACK_ROUTES),
    [routes]
  );

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setUser(data.session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    supabase
      .from("routes")
      .select("*")
      .eq("featured", true)
      .order("featured_order", { ascending: true })
      .limit(10)
      .then(({ data }) => {
        if (!mounted) return;

        const loadedRoutes = data?.length
          ? (data as Route[])
          : FALLBACK_ROUTES;

        setRoutes(loadedRoutes);
      });

    requestAnimationFrame(() =>
      requestAnimationFrame(() => setHeroVisible(true))
    );

    const testimonialTimer = setInterval(() => {
      setTestimonialIdx((p) => (p + 1) % TESTIMONIALS.length);
    }, 6000);

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      clearInterval(testimonialTimer);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setAvatarUrl("");
      setUsername("");
      return;
    }

    supabase
      .from("profiles")
      .select("avatar_url, username")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setAvatarUrl(data?.avatar_url || "");
        setUsername(data?.username || "");
      });
  }, [user]);

  useEffect(() => {
    if (!showUserMenu) return;

    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (!target.closest(".user-menu-wrap")) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handler);

    return () => document.removeEventListener("mousedown", handler);
  }, [showUserMenu]);

  useEffect(() => {
    if (!showLangMenu) return;

    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (!target.closest(".footer-lang-wrap") && !target.closest(".footer-lang-menu")) {
        setShowLangMenu(false);
      }
    };

    document.addEventListener("mousedown", handler);

    return () => document.removeEventListener("mousedown", handler);
  }, [showLangMenu]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 680) setMobileMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setShowUserMenu(false);
    setMobileMenuOpen(false);
  }

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) return;

    await supabase.from("newsletter_subscribers").insert({
      email: cleanEmail,
      created_at: new Date().toISOString(),
    });

    setEmailSent(true);
    setEmail("");
  };

  const displayName = username || user?.email?.split("@")[0] || "";
  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500;600;700;800&display=swap');

        :root {
          --gold:  #C9A86A;
          --serif: 'Cormorant Garamond', Georgia, serif;
          --sans:  'Inter', system-ui, sans-serif;
        }

        .dark {
          --bg:    #0c0b09;
          --bg2:   #111009;
          --bg3:   #181510;
          --cream: #EDE5D4;
          --muted: rgba(237,229,212,0.56);
          --dim:   rgba(237,229,212,0.32);
          --border:rgba(237,229,212,0.10);
        }

        .light {
          --bg:    #F4F0E8;
          --bg2:   #EDE8DC;
          --bg3:   #E5DFD0;
          --cream: #2B2620;
          --muted: rgba(43,38,32,0.62);
          --dim:   rgba(43,38,32,0.38);
          --border:rgba(43,38,32,0.12);
        }

        .pg *, .pg *::before, .pg *::after { box-sizing:border-box; margin:0; padding:0; }
        .pg a { color:inherit; text-decoration:none; }
        .pg button { border:none; font:inherit; cursor:pointer; background:none; }
        .pg input { font:inherit; }
        .pg img { display:block; }
        .pg { min-height:100vh; background:var(--bg); color:var(--cream); font-family:var(--sans); overflow-x:hidden; }

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
        .light .nav-link-active { color:#2B2620 !important; text-shadow:0 1px 10px rgba(244,240,232,0.9); opacity:1; }
        .nav-right { display:flex; align-items:center; gap:16px; }

        /* NEU: Light-Theme + Nav noch nicht gescrollt (transparent über dem Hero-Bild) —
           bislang fehlten diese Overrides hier komplett (anders als auf Explore/Route-Detail),
           wodurch die dunkle Standard-Textfarbe des Light-Themes über dem Bild kaum lesbar war.
           Erzwingt für genau diesen Zustand helle, beschattete Nav-Elemente, unabhängig vom
           Bild darunter — sobald man scrollt (.scrolled), greifen wieder die normalen
           Theme-Farben (dunkler Text auf hellem, blurred Nav-Hintergrund). */
        .light .nav:not(.scrolled) .nav-logo span { color:#fff; text-shadow:0 2px 8px rgba(0,0,0,0.45); }
        .light .nav:not(.scrolled) .nav-link { color:rgba(255,255,255,0.78); text-shadow:0 2px 6px rgba(0,0,0,0.4); opacity:0.55; }
        .light .nav:not(.scrolled) .nav-link:hover { color:#fff; opacity:1; }
        .light .nav:not(.scrolled) .nav-link-active { color:#fff !important; text-shadow:0 2px 6px rgba(0,0,0,0.4); opacity:1; }
        .light .nav:not(.scrolled) .login-btn { color:#fff; border-color:rgba(255,255,255,0.35); background:rgba(0,0,0,0.22); }
        .light .nav:not(.scrolled) .login-btn:hover { background:#fff; color:#2B2620; }
        .light .nav:not(.scrolled) .user-avatar { border-color:rgba(255,255,255,0.35); }
        .light .nav:not(.scrolled) .mobile-menu-btn { border-color:rgba(255,255,255,0.35); color:#fff; background:rgba(0,0,0,0.22) !important; }

        .login-btn { padding:10px 22px; border:1px solid var(--border); border-radius:999px; font-size:10px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:var(--cream); background:color-mix(in srgb, var(--border) 40%, transparent); transition:all .25s; }
        .login-btn:hover { background:var(--cream); color:var(--bg); }

        button.user-avatar { width:48px; height:48px; border-radius:50%; border:1.5px solid var(--border); background:var(--bg2); overflow:hidden; display:flex; align-items:center; justify-content:center; font-family:var(--serif); font-size:20px; font-weight:700; color:var(--cream); cursor:pointer; transition:border-color .2s, transform .2s; box-shadow:0 6px 18px rgba(0,0,0,0.35); }
        button.user-avatar:hover { border-color:var(--gold); transform:translateY(-1px); }
        .user-avatar img { width:100%; height:100%; object-fit:cover; }

        .theme-switch { position:relative; display:flex; align-items:center; width:66px; height:33px; border-radius:999px; background:color-mix(in srgb, var(--border) 70%, transparent) !important; backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid var(--border) !important; box-shadow:0 8px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06); cursor:pointer; transition:background .35s, border-color .35s; flex-shrink:0; }
        .theme-switch:hover { border-color: var(--gold) !important; }
        .theme-switch-knob { position:absolute; top:5px; left:3.5px; width:22px; height:22px; border-radius:50%; background:linear-gradient(to bottom, rgba(255,255,255,0.96), rgba(237,229,212,0.85)); box-shadow:0 4px 10px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.6); display:flex; align-items:center; justify-content:center; transition:transform .45s cubic-bezier(0.22,1,0.36,1); }
        .theme-switch-knob.is-light { transform:translateX(36px); }
        .theme-switch-icon { width:14px; height:14px; }
        .theme-switch-placeholder { width:66px; height:33px; border-radius:999px; background:color-mix(in srgb, var(--border) 50%, transparent); border:1px solid var(--border); flex-shrink:0; }

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

        .hero { position:relative; height:100vh; min-height:680px; display:flex; flex-direction:column; justify-content:flex-end; overflow:hidden; }
        .hero-bg { position:absolute; inset:0; }
        .hero-bg::after { content:""; position:absolute; inset:0; z-index:3; background: linear-gradient(to bottom, rgba(12,11,9,0.1) 0%, rgba(12,11,9,0.05) 30%, rgba(12,11,9,0.65) 70%, rgba(12,11,9,0.95) 100%), linear-gradient(to right, rgba(12,11,9,0.72) 0%, rgba(12,11,9,0.2) 60%, transparent 100%); }
        /* NEU: dezenter, deutlich schwächerer Verlauf nur fürs Light-Theme (max. ~0.28
           Deckkraft statt der vorherigen ~0.9) — sorgt für einen sichtbaren, aber
           unaufdringlichen "wärmeren/helleren" Eindruck von unten links, während die
           Dunkelabstufung (nötig für den hellen Text) über beiden Verläufen erhalten bleibt. */
        .light .hero-bg::after {
          background:
            linear-gradient(125deg, rgba(244,240,232,0.28) 0%, rgba(244,240,232,0.14) 20%, rgba(244,240,232,0.04) 34%, transparent 46%),
            linear-gradient(to bottom, rgba(12,11,9,0.08) 0%, rgba(12,11,9,0.04) 30%, rgba(12,11,9,0.6) 70%, rgba(12,11,9,0.9) 100%),
            linear-gradient(to right, rgba(12,11,9,0.66) 0%, rgba(12,11,9,0.16) 60%, transparent 100%);
        }
        /* FIX: vorher zwei separate Verläufe, die beide von derselben (unteren linken) Ecke
           ausgingen ("to top" + "to right") — genau dort haben sich beide Aufhellungen addiert
           und den unschönen hellen "Blob" links im Bild erzeugt. Jetzt stattdessen ein einzelner
           diagonaler Verlauf von der unteren linken Ecke (wo der Hero-Text sitzt) ausgehend, der
           sauber nach oben rechts ausläuft, plus ein separater, dezenter oberer Verlauf nur für
           die Nav-Zone (bleibt unabhängig, überlappt sich nicht mit dem Text-Bereich). */
        /* Hero-Text bleibt in beiden Themes hell (wie bisher im Dark-Theme) — das Foto ist
           genau in der unteren linken Ecke, wo der Text sitzt, ohnehin dunkel. Damit sind
           weder ein zusätzlicher Verlauf noch ein Schatten-Glow mehr nötig, um Kontrast zu
           erzeugen; die Standard-Dunkelabstufung von .hero-bg::after (unten/links) reicht aus. */
        .hero-content { position:relative; z-index:10; padding:0 clamp(24px,5vw,80px) clamp(50px,7vh,90px); max-width:1280px; }
        .hero-copy { opacity:0; transform:translateY(22px); transition:opacity .9s, transform .9s; }
        .hero-copy.visible { opacity:1; transform:translateY(0); }
        .hero-h1 { font-family:var(--serif); font-size:clamp(56px,8.5vw,122px); font-weight:300; line-height:0.88; letter-spacing:-0.045em; color:#EDE5D4; margin-bottom:30px; text-shadow:0 20px 60px rgba(0,0,0,0.6); }
        .hero-sub { font-size:16px; font-weight:300; color:rgba(237,229,212,0.72); margin-bottom:20px; max-width:420px; line-height:1.7; }

        .btn-gold-filled { display:inline-flex; align-items:center; gap:10px; padding:14px 28px; background:var(--gold); border:1px solid var(--gold); border-radius:999px; font-size:9px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--bg); transition:all .25s; }
        .btn-gold-filled:hover { background:#d8b978; border-color:#d8b978; transform:translateY(-1px); }

        .popular-section { padding:clamp(84px,8.4vw,116px) clamp(24px,5vw,80px) clamp(70px,8vw,110px); background:radial-gradient(circle at 72% 22%,rgba(201,168,106,0.13),transparent 28rem),var(--bg); border-top:1px solid var(--border); border-bottom:1px solid var(--border); }
        .popular-container { max-width:1500px; margin:0 auto; }
        .popular-header { display:flex; align-items:flex-end; justify-content:space-between; gap:24px; margin-bottom:38px; }
        .popular-eyebrow { font-size:9px; font-weight:800; letter-spacing:0.38em; text-transform:uppercase; color:var(--gold); margin-bottom:24px; }
        .popular-heading { font-family:var(--serif); font-size:clamp(42px,5vw,70px); font-weight:300; line-height:0.92; letter-spacing:-0.045em; color:var(--cream); }
        .popular-view-all { display:flex; align-items:center; gap:10px; font-size:10px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase; color:var(--muted); white-space:nowrap; transition:color .2s; }
        .popular-view-all:hover { color:var(--gold); }
        .dest-explore-btn { font-size:9px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:var(--muted); display:inline-flex; align-items:center; gap:8px; transition:color .2s; }
        .dest-explore-btn:hover { color:var(--gold); }
        .popular-footer-link { display:flex; justify-content:flex-end; margin-top:24px; }

        .popular-card-wrap { position:relative; }
        .popular-card { position:relative; display:block; height:clamp(520px,58vw,680px); overflow:hidden; border-radius:34px; border:1px solid var(--border); background:var(--bg3); box-shadow:0 36px 110px rgba(0,0,0,0.52); isolation:isolate; }

        .popular-card.slide-next { animation:popularSlideNext 0.46s cubic-bezier(0.22,1,0.36,1) both; }
        .popular-card.slide-prev { animation:popularSlidePrev 0.46s cubic-bezier(0.22,1,0.36,1) both; }

        @keyframes popularSlideNext {
          0% { opacity:0.72; transform:translateX(26px); }
          100% { opacity:1; transform:translateX(0); }
        }

        @keyframes popularSlidePrev {
          0% { opacity:0.72; transform:translateX(-26px); }
          100% { opacity:1; transform:translateX(0); }
        }

        .popular-card img { width:100%; height:100%; object-fit:cover; object-position:center 78%; filter:brightness(0.82) contrast(1.06) saturate(0.98); transition:transform 1s ease,filter 1s ease; }
        .popular-card-wrap:hover .popular-card img { transform:scale(1.04); filter:brightness(0.94) contrast(1.1) saturate(1.08); }

        .popular-card-overlay { position:absolute; inset:0; z-index:1; background:linear-gradient(to top,rgba(0,0,0,0.78),rgba(0,0,0,0.24) 48%,rgba(0,0,0,0.15)),linear-gradient(to right,rgba(0,0,0,0.5),transparent 58%); }
        .popular-counter { position:absolute; top:28px; left:32px; z-index:2; font-family:var(--serif); font-size:clamp(26px,3vw,42px); font-weight:300; letter-spacing:-0.03em; color:rgba(255,255,255,0.76); }
        .popular-content { position:absolute; z-index:2; left:clamp(28px,5vw,90px); right:clamp(28px,5vw,70px); bottom:clamp(34px,6vw,74px); max-width:min(1120px,calc(100% - 80px)); }
        .popular-content p { margin-bottom:12px; color:var(--gold); font-size:10px; font-weight:800; letter-spacing:0.24em; text-transform:uppercase; }
        .popular-content h3 { margin-bottom:22px; color:#fff; font-family:var(--serif); font-size:clamp(48px,6.2vw,92px); font-weight:300; line-height:0.9; letter-spacing:-0.055em; text-shadow:0 20px 60px rgba(0,0,0,0.65); }
        .popular-content span { display:block; max-width:500px; color:rgba(255,255,255,0.68); font-size:14px; font-weight:300; line-height:1.8; }

        .popular-arrow { position:absolute; top:50%; z-index:20; transform:translateY(-50%); width:45px; height:45px; display:grid; place-items:center; border:1px solid rgba(255,255,255,0.22); border-radius:999px; background:rgba(0,0,0,0.35); color:#fff; backdrop-filter:blur(14px); transition:background .2s,border-color .2s,color .2s; }
        .popular-arrow:hover { background:var(--gold); border-color:var(--gold); color:var(--bg); }
        .popular-left { left:24px; }
        .popular-right { right:24px; }

        .builder-section { background:var(--bg2); border-top:1px solid var(--border); border-bottom:1px solid var(--border); position:relative; overflow:hidden; min-height:680px; }
        .builder-inner { max-width:1200px; margin:0 auto; display:grid; grid-template-columns:1fr 1fr; align-items:center; position:relative; z-index:2; }
        .builder-image-bg { position:absolute; left:0; top:0; bottom:0; width:50vw; overflow:hidden; z-index:1; }
        .builder-image-bg img { width:100%; height:100%; object-fit:cover; filter:brightness(0.75) contrast(1.05) saturate(0.88); }
        .builder-image-bg::after { content:""; position:absolute; inset:0; background:linear-gradient(to right,transparent 60%,var(--bg2)); }
        .builder-content { padding:clamp(50px,7vw,90px) clamp(30px,5vw,70px); grid-column:2; }
        .builder-h2 { font-family:var(--serif); font-size:clamp(46px,4.5vw,86px); font-weight:300; line-height:0.95; letter-spacing:-0.04em; color:var(--cream); margin-bottom:12px; }
        .builder-sub { font-size:17px; color:var(--dim); line-height:1.7; font-weight:300; margin-top:35px; max-width:418px; }
        .eyebrow { font-size:15px; font-weight:800; letter-spacing:0.36em; text-transform:uppercase; color:var(--gold); margin-bottom:20px; }

        .builder-find-card {
          width:100%;
          max-width:620px;
          margin-top:70px;
          padding:8px;
          border:1px solid var(--border);
          border-radius:26px;
          background:color-mix(in srgb, var(--border) 45%, transparent);
          backdrop-filter:blur(24px);
          box-shadow:0 28px 80px rgba(0,0,0,0.38);
        }

        .builder-find-button {
          width:100%;
          height:68px;
          border-radius:20px;
          background:var(--gold);
          color:var(--bg);
          display:flex;
          align-items:center;
          justify-content:center;
          gap:12px;
          font-size:11px;
          font-weight:800;
          letter-spacing:0.24em;
          text-transform:uppercase;
          transition:all .25s;
          box-shadow:0 12px 30px rgba(201,168,106,0.22);
        }

        .builder-find-button:hover {
          background:#d8b978;
          transform:translateY(-1px);
          box-shadow:0 18px 40px rgba(201,168,106,0.28);
        }

        .dest-section { padding:clamp(70px,9vw,120px) clamp(24px,5vw,80px); background:var(--bg); border-top:1px solid var(--border); }
        .dest-h2 { font-family:var(--serif); font-size:clamp(34px,4.5vw,58px); font-weight:300; line-height:0.95; letter-spacing:-0.04em; color:var(--cream); margin-top:12px; }

        .testimonial-section { padding:clamp(70px,9vw,110px) clamp(24px,5vw,80px); background:var(--bg2); border-top:1px solid var(--border); text-align:center; }
        .testimonial-qq { font-family:var(--serif); font-size:52px; color:var(--gold); opacity:0.6; line-height:0.5; margin-bottom:28px; display:none; }
        .testimonial-text { font-family:var(--serif); font-size:clamp(22px,3vw,38px); font-weight:300; font-style:italic; color:var(--cream); line-height:1.4; max-width:820px; margin:0 auto 28px; }
        .testimonial-name { font-size:10px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--gold); }
        .testimonial-dots { display:flex; justify-content:center; gap:8px; margin-top:24px; }
        .t-dot { width:44px; height:44px; display:flex; align-items:center; justify-content:center; }
        .t-dot::after { content:""; width:6px; height:6px; border-radius:50%; background:var(--border); border:1px solid var(--dim); transition:all .3s; display:block; }
        .t-dot.active::after { width:22px; background:var(--gold); border-color:var(--gold); border-radius:999px; }

        .features-section { padding:clamp(70px,9vw,120px) clamp(24px,5vw,80px); background:var(--bg); border-top:1px solid var(--border); }
        .features-inner { max-width:1200px; margin:0 auto; }
        .features-h2 { font-family:var(--serif); font-size:clamp(34px,4.5vw,56px); font-weight:300; line-height:0.95; letter-spacing:-0.04em; color:var(--cream); margin-bottom:48px; }
        .features-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
        .feature-card { padding:28px 22px 32px; border:1px solid var(--border); border-radius:18px; background:color-mix(in srgb, var(--border) 25%, transparent); transition:border-color .3s,transform .3s,background .3s; }
        .feature-card:hover { border-color:rgba(201,168,106,0.28); transform:translateY(-3px); background:color-mix(in srgb, var(--border) 45%, transparent); }
        .feature-icon { color:var(--gold); margin-bottom:18px; display:flex; }
        .feature-title { font-size:10px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:var(--cream); margin-bottom:10px; }
        .feature-text { font-size:13px; color:var(--dim); line-height:1.7; font-weight:300; }

        .footer { background:var(--bg); border-top:1px solid var(--border); padding:56px clamp(24px,5vw,80px) 28px; }
        .footer-inner { max-width:1200px; margin:0 auto; }
        .footer-top { display:grid; grid-template-columns:1.3fr 1fr 1fr 1fr 1.4fr; gap:36px; padding-bottom:40px; border-bottom:1px solid var(--border); margin-bottom:22px; }
        .footer-brand { font-size:11px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:var(--cream); line-height:1.2; margin-bottom:12px; }
        .footer-logo-container { width:220px; height:147px; display:flex; align-items:center; flex-shrink:0; }
        .footer-logo-img { height:auto; display:block; }
        .footer-logo-light { width:180px; }
        .footer-logo-dark  { width:220px; filter:invert(33%) sepia(46%) saturate(600%) hue-rotate(4deg) brightness(96%) drop-shadow(0 4px 10px rgba(0,0,0,0.6)); }
        .footer-tagline { font-size:12px; color:var(--dim); line-height:1.7; font-weight:300; margin-bottom:18px; max-width:200px; }
        .footer-col-title { font-size:9px; font-weight:800; letter-spacing:0.28em; text-transform:uppercase; color:var(--dim); margin-bottom:16px; }
        .footer-col a { display:block; font-size:12px; color:var(--dim); margin-bottom:10px; font-weight:300; transition:color .2s; }
        .footer-col a:hover { color:var(--cream); }
        .footer-nl-sub { font-size:12px; color:var(--dim); line-height:1.6; margin-bottom:14px; font-weight:300; }
        .footer-nl-form { display:flex; }
        .footer-nl-input { flex:1; padding:11px 14px; border:1px solid var(--border); border-right:none; border-radius:999px 0 0 999px; background:color-mix(in srgb, var(--border) 40%, transparent); color:var(--cream); font-size:12px; outline:none; }
        .footer-nl-input::placeholder { color:var(--dim); }
        .footer-nl-btn { width:44px; background:var(--gold); border:1px solid var(--gold); border-radius:0 999px 999px 0; color:var(--bg); font-size:15px; font-weight:800; transition:background .2s; display:flex; align-items:center; justify-content:center; }
        .footer-nl-btn:hover { background:#d8b978; }
        .footer-bottom { display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; }
        .footer-copy { font-size:10px; color:var(--dim); letter-spacing:0.08em; text-transform:uppercase; }
        .footer-controls { display:flex; align-items:center; gap:22px; flex-wrap:wrap; }

        .footer-lang-wrap { position:relative; }
        .footer-lang-btn { display:flex; align-items:center; gap:6px; padding:8px 14px; border:1px solid var(--border); border-radius:999px; background:color-mix(in srgb, var(--border) 30%, transparent); font-size:10px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:var(--muted); transition:color .2s, border-color .2s; }
        .footer-lang-btn:hover { color:var(--cream); border-color:var(--gold); }
        .footer-lang-menu { position:absolute; bottom:calc(100% + 10px); right:0; min-width:150px; background:color-mix(in srgb, var(--bg) 97%, transparent); border:1px solid var(--border); border-radius:12px; overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,0.55); backdrop-filter:blur(24px); z-index:50; animation:dropIn .2s cubic-bezier(0.22,1,0.36,1); }
        .footer-lang-option { display:block; width:100%; text-align:left; padding:10px 14px; font-size:12px; font-weight:500; color:var(--muted); background:none; transition:background .15s,color .15s; }
        .footer-lang-option:hover { background:color-mix(in srgb, var(--border) 60%, transparent); color:var(--cream); }
        .footer-lang-option.active { color:var(--gold); font-weight:700; }

        @media (max-width:1024px) {
          .builder-inner { grid-template-columns:1fr; }
          .builder-image-bg { display:none; }
          .builder-content { padding:60px 30px; grid-column:1; }
          .features-grid { grid-template-columns:repeat(2,1fr); }
          .footer-top { grid-template-columns:1fr 1fr 1fr; }
          .footer-top > div:first-child { grid-column:1 / -1; }
        }

        /* FIX: Lücke zwischen Tablet-Breakpoint (1024px, Desktop-Bild verschwindet)
           und Mobile-Breakpoint (680px, Mobile-Bild erscheint) — Geräte in diesem
           Bereich (z.B. iPad Pro 11" M4 in Portrait bei 834px) zeigten im
           "Build your route"-Bereich bisher gar kein Bild, weder Desktop- noch
           Mobile-Variante. Zeigt hier zusätzlich das Mobile-Bild an, exakt wie im
           mobilen Design (max-width:680px), ohne dessen Regeln zu verändern. */
        @media (min-width:681px) and (max-width:1024px) {
          /* Statt der rotierten Mobile-Bild-Karte: half/half Layout wie im
             Desktop-Design (Bild links, Content rechts), nur mit etwas
             kompakteren Innenabständen für die schmalere rechte Spalte. */
          .builder-inner { grid-template-columns:1fr 1fr; }
          .builder-image-bg { display:block; }
          .builder-content { grid-column:2; padding:50px 28px; }
        }

        @media (max-width:760px) {
          .popular-header { align-items:flex-start; flex-direction:column; }
          .popular-card { height:520px; border-radius:26px; }
          .popular-arrow { display:none; }
          .popular-content h3 { font-size:clamp(42px,12vw,66px); line-height:0.94; }
        }

        @media (max-width:680px) {
          .nav-links { display:none; }
          .features-grid { grid-template-columns:1fr; }
          .footer-top { grid-template-columns:1fr; }
          .footer-bottom { flex-direction:column; align-items:flex-start; }
        }

        .mobile-only { display:none; }

        .mobile-menu-btn { width:42px; height:42px; align-items:center; justify-content:center; border:1px solid var(--border); border-radius:50%; color:var(--cream); background:color-mix(in srgb, var(--border) 40%, transparent) !important; flex-shrink:0; }

        .mobile-nav-backdrop { position:fixed; inset:0; z-index:400; background:rgba(0,0,0,0.55); backdrop-filter:blur(2px); opacity:0; pointer-events:none; transition:opacity .3s; }
        .mobile-nav-backdrop.open { opacity:1; pointer-events:auto; }

        .mobile-nav-drawer { position:fixed; top:50%; left:50%; z-index:401; width:min(380px,88vw); max-height:85vh; overflow-y:auto; background:var(--bg); border:1px solid var(--border); border-radius:26px; box-shadow:0 50px 120px rgba(0,0,0,0.55); opacity:0; pointer-events:none; transform:translate(-50%,-50%) scale(0.94); transition:opacity .28s ease, transform .28s ease; padding:22px 22px 26px; }
        .mobile-nav-drawer.open { opacity:1; pointer-events:auto; transform:translate(-50%,-50%) scale(1); }

        .mobile-nav-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:36px; }
        .mobile-nav-close { width:38px; height:38px; display:flex; align-items:center; justify-content:center; border-radius:50%; border:1px solid var(--border); color:var(--cream); background:none !important; }

        .mobile-nav-links { display:flex; flex-direction:column; gap:4px; margin-bottom:auto; }
        .mobile-nav-link { padding:16px 6px; font-family:var(--serif); font-size:26px; font-weight:300; color:var(--cream); border-bottom:1px solid var(--border); }
        .mobile-nav-link-active { color:var(--gold); }

        .mobile-nav-bottom { display:flex; align-items:center; justify-content:space-between; padding-top:20px; border-top:1px solid var(--border); margin-top:20px; }
        .mobile-nav-login { padding:12px 24px; border:1px solid var(--border); border-radius:999px; font-size:11px; font-weight:700; letter-spacing:0.16em; text-transform:uppercase; color:var(--cream); background:color-mix(in srgb, var(--border) 40%, transparent) !important; }
        .mobile-nav-user { display:flex; align-items:center; gap:12px; }
        .mobile-nav-user-name { font-size:13px; font-weight:600; color:var(--cream); }

        .mobile-profile-card { border:1px solid var(--border); border-radius:20px; background:color-mix(in srgb, var(--bg2) 80%, transparent); overflow:hidden; }
        .mobile-profile-card .ud-link { font-size:13px; }
        .mobile-profile-card .ud-header,
        .mobile-profile-card .ud-theme-row,
        .mobile-profile-card .ud-links { padding-left:18px; padding-right:18px; }
        .ud-section-label { font-size:9px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:var(--dim); padding:14px 12px 6px; }

        .popular-dots { justify-content:center; gap:9px; margin-top:22px; }
        button.popular-dot { width:8px; height:8px; border-radius:50%; background:var(--border) !important; border:1px solid var(--dim) !important; padding:0; transition:all .25s; }
        button.popular-dot.active { width:26px; border-radius:999px; background:var(--gold) !important; border-color:var(--gold) !important; }

        .builder-mobile-image { position:absolute; top:0; right:0; width:44%; max-width:190px; aspect-ratio:3/4; border-radius:20px; overflow:hidden; border:4px solid var(--bg); box-shadow:0 20px 50px rgba(0,0,0,0.45); transform:rotate(4deg); z-index:3; }
        .builder-mobile-image img { width:100%; height:100%; object-fit:cover; }

        .testimonial-card-mobile { border:1px solid var(--border); border-radius:22px; padding:36px 22px; background:color-mix(in srgb, var(--border) 20%, transparent); }

        .footer-col-header { display:flex; align-items:center; justify-content:space-between; width:100%; background:none !important; border:none; padding:0; cursor:default; pointer-events:none; }
        .footer-col-chevron { color:var(--dim); transition:transform .3s; flex-shrink:0; }
        .footer-col-chevron.open { transform:rotate(180deg); color:var(--gold); }
        .footer-col-links { overflow:visible; max-height:none; }

        @media (max-width:680px) {
          .mobile-menu-btn { display:flex; }

          .nav-right .user-menu-wrap { display:none; }

          .hero-h1 { font-size:clamp(48px,13vw,72px); margin-bottom:20px; }
          .hero-sub { font-size:14px; max-width:280px; }
          .hero { justify-content:flex-end; }
          .hero-content { padding-top:0; padding-bottom:60px; }
          .hero-bg img { object-position:80% 68% !important; }
          .light .hero-bg::after { background: linear-gradient(150deg, rgba(244,240,232,0.32) 0%, rgba(244,240,232,0.14) 24%, transparent 42%), linear-gradient(to bottom, rgba(12,11,9,0.05) 0%, rgba(12,11,9,0.15) 40%, rgba(12,11,9,0.7) 68%, rgba(12,11,9,0.92) 100%) !important; }
          .dark .hero-bg::after { background: linear-gradient(to bottom, rgba(12,11,9,0.05) 0%, rgba(12,11,9,0.15) 40%, rgba(12,11,9,0.75) 68%, rgba(12,11,9,0.97) 100%), linear-gradient(to right, rgba(12,11,9,0.72) 0%, rgba(12,11,9,0.2) 60%, transparent 100%) !important; }

          .popular-dots { display:flex; }
          .popular-content { left:22px; right:22px; bottom:26px; }

          .builder-content { position:relative; padding-top:30px; }
          .builder-mobile-image { display:block; }
          .builder-content > .eyebrow { padding-right:150px; }
          .builder-h2 { padding-right:150px; font-size:clamp(28px,8.5vw,38px); max-width:none; }
          .builder-sub { margin-top:18px; padding-right:150px; max-width:none; font-size:14px; }
          .builder-find-card { margin-top:36px; max-width:100%; }

          .builder-section { min-height:auto; }
          .dest-section { padding-top:40px; padding-bottom:40px; }
          .dest-explore-btn { border:1px solid var(--border); border-radius:999px; padding:14px 26px !important; background:color-mix(in srgb, var(--border) 30%, transparent); }
          .testimonial-card-mobile { display:block; }

          .features-grid { grid-template-columns:repeat(2,1fr) !important; gap:10px !important; }
          .feature-card { padding:20px 16px 24px; }
          .feature-title { font-size:9px; }
          .feature-text { font-size:12px; }

          .footer-col-header { cursor:pointer; pointer-events:auto; }
          .footer-col-links { display:block; overflow:hidden; max-height:0; transition:max-height .3s ease; }
          .footer-col-links.open { max-height:400px; }
          .footer-col-chevron { display:block; }

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

          .footer-lang-menu {
            left: 0;
            right: auto;
          }

          .footer-lang-option {
            padding: 12px 16px;
            font-size: 13px;
          }
        }
      `}</style>

      <main className="pg">
        <nav className={`nav ${navScrolled ? "scrolled" : ""}`}>
          <Link href="/" className="nav-logo">
            <span>EXPLORE</span>
            <span>SCENIC</span>
            <span>ROUTES</span>
          </Link>

          <div className="nav-links">
            {[
              ["nav.explore", "/explore"],
              ["nav.about", "/about"],
            ].map(([key, href]) => (
              <Link key={key} href={href} className={`nav-link ${pathname === href ? "nav-link-active" : ""}`}>
                {t(key as any)}
              </Link>
            ))}

            {user && (
              <Link
                href="/my-trips"
                className={`nav-link ${pathname === "/my-trips" ? "nav-link-active" : ""}`}
              >
                {t("nav.myTrips")}
              </Link>
            )}
          </div>

          <div className="nav-right">
            {!user && <ThemeSwitch />}

            {user ? (
              <div className="user-menu-wrap">
                <button
                  className="user-avatar"
                  onClick={() => setShowUserMenu((p) => !p)}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="avatar"
                      onError={() => setAvatarUrl("")}
                    />
                  ) : (
                    displayName?.[0]?.toUpperCase() ||
                    user.email?.[0]?.toUpperCase()
                  )}
                </button>

                {showUserMenu && (
                  <div className="user-dropdown">
                    <div className="ud-header">
                      <div className="ud-avatar">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt="avatar"
                            onError={() => setAvatarUrl("")}
                          />
                        ) : (
                          displayName?.[0]?.toUpperCase() ||
                          user.email?.[0]?.toUpperCase()
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
                      <Link
                        href="/profile"
                        className="ud-link"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <span className="ud-link-icon"><UserIcon size={14} strokeWidth={1.8} /></span> {t("nav.profile")}
                      </Link>

                      <Link
                        href="/my-trips"
                        className="ud-link"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <span className="ud-link-icon"><MapIcon size={14} strokeWidth={1.8} /></span> {t("nav.myTrips")}
                      </Link>

                      <Link
                        href="/explore"
                        className="ud-link"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <span className="ud-link-icon"><Compass size={14} strokeWidth={1.8} /></span> {t("nav.explore")}
                      </Link>
                      {isAdmin && (
                        <Link
                          href="/admin"
                          className="ud-link"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <span className="ud-link-icon"><ShieldCheck size={14} strokeWidth={1.8} /></span> {t("nav.adminPanel")}
                        </Link>
                      )}
                      <div className="ud-divider" />

                      <button className="ud-logout" onClick={handleLogout}>
                        <span
                          className="ud-link-icon"
                          style={{ color: "#e08080" }}
                        >
                          <LogOut size={14} strokeWidth={1.8} />
                        </span>{" "}
                        {t("nav.signOut")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href={loginHref} className="login-btn">
                {t("nav.login")}
              </Link>
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
            <span className="nav-logo" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.18em" }}>EXPLORE SCENIC ROUTES</span>
            </span>

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

              {/* FIX: Auf allen anderen Seiten ist dieses Menü in zwei
                  Abschnitte unterteilt ("NAVIGATE" und "ACCOUNT", getrennt
                  durch eine Linie), inkl. Profile-Link. Auf der Homepage
                  fehlte diese Aufteilung komplett — alle Links hingen unter
                  einem einzigen "NAVIGATE"-Label, und der Profile-Link
                  fehlte ganz. Jetzt an die anderen Seiten angeglichen. */}
              <div className="ud-links">
                <p className="ud-section-label">{t("nav.navigate")}</p>

                <Link
                  href="/explore"
                  className="ud-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="ud-link-icon"><Compass size={14} strokeWidth={1.8} /></span>
                  {t("nav.explore")}
                  <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
                </Link>

                <Link
                  href="/about"
                  className="ud-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="ud-link-icon"><BookOpen size={14} strokeWidth={1.8} /></span>
                  {t("nav.about")}
                  <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
                </Link>

                <div className="ud-divider" />

                <p className="ud-section-label">{t("nav.account")}</p>

                <Link
                  href="/profile"
                  className="ud-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="ud-link-icon"><UserIcon size={14} strokeWidth={1.8} /></span>
                  {t("nav.profile")}
                  <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
                </Link>

                <Link
                  href="/my-trips"
                  className="ud-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="ud-link-icon"><MapIcon size={14} strokeWidth={1.8} /></span>
                  {t("nav.myTrips")}
                  <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
                </Link>

                {isAdmin && (
                  // FIX: Schloss vorher fälschlicherweise setShowUserMenu(false)
                  // (Copy-Paste-Rest vom Desktop-Dropdown) statt
                  // setMobileMenuOpen(false) — dadurch blieb das mobile Menü
                  // beim Klick auf Admin Panel offen.
                  <Link
                    href="/admin"
                    className="ud-link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="ud-link-icon"><ShieldCheck size={14} strokeWidth={1.8} /></span> {t("nav.adminPanel")}
                  </Link>
                )}

                <div className="ud-divider" />

                <button className="ud-logout" onClick={handleLogout}>
                  <span className="ud-link-icon" style={{ color: "#e08080" }}>
                    <LogOut size={14} strokeWidth={1.8} />
                  </span>
                  {t("nav.signOut")}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mobile-nav-links">
                {[
                  ["nav.explore", "/explore"],
                  ["nav.about", "/about"],
                ].map(([key, href]) => (
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
                <Link
                  href={loginHref}
                  className="mobile-nav-login"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("nav.login")}
                </Link>

                <ThemeSwitch />
              </div>
            </>
          )}
        </div>

        <section className="hero">
          <div className="hero-bg">
            <img
              src={heroImage}
              alt="Hero"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center 33%",
                filter: mounted && theme === "light"
                  ? "brightness(1.18) contrast(1.03) saturate(1.12)"
                  : "brightness(0.92) contrast(1.08) saturate(0.9)",
              }}
            />
          </div>

          <div className="hero-content">
            <div className={`hero-copy ${heroVisible ? "visible" : ""}`}>
              <h1 className="hero-h1">
                {t("home.hero.line1")}
                <br />
                {t("home.hero.line2")}
              </h1>

              <p className="hero-sub">
                {t("home.hero.subtitle")}
              </p>

              <Link href="/explore" className="btn-gold-filled">
                {t("nav.explore")} <ArrowRight size={13} strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        </section>

        <PopularCarousel routes={displayRoutes} />

        <section className="builder-section" id="experiences">
          <div className="builder-image-bg">
            <img
              src="/Toscana.jpg"
              alt="Tuscany road"
              onError={(e) => {
                e.currentTarget.src = "/Amalfi coast road.jpg";
              }}
            />
          </div>

          <div className="builder-inner">
            <div className="builder-content">
              <div className="builder-mobile-image mobile-only">
                <img
                  src="/Toscana.jpg"
                  alt="Tuscany road"
                  onError={(e) => {
                    e.currentTarget.src = "/Amalfi coast road.jpg";
                  }}
                />
              </div>

              <p className="eyebrow">{t("home.builder.eyebrow")}</p>

              <h2 className="builder-h2">
                {t("home.builder.headLine1")}
                <br />
                {t("home.builder.headLine2")}
              </h2>

              <p className="builder-sub">
                {t("home.builder.sub")}
              </p>

              <div className="builder-find-card">
                <Link href="/explore" className="builder-find-button">
                  {t("home.builder.findRoute")} <ArrowRight size={14} strokeWidth={2.5} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="dest-section">
          <div
            style={{
              maxWidth: "700px",
              margin: "0 auto",
              textAlign: "center",
              marginBottom: "40px",
            }}
          >
            <p className="eyebrow">{t("home.dest.eyebrow")}</p>

            <h2 className="dest-h2">{t("home.dest.heading")}</h2>

            <p
              style={{
                fontSize: "13px",
                color: "var(--dim)",
                marginTop: "14px",
                lineHeight: 1.6,
              }}
            >
              {t("home.dest.sub")}
            </p>
          </div>

          <div className="dest-map-wrap" style={{ maxWidth: "900px", margin: "0 auto" }}>
            <WorldMap />
          </div>

          <div style={{ textAlign: "center", marginTop: "32px" }}>
            <Link
              href="/explore"
              className="dest-explore-btn"
            >
              {t("home.popular.viewAll")} <ArrowRight size={13} strokeWidth={2.5} />
            </Link>
          </div>
        </section>

        <section className="testimonial-section">
          <div className="testimonial-card-mobile">
            <div className="testimonial-qq">"</div>

            <p className="testimonial-text">
              &ldquo; {t(TESTIMONIALS[testimonialIdx].quoteKey)} &rdquo;
            </p>

            <p className="testimonial-name">
              — {TESTIMONIALS[testimonialIdx].name}, {t(TESTIMONIALS[testimonialIdx].roleKey)}
            </p>

            <div className="testimonial-dots">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  className={`t-dot ${i === testimonialIdx ? "active" : ""}`}
                  onClick={() => setTestimonialIdx(i)}
                  aria-label={`Testimonial ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="features-section">
          <div className="features-inner">
            <p className="eyebrow">{t("home.features.eyebrow")}</p>

            <h2 className="features-h2">
              {t("home.features.headLine1")}
              <br />
              {t("home.features.headLine2")}
            </h2>

            <div className="features-grid">
              {FEATURES.map(({ icon: Icon, titleKey, textKey }) => (
                <div className="feature-card" key={titleKey}>
                  <div className="feature-icon"><Icon size={22} strokeWidth={1.7} /></div>
                  <div className="feature-title">{t(titleKey)}</div>
                  <p className="feature-text">{t(textKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

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
              </div>

              {FOOTER_COLUMNS.map(({ id, headingKey, links }) => {
                const isOpen = openFooterSection === id;

                return (
                  <div className="footer-col" key={id}>
                    <button
                      className="footer-col-header"
                      onClick={() =>
                        setOpenFooterSection(isOpen ? null : id)
                      }
                    >
                      <p className="footer-col-title" style={{ marginBottom: 0 }}>
                        {t(headingKey)}
                      </p>
                      <ChevronDown
                        size={14}
                        className={`footer-col-chevron mobile-only ${isOpen ? "open" : ""}`}
                      />
                    </button>

                    <div className={`footer-col-links ${isOpen ? "open" : ""}`}>
                      <div style={{ paddingTop: 14 }}>
                        {links.map(({ key, href, protected: isProtected }) => {
                          // Geschützte Links (My Trips, Profile, Traveller Pass) gehen
                          // ohne Session erst zum Login, mit redirect zurück zum Ziel —
                          // gleiches Verhalten wie in der Navbar (loginHref).
                          const finalHref =
                            isProtected && !user
                              ? `/login?redirect=${encodeURIComponent(href)}`
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
      </main>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}