"use client";

import { CheckCircle2, Mail } from "lucide-react";
import { useLanguage } from "../../../LanguageContext";

export default function EmailTab({
  user, newEmailInput, setNewEmailInput,
  confirmEmailPassword, setConfirmEmailPassword,
  emailError, setEmailError, emailSuccess, setEmailSuccess, emailSaving,
  handleChangeEmail,
}: {
  user: any;
  newEmailInput: string; setNewEmailInput: (v: string) => void;
  confirmEmailPassword: string; setConfirmEmailPassword: (v: string) => void;
  emailError: string; setEmailError: (v: string) => void;
  emailSuccess: string; setEmailSuccess: (v: string) => void;
  emailSaving: boolean;
  handleChangeEmail: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="st-content">
      <div className="st-card">
        <p className="st-card-title">{t("profile.email.current")}</p>
        <div className="st-row">
          <div>
            <p className="st-row-label" style={{ fontSize: 14 }}>{user?.email}</p>
          </div>
          {user?.email_confirmed_at ? (
            <span className="st-badge st-badge-verified"><CheckCircle2 size={12} strokeWidth={2} /> {t("profile.email.verified")}</span>
          ) : (
            <span className="st-badge st-badge-unverified">{t("profile.email.unverified")}</span>
          )}
        </div>

        <div className="st-divider" />

        <p className="st-card-title">{t("profile.email.newTitle")}</p>
        <div className="st-field">
          <input
            className="st-input"
            type="email"
            placeholder={t("profile.email.newPh")}
            value={newEmailInput}
            onChange={e => setNewEmailInput(e.target.value)}
          />
        </div>

        <p className="st-card-title">{t("profile.email.confirmTitle")}</p>
        <div className="st-field">
          <input
            className="st-input"
            type="password"
            placeholder={t("profile.email.confirmPh")}
            value={confirmEmailPassword}
            onChange={e => setConfirmEmailPassword(e.target.value)}
          />
        </div>

        {emailError   && <p className="st-error">{emailError}</p>}
        {emailSuccess && <p className="st-success">{emailSuccess}</p>}

        <div className="st-info-banner">
          <Mail size={14} strokeWidth={1.8} />
          <span>{t("profile.email.info")}</span>
        </div>

        <div className="st-action-row">
          <button className="st-btn st-btn-primary" disabled={emailSaving} onClick={handleChangeEmail}>
            <Mail size={13} strokeWidth={2} /> {emailSaving ? t("profile.email.sending") : t("profile.email.change")}
          </button>
        </div>
      </div>
    </div>
  );
}
