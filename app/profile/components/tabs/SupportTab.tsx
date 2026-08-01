"use client";

import { useState } from "react";
import { ChevronRight, Mail } from "lucide-react";
import { useLanguage } from "../../../LanguageContext";
import { HIDE_TUTORIALS_ROW } from "../../betaConfig";

/**
 * ─── EDIT ME LATER ───────────────────────────────────────────
 * Ersetze die E-Mail-Adressen unten durch deine echten Angaben.
 * Die FAQ-Fragen/Antworten sowie die Einleitungstexte für
 * Contact Us / Send Feedback liegen jetzt in translations.ts
 * unter den Keys "profile.support.faq.q1"…"q4" / "a1"…"a4" und
 * "profile.support.contact.intro" / "profile.support.feedback.intro" —
 * dort auf Deutsch anpassen, Englisch/Russisch entsprechend mit
 * übersetzen.
 */
const CONTACT_EMAIL = "hello@explorescenicroutes.com";
const FEEDBACK_EMAIL = "feedback@explorescenicroutes.com";
/* ─────────────────────────────────────────────────────────── */

const FAQ_INDEXES = ["1", "2", "3", "4"] as const;

type OpenRow = "faq" | "contact" | "feedback" | null;

export default function SupportTab() {
  const { t } = useLanguage();
  const [openRow, setOpenRow] = useState<OpenRow>(null);

  const toggle = (row: Exclude<OpenRow, null>) => {
    setOpenRow((prev) => (prev === row ? null : row));
  };

  return (
    <div className="st-content">
      <div className="st-card">
        <p className="st-card-title">{t("profile.support.title")}</p>

        {/* FAQ */}
        <div className="st-accordion">
          <button
            type="button"
            className="st-row st-row-clickable st-accordion-trigger"
            onClick={() => toggle("faq")}
          >
            <span className="st-row-label">{t("profile.support.faq")}</span>
            <ChevronRight size={15} color="var(--dim)" className={`st-chevron ${openRow === "faq" ? "st-chevron-open" : ""}`} />
          </button>
          {openRow === "faq" && (
            <div className="st-accordion-panel">
              {FAQ_INDEXES.map((n) => (
                <div className="st-faq-item" key={n}>
                  <p className="st-faq-q">{t(`profile.support.faq.q${n}`)}</p>
                  <p className="st-faq-a">{t(`profile.support.faq.a${n}`)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contact Us */}
        <div className="st-accordion">
          <button
            type="button"
            className="st-row st-row-clickable st-accordion-trigger"
            onClick={() => toggle("contact")}
          >
            <span className="st-row-label">{t("profile.support.contact")}</span>
            <ChevronRight size={15} color="var(--dim)" className={`st-chevron ${openRow === "contact" ? "st-chevron-open" : ""}`} />
          </button>
          {openRow === "contact" && (
            <div className="st-accordion-panel">
              <p className="st-faq-a">{t("profile.support.contact.intro")}</p>
              <a href={`mailto:${CONTACT_EMAIL}`} className="st-contact-email">
                <Mail size={13} strokeWidth={2} /> {CONTACT_EMAIL}
              </a>
            </div>
          )}
        </div>

        {/* Tutorials & Help Articles — noch ohne Inhalte, daher ausgeblendet */}
        {!HIDE_TUTORIALS_ROW && (
          <div className="st-row st-row-clickable">
            <span className="st-row-label">{t("profile.support.tutorials")}</span>
            <ChevronRight size={15} color="var(--dim)" />
          </div>
        )}

        {/* Send Feedback */}
        <div className="st-accordion">
          <button
            type="button"
            className="st-row st-row-clickable st-accordion-trigger"
            onClick={() => toggle("feedback")}
          >
            <span className="st-row-label">{t("profile.support.feedback")}</span>
            <ChevronRight size={15} color="var(--dim)" className={`st-chevron ${openRow === "feedback" ? "st-chevron-open" : ""}`} />
          </button>
          {openRow === "feedback" && (
            <div className="st-accordion-panel">
              <p className="st-faq-a">{t("profile.support.feedback.intro")}</p>
              <a href={`mailto:${FEEDBACK_EMAIL}`} className="st-contact-email">
                <Mail size={13} strokeWidth={2} /> {FEEDBACK_EMAIL}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
