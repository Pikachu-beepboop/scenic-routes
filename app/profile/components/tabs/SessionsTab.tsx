"use client";

import { LogOut } from "lucide-react";

export default function SessionsTab({
  sessionsError, sessionsSuccess, sessionsSaving, handleSignOutOthers,
}: {
  sessionsError: string; sessionsSuccess: string; sessionsSaving: boolean;
  handleSignOutOthers: () => void;
}) {
  return (
    <div className="st-content">
      <div className="st-card">
        <p className="st-card-title">Active Sessions</p>
        <div className="st-row">
          <div>
            <p className="st-row-label">This device</p>
            <p className="st-row-sub">Current session · Active now</p>
          </div>
          <span className="st-badge st-badge-verified">Active</span>
        </div>

        {sessionsError   && <p className="st-error">{sessionsError}</p>}
        {sessionsSuccess && <p className="st-success">{sessionsSuccess}</p>}

        <div className="st-action-row">
          <button className="st-btn st-btn-primary" disabled={sessionsSaving} onClick={handleSignOutOthers}>
            <LogOut size={13} strokeWidth={2} /> {sessionsSaving ? "Signing out..." : "Sign Out Of All Other Sessions"}
          </button>
        </div>
      </div>
    </div>
  );
}
