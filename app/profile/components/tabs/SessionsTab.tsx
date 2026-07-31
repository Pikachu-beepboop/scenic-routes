"use client";

import { LogOut } from "lucide-react";
import { useLanguage } from "../../../LanguageContext";

export default function SessionsTab({
  sessionsError, sessionsSuccess, sessionsSaving, handleSignOutOthers,
}: {
  sessionsError: string; sessionsSuccess: string; sessionsSaving: boolean;
  handleSignOutOthers: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="st-content">
      <div className="st-card">
        <p className="st-card-title">{t("profile.sessions.title")}</p>
        <div className="st-row">
          <div>
            <p className="st-row-label">{t("profile.sessions.thisDevice")}</p>
            <p className="st-row-sub">{t("profile.sessions.currentSession")}</p>
          </div>
          <span className="st-badge st-badge-verified">{t("profile.sessions.active")}</span>
        </div>

        {sessionsError   && <p className="st-error">{sessionsError}</p>}
        {sessionsSuccess && <p className="st-success">{sessionsSuccess}</p>}

        <div className="st-action-row">
          <button className="st-btn st-btn-primary" disabled={sessionsSaving} onClick={handleSignOutOthers}>
            <LogOut size={13} strokeWidth={2} /> {sessionsSaving ? t("profile.sessions.signingOut") : t("profile.sessions.signOutOthers")}
          </button>
        </div>
      </div>
    </div>
  );
}
