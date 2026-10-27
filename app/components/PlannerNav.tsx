"use client";

// Navigation für Route Planner (/plan) und Trip Builder (/trip).
//
// Nutzt ausschliesslich die bestehenden .pp-nav-* / .pp-mobile-* Klassen aus
// app/profile/profile.css — also dasselbe Markup-Muster wie Profile und
// Support, inklusive Hamburger-Popup unter 760px. Kein eigenes Farbschema.
//
// GEÄNDERT: Das Desktop-Dropdown kommt jetzt aus dem gemeinsamen
// <UserMenu /> (app/components/UserMenu.tsx) — identisch zur Startseite und
// allen anderen Seiten, inkl. Admin Panel für Admins. Das Hamburger-Menü
// bleibt hier und bekommt ebenfalls den Admin-Link.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Menu,
  X,
  Map as MapIcon,
  Compass,
  Info,
  LogOut,
  ChevronRight,
  User as UserIcon,
  ShieldCheck,
} from "lucide-react";
import { ThemeSwitch } from "./ThemeSwitch";
import { useLanguage } from "../LanguageContext";
import { useAuth, signOutSafe } from "../../lib/useAuth";
import { supabase, safeQuery } from "../../lib/supabase";
import UserMenu from "./UserMenu";

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export default function PlannerNav({ activePath }: { activePath: string }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Avatar/Name für den Profilkopf im Hamburger-Menü
  const [avatarUrl, setAvatarUrl] = useState("");
  const [username, setUsername] = useState("");
  const displayName = username || user?.email?.split("@")[0] || "";
  const initial = (displayName[0] || user?.email?.[0] || "?").toUpperCase();
  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

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

  // NEU: Avatar und Username aus profiles laden — dieselbe Abfrage wie auf
  // /my-trips. Hängt an der User-ID, nicht am User-Objekt, damit ein
  // Token-Refresh keine erneute Abfrage auslöst.
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) {
      setAvatarUrl("");
      setUsername("");
      return;
    }

    let cancelled = false;
    (async () => {
      const data = await safeQuery<{ avatar_url: string | null; username: string | null }>(
        supabase.from("profiles").select("avatar_url, username").eq("id", userId).single(),
        "plannerNav.fetchProfile"
      );
      if (cancelled || !data) return;
      setAvatarUrl(data.avatar_url || "");
      setUsername(data.username || "");
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Wie auf /my-trips: nach dem Abmelden zur Startseite. Auf /trip würde
  // ein Verbleiben sonst eine Seite ohne Berechtigung zeigen.
  async function handleLogout() {
    setMenuOpen(false);
    await signOutSafe();
    router.push("/");
  }

  const avatarContent = avatarUrl ? (
    <img src={avatarUrl} alt="avatar" onError={() => setAvatarUrl("")} />
  ) : (
    initial
  );

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
          <UserMenu loginHref={`/login?redirect=${encodeURIComponent(activePath)}`} />
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
          {/* NEU: Profilkopf im Mobile-Menü, wie auf /my-trips */}
          {user && (
            <div className="pn-ud-header pn-mobile-header">
              <div className="pn-ud-avatar">{avatarContent}</div>
              <div style={{ minWidth: 0 }}>
                <p className="pn-ud-name">{displayName}</p>
                <p className="pn-ud-email">{user.email}</p>
                <p className="pn-ud-role">{t("common.roleExplorer")}</p>
              </div>
            </div>
          )}

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

            {user && (
              <Link
                href="/profile"
                className={`pp-mobile-link ${activePath === "/profile" ? "active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                <span className="pp-mobile-link-icon"><UserIcon size={14} strokeWidth={1.8} /></span>
                {t("nav.profile")}
                <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
              </Link>
            )}

            {isAdmin && (
              <Link
                href="/admin"
                className={`pp-mobile-link ${activePath === "/admin" ? "active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                <span className="pp-mobile-link-icon"><ShieldCheck size={14} strokeWidth={1.8} /></span>
                {t("nav.adminPanel")}
                <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
              </Link>
            )}

            <div className="pp-mobile-divider" />

            {user ? (
              <button className="pp-mobile-logout" onClick={handleLogout}>
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
        /* Profilkopf im Hamburger-Menü (Werte wie im UserMenu-Dropdown) */
        .pn-ud-header { padding:20px 20px 18px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:14px; }
        .pn-ud-avatar { width:46px; height:46px; border-radius:11px; border:1.5px solid var(--border); background:var(--bg2); display:flex; align-items:center; justify-content:center; font-family:var(--serif); font-size:22px; font-weight:700; color:var(--cream); flex-shrink:0; overflow:hidden; }
        .pn-ud-avatar img { width:100%; height:100%; object-fit:cover; display:block; }
        .pn-ud-name { margin:0; font-family:var(--serif); font-size:18px; font-weight:300; color:var(--cream); letter-spacing:-0.01em; line-height:1.2; }
        .pn-ud-email { margin:3px 0 0; font-size:10px; color:var(--dim); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px; }
        .pn-ud-role { margin:4px 0 0; font-size:8px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase; color:var(--gold); opacity:0.7; }
        .pn-mobile-header { padding-left:18px; padding-right:18px; }

        /* Mobile: Avatar/Login in der Leiste ausblenden, dafür Hamburger-Menü */
        @media (max-width:760px) {
          .pp-nav-right .um-wrap, .pp-nav-right .um-out { display:none; }
        }
      `}</style>
    </>
  );
}