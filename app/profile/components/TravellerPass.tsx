"use client";

import { forwardRef, useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Stamp } from "../types";
import { useLanguage } from "../../LanguageContext";

// react-pageflip touches the DOM on mount, so it must be client-only.
const HTMLFlipBook = dynamic(() => import("react-pageflip"), { ssr: false }) as any;

// GEÄNDERT: Der Pass ist jetzt ein echtes aufgeschlagenes Buch.
// - Geschlossen liegt nur der Umschlag rechts.
// - Beim Umblättern erscheint links die RÜCKSEITE der umgeblätterten Seite und
//   rechts die nächste Seite — wie bei einem echten Reisepass.
// - Umschlag vorne und hinten sind "hart" (blättern wie Karton).
// - Feste Seitengröße statt "stretch": dadurch wird unten nichts mehr
//   abgeschnitten. Die passende Größe gibt PassTab über `pageWidth` vor.
// - Die Seiten werden nur einmal erzeugt (useMemo), damit React das Buch
//   während der Animation nicht neu aufbaut — das hat vorher geruckelt.
//
// Reihenfolge der Seiten (Index):
//   0  Umschlag vorne            (rechts, allein)
//   1  Innenseite Umschlag  | 2  Ausweisseite
//   3  Stempel I            | 4  Stempel II
//   5  Umschlag hinten           (links, allein)

const TABS = [
  { id: "cover", page: 0, label: "Cover" },
  { id: "id", page: 1, label: "ID Page" },
  { id: "stamps", page: 3, label: "Stamps" },
] as const;

/** Basisgröße einer Seite — alle Inhalte sind für dieses Maß gebaut */
export const PASS_PAGE_W = 360;
export const PASS_PAGE_H = 510;

// чтобы паспорт было видно можно просто изменить на = true
const TRAVELLER_PASS_ENABLED = true;

const SERIF = "'Cormorant Garamond',Georgia,serif";
const GOLD = "rgba(200,180,110,.85)";
const PAPER = "linear-gradient(170deg,#f9f4eb 0%,#f2e9d6 60%,#ece0c8 100%)";
const COVER = "linear-gradient(160deg,#0e1a0e 0%,#142114 50%,#0e1a0e 100%)";
const COVER_PATTERN =
  "repeating-linear-gradient(45deg,rgba(255,255,255,.018) 0px,rgba(255,255,255,.018) 1px,transparent 1px,transparent 10px),repeating-linear-gradient(-45deg,rgba(255,255,255,.018) 0px,rgba(255,255,255,.018) 1px,transparent 1px,transparent 10px)";

const STAMP_STYLES = [
  { border: "rgba(180,100,60,.6)", bg: "rgba(180,100,60,.08)", icon: "rgba(180,100,60,.8)", text: "#5a2010", sub: "#8a4020" },
  { border: "rgba(60,110,180,.6)", bg: "rgba(60,110,180,.08)", icon: "rgba(60,110,180,.8)", text: "#102050", sub: "#204080" },
  { border: "rgba(40,130,80,.6)", bg: "rgba(40,130,80,.08)", icon: "rgba(40,130,80,.8)", text: "#0a3020", sub: "#1a6040" },
  { border: "rgba(140,80,180,.6)", bg: "rgba(140,80,180,.08)", icon: "rgba(140,80,180,.8)", text: "#301050", sub: "#602090" },
  { border: "rgba(180,140,40,.6)", bg: "rgba(180,140,40,.08)", icon: "rgba(180,140,40,.8)", text: "#3a2a00", sub: "#7a5a10" },
  { border: "rgba(60,150,160,.6)", bg: "rgba(60,150,160,.08)", icon: "rgba(60,150,160,.8)", text: "#0a3040", sub: "#1a6070" },
  { border: "rgba(180,60,80,.6)", bg: "rgba(180,60,80,.08)", icon: "rgba(180,60,80,.8)", text: "#4a0a14", sub: "#8a2030" },
  { border: "rgba(80,100,60,.6)", bg: "rgba(80,100,60,.08)", icon: "rgba(80,100,60,.8)", text: "#1a2810", sub: "#3a5020" },
];

const STAMPS_PER_PAGE = 6;

export default function TravellerPass({
  username, email, avatarPreview, initials, stamps, pageWidth = PASS_PAGE_W,
}: {
  username: string; email: string; avatarPreview: string; initials: string; stamps: Stamp[];
  /** Breite einer Seite in px (Höhe ergibt sich aus dem Seitenverhältnis) */
  pageWidth?: number;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const bookRef = useRef<any>(null);
  const { lang } = useLanguage();

  const pageW = Math.round(pageWidth);
  const pageH = Math.round((pageWidth * PASS_PAGE_H) / PASS_PAGE_W);
  const zoom = pageWidth / PASS_PAGE_W;

  const flipTo = useCallback((idx: number) => {
    const pf = bookRef.current?.pageFlip?.();
    if (!pf) return;
    setPageIndex(idx); // Buch rutscht schon beim Klick in die Mitte, nicht erst am Ende
    pf.flip(idx, "top");
  }, []);

  const onFlip = useCallback((e: any) => setPageIndex(e.data), []);

  // aktiver Reiter: welche Doppelseite gerade offen ist
  const activeTab = pageIndex === 0 ? "cover" : pageIndex <= 2 ? "id" : pageIndex <= 4 ? "stamps" : "cover";

  // Seiten nur neu erzeugen, wenn sich Daten oder Größe ändern — nicht beim Umblättern
  const leaves = useMemo(
    () => renderLeaves({ username, email, avatarPreview, initials, stamps, zoom, onOpen: () => flipTo(1) }),
    [username, email, avatarPreview, initials, stamps, zoom, flipTo]
  );

  const passportContent = (
    <div className="tp-root" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, width: "100%" }}>
      <div className="tp-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => flipTo(tab.page)}
            className={activeTab === tab.id ? "is-active" : ""}
          >
            {tab.id === "stamps" ? `${tab.label} (${stamps.length})` : tab.label}
          </button>
        ))}
      </div>

      {/* Geschlossen liegt der Umschlag mittig — beim Aufklappen rutscht das Buch zur Seite,
          wie wenn man einen echten Pass öffnet */}
      <div
        className="tp-book"
        style={{
          height: pageH,
          transform: `translateX(${pageIndex === 0 ? -pageW / 2 : pageIndex >= 5 ? pageW / 2 : 0}px)`,
        }}
      >
        {(
          <HTMLFlipBook
            // neue Größe → Buch neu aufbauen (react-pageflip kann seine Größe nicht live ändern)
            key={`${pageW}x${pageH}`}
            ref={bookRef}
            width={pageW}
            height={pageH}
            size="fixed"
            minWidth={pageW}
            maxWidth={pageW}
            minHeight={pageH}
            maxHeight={pageH}
            showCover={true}
            usePortrait={true}
            flippingTime={1100}
            drawShadow={true}
            maxShadowOpacity={0.55}
            mobileScrollSupport={false}
            swipeDistance={20}
            showPageCorners={true}
            startZIndex={0}
            autoSize={false}
            clickEventForward={true}
            useMouseEvents={true}
            onFlip={onFlip}
            className="passport-flipbook"
            // feste Breite für zwei Seiten: nur so zeigt react-pageflip die Doppelseite.
            // Ist weniger Platz da (Handy), wird automatisch eine Einzelseite daraus.
            style={{ width: pageW * 2, maxWidth: "100%" }}
          >
            {leaves}
          </HTMLFlipBook>
        )}
      </div>

      <style>{`
        .tp-tabs { display:flex; border:1px solid var(--border); border-radius:10px; overflow:hidden; background:color-mix(in srgb, var(--bg2) 60%, transparent); }
        .tp-tabs button { padding:11px 22px; font:800 11px Inter,sans-serif; letter-spacing:.16em; text-transform:uppercase; color:var(--dim); background:none; border:none; border-right:1px solid var(--border); cursor:pointer; transition:color .25s, background .25s; }
        .tp-tabs button:last-child { border-right:none; }
        .tp-tabs button.is-active { color:#C9A86A; background:rgba(201,168,106,0.08); }
        .tp-tabs button:hover { color:var(--cream); }
        .tp-book { display:flex; justify-content:center; width:100%; transition:transform .8s cubic-bezier(.22,1,.36,1); }
        @media (max-width:760px) { .tp-book { transform:none !important; } }
        .passport-flipbook { margin:0 auto; }
        .passport-flipbook .stf__block { filter:drop-shadow(0 18px 34px rgba(0,0,0,.35)); }
        .passport-flipbook .stf__item { will-change:transform; backface-visibility:hidden; -webkit-font-smoothing:antialiased; }
        .passport-leaf { width:100%; height:100%; overflow:hidden; background:#f2e9d6; }
        .passport-leaf, .passport-leaf * { box-sizing:border-box; }
        .passport-leaf.is-cover { background:#101b10; border-radius:4px 12px 12px 4px; }
        .passport-leaf.is-back { background:#101b10; border-radius:12px 4px 4px 12px; }
        .passport-leaf.is-left { box-shadow:inset -18px 0 24px -18px rgba(60,40,10,.35); }
        .passport-leaf.is-right { box-shadow:inset 18px 0 24px -18px rgba(60,40,10,.35); }
        .passport-leaf-inner { width:${PASS_PAGE_W}px; height:${PASS_PAGE_H}px; }
      `}</style>
    </div>
  );

  if (TRAVELLER_PASS_ENABLED) return passportContent;

  // --- Coming-Soon-Zustand (unverändert) ---
  const comingSoonTexts = {
    en: { badge: "Coming Soon", title: "Traveller Pass is on its way", text: "We're putting the finishing touches on your digital passport. Check back soon." },
    de: { badge: "Bald verfügbar", title: "Dein Traveller Pass ist bald da", text: "Wir legen letzte Hand an dein digitales Reisepass an. Schau bald wieder vorbei." },
    ru: { badge: "Скоро", title: "Паспорт Путешественника уже в пути", text: "Мы вносим последние штрихи в ваш цифровой паспорт. Загляните позже." },
  } as const;
  const cs = comingSoonTexts[lang as keyof typeof comingSoonTexts] ?? comingSoonTexts.en;
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div aria-hidden="true" style={{ filter: "blur(25px) saturate(70%)", pointerEvents: "none", userSelect: "none" }}>
        {passportContent}
      </div>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center", maxWidth: 340, padding: "36px 32px", borderRadius: 16, border: "1px solid var(--border)", background: "color-mix(in srgb, var(--bg2) 88%, transparent)", backdropFilter: "blur(6px)", boxShadow: "0 24px 60px rgba(0,0,0,.45)" }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".18em", textTransform: "uppercase", color: "#C9A86A", padding: "6px 16px", border: "1px solid rgba(201,168,106,.4)", borderRadius: 999, background: "rgba(201,168,106,.08)" }}>{cs.badge}</div>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--fg)" }}>{cs.title}</h3>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--dim)" }}>{cs.text}</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Seiten */

type PageProps = {
  username: string; email: string; avatarPreview: string; initials: string;
  stamps: Stamp[]; zoom: number; onOpen: () => void;
};

/**
 * react-pageflip braucht seine Seiten als DIREKTE Kinder (jede Seite ein div mit ref),
 * deshalb geben wir ein Array zurück. Jede Seite ist in Basisgröße gebaut und wird
 * mit CSS `zoom` auf die tatsächliche Seitengröße gebracht — so bleibt die Schrift
 * scharf und Klicks/Ziehen im Buch treffen genau.
 */
function renderLeaves(p: PageProps) {
  const leaf = (key: string, cls: string, hard: boolean, child: React.ReactNode) => (
    <Leaf key={key} cls={cls} hard={hard} zoom={p.zoom}>{child}</Leaf>
  );
  const first = p.stamps.slice(0, STAMPS_PER_PAGE);
  const second = p.stamps.slice(STAMPS_PER_PAGE, STAMPS_PER_PAGE * 2);
  return [
    // alle Seiten "soft": auch der Umschlag biegt sich beim Öffnen wie Papier —
    // das ergibt die Buch-Aufschlag-Animation mit gewölbter Seite und Schatten
    leaf("cover", "is-cover", false, <CoverFront onOpen={p.onOpen} />),
    leaf("inside", "is-left", false, <InsideCover />),
    leaf("id", "is-right", false, <IdPage {...p} />),
    leaf("st1", "is-left", false, <StampsPage stamps={first} offset={0} total={p.stamps.length} part={1} />),
    leaf("st2", "is-right", false, <StampsPage stamps={second} offset={STAMPS_PER_PAGE} total={p.stamps.length} part={2} />),
    leaf("back", "is-back", false, <CoverBack />),
  ];
}

/* react-pageflip setzt eine ref auf jede Seite → forwardRef nötig */
const Leaf = forwardRef<HTMLDivElement, { cls: string; hard: boolean; zoom: number; children: ReactNode }>(
  function Leaf({ cls, hard, zoom, children }, ref) {
    return (
      <div ref={ref} className={`passport-leaf ${cls}`} data-density={hard ? "hard" : "soft"}>
        <div className="passport-leaf-inner" style={{ zoom }}>{children}</div>
      </div>
    );
  }
);

function CoverFront({ onOpen }: { onOpen: () => void }) {
  return (
    <div style={{ background: COVER, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "44px 36px 40px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: COVER_PATTERN }} />
      <span style={{ position: "relative", fontSize: 10, letterSpacing: ".32em", textTransform: "uppercase", color: "rgba(200,180,110,.5)" }}>International</span>
      <img src="/logo2.png" alt="Scenic Routes" style={{ position: "relative", width: 250, height: 190, objectFit: "contain", display: "block" }} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 9 }}>
        <span style={{ fontSize: 26, letterSpacing: ".22em", textTransform: "uppercase", color: GOLD, fontFamily: SERIF }}>Passport</span>
        <span style={{ fontSize: 9.5, letterSpacing: ".14em", color: "rgba(200,180,110,.35)", textTransform: "uppercase" }}>Passeport · Pasaporte · Reisepass</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "1fr 1fr 1fr", gap: 2, padding: 6, width: 58, height: 40, border: "1.5px solid rgba(200,180,110,.28)", borderRadius: 6, marginTop: 6 }}>
          {[0, 0, 0, 0, 1, 0, 1, 0, 0].map((big, i) => <div key={i} style={{ background: `rgba(200,180,110,${big ? 0.32 : 0.18})`, borderRadius: 1 }} />)}
        </div>
        <button type="button" onClick={onOpen} style={{ marginTop: 14, padding: "10px 28px", border: "1px solid rgba(200,180,110,.4)", borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "rgba(200,180,110,.8)", background: "transparent", cursor: "pointer" }}>
          Open passport →
        </button>
      </div>
    </div>
  );
}

function InsideCover() {
  return (
    <div style={{ background: PAPER, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: "40px 40px", position: "relative", overflow: "hidden", textAlign: "center", color: "#3a2a10" }}>
      <Guilloche />
      <div style={{ position: "relative", fontSize: 30, color: "rgba(138,106,32,.55)" }}>✦</div>
      <p style={{ position: "relative", fontFamily: SERIF, fontSize: 22, lineHeight: 1.25, color: "#3a2a10" }}>
        The holder of this passport<br /><em style={{ color: "#8a6a20" }}>seeks the road less travelled.</em>
      </p>
      <p style={{ position: "relative", fontSize: 10.5, lineHeight: 1.7, color: "#7a6040", maxWidth: 240 }}>
        Every route you complete earns a stamp in this passport. Collect them across mountains, coasts and countries.
      </p>
      <div style={{ position: "relative", marginTop: 8, fontSize: 8, letterSpacing: ".26em", textTransform: "uppercase", color: "#8a6a40" }}>Scenic Routes International</div>
    </div>
  );
}

function IdPage({ username, email, avatarPreview, initials, stamps }: PageProps) {
  const today = new Date();
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, "0")} ${d.toLocaleString("en", { month: "short" })} ${d.getFullYear()}`;
  const issued = fmt(today);
  const expiry = fmt(new Date(today.getFullYear() + 10, today.getMonth(), today.getDate()));
  const displayName = username || email.split("@")[0];
  const mrzName = displayName.toUpperCase().replace(/[^A-Z]/g, "");
  const label = { fontSize: 7.5, letterSpacing: ".18em", textTransform: "uppercase" as const, color: "#8a6a40", fontWeight: 700 };
  const field = { display: "flex", flexDirection: "column" as const, gap: 2, borderBottom: ".5px solid rgba(90,60,16,.15)", paddingBottom: 6 };

  return (
    <div style={{ background: PAPER, height: "100%", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", color: "#1a1200" }}>
      <Guilloche />
      <div style={{ position: "relative", background: "linear-gradient(135deg,#1a3a1a,#2a5a2a)", padding: "13px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: ".28em", textTransform: "uppercase", color: GOLD, fontWeight: 700 }}>Scenic Routes</div>
          <div style={{ fontSize: 8.5, letterSpacing: ".16em", color: "rgba(200,180,110,.48)", textTransform: "uppercase", marginTop: 3 }}>Traveller Passport</div>
        </div>
        <div style={{ fontSize: 22, color: "rgba(200,180,110,.55)" }}>✦</div>
      </div>

      <div style={{ position: "relative", display: "flex", gap: 16, padding: "18px 20px 10px" }}>
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
          {avatarPreview
            ? <img src={avatarPreview} alt="" style={{ width: 92, height: 114, objectFit: "cover", border: "2px solid #b8921a", borderRadius: 2, display: "block", background: "#eadfc6" }} />
            : <div style={{ width: 92, height: 114, border: "2px solid #b8921a", borderRadius: 2, background: "linear-gradient(135deg,#e8dcc0,#d4c490)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontSize: 40, color: "#8a6a20" }}>{initials}</div>}
          <div style={{ width: 92, height: 28, borderBottom: "1px solid #b8921a", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 2, marginTop: 4 }}>
            <span style={{ fontFamily: SERIF, fontSize: 14, fontStyle: "italic", color: "#5a3a10", opacity: .65, whiteSpace: "nowrap", overflow: "hidden", maxWidth: 90 }}>{displayName}</span>
          </div>
          <span style={{ fontSize: 6.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#8a6a40" }}>Signature</span>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 9 }}>
          {[
            ["Surname / Nom", displayName.toUpperCase()],
            ["Given names / Prénoms", "ROUTE EXPLORER"],
            ["Nationality", "WORLD TRAVELLER"],
          ].map(([l, v]) => (
            <div key={l} style={field}>
              <span style={label}>{l}</span>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".04em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span>
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={field}><span style={label}>Issued</span><span style={{ fontSize: 11, fontWeight: 700 }}>{issued}</span></div>
            <div style={field}><span style={label}>Expires</span><span style={{ fontSize: 11, fontWeight: 700, color: "#8a1a1a" }}>{expiry}</span></div>
          </div>
        </div>
      </div>

      <div style={{ position: "relative", margin: "4px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", background: "rgba(26,58,26,.06)", border: ".5px solid rgba(26,58,26,.15)", borderRadius: 3 }}>
        <span style={label}>Routes completed</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#7a5a18" }}>{stamps.length} destination{stamps.length !== 1 ? "s" : ""}</span>
      </div>

      <div style={{ marginTop: "auto", padding: "11px 16px 14px", background: "#1a3a1a", fontFamily: "'Courier New',monospace", fontSize: 9, color: "rgba(200,180,110,.65)", letterSpacing: ".05em", lineHeight: 1.75, wordBreak: "break-all", position: "relative" }}>
        <div style={{ fontSize: 7.5, letterSpacing: ".2em", textTransform: "uppercase", color: "rgba(200,180,110,.3)", marginBottom: 4 }}>Machine readable zone</div>
        <div>{("P<SRT" + mrzName + "<".repeat(44)).slice(0, 44)}</div>
        <div>{("SR" + String(stamps.length).padStart(7, "0") + "0SRT" + String(today.getFullYear()).slice(2) + "0101" + "<".repeat(44)).slice(0, 44)}</div>
      </div>
    </div>
  );
}

function StampsPage({ stamps, offset, total, part }: { stamps: Stamp[]; offset: number; total: number; part: 1 | 2 }) {
  const empty = Math.max(0, STAMPS_PER_PAGE - stamps.length);
  return (
    <div style={{ background: PAPER, height: "100%", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <Guilloche />
      <div style={{ position: "relative", padding: "18px 22px 10px", display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: ".5px solid rgba(90,60,16,.18)", margin: "0 0 4px" }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: ".28em", textTransform: "uppercase", color: "#5a4010", fontWeight: 800 }}>Entry Stamps {part === 2 ? "II" : "I"}</div>
          <div style={{ fontSize: 8, letterSpacing: ".14em", color: "#9a8060", textTransform: "uppercase", marginTop: 3 }}>Cachets d'entrée · Sellos de entrada</div>
        </div>
        <span style={{ fontFamily: SERIF, fontSize: 18, color: "#8a6a20" }}>{part === 1 ? "4" : "5"}</span>
      </div>

      {total === 0 && part === 1 ? (
        <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 28, textAlign: "center" }}>
          <div style={{ fontSize: 44, opacity: .2, color: "#5a3a10" }}>✦</div>
          <p style={{ fontSize: 13, color: "#8a6a40", lineHeight: 1.7 }}>No stamps yet.<br />Complete routes to earn your first stamp.</p>
          <Link href="/explore" style={{ padding: "10px 22px", border: "1px solid #8a6a20", borderRadius: 999, fontSize: 9, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: "#8a6a20", textDecoration: "none" }}>Explore Routes →</Link>
        </div>
      ) : (
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(2,1fr)", gridAutoRows: 112, gap: 12, padding: "14px 22px", flex: 1, alignContent: "start" }}>
          {stamps.map((s, i) => {
            const st = STAMP_STYLES[(offset + i) % STAMP_STYLES.length];
            const rot = [-6, 4, -3, 7, -8, 2][(offset + i) % 6];
            return (
              <div key={s.id ?? `${offset + i}`} style={{ border: `2px solid ${st.border}`, background: st.bg, borderRadius: (offset + i) % 3 === 0 ? "50%" : 6, display: "flex", alignItems: "center", justifyContent: "center", transform: `rotate(${rot}deg)`, margin: "0 8px" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: 8, textAlign: "center" }}>
                  <div style={{ fontSize: 17, lineHeight: 1, color: st.icon }}>◎</div>
                  <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", lineHeight: 1.3, color: st.text }}>{s.title}</div>
                  <div style={{ fontSize: 7, letterSpacing: ".14em", textTransform: "uppercase", color: st.sub }}>{s.country}</div>
                  {s.completed_at && <div style={{ fontSize: 7, fontFamily: "'Courier New',monospace", color: st.sub, opacity: .7 }}>{new Date(s.completed_at).toLocaleDateString("en", { month: "short", year: "numeric" })}</div>}
                </div>
              </div>
            );
          })}
          {Array.from({ length: empty }).map((_, i) => (
            <div key={`e${i}`} style={{ border: "1.5px dashed rgba(90,60,16,.14)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 8px" }}>
              <span style={{ fontSize: 15, opacity: .14, color: "#5a3a10" }}>✦</span>
            </div>
          ))}
        </div>
      )}

      {part === 2 && (
        <div style={{ position: "relative", padding: "10px 22px 16px", borderTop: ".5px solid rgba(90,60,16,.15)", fontSize: 10.5, color: "#5a3a10", fontWeight: 500 }}>
          {total} of {STAMPS_PER_PAGE * 2} stamps collected
        </div>
      )}
    </div>
  );
}

function CoverBack() {
  return (
    <div style={{ background: COVER, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", padding: 40, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: COVER_PATTERN }} />
      <span style={{ position: "relative", fontSize: 20, color: "rgba(200,180,110,.45)" }}>✦</span>
      <span style={{ position: "relative", marginTop: 10, fontSize: 8.5, letterSpacing: ".26em", textTransform: "uppercase", color: "rgba(200,180,110,.35)" }}>Explore Scenic Routes</span>
    </div>
  );
}

/** feines Sicherheitsmuster wie in echten Pässen */
function Guilloche() {
  return (
    <svg aria-hidden="true" viewBox="0 0 360 510" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      {Array.from({ length: 18 }).map((_, k) => (
        <ellipse key={k} cx="180" cy="255" rx={30 + k * 11} ry={16 + k * 7} fill="none" stroke="rgba(150,120,70,.09)" strokeWidth=".7" transform={`rotate(${k * 9} 180 255)`} />
      ))}
    </svg>
  );
}