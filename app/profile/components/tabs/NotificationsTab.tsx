"use client";

import { ChevronRight } from "lucide-react";
import { useLanguage } from "../../../LanguageContext";

export default function NotificationsTab({
  toggles, toggleSwitch,
}: {
  toggles: { nearbyRoutes: boolean; tripReminders: boolean; communityUpdates: boolean; activityTracking: boolean };
  toggleSwitch: (key: "nearbyRoutes" | "tripReminders" | "communityUpdates" | "activityTracking") => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="st-content">
      <div className="st-card">
        <p className="st-card-title">{t("profile.notif.title")}</p>
        <div className="st-row">
          <div>
            <p className="st-row-label">{t("profile.notif.nearby")}</p>
            <p className="st-row-sub">{t("profile.notif.nearbyText")}</p>
          </div>
          <button className={`st-toggle ${toggles.nearbyRoutes ? "on" : ""}`} onClick={() => toggleSwitch("nearbyRoutes")}><span className="st-toggle-knob" /></button>
        </div>
        <div className="st-row">
          <div>
            <p className="st-row-label">{t("profile.notif.reminders")}</p>
            <p className="st-row-sub">{t("profile.notif.remindersText")}</p>
          </div>
          <button className={`st-toggle ${toggles.tripReminders ? "on" : ""}`} onClick={() => toggleSwitch("tripReminders")}><span className="st-toggle-knob" /></button>
        </div>
        <div className="st-row">
          <div>
            <p className="st-row-label">{t("profile.notif.community")}</p>
            <p className="st-row-sub">{t("profile.notif.communityText")}</p>
          </div>
          <button className={`st-toggle ${toggles.communityUpdates ? "on" : ""}`} onClick={() => toggleSwitch("communityUpdates")}><span className="st-toggle-knob" /></button>
        </div>
        <div className="st-row st-row-clickable">
          <span className="st-row-label">{t("profile.notif.emailSettings")}</span>
          <ChevronRight size={15} color="var(--dim)" />
        </div>
      </div>
    </div>
  );
}
