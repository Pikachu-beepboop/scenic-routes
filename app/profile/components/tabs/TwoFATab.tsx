"use client";

export default function TwoFATab() {
  return (
    <div className="st-content">
      <div className="st-card">
        <p className="st-card-title">Two-Factor Authentication</p>
        <div className="st-row">
          <div>
            <p className="st-row-label">Authenticator App</p>
            <p className="st-row-sub">Coming soon — we're working on adding two-factor authentication.</p>
          </div>
          <button className="st-toggle" disabled style={{ opacity: 0.4, cursor: "not-allowed" }}>
            <span className="st-toggle-knob" />
          </button>
        </div>
      </div>
    </div>
  );
}
