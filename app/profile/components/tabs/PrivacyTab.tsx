"use client";

import { useLanguage } from "../../../LanguageContext";

export default function PrivacyTab({
  googleMapsConsent, handleGoogleMapsToggle, mapsConsentSaving,
  toggles, toggleSwitch,
}: {
  googleMapsConsent: boolean; handleGoogleMapsToggle: () => void; mapsConsentSaving: boolean;
  toggles: { activityTracking: boolean };
  toggleSwitch: (key: "activityTracking") => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="st-content">
      <div className="st-card">
        <p className="st-card-title">{t("profile.privacy.title")}</p>
        <div className="st-row">
          <div>
            <p className="st-row-label">{t("profile.privacy.maps")}</p>
            <p className="st-row-sub">{t("profile.privacy.mapsText")}</p>
          </div>
          <button
            className={`st-toggle ${googleMapsConsent ? "on" : ""}`}
            onClick={handleGoogleMapsToggle}
            disabled={mapsConsentSaving}
          >
            <span className="st-toggle-knob" />
          </button>
        </div>
        <div className="st-row">
          <div>
            <p className="st-row-label">{t("profile.privacy.track")}</p>
            <p className="st-row-sub">{t("profile.privacy.trackText")}</p>
          </div>
          <button className={`st-toggle ${toggles.activityTracking ? "on" : ""}`} onClick={() => toggleSwitch("activityTracking")}><span className="st-toggle-knob" /></button>
        </div>
      </div>
    </div>
  );
}
