"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getSupabaseConsent, persistConsent } from "../../lib/cookieConsent";
import { ThemeSwitch } from "../components/ThemeSwitch";
import { useTheme } from "next-themes";
import { useUnit } from "../UnitContext";
import { useLanguage } from "../LanguageContext";
import {
  User, Award, Settings as SettingsIcon, Map, LogOut,
  Bell, ShieldCheck, LifeBuoy, Info, Menu,
  Mail, Lock, Smartphone, Monitor,
} from "lucide-react";

import "./profile.css";
import type { Stamp, SubTabId } from "./types";
import type { TranslationKey } from "@/lib/translations";

import MobileNavDrawer from "./components/MobileNavDrawer";
import SettingsNav from "./components/SettingsNav";
import DeleteAccountModal from "./components/DeleteAccountModal";

import ProfileTab from "./components/tabs/ProfileTab";
import EmailTab from "./components/tabs/EmailTab";
import PasswordTab from "./components/tabs/PasswordTab";
import TwoFATab from "./components/tabs/TwoFATab";
import SessionsTab from "./components/tabs/SessionsTab";
import PassTab from "./components/tabs/PassTab";
import PreferencesTab from "./components/tabs/PreferencesTab";
import NotificationsTab from "./components/tabs/NotificationsTab";
import PrivacyTab from "./components/tabs/PrivacyTab";
import SupportTab from "./components/tabs/SupportTab";
import AboutTab from "./components/tabs/AboutTab";

// Titel/Untertitel kommen jetzt als Übersetzungs-Keys (aus der bestehenden
// profile.subtab.*-Namensgruppe in lib/translations.ts) statt fest codiertem
// Englisch — die tatsächlichen Strings werden im Component per t(key) aufgelöst,
// damit SUBTAB_META modulweit (außerhalb des LanguageContext) definiert bleiben kann.
const SUBTAB_META: Record<string, { titleKey: TranslationKey; subtitleKey: TranslationKey; icon: ReactNode }> = {
  profile:       { titleKey: "profile.subtab.profile.title",       subtitleKey: "profile.subtab.profile.subtitle",       icon: <User size={20} strokeWidth={1.8} /> },
  pass:          { titleKey: "profile.subtab.pass.title",          subtitleKey: "profile.subtab.pass.subtitle",          icon: <Award size={20} strokeWidth={1.8} /> },
  preferences:   { titleKey: "prefs.title",                        subtitleKey: "prefs.subtitle",                        icon: <SettingsIcon size={20} strokeWidth={1.8} /> },
  email:         { titleKey: "profile.subtab.email.title",         subtitleKey: "profile.subtab.email.subtitle",         icon: <Mail size={20} strokeWidth={1.8} /> },
  password:      { titleKey: "profile.subtab.password.title",      subtitleKey: "profile.subtab.password.subtitle",      icon: <Lock size={20} strokeWidth={1.8} /> },
  twofa:         { titleKey: "profile.subtab.twofa.title",         subtitleKey: "profile.subtab.twofa.subtitle",         icon: <Smartphone size={20} strokeWidth={1.8} /> },
  sessions:      { titleKey: "profile.subtab.sessions.title",      subtitleKey: "profile.subtab.sessions.subtitle",      icon: <Monitor size={20} strokeWidth={1.8} /> },
  notifications: { titleKey: "profile.subtab.notifications.title", subtitleKey: "profile.subtab.notifications.subtitle", icon: <Bell size={20} strokeWidth={1.8} /> },
  privacy:       { titleKey: "profile.subtab.privacy.title",       subtitleKey: "profile.subtab.privacy.subtitle",       icon: <ShieldCheck size={20} strokeWidth={1.8} /> },
  support:       { titleKey: "profile.subtab.support.title",       subtitleKey: "profile.subtab.support.subtitle",       icon: <LifeBuoy size={20} strokeWidth={1.8} /> },
  about:         { titleKey: "profile.subtab.about.title",         subtitleKey: "profile.subtab.about.subtitle",         icon: <Info size={20} strokeWidth={1.8} /> },
};

export default function ProfilePage() {
  const [user, setUser]                   = useState<any>(null);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [username, setUsername]           = useState("");
  const [email, setEmail]                 = useState("");
  const [avatarUrl, setAvatarUrl]         = useState("");

  // Profile tab — additional fields. NOTE: `profiles` table currently only has
  // username/avatar_url/email. To persist these, add columns display_name,
  // country, timezone, about (text) to `profiles` — until then these are
  // local-only and handleSaveProfile will silently skip them.
  const [displayName, setDisplayName]     = useState("");
  const [country, setCountry]             = useState("");
  const [city, setCity]                     = useState("");
  const [aboutYou, setAboutYou]           = useState("");
  const [newPassword, setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError]                 = useState("");
  const [success, setSuccess]             = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  // Snapshot of what's actually persisted in the DB — used to compute Profile
  // Completion so it only updates on Save Changes, not on every keystroke in
  // the live-edited fields above (avatarUrl/country/aboutYou).
  const [savedProfile, setSavedProfile] = useState({ avatarUrl: "", country: "", aboutYou: "" });
  const [navScrolled, setNavScrolled]     = useState(false);
  const [stamps, setStamps]               = useState<Stamp[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  const [subTab, setSubTab] = useState<SubTabId>("profile");

  const [accountGroupOpen, setAccountGroupOpen] = useState(true);
  const [securityGroupOpen, setSecurityGroupOpen] = useState(true);

  // Email Address tab
  const [newEmailInput, setNewEmailInput]         = useState("");
  const [confirmEmailPassword, setConfirmEmailPassword] = useState("");
  const [emailError, setEmailError]               = useState("");
  const [emailSuccess, setEmailSuccess]           = useState("");
  const [emailSaving, setEmailSaving]             = useState(false);

  // Password tab
  const [passwordError, setPasswordError]         = useState("");
  const [passwordSuccess, setPasswordSuccess]     = useState("");
  const [passwordSaving, setPasswordSaving]       = useState(false);

  // Sessions tab
  const [sessionsError, setSessionsError]         = useState("");
  const [sessionsSuccess, setSessionsSuccess]     = useState("");
  const [sessionsSaving, setSessionsSaving]       = useState(false);

  // Privacy tab — Google Maps consent, kept in sync with the same
  // cookie_consents table the cookie banner reads/writes, so toggling it
  // here has the same effect as changing it in the banner's settings.
  const [googleMapsConsent, setGoogleMapsConsent] = useState(false);
  const [mapsConsentSaving, setMapsConsentSaving] = useState(false);

  const [toggles, setToggles] = useState({
    nearbyRoutes: true,
    tripReminders: true,
    communityUpdates: false,
    activityTracking: true,
  });

  function toggleSwitch(key: keyof typeof toggles) {
    setToggles((t) => ({ ...t, [key]: !t[key] }));
  }

  async function handleGoogleMapsToggle() {
    if (!user || mapsConsentSaving) return;
    const nextValue = !googleMapsConsent;
    setMapsConsentSaving(true);
    setGoogleMapsConsent(nextValue);
    await persistConsent({ necessary: true, googleMaps: nextValue }, user.id);
    setMapsConsentSaving(false);
  }

  const { theme } = useTheme();
  const { unit, setUnit } = useUnit();
  const { lang, setLang, t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // NEU: liest ?tab=... aus der URL beim Laden aus (z.B. vom Footer-Link
  // "Traveller Pass" -> /profile?tab=pass) und öffnet direkt den passenden
  // Sub-Tab, statt immer auf "account" zu starten.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    const validTabs: SubTabId[] = ["profile", "pass", "preferences", "email", "password", "twofa", "sessions", "notifications", "privacy", "support", "about"];
    if (tabParam && (validTabs as readonly string[]).includes(tabParam)) {
      setSubTab(tabParam as SubTabId);
    }
  }, []);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      if (!u) { router.push("/"); return; }
      setUser(u);
      fetchProfile(u.id);
      fetchStamps(u.id);
      getSupabaseConsent(u.id).then((consent) => {
        setGoogleMapsConsent(consent?.googleMaps ?? false);
      });
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) {
      setUsername(data.username || "");
      setEmail(data.email || "");
      setAvatarUrl(data.avatar_url || "");
      setAvatarPreview(data.avatar_url || "");
      // Optional columns — read if present (see note above `displayName` state).
      setDisplayName(data.display_name || data.username || "");
      setCountry(data.country || "");
      setCity(data.city || "");
      setAboutYou(data.about || "");
      setSavedProfile({ avatarUrl: data.avatar_url || "", country: data.country || "", aboutYou: data.about || "" });
    }
    setLoading(false);
  }

  // GEÄNDERT: saved_routes hat nur id/user_id/route_id/created_at — title/country
  // kommen jetzt per Join aus routes(...), completed_at nutzt created_at als
  // "wann gespeichert"-Zeitpunkt, terrain gibt es nicht (Feld komplett entfernt).
  async function fetchStamps(userId: string) {
    const { data } = await supabase
      .from("saved_routes")
      .select("id, created_at, routes(title, country)")
      .eq("user_id", userId);

    if (data && data.length > 0) {
      const mapped: Stamp[] = data.map((r: any) => ({
        id: r.id,
        title: r.routes?.title || "",
        country: r.routes?.country || "",
        completed_at: r.created_at,
      }));
      setStamps(mapped);
    }
  }

  // Called by AvatarEditor once it has already uploaded/removed the photo
  // and updated `profiles.avatar_url` itself — this just syncs local state
  // (and the Profile Completion snapshot) so the rest of the page reflects it.
  function handleAvatarUpdated(url: string) {
    setAvatarUrl(url);
    setAvatarPreview(url);
    setSavedProfile((prev) => ({ ...prev, avatarUrl: url }));
  }

  async function handleSaveProfile() {
    setSaving(true); setError(""); setSuccess("");

    const { error: profileError } = await supabase.from("profiles")
      .update({
        username,
        display_name: displayName,
        country,
        city,
        about: aboutYou,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (profileError) { setError(profileError.message); setSaving(false); return; }

    setSuccess(t("profile.updateSuccess"));
    setSavedProfile((prev) => ({ ...prev, country, aboutYou }));
    setSaving(false);
  }

  async function handleChangeEmail() {
    setEmailSaving(true); setEmailError(""); setEmailSuccess("");

    if (!confirmEmailPassword) {
      setEmailError(t("profile.email.currentPasswordRequired"));
      setEmailSaving(false);
      return;
    }
    if (!newEmailInput || newEmailInput === user?.email) {
      setEmailError(t("profile.email.newEmailRequired"));
      setEmailSaving(false);
      return;
    }

    // Verify the current password before allowing the email change
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: confirmEmailPassword,
    });
    if (verifyError) {
      setEmailError(t("profile.email.incorrectPassword"));
      setEmailSaving(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ email: newEmailInput });
    if (updateError) {
      setEmailError(updateError.message);
      setEmailSaving(false);
      return;
    }

    setEmailSuccess(t("profile.email.verificationSent"));
    setNewEmailInput("");
    setConfirmEmailPassword("");
    setEmailSaving(false);
  }

  async function handleChangePassword() {
    setPasswordSaving(true); setPasswordError(""); setPasswordSuccess("");

    if (!newPassword || !confirmPassword) {
      setPasswordError(t("profile.password.fillBothFields"));
      setPasswordSaving(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("profile.password.mismatch"));
      setPasswordSaving(false);
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError(t("profile.password.tooShort"));
      setPasswordSaving(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordError(error.message);
      setPasswordSaving(false);
      return;
    }

    setPasswordSuccess(t("profile.password.updateSuccess"));
    setNewPassword("");
    setConfirmPassword("");
    setPasswordSaving(false);
  }

  async function handleSignOutOthers() {
    setSessionsSaving(true); setSessionsError(""); setSessionsSuccess("");

    const { error } = await supabase.auth.signOut({ scope: "others" });
    if (error) {
      setSessionsError(error.message);
      setSessionsSaving(false);
      return;
    }

    setSessionsSuccess(t("profile.sessions.signedOutOthers"));
    setSessionsSaving(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  async function handleDeleteAccount() {
    if (!user) return;
    setDeleting(true);
    setDeleteError("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        setDeleteError(t("profile.delete.sessionExpired"));
        setDeleting(false);
        return;
      }

      const res = await fetch("/api/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        setDeleteError(result?.error || t("profile.delete.genericError"));
        setDeleting(false);
        return;
      }

      await supabase.auth.signOut();
      router.push("/");
    } catch (err: any) {
      setDeleteError(err?.message || t("profile.delete.genericError"));
      setDeleting(false);
    }
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0c0b09", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 36, height: 36, border: "2px solid rgba(201,168,106,0.15)", borderTopColor: "#C9A86A", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const initials = (username || user?.email || "U")[0].toUpperCase();
  const meta = {
    title: t(SUBTAB_META[subTab].titleKey),
    subtitle: t(SUBTAB_META[subTab].subtitleKey),
    icon: SUBTAB_META[subTab].icon,
  };

  return (
    <div className="pp">
      <div className="pp-bg">
        <img src="/Stelvio Pass.jpg" alt={t("nav.scenicRoadAlt")} onError={e => { (e.currentTarget as HTMLImageElement).src = "/Pacific Route Highway.jpg"; }} />
      </div>

      <nav className={`pp-nav ${navScrolled ? "scrolled" : ""}`}>
        <Link href="/" className="pp-nav-logo">
          <span>EXPLORE</span><span>SCENIC</span><span>ROUTES</span>
        </Link>
        <div className="pp-nav-links">
          <Link href="/explore"  className="pp-nav-link">{t("nav.explore")}</Link>
          <Link href="/about"    className="pp-nav-link">{t("nav.about")}</Link>
          <Link href="/my-trips" className="pp-nav-link">{t("nav.myTrips")}</Link>
        </div>
        <div className="pp-nav-right">
          <ThemeSwitch />
        </div>

        <button
          className="pp-mobile-menu-btn mobile-only"
          onClick={() => setMobileMenuOpen(true)}
          aria-label={t("nav.openMenu")}
        >
          <Menu size={20} strokeWidth={1.8} />
        </button>
      </nav>

      <MobileNavDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        avatarPreview={avatarPreview}
        initials={initials}
        username={username}
        user={user}
        subTab={subTab}
        setSubTab={setSubTab}
        handleLogout={handleLogout}
      />

      <div className="pp-layout">
        <div className="st-wrap">
          <div className="st-megacard">
            <div className="st-header">
              <div className="st-header-left">
                <div className="st-header-icon">{meta.icon}</div>
                <div>
                  <p className="st-title">{meta.title}</p>
                  <p className="st-subtitle">{meta.subtitle}</p>
                </div>
              </div>
              
            </div>

            <div className="st-body">
              <SettingsNav
                subTab={subTab}
                setSubTab={setSubTab}
                accountGroupOpen={accountGroupOpen}
                setAccountGroupOpen={setAccountGroupOpen}
                securityGroupOpen={securityGroupOpen}
                setSecurityGroupOpen={setSecurityGroupOpen}
                onNavigateTrips={() => router.push("/my-trips")}
                handleLogout={handleLogout}
              />

              <div>
                {subTab === "profile" && (
                  <ProfileTab
                    user={user}
                    stamps={stamps}
                    initials={initials}
                    avatarPreview={avatarPreview}
                    savedProfile={savedProfile}
                    onAvatarUpdated={handleAvatarUpdated}
                    displayName={displayName} setDisplayName={setDisplayName}
                    username={username} setUsername={setUsername}
                    country={country} setCountry={setCountry}
                    city={city} setCity={setCity}
                    aboutYou={aboutYou} setAboutYou={setAboutYou}
                    error={error} success={success}
                    saving={saving} handleSaveProfile={handleSaveProfile}
                    setSubTab={setSubTab}
                    setShowDeleteConfirm={setShowDeleteConfirm}
                    setDeleteConfirmText={setDeleteConfirmText}
                    setDeleteError={setDeleteError}
                  />
                )}

                {subTab === "email" && (
                  <EmailTab
                    user={user}
                    newEmailInput={newEmailInput} setNewEmailInput={setNewEmailInput}
                    confirmEmailPassword={confirmEmailPassword} setConfirmEmailPassword={setConfirmEmailPassword}
                    emailError={emailError} setEmailError={setEmailError}
                    emailSuccess={emailSuccess} setEmailSuccess={setEmailSuccess}
                    emailSaving={emailSaving}
                    handleChangeEmail={handleChangeEmail}
                  />
                )}

                {subTab === "password" && (
                  <PasswordTab
                    newPassword={newPassword} setNewPassword={setNewPassword}
                    confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
                    passwordError={passwordError} setPasswordError={setPasswordError}
                    passwordSuccess={passwordSuccess} setPasswordSuccess={setPasswordSuccess}
                    passwordSaving={passwordSaving}
                    handleChangePassword={handleChangePassword}
                  />
                )}

                {subTab === "twofa" && <TwoFATab />}

                {subTab === "sessions" && (
                  <SessionsTab
                    sessionsError={sessionsError}
                    sessionsSuccess={sessionsSuccess}
                    sessionsSaving={sessionsSaving}
                    handleSignOutOthers={handleSignOutOthers}
                  />
                )}

                {subTab === "pass" && (
                  <PassTab
                    username={username}
                    email={user?.email || ""}
                    avatarPreview={avatarPreview}
                    initials={initials}
                    stamps={stamps}
                  />
                )}

                {subTab === "preferences" && (
                  <PreferencesTab unit={unit} setUnit={setUnit} lang={lang} setLang={setLang} />
                )}

                {subTab === "notifications" && (
                  <NotificationsTab toggles={toggles} toggleSwitch={toggleSwitch} />
                )}

                {subTab === "privacy" && (
                  <PrivacyTab
                    googleMapsConsent={googleMapsConsent}
                    handleGoogleMapsToggle={handleGoogleMapsToggle}
                    mapsConsentSaving={mapsConsentSaving}
                    toggles={toggles}
                    toggleSwitch={toggleSwitch}
                  />
                )}

                {subTab === "support" && <SupportTab />}

                {subTab === "about" && <AboutTab />}
              </div>
            </div>
          </div>
        </div>
      </div>

      <DeleteAccountModal
        show={showDeleteConfirm}
        setShow={setShowDeleteConfirm}
        deleteConfirmText={deleteConfirmText}
        setDeleteConfirmText={setDeleteConfirmText}
        deleteError={deleteError}
        deleting={deleting}
        handleDeleteAccount={handleDeleteAccount}
      />
    </div>
  );
}