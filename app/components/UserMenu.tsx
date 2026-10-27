"use client";

// Gemeinsames Profil-Dropdown für alle Seiten (identisch zur Startseite):
// Kopf (Avatar, Name, E-Mail, Rolle) · Theme-Zeile · Profile · My Trips ·
// Explore Routes · Plan Trip · Admin Panel (nur Admins) · Trenner · Sign Out.
// Holt Avatar/Username selbst aus `profiles`, damit jede Seite nur
// <UserMenu /> einsetzen muss.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User as UserIcon, Map as MapIcon, Compass, Navigation, ShieldCheck, LogOut } from "lucide-react";
import { supabase, safeQuery } from "../../lib/supabase";
import { useAuth, signOutSafe } from "../../lib/useAuth";
import { useLanguage } from "../LanguageContext";
import { ThemeSwitch } from "./ThemeSwitch";

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

type Props = {
  /** Ziel des Login-Buttons, wenn niemand eingeloggt ist. */
  loginHref?: string;
  /** Eingeloggt-Fall: ThemeSwitch steckt im Dropdown. Ausgeloggt: neben dem Login-Button. */
  showThemeWhenLoggedOut?: boolean;
  /** Avatar-Override, z. B. die Live-Vorschau auf der Profilseite. */
  avatarOverride?: string;
  /** Name-Override, z. B. ungespeicherte Änderung auf der Profilseite. */
  nameOverride?: string;
  /** Wohin nach dem Abmelden navigiert wird. */
  afterSignOut?: string;
};

export default function UserMenu({
  loginHref = "/login",
  showThemeWhenLoggedOut = true,
  avatarOverride,
  nameOverride,
  afterSignOut = "/",
}: Props) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (!user) {
      setAvatarUrl("");
      setUsername("");
      return;
    }
    let mounted = true;
    (async () => {
      const data = await safeQuery<{ avatar_url: string | null; username: string | null }>(
        supabase.from("profiles").select("avatar_url, username").eq("id", user.id).single(),
        "UserMenu profile"
      );
      if (!mounted) return;
      setAvatarUrl(data?.avatar_url || "");
      setUsername(data?.username || "");
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  // Klick außerhalb / Escape schließt das Menü
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".um-wrap")) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <div className="um-out">
        <style>{CSS}</style>
        {showThemeWhenLoggedOut && <ThemeSwitch />}
        <Link href={loginHref} className="login-btn um-login">{t("nav.login")}</Link>
      </div>
    );
  }

  const avatar = avatarOverride !== undefined ? avatarOverride : avatarUrl;
  const displayName = nameOverride || username || user.email?.split("@")[0] || "";
  const initial = displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "?";
  const isAdmin = !!user.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
  const close = () => setOpen(false);

  const handleLogout = async () => {
    await signOutSafe();
    setOpen(false);
    router.push(afterSignOut);
  };

  const face = avatar ? (
    <img src={avatar} alt="avatar" onError={() => setAvatarUrl("")} />
  ) : (
    initial
  );

  return (
    <div className="um-wrap">
      <style>{CSS}</style>
      <button
        type="button"
        className="user-avatar um-avatar"
        aria-label="Account"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((p) => !p)}
      >
        {face}
      </button>

      {open && (
        <div className="um-dropdown" role="menu">
          <div className="um-header">
            <div className="um-face">{face}</div>
            <div style={{ minWidth: 0 }}>
              <p className="um-name">{displayName}</p>
              <p className="um-email">{user.email}</p>
              <p className="um-role">{t("common.roleExplorer")}</p>
            </div>
          </div>

          <div className="um-theme-row">
            <span className="um-theme-label">{t("common.theme")}</span>
            <ThemeSwitch />
          </div>

          <div className="um-links">
            <Link href="/profile" className="um-link" onClick={close}>
              <span className="um-icon"><UserIcon size={14} strokeWidth={1.8} /></span> {t("nav.profile")}
            </Link>
            <Link href="/my-trips" className="um-link" onClick={close}>
              <span className="um-icon"><MapIcon size={14} strokeWidth={1.8} /></span> {t("nav.myTrips")}
            </Link>
            <Link href="/explore" className="um-link" onClick={close}>
              <span className="um-icon"><Compass size={14} strokeWidth={1.8} /></span> {t("nav.explore")}
            </Link>
            <Link href="/plan" className="um-link" onClick={close}>
              <span className="um-icon"><Navigation size={14} strokeWidth={1.8} /></span> {t("nav.planTrip")}
            </Link>
            {isAdmin && (
              <Link href="/admin" className="um-link" onClick={close}>
                <span className="um-icon"><ShieldCheck size={14} strokeWidth={1.8} /></span> {t("nav.adminPanel")}
              </Link>
            )}
            <div className="um-divider" />
            <button type="button" className="um-logout" onClick={handleLogout}>
              <span className="um-icon" style={{ color: "#e08080" }}><LogOut size={14} strokeWidth={1.8} /></span> {t("nav.signOut")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Eigene um-* Klassen, damit Seiten-CSS (z. B. ".pp button") nichts verbiegt.
const CSS = `
.um-wrap { position:relative; font-family:var(--sans, 'Inter', system-ui, sans-serif); }
.um-out, .pp .um-out { display:flex; align-items:center; gap:16px; }
.um-out .um-login { padding:10px 22px; border:1px solid var(--border); border-radius:999px; font-size:10px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:var(--cream); background:color-mix(in srgb, var(--border) 40%, transparent); transition:all .25s; text-decoration:none; }
.um-out .um-login:hover { background:var(--cream); color:var(--bg); }

.um-wrap button.um-avatar { width:48px; height:48px; padding:0; border-radius:50%; border:1.5px solid var(--border); background:var(--bg2); overflow:hidden; display:flex; align-items:center; justify-content:center; font-family:var(--serif); font-size:20px; font-weight:700; color:var(--cream); cursor:pointer; transition:border-color .2s, transform .2s; box-shadow:0 6px 18px rgba(0,0,0,0.35); }
.um-wrap button.um-avatar:hover { border-color:var(--gold); transform:translateY(-1px); }
.light .um-wrap button.um-avatar { color:#000; }
.um-wrap .um-avatar img, .um-wrap .um-face img { width:100%; height:100%; object-fit:cover; display:block; }

.um-wrap .um-dropdown { position:absolute; top:54px; right:0; width:290px; text-align:left; background:color-mix(in srgb, var(--bg) 97%, transparent); border:1px solid var(--border); border-radius:20px; overflow:hidden; box-shadow:0 32px 80px rgba(0,0,0,0.65); backdrop-filter:blur(28px); -webkit-backdrop-filter:blur(28px); animation:umDropIn .2s cubic-bezier(0.22,1,0.36,1); z-index:300; }
@keyframes umDropIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }

.um-wrap .um-header { padding:20px 20px 18px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:14px; }
.um-wrap .um-face { width:46px; height:46px; border-radius:11px; border:1.5px solid var(--border); background:var(--bg2); display:flex; align-items:center; justify-content:center; font-family:var(--serif); font-size:22px; font-weight:700; color:var(--cream); flex-shrink:0; overflow:hidden; }
.um-wrap .um-name { margin:0; font-family:var(--serif); font-size:18px; font-weight:300; color:var(--cream); letter-spacing:-0.01em; line-height:1.2; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px; }
.um-wrap .um-email { margin:3px 0 0; font-size:10px; color:var(--dim); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px; }
.um-wrap .um-role { margin:4px 0 0; font-size:8px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase; color:var(--gold); opacity:0.7; }

.um-wrap .um-theme-row { display:flex; align-items:center; justify-content:space-between; padding:14px 20px; border-bottom:1px solid var(--border); }
.um-wrap .um-theme-label { font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:var(--muted); }

.um-wrap .um-links { padding:8px; }
.um-wrap .um-dropdown .um-link, .um-wrap .um-dropdown button.um-logout { display:flex; align-items:center; gap:12px; width:100%; margin:0; padding:10px 12px; border-radius:10px; font-family:inherit; font-size:12px; font-weight:600; letter-spacing:0.04em; line-height:1.4; text-transform:none; background:none; border:none; box-shadow:none; cursor:pointer; transition:all .18s; text-decoration:none; text-align:left; }
.um-wrap .um-dropdown .um-link { color:var(--muted); }
.um-wrap .um-dropdown .um-link:hover { background:color-mix(in srgb, var(--border) 60%, transparent); color:var(--cream); }
.um-wrap .um-icon { width:18px; display:flex; align-items:center; justify-content:center; color:var(--gold); flex-shrink:0; }
.um-wrap .um-divider { height:1px; background:var(--border); margin:4px 8px; }
.um-wrap .um-dropdown button.um-logout { color:rgba(224,128,128,0.55); }
.um-wrap .um-dropdown button.um-logout:hover { background:rgba(224,128,128,0.07); color:#e08080; }
`;