"use client";

// Navigation für Route Planner (/plan) und Trip Builder (/trip).
//
// Nutzt ausschliesslich die bestehenden .pp-nav-* / .pp-mobile-* Klassen aus
// app/profile/profile.css — also dasselbe Markup-Muster wie Profile und
// Support, inklusive Hamburger-Popup unter 760px. Kein eigenes Farbschema.

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, X, Map as MapIcon, Compass, Info, LogOut, ChevronRight } from "lucide-react";
import { ThemeSwitch } from "./ThemeSwitch";
import { useLanguage } from "../LanguageContext";
import { useAuth, signOutSafe } from "../../lib/useAuth";

export default function PlannerNav({ activePath }: { activePath: string }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const links: { href: string; label: string; icon: ReactNode }[] = [
    { href: "/explore", label: t("nav.explore"), icon: <MapIcon size={14} strokeWidth={1.8} /> },
    { href: "/plan", label: t("nav.planTrip"), icon: <Compass size={14} strokeWidth={1.8} /> },
    { href: "/about", label: t("nav.about"), icon: <Info size={14} strokeWidth={1.8} /> },
  ];

  if (user) {
    links.push({
      href: "/my-trips",
      label: t("nav.myTrips"),
      icon: <MapIcon size={14} strokeWidth={1.8} />,
    });
  }

  return (
    <>
      <nav className={`pp-nav ${scrolled ? "scrolled" : ""}`}>
        <Link href="/" className="pp-nav-logo">
          <span>EXPLORE</span>
          <span>SCENIC</span>
          <span>ROUTES</span>
        </Link>

        <div className="pp-nav-links">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`pp-nav-link ${activePath === href ? "pp-nav-link-active" : ""}`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="pp-nav-right">
          {!user && (
            <Link href={`/login?redirect=${encodeURIComponent(activePath)}`} className="pn-login">
              {t("nav.login")}
            </Link>
          )}
          <ThemeSwitch />
        </div>

        <button
          className="pp-mobile-menu-btn mobile-only"
          onClick={() => setMenuOpen(true)}
          aria-label={t("nav.openMenu")}
        >
          <Menu size={20} strokeWidth={1.8} />
        </button>
      </nav>

      <div
        className={`pp-mobile-nav-backdrop ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen(false)}
      />

      <div className={`pp-mobile-nav-drawer ${menuOpen ? "open" : ""}`}>
        <div className="pp-mobile-nav-top">
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.18em", color: "var(--cream)" }}>
            EXPLORE SCENIC ROUTES
          </span>
          <button className="pp-mobile-nav-close" onClick={() => setMenuOpen(false)} aria-label="×">
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        <div className="pp-mobile-profile-card">
          <div className="pp-mobile-theme-row">
            <span className="pp-mobile-theme-label">{t("common.theme")}</span>
            <ThemeSwitch />
          </div>

          <div className="pp-mobile-links">
            {links.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                className={`pp-mobile-link ${activePath === href ? "active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                <span className="pp-mobile-link-icon">{icon}</span>
                {label}
                <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
              </Link>
            ))}

            <div className="pp-mobile-divider" />

            {user ? (
              <button
                className="pp-mobile-logout"
                onClick={() => {
                  setMenuOpen(false);
                  void signOutSafe();
                }}
              >
                <span className="pp-mobile-link-icon" style={{ color: "#e08080" }}>
                  <LogOut size={14} strokeWidth={1.8} />
                </span>
                {t("nav.signOut")}
              </button>
            ) : (
              <Link
                href={`/login?redirect=${encodeURIComponent(activePath)}`}
                className="pp-mobile-link"
                onClick={() => setMenuOpen(false)}
              >
                <span className="pp-mobile-link-icon">
                  <Compass size={14} strokeWidth={1.8} />
                </span>
                {t("nav.login")}
                <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
              </Link>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .pn-login { padding:10px 22px; margin-right:14px; border:1px solid var(--border); border-radius:999px; font-size:10px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:var(--cream); background:color-mix(in srgb, var(--border) 40%, transparent); transition:background .25s, color .25s; }
        .pn-login:hover { background:var(--cream); color:var(--bg); }
      `}</style>
    </>
  );
}
