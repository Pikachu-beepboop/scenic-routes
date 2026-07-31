"use client";

import type { Language } from "../../../LanguageContext";

export default function PreferencesTab({
  unit, setUnit, lang, setLang,
}: {
  unit: "km" | "mi"; setUnit: (v: "km" | "mi") => void;
  lang: Language; setLang: (v: Language) => void;
}) {
  return (
    <div className="st-content">
      <div className="st-card">
        <p className="st-card-title">Preferences</p>
        <div className="st-row">
          <span className="st-row-label">Distance Unit</span>
          <select className="st-select" value={unit} onChange={(e) => setUnit(e.target.value as "km" | "mi")}>
            <option value="km">Kilometers</option>
            <option value="mi">Miles</option>
          </select>
        </div>
        <div className="st-row">
          <span className="st-row-label">Language</span>
          <select className="st-select" value={lang} onChange={(e) => setLang(e.target.value as Language)}>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
          </select>
        </div>
        <div className="st-row">
          <span className="st-row-label">Start Page</span>
          <select className="st-select" defaultValue="explore">
            <option value="explore">Explore</option>
            <option value="trips">My Trips</option>
          </select>
        </div>
        <div className="st-row">
          <span className="st-row-label">Default Map Style</span>
          <select className="st-select" defaultValue="scenic">
            <option value="scenic">Scenic</option>
            <option value="satellite">Satellite</option>
          </select>
        </div>
      </div>
    </div>
  );
}
