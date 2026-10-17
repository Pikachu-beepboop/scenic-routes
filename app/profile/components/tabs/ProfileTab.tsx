"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ChevronRight, ChevronDown, Calendar, MapPin, AlertTriangle, Search, X, Sparkles, Plus,
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

/* NEU (Variante B): Texte, die es noch nicht in den Übersetzungsdateien gibt */
const PT_TEXT = {
  en: {
    complete: "complete", passTitle: (n: number) => (n === 1 ? "1 stamp collected" : `${n} stamps collected`),
    passEmpty: "Your first stamp is waiting", passSub: (c: number) => (c ? `From ${c} ${c === 1 ? "country" : "countries"} — save more routes to fill your pass` : "Save a route to get your first stamp"),
    openPass: "Open pass", formTitle: "Tell us about you", formSub: "This is what other explorers see on your Traveller Pass.",
    oneLeft: "Almost there:", missing: "still missing —", unsaved: "You have unsaved changes", discard: "Discard",
  },
  de: {
    complete: "vollständig", passTitle: (n: number) => (n === 1 ? "1 Stempel gesammelt" : `${n} Stempel gesammelt`),
    passEmpty: "Dein erster Stempel wartet", passSub: (c: number) => (c ? `Aus ${c} ${c === 1 ? "Land" : "Ländern"} — speichere mehr Routen, um deinen Pass zu füllen` : "Speichere eine Route für deinen ersten Stempel"),
    openPass: "Pass öffnen", formTitle: "Erzähl uns von dir", formSub: "So sehen dich andere Entdecker auf deinem Traveller Pass.",
    oneLeft: "Fast geschafft:", missing: "es fehlt noch —", unsaved: "Du hast ungespeicherte Änderungen", discard: "Verwerfen",
  },
  ru: {
    complete: "заполнено", passTitle: (n: number) => `Штампов собрано: ${n}`,
    passEmpty: "Ваш первый штамп ждёт", passSub: (c: number) => (c ? `Из стран: ${c} — сохраняйте маршруты, чтобы заполнить паспорт` : "Сохраните маршрут, чтобы получить первый штамп"),
    openPass: "Открыть паспорт", formTitle: "Расскажите о себе", formSub: "Так вас видят другие путешественники в Traveller Pass.",
    oneLeft: "Почти готово:", missing: "осталось —", unsaved: "Есть несохранённые изменения", discard: "Отменить",
  },
} as const;

/** Ländername (z. B. "Switzerland", "Schweiz") -> ISO-Kürzel ("CH") für die Stempel */
function countryToCode(name: string): string {
  const clean = name.trim().toLowerCase();
  if (!clean) return "?";
  for (const loc of ["en", "de", "ru"]) {
    try {
      const dn = new Intl.DisplayNames([loc], { type: "region" });
      const hit = COUNTRY_CODES.find((c) => (dn.of(c) || "").toLowerCase() === clean);
      if (hit) return hit;
    } catch {
      /* Intl nicht verfügbar */
    }
  }
  if (clean === "usa" || clean === "united states of america") return "US";
  if (clean === "uk" || clean === "england" || clean === "scotland" || clean === "wales") return "GB";
  return name.trim().slice(0, 2).toUpperCase();
}

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
  dirty = false, onDiscard,
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
  /** NEU: gibt es ungespeicherte Änderungen? (blendet die Speichern-Leiste ein) */
  dirty?: boolean;
  /** NEU: Änderungen verwerfen */
  onDiscard?: () => void;
}) {
  const { t, lang } = useLanguage();
  const px = PT_TEXT[(lang in PT_TEXT ? lang : "en") as keyof typeof PT_TEXT];
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

  // Profile Completion — aus gespeicherten Daten (ändert sich erst beim Speichern)
  const completionChecks = [
    { label: t("profile.completion.addPhoto"),    done: !!savedProfile.avatarUrl },
    { label: t("profile.completion.addAbout"),     done: savedProfile.aboutYou.trim().length > 0 },
    { label: t("profile.completion.addCountry"),   done: savedProfile.country.trim().length > 0 },
    { label: t("profile.completion.connectEmail"), done: !!user?.email_confirmed_at },
  ];
  const completionPct = Math.round((completionChecks.filter(c => c.done).length / completionChecks.length) * 100);
  const missingChecks = completionChecks.filter((c) => !c.done);
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(LOCALE_MAP[lang] || "en", { month: "long", year: "numeric" })
    : "—";

  // Traveller-Pass-Vorschau: ein Stempel pro Land, neueste zuerst
  const passStamps = (() => {
    const byCountry: Record<string, { code: string; year: string; time: number }> = {};
    for (const s of stamps) {
      if (!s.country) continue;
      const time = s.completed_at ? new Date(s.completed_at).getTime() : 0;
      const prev = byCountry[s.country];
      if (!prev || time > prev.time) {
        byCountry[s.country] = {
          code: countryToCode(s.country),
          year: s.completed_at ? String(new Date(s.completed_at).getFullYear()) : "",
          time,
        };
      }
    }
    return Object.values(byCountry).sort((a, b) => b.time - a.time);
  })();
  const shownStamps = passStamps.slice(0, 4);
  const emptySlots = Math.max(shownStamps.length ? 0 : 3, 4 - shownStamps.length);

  const ringStyle = { ["--p" as string]: `${completionPct}%` } as React.CSSProperties;

  return (
    <div className="st-content wide pb-content">
      {/* Oben: Profil-Karte und Pass-Vorschau nebeneinander (spart Höhe) */}
      <div className="pb-top">
      {/* 1 — Profil-Karte mit Fortschritts-Ring */}
      <div className="st-card st-subcard pb-hero">
        <AvatarEditor
          userId={user?.id}
          avatarPreview={avatarPreview}
          initials={initials}
          onAvatarUpdated={onAvatarUpdated}
        />
        <div className="pb-hero-text">
          <p className="pb-role">{t("common.roleExplorer")}</p>
          <p className="pb-name">{displayName || username || user?.email?.split("@")[0]}</p>
          <div className="pb-meta">
            <span><Calendar size={12} strokeWidth={1.8} /> {t("profile.info.memberSince")} {memberSince}</span>
            {(city || country) && (
              <span>
                <MapPin size={12} strokeWidth={1.8} /> {[city, country].filter(Boolean).join(", ")}
              </span>
            )}
          </div>
        </div>
        <div className="pb-ring" style={ringStyle} title={t("profile.completion.title")}>
          <div>
            <b>{completionPct}%</b>
            <small>{px.complete}</small>
          </div>
        </div>
      </div>

      {/* 2 — Traveller-Pass-Vorschau (Klick öffnet den Pass) */}
      <button type="button" className="pb-pass" onClick={() => setSubTab("pass")}>
        <div className="pb-pass-text">
          <p className="pb-pass-ey">{t("profile.subtab.pass.title")}</p>
          <p className="pb-pass-title">{stamps.length ? px.passTitle(stamps.length) : px.passEmpty}</p>
          <p className="pb-pass-sub">{px.passSub(passStamps.length)}</p>
        </div>
        <div className="pb-stamps" aria-hidden="true">
          {shownStamps.map((s, i) => (
            <span key={s.code + i} className={`pb-stamp r${i % 3}`}>
              <b>{s.code}</b>
              {s.year && <small>{s.year}</small>}
            </span>
          ))}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <span key={`e${i}`} className="pb-stamp empty">
              <Plus size={16} strokeWidth={1.6} />
            </span>
          ))}
        </div>
        <span className="pb-pass-go">
          {px.openPass} <ChevronRight size={15} strokeWidth={2} />
        </span>
      </button>

      </div>

      {/* 3 — Formular */}
      <div className="st-card st-subcard pb-form">
        <p className="st-card-title">{t("profile.info.title")}</p>
        <p className="pb-form-title">{px.formTitle}</p>
        <p className="pb-form-sub">{px.formSub}</p>

        <div className="st-field-row">
          <div className="st-field">
            <label className="st-field-label">{t("profile.info.displayName")}</label>
            <input className="st-input" type="text" placeholder={t("profile.info.displayNamePh")} value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </div>
          <div className="st-field">
            <label className="st-field-label">{t("profile.info.username")}</label>
            <input className="st-input" type="text" placeholder={t("profile.info.usernamePh")} value={username} onChange={e => setUsername(e.target.value)} />
          </div>
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

        {missingChecks.length > 0 && (
          <div className="pb-tip">
            <Sparkles size={15} strokeWidth={1.8} />
            <span>
              <b>{px.oneLeft}</b> {px.missing} {missingChecks.map((c) => c.label).join(" · ")}
            </span>
          </div>
        )}

        {error   && <p className="st-error">{error}</p>}
        {success && !dirty && <p className="st-success">{success}</p>}
      </div>

      {/* 4 — Speichern-Leiste: erscheint nur bei Änderungen */}
      <div className={`pb-savebar ${dirty || saving ? "show" : ""}`} aria-hidden={!dirty && !saving}>
        <span>{px.unsaved}</span>
        <span className="pb-savebar-actions">
          {onDiscard && (
            <button type="button" className="pb-discard" onClick={onDiscard} disabled={saving}>
              {px.discard}
            </button>
          )}
          <button type="button" className="pb-save" disabled={saving} onClick={handleSaveProfile}>
            {saving ? t("common.saving") : t("common.saveChanges")}
          </button>
        </span>
      </div>

      {/* 5 — Konto löschen */}
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
    </div>
  );
}