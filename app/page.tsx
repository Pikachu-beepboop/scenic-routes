"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import AuthModal from "./AuthModal";

const FALLBACK_ROUTES = [
  {
    id: "1",
    title: "Pacific Coast Highway",
    country: "USA",
    distance_km: 655,
    image_url: "/pacific.jpg",
    duration: "2-3 Days",
    type: "Coastal Highway",
    mood: "Coast",
    description: "Cliffs, surf, golden light and endless ocean views along California's coast.",
  },
  {
    id: "2",
    title: "Großglockner",
    country: "Austria",
    distance_km: 48,
    image_url: "/grossglockner.jpg",
    duration: "2-3 Hours",
    type: "Mountain Pass",
    mood: "Alpine",
    description: "Austria's iconic alpine road through dramatic peaks, glaciers and switchbacks.",
  },
  {
    id: "3",
    title: "Trollstigen",
    country: "Norway",
    distance_km: 27,
    image_url: "/trollstigen.jpg",
    duration: "1-2 Hours",
    type: "Scenic Pass",
    mood: "Adventure",
    description: "Eleven hairpin bends, steep cliffs and one of Norway's wildest road views.",
  },
  {
    id: "4",
    title: "Transfăgărășan",
    country: "Romania",
    distance_km: 90,
    image_url: "/transfagarasan.jpg",
    duration: "3-5 Hours",
    type: "Mountain Road",
    mood: "Epic",
    description: "A dramatic road through the Carpathians with tunnels, lakes and high-altitude views.",
  },
  {
    id: "5",
    title: "Stelvio Pass",
    country: "Italy",
    distance_km: 75,
    image_url: "/stelvio.jpg",
    duration: "2-3 Hours",
    type: "Hairpin Pass",
    mood: "Driving",
    description: "A legendary road with numbered hairpins and one of Europe's most famous climbs.",
  },
];

const FEATURE_ITEMS = [
  {
    number: "01",
    title: "Curated scenic roads",
    text: "Only routes with memorable views, strong driving character and clear route details.",
  },
  {
    number: "02",
    title: "Useful route info",
    text: "Distance, country, duration and route style help you choose faster.",
  },
  {
    number: "03",
    title: "Find by mood",
    text: "Coastal drives, mountain passes, weekend escapes or hidden gems.",
  },
];

const MOODS = [
  {
    title: "Mountain Passes",
    label: "Alpine roads",
    image: "/grossglockner.jpg",
    text: "High-altitude roads, switchbacks and dramatic viewpoints.",
  },
  {
    title: "Coastal Highways",
    label: "Ocean drives",
    image: "/pacific.jpg",
    text: "Sea breeze, cliffs and long roads made for golden-hour drives.",
  },
  {
    title: "Weekend Escapes",
    label: "Short trips",
    image: "/trollstigen.jpg",
    text: "Routes that feel special without needing a long vacation.",
  },
  {
    title: "Hidden Gems",
    label: "Quiet roads",
    image: "/transfagarasan.jpg",
    text: "Less obvious roads with unforgettable atmosphere.",
  },
];

const FOOTER_LINKS = {
  Routes: ["All Routes", "Coastal Roads", "Mountain Passes", "Road Trips"],
  Destinations: ["Europe", "North America", "Scandinavia", "Alps"],
  Discover: ["Hidden Gems", "Weekend Escapes", "Photo Spots", "Driving Roads"],
  About: ["Our Story", "FAQ", "Contact", "Privacy"],
};

type Route = {
  id: string;
  title: string;
  country: string;
  distance_km?: number;
  image_url?: string;
  duration?: string;
  type?: string;
  mood?: string;
  description?: string;
};

function RouteImage({ src, alt, className = "" }: { src?: string; alt: string; className?: string }) {
  return (
    <img
      src={src || "/iceland.jpg"}
      alt={alt}
      className={className}
      onError={(event) => {
        event.currentTarget.src = "/iceland.jpg";
      }}
    />
  );
}

function PrimaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="btn btn-primary">
      {children}
      <span>→</span>
    </Link>
  );
}

function SecondaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="btn btn-secondary">
      {children}
    </Link>
  );
}

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: React.ReactNode; text?: string }) {
  return (
    <div className="section-heading">
      <p>{eyebrow}</p>
      <h2>{title}</h2>
      {text && <span>{text}</span>}
    </div>
  );
}

function FeaturedCard({ route, index }: { route: Route; index: number }) {
  return (
    <Link href={`/routedetail/${route.id}`} className={`featured-route featured-route-${index + 1}`}>
      <RouteImage src={route.image_url} alt={route.title} />
      <div className="image-gradient" />
      <div className="featured-route-top">
        <span>0{index + 1}</span>
        <p>{route.type || "Scenic Route"}</p>
      </div>
      <div className="featured-route-bottom">
        <h3>{route.title}</h3>
        <div className="route-meta">
          <span>{route.country}</span>
          <span>{route.distance_km ?? "—"} km</span>
          <span>{route.duration || "Plan trip"}</span>
        </div>
        <p>{route.description}</p>
      </div>
    </Link>
  );
}

function CompactRouteCard({ route, index }: { route: Route; index: number }) {
  return (
    <Link href={`/routedetail/${route.id}`} className="compact-route-card">
      <RouteImage src={route.image_url} alt={route.title} />
      <div className="image-gradient" />
      <span className="compact-index">0{index + 1}</span>
      <div className="compact-content">
        <h3>{route.title}</h3>
        <div>
          <span>{route.country}</span>
          <span>{route.distance_km ?? "—"} km</span>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [user, setUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [activeSlide, setActiveSlide] = useState(0);

  const displayRoutes = useMemo(() => (routes.length ? routes : FALLBACK_ROUTES), [routes]);
  const heroRoute = displayRoutes[activeSlide % displayRoutes.length];
  const navScrolled = scrollY > 60;

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
      .limit(5)
      .then(({ data }) => {
        if (!mounted) return;
        setRoutes(data?.length ? data : FALLBACK_ROUTES);
      });

    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });

    const interval = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 5);
    }, 5500);

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      window.removeEventListener("scroll", onScroll);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setAvatarUrl("");
      return;
    }

    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setAvatarUrl(data?.avatar_url || ""));
  }, [user]);

  const handleNewsletter = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    const { error } = await supabase.from("newsletter_subscribers").insert({
      email: cleanEmail,
      created_at: new Date().toISOString(),
    });

    if (!error) {
      setEmailSent(true);
      setEmail("");
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=Inter:wght@300;400;500;600;700;800&display=swap');

        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        :root {
          --dark: #0b0a08;
          --dark-2: #12100d;
          --dark-3: #1a1611;
          --cream: #f2eadc;
          --muted: rgba(242,234,220,0.56);
          --soft: rgba(242,234,220,0.34);
          --faint: rgba(242,234,220,0.18);
          --border: rgba(242,234,220,0.1);
          --accent: #c9a86a;
          --accent-soft: rgba(201,168,106,0.14);
          --serif: 'Cormorant Garamond', Georgia, serif;
          --sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          background: var(--dark);
          overflow-x: hidden;
        }

        a {
          color: inherit;
        }

        button,
        input {
          font: inherit;
        }

        button {
          border: none;
        }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(circle at 18% 0%, rgba(201,168,106,0.13), transparent 30rem),
            radial-gradient(circle at 90% 32%, rgba(242,234,220,0.05), transparent 28rem),
            var(--dark);
          color: var(--cream);
          font-family: var(--sans);
        }

        .nav {
          position: fixed;
          inset: 0 0 auto 0;
          z-index: 1000;
          height: 74px;
          padding: 0 clamp(18px, 4vw, 56px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(11,10,8,0.22);
          backdrop-filter: blur(22px);
          border-bottom: 1px solid transparent;
          transition: height 0.3s ease, background 0.3s ease, border-color 0.3s ease;
        }

        .nav.scrolled {
          height: 64px;
          background: rgba(11,10,8,0.91);
          border-bottom-color: var(--border);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
        }

        .brand-mark {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(242,234,220,0.18);
          border-radius: 999px;
          background: rgba(242,234,220,0.04);
        }

        .brand-name {
          text-transform: uppercase;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.18em;
        }

        .desktop-nav {
          display: flex;
          gap: clamp(22px, 3vw, 44px);
        }

        .nav-link {
          position: relative;
          text-decoration: none;
          text-transform: uppercase;
          color: var(--muted);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.16em;
          transition: color 0.2s ease;
        }

        .nav-link::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: -8px;
          height: 1px;
          transform: scaleX(0);
          transform-origin: right;
          background: var(--accent);
          transition: transform 0.24s ease;
        }

        .nav-link:hover {
          color: var(--cream);
        }

        .nav-link:hover::after {
          transform: scaleX(1);
          transform-origin: left;
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .nav-pill {
          padding: 10px 18px;
          border: 1px solid rgba(242,234,220,0.22);
          border-radius: 999px;
          color: var(--cream);
          text-decoration: none;
          text-transform: uppercase;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.16em;
          background: rgba(242,234,220,0.04);
          transition: all 0.22s ease;
        }

        .nav-pill:hover {
          background: var(--cream);
          color: var(--dark);
          border-color: var(--cream);
        }

        .round-button {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          border: 1px solid rgba(242,234,220,0.14);
          background: rgba(242,234,220,0.055);
          color: var(--cream);
          cursor: pointer;
          transition: background 0.2s ease, transform 0.2s ease;
        }

        .round-button:hover {
          background: rgba(242,234,220,0.1);
          transform: translateY(-1px);
        }

        .avatar-button {
          overflow: hidden;
          font-size: 13px;
          font-weight: 800;
        }

        .avatar-button img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .user-menu {
          position: absolute;
          top: 48px;
          right: 0;
          width: 210px;
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: rgba(18,16,13,0.97);
          box-shadow: 0 28px 80px rgba(0,0,0,0.45);
        }

        .user-menu p {
          padding: 13px 16px;
          border-bottom: 1px solid var(--border);
          color: var(--soft);
          font-size: 11px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .user-menu a,
        .user-menu button {
          display: block;
          width: 100%;
          padding: 13px 16px;
          color: var(--cream);
          text-align: left;
          text-decoration: none;
          background: transparent;
          cursor: pointer;
          font-size: 13px;
        }

        .user-menu a:hover,
        .user-menu button:hover {
          background: rgba(242,234,220,0.06);
        }

        .user-menu button {
          color: #ef8c80;
        }

        .mobile-toggle {
          display: none;
        }

        .mobile-menu {
          display: none;
          position: fixed;
          top: 76px;
          left: 16px;
          right: 16px;
          z-index: 999;
          padding: 14px;
          border: 1px solid var(--border);
          border-radius: 22px;
          background: rgba(18,16,13,0.98);
          backdrop-filter: blur(22px);
          box-shadow: 0 28px 90px rgba(0,0,0,0.55);
        }

        .mobile-menu.open {
          display: grid;
          gap: 4px;
        }

        .mobile-menu a,
        .mobile-menu button {
          padding: 13px 14px;
          border-radius: 14px;
          color: var(--cream);
          text-decoration: none;
          text-align: left;
          text-transform: uppercase;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.1em;
          background: transparent;
        }

        .mobile-menu a:hover,
        .mobile-menu button:hover {
          background: rgba(242,234,220,0.06);
        }

        .hero {
          position: relative;
          min-height: 100svh;
          display: grid;
          place-items: center;
          overflow: hidden;
          isolation: isolate;
        }

        .hero-bg {
          position: absolute;
          inset: 0;
          z-index: -3;
        }

        .hero-bg img {
          width: 100%;
          height: 112%;
          object-fit: cover;
          filter: brightness(0.52) saturate(0.95);
          transform: translateY(var(--parallax)) scale(1.02);
          transition: opacity 0.9s ease;
        }

        .hero-bg::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 50% 42%, transparent 0, rgba(11,10,8,0.1) 28%, rgba(11,10,8,0.76) 86%),
            linear-gradient(to bottom, rgba(11,10,8,0.52), rgba(11,10,8,0.1) 34%, rgba(11,10,8,0.82) 82%, var(--dark));
        }

        .hero-grid {
          position: absolute;
          inset: 0;
          z-index: -2;
          opacity: 0.16;
          background-image: linear-gradient(rgba(242,234,220,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(242,234,220,0.08) 1px, transparent 1px);
          background-size: 72px 72px;
          mask-image: linear-gradient(to bottom, transparent, black 20%, black 72%, transparent);
        }

        .hero-content {
          width: min(980px, calc(100% - 32px));
          padding-top: 62px;
          text-align: center;
          animation: fadeUp 0.9s ease both;
        }

        .label {
          color: var(--soft);
          text-transform: uppercase;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.42em;
        }

        .hero h1 {
          margin: 12px 0 26px;
          font-family: var(--serif);
          font-size: clamp(72px, 15vw, 186px);
          font-weight: 300;
          font-style: italic;
          line-height: 0.82;
          letter-spacing: -0.06em;
          background: linear-gradient(to bottom, #fff8ec 0%, rgba(242,234,220,0.34) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-copy {
          max-width: 560px;
          margin: 0 auto 34px;
          color: var(--muted);
          font-size: clamp(14px, 1.45vw, 17px);
          font-weight: 300;
          line-height: 1.85;
        }

        .hero-actions,
        .journey-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .btn {
          min-height: 50px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 0 28px;
          border-radius: 999px;
          text-decoration: none;
          text-transform: uppercase;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.17em;
          transition: transform 0.24s ease, background 0.24s ease, border-color 0.24s ease, color 0.24s ease;
        }

        .btn:hover {
          transform: translateY(-2px);
        }

        .btn-primary {
          border: 1px solid var(--cream);
          background: var(--cream);
          color: var(--dark);
        }

        .btn-primary:hover {
          border-color: var(--accent);
          background: var(--accent);
        }

        .btn-secondary {
          border: 1px solid rgba(242,234,220,0.22);
          background: rgba(242,234,220,0.06);
          color: var(--cream);
          backdrop-filter: blur(12px);
        }

        .btn-secondary:hover {
          border-color: rgba(242,234,220,0.4);
          background: rgba(242,234,220,0.11);
        }

        .hero-route-card {
          position: absolute;
          right: clamp(18px, 4vw, 56px);
          bottom: clamp(24px, 5vw, 58px);
          width: min(340px, calc(100% - 36px));
          padding: 18px;
          border: 1px solid rgba(242,234,220,0.14);
          border-radius: 26px;
          background: rgba(11,10,8,0.5);
          backdrop-filter: blur(18px);
          box-shadow: 0 26px 80px rgba(0,0,0,0.4);
        }

        .hero-route-card p:first-child {
          margin-bottom: 8px;
          color: var(--accent);
          text-transform: uppercase;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.22em;
        }

        .hero-route-card h3 {
          margin-bottom: 12px;
          font-family: var(--serif);
          font-size: 30px;
          font-weight: 400;
          font-style: italic;
          line-height: 1;
        }

        .hero-route-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .hero-route-meta span,
        .route-meta span {
          padding: 7px 9px;
          border: 1px solid rgba(242,234,220,0.12);
          border-radius: 999px;
          color: rgba(242,234,220,0.72);
          background: rgba(242,234,220,0.045);
          text-transform: uppercase;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .hero-dots {
          position: absolute;
          left: clamp(18px, 4vw, 52px);
          top: 50%;
          transform: translateY(-50%);
          display: grid;
          gap: 4px;
        }

        .hero-dots button {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 0;
          color: rgba(242,234,220,0.26);
          background: transparent;
          cursor: pointer;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.16em;
          transition: color 0.2s ease;
        }

        .hero-dots button.active,
        .hero-dots button:hover {
          color: var(--cream);
        }

        .hero-dots span {
          width: 1px;
          height: 30px;
          background: transparent;
          transition: background 0.2s ease;
        }

        .hero-dots button.active span {
          background: var(--accent);
        }

        .section {
          padding: clamp(76px, 9vw, 122px) clamp(18px, 5vw, 60px);
        }

        .container {
          width: min(1280px, 100%);
          margin: 0 auto;
        }

        .section-heading {
          max-width: 620px;
        }

        .section-heading.center {
          margin: 0 auto 42px;
          text-align: center;
        }

        .section-heading p {
          margin-bottom: 14px;
          color: var(--accent);
          text-transform: uppercase;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.28em;
        }

        .section-heading h2 {
          margin-bottom: 18px;
          font-family: var(--serif);
          font-size: clamp(42px, 5.5vw, 72px);
          font-weight: 300;
          font-style: italic;
          line-height: 0.95;
          letter-spacing: -0.04em;
        }

        .section-heading span {
          display: block;
          color: var(--muted);
          font-size: 14px;
          font-weight: 300;
          line-height: 1.85;
        }

        .features-band {
          padding: 54px clamp(18px, 5vw, 60px);
          border-block: 1px solid var(--border);
          background: linear-gradient(90deg, var(--dark-2), #18140f, var(--dark-2));
        }

        .features-grid {
          width: min(1280px, 100%);
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }

        .feature-item {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 16px;
          padding: 22px;
          border: 1px solid var(--border);
          border-radius: 24px;
          background: rgba(242,234,220,0.032);
        }

        .feature-item strong {
          color: var(--accent);
          font-family: var(--serif);
          font-size: 32px;
          font-weight: 300;
          line-height: 1;
        }

        .feature-item h3 {
          margin-bottom: 7px;
          text-transform: uppercase;
          color: rgba(242,234,220,0.78);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.2em;
        }

        .feature-item p {
          color: rgba(242,234,220,0.38);
          font-size: 12px;
          font-weight: 300;
          line-height: 1.7;
        }

        .popular-section {
          background:
            radial-gradient(circle at 72% 22%, rgba(201,168,106,0.1), transparent 26rem),
            var(--dark);
        }

        .popular-layout {
          display: grid;
          grid-template-columns: minmax(260px, 360px) 1fr;
          gap: clamp(34px, 6vw, 82px);
          align-items: center;
        }

        .popular-copy {
          align-self: center;
        }

        .popular-copy .section-heading {
          margin-bottom: 28px;
        }

        .popular-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
          margin-bottom: 28px;
        }

        .popular-tags span {
          padding: 8px 11px;
          border: 1px solid var(--border);
          border-radius: 999px;
          color: rgba(242,234,220,0.64);
          background: rgba(242,234,220,0.04);
          text-transform: uppercase;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.14em;
        }

        .popular-showcase {
          display: grid;
          grid-template-columns: 1.25fr 0.75fr;
          gap: 18px;
          min-height: 620px;
        }

        .popular-main-card,
        .popular-side-card {
          position: relative;
          display: block;
          overflow: hidden;
          border: 1px solid var(--border);
          background: var(--dark-3);
          text-decoration: none;
          box-shadow: 0 32px 110px rgba(0,0,0,0.42);
          isolation: isolate;
        }

        .popular-main-card {
          border-radius: 36px;
        }

        .popular-side-grid {
          display: grid;
          grid-template-rows: 1fr 1fr;
          gap: 18px;
        }

        .popular-side-card {
          border-radius: 28px;
        }

        .popular-main-card img,
        .popular-side-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.85s ease, filter 0.85s ease;
        }

        .popular-main-card:hover img,
        .popular-side-card:hover img {
          transform: scale(1.055);
          filter: saturate(1.08);
        }

        .popular-card-gradient {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(to bottom, rgba(0,0,0,0.5), transparent 38%, rgba(0,0,0,0.88)),
            linear-gradient(to right, rgba(0,0,0,0.18), transparent 55%);
          z-index: 1;
        }

        .popular-card-top {
          position: absolute;
          top: 22px;
          left: 22px;
          right: 22px;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          gap: 16px;
        }

        .popular-card-top span,
        .popular-card-top p {
          color: rgba(255,255,255,0.68);
          text-transform: uppercase;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.18em;
        }

        .popular-card-content {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 2;
          padding: clamp(22px, 3vw, 34px);
        }

        .popular-card-content h3 {
          max-width: 620px;
          margin-bottom: 14px;
          color: white;
          font-family: var(--serif);
          font-size: clamp(34px, 5vw, 70px);
          font-weight: 400;
          line-height: 0.9;
          letter-spacing: -0.045em;
          text-shadow: 0 14px 40px rgba(0,0,0,0.55);
        }

        .popular-side-card .popular-card-content h3 {
          font-size: clamp(27px, 2.8vw, 38px);
          line-height: 0.96;
        }

        .popular-main-card .popular-card-content > p {
          max-width: 480px;
          margin-top: 15px;
          color: rgba(255,255,255,0.68);
          font-size: 13px;
          font-weight: 300;
          line-height: 1.75;
        }

        .featured-header {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 26px;
          margin-bottom: 42px;
        }

        .featured-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
          align-items: start;
        }

        .featured-route {
          position: relative;
          height: 560px;
          display: block;
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 32px;
          background: var(--dark-3);
          text-decoration: none;
          box-shadow: 0 28px 90px rgba(0,0,0,0.42);
          transform: translateY(var(--offset));
          transition: transform 0.45s cubic-bezier(0.25,0.46,0.45,0.94), box-shadow 0.45s ease;
        }

        .featured-route-1 { --offset: 70px; }
        .featured-route-2 { --offset: 0px; }
        .featured-route-3 { --offset: 110px; }

        .featured-route:hover {
          transform: translateY(calc(var(--offset) - 10px));
          box-shadow: 0 38px 110px rgba(0,0,0,0.56);
        }

        .featured-route img,
        .compact-route-card img,
        .mood-card img,
        .quote-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.8s ease;
        }

        .featured-route:hover img,
        .compact-route-card:hover img,
        .mood-card:hover img {
          transform: scale(1.06);
        }

        .image-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(0,0,0,0.5), transparent 38%, rgba(0,0,0,0.86));
        }

        .featured-route-top {
          position: absolute;
          inset: 24px 24px auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .featured-route-top span {
          color: rgba(255,255,255,0.72);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.14em;
        }

        .featured-route-top p {
          color: rgba(255,255,255,0.62);
          text-transform: uppercase;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.18em;
        }

        .featured-route-bottom {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 24px;
        }

        .featured-route h3 {
          margin-bottom: 12px;
          color: white;
          font-family: var(--serif);
          font-size: clamp(30px, 3.4vw, 48px);
          font-weight: 400;
          line-height: 0.95;
          letter-spacing: -0.03em;
        }

        .route-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-bottom: 15px;
        }

        .featured-route-bottom > p {
          max-width: 320px;
          color: rgba(255,255,255,0.66);
          font-size: 13px;
          font-weight: 300;
          line-height: 1.7;
        }

        .route-strip {
          padding-top: 42px;
        }

        .compact-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }

        .compact-route-card {
          position: relative;
          aspect-ratio: 3 / 4;
          display: block;
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 24px;
          background: var(--dark-3);
          text-decoration: none;
        }

        .compact-index {
          position: absolute;
          top: 16px;
          left: 16px;
          color: rgba(255,255,255,0.5);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .compact-content {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 18px;
        }

        .compact-content h3 {
          margin-bottom: 8px;
          color: white;
          font-family: var(--serif);
          font-size: 26px;
          font-weight: 400;
          line-height: 1;
        }

        .compact-content div {
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .compact-content span {
          color: rgba(255,255,255,0.5);
          text-transform: uppercase;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.13em;
        }

        .mood-section {
          border-block: 1px solid var(--border);
          background:
            radial-gradient(circle at 15% 42%, rgba(201,168,106,0.13), transparent 28rem),
            linear-gradient(135deg, var(--dark-2), #100f0d 58%, var(--dark));
        }

        .mood-layout {
          display: grid;
          grid-template-columns: 0.8fr 1.2fr;
          gap: clamp(34px, 6vw, 80px);
          align-items: center;
        }

        .mood-copy {
          max-width: 470px;
        }

        .mood-copy .section-heading {
          margin-bottom: 32px;
        }

        .mood-points {
          display: grid;
          gap: 12px;
        }

        .mood-point {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--muted);
          font-size: 13px;
        }

        .mood-point span {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--accent);
          box-shadow: 0 0 0 6px var(--accent-soft);
        }

        .mood-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }

        .mood-card {
          position: relative;
          min-height: 290px;
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 28px;
          background: var(--dark-3);
          box-shadow: 0 28px 90px rgba(0,0,0,0.34);
        }

        .mood-card::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.86), rgba(0,0,0,0.1) 58%, transparent);
        }

        .mood-card-content {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1;
          padding: 20px;
        }

        .mood-card-content span {
          display: block;
          margin-bottom: 8px;
          color: var(--accent);
          text-transform: uppercase;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.2em;
        }

        .mood-card-content h3 {
          margin-bottom: 8px;
          color: white;
          font-family: var(--serif);
          font-size: 34px;
          font-weight: 400;
          line-height: 1;
        }

        .mood-card-content p {
          color: rgba(255,255,255,0.6);
          font-size: 12px;
          font-weight: 300;
          line-height: 1.6;
        }

        .quote-new {
          position: relative;
          min-height: 560px;
          padding: clamp(96px, 12vw, 170px) clamp(18px, 5vw, 60px);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          isolation: isolate;
        }

        .quote-image {
          position: absolute;
          inset: 0;
          z-index: -2;
        }

        .quote-image::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 50% 50%, rgba(0,0,0,0.1), rgba(0,0,0,0.76)),
            rgba(0,0,0,0.38);
        }

        .quote-content {
          max-width: 1100px;
          text-align: center;
        }

        .quote-content h2 {
          color: white;
          font-family: var(--serif);
          font-size: clamp(46px, 8vw, 104px);
          font-weight: 300;
          font-style: italic;
          line-height: 0.94;
          letter-spacing: -0.055em;
          text-shadow: 0 22px 55px rgba(0,0,0,0.72);
        }

        .quote-content p {
          margin: 24px auto 0;
          max-width: 560px;
          color: rgba(255,255,255,0.66);
          font-size: 14px;
          font-weight: 300;
          line-height: 1.8;
        }

        .newsletter {
          background: linear-gradient(135deg, var(--dark-2), #1b1711);
          border-top: 1px solid var(--border);
        }

        .newsletter-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(36px, 7vw, 88px);
          align-items: center;
        }

        .newsletter-copy {
          max-width: 440px;
          margin: 24px 0 30px;
          color: var(--muted);
          font-size: 14px;
          font-weight: 300;
          line-height: 1.85;
        }

        .newsletter-form {
          max-width: 470px;
          display: flex;
        }

        .newsletter-form input {
          min-width: 0;
          flex: 1;
          padding: 15px 20px;
          border: 1px solid var(--border);
          border-right: none;
          border-radius: 999px 0 0 999px;
          outline: none;
          color: var(--cream);
          background: rgba(11,10,8,0.42);
          font-size: 14px;
          font-weight: 300;
        }

        .newsletter-form button {
          width: 58px;
          border-radius: 0 999px 999px 0;
          color: var(--dark);
          background: var(--cream);
          cursor: pointer;
          font-size: 18px;
          font-weight: 800;
          transition: background 0.22s ease;
        }

        .newsletter-form button:hover {
          background: var(--accent);
        }

        .newsletter-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }

        .newsletter-stat {
          padding: 26px 22px;
          border: 1px solid var(--border);
          border-radius: 24px;
          background: rgba(242,234,220,0.035);
        }

        .newsletter-stat strong {
          display: block;
          margin-bottom: 8px;
          color: var(--accent);
          font-family: var(--serif);
          font-size: 46px;
          font-weight: 300;
          line-height: 1;
        }

        .newsletter-stat span {
          color: rgba(242,234,220,0.38);
          text-transform: uppercase;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.2em;
        }

        .footer {
          padding: 56px clamp(18px, 5vw, 60px) 30px;
          border-top: 1px solid var(--border);
          background: var(--dark);
        }

        .footer-top {
          display: grid;
          grid-template-columns: 1.5fr repeat(4, 1fr);
          gap: clamp(28px, 4vw, 52px);
          padding-bottom: 46px;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border);
        }

        .footer-text {
          max-width: 260px;
          margin: 16px 0 22px;
          color: rgba(242,234,220,0.34);
          font-size: 12px;
          font-weight: 300;
          line-height: 1.75;
        }

        .socials {
          display: flex;
          gap: 8px;
        }

        .socials a {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border: 1px solid var(--border);
          border-radius: 999px;
          color: rgba(242,234,220,0.34);
          text-decoration: none;
          font-size: 9px;
          font-weight: 800;
          transition: all 0.2s ease;
        }

        .socials a:hover {
          color: var(--dark);
          background: var(--accent);
          border-color: var(--accent);
        }

        .footer-column h3 {
          margin-bottom: 16px;
          color: rgba(242,234,220,0.4);
          text-transform: uppercase;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.24em;
        }

        .footer-column a {
          display: block;
          margin-bottom: 12px;
          color: rgba(242,234,220,0.31);
          text-decoration: none;
          font-size: 12px;
          font-weight: 300;
          transition: color 0.2s ease;
        }

        .footer-column a:hover {
          color: var(--cream);
        }

        .footer-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          color: rgba(242,234,220,0.23);
          font-size: 11px;
          font-weight: 300;
        }

        .footer-bottom div {
          display: flex;
          gap: 22px;
        }

        .footer-bottom a {
          color: rgba(242,234,220,0.23);
          text-decoration: none;
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 1100px) {
          .desktop-nav,
          .nav-pill {
            display: none;
          }

          .mobile-toggle {
            display: grid;
          }

          .features-grid,
          .featured-grid,
          .popular-layout,
          .popular-showcase,
          .mood-layout,
          .newsletter-layout {
            grid-template-columns: 1fr;
          }

          .popular-showcase {
            min-height: auto;
          }

          .popular-main-card {
            min-height: 560px;
          }

          .popular-side-grid {
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: none;
          }

          .popular-side-card {
            min-height: 330px;
          }

          .featured-route,
          .featured-route:hover {
            height: 500px;
            transform: none;
          }

          .compact-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .footer-top {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 760px) {
          .nav {
            height: 66px;
          }

          .brand-name {
            font-size: 10px;
          }

          .hero {
            min-height: 94svh;
          }

          .hero-dots,
          .hero-route-card {
            display: none;
          }

          .hero-content {
            padding-top: 48px;
          }

          .label {
            letter-spacing: 0.28em;
          }

          .hero h1 {
            font-size: clamp(68px, 24vw, 112px);
          }

          .hero-actions,
          .journey-actions {
            flex-direction: column;
          }

          .btn {
            width: min(100%, 330px);
          }

          .featured-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .featured-route {
            height: 430px;
          }

          .popular-main-card {
            min-height: 430px;
          }

          .popular-side-grid {
            grid-template-columns: 1fr;
          }

          .popular-side-card {
            min-height: 280px;
          }

          .popular-card-content h3 {
            font-size: clamp(34px, 13vw, 54px);
          }

          .compact-grid,
          .mood-grid,
          .newsletter-stats {
            grid-template-columns: 1fr;
          }

          .mood-card {
            min-height: 260px;
          }

          .quote-new {
            min-height: 440px;
          }

          .footer-top {
            grid-template-columns: 1fr;
          }

          .footer-bottom {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 460px) {
          .newsletter-form {
            flex-direction: column;
            gap: 10px;
          }

          .newsletter-form input,
          .newsletter-form button {
            width: 100%;
            height: 50px;
            border: 1px solid var(--border);
            border-radius: 999px;
          }
        }
      `}</style>

      <main className="page">
        <nav className={`nav ${navScrolled ? "scrolled" : ""}`}>
          <Link href="/" className="brand" aria-label="Scenic Routes Home">
            <span className="brand-mark">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M8 2L9.2 6.8L14 8L9.2 9.2L8 14L6.8 9.2L2 8L6.8 6.8Z"
                  stroke="rgba(242,234,220,0.72)"
                  strokeWidth="1"
                  fill="none"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="brand-name">Scenic Routes</span>
          </Link>

          <div className="desktop-nav">
            {[
              ["Routes", "/explore"],
              ["Destinations", "/explore"],
              ["Hidden Gems", "/explore"],
              ["About", "/about"],
            ].map(([label, href]) => (
              <Link key={label} href={href} className="nav-link">
                {label}
              </Link>
            ))}
          </div>

          <div className="nav-actions">
            <Link href="/explore" className="nav-pill">
              Explore Routes
            </Link>

            {user ? (
              <div style={{ position: "relative" }}>
                <button className="round-button avatar-button" onClick={() => setShowUserMenu((prev) => !prev)} aria-label="Open user menu">
                  {avatarUrl ? <img src={avatarUrl} alt="User avatar" /> : user.email?.[0]?.toUpperCase()}
                </button>

                {showUserMenu && (
                  <div className="user-menu">
                    <p>{user.email}</p>
                    <Link href="/profile" onClick={() => setShowUserMenu(false)}>
                      Profile
                    </Link>
                    <Link href="/my-trips" onClick={() => setShowUserMenu(false)}>
                      My Trips
                    </Link>
                    <button
                      onClick={async () => {
                        await supabase.auth.signOut();
                        setUser(null);
                        setShowUserMenu(false);
                      }}
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button className="round-button" onClick={() => setIsAuthOpen(true)} aria-label="Open login">
                ↗
              </button>
            )}

            <button className="round-button mobile-toggle" onClick={() => setShowMobileMenu((prev) => !prev)} aria-label="Open mobile menu">
              ☰
            </button>
          </div>
        </nav>

        <div className={`mobile-menu ${showMobileMenu ? "open" : ""}`}>
          <Link href="/explore" onClick={() => setShowMobileMenu(false)}>
            Routes
          </Link>
          <Link href="/explore" onClick={() => setShowMobileMenu(false)}>
            Destinations
          </Link>
          <Link href="/explore" onClick={() => setShowMobileMenu(false)}>
            Hidden Gems
          </Link>
          <Link href="/about" onClick={() => setShowMobileMenu(false)}>
            About
          </Link>
          {!user && (
            <button
              onClick={() => {
                setShowMobileMenu(false);
                setIsAuthOpen(true);
              }}
            >
              Login
            </button>
          )}
        </div>

        <section className="hero">
          <div className="hero-bg" style={{ "--parallax": `${scrollY * 0.22}px` } as React.CSSProperties}>
            <RouteImage src={heroRoute?.image_url} alt={heroRoute?.title || "Scenic road"} />
          </div>
          <div className="hero-grid" />

          <div className="hero-dots" aria-label="Hero route selector">
            {displayRoutes.slice(0, 5).map((_, index) => (
              <button key={index} className={index === activeSlide % 5 ? "active" : ""} onClick={() => setActiveSlide(index)}>
                0{index + 1}
                <span />
              </button>
            ))}
          </div>

          <div className="hero-content">
            <p className="label">Curated roads · unforgettable drives</p>
            <h1>Scenic Routes</h1>
            <p className="hero-copy">
              Discover mountain passes, coastal highways and hidden roads — with clear route details for your next unforgettable drive.
            </p>
            <div className="hero-actions">
              <PrimaryButton href="/explore">Explore Routes</PrimaryButton>
              <SecondaryButton href="/explore">Find by Mood</SecondaryButton>
            </div>
          </div>

          <div className="hero-route-card">
            <p>Featured route</p>
            <h3>{heroRoute?.title}</h3>
            <div className="hero-route-meta">
              <span>{heroRoute?.country}</span>
              <span>{heroRoute?.distance_km ?? "—"} km</span>
              <span>{heroRoute?.duration || "Plan trip"}</span>
            </div>
          </div>
        </section>

        <section className="features-band">
          <div className="features-grid">
            {FEATURE_ITEMS.map((item) => (
              <article className="feature-item" key={item.title}>
                <strong>{item.number}</strong>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section popular-section">
          <div className="container popular-layout">
            <div className="popular-copy">
              <SectionHeading
                eyebrow="Popular destinations"
                title={
                  <>
                    Where the drive
                    <br /> becomes the destination.
                  </>
                }
                text="A cleaner selection of standout routes — less clutter, stronger visuals and more useful route information at first glance."
              />

              <div className="popular-tags">
                <span>Mountain Passes</span>
                <span>Coastal Roads</span>
                <span>Weekend Escapes</span>
              </div>

              <SecondaryButton href="/explore">View All Routes</SecondaryButton>
            </div>

            <div className="popular-showcase">
              <Link href={`/routedetail/${displayRoutes[0]?.id}`} className="popular-main-card">
                <RouteImage src={displayRoutes[0]?.image_url} alt={displayRoutes[0]?.title || "Popular route"} />
                <div className="popular-card-gradient" />
                <div className="popular-card-top">
                  <span>01</span>
                  <p>{displayRoutes[0]?.type || "Scenic Route"}</p>
                </div>
                <div className="popular-card-content">
                  <h3>{displayRoutes[0]?.title}</h3>
                  <div className="route-meta">
                    <span>{displayRoutes[0]?.country}</span>
                    <span>{displayRoutes[0]?.distance_km ?? "—"} km</span>
                    <span>{displayRoutes[0]?.duration || "Plan trip"}</span>
                  </div>
                  <p>{displayRoutes[0]?.description}</p>
                </div>
              </Link>

              <div className="popular-side-grid">
                {displayRoutes.slice(1, 3).map((route, index) => (
                  <Link href={`/routedetail/${route.id}`} className="popular-side-card" key={route.id}>
                    <RouteImage src={route.image_url} alt={route.title} />
                    <div className="popular-card-gradient" />
                    <div className="popular-card-top">
                      <span>0{index + 2}</span>
                      <p>{route.type || "Scenic Route"}</p>
                    </div>
                    <div className="popular-card-content">
                      <h3>{route.title}</h3>
                      <div className="route-meta">
                        <span>{route.country}</span>
                        <span>{route.distance_km ?? "—"} km</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section mood-section">
          <div className="container mood-layout">
            <div className="mood-copy">
              <SectionHeading
                eyebrow="Find by mood"
                title={
                  <>
                    Choose the drive,
                    <br /> not just the destination.
                  </>
                }
                text="Instead of searching randomly, start with the kind of road you want to experience."
              />
              <div className="mood-points">
                <div className="mood-point">
                  <span /> Mountain roads with dramatic turns
                </div>
                <div className="mood-point">
                  <span /> Coastal routes for relaxed long drives
                </div>
                <div className="mood-point">
                  <span /> Short escapes for weekends
                </div>
              </div>
            </div>

            <div className="mood-grid">
              {MOODS.map((mood) => (
                <article className="mood-card" key={mood.title}>
                  <RouteImage src={mood.image} alt={mood.title} />
                  <div className="mood-card-content">
                    <span>{mood.label}</span>
                    <h3>{mood.title}</h3>
                    <p>{mood.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="quote-new">
          <div className="quote-image">
            <img src="/roadimage.avif" alt="Open Road" />
          </div>
          <div className="quote-content">
            <h2>
              Every road has
              <br /> a story.
              <br /> Find yours.
            </h2>
            <p>From alpine switchbacks to quiet coastal roads — your next route starts with a feeling.</p>
          </div>
        </section>

        <section className="section newsletter">
          <div className="container newsletter-layout">
            <div>
              <SectionHeading
                eyebrow="Stay inspired"
                title={
                  <>
                    Never miss a
                    <br /> great road.
                  </>
                }
              />
              <p className="newsletter-copy">
                Get selected scenic routes, hidden roads and weekend-drive ideas directly in your inbox.
              </p>
              <form className="newsletter-form" onSubmit={handleNewsletter}>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  placeholder={emailSent ? "✓ You're subscribed!" : "your@email.com"}
                  aria-label="Email address"
                />
                <button type="submit" aria-label="Subscribe to newsletter">
                  →
                </button>
              </form>
            </div>

            <div className="newsletter-stats">
              {[
                ["500+", "Curated Routes"],
                ["48", "Countries"],
                ["12K+", "Explorers"],
                ["4.9★", "Average Rating"],
              ].map(([number, label]) => (
                <div className="newsletter-stat" key={label}>
                  <strong>{number}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="footer">
          <div className="container">
            <div className="footer-top">
              <div>
                <Link href="/" className="brand">
                  <span className="brand-mark">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path
                        d="M8 2L9.2 6.8L14 8L9.2 9.2L8 14L6.8 9.2L2 8L6.8 6.8Z"
                        stroke="rgba(242,234,220,0.62)"
                        strokeWidth="1"
                        fill="none"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span className="brand-name">Scenic Routes</span>
                </Link>
                <p className="footer-text">Curated scenic roads for people who love the journey as much as the destination.</p>
                <div className="socials">
                  {[
                    ["IG", "#"],
                    ["YT", "#"],
                    ["TW", "#"],
                  ].map(([label, href]) => (
                    <a key={label} href={href}>
                      {label}
                    </a>
                  ))}
                </div>
              </div>

              {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
                <div className="footer-column" key={heading}>
                  <h3>{heading}</h3>
                  {links.map((link) => (
                    <a href="#" key={link}>
                      {link}
                    </a>
                  ))}
                </div>
              ))}
            </div>

            <div className="footer-bottom">
              <p>© {new Date().getFullYear()} Scenic Routes. All rights reserved.</p>
              <div>
                <a href="#">Privacy Policy</a>
                <a href="#">Terms of Use</a>
              </div>
            </div>
          </div>
        </footer>
      </main>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}
