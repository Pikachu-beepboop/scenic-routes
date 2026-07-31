"use client";

export default function PrivacyTab({
  googleMapsConsent, handleGoogleMapsToggle, mapsConsentSaving,
  toggles, toggleSwitch,
}: {
  googleMapsConsent: boolean; handleGoogleMapsToggle: () => void; mapsConsentSaving: boolean;
  toggles: { activityTracking: boolean };
  toggleSwitch: (key: "activityTracking") => void;
}) {
  return (
    <div className="st-content">
      <div className="st-card">
        <p className="st-card-title">Privacy & Security</p>
        <div className="st-row">
          <div>
            <p className="st-row-label">Google Maps</p>
            <p className="st-row-sub">Load maps from Google Maps on route pages. Google may process your IP address and device information.</p>
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
            <p className="st-row-label">Track Activity</p>
            <p className="st-row-sub">Save your activity for personal statistics.</p>
          </div>
          <button className={`st-toggle ${toggles.activityTracking ? "on" : ""}`} onClick={() => toggleSwitch("activityTracking")}><span className="st-toggle-knob" /></button>
        </div>
      </div>
    </div>
  );
}
