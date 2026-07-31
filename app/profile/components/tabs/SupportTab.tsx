"use client";

import { ChevronRight } from "lucide-react";
import { useLanguage } from "../../../LanguageContext";

export default function SupportTab() {
  const { t } = useLanguage();

  return (
    <div className="st-content">
      <div className="st-card">
        <p className="st-card-title">{t("profile.support.title")}</p>
        <div className="st-row st-row-clickable">
          <span className="st-row-label">{t("profile.support.faq")}</span>
          <ChevronRight size={15} color="var(--dim)" />
        </div>
        <div className="st-row st-row-clickable">
          <span className="st-row-label">{t("profile.support.contact")}</span>
          <ChevronRight size={15} color="var(--dim)" />
        </div>
        <div className="st-row st-row-clickable">
          <span className="st-row-label">{t("profile.support.tutorials")}</span>
          <ChevronRight size={15} color="var(--dim)" />
        </div>
        <div className="st-row st-row-clickable">
          <span className="st-row-label">{t("profile.support.feedback")}</span>
          <ChevronRight size={15} color="var(--dim)" />
        </div>
      </div>
    </div>
  );
}
