"use client";

import Link from "next/link";
import { ThemeSwitch } from "../../components/ThemeSwitch";
import {
  X, Map, Info, User, Settings as SettingsIcon, Mail, Lock,
  Smartphone, Monitor, Award, Bell, ShieldCheck, LifeBuoy, LogOut,
  ChevronRight,
} from "lucide-react";
import type { SubTabId } from "../types";

const ACCOUNT_LINKS = [
  { id: "profile" as const,     label: "Profile",     icon: <User size={14} strokeWidth={1.8} /> },
  { id: "preferences" as const, label: "Preferences", icon: <SettingsIcon size={14} strokeWidth={1.8} /> },
];
const SECURITY_LINKS = [
  { id: "email" as const,    label: "Email Address",             icon: <Mail size={14} strokeWidth={1.8} /> },
  { id: "password" as const, label: "Password",                  icon: <Lock size={14} strokeWidth={1.8} /> },
  { id: "twofa" as const,    label: "Two-Factor Authentication", icon: <Smartphone size={14} strokeWidth={1.8} /> },
  { id: "sessions" as const, label: "Sessions",                  icon: <Monitor size={14} strokeWidth={1.8} /> },
];
const MORE_LINKS = [
  { id: "pass" as const,          label: "Traveller Pass",     icon: <Award size={14} strokeWidth={1.8} /> },
  { id: "notifications" as const, label: "Notifications",      icon: <Bell size={14} strokeWidth={1.8} /> },
  { id: "privacy" as const,       label: "Privacy",             icon: <ShieldCheck size={14} strokeWidth={1.8} /> },
  { id: "support" as const,       label: "Support & Feedback", icon: <LifeBuoy size={14} strokeWidth={1.8} /> },
  { id: "about" as const,         label: "About",              icon: <Info size={14} strokeWidth={1.8} /> },
];

export default function MobileNavDrawer({
  open, onClose, avatarPreview, initials, username, user,
  subTab, setSubTab, handleLogout,
}: {
  open: boolean; onClose: () => void;
  avatarPreview: string; initials: string; username: string; user: any;
  subTab: SubTabId; setSubTab: (id: SubTabId) => void;
  handleLogout: () => void;
}) {
  function goTo(id: SubTabId) {
    setSubTab(id);
    onClose();
  }

  return (
    <>
      <div className={`pp-mobile-nav-backdrop ${open ? "open" : ""}`} onClick={onClose} />

      <div className={`pp-mobile-nav-drawer ${open ? "open" : ""}`}>
        <div className="pp-mobile-nav-top">
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.18em", color: "var(--cream)" }}>EXPLORE SCENIC ROUTES</span>
          <button className="pp-mobile-nav-close" onClick={onClose} aria-label="Menü schließen">
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        <div className="pp-mobile-profile-card">
          <div className="pp-mobile-profile-head">
            <div className="pp-mobile-avatar">
              {avatarPreview ? <img src={avatarPreview} alt="avatar" /> : initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <p className="pp-mobile-name">{username || user?.email?.split("@")[0]}</p>
              <p className="pp-mobile-email">{user?.email}</p>
              <p className="pp-mobile-role">Scenic Route Explorer</p>
            </div>
          </div>

          <div className="pp-mobile-theme-row">
            <span className="pp-mobile-theme-label">Theme</span>
            <ThemeSwitch />
          </div>

          <div className="pp-mobile-links">
            <p className="pp-mobile-section-label">Navigate</p>
            <Link href="/explore" className="pp-mobile-link" onClick={onClose}>
              <span className="pp-mobile-link-icon"><Map size={14} strokeWidth={1.8} /></span>
              Explore Routes
              <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
            </Link>
            <Link href="/about" className="pp-mobile-link" onClick={onClose}>
              <span className="pp-mobile-link-icon"><Info size={14} strokeWidth={1.8} /></span>
              About
              <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
            </Link>
            <Link href="/my-trips" className="pp-mobile-link" onClick={onClose}>
              <span className="pp-mobile-link-icon"><Map size={14} strokeWidth={1.8} /></span>
              My Trips
              <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
            </Link>

            <div className="pp-mobile-divider" />

            <p className="pp-mobile-section-label">Account</p>
            {ACCOUNT_LINKS.map(({ id, label, icon }) => (
              <button key={id} className={`pp-mobile-link ${subTab === id ? "active" : ""}`} onClick={() => goTo(id)}>
                <span className="pp-mobile-link-icon">{icon}</span>
                {label}
                <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
              </button>
            ))}

            <p className="pp-mobile-section-label">Security</p>
            {SECURITY_LINKS.map(({ id, label, icon }) => (
              <button key={id} className={`pp-mobile-link ${subTab === id ? "active" : ""}`} onClick={() => goTo(id)}>
                <span className="pp-mobile-link-icon">{icon}</span>
                {label}
                <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
              </button>
            ))}

            <p className="pp-mobile-section-label">More</p>
            {MORE_LINKS.map(({ id, label, icon }) => (
              <button key={id} className={`pp-mobile-link ${subTab === id ? "active" : ""}`} onClick={() => goTo(id)}>
                <span className="pp-mobile-link-icon">{icon}</span>
                {label}
                <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
              </button>
            ))}

            <div className="pp-mobile-divider" />

            <button className="pp-mobile-logout" onClick={() => { onClose(); handleLogout(); }}>
              <span className="pp-mobile-link-icon" style={{ color: "#e08080" }}><LogOut size={14} strokeWidth={1.8} /></span>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
