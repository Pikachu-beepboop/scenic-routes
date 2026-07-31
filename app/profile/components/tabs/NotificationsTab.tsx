"use client";

import { ChevronRight } from "lucide-react";

export default function NotificationsTab({
  toggles, toggleSwitch,
}: {
  toggles: { nearbyRoutes: boolean; tripReminders: boolean; communityUpdates: boolean; activityTracking: boolean };
  toggleSwitch: (key: "nearbyRoutes" | "tripReminders" | "communityUpdates" | "activityTracking") => void;
}) {
  return (
    <div className="st-content">
      <div className="st-card">
        <p className="st-card-title">Notifications</p>
        <div className="st-row">
          <div>
            <p className="st-row-label">New Routes Nearby</p>
            <p className="st-row-sub">Get notified about newly recommended routes near you.</p>
          </div>
          <button className={`st-toggle ${toggles.nearbyRoutes ? "on" : ""}`} onClick={() => toggleSwitch("nearbyRoutes")}><span className="st-toggle-knob" /></button>
        </div>
        <div className="st-row">
          <div>
            <p className="st-row-label">Trip Reminders</p>
            <p className="st-row-sub">Get reminders for upcoming planned trips.</p>
          </div>
          <button className={`st-toggle ${toggles.tripReminders ? "on" : ""}`} onClick={() => toggleSwitch("tripReminders")}><span className="st-toggle-knob" /></button>
        </div>
        <div className="st-row">
          <div>
            <p className="st-row-label">Community Updates</p>
            <p className="st-row-sub">News and updates from Scenic Routes.</p>
          </div>
          <button className={`st-toggle ${toggles.communityUpdates ? "on" : ""}`} onClick={() => toggleSwitch("communityUpdates")}><span className="st-toggle-knob" /></button>
        </div>
        <div className="st-row st-row-clickable">
          <span className="st-row-label">Email Settings</span>
          <ChevronRight size={15} color="var(--dim)" />
        </div>
      </div>
    </div>
  );
}
