"use client";

import { useState, type ReactNode } from "react";
import {
  User, Settings as SettingsIcon, Mail, Lock, Smartphone, Monitor,
  Award, Bell, ShieldCheck, LifeBuoy, Info, LogOut, Search, X,
} from "lucide-react";
import { useLanguage } from "../../LanguageContext";
import type { SubTabId } from "../types";
import { isTabHidden, HIDE_UNFINISHED_PREFERENCES, HIDE_TUTORIALS_ROW } from "../betaConfig";
import type { TranslationKey } from "@/lib/translations";

// NEU (Variante B): Seitenleiste wie eine Einstellungs-App — oben die eigene Person,
// darunter eine Suche und drei klare Gruppen (Konto · Einstellungen · Hilfe) mit
// Symbolen und kleinen Hinweisen (Anzahl Stempel, "bald verfügbar").

const SMALL_TEXT = {
  en: { search: "Search settings…", account: "Account", settings: "Settings", help: "Help", soon: "Soon", noResults: "Nothing found" },
  de: { search: "Einstellungen suchen…", account: "Konto", settings: "Einstellungen", help: "Hilfe", soon: "Bald", noResults: "Nichts gefunden" },
  ru: { search: "Поиск настроек…", account: "Аккаунт", settings: "Настройки", help: "Помощь", soon: "Скоро", noResults: "Ничего не найдено" },
} as const;

/* ------------------------------------------------------------------ Suche in Details
   Jeder Bereich listet die Einstellungen/Felder, die darin vorkommen (als Übersetzungs-Keys,
   damit die Suche in jeder Sprache funktioniert), plus ein paar Suchwörter, die so nicht
   auf der Seite stehen (z. B. "Avatar" findet das Profilbild). */
const DETAIL_KEYS: Partial<Record<SubTabId, TranslationKey[]>> = {
  profile: [
    "profile.info.displayName", "profile.info.username", "profile.info.country", "profile.info.city",
    "profile.info.aboutYou", "profile.completion.title", "profile.avatar.change", "profile.danger.title", "profile.danger.delete",
  ],
  pass: [],
  preferences: ["prefs.distanceUnit", "prefs.language", "prefs.km", "prefs.mi", ...(HIDE_UNFINISHED_PREFERENCES ? [] : (["prefs.startPage", "prefs.mapStyle"] as TranslationKey[]))],
  email: ["profile.email.current", "profile.email.newTitle", "profile.email.confirmTitle", "profile.email.change"],
  password: ["profile.password.new", "profile.password.confirm", "profile.password.change"],
  twofa: ["profile.twofa.app"],
  sessions: ["profile.sessions.currentSession", "profile.sessions.signOutOthers"],
  notifications: ["profile.notif.nearby", "profile.notif.reminders", "profile.notif.community"],
  privacy: ["profile.privacy.maps", "profile.privacy.track"],
  support: ["profile.support.faq", "profile.support.contact", "profile.support.feedback", ...(HIDE_TUTORIALS_ROW ? [] : (["profile.support.tutorials"] as TranslationKey[]))],
  about: ["profile.about.version", "profile.about.terms", "profile.about.privacy", "profile.about.imprint"],
};

/* Zusätzliche Suchwörter je Bereich (en/de/ru gemischt — wird nur verglichen, nie angezeigt) */
const EXTRA_WORDS: Partial<Record<SubTabId, string[]>> = {
  profile: ["avatar", "photo", "picture", "bild", "foto", "profilbild", "name", "bio", "delete account", "konto löschen", "account löschen", "фото", "аватар", "удалить аккаунт"],
  pass: ["stamps", "stempel", "passport", "reisepass", "штамп", "паспорт"],
  preferences: ["units", "einheit", "kilometer", "miles", "meilen", "sprache", "deutsch", "english", "русский", "язык"],
  email: ["e-mail", "mail", "adresse", "почта"],
  password: ["passwort", "kennwort", "пароль"],
  twofa: ["2fa", "two factor", "zwei-faktor", "authenticator", "sicherheit", "security"],
  privacy: ["datenschutz", "cookies", "google maps", "tracking", "aktivität", "конфиденциальность"],
  support: ["help", "hilfe", "kontakt", "faq", "feedback", "bug", "fehler", "помощь"],
  about: ["impressum", "agb", "terms", "version", "datenschutzerklärung"],
};

/** Kleinbuchstaben, ohne Akzente — "Größe" findet auch "grosse" nicht, aber "Español" findet "espanol" */
const norm = (v: string) => v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

type NavItem = {
  id: SubTabId | "trips";
  label: string;
  icon: ReactNode;
  badge?: string;
  badgeTone?: "gold" | "muted";
};

export default function SettingsNav({
  subTab, setSubTab, onJumpToDetail,
  onNavigateTrips, handleLogout,
  user, avatarPreview, initials, displayName, stampsCount,
}: {
  subTab: SubTabId; setSubTab: (id: SubTabId) => void;
  /** NEU: nach Klick auf einen Treffer zur passenden Stelle im Bereich springen */
  onJumpToDetail?: (text: string) => void;
  // Werden nicht mehr benötigt (Gruppen sind immer offen), bleiben aber erlaubt,
  // damit ältere Aufrufe weiter funktionieren.
  accountGroupOpen?: boolean; setAccountGroupOpen?: (fn: (v: boolean) => boolean) => void;
  securityGroupOpen?: boolean; setSecurityGroupOpen?: (fn: (v: boolean) => boolean) => void;
  onNavigateTrips: () => void;
  handleLogout: () => void;
  user?: any;
  avatarPreview?: string;
  initials?: string;
  displayName?: string;
  stampsCount?: number;
}) {
  const { t, lang } = useLanguage();
  const tx = SMALL_TEXT[(lang in SMALL_TEXT ? lang : "en") as keyof typeof SMALL_TEXT];
  const [query, setQuery] = useState("");

  // Mobile: horizontale Leiste wie bisher
  const MOBILE_TABS = [
    { id: "profile" as const,       label: t("profile.subtab.profile.title"), icon: <User size={13} strokeWidth={1.8} /> },
    { id: "pass" as const,          label: t("profile.nav.passShort"),        icon: <Award size={13} strokeWidth={1.8} /> },
    { id: "preferences" as const,   label: t("prefs.title"),                  icon: <SettingsIcon size={13} strokeWidth={1.8} /> },
    { id: "email" as const,         label: t("profile.nav.emailShort"),       icon: <Mail size={13} strokeWidth={1.8} /> },
    { id: "password" as const,      label: t("profile.nav.passwordShort"),    icon: <Lock size={13} strokeWidth={1.8} /> },
    { id: "twofa" as const,         label: t("profile.nav.twofaShort"),       icon: <Smartphone size={13} strokeWidth={1.8} /> },
    { id: "sessions" as const,      label: t("profile.nav.sessionsShort"),    icon: <Monitor size={13} strokeWidth={1.8} /> },
    { id: "notifications" as const, label: t("profile.nav.notificationsShort"), icon: <Bell size={13} strokeWidth={1.8} /> },
    { id: "privacy" as const,       label: t("profile.nav.privacyShort"),     icon: <ShieldCheck size={13} strokeWidth={1.8} /> },
    { id: "support" as const,       label: t("profile.nav.supportShort"),     icon: <LifeBuoy size={13} strokeWidth={1.8} /> },
    { id: "about" as const,         label: t("profile.nav.aboutShort"),       icon: <Info size={13} strokeWidth={1.8} /> },
  ];

  const GROUPS: { id: string; label: string; items: NavItem[] }[] = [
    {
      id: "account",
      label: tx.account,
      items: [
        { id: "profile", label: t("profile.subtab.profile.title"), icon: <User size={15} strokeWidth={1.8} /> },
        {
          id: "pass", label: t("profile.subtab.pass.title"), icon: <Award size={15} strokeWidth={1.8} />,
          badge: stampsCount ? String(stampsCount) : undefined, badgeTone: "gold",
        },
      ],
    },
    {
      id: "settings",
      label: tx.settings,
      items: [
        { id: "preferences",   label: t("prefs.title"),                          icon: <SettingsIcon size={15} strokeWidth={1.8} /> },
        { id: "email",         label: t("profile.subtab.email.title"),         icon: <Mail size={15} strokeWidth={1.8} /> },
        { id: "password",      label: t("profile.subtab.password.title"),      icon: <Lock size={15} strokeWidth={1.8} /> },
        { id: "twofa",         label: t("profile.subtab.twofa.title"),         icon: <Smartphone size={15} strokeWidth={1.8} />, badge: tx.soon, badgeTone: "muted" },
        { id: "sessions",      label: t("profile.subtab.sessions.title"),      icon: <Monitor size={15} strokeWidth={1.8} /> },
        { id: "notifications", label: t("profile.subtab.notifications.title"), icon: <Bell size={15} strokeWidth={1.8} /> },
        { id: "privacy",       label: t("profile.subtab.privacy.title"),       icon: <ShieldCheck size={15} strokeWidth={1.8} /> },
      ],
    },
    {
      id: "help",
      label: tx.help,
      items: [
        { id: "support", label: t("profile.subtab.support.title"), icon: <LifeBuoy size={15} strokeWidth={1.8} /> },
        { id: "about",   label: t("profile.subtab.about.title"),   icon: <Info size={15} strokeWidth={1.8} /> },
      ],
    },
  ];

  const visible = (item: NavItem) => item.id === "trips" || !isTabHidden(item.id);
  // Suche: jedes Wort der Eingabe muss vorkommen (im Bereichsnamen, in einem Detail oder in den Suchwörtern)
  const words = norm(query).split(/\s+/).filter(Boolean);
  const q = words.join(" ");
  const hasAll = (text: string) => { const n = norm(text); return words.every((w) => n.includes(w)); };

  /** Treffer eines Bereichs: null = passt nicht; sonst die passenden Details (evtl. leer = nur der Name passt) */
  const findHits = (item: NavItem): string[] | null => {
    if (!q) return [];
    if (item.id === "trips") return hasAll(item.label) ? [] : null;
    const details = (DETAIL_KEYS[item.id] ?? []).map((k) => t(k)).filter((v) => v && !v.includes("."));
    const detailHits = Array.from(new Set(details.filter(hasAll)));
    if (detailHits.length) return detailHits.slice(0, 3);
    if (hasAll(item.label)) return [];
    if ((EXTRA_WORDS[item.id] ?? []).some(hasAll)) return [];
    // auch Wörter verteilt auf Name + Details erlauben ("privacy maps")
    if (hasAll([item.label, ...details].join(" "))) return [];
    return null;
  };

  const onSelect = (item: NavItem, detail?: string) => {
    if (item.id === "trips") { onNavigateTrips(); return; }
    setSubTab(item.id);
    if (detail) onJumpToDetail?.(detail);
  };

  const renderItem = (item: NavItem, hits: string[] = []) => (
    <div key={item.id} className="sb-entry">
      <button
        type="button"
        className={`sb-item ${item.id === subTab && !q ? "active" : ""}`}
        onClick={() => onSelect(item, hits[0])}
      >
        <span className="sb-icon">{item.icon}</span>
        <span className="sb-label">{item.label}</span>
        {item.badge && <span className={`sb-badge ${item.badgeTone === "muted" ? "muted" : ""}`}>{item.badge}</span>}
      </button>
      {hits.map((h) => (
        <button key={h} type="button" className="sb-hit" onClick={() => onSelect(item, h)}>
          <span className="sb-hit-line" aria-hidden="true" />
          <Highlight text={h} words={words} />
        </button>
      ))}
    </div>
  );

  const name = displayName || user?.email?.split("@")[0] || "";
  const anyResult = GROUPS.some((g) => g.items.some((i) => visible(i) && findHits(i) !== null));

  return (
    <>
      {/* Horizontal scrollable tab strip — mobile only */}
      <div className="pp-mobile-subnav mobile-only">
        {MOBILE_TABS.filter(({ id }) => !isTabHidden(id)).map(({ id, label, icon }) => (
          <button
            key={id}
            className={`pp-mobile-subnav-item ${subTab === id ? "active" : ""}`}
            onClick={() => setSubTab(id)}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Seitenleiste — Desktop */}
      <aside className="st-subnav sb">
        <button type="button" className="sb-me" onClick={() => setSubTab("profile")}>
          <span className="sb-avatar">
            {avatarPreview ? <img src={avatarPreview} alt="" /> : <span>{initials}</span>}
          </span>
          <span className="sb-me-text">
            <b>{name}</b>
            <small>{user?.email}</small>
          </span>
        </button>

        <label className="sb-search">
          <Search size={14} strokeWidth={1.8} />
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tx.search} />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear">
              <X size={13} />
            </button>
          )}
        </label>

        {GROUPS.map((group) => {
          const items = group.items
            .filter(visible)
            .map((i) => ({ item: i, hits: findHits(i) }))
            .filter((x): x is { item: NavItem; hits: string[] } => x.hits !== null);
          if (items.length === 0) return null;
          return (
            <div key={group.id} className="sb-group">
              <p className="sb-group-label">{group.label}</p>
              {items.map(({ item, hits }) => renderItem(item, hits))}
            </div>
          );
        })}

        {!anyResult && <p className="sb-empty">{tx.noResults}</p>}

        {!q && (
          <div className="sb-group sb-group-last">
            <button type="button" className="sb-item sb-logout" onClick={handleLogout}>
              <span className="sb-icon"><LogOut size={15} strokeWidth={1.8} /></span>
              <span className="sb-label">{t("nav.signOut")}</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

/** Markiert die gesuchten Wörter im Treffer */
function Highlight({ text, words }: { text: string; words: string[] }) {
  if (!words.length) return <span className="sb-hit-text">{text}</span>;
  const n = norm(text);
  const marks = new Array(text.length).fill(false);
  for (const w of words) {
    let i = n.indexOf(w);
    while (i !== -1) { for (let k = i; k < i + w.length && k < marks.length; k++) marks[k] = true; i = n.indexOf(w, i + w.length); }
  }
  const parts: { s: string; m: boolean }[] = [];
  for (let i = 0; i < text.length; i++) {
    const last = parts[parts.length - 1];
    if (last && last.m === marks[i]) last.s += text[i];
    else parts.push({ s: text[i], m: marks[i] });
  }
  return (
    <span className="sb-hit-text">
      {parts.map((p, i) => (p.m ? <mark key={i}>{p.s}</mark> : <span key={i}>{p.s}</span>))}
    </span>
  );
}