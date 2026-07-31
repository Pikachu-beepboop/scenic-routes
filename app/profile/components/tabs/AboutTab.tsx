"use client";

import { ChevronRight } from "lucide-react";

export default function AboutTab() {
  return (
    <div className="st-content">
      <div className="st-card">
        <p className="st-card-title">About</p>
        <div className="st-row"><span className="st-row-label">Version</span><span className="st-row-value">1.0.0</span></div>
        <div className="st-row st-row-clickable"><span className="st-row-label">Terms of Use</span><ChevronRight size={15} color="var(--dim)" /></div>
        <div className="st-row st-row-clickable"><span className="st-row-label">Privacy Policy</span><ChevronRight size={15} color="var(--dim)" /></div>
        <div className="st-row st-row-clickable"><span className="st-row-label">Impressum</span><ChevronRight size={15} color="var(--dim)" /></div>
      </div>
    </div>
  );
}
