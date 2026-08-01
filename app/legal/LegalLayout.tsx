"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import "./legal.css";

export default function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  const router = useRouter();

  // Bringt den User zurück zu der Seite, von der aus er den Legal-Text
  // geöffnet hat (Homepage-Footer, Explore, Profile-About-Tab, etc.) —
  // unabhängig davon, ob er eingeloggt ist. Vorher ging es immer fest zu
  // /profile?tab=about, was nicht eingeloggte User sofort weiter auf "/"
  // geschickt hat, egal woher sie kamen.
  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      // Fallback, falls die Seite direkt aufgerufen wurde (kein Vorgänger
      // in der History, z. B. Lesezeichen oder Link von außerhalb)
      router.push("/");
    }
  };

  return (
    <div className="lp">
      <div className="lp-bg" />
      <div className="lp-card">
        <button type="button" onClick={handleBack} className="lp-back">
          <ChevronLeft size={16} strokeWidth={2} /> Back
        </button>

        <h1 className="lp-title">{title}</h1>
        {updated && <p className="lp-updated">Last updated: {updated}</p>}

        <div className="lp-body">{children}</div>
      </div>
    </div>
  );
}