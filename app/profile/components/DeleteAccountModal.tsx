"use client";

import { useLanguage } from "../../LanguageContext";

export default function DeleteAccountModal({
  show, setShow, deleteConfirmText, setDeleteConfirmText,
  deleteError, deleting, handleDeleteAccount,
}: {
  show: boolean; setShow: (v: boolean) => void;
  deleteConfirmText: string; setDeleteConfirmText: (v: string) => void;
  deleteError: string; deleting: boolean; handleDeleteAccount: () => void;
}) {
  const { t } = useLanguage();

  if (!show) return null;

  return (
    <>
      <div
        onClick={() => !deleting && setShow(false)}
        style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
      />
      <div
        style={{
          position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          zIndex: 501, width: "min(420px,90vw)", background: "var(--bg2)",
          border: "1px solid var(--border)", borderRadius: 22,
          boxShadow: "0 50px 120px rgba(0,0,0,0.55)", padding: 28,
        }}
      >
        <p style={{ fontFamily: "var(--serif)", fontSize: 24, fontWeight: 400, color: "#e08080", marginBottom: 10 }}>
          {t("profile.delete.title")}
        </p>
        <p style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.6, marginBottom: 18 }}>
          {t("profile.delete.text")}
        </p>

        <label style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--dim)", display: "block", marginBottom: 6 }}>
          {t("profile.delete.typeConfirm")}
        </label>
        <input
          className="st-input"
          type="text"
          placeholder="DELETE"
          value={deleteConfirmText}
          onChange={(e) => setDeleteConfirmText(e.target.value)}
          style={{ marginBottom: 14 }}
        />

        {deleteError && <p className="st-error" style={{ marginBottom: 14 }}>{deleteError}</p>}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setShow(false)}
            disabled={deleting}
            style={{
              flex: 1, padding: "12px", borderRadius: 999, border: "1px solid var(--border)",
              background: "transparent", color: "var(--cream)", fontSize: 11, fontWeight: 700,
              letterSpacing: "0.08em", cursor: deleting ? "not-allowed" : "pointer",
            }}
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleDeleteAccount}
            disabled={deleteConfirmText !== "DELETE" || deleting}
            style={{
              flex: 1, padding: "12px", borderRadius: 999, border: "1px solid #e08080",
              background: deleteConfirmText === "DELETE" ? "#e08080" : "transparent",
              color: deleteConfirmText === "DELETE" ? "#1a0a0a" : "#e08080",
              fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
              cursor: deleteConfirmText !== "DELETE" || deleting ? "not-allowed" : "pointer",
              opacity: deleteConfirmText !== "DELETE" || deleting ? 0.6 : 1,
            }}
          >
            {deleting ? t("profile.delete.deleting") : t("profile.danger.delete")}
          </button>
        </div>
      </div>
    </>
  );
}
