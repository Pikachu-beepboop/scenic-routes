"use client";

import {
  User, Settings as SettingsIcon, Mail, Lock, Smartphone, Monitor,
  Award, Bell, ShieldCheck, LifeBuoy, Info, Map, LogOut, ChevronDown,
} from "lucide-react";
import { useLanguage } from "../../LanguageContext";
import type { SubTabId } from "../types";
import { isTabHidden } from "../betaConfig";

export default function SettingsNav({
  subTab, setSubTab,
  accountGroupOpen, setAccountGroupOpen,
  securityGroupOpen, setSecurityGroupOpen,
  onNavigateTrips, handleLogout,
}: {
  subTab: SubTabId; setSubTab: (id: SubTabId) => void;
  accountGroupOpen: boolean; setAccountGroupOpen: (fn: (v: boolean) => boolean) => void;
  securityGroupOpen: boolean; setSecurityGroupOpen: (fn: (v: boolean) => boolean) => void;
  onNavigateTrips: () => void;
  handleLogout: () => void;
}) {
  const { t } = useLanguage();

  // Diese Arrays greifen auf t() zu und müssen daher innerhalb der
  // Komponente (nach jedem Sprachwechsel neu) gebaut werden.
  const MOBILE_TABS = [
    { id: "profile" as const,       label: t("profile.subtab.profile.title"), icon: <User size={13} strokeWidth={1.8} /> },
    { id: "preferences" as const,   label: t("prefs.title"),                  icon: <SettingsIcon size={13} strokeWidth={1.8} /> },
    { id: "email" as const,         label: t("profile.nav.emailShort"),       icon: <Mail size={13} strokeWidth={1.8} /> },
    { id: "password" as const,      label: t("profile.nav.passwordShort"),    icon: <Lock size={13} strokeWidth={1.8} /> },
    { id: "twofa" as const,         label: t("profile.nav.twofaShort"),       icon: <Smartphone size={13} strokeWidth={1.8} /> },
    { id: "sessions" as const,      label: t("profile.nav.sessionsShort"),    icon: <Monitor size={13} strokeWidth={1.8} /> },
    { id: "pass" as const,          label: t("profile.nav.passShort"),        icon: <Award size={13} strokeWidth={1.8} /> },
    { id: "notifications" as const, label: t("profile.nav.notificationsShort"), icon: <Bell size={13} strokeWidth={1.8} /> },
    { id: "privacy" as const,       label: t("profile.nav.privacyShort"),     icon: <ShieldCheck size={13} strokeWidth={1.8} /> },
    { id: "support" as const,       label: t("profile.nav.supportShort"),     icon: <LifeBuoy size={13} strokeWidth={1.8} /> },
    { id: "about" as const,         label: t("profile.nav.aboutShort"),       icon: <Info size={13} strokeWidth={1.8} /> },
  ];

  const NAV_GROUPS = [
    {
      id: "account",
      label: t("profile.nav.account"),
      icon: <User size={15} strokeWidth={1.8} />,
      items: [
        { id: "profile" as const,     label: t("profile.subtab.profile.title") },
        { id: "preferences" as const, label: t("prefs.title") },
      ],
    },
    {
      id: "security",
      label: t("profile.nav.security"),
      icon: <ShieldCheck size={15} strokeWidth={1.8} />,
      items: [
        { id: "email" as const,    label: t("profile.subtab.email.title") },
        { id: "password" as const, label: t("profile.subtab.password.title") },
        { id: "twofa" as const,    label: t("profile.subtab.twofa.title") },
        { id: "sessions" as const, label: t("profile.subtab.sessions.title") },
      ],
    },
  ];

  const MORE_ITEMS = [
    { id: "pass" as const,          label: t("profile.subtab.pass.title"),          icon: <Award size={15} strokeWidth={1.8} /> },
    { id: "notifications" as const, label: t("profile.subtab.notifications.title"), icon: <Bell size={15} strokeWidth={1.8} /> },
    { id: "privacy" as const,       label: t("profile.subtab.privacy.title"),       icon: <ShieldCheck size={15} strokeWidth={1.8} /> },
    { id: "support" as const,       label: t("profile.subtab.support.title"),       icon: <LifeBuoy size={15} strokeWidth={1.8} /> },
    { id: "about" as const,         label: t("profile.subtab.about.title"),         icon: <Info size={15} strokeWidth={1.8} /> },
  ];

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

      {/* Vertical grouped sidebar — desktop only */}
      <div className="st-subnav">
        <p className="st-subnav-label">{t("profile.nav.settings")}</p>

        {NAV_GROUPS.map((group) => {
          const isOpen = group.id === "account" ? accountGroupOpen : securityGroupOpen;
          const toggleOpen = () => group.id === "account"
            ? setAccountGroupOpen((v) => !v)
            : setSecurityGroupOpen((v) => !v);

          return (
            <div key={group.id} className="st-subnav-group">
              <button className="st-subnav-group-title" onClick={toggleOpen}>
                {group.icon} <span>{group.label}</span>
                <ChevronDown size={14} className={`st-subnav-chevron ${isOpen ? "open" : ""}`} />
              </button>
              {isOpen && (
                <div className="st-subnav-sub">
                  {group.items.filter((item) => !isTabHidden(item.id)).map((item) => (
                    <button
                      key={item.id}
                      className={`st-subnav-item st-subnav-item-sub ${subTab === item.id ? "active" : ""}`}
                      onClick={() => setSubTab(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="st-subnav-divider" />

        {MORE_ITEMS.filter(({ id }) => !isTabHidden(id)).map(({ id, label, icon }) => (
          <button
            key={id}
            className={`st-subnav-item ${subTab === id ? "active" : ""}`}
            onClick={() => setSubTab(id)}
          >
            {icon} {label}
          </button>
        ))}

        <div className="st-subnav-divider" />

        <button className="st-subnav-item" onClick={onNavigateTrips}>
          <Map size={15} strokeWidth={1.8} /> {t("profile.nav.myTrips")}
        </button>
        <button className="st-subnav-logout" onClick={handleLogout}>
          <LogOut size={15} strokeWidth={1.8} /> {t("nav.signOut")}
        </button>
      </div>
    </>
  );
}
