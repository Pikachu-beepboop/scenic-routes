"use client";

import { ChevronRight } from "lucide-react";
import { useLanguage } from "../../../LanguageContext";

export default function AboutTab() {
  const { t } = useLanguage();

  return (
    <div className="st-content">
      <div className="st-card">
        <p className="st-card-title">{t("profile.about.title")}</p>
        <div className="st-row"><span className="st-row-label">{t("profile.about.version")}</span><span className="st-row-value">1.0.0</span></div>
        <div className="st-row st-row-clickable"><span className="st-row-label">{t("profile.about.terms")}</span><ChevronRight size={15} color="var(--dim)" /></div>
        <div className="st-row st-row-clickable"><span className="st-row-label">{t("profile.about.privacy")}</span><ChevronRight size={15} color="var(--dim)" /></div>
        <div className="st-row st-row-clickable"><span className="st-row-label">{t("profile.about.imprint")}</span><ChevronRight size={15} color="var(--dim)" /></div>
      </div>
    </div>
  );
}
