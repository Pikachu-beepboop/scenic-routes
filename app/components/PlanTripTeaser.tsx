"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "../LanguageContext";

/**
 * Homepage-Teaser für den Route Planner (Teil 1 von 2).
 * Bewusst nur Kicker, Headline, Subtext und ein CTA nach /plan — kein
 * Eingabefeld auf der Homepage. Nutzt ausschließlich die bestehenden
 * CSS-Variablen (--bg2, --gold, --cream ...), kein eigenes Farbschema.
 */
export default function PlanTripTeaser() {
  const { t } = useLanguage();

  return (
    <section className="plan-teaser">
      <div className="plan-teaser-inner">
        <p className="plan-teaser-kicker">{t("home.planTeaser.kicker")}</p>
        <h2 className="plan-teaser-heading">{t("home.planTeaser.headline")}</h2>
        <p className="plan-teaser-sub">{t("home.planTeaser.subtext")}</p>
        <Link href="/plan" className="plan-teaser-cta">
          {t("home.planTeaser.cta")} <ArrowRight size={13} strokeWidth={2.5} />
        </Link>
      </div>

      <style>{`
        .plan-teaser { padding:clamp(76px,7.5vw,110px) clamp(24px,5vw,80px); background:radial-gradient(circle at 24% 30%,rgba(201,168,106,0.10),transparent 26rem),var(--bg2); border-bottom:1px solid var(--border); }
        .plan-teaser-inner { max-width:820px; margin:0 auto; text-align:center; }
        .plan-teaser-kicker { font-size:9px; font-weight:800; letter-spacing:0.38em; text-transform:uppercase; color:var(--gold); margin-bottom:22px; }
        .plan-teaser-heading { font-family:var(--serif); font-size:clamp(40px,4.6vw,68px); font-weight:300; line-height:0.96; letter-spacing:-0.045em; color:var(--cream); }
        .plan-teaser-sub { margin:26px auto 0; max-width:560px; font-size:16px; font-weight:300; line-height:1.75; color:var(--dim); }
        .plan-teaser-cta { display:inline-flex; align-items:center; gap:10px; margin-top:38px; padding:14px 28px; border:1px solid var(--gold); border-radius:999px; background:var(--gold); color:var(--bg); font-size:9px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; transition:background .25s, border-color .25s, transform .25s; }
        .plan-teaser-cta:hover { background:#d8b978; border-color:#d8b978; transform:translateY(-1px); }
      `}</style>
    </section>
  );
}
