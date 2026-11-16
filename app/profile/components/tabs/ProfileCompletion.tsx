"use client";

// NEU: Fortschritts-Ring fürs Profil mit eigenem 100-%-Zustand.
// - unter 100 %: wie bisher (goldener Ring, Prozentzahl)
// - bei 100 %:  goldene Medaille mit Häkchen, langsam umlaufendem Lichtschimmer
//               und Abzeichen „Profil vollständig“
// - beim ERSTEN Erreichen von 100 %: kleine Feier — Konfetti aus dem Ring,
//   der Ring „ploppt“ auf und unter dem Formular erscheint eine Erfolgsmeldung.
//   Pro Nutzer nur einmal (gemerkt im Browser), damit es nicht nervt.

import React, { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Check, PartyPopper } from "lucide-react";

const TEXT = {
  en: { complete: "complete", done: "Complete", badge: "Profile complete", title: "Your profile is complete!", sub: "Everything is set — your Traveller Pass now shows the full picture. Time to hit the road." },
  de: { complete: "vollständig", done: "Vollständig", badge: "Profil vollständig", title: "Dein Profil ist vollständig!", sub: "Alles ist eingerichtet – dein Traveller Pass zeigt jetzt das ganze Bild. Zeit für die nächste Straße." },
  ru: { complete: "заполнено", done: "Готово", badge: "Профиль заполнен", title: "Ваш профиль заполнен!", sub: "Всё готово — ваш Traveller Pass теперь полностью оформлен. Пора в путь." },
} as const;

type Lang = keyof typeof TEXT;
const tx = (lang: string) => TEXT[(lang in TEXT ? lang : "en") as Lang];

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Merkt sich pro Nutzer, ob die Feier schon gezeigt wurde */
const storageKey = (userId?: string) => `sr-profile-complete:${userId ?? "anon"}`;
function wasCelebrated(userId?: string) {
  try { return localStorage.getItem(storageKey(userId)) === "1"; } catch { return true; }
}
function markCelebrated(userId?: string) {
  try { localStorage.setItem(storageKey(userId), "1"); } catch { /* egal */ }
}

/** Liefert true für ein paar Sekunden, nachdem 100 % zum ersten Mal erreicht wurden */
export function useCompletionCelebration(pct: number, userId?: string, ready = true) {
  const [celebrating, setCelebrating] = useState(false);
  const prev = useRef<number | null>(null);
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    if (!ready || !userId) return;
    const before = prev.current;
    prev.current = pct;
    if (pct < 100) return;
    // feiern, wenn 100 % gerade eben erreicht wurden ODER noch nie gefeiert wurde
    // Sprünge in den ersten Sekunden ignorieren — das ist nur das Nachladen der Profildaten
    const justReached = before !== null && before < 100 && Date.now() - mountedAt.current > 2500;
    if (justReached || !wasCelebrated(userId)) {
      markCelebrated(userId);
      setCelebrating(true);
      const t = window.setTimeout(() => setCelebrating(false), CELEBRATE_MS);
      return () => window.clearTimeout(t);
    }
  }, [pct, userId, ready]);

  return celebrating;
}

const CELEBRATE_MS = 5200;   // so lange ist die Medaille nach Erreichen von 100 % zu sehen
const RING_OUT_MS = 1000;    // Dauer des Ausblendens

/**
 * Fortschritts-Ring.
 * - unter 100 %: normal sichtbar
 * - beim Erreichen von 100 %: goldene Medaille mit Konfetti, danach blendet der Ring
 *   weich aus (verkleinert sich, wird durchsichtig, der Platz schließt sich sanft)
 * - bei späteren Besuchen mit 100 %: kein Ring mehr
 */
export function CompletionRing({
  pct, lang, title, celebrating,
}: { pct: number; lang: string; title?: string; celebrating: boolean }) {
  const t = tx(lang);
  const done = pct >= 100;
  const style = { ["--p" as string]: `${pct}%` } as React.CSSProperties;
  const wrapRef = useRef<HTMLDivElement>(null);
  // zuletzt gemessene Maße — damit beim Wieder-Einblenden sofort die richtigen Werte da sind
  const sizeRef = useRef<{ w: number; gap: number }>({ w: 100, gap: 22 });

  // "shown" = sichtbar · "entering" = taucht gerade auf · "leaving" = blendet aus · "gone" = weg
  const [state, setState] = useState<"shown" | "entering" | "leaving" | "gone">(done && !celebrating ? "gone" : "shown");

  useEffect(() => {
    if (!done || celebrating) {
      // war der Ring weg (oder am Verschwinden)? → umgekehrt wieder einblenden
      let raf1 = 0, raf2 = 0;
      setState((s) => {
        if (s === "gone" || s === "leaving") {
          raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => setState("shown")); });
          return "entering";
        }
        return "shown";
      });
      return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
    }
    // 100 % und keine Feier (mehr) → weich ausblenden
    setState((s) => (s === "gone" ? "gone" : "leaving"));
    const timer = window.setTimeout(() => setState("gone"), RING_OUT_MS);
    return () => window.clearTimeout(timer);
  }, [done, celebrating]);

  // Breite (des Rings selbst, unabhängig vom Zustand) und Abstand messen,
  // damit beim Aus- und Einblenden auch der Platz weich zu- bzw. aufgeht
  useIsoLayoutEffect(() => {
    const el = wrapRef.current;
    const ring = el?.querySelector(".pb-ring") as HTMLElement | null;
    if (!el || !ring) return;
    const gap = el.parentElement ? parseFloat(getComputedStyle(el.parentElement).columnGap || "0") || 0 : 0;
    sizeRef.current = { w: ring.offsetWidth || sizeRef.current.w, gap };
    el.style.setProperty("--pc-w", `${sizeRef.current.w}px`);
    el.style.setProperty("--pc-gap", `${gap}px`);
  }, [state]);

  if (state === "gone") return <style>{CSS}</style>;

  return (
    <div
      ref={wrapRef}
      className={`pc-ring-wrap ${state === "leaving" || state === "entering" ? "is-leaving" : ""}`}
      style={{ ["--pc-w" as string]: `${sizeRef.current.w}px`, ["--pc-gap" as string]: `${sizeRef.current.gap}px` } as React.CSSProperties}
    >
      <div className={`pb-ring ${done ? "is-done" : ""} ${celebrating ? "is-celebrating" : ""}`} style={style} title={title}>
        {done && <span className="pc-sheen" aria-hidden="true" />}
        <div>
          {done ? (
            <>
              <span className="pc-check"><Check size={18} strokeWidth={3} /></span>
              <small className="pc-done">100%</small>
            </>
          ) : (
            <>
              <b>{pct}%</b>
              <small>{t.complete}</small>
            </>
          )}
        </div>
        {celebrating && <Confetti />}
      </div>
      <style>{CSS}</style>
    </div>
  );
}

/** Erfolgsmeldung unter dem Formular — nur während der Feier */
export function CompletionBanner({ show, lang }: { show: boolean; lang: string }) {
  const t = tx(lang);
  return (
    <AutoFade show={show} holdMs={4500}>
      <div className="pc-banner" role="status">
        <span className="pc-banner-icon"><PartyPopper size={18} strokeWidth={1.8} /></span>
        <span>
          <b>{t.title}</b>
          <small>{t.sub}</small>
        </span>
      </div>
    </AutoFade>
  );
}


/**
 * Blendet Inhalt sanft ein, lässt ihn `holdMs` stehen und blendet ihn dann weich aus —
 * dabei klappt auch die Höhe zusammen, sodass nichts darunter springt.
 * Wird `show` vorher false, verschwindet der Inhalt ebenfalls sanft.
 */
export function AutoFade({ show, holdMs = 3500, children }: { show: boolean; holdMs?: number; children: ReactNode }) {
  const [phase, setPhase] = useState<"hidden" | "enter" | "in" | "out">("hidden");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show) {
      setPhase((p) => (p === "in" || p === "enter" ? "out" : p));
      const t = window.setTimeout(() => setPhase((p) => (p === "out" ? "hidden" : p)), OUT_MS);
      return () => window.clearTimeout(t);
    }
    // erst zugeklappt einfügen, im nächsten Frame aufklappen → weiches Einblenden ohne Springen
    setPhase("enter");
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => setPhase("in")); });
    const t1 = window.setTimeout(() => setPhase("out"), holdMs);
    const t2 = window.setTimeout(() => setPhase("hidden"), holdMs + OUT_MS);
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [show, holdMs]);

  // Abstand (gap) des Elternelements übernehmen, damit beim Zuklappen auch die Lücke mitschrumpft
  useIsoLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    const gap = parseFloat(getComputedStyle(parent).rowGap || "0") || 0;
    el.style.setProperty("--pc-gap", `${gap}px`);
  }, [phase]);

  if (phase === "hidden") return null;
  return (
    <div ref={ref} className={`pc-fade ${phase === "out" || phase === "enter" ? "is-out" : ""}`}>
      <div>{children}</div>
    </div>
  );
}

const OUT_MS = 900;

function Confetti() {
  // feste Werte statt Math.random → gleiches Bild bei jedem Rendern
  const pieces = Array.from({ length: 26 }, (_, i) => {
    const angle = (i / 26) * Math.PI * 2 + (i % 3) * 0.2;
    const dist = 70 + ((i * 37) % 55);
    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist - 20,
      r: (i * 47) % 360,
      d: (i % 5) * 0.04,
      c: ["#C9A86A", "#E2C68E", "#F4EBD2", "#B98A4A", "#8E6A3C"][i % 5],
      w: i % 3 === 0 ? 4 : 7,
      h: i % 3 === 0 ? 4 : 3,
    };
  });
  return (
    <span className="pc-confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <i
          key={i}
          style={{
            ["--x" as string]: `${p.x}px`, ["--y" as string]: `${p.y}px`, ["--r" as string]: `${p.r}deg`,
            animationDelay: `${p.d}s`, background: p.c, width: p.w, height: p.h,
            borderRadius: p.w === p.h ? "50%" : 1,
          }}
        />
      ))}
    </span>
  );
}

const CSS = `
.pb-ring { position:relative; }
.pb-ring > div { position:relative; z-index:1; transition:transform .5s cubic-bezier(.22,1,.36,1); }

/* ---- 100 %: goldene Medaille ---- */
.pb-ring.is-done {
  background:conic-gradient(from 210deg, #B98A4A, #E9CF95, #C9A86A, #F4E2B2, #B98A4A) !important;
  box-shadow:0 0 0 4px rgba(201,168,106,.14), 0 10px 28px rgba(201,168,106,.35);
}
.pb-ring.is-done > div {
  background:radial-gradient(circle at 50% 35%, #FFFDF7, #F6EEDC) !important;
  box-shadow:inset 0 0 0 1px rgba(201,168,106,.35);
}
.dark .pb-ring.is-done > div { background:radial-gradient(circle at 50% 35%, #2A241B, #1C1812) !important; }
.pc-sheen { position:absolute; inset:0; border-radius:50%; pointer-events:none;
  background:conic-gradient(from 0deg, transparent 0 70%, rgba(255,255,255,.75) 80%, transparent 90%);
  -webkit-mask:radial-gradient(circle, transparent 80%, #000 81%); mask:radial-gradient(circle, transparent 80%, #000 81%);
  animation:pcSpin 4.5s linear infinite; }
@keyframes pcSpin { to { transform:rotate(360deg); } }
.pc-check { width:34px; height:34px; margin:0 auto; border-radius:50%; display:grid; place-items:center;
  background:linear-gradient(145deg,#D9B978,#B98A4A); color:#fff; box-shadow:0 4px 12px rgba(185,138,74,.45); }
.pb-ring small.pc-done { margin-top:5px; font-family:var(--serif); font-size:15px; font-weight:600; letter-spacing:.02em; color:#B98A4A; line-height:1; }

/* ---- Feier ---- */
.pb-ring.is-celebrating > div { animation:pcPop .9s cubic-bezier(.22,1.6,.36,1); }
.pb-ring.is-celebrating { animation:pcGlow 2.2s ease-out; }
@keyframes pcPop { 0% { transform:scale(.6); } 60% { transform:scale(1.12); } 100% { transform:scale(1); } }
@keyframes pcGlow { 0% { box-shadow:0 0 0 0 rgba(201,168,106,.6), 0 10px 28px rgba(201,168,106,.35); } 100% { box-shadow:0 0 0 26px rgba(201,168,106,0), 0 10px 28px rgba(201,168,106,.35); } }
.pc-confetti { position:absolute; left:50%; top:50%; width:0; height:0; z-index:3; pointer-events:none; }
.pc-confetti i { position:absolute; left:0; top:0; opacity:0; animation:pcFly 1.5s cubic-bezier(.15,.7,.3,1) forwards; }
@keyframes pcFly {
  0%   { opacity:1; transform:translate(-50%,-50%) rotate(0); }
  70%  { opacity:1; }
  100% { opacity:0; transform:translate(calc(-50% + var(--x)), calc(-50% + var(--y) + 40px)) rotate(var(--r)); }
}

/* ---- Ring weich ausblenden ---- */
.pc-ring-wrap { flex:none; width:var(--pc-w, auto); display:flex; justify-content:flex-end;
  transition:width 1s cubic-bezier(.4,0,.2,1), margin-left 1s cubic-bezier(.4,0,.2,1), opacity .8s ease, transform .9s cubic-bezier(.4,0,.2,1); }
.pc-ring-wrap.is-leaving { width:0; margin-left:calc(-1 * var(--pc-gap, 0px)); opacity:0; transform:scale(.6) rotate(-12deg); pointer-events:none; }
@media (max-width:760px) {
  /* am Handy sitzt der Ring oben rechts in der Ecke — dort nur ausblenden */
  .pb-hero .pc-ring-wrap { position:absolute; right:18px; top:18px; width:auto; }
  .pb-hero .pc-ring-wrap .pb-ring { position:static; }
  .pb-hero .pc-ring-wrap.is-leaving { margin-left:0; }
}

/* ---- Profil-Karte bei 100 % ---- */
.pb-hero.is-complete { box-shadow:0 0 0 1px rgba(201,168,106,.45), 0 18px 44px rgba(201,168,106,.14) !important; }

/* ---- Erfolgsmeldung ---- */
.pc-banner { display:flex; align-items:center; gap:14px; padding:14px 16px; border-radius:14px;
  background:linear-gradient(120deg, rgba(201,168,106,.16), rgba(201,168,106,.05)); border:1px solid rgba(201,168,106,.38); }
.pc-banner-icon { width:38px; height:38px; flex:none; border-radius:50%; display:grid; place-items:center;
  background:linear-gradient(145deg,#D9B978,#B98A4A); color:#fff; box-shadow:0 4px 12px rgba(185,138,74,.35); }
.pc-banner b { display:block; font-family:var(--serif); font-size:19px; font-weight:500; color:var(--cream); line-height:1.15; }
.pc-banner small { display:block; margin-top:3px; font-size:12.5px; color:var(--muted); line-height:1.45; }
@keyframes pcFade { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }

/* ---- sanftes Ein- und Ausblenden (AutoFade) ---- */
.pc-fade { display:grid; grid-template-rows:1fr; opacity:1; margin-bottom:0;
  transition:grid-template-rows .9s cubic-bezier(.4,0,.2,1), opacity .6s ease, margin-bottom .9s cubic-bezier(.4,0,.2,1), transform .6s ease; }
.pc-fade > div { min-height:0; overflow:hidden; }
.pc-fade.is-out { grid-template-rows:0fr; opacity:0; transform:translateY(-4px); margin-bottom:calc(-1 * var(--pc-gap, 0px)); }
@keyframes pcFadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }

@media (prefers-reduced-motion: reduce) {
  .pc-sheen, .pc-confetti, .pb-ring.is-celebrating, .pb-ring.is-celebrating > div, .pc-fade { animation:none !important; }
  .pc-ring-wrap { transition:opacity .4s ease !important; }
  .pc-confetti { display:none; }
}
`;