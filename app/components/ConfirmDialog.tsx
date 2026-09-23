"use client";

// Kleiner Bestätigungsdialog für nicht umkehrbare Aktionen — aktuell das
// Löschen eines ganzen Trips im Trip Builder und auf /my-trips (Issue #32).
// Nutzt nur die Theme-Variablen (--bg, --border, --cream, --dim), die beide
// Seiten definieren.

import { useEffect } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Beschriftung, solange onConfirm läuft. */
  busyLabel?: string;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open, title, text, confirmLabel, cancelLabel, busyLabel, busy = false, error,
  onConfirm, onCancel,
}: ConfirmDialogProps) {
  // Escape schließt den Dialog — außer während des laufenden Requests.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <>
      <div className="cd-backdrop" onClick={() => !busy && onCancel()} />
      <div className="cd-dialog" role="alertdialog" aria-modal="true" aria-labelledby="cd-title" aria-describedby="cd-text">
        <h2 id="cd-title" className="cd-title">{title}</h2>
        <p id="cd-text" className="cd-text">{text}</p>
        {error && <p className="cd-error" role="alert">{error}</p>}
        <div className="cd-actions">
          <button type="button" className="cd-cancel" onClick={onCancel} disabled={busy} autoFocus>
            {cancelLabel}
          </button>
          <button type="button" className="cd-confirm" onClick={onConfirm} disabled={busy}>
            {busy && busyLabel ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        .cd-backdrop { position:fixed; inset:0; z-index:900; background:rgba(0,0,0,0.55); backdrop-filter:blur(2px); }
        .cd-dialog { position:fixed; top:50%; left:50%; z-index:901; transform:translate(-50%,-50%); width:min(420px,90vw); padding:28px; border:1px solid var(--border); border-radius:22px; background:var(--bg); color:var(--cream); box-shadow:0 40px 110px rgba(0,0,0,0.55); font-family:var(--sans, system-ui, sans-serif); }
        .cd-title { margin:0 0 10px; font-family:var(--serif, Georgia, serif); font-size:28px; font-weight:400; line-height:1.1; color:var(--cream); }
        .cd-text { margin:0; font-size:13.5px; line-height:1.65; color:var(--dim); }
        .cd-error { margin:14px 0 0; font-size:12.5px; color:#e08080; }
        .cd-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:24px; flex-wrap:wrap; }
        .cd-actions button { padding:12px 22px; border-radius:999px; font:inherit; font-size:10px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase; cursor:pointer; transition:all .2s; }
        .cd-actions button:disabled { opacity:0.55; cursor:not-allowed; }
        .cd-cancel { border:1px solid var(--border); background:none; color:var(--cream); }
        .cd-cancel:hover:not(:disabled) { border-color:var(--cream); }
        .cd-confirm { border:1px solid rgba(224,128,128,0.6); background:rgba(224,128,128,0.14); color:#e08080; }
        .cd-confirm:hover:not(:disabled) { background:#e08080; color:#0c0b09; }
      `}</style>
    </>
  );
}
