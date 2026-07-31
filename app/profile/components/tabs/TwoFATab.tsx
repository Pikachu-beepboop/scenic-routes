"use client";

import { useLanguage } from "../../../LanguageContext";

export default function TwoFATab() {
  const { t } = useLanguage();

  return (
    <div className="st-content">
      <div className="st-card">
        <p className="st-card-title">{t("profile.twofa.title")}</p>
        <div className="st-row">
          <div>
            <p className="st-row-label">{t("profile.twofa.app")}</p>
            <p className="st-row-sub">{t("profile.twofa.comingSoon")}</p>
          </div>
          <button className="st-toggle" disabled style={{ opacity: 0.4, cursor: "not-allowed" }}>
            <span className="st-toggle-knob" />
          </button>
        </div>
      </div>
    </div>
  );
}