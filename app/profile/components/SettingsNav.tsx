"use client";

import { useState, type ReactNode } from "react";
import {
  User, Settings as SettingsIcon, Mail, Lock, Smartphone, Monitor,
  Award, Bell, ShieldCheck, LifeBuoy, Info, LogOut, Search, X,
} from "lucide-react";
import { useLanguage } from "../../LanguageContext";
import type { SubTabId } from "../types";
import { isTabHidden } from "../betaConfig";

// NEU (Variante B): Seitenleiste wie eine Einstellungs-App — oben die eigene Person,
// darunter eine Suche und drei klare Gruppen (Konto · Einstellungen · Hilfe) mit
// Symbolen und kleinen Hinweisen (Anzahl Stempel, "bald verfügbar").

const SMALL_TEXT = {
  en: { search: "Search settings…", account: "Account", settings: "Settings", help: "Help", soon: "Soon", noResults: "Nothing found" },
  de: { search: "Einstellungen suchen…", account: "Konto", settings: "Einstellungen", help: "Hilfe", soon: "Bald", noResults: "Nichts gefunden" },
  ru: { search: "Поиск настроек…", account: "Аккаунт", settings: "Настройки", help: "Помощь", soon: "Скоро", noResults: "Ничего не найдено" },
} as const;

type NavItem = {
  id: SubTabId | "trips";
  label: string;
  icon: ReactNode;
  badge?: string;
  badgeTone?: "gold" | "muted";
};

export default function SettingsNav({
  subTab, setSubTab,
  onNavigateTrips, handleLogout,
  user, avatarPreview, initials, displayName, stampsCount,
}: {
  subTab: SubTabId; setSubTab: (id: SubTabId) => void;
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
  const q = query.trim().toLowerCase();
  const matches = (item: NavItem) => !q || item.label.toLowerCase().includes(q);

  const onSelect = (item: NavItem) => {
    if (item.id === "trips") onNavigateTrips();
    else setSubTab(item.id);
  };

  const renderItem = (item: NavItem) => (
    <button
      key={item.id}
      type="button"
      className={`sb-item ${item.id === subTab ? "active" : ""}`}
      onClick={() => onSelect(item)}
    >
      <span className="sb-icon">{item.icon}</span>
      <span className="sb-label">{item.label}</span>
      {item.badge && <span className={`sb-badge ${item.badgeTone === "muted" ? "muted" : ""}`}>{item.badge}</span>}
    </button>
  );

  const name = displayName || user?.email?.split("@")[0] || "";
  const anyResult = GROUPS.some((g) => g.items.some((i) => visible(i) && matches(i)));

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
          const items = group.items.filter((i) => visible(i) && matches(i));
          if (items.length === 0) return null;
          return (
            <div key={group.id} className="sb-group">
              <p className="sb-group-label">{group.label}</p>
              {items.map(renderItem)}
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