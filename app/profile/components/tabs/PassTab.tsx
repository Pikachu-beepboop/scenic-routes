"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import TravellerPass, { PASS_PAGE_W, PASS_PAGE_H } from "../TravellerPass";
import type { Stamp } from "../../types";

// GEÄNDERT: Der Pass bekommt seine Seitengröße passend zum freien Platz in der Karte.
// Wir messen Breite und Höhe bis zum unteren Kartenrand und rechnen daraus die
// Seitenbreite aus — das Buch (zwei Seiten nebeneinander + Reiter darüber) passt
// dadurch immer komplett hinein, ohne Scrollen und ohne abgeschnittenen Rand.
// Kein transform: scale mehr — die Seiten werden in echter Größe gerendert,
// dadurch bleibt die Blätter-Animation flüssig und Klicks treffen genau.

const DESKTOP_MIN_WIDTH = 761;
const TABS_AND_GAP = 64;   // Höhe der Reiter (Cover / ID Page / Stamps) + Abstand
const BOTTOM_GAP = 26;     // Luft zum unteren Kartenrand (Platz für den Schatten)
const SIDE_GAP = 40;
const MIN_PAGE_W = 200;

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function PassTab({
  username, email, avatarPreview, initials, stamps,
}: {
  username: string; email: string; avatarPreview: string; initials: string; stamps: Stamp[];
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [pageW, setPageW] = useState<number | null>(null);

  const fit = useCallback(() => {
    const outer = outerRef.current;
    if (!outer) return;

    const vw = window.innerWidth;
    const desktop = vw >= DESKTOP_MIN_WIDTH && window.innerHeight >= 600;
    const availW = outer.clientWidth - SIDE_GAP;

    let w: number;
    if (desktop) {
      // Höhe: von der Oberkante des Passes bis zum unteren Rand der Karte
      const top = outer.getBoundingClientRect().top;
      const card =
        (outer.closest(".pb-panel") as HTMLElement | null) ||
        (outer.closest(".st-body") as HTMLElement | null);
      const bottom = card ? card.getBoundingClientRect().bottom : window.innerHeight;
      const availH = bottom - top - TABS_AND_GAP - BOTTOM_GAP;
      const byHeight = (availH * PASS_PAGE_W) / PASS_PAGE_H;
      const byWidth = availW / 2; // zwei Seiten nebeneinander
      w = Math.min(PASS_PAGE_W * 1.15, byHeight, byWidth);
    } else {
      // Handy: eine Seite, so breit wie möglich
      w = Math.min(PASS_PAGE_W, availW);
    }
    w = Math.max(MIN_PAGE_W, Math.floor(w));
    // nur bei spürbarer Änderung neu aufbauen (das Buch wird dabei neu erzeugt)
    setPageW((prev) => (prev !== null && Math.abs(prev - w) < 6 ? prev : w));
  }, []);

  useIsoLayoutEffect(() => {
    fit();
    let t: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => { clearTimeout(t); t = setTimeout(fit, 120); };
    window.addEventListener("resize", onResize);
    document.fonts?.ready.then(() => fit()).catch(() => {});
    return () => { clearTimeout(t); window.removeEventListener("resize", onResize); };
  }, [fit]);

  return (
    <div className="st-content wide pp-pass-fit" ref={outerRef}>
      {pageW !== null && (
        <TravellerPass
          username={username}
          email={email}
          avatarPreview={avatarPreview}
          initials={initials}
          stamps={stamps}
          pageWidth={pageW}
        />
      )}

      <style>{`
        /* alte Verkleinerungsregeln aus profile.css abschalten — die Größe kommt jetzt von hier */
        .pp-pass-fit .pp-pass-scale-wrap { zoom:1 !important; transform:none !important; width:100% !important; margin:0 !important; }
        @media (min-width:761px) and (min-height:600px) {
          .pb-panel-body:has(.pp-pass-fit),
          .pb-content:has(.pp-pass-fit) { overflow:hidden !important; }
        }
      `}</style>
    </div>
  );
}