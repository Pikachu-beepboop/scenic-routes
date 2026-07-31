"use client";

import { ChevronRight } from "lucide-react";

export default function SupportTab() {
  return (
    <div className="st-content">
      <div className="st-card">
        <p className="st-card-title">Support & Feedback</p>
        <div className="st-row st-row-clickable">
          <span className="st-row-label">FAQ</span>
          <ChevronRight size={15} color="var(--dim)" />
        </div>
        <div className="st-row st-row-clickable">
          <span className="st-row-label">Contact Us</span>
          <ChevronRight size={15} color="var(--dim)" />
        </div>
        <div className="st-row st-row-clickable">
          <span className="st-row-label">Tutorials & Help Articles</span>
          <ChevronRight size={15} color="var(--dim)" />
        </div>
        <div className="st-row st-row-clickable">
          <span className="st-row-label">Send Feedback</span>
          <ChevronRight size={15} color="var(--dim)" />
        </div>
      </div>
    </div>
  );
}
