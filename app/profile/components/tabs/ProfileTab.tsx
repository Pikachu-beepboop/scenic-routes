"use client";

import {
  ChevronRight, ChevronDown, CheckCircle2, Camera,
  Compass, Globe, Bookmark, TrendingUp, Calendar,
  MapPin, AlertTriangle, Circle, Award,
} from "lucide-react";
import { useLanguage } from "../../../LanguageContext";
import type { Stamp, SubTabId } from "../../types";

const ABOUT_MAX = 250;
const COUNTRIES = ["Germany","Pakistan","United States","United Kingdom","France","Italy","Spain","Switzerland","Austria","Norway","Canada","Australia","Other"];
const TIMEZONES = ["UTC-8","UTC-5","UTC+0","UTC+1","UTC+2","UTC+5","UTC+8","UTC+9"];

// Für Date-Formatierung ("Member since ...") passend zur aktuell gewählten
// UI-Sprache. Fällt bei unbekannten Sprachcodes auf Englisch zurück.
const LOCALE_MAP: Record<string, string> = { en: "en", de: "de", ru: "ru" };

export default function ProfileTab({
  user, stamps, initials, avatarPreview, handleAvatarChange,
  displayName, setDisplayName,
  username, setUsername,
  country, setCountry,
  timezone, setTimezone,
  aboutYou, setAboutYou,
  error, success,
  saving, handleSaveProfile,
  setSubTab,
  setShowDeleteConfirm, setDeleteConfirmText, setDeleteError,
}: {
  user: any;
  stamps: Stamp[];
  initials: string;
  avatarPreview: string;
  handleAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  displayName: string; setDisplayName: (v: string) => void;
  username: string; setUsername: (v: string) => void;
  country: string; setCountry: (v: string) => void;
  timezone: string; setTimezone: (v: string) => void;
  aboutYou: string; setAboutYou: (v: string) => void;
  error: string; success: string;
  saving: boolean; handleSaveProfile: () => void;
  setSubTab: (id: SubTabId) => void;
  setShowDeleteConfirm: (v: boolean) => void;
  setDeleteConfirmText: (v: string) => void;
  setDeleteError: (v: string) => void;
}) {
  const { t, lang } = useLanguage();

  // Profile Completion — derived from data we already have on hand (no extra
  // backend calls). The overall % is computed from this checklist rather
  // than hardcoded, so it stays honest even though the stat cards below
  // (Trips/Countries/Distance) are still placeholders.
  const completionChecks = [
    { label: t("profile.completion.addPhoto"),    done: !!avatarPreview },
    { label: t("profile.completion.addAbout"),     done: aboutYou.trim().length > 0 },
    { label: t("profile.completion.addCountry"),   done: country.trim().length > 0 },
    { label: t("profile.completion.connectEmail"), done: !!user?.email_confirmed_at },
    { label: t("profile.completion.setPreferences"), done: false }, // TODO: wire once a "preferences saved" flag exists
  ];
  const completionPct = Math.round((completionChecks.filter(c => c.done).length / completionChecks.length) * 100);
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(LOCALE_MAP[lang] || "en", { month: "long", year: "numeric" })
    : "—";

  return (
    <div className="st-content wide">
      <div className="st-profile-grid">

        {/* Left column — identity + editable profile info */}
        <div className="st-profile-col">
          <div className="st-card st-subcard st-profile-head-card">
            <div className="st-profile-head" style={{ borderBottom: "none", paddingBottom: 0 }}>
              <div className="st-avatar-wrap">
                {avatarPreview
                  ? <img src={avatarPreview} className="st-avatar-lg" alt="avatar" />
                  : <div className="st-avatar-lg-placeholder">{initials}</div>
                }
                <label className="st-avatar-edit" title="Change photo">
                  <Camera size={11} strokeWidth={2.2} />
                  <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
                </label>
              </div>
              <div>
                <p className="st-profile-name">{displayName || username || user?.email?.split("@")[0]}</p>
                <p className="st-profile-role">{t("common.roleExplorer")}</p>
                <p className="st-profile-email">{user?.email}</p>
                <div className="st-profile-meta-row">
                  <span><Calendar size={11} strokeWidth={1.8} /> {t("profile.info.memberSince")} {memberSince}</span>
                  {country && <span><MapPin size={11} strokeWidth={1.8} /> {country}</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="st-card st-subcard">
            <p className="st-card-title">{t("profile.info.title")}</p>

            <div className="st-field">
              <label className="st-field-label">{t("profile.info.displayName")}</label>
              <input className="st-input" type="text" placeholder={t("profile.info.displayNamePh")} value={displayName} onChange={e => setDisplayName(e.target.value)} />
            </div>

            <div className="st-field">
              <label className="st-field-label">{t("profile.info.username")}</label>
              <input className="st-input" type="text" placeholder={t("profile.info.usernamePh")} value={username} onChange={e => setUsername(e.target.value)} />
            </div>

            <div className="st-field-row">
              <div className="st-field">
                <label className="st-field-label">{t("profile.info.country")}</label>
                <div className="st-select-wrap">
                  <select className="st-input st-select-full" value={country} onChange={e => setCountry(e.target.value)}>
                    <option value="">{t("profile.info.selectCountry")}</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={14} strokeWidth={2} />
                </div>
              </div>
              <div className="st-field">
                <label className="st-field-label">{t("profile.info.timezone")}</label>
                <div className="st-select-wrap">
                  <select className="st-input st-select-full" value={timezone} onChange={e => setTimezone(e.target.value)}>
                    {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                  <ChevronDown size={14} strokeWidth={2} />
                </div>
              </div>
            </div>

            <div className="st-field">
              <div className="st-field-label-row">
                <label className="st-field-label">{t("profile.info.aboutYou")}</label>
                <span className="st-char-count">{aboutYou.length}/{ABOUT_MAX}</span>
              </div>
              <textarea
                className="st-input st-textarea"
                placeholder={t("profile.info.aboutYouPh")}
                value={aboutYou}
                maxLength={ABOUT_MAX}
                onChange={e => setAboutYou(e.target.value)}
              />
            </div>

            {error   && <p className="st-error">{error}</p>}
            {success && <p className="st-success">{success}</p>}
          </div>
        </div>

        {/* Right column — stats, completion, pass */}
        <div className="st-profile-col st-profile-col-side">
          <div className="st-card st-subcard st-stats-card">
            <p className="st-card-title">{t("profile.stats.title")}</p>
            {/* TODO: replace placeholders with real counts once wired
                (trips = completed routes, countries = distinct route
                countries, distance = sum of route lengths). Saved
                Routes could use stamps.length today if desired. */}
            <div className="st-stats-grid">
              <div className="st-stat-item">
                <div className="st-stat-icon"><Compass size={16} strokeWidth={1.8} /></div>
                <div><p className="st-stat-num">18</p><p className="st-stat-label">{t("profile.stats.trips")}</p></div>
              </div>
              <div className="st-stat-item">
                <div className="st-stat-icon"><Globe size={16} strokeWidth={1.8} /></div>
                <div><p className="st-stat-num">4</p><p className="st-stat-label">{t("profile.stats.countries")}</p></div>
              </div>
              <div className="st-stat-item">
                <div className="st-stat-icon"><Bookmark size={16} strokeWidth={1.8} /></div>
                <div><p className="st-stat-num">{stamps.length}</p><p className="st-stat-label">{t("profile.stats.saved")}</p></div>
              </div>
              <div className="st-stat-item">
                <div className="st-stat-icon"><TrendingUp size={16} strokeWidth={1.8} /></div>
                <div><p className="st-stat-num">4,328 km</p><p className="st-stat-label">{t("profile.stats.distance")}</p></div>
              </div>
            </div>
          </div>

          <div className="st-card st-subcard st-completion-card">
            <div className="st-completion-head">
              <p className="st-card-title" style={{ marginBottom: 0 }}><CheckCircle2 size={13} strokeWidth={2} style={{ marginRight: 6, verticalAlign: -2 }} />{t("profile.completion.title")}</p>
              <span className="st-completion-pct">{completionPct}%</span>
            </div>
            <div className="st-completion-track">
              <div className="st-completion-fill" style={{ width: `${completionPct}%` }} />
            </div>
            <p className="st-completion-hint">{t("profile.completion.hint")}</p>
            <div className="st-checklist">
              {completionChecks.map((c) => (
                <div key={c.label} className="st-checklist-item">
                  {c.done ? <CheckCircle2 size={14} strokeWidth={2} color="var(--gold)" /> : <Circle size={14} strokeWidth={1.8} color="var(--dim)" />}
                  <span style={{ opacity: c.done ? 1 : 0.6 }}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>
              {/*}
          <div className="st-card st-subcard st-pass-mini-card">
            <div className="st-pass-mini-head">
              <div className="st-header-icon" style={{ width: 34, height: 34, borderRadius: 10 }}><Award size={17} strokeWidth={1.8} /></div>
              <div style={{ flex: 1 }}>
                <p className="st-profile-name" style={{ fontSize: 15 }}>{t("profile.passMini.title")}</p>
                <p className="st-row-sub" style={{ marginTop: 1 }}>{t("profile.passMini.sub")}</p>
              </div>
              <span className="st-badge st-badge-verified">{t("profile.passMini.active")}</span>
            </div>
            <button className="st-btn st-btn-secondary" style={{ width: "100%", justifyContent: "space-between" }} onClick={() => setSubTab("pass")}>
              {t("profile.passMini.view")} <ChevronRight size={14} />
            </button>
          </div>
          */}
        </div>
      </div>

      <div className="st-danger-banner">
        <AlertTriangle size={18} strokeWidth={1.8} color="#e08080" />
        <div style={{ flex: 1 }}>
          <p className="st-row-label" style={{ color: "#e08080" }}>{t("profile.danger.title")}</p>
          <p className="st-row-sub">{t("profile.danger.text")}</p>
        </div>
        <button
          className="st-btn"
          style={{ background: "rgba(224,128,128,0.12)", border: "1px solid rgba(224,128,128,0.4)", color: "#e08080", flexShrink: 0 }}
          onClick={() => { setShowDeleteConfirm(true); setDeleteConfirmText(""); setDeleteError(""); }}
        >
          {t("profile.danger.delete")}
        </button>
      </div>

      <div className="st-action-row">
        <button className="st-btn st-btn-primary" disabled={saving} onClick={handleSaveProfile}>
          {saving ? t("common.saving") : t("common.saveChanges")}
        </button>
      </div>
    </div>
  );
}
