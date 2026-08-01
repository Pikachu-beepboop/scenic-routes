"use client";

import { useLanguage, type Language } from "../../../LanguageContext";
import { HIDE_UNFINISHED_PREFERENCES } from "../../betaConfig";

export default function PreferencesTab({
  unit, setUnit, lang, setLang,
}: {
  unit: "km" | "mi"; setUnit: (v: "km" | "mi") => void;
  lang: Language; setLang: (v: Language) => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="st-content">
      <div className="st-card">
        <p className="st-card-title">{t("prefs.title")}</p>
        <div className="st-row">
          <span className="st-row-label">{t("prefs.distanceUnit")}</span>
          <select className="st-select" value={unit} onChange={(e) => setUnit(e.target.value as "km" | "mi")}>
            <option value="km">{t("prefs.km")}</option>
            <option value="mi">{t("prefs.mi")}</option>
          </select>
        </div>
        <div className="st-row">
          <span className="st-row-label">{t("prefs.language")}</span>
          {/* Sprachnamen werden bewusst in ihrer jeweils eigenen Sprache angezeigt
              (kein Übersetzungskey nötig — international übliches UX-Muster). */}
          <select className="st-select" value={lang} onChange={(e) => setLang(e.target.value as Language)}>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
            <option value="ru">Русский</option>
          </select>
        </div>
        {!HIDE_UNFINISHED_PREFERENCES && (
          <>
            <div className="st-row">
              <span className="st-row-label">{t("prefs.startPage")}</span>
              <select className="st-select" defaultValue="explore">
                <option value="explore">{t("nav.explore")}</option>
                <option value="trips">{t("nav.myTrips")}</option>
              </select>
            </div>
            <div className="st-row">
              <span className="st-row-label">{t("prefs.mapStyle")}</span>
              <select className="st-select" defaultValue="scenic">
                <option value="scenic">{t("prefs.scenic")}</option>
                <option value="satellite">{t("prefs.satellite")}</option>
              </select>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
