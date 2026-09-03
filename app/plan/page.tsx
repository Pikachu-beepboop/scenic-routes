"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Compass } from "lucide-react";
import { ThemeSwitch } from "../components/ThemeSwitch";
import { useLanguage } from "../LanguageContext";

// Gleiches CSS wie die Profile-/Support-Page: liefert das bestehende
// Farb-Variablen-System (--bg, --cream, --gold ...) und die .pp-*-Klassen
// für Wrapper, Nav und Hintergrund. Kein eigenes Farbschema.
import "../profile/profile.css";

/**
 * Platzhalter-Seite für den Route Planner (Teil 1 von 2).
 * Die eigentliche Planner-Funktionalität (Karteneingabe, Directions-Berechnung,
 * Matching-Logik, Trip Builder) folgt in Teil 2.
 */
export default function PlanPage() {
  const { t } = useLanguage();
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="pp">
      <div className="pp-bg">
        <img
          src="/Stelvio Pass.jpg"
          alt={t("nav.scenicRoadAlt")}
          onError={e => { (e.currentTarget as HTMLImageElement).src = "/Pacific Route Highway.jpg"; }}
        />
      </div>

      <nav className={`pp-nav ${navScrolled ? "scrolled" : ""}`}>
        <Link href="/" className="pp-nav-logo">
          <span>EXPLORE</span><span>SCENIC</span><span>ROUTES</span>
        </Link>
        <div className="pp-nav-links">
          <Link href="/explore" className="pp-nav-link">{t("nav.explore")}</Link>
          <Link href="/plan"    className="pp-nav-link pp-nav-link-active">{t("nav.planTrip")}</Link>
          <Link href="/about"   className="pp-nav-link">{t("nav.about")}</Link>
        </div>
        <div className="pp-nav-right">
          <ThemeSwitch />
        </div>
      </nav>

      <div className="pp-layout">
        <div className="plan-card">
          <span className="plan-icon"><Compass size={20} strokeWidth={1.6} /></span>
          <p className="plan-eyebrow">{t("plan.eyebrow")}</p>
          <h1 className="plan-title">{t("plan.title")}</h1>
          <p className="plan-badge">{t("common.comingSoon")}</p>
          <p className="plan-sub">{t("plan.sub")}</p>
          <Link href="/" className="plan-back">
            <ArrowLeft size={13} strokeWidth={2} /> {t("plan.back")}
          </Link>
        </div>
      </div>

      <style>{`
        .plan-card { align-self:center; max-width:620px; width:100%; text-align:center; padding:clamp(34px,5vw,56px); border:1px solid var(--border); border-radius:26px; background:color-mix(in srgb, var(--bg2) 82%, transparent); backdrop-filter:blur(18px); box-shadow:0 28px 80px rgba(0,0,0,0.28); }
        .plan-icon { display:inline-grid; place-items:center; width:52px; height:52px; margin-bottom:22px; border:1px solid color-mix(in srgb, var(--gold) 38%, transparent); border-radius:16px; background:color-mix(in srgb, var(--gold) 12%, transparent); color:var(--gold); }
        .plan-eyebrow { font-size:9px; font-weight:800; letter-spacing:0.34em; text-transform:uppercase; color:var(--gold); margin-bottom:16px; }
        .plan-title { font-family:var(--serif); font-size:clamp(38px,5vw,60px); font-weight:300; line-height:0.98; letter-spacing:-0.04em; color:var(--cream); }
        .plan-badge { display:inline-block; margin-top:18px; padding:7px 16px; border:1px solid var(--border); border-radius:999px; font-size:9px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:var(--muted); }
        .plan-sub { margin-top:22px; font-size:15px; font-weight:300; line-height:1.75; color:var(--dim); }
        .plan-back { display:inline-flex; align-items:center; gap:8px; margin-top:32px; font-size:10px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase; color:var(--muted); transition:color .2s; }
        .plan-back:hover { color:var(--gold); }
      `}</style>
    </div>
  );
}
