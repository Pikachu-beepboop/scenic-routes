"use client";

import { Lock } from "lucide-react";
import { useLanguage } from "../../../LanguageContext";

export default function PasswordTab({
  newPassword, setNewPassword,
  confirmPassword, setConfirmPassword,
  passwordError, setPasswordError,
  passwordSuccess, setPasswordSuccess,
  passwordSaving, handleChangePassword,
}: {
  newPassword: string; setNewPassword: (v: string) => void;
  confirmPassword: string; setConfirmPassword: (v: string) => void;
  passwordError: string; setPasswordError: (v: string) => void;
  passwordSuccess: string; setPasswordSuccess: (v: string) => void;
  passwordSaving: boolean; handleChangePassword: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="st-content">
      <div className="st-card">
        <p className="st-card-title">{t("profile.password.title")}</p>
        <div className="st-field">
          <label className="st-field-label">{t("profile.password.new")}</label>
          <input className="st-input" type="password" placeholder={t("profile.password.newPh")} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
        </div>
        <div className="st-field">
          <label className="st-field-label">{t("profile.password.confirm")}</label>
          <input className="st-input" type="password" placeholder={t("profile.password.confirmPh")} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
        </div>

        {passwordError   && <p className="st-error">{passwordError}</p>}
        {passwordSuccess && <p className="st-success">{passwordSuccess}</p>}

        <div className="st-action-row">
          <button
            className="st-btn st-btn-secondary"
            onClick={() => { setNewPassword(""); setConfirmPassword(""); setPasswordError(""); setPasswordSuccess(""); }}
          >
            {t("common.cancel")}
          </button>
          <button className="st-btn st-btn-primary" disabled={passwordSaving} onClick={handleChangePassword}>
            <Lock size={13} strokeWidth={2} /> {passwordSaving ? t("profile.password.saving") : t("profile.password.change")}
          </button>
        </div>
      </div>
    </div>
  );
}
