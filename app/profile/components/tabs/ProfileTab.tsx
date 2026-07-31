"use client";

import {
  ChevronRight, ChevronDown, CheckCircle2, Camera,
  Compass, Globe, Bookmark, TrendingUp, Calendar,
  MapPin, AlertTriangle, Circle, Award,
} from "lucide-react";
import type { Stamp, SubTabId } from "../../types";

const ABOUT_MAX = 250;
const COUNTRIES = ["Germany","Pakistan","United States","United Kingdom","France","Italy","Spain","Switzerland","Austria","Norway","Canada","Australia","Other"];
const TIMEZONES = ["UTC-8","UTC-5","UTC+0","UTC+1","UTC+2","UTC+5","UTC+8","UTC+9"];

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
  // Profile Completion — derived from data we already have on hand (no extra
  // backend calls). The overall % is computed from this checklist rather
  // than hardcoded, so it stays honest even though the stat cards below
  // (Trips/Countries/Distance) are still placeholders.
  const completionChecks = [
    { label: "Add profile picture", done: !!avatarPreview },
    { label: "Add about you",        done: aboutYou.trim().length > 0 },
    { label: "Add country",          done: country.trim().length > 0 },
    { label: "Connect your email",   done: !!user?.email_confirmed_at },
    { label: "Set preferences",      done: false }, // TODO: wire once a "preferences saved" flag exists
  ];
  const completionPct = Math.round((completionChecks.filter(c => c.done).length / completionChecks.length) * 100);
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en", { month: "long", year: "numeric" })
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
                <p className="st-profile-role">Scenic Route Explorer</p>
                <p className="st-profile-email">{user?.email}</p>
                <div className="st-profile-meta-row">
                  <span><Calendar size={11} strokeWidth={1.8} /> Member since {memberSince}</span>
                  {country && <span><MapPin size={11} strokeWidth={1.8} /> {country}</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="st-card st-subcard">
            <p className="st-card-title">Profile Information</p>

            <div className="st-field">
              <label className="st-field-label">Display Name</label>
              <input className="st-input" type="text" placeholder="Your display name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
            </div>

            <div className="st-field">
              <label className="st-field-label">Username</label>
              <input className="st-input" type="text" placeholder="Your username" value={username} onChange={e => setUsername(e.target.value)} />
            </div>

            <div className="st-field-row">
              <div className="st-field">
                <label className="st-field-label">Country</label>
                <div className="st-select-wrap">
                  <select className="st-input st-select-full" value={country} onChange={e => setCountry(e.target.value)}>
                    <option value="">Select country</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={14} strokeWidth={2} />
                </div>
              </div>
              <div className="st-field">
                <label className="st-field-label">Time Zone</label>
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
                <label className="st-field-label">About You</label>
                <span className="st-char-count">{aboutYou.length}/{ABOUT_MAX}</span>
              </div>
              <textarea
                className="st-input st-textarea"
                placeholder="Mountain lover. Scenic roads enthusiast."
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
            <p className="st-card-title">Traveller Stats</p>
            {/* TODO: replace placeholders with real counts once wired
                (trips = completed routes, countries = distinct route
                countries, distance = sum of route lengths). Saved
                Routes could use stamps.length today if desired. */}
            <div className="st-stats-grid">
              <div className="st-stat-item">
                <div className="st-stat-icon"><Compass size={16} strokeWidth={1.8} /></div>
                <div><p className="st-stat-num">18</p><p className="st-stat-label">Trips</p></div>
              </div>
              <div className="st-stat-item">
                <div className="st-stat-icon"><Globe size={16} strokeWidth={1.8} /></div>
                <div><p className="st-stat-num">4</p><p className="st-stat-label">Countries</p></div>
              </div>
              <div className="st-stat-item">
                <div className="st-stat-icon"><Bookmark size={16} strokeWidth={1.8} /></div>
                <div><p className="st-stat-num">{stamps.length}</p><p className="st-stat-label">Saved Routes</p></div>
              </div>
              <div className="st-stat-item">
                <div className="st-stat-icon"><TrendingUp size={16} strokeWidth={1.8} /></div>
                <div><p className="st-stat-num">4,328 km</p><p className="st-stat-label">Distance Traveled</p></div>
              </div>
            </div>
          </div>

          <div className="st-card st-subcard st-completion-card">
            <div className="st-completion-head">
              <p className="st-card-title" style={{ marginBottom: 0 }}><CheckCircle2 size={13} strokeWidth={2} style={{ marginRight: 6, verticalAlign: -2 }} />Profile Completion</p>
              <span className="st-completion-pct">{completionPct}%</span>
            </div>
            <div className="st-completion-track">
              <div className="st-completion-fill" style={{ width: `${completionPct}%` }} />
            </div>
            <p className="st-completion-hint">Complete your profile to unlock badges and personalize your experience.</p>
            <div className="st-checklist">
              {completionChecks.map((c) => (
                <div key={c.label} className="st-checklist-item">
                  {c.done ? <CheckCircle2 size={14} strokeWidth={2} color="var(--gold)" /> : <Circle size={14} strokeWidth={1.8} color="var(--dim)" />}
                  <span style={{ opacity: c.done ? 1 : 0.6 }}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="st-card st-subcard st-pass-mini-card">
            <div className="st-pass-mini-head">
              <div className="st-header-icon" style={{ width: 34, height: 34, borderRadius: 10 }}><Award size={17} strokeWidth={1.8} /></div>
              <div style={{ flex: 1 }}>
                <p className="st-profile-name" style={{ fontSize: 15 }}>Traveller Pass</p>
                <p className="st-row-sub" style={{ marginTop: 1 }}>Your passport to explore the world.</p>
              </div>
              <span className="st-badge st-badge-verified">Active</span>
            </div>
            <button className="st-btn st-btn-secondary" style={{ width: "100%", justifyContent: "space-between" }} onClick={() => setSubTab("pass")}>
              View My Passport <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="st-danger-banner">
        <AlertTriangle size={18} strokeWidth={1.8} color="#e08080" />
        <div style={{ flex: 1 }}>
          <p className="st-row-label" style={{ color: "#e08080" }}>Danger Zone</p>
          <p className="st-row-sub">Permanently delete your account and all of your data. This action cannot be undone.</p>
        </div>
        <button
          className="st-btn"
          style={{ background: "rgba(224,128,128,0.12)", border: "1px solid rgba(224,128,128,0.4)", color: "#e08080", flexShrink: 0 }}
          onClick={() => { setShowDeleteConfirm(true); setDeleteConfirmText(""); setDeleteError(""); }}
        >
          Delete Account
        </button>
      </div>

      <div className="st-action-row">
        <button
          className="st-btn st-btn-secondary"
          onClick={() => { setDisplayName(username); setAboutYou(""); setCountry(""); setTimezone("UTC+0"); }}
        >
          Cancel
        </button>
        <button className="st-btn st-btn-primary" disabled={saving} onClick={handleSaveProfile}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
