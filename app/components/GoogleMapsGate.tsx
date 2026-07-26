"use client";

// components/GoogleMapsGate.tsx
//
// Wrapt die Google-Maps-Karte auf der Route-Detail-Seite: Zeigt die Karte
// (children) nur, wenn der User dem "Google Maps"-Cookie zugestimmt hat.
// Sonst erscheint ein gestalteter Hinweis-Block mit Button zum direkten
// Aktivieren, plus Hinweis, dass man das auch dauerhaft im Profil unter
// Privacy ändern kann.
//
// Nutzt dieselbe Quelle (cookie_consents / localStorage) wie der
// Cookie-Banner und die Profile-Seite, damit alle drei Stellen synchron sind.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Map as MapIcon, Settings2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/LanguageContext";
import { getLocalConsent, getSupabaseConsent, persistConsent } from "@/lib/cookieConsent";

const TEXT = {
  de: {
    title: "Google Maps ist deaktiviert",
    body: "Du hast der Nutzung von Google Maps noch nicht zugestimmt. Aktiviere es, um die interaktive Karte für diese Route zu sehen.",
    enable: "Google Maps aktivieren",
    note: "Du kannst diese Einstellung jederzeit in deinem Profil unter Privacy ändern.",
    profileLink: "Zu den Einstellungen",
  },
  en: {
    title: "Google Maps is disabled",
    body: "You haven't consented to Google Maps yet. Enable it to see the interactive map for this route.",
    enable: "Enable Google Maps",
    note: "You can change this at any time in your Profile under Privacy.",
    profileLink: "Go to settings",
  },
} as const;

type Lang = keyof typeof TEXT;

export default function GoogleMapsGate({
  children,
  height,
}: {
  children: React.ReactNode;
  height: number | string;
}) {
  const { lang } = useLanguage();
  const t = TEXT[(lang as Lang) in TEXT ? (lang as Lang) : "de"];

  const [userId, setUserId] = useState<string | null>(null);
  const [consent, setConsent] = useState<boolean | null>(null); // null = noch am Laden
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? null;
      if (!mounted) return;
      setUserId(uid);

      if (uid) {
        const c = await getSupabaseConsent(uid);
        if (mounted) setConsent(c?.googleMaps ?? false);
      } else {
        const c = getLocalConsent();
        if (mounted) setConsent(c?.googleMaps ?? false);
      }
    }

    init();
    return () => { mounted = false; };
  }, []);

  async function handleEnable() {
    if (enabling) return;
    setEnabling(true);
    setConsent(true);
    await persistConsent({ necessary: true, googleMaps: true }, userId);
    setEnabling(false);
  }

  if (consent === null) {
    return (
      <div
        style={{ height }}
        className="gm-gate gm-gate-loading"
      >
        <style>{GATE_STYLES}</style>
      </div>
    );
  }

  if (consent) {
    return <>{children}</>;
  }

  return (
    <div className="gm-gate" style={{ height }}>
      <div className="gm-gate-icon">
        <MapIcon size={24} strokeWidth={1.5} />
      </div>

      <p className="gm-gate-title">{t.title}</p>
      <p className="gm-gate-body">{t.body}</p>

      <button className="gm-gate-btn" onClick={handleEnable} disabled={enabling}>
        {enabling ? "…" : t.enable}
      </button>

      <p className="gm-gate-note">
        {t.note}{" "}
        <Link href="/profile?tab=privacy" className="gm-gate-link">
          <Settings2 size={12} strokeWidth={2} /> {t.profileLink}
        </Link>
      </p>

      <style>{GATE_STYLES}</style>
    </div>
  );
}

const GATE_STYLES = `
  .gm-gate {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 32px 24px;
    text-align: center;
    background: var(--bg2, #111009);
    border: 1px dashed var(--border, rgba(237,229,212,0.14));
  }

  .gm-gate-loading {
    background: color-mix(in srgb, var(--bg2, #111009) 60%, transparent);
    border: none;
    animation: gmPulse 1.4s ease-in-out infinite;
  }
  @keyframes gmPulse { 0%,100% { opacity: 0.6; } 50% { opacity: 0.3; } }

  .gm-gate-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(16,185,129,0.1);
    color: #10b981;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .gm-gate-title {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 20px;
    font-weight: 500;
    color: var(--cream, #EDE5D4);
  }

  .gm-gate-body {
    font-size: 12.5px;
    line-height: 1.6;
    color: var(--muted, rgba(237,229,212,0.56));
    max-width: 340px;
  }

  .gm-gate-btn {
    margin-top: 4px;
    padding: 11px 26px;
    border: none;
    border-radius: 999px;
    background: #10b981;
    color: #05130d;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background .2s, transform .2s;
  }
  .gm-gate-btn:hover:not(:disabled) { background: #34d399; transform: translateY(-1px); }
  .gm-gate-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .gm-gate-note {
    font-size: 10.5px;
    color: var(--dim, rgba(237,229,212,0.32));
    max-width: 340px;
    line-height: 1.6;
  }

  .gm-gate-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: #10b981;
    text-decoration: underline;
    font-weight: 600;
  }
`;