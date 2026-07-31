"use client";

import { CheckCircle2, Mail } from "lucide-react";

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
  return (
    <div className="st-content">
      <div className="st-card">
        <p className="st-card-title">Current Email Address</p>
        <div className="st-row">
          <div>
            <p className="st-row-label" style={{ fontSize: 14 }}>{user?.email}</p>
          </div>
          {user?.email_confirmed_at ? (
            <span className="st-badge st-badge-verified"><CheckCircle2 size={12} strokeWidth={2} /> Verified</span>
          ) : (
            <span className="st-badge st-badge-unverified">Unverified</span>
          )}
        </div>

        <div className="st-divider" />

        <p className="st-card-title">New Email Address</p>
        <div className="st-field">
          <input
            className="st-input"
            type="email"
            placeholder="Enter new email address"
            value={newEmailInput}
            onChange={e => setNewEmailInput(e.target.value)}
          />
        </div>

        <p className="st-card-title">Confirm With Password</p>
        <div className="st-field">
          <input
            className="st-input"
            type="password"
            placeholder="Enter your current password"
            value={confirmEmailPassword}
            onChange={e => setConfirmEmailPassword(e.target.value)}
          />
        </div>

        {emailError   && <p className="st-error">{emailError}</p>}
        {emailSuccess && <p className="st-success">{emailSuccess}</p>}

        <div className="st-info-banner">
          <Mail size={14} strokeWidth={1.8} />
          <span>We will send a verification link to your new email address.</span>
        </div>

        <div className="st-action-row">
          <button
            className="st-btn st-btn-secondary"
            onClick={() => { setNewEmailInput(""); setConfirmEmailPassword(""); setEmailError(""); setEmailSuccess(""); }}
          >
            Cancel
          </button>
          <button className="st-btn st-btn-primary" disabled={emailSaving} onClick={handleChangeEmail}>
            <Mail size={13} strokeWidth={2} /> {emailSaving ? "Sending..." : "Change Email"}
          </button>
        </div>
      </div>
    </div>
  );
}
