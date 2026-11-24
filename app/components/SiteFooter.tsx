"use client";

// NEU: Gemeinsamer Footer für alle Seiten (Design „Serpentine“, Variante A).
// Ersetzt die bisherigen Einzel-Footer auf Home, Explore, About, My Trips,
// Plan, Trip und Routendetail und kommt neu auf Legal und Support dazu.
//
// Eigenständig gebaut, damit er auf jeder Seite gleich aussieht:
// - Farben: eigene Variablen pro Theme (.dark / .light auf <html> von next-themes),
//   funktioniert also auch auf Seiten ohne eigenes Variablen-System (Legal, Support).
// - Schriften: GEÄNDERT – kommen jetzt zentral selbst gehostet aus app/globals.css.
// - CSS: alle Selektoren mit .srf präfixiert, damit globale Resets wie
//   `.pg button`, `.pp *` oder `.pp button` die Footer-Stile nicht überschreiben.

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Globe } from "lucide-react";
// GEÄNDERT: derselbe Theme-Switch wie im Profil-Dropdown (UserMenu)
import { ThemeSwitch } from "./ThemeSwitch";
import { useLanguage } from "../LanguageContext";
import { useAuth } from "../../lib/useAuth";
import type { TranslationKey } from "@/lib/translations";

type FooterLink = {
  key: TranslationKey;
  href: string;
  /** Ohne Session erst zum Login, danach zurück zum Ziel */
  protected?: boolean;
  /** Eingeloggte User landen stattdessen hier (z. B. Support im Profil) */
  loggedInHref?: string;
};

// Gleiche Spalten und Ziele wie in den bisherigen Footern.
const FOOTER_COLUMNS: { id: string; headingKey: TranslationKey; links: FooterLink[] }[] = [
  {
    id: "explore",
    headingKey: "footer.col.explore",
    links: [
      { key: "footer.link.allRoutes", href: "/explore" },
      { key: "footer.link.myTrips", href: "/my-trips", protected: true },
      { key: "footer.link.profile", href: "/profile", protected: true },
    ],
  },
  {
    id: "about",
    headingKey: "footer.col.about",
    links: [
      // Traveller Pass ist ein Tab auf der Profile-Page (?tab=pass)
      { key: "footer.link.travellerPass", href: "/profile?tab=pass", protected: true },
      { key: "footer.link.about", href: "/about" },
      { key: "footer.link.ourTeam", href: "/about#team" },
    ],
  },
  {
    id: "support",
    headingKey: "footer.col.support",
    links: [
      { key: "footer.link.faq", href: "/support", loggedInHref: "/profile?tab=support" },
      { key: "footer.link.contact", href: "/support", loggedInHref: "/profile?tab=support" },
      { key: "footer.link.sendFeedback", href: "/support", loggedInHref: "/profile?tab=support" },
    ],
  },
  {
    id: "legal",
    headingKey: "footer.col.legal",
    links: [
      { key: "footer.link.termsOfUse", href: "/legal/terms" },
      { key: "footer.link.privacyPolicy", href: "/legal/privacy" },
      { key: "footer.link.imprint", href: "/legal/imprint" },
    ],
  },
];

const LANGS = [
  ["en", "English"],
  ["de", "Deutsch"],
  ["ru", "Русский"],
] as const;

// Serpentine als Pfad (viewBox 1200 × 90), einmal durchgezogen, einmal gepunktet versetzt.
const ROAD_PATH =
  "M0 60 C 120 60, 150 20, 250 22 S 380 78, 480 70 S 600 18, 700 26 S 820 76, 930 62 S 1080 30, 1200 40";

export default function SiteFooter() {
  const { t, lang, setLang } = useLanguage();
  const { user } = useAuth();

  const [showLangMenu, setShowLangMenu] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  // useId liefert Zeichen, die in url(#…) nicht erlaubt sind → bereinigen
  const gradId = `srf-road-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  // Sprachmenü bei Klick außerhalb schließen
  useEffect(() => {
    if (!showLangMenu) return;
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setShowLangMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showLangMenu]);

  const resolveHref = (link: FooterLink) => {
    const target = user && link.loggedInHref ? link.loggedInHref : link.href;
    return link.protected && !user ? `/login?redirect=${encodeURIComponent(target)}` : target;
  };

  return (
    <footer className="srf">
      <div className="srf-in">
        {/* Statement + CTA */}
        <div className="srf-hero">
          <div>
            <p className="srf-kicker">Explore Scenic Routes</p>
            <h2 className="srf-h">
              {t("footer.headline.line1")}
              <br />
              <em>{t("footer.headline.line2")}</em>
            </h2>
          </div>
          <Link href="/explore" className="srf-cta">
            {t("footer.cta")} <ArrowRight size={14} strokeWidth={1.6} />
          </Link>
        </div>

        {/* Serpentine mit drei Wegpunkten */}
        <svg className="srf-road" viewBox="0 0 1200 90" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id={gradId} x1="0" x2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity="0" />
              <stop offset="0.15" stopColor="currentColor" stopOpacity="0.7" />
              <stop offset="0.85" stopColor="currentColor" stopOpacity="0.7" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={ROAD_PATH} fill="none" stroke={`url(#${gradId})`} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
          <path
            d={ROAD_PATH}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth="1"
            strokeDasharray="2 9"
            transform="translate(0,6)"
            opacity="0.45"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx="250" cy="22" r="3.2" fill="currentColor" />
          <circle cx="700" cy="26" r="3.2" fill="currentColor" />
          <circle cx="930" cy="62" r="3.2" fill="currentColor" />
        </svg>

        {/* Marke + Linkspalten */}
        <div className="srf-grid">
          <div className="srf-brand">
            <Link href="/" aria-label="Scenic Routes – Home">
              {/* Goldenes Logo mit transparentem Hintergrund; im Light-Theme per CSS dunkel eingefärbt */}
              <img src="/logo2.png" alt="Explore Scenic Routes" className="srf-logo" />
            </Link>
            <p className="srf-tag">{t("home.footer.tagline")}</p>
          </div>

          {FOOTER_COLUMNS.map(({ id, headingKey, links }) => (
            <div className="srf-col" key={id}>
              <p className="srf-col-t">{t(headingKey)}</p>
              {links.map((link) => (
                <Link key={link.key} href={resolveHref(link)} className="srf-link">
                  {t(link.key)}
                </Link>
              ))}
            </div>
          ))}
        </div>

        {/* Unterleiste: Copyright, Sprache, Theme */}
        <div className="srf-bot">
          <p className="srf-copy">
            © {new Date().getFullYear()} Explore Scenic Routes. {t("home.footer.rights")}
          </p>

          <div className="srf-ctl">
            <div className="srf-lang-wrap" ref={langRef}>
              <button
                type="button"
                className="srf-lang"
                onClick={() => setShowLangMenu((v) => !v)}
                aria-expanded={showLangMenu}
                aria-label="Language"
              >
                {/* GEÄNDERT: Globus größer (13 → 17 px) */}
                <Globe size={17} strokeWidth={1.6} />
                <span>{lang.toUpperCase()}</span>
              </button>
              {showLangMenu && (
                <div className="srf-lang-menu">
                  {LANGS.map(([code, label]) => (
                    <button
                      key={code}
                      type="button"
                      className={`srf-lang-opt ${lang === code ? "active" : ""}`}
                      onClick={() => {
                        setLang(code);
                        setShowLangMenu(false);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className="srf-sep" aria-hidden="true" />

            {/* GEÄNDERT: gleicher Schalter wie im Profil-Dropdown statt Mond/Sonne-Pille */}
            <ThemeSwitch />
          </div>
        </div>
      </div>

      <style>{SITE_FOOTER_CSS}</style>
    </footer>
  );
}

const SITE_FOOTER_CSS = `
.srf {
  --srf-bg:#0c0b09; --srf-cream:#EDE5D4; --srf-muted:rgba(237,229,212,.56);
  --srf-dim:rgba(237,229,212,.32); --srf-border:rgba(237,229,212,.10);
  --srf-gold:#C9A86A; --srf-ink:#C9A86A;
  position:relative; z-index:5; width:100%; box-sizing:border-box;
  background:var(--srf-bg); color:var(--srf-cream);
  border-top:1px solid var(--srf-border);
  padding:84px clamp(24px,5vw,80px) 30px;
  font-family:'Inter', system-ui, sans-serif;
  -webkit-font-smoothing:antialiased;
  overflow:hidden; transition:background .35s, color .35s;
}
/* Light-Theme: dunkleres Gold, weil #C9A86A auf Creme zu blass ist */
.light .srf {
  --srf-bg:#F4F0E8; --srf-cream:#2B2620; --srf-muted:rgba(43,38,32,.62);
  --srf-dim:rgba(43,38,32,.38); --srf-border:rgba(43,38,32,.12);
  --srf-ink:#A2803F;
}
.srf *, .srf *::before, .srf *::after { box-sizing:border-box; }
.srf .srf-in { max-width:1200px; margin:0 auto; padding:0; }

.srf .srf-hero { display:flex; justify-content:space-between; align-items:flex-end; gap:40px; }
.srf .srf-kicker { margin:0 0 18px; padding:0; font-size:10px; font-weight:700; letter-spacing:.3em; text-transform:uppercase; color:var(--srf-ink); }
.srf .srf-h { margin:0; padding:0; font-family:'Cormorant Garamond', Georgia, serif; font-weight:300; font-size:64px; line-height:1.02; letter-spacing:-.01em; color:var(--srf-cream); }
.srf .srf-h em { font-style:italic; color:var(--srf-ink); }
.srf a.srf-cta {
  display:inline-flex; align-items:center; gap:12px; padding:15px 26px;
  border:1px solid color-mix(in srgb, var(--srf-gold) 55%, transparent); border-radius:999px;
  font-size:11px; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  color:var(--srf-cream); text-decoration:none; white-space:nowrap;
  transition:background .25s, border-color .25s;
}
.srf a.srf-cta svg { color:var(--srf-ink); transition:transform .25s; }
.srf a.srf-cta:hover { background:color-mix(in srgb, var(--srf-gold) 12%, transparent); border-color:var(--srf-gold); }
.srf a.srf-cta:hover svg { transform:translateX(3px); }

.srf .srf-road { display:block; width:100%; height:90px; margin:46px 0 50px; color:var(--srf-ink); }

.srf .srf-grid { display:grid; grid-template-columns:1.5fr 1fr 1fr 1fr 1fr; gap:32px; padding-bottom:44px; }
.srf .srf-logo { display:block; width:180px; height:auto; margin:-20px 0 -10px -18px; }
.light .srf .srf-logo { filter:brightness(0) saturate(100%) invert(14%) sepia(9%) saturate(900%) hue-rotate(350deg); }
.srf .srf-tag { margin:10px 0 0; padding:0; max-width:250px; font-size:12.5px; font-weight:300; line-height:1.75; color:var(--srf-muted); }
.srf .srf-col-t { margin:0 0 18px; padding:0; font-size:9px; font-weight:800; letter-spacing:.3em; text-transform:uppercase; color:var(--srf-ink); }
.srf a.srf-link { display:block; margin:0 0 11px; font-size:13px; font-weight:300; color:var(--srf-muted); text-decoration:none; transition:color .2s; }
.srf a.srf-link:hover { color:var(--srf-cream); }

.srf .srf-bot { display:flex; justify-content:space-between; align-items:center; gap:16px; border-top:1px solid var(--srf-border); padding-top:22px; }
.srf .srf-copy { margin:0; padding:0; font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:var(--srf-dim); }

.srf .srf-ctl { display:flex; align-items:center; gap:18px; }
.srf .srf-lang-wrap { position:relative; }
/* GEÄNDERT: Sprachwahl größer und besser lesbar (Schrift 10 → 13 px, mehr Abstand) */
.srf button.srf-lang {
  display:flex; align-items:center; gap:9px; margin:0; padding:6px 2px;
  background:none; border:none; border-radius:0; cursor:pointer;
  font-family:inherit; font-size:13px; font-weight:600; letter-spacing:.16em;
  color:var(--srf-muted); transition:color .2s;
}
.srf button.srf-lang:hover { color:var(--srf-cream); }
.srf .srf-lang-menu {
  position:absolute; bottom:calc(100% + 10px); right:0; z-index:50; min-width:150px; overflow:hidden;
  border:1px solid var(--srf-border); border-radius:12px;
  background:color-mix(in srgb, var(--srf-bg) 97%, transparent); backdrop-filter:blur(24px);
  box-shadow:0 24px 60px rgba(0,0,0,.45); animation:srfDropIn .2s cubic-bezier(.22,1,.36,1);
}
@keyframes srfDropIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
.srf button.srf-lang-opt {
  display:block; width:100%; margin:0; padding:10px 14px; border:none; border-radius:0; background:none;
  text-align:left; font-family:inherit; font-size:12px; font-weight:400; color:var(--srf-muted); cursor:pointer;
  transition:background .15s, color .15s;
}
.srf button.srf-lang-opt:hover { background:color-mix(in srgb, var(--srf-border) 60%, transparent); color:var(--srf-cream); }
.srf button.srf-lang-opt.active { color:var(--srf-ink); font-weight:700; }

.srf .srf-sep { width:1px; height:18px; background:var(--srf-border); }
/* GEÄNDERT: Styles für den ThemeSwitch (1:1 wie im Profil-Dropdown). Hier im Footer
   noch einmal definiert, damit er auch auf Seiten ohne eigene .theme-switch-Stile
   (z. B. Legal, Plan) gleich aussieht. */
.srf .theme-switch { position:relative; display:flex; align-items:center; width:66px; height:33px; margin:0; padding:0; border-radius:999px; background:color-mix(in srgb, var(--srf-border) 70%, transparent) !important; backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid var(--srf-border) !important; box-shadow:0 8px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06); cursor:pointer; transition:background .35s, border-color .35s; flex-shrink:0; }
.srf .theme-switch:hover { border-color:var(--srf-gold) !important; }
.srf .theme-switch-knob { position:absolute; top:4.5px; left:3.5px; width:22px; height:22px; border-radius:50%; background:linear-gradient(to bottom, rgba(255,255,255,0.96), rgba(237,229,212,0.85)); box-shadow:0 4px 10px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.6); display:flex; align-items:center; justify-content:center; transition:transform .45s cubic-bezier(0.22,1,0.36,1); }
.srf .theme-switch-knob.is-light { transform:translateX(36px); }
.srf .theme-switch-icon { width:14px; height:14px; }
.srf .theme-switch-placeholder { width:66px; height:33px; border-radius:999px; background:color-mix(in srgb, var(--srf-border) 50%, transparent); border:1px solid var(--srf-border); flex-shrink:0; }

/* Tablet: Marke über die volle Breite, darunter vier Spalten */
@media (max-width:1100px) {
  .srf .srf-grid { grid-template-columns:repeat(4, 1fr); }
  .srf .srf-brand { grid-column:1 / -1; }
}

/* Mobil: zweispaltige Links, Statement untereinander */
@media (max-width:760px) {
  .srf { padding:56px 22px 26px; }
  .srf .srf-hero { flex-direction:column; align-items:flex-start; gap:26px; }
  .srf .srf-h { font-size:44px; }
  .srf .srf-road { height:60px; margin:34px 0 30px; }
  .srf .srf-grid { grid-template-columns:1fr 1fr; gap:30px 20px; }
  .srf .srf-logo { width:120px; margin:-14px 0 -6px -12px; }
  .srf .srf-bot { flex-direction:column; align-items:flex-start; gap:18px; }
  .srf .srf-lang-menu { left:0; right:auto; }
}
`;