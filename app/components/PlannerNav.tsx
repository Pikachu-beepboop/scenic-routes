"use client";

// Navigation für Route Planner (/plan) und Trip Builder (/trip).
//
// Nutzt ausschliesslich die bestehenden .pp-nav-* / .pp-mobile-* Klassen aus
// app/profile/profile.css — also dasselbe Markup-Muster wie Profile und
// Support, inklusive Hamburger-Popup unter 760px. Kein eigenes Farbschema.
//
// NEU: Eingeloggte User sehen rechts ihren Avatar mit Dropdown (Profil,
// My Trips, Explore, Sign out) — Aufbau und Optik 1:1 wie auf /my-trips.
// Der Theme-Switch sitzt dann, wie dort, im Dropdown statt in der Leiste.
// Die Dropdown-Klassen tragen das Präfix "pn-", damit sie nicht mit den
// .pp-*-Regeln aus profile.css kollidieren.

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
} from "lucide-react";
import { ThemeSwitch } from "./ThemeSwitch";
import { useLanguage } from "../LanguageContext";
import { useAuth, signOutSafe } from "../../lib/useAuth";
import { supabase, safeQuery } from "../../lib/supabase";

export default function PlannerNav({ activePath }: { activePath: string }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // NEU: Avatar-Dropdown
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [username, setUsername] = useState("");
  const displayName = username || user?.email?.split("@")[0] || "";
  const initial = (displayName[0] || user?.email?.[0] || "?").toUpperCase();

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
      setShowUserMenu(false);
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

  // NEU: Dropdown schliesst bei Klick ausserhalb
  useEffect(() => {
    if (!showUserMenu) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".pn-user-wrap")) setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showUserMenu]);

  // Wie auf /my-trips: nach dem Abmelden zur Startseite. Auf /trip würde
  // ein Verbleiben sonst eine Seite ohne Berechtigung zeigen.
  async function handleLogout() {
    setShowUserMenu(false);
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
          {user ? (
            <div className="pn-user-wrap">
              <button
                className="pn-avatar"
                onClick={() => setShowUserMenu((prev) => !prev)}
                aria-label={t("nav.profile")}
                aria-expanded={showUserMenu}
              >
                {avatarContent}
              </button>

              {showUserMenu && (
                <div className="pn-dropdown">
                  <div className="pn-ud-header">
                    <div className="pn-ud-avatar">{avatarContent}</div>
                    <div style={{ minWidth: 0 }}>
                      <p className="pn-ud-name">{displayName}</p>
                      <p className="pn-ud-email">{user.email}</p>
                      <p className="pn-ud-role">{t("common.roleExplorer")}</p>
                    </div>
                  </div>

                  <div className="pn-ud-theme-row">
                    <span className="pn-ud-theme-label">{t("common.theme")}</span>
                    <ThemeSwitch />
                  </div>

                  <div className="pn-ud-links">
                    <Link href="/profile" className="pn-ud-link" onClick={() => setShowUserMenu(false)}>
                      <span className="pn-ud-link-icon"><UserIcon size={14} strokeWidth={1.8} /></span>
                      {t("nav.profile")}
                    </Link>
                    <Link href="/my-trips" className="pn-ud-link" onClick={() => setShowUserMenu(false)}>
                      <span className="pn-ud-link-icon"><MapIcon size={14} strokeWidth={1.8} /></span>
                      {t("nav.myTrips")}
                    </Link>
                    <Link href="/explore" className="pn-ud-link" onClick={() => setShowUserMenu(false)}>
                      <span className="pn-ud-link-icon"><Compass size={14} strokeWidth={1.8} /></span>
                      {t("nav.explore")}
                    </Link>
                    <div className="pn-ud-divider" />
                    <button className="pn-ud-logout" onClick={handleLogout}>
                      <span className="pn-ud-link-icon" style={{ color: "#e08080" }}>
                        <LogOut size={14} strokeWidth={1.8} />
                      </span>
                      {t("nav.signOut")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href={`/login?redirect=${encodeURIComponent(activePath)}`} className="pn-login">
                {t("nav.login")}
              </Link>
              <ThemeSwitch />
            </>
          )}
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
        .pn-login { padding:10px 22px; margin-right:14px; border:1px solid var(--border); border-radius:999px; font-size:10px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:var(--cream); background:color-mix(in srgb, var(--border) 40%, transparent); transition:background .25s, color .25s; }
        .pn-login:hover { background:var(--cream); color:var(--bg); }

        /* NEU: Avatar + Dropdown — Werte 1:1 von /my-trips. Button-Selektoren
           mit Element-Präfix, damit globale Button-Resets aus profile.css
           nicht greifen (gleiches Problem wie beim Google-Maps-Button). */
        .pn-user-wrap { position:relative; }
        .pn-user-wrap button.pn-avatar { width:48px; height:48px; padding:0; border-radius:50%; border:1.5px solid var(--border); background:var(--bg2); overflow:hidden; display:flex; align-items:center; justify-content:center; font-family:var(--serif); font-size:20px; font-weight:700; color:var(--cream); cursor:pointer; transition:border-color .2s, transform .2s; box-shadow:0 6px 18px rgba(0,0,0,0.35); }
        .pn-user-wrap button.pn-avatar:hover { border-color:var(--gold); transform:translateY(-1px); }
        .pn-avatar img, .pn-ud-avatar img { width:100%; height:100%; object-fit:cover; display:block; }

        .pn-dropdown { position:absolute; top:54px; right:0; width:290px; background:color-mix(in srgb, var(--bg) 97%, transparent); border:1px solid var(--border); border-radius:20px; overflow:hidden; box-shadow:0 32px 80px rgba(0,0,0,0.65); backdrop-filter:blur(28px); -webkit-backdrop-filter:blur(28px); animation:pnDropIn .2s cubic-bezier(0.22,1,0.36,1); z-index:300; text-align:left; }
        @keyframes pnDropIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }

        .pn-ud-header { padding:20px 20px 18px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:14px; }
        .pn-ud-avatar { width:46px; height:46px; border-radius:11px; border:1.5px solid var(--border); background:var(--bg2); display:flex; align-items:center; justify-content:center; font-family:var(--serif); font-size:22px; font-weight:700; color:var(--cream); flex-shrink:0; overflow:hidden; }
        .pn-ud-name { margin:0; font-family:var(--serif); font-size:18px; font-weight:300; color:var(--cream); letter-spacing:-0.01em; line-height:1.2; }
        .pn-ud-email { margin:3px 0 0; font-size:10px; color:var(--dim); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px; }
        .pn-ud-role { margin:4px 0 0; font-size:8px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase; color:var(--gold); opacity:0.7; }

        .pn-ud-theme-row { display:flex; align-items:center; justify-content:space-between; padding:14px 20px; border-bottom:1px solid var(--border); }
        .pn-ud-theme-label { font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:var(--muted); }

        .pn-ud-links { padding:8px; }
        .pn-dropdown a.pn-ud-link { display:flex; align-items:center; gap:12px; width:100%; padding:10px 12px; border-radius:10px; font-size:12px; font-weight:600; letter-spacing:0.04em; color:var(--muted); text-decoration:none; transition:all .18s; }
        .pn-dropdown a.pn-ud-link:hover { background:color-mix(in srgb, var(--border) 60%, transparent); color:var(--cream); }
        .pn-ud-link-icon { width:18px; display:flex; align-items:center; justify-content:center; color:var(--gold); flex-shrink:0; }
        .pn-ud-divider { height:1px; background:var(--border); margin:4px 8px; }
        .pn-dropdown button.pn-ud-logout { display:flex; align-items:center; gap:12px; width:100%; padding:10px 12px; border-radius:10px; font-family:inherit; font-size:12px; font-weight:600; letter-spacing:0.04em; color:rgba(224,128,128,0.55); background:none; border:none; cursor:pointer; transition:all .18s; }
        .pn-dropdown button.pn-ud-logout:hover { background:rgba(224,128,128,0.07); color:#e08080; }

        /* Mobile: Avatar in der Leiste ausblenden (wie /my-trips), dafür
           Profilkopf im Hamburger-Menü */
        .pn-mobile-header { padding-left:18px; padding-right:18px; }
        @media (max-width:760px) {
          .pn-user-wrap { display:none; }
        }
      `}</style>
    </>
  );
}