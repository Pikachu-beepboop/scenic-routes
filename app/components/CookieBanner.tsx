"use client";

// components/CookieBanner.tsx
//
// Zeigt den Cookie-Banner nur beim ersten Besuch (bzw. solange keine
// Entscheidung vorliegt). Einbindung: einmal ganz oben/unten im
// Root-Layout (app/layout.tsx), damit er auf allen Seiten erscheint.
//
// WICHTIG: Passe die Import-Pfade ("../lib/supabase", "./LanguageContext")
// an den tatsächlichen Ort dieser Datei in deinem Projekt an.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, X, Settings, ShieldCheck, MapPin, Mountain } from "lucide-react";
import { useAuth } from "../../lib/useAuth";
import { useLanguage } from "../LanguageContext";
import {
  type CookieConsent,
  getLocalConsent,
  persistConsent,
  migrateLocalConsentToSupabase,
} from "../../lib/cookieConsent";

const TEXT = {
  de: {
    heading1: "Wir verwenden Cookies",
    heading2: "und ähnliche Technologien",
    body: "Wir verwenden Cookies und ähnliche Technologien, um unsere Website bereitzustellen, Ihre Anmeldung zu ermöglichen und – nach Ihrer Einwilligung – Google Maps anzuzeigen. Weitere Informationen finden Sie in unserer",
    privacyLink: "Datenschutzerklärung.",
    acceptAll: "Alle akzeptieren",
    rejectAll: "Alle ablehnen",
    settings: "Einstellungen",
    settingsHeading: "Cookie-Einstellungen",
    necessaryTitle: "Notwendig",
    necessaryBadge: "Immer aktiv",
    necessaryDesc:
      "Diese Cookies und Speichertechnologien sind für den Betrieb der Website erforderlich und können nicht deaktiviert werden. Sie ermöglichen unter anderem die Anmeldung, den sicheren Betrieb und das Speichern Ihrer Cookie-Einstellungen.",
    mapsTitle: "Google Maps",
    mapsDesc:
      "Mit Ihrer Einwilligung werden Karten von Google Maps geladen. Dabei kann Google personenbezogene Daten wie Ihre IP-Adresse und Geräteinformationen verarbeiten.",
    save: "Auswahl speichern",
    imprint: "Impressum",
    privacy: "Datenschutzerklärung",
  },
  en: {
    heading1: "We use cookies",
    heading2: "and similar technologies",
    body: "We use cookies and similar technologies to provide our website, enable your login and — with your consent — display Google Maps. For more information, see our",
    privacyLink: "Privacy Policy.",
    acceptAll: "Accept all",
    rejectAll: "Reject all",
    settings: "Settings",
    settingsHeading: "Cookie settings",
    necessaryTitle: "Necessary",
    necessaryBadge: "Always active",
    necessaryDesc:
      "These cookies and storage technologies are required for the website to function and cannot be disabled. Among other things, they enable login, secure operation, and remembering your cookie choices.",
    mapsTitle: "Google Maps",
    mapsDesc:
      "With your consent, maps from Google Maps will be loaded. Google may process personal data such as your IP address and device information.",
    save: "Save choices",
    imprint: "Imprint",
    privacy: "Privacy Policy",
  },
} as const;

type Lang = keyof typeof TEXT;

export default function CookieBanner() {
  const { lang: siteLang } = useLanguage();
  const t = TEXT[siteLang as Lang] ?? TEXT.de;

  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [googleMaps, setGoogleMaps] = useState(false);
  const [ready, setReady] = useState(false);

  // GEÄNDERT: Auth-State kommt aus dem zentralen Hook. Vorher hing hier ein
  // eigenes supabase.auth.getSession() — bei kaputtem Token blieb `ready`
  // false und der Banner (und damit die Consent-Logik) war global tot.
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;

  useEffect(() => {
    // Erst entscheiden, wenn der Auth-State geklärt ist (dauert dank Timeout
    // höchstens ein paar Sekunden und endet garantiert).
    if (authLoading) return;

    let mounted = true;

    (async () => {
      let consent: CookieConsent | null = null;

      if (userId) {
        // Eingeloggt: Supabase ist die führende Quelle. Falls dort noch
        // nichts gespeichert ist, aber lokal (Guest) schon, wird das jetzt
        // einmalig übernommen. migrateLocalConsentToSupabase() hat intern
        // Timeout + Fehlerbehandlung und kann nicht mehr hängen bleiben.
        consent = await migrateLocalConsentToSupabase(userId);
        if (!consent) consent = getLocalConsent();
      } else {
        consent = getLocalConsent();
      }

      if (!mounted) return;

      if (consent) {
        setGoogleMaps(consent.googleMaps);
        setVisible(false);
      } else {
        setVisible(true);
      }

      setReady(true);
    })();

    return () => { mounted = false; };
  }, [userId, authLoading]);

  if (!ready || !visible) return null;

  async function save(consent: CookieConsent) {
    await persistConsent(consent, userId);
    setGoogleMaps(consent.googleMaps);
    setVisible(false);
  }

  return (
    <div className="cc-overlay">
      <div className="cc-card" role="dialog" aria-modal="true">
        <div className="cc-top">
          <div className="cc-brand">
            <Mountain size={16} strokeWidth={1.6} />
            <span>SCENIC ROUTES</span>
          </div>
        </div>

        <h2 className="cc-heading">
          {t.heading1}
          <br />
          {t.heading2}
        </h2>

        <p className="cc-body">
          {t.body}{" "}
          <Link href="/datenschutz" className="cc-link">
            {t.privacyLink}
          </Link>
        </p>

        <div className="cc-actions">
          <button
            className="cc-btn cc-btn-gold"
            onClick={() => save({ necessary: true, googleMaps: true })}
          >
            <Check size={15} strokeWidth={2.4} /> {t.acceptAll}
          </button>

          <button
            className="cc-btn cc-btn-ghost"
            onClick={() => save({ necessary: true, googleMaps: false })}
          >
            <X size={15} strokeWidth={2.4} /> {t.rejectAll}
          </button>

          <button
            className="cc-btn cc-btn-outline"
            onClick={() => setShowSettings((p) => !p)}
          >
            <Settings size={15} strokeWidth={2.2} /> {t.settings}
          </button>
        </div>

        {showSettings && (
          <>
            <div className="cc-divider">
              <Mountain size={14} strokeWidth={1.6} />
            </div>

            <p className="cc-settings-heading">{t.settingsHeading}</p>

            <div className="cc-row">
              <div className="cc-row-icon">
                <ShieldCheck size={18} strokeWidth={1.8} />
              </div>

              <div className="cc-row-text">
                <p className="cc-row-title">
                  {t.necessaryTitle}{" "}
                  <span className="cc-badge">{t.necessaryBadge}</span>
                </p>
                <p className="cc-row-desc">{t.necessaryDesc}</p>
              </div>

              <label className="cc-switch cc-switch-disabled">
                <input type="checkbox" checked disabled readOnly />
                <span className="cc-switch-track">
                  <span className="cc-switch-knob" />
                </span>
              </label>
            </div>

            <div className="cc-row">
              <div className="cc-row-icon">
                <MapPin size={18} strokeWidth={1.8} />
              </div>

              <div className="cc-row-text">
                <p className="cc-row-title">{t.mapsTitle}</p>
                <p className="cc-row-desc">{t.mapsDesc}</p>
              </div>

              <label className="cc-switch">
                <input
                  type="checkbox"
                  checked={googleMaps}
                  onChange={(e) => setGoogleMaps(e.target.checked)}
                />
                <span className="cc-switch-track">
                  <span className="cc-switch-knob" />
                </span>
              </label>
            </div>

            <button
              className="cc-save"
              onClick={() => save({ necessary: true, googleMaps })}
            >
              {t.save}
            </button>
          </>
        )}

        <div className="cc-footer">
          <Link href="/datenschutz">{t.privacy}</Link>
          <span className="cc-footer-sep">|</span>
          <Link href="/impressum">{t.imprint}</Link>
        </div>
      </div>

      <style>{`
        .cc-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(10, 9, 7, 0.72);
          backdrop-filter: blur(6px);
        }

        .cc-card {
          width: 100%;
          max-width: 560px;
          max-height: 90vh;
          overflow-y: auto;
          background: #F5F0E6;
          border-radius: 20px;
          padding: 32px clamp(20px, 4vw, 40px) 28px;
          box-shadow: 0 40px 100px rgba(0,0,0,0.5);
          font-family: 'Inter', system-ui, sans-serif;
          color: #2B2620;
        }

        .cc-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 22px;
        }

        .cc-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.18em;
          color: #2B2620;
        }

        .cc-brand svg { color: #C9A86A; }

        .cc-heading {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-weight: 400;
          font-size: clamp(26px, 4vw, 32px);
          line-height: 1.15;
          letter-spacing: -0.01em;
          margin-bottom: 16px;
        }

        .cc-body {
          font-size: 13.5px;
          line-height: 1.65;
          color: rgba(43,38,32,0.72);
          margin-bottom: 24px;
        }

        .cc-link {
          color: #B4924F;
          text-decoration: underline;
          font-weight: 600;
        }

        .cc-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 8px;
        }

        .cc-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 13px 20px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all .2s;
          flex: 1 1 auto;
          white-space: nowrap;
        }

        .cc-btn-gold {
          background: #C9A86A;
          border: 1px solid #C9A86A;
          color: #1c1a15;
        }
        .cc-btn-gold:hover { background: #d8b978; }

        .cc-btn-ghost {
          background: #E7E0D0;
          border: 1px solid #E7E0D0;
          color: #2B2620;
        }
        .cc-btn-ghost:hover { background: #ddd4bf; }

        .cc-btn-outline {
          background: transparent;
          border: 1px solid rgba(43,38,32,0.28);
          color: #2B2620;
        }
        .cc-btn-outline:hover { background: rgba(43,38,32,0.05); }

        .cc-divider {
          display: flex;
          justify-content: center;
          color: #C9A86A;
          margin: 26px 0 20px;
          border-top: 1px solid rgba(43,38,32,0.12);
          position: relative;
        }
        .cc-divider svg {
          background: #F5F0E6;
          padding: 0 12px;
          position: relative;
          top: -10px;
        }

        .cc-settings-heading {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 14px;
        }

        .cc-row {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 16px;
          border: 1px solid rgba(43,38,32,0.12);
          border-radius: 14px;
          margin-bottom: 12px;
        }

        .cc-row-icon {
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          border-radius: 50%;
          background: rgba(201,168,106,0.16);
          color: #B4924F;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cc-row-text { flex: 1; min-width: 0; }

        .cc-row-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 17px;
          font-weight: 600;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .cc-badge {
          font-family: 'Inter', sans-serif;
          font-size: 8.5px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #B4924F;
          background: rgba(201,168,106,0.16);
          padding: 3px 8px;
          border-radius: 999px;
        }

        .cc-row-desc {
          font-size: 12.5px;
          line-height: 1.6;
          color: rgba(43,38,32,0.65);
        }

        .cc-switch {
          position: relative;
          flex-shrink: 0;
          width: 42px;
          height: 24px;
        }
        .cc-switch input {
          opacity: 0;
          width: 0;
          height: 0;
          position: absolute;
        }
        .cc-switch-track {
          position: absolute;
          inset: 0;
          background: rgba(43,38,32,0.18);
          border-radius: 999px;
          transition: background .2s;
        }
        .cc-switch input:checked + .cc-switch-track {
          background: #C9A86A;
        }
        .cc-switch-disabled {
          opacity: 0.9;
          cursor: not-allowed;
        }
        .cc-switch-knob {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          transition: transform .2s;
        }
        .cc-switch input:checked ~ .cc-switch-track .cc-switch-knob {
          transform: translateX(18px);
        }

        .cc-save {
          width: 100%;
          margin-top: 8px;
          padding: 15px;
          border-radius: 12px;
          background: #C9A86A;
          border: 1px solid #C9A86A;
          color: #1c1a15;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background .2s;
        }
        .cc-save:hover { background: #d8b978; }

        .cc-footer {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 22px;
          font-size: 11px;
        }
        .cc-footer a {
          color: rgba(43,38,32,0.55);
          text-decoration: underline;
        }
        .cc-footer a:hover { color: #2B2620; }
        .cc-footer-sep { color: rgba(43,38,32,0.3); }

        @media (max-width: 480px) {
          .cc-actions { flex-direction: column; }
          .cc-btn { width: 100%; }
        }
      `}</style>
    </div>
  );
}