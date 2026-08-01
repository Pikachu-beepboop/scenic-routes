"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, LifeBuoy } from "lucide-react";
import { ThemeSwitch } from "../components/ThemeSwitch";
import { useLanguage } from "../LanguageContext";

// Wiederverwendung des bestehenden Support-Inhalts (FAQ / Contact / Feedback
// Akkordeon) — bleibt unverändert, wird hier nur zusätzlich öffentlich
// (ohne Login) gerendert statt nur innerhalb der geschützten Profile-Page.
import SupportTab from "../profile/components/tabs/SupportTab";

// Gleiches CSS wie die Profile-Page, da SupportTab die dortigen st-*-Klassen
// nutzt (st-content, st-card, st-accordion, etc.) und die Farb-Variablen
// (--bg, --cream, --gold ...) aus dem .pp-Wrapper darin definiert sind.
import "../profile/profile.css";

export default function SupportPage() {
  const router = useRouter();
  const { t } = useLanguage();

  // Gleiche Logik wie im Legal-Back-Button: bringt den User dorthin zurück,
  // von wo er die Seite geöffnet hat (Homepage-Footer, Explore, etc.),
  // unabhängig vom Login-Status. Fällt auf "/" zurück, falls es keine
  // Vorgänger-Seite in der History gibt (z. B. Direktaufruf/Lesezeichen).
  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <div className="pp">
      <nav className="pp-nav">
        <Link href="/" className="pp-nav-logo">
          <span>EXPLORE</span><span>SCENIC</span><span>ROUTES</span>
        </Link>

        <div className="pp-nav-right">
          <ThemeSwitch />
        </div>
      </nav>

      <div className="pp-layout">
        <div className="st-wrap">
          <button
            type="button"
            onClick={handleBack}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 13,
              fontWeight: 600,
              color: "var(--gold)",
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              width: "fit-content",
            }}
          >
            <ChevronLeft size={16} strokeWidth={2} /> Back
          </button>

          <div className="st-megacard">
            <div className="st-header">
              <div className="st-header-left">
                <div className="st-header-icon"><LifeBuoy size={20} strokeWidth={1.8} /></div>
                <div>
                  <p className="st-title">{t("profile.subtab.support.title")}</p>
                  <p className="st-subtitle">{t("profile.subtab.support.subtitle")}</p>
                </div>
              </div>
            </div>

            <div style={{ paddingTop: 24 }}>
              <SupportTab />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}