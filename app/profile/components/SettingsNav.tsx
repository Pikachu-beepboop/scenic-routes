"use client";

import {
  User, Settings as SettingsIcon, Mail, Lock, Smartphone, Monitor,
  Award, Bell, ShieldCheck, LifeBuoy, Info, Map, LogOut, ChevronDown,
} from "lucide-react";
import type { SubTabId } from "../types";

const MOBILE_TABS = [
  { id: "profile" as const,       label: "Profile",       icon: <User size={13} strokeWidth={1.8} /> },
  { id: "preferences" as const,   label: "Preferences",   icon: <SettingsIcon size={13} strokeWidth={1.8} /> },
  { id: "email" as const,         label: "Email",         icon: <Mail size={13} strokeWidth={1.8} /> },
  { id: "password" as const,      label: "Password",      icon: <Lock size={13} strokeWidth={1.8} /> },
  { id: "twofa" as const,         label: "2FA",            icon: <Smartphone size={13} strokeWidth={1.8} /> },
  { id: "sessions" as const,      label: "Sessions",       icon: <Monitor size={13} strokeWidth={1.8} /> },
  { id: "pass" as const,          label: "Pass",           icon: <Award size={13} strokeWidth={1.8} /> },
  { id: "notifications" as const, label: "Notifications", icon: <Bell size={13} strokeWidth={1.8} /> },
  { id: "privacy" as const,       label: "Privacy",        icon: <ShieldCheck size={13} strokeWidth={1.8} /> },
  { id: "support" as const,       label: "Support",        icon: <LifeBuoy size={13} strokeWidth={1.8} /> },
  { id: "about" as const,         label: "About",          icon: <Info size={13} strokeWidth={1.8} /> },
];

const NAV_GROUPS = [
  {
    id: "account",
    label: "Account",
    icon: <User size={15} strokeWidth={1.8} />,
    items: [
      { id: "profile" as const,     label: "Profile" },
      { id: "preferences" as const, label: "Preferences" },
    ],
  },
  {
    id: "security",
    label: "Security",
    icon: <ShieldCheck size={15} strokeWidth={1.8} />,
    items: [
      { id: "email" as const,    label: "Email Address" },
      { id: "password" as const, label: "Password" },
      { id: "twofa" as const,    label: "Two-Factor Authentication" },
      { id: "sessions" as const, label: "Sessions" },
    ],
  },
];

const MORE_ITEMS = [
  { id: "pass" as const,          label: "Traveller Pass",     icon: <Award size={15} strokeWidth={1.8} /> },
  { id: "notifications" as const, label: "Notifications",      icon: <Bell size={15} strokeWidth={1.8} /> },
  { id: "privacy" as const,       label: "Privacy",             icon: <ShieldCheck size={15} strokeWidth={1.8} /> },
  { id: "support" as const,       label: "Support & Feedback", icon: <LifeBuoy size={15} strokeWidth={1.8} /> },
  { id: "about" as const,         label: "About",              icon: <Info size={15} strokeWidth={1.8} /> },
];

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
  return (
    <>
      {/* Horizontal scrollable tab strip — mobile only */}
      <div className="pp-mobile-subnav mobile-only">
        {MOBILE_TABS.map(({ id, label, icon }) => (
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
        <p className="st-subnav-label">Settings</p>

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
                  {group.items.map((item) => (
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

        {MORE_ITEMS.map(({ id, label, icon }) => (
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
          <Map size={15} strokeWidth={1.8} /> My Trips
        </button>
        <button className="st-subnav-logout" onClick={handleLogout}>
          <LogOut size={15} strokeWidth={1.8} /> Sign Out
        </button>
      </div>
    </>
  );
}
