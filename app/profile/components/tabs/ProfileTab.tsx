"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ChevronRight, ChevronDown, CheckCircle2, Camera,
  Compass, Globe, Bookmark, TrendingUp, Calendar,
  MapPin, AlertTriangle, Circle, Award, Search, X
} from "lucide-react";
import { useLanguage } from "../../../LanguageContext";
import type { Stamp, SubTabId } from "../../types";
import AvatarEditor from "./AvatarEditor";

const ABOUT_MAX = 250;

// ISO 3166-1 alpha-2 country codes
const COUNTRY_CODES = [
  "AF", "AX", "AL", "DZ", "AS", "AD", "AO", "AI", "AQ", "AG", "AR", "AM", "AW", "AU", "AT", "AZ",
  "BS", "BH", "BD", "BB", "BY", "BE", "BZ", "BJ", "BM", "BT", "BO", "BQ", "BA", "BW", "BV", "BR",
  "IO", "BN", "BG", "BF", "BI", "KH", "CM", "CA", "CV", "KY", "CF", "TD", "CL", "CN", "CX", "CC",
  "CO", "KM", "CG", "CD", "CK", "CR", "CI", "HR", "CU", "CW", "CY", "CZ", "DK", "DJ", "DM", "DO",
  "EC", "EG", "SV", "GQ", "ER", "EE", "ET", "FK", "FO", "FJ", "FI", "FR", "GF", "PF", "TF", "GA",
  "GM", "GE", "DE", "GH", "GI", "GR", "GL", "GD", "GP", "GU", "GT", "GG", "GN", "GW", "GY", "HT",
  "HM", "VA", "HN", "HK", "HU", "IS", "IN", "ID", "IR", "IQ", "IE", "IM", "IL", "IT", "JM", "JP",
  "JE", "JO", "KZ", "KE", "KI", "KP", "KR", "KW", "KG", "LA", "LV", "LB", "LS", "LR", "LY", "LI",
  "LT", "LU", "MO", "MK", "MG", "MW", "MY", "MV", "ML", "MT", "MH", "MQ", "MR", "MU", "YT", "MX",
  "FM", "MD", "MC", "MN", "ME", "MS", "MA", "MZ", "MM", "NA", "NR", "NP", "NL", "NC", "NZ", "NI",
  "NE", "NG", "NU", "NF", "MP", "NO", "OM", "PK", "PW", "PS", "PA", "PG", "PY", "PE", "PH", "PN",
  "PL", "PT", "PR", "QA", "RE", "RO", "RU", "RW", "BL", "SH", "KN", "LC", "MF", "PM", "VC", "WS",
  "SM", "ST", "SA", "SN", "RS", "SC", "SL", "SG", "SX", "SK", "SI", "SB", "SO", "ZA", "GS", "SS",
  "ES", "LK", "SD", "SR", "SJ", "SZ", "SE", "CH", "SY", "TW", "TJ", "TZ", "TH", "TL", "TG", "TK",
  "TO", "TT", "TN", "TR", "TM", "TC", "TV", "UG", "UA", "AE", "GB", "US", "UM", "UY", "UZ", "VU",
  "VE", "VN", "VG", "VI", "WF", "EH", "YE", "ZM", "ZW"
];



// Für Date-Formatierung ("Member since ...") passend zur aktuell gewählten
// UI-Sprache. Fällt bei unbekannten Sprachcodes auf Englisch zurück.
const LOCALE_MAP: Record<string, string> = { en: "en", de: "de", ru: "ru" };

export default function ProfileTab({
  user, stamps, initials, avatarPreview, savedProfile, onAvatarUpdated,
  displayName, setDisplayName,
  username, setUsername,
  country, setCountry,
  city, setCity,
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
  savedProfile: { avatarUrl: string; country: string; aboutYou: string };
  onAvatarUpdated: (url: string) => void;
  displayName: string; setDisplayName: (v: string) => void;
  username: string; setUsername: (v: string) => void;
  country: string; setCountry: (v: string) => void;
  city: string; setCity: (v: string) => void;
  aboutYou: string; setAboutYou: (v: string) => void;
  error: string; success: string;
  saving: boolean; handleSaveProfile: () => void;
  setSubTab: (id: SubTabId) => void;
  setShowDeleteConfirm: (v: boolean) => void;
  setDeleteConfirmText: (v: string) => void;
  setDeleteError: (v: string) => void;
}) {
  const { t, lang } = useLanguage();
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // Get translated country names
  const countryDisplayName = new Intl.DisplayNames([lang], { type: 'region' });
  const allCountries = COUNTRY_CODES.map(code => ({
    code,
    name: countryDisplayName.of(code) || code
  })).sort((a, b) => a.name.localeCompare(b.name, lang));

  const filteredCountries = countrySearch.trim()
    ? allCountries.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
    : allCountries;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Profile Completion — derived from data we already have on hand (no extra

  // backend calls). The overall % is computed from this checklist rather
  // than hardcoded, so it stays honest even though the stat cards below
  // (Trips/Countries/Distance) are still placeholders.
  const completionChecks = [
    { label: t("profile.completion.addPhoto"),    done: !!savedProfile.avatarUrl },
    { label: t("profile.completion.addAbout"),     done: savedProfile.aboutYou.trim().length > 0 },
    { label: t("profile.completion.addCountry"),   done: savedProfile.country.trim().length > 0 },
    { label: t("profile.completion.connectEmail"), done: !!user?.email_confirmed_at },
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
              <AvatarEditor
                userId={user?.id}
                avatarPreview={avatarPreview}
                initials={initials}
                onAvatarUpdated={onAvatarUpdated}
              />
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
                <div className="st-country-dropdown-container" ref={countryDropdownRef}>
                  <button
                    className={`st-input st-country-trigger ${isCountryOpen ? 'open' : ''}`}
                    onClick={() => setIsCountryOpen(!isCountryOpen)}
                    type="button"
                  >
                    <span className={!country ? "placeholder" : ""}>
                      {country || t("profile.info.selectCountry")}
                    </span>
                    <ChevronDown size={14} strokeWidth={2} className="st-chevron" />
                  </button>

                  {isCountryOpen && (
                    <div className="st-country-dropdown">
                      <div className="st-country-search-wrap">
                        <Search size={14} className="st-search-icon" />
                        <input
                          autoFocus
                          type="text"
                          className="st-country-search-input"
                          placeholder={t("explore.search.searchCountries")}
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                        />
                        {countrySearch && (
                          <button className="st-clear-search" onClick={() => setCountrySearch("")}>
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      <div className="st-country-list">
                        <button
                          className="st-country-option"
                          onClick={() => { setCountry(""); setIsCountryOpen(false); setCountrySearch(""); }}
                        >
                          {t("explore.search.allCountries")}
                        </button>
                        {filteredCountries.map((c) => (
                          <button
                            key={c.code}
                            className={`st-country-option ${country === c.name ? "active" : ""}`}
                            onClick={() => {
                              setCountry(c.name);
                              setIsCountryOpen(false);
                              setCountrySearch("");
                            }}
                          >
                            <span className="st-option-dot" />
                            {c.name}
                          </button>
                        ))}
                        {filteredCountries.length === 0 && (
                          <div className="st-country-empty">No countries found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="st-field">

                <label className="st-field-label">{t("profile.info.city")}</label>
                <input className="st-input" type="text" placeholder={t("profile.info.city")} value={city} onChange={e => setCity(e.target.value)} />
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
          {/* Traveller Stats card — hidden for now, values are still
              hardcoded placeholders (18 trips / 4 countries / 4,328 km)
              with no real data source wired up yet. Re-enable by
              un-commenting once trips/countries/distance are computed
              from real user data. */}
          {/*
          <div className="st-card st-subcard st-stats-card">
            <p className="st-card-title">{t("profile.stats.title")}</p>
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
          */}

          {completionPct < 100 && (
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
          )}
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
