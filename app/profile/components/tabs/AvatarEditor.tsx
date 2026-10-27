"use client";

// GEÄNDERT: Kein eigenes Foto mehr — User wählen eines von 5 Scenic-Avataren.
// Die Bilder liegen statisch unter /public/avatars/*.svg; in
// profiles.avatar_url wird nur der Pfad gespeichert (z. B. "/avatars/alpine.svg").
// Dadurch funktioniert jede Stelle, die avatar_url als <img src> nutzt
// (Nav-Dropdown, Sidebar, Traveller Pass …), ohne weitere Änderungen.
// Props sind unverändert, ProfileTab muss nicht angepasst werden.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, Check, X } from "lucide-react";
import { supabase } from "../../../../lib/supabase";
import { useLanguage } from "../../../LanguageContext";

export const AVATAR_OPTIONS = [
  // Gruppe "scenery" — Golden Hour Poster
  { id: "dolomites", group: "scenery", src: "/avatars/dolomites.svg" },
  { id: "fjord", group: "scenery", src: "/avatars/fjord.svg" },
  { id: "tuscany", group: "scenery", src: "/avatars/tuscany.svg" },
  { id: "highlands", group: "scenery", src: "/avatars/highlands.svg" },
  { id: "desertnight", group: "scenery", src: "/avatars/desertnight.svg" },
  // Gruppe "vehicles" — Reise-Typen
  { id: "classic", group: "vehicles", src: "/avatars/classic.svg" },
  { id: "camper", group: "vehicles", src: "/avatars/camper.svg" },
  { id: "motorcycle", group: "vehicles", src: "/avatars/motorcycle.svg" },
  { id: "convertible", group: "vehicles", src: "/avatars/convertible.svg" },
  { id: "offroad", group: "vehicles", src: "/avatars/offroad.svg" },
] as const;

const AVATAR_GROUPS = ["scenery", "vehicles"] as const;

type AvatarId = (typeof AVATAR_OPTIONS)[number]["id"];

const TEXT = {
  en: {
    change: "Change avatar",
    title: "Choose your avatar",
    sub: "Pick the road — or the ride — that feels most like you.",
    initials: "Use my initials",
    groups: { scenery: "Scenery", vehicles: "Road trippers" },
    cancel: "Cancel",
    save: "Save avatar",
    saving: "Saving…",
    error: "Could not save your avatar. Please try again.",
    names: { dolomites: "Dolomites", fjord: "Fjord", tuscany: "Tuscany", highlands: "Highlands", desertnight: "Desert Night", classic: "Classic", camper: "Camper", motorcycle: "Motorbike", convertible: "Convertible", offroad: "Off-road" },
  },
  de: {
    change: "Avatar ändern",
    title: "Wähle deinen Avatar",
    sub: "Such dir die Straße – oder das Fahrzeug – aus, das am besten zu dir passt.",
    initials: "Meine Initialen nutzen",
    groups: { scenery: "Landschaften", vehicles: "Reise-Typen" },
    cancel: "Abbrechen",
    save: "Avatar speichern",
    saving: "Speichern…",
    error: "Avatar konnte nicht gespeichert werden. Bitte versuch es erneut.",
    names: { dolomites: "Dolomiten", fjord: "Fjord", tuscany: "Toskana", highlands: "Highlands", desertnight: "Wüstennacht", classic: "Klassiker", camper: "Camper", motorcycle: "Motorrad", convertible: "Cabrio", offroad: "Offroad" },
  },
  ru: {
    change: "Сменить аватар",
    title: "Выберите аватар",
    sub: "Выберите дорогу или транспорт, который вам ближе всего.",
    initials: "Использовать инициалы",
    groups: { scenery: "Пейзажи", vehicles: "Путешественники" },
    cancel: "Отмена",
    save: "Сохранить",
    saving: "Сохранение…",
    error: "Не удалось сохранить аватар. Попробуйте ещё раз.",
    names: { dolomites: "Доломиты", fjord: "Фьорд", tuscany: "Тоскана", highlands: "Хайленд", desertnight: "Ночь в пустыне", classic: "Классика", camper: "Кемпер", motorcycle: "Мотоцикл", convertible: "Кабриолет", offroad: "Внедорожник" },
  },
} as const;

export default function AvatarEditor({
  userId,
  avatarPreview,
  initials,
  onAvatarUpdated,
}: {
  userId: string;
  avatarPreview: string;
  initials: string;
  onAvatarUpdated: (url: string) => void;
}) {
  const { lang } = useLanguage();
  const tx = TEXT[(lang as keyof typeof TEXT)] || TEXT.en;

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>(avatarPreview || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Beim Öffnen die aktuelle Auswahl übernehmen
  useEffect(() => {
    if (open) {
      setSelected(avatarPreview || "");
      setError("");
    }
  }, [open, avatarPreview]);

  // Escape schließt, Body-Scroll sperren
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, saving]);

  async function handleSave() {
    if (!userId) return;
    if (selected === (avatarPreview || "")) {
      setOpen(false);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { error: dbError } = await supabase
        .from("profiles")
        .update({ avatar_url: selected, updated_at: new Date().toISOString() })
        .eq("id", userId);
      if (dbError) throw dbError;

      // Falls früher ein eigenes Foto hochgeladen wurde: aufräumen (best effort)
      if (avatarPreview && !avatarPreview.startsWith("/avatars/")) {
        try {
          supabase.storage.from("Avatars").remove([`${userId}.jpg`]).catch(() => {});
        } catch {
          /* ignorieren — Avatar ist bereits gespeichert */
        }
      }

      onAvatarUpdated(selected);
      setOpen(false);
    } catch {
      setError(tx.error);
    } finally {
      setSaving(false);
    }
  }

  const modal = open && (
    <div className="av-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) setOpen(false); }}>
      <div className="av-modal" role="dialog" aria-modal="true" aria-label={tx.title}>
        <button type="button" className="av-close" onClick={() => setOpen(false)} disabled={saving} aria-label={tx.cancel}>
          <X size={18} strokeWidth={1.8} />
        </button>

        <div className="av-preview">
          {selected ? <img src={selected} alt="" /> : <span>{initials}</span>}
        </div>
        <p className="av-title">{tx.title}</p>
        <p className="av-sub">{tx.sub}</p>

        {AVATAR_GROUPS.map((group) => (
          <div className="av-group" key={group}>
            <p className="av-group-label">{tx.groups[group]}</p>
            <div className="av-grid">
              {AVATAR_OPTIONS.filter((o) => o.group === group).map(({ id, src }) => {
                const active = selected === src;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`av-opt ${active ? "is-active" : ""}`}
                    onClick={() => setSelected(src)}
                    aria-pressed={active}
                  >
                    <span className="av-opt-img">
                      <img src={src} alt="" />
                      {active && <span className="av-check"><Check size={12} strokeWidth={3} /></span>}
                    </span>
                    <span className="av-opt-label">{tx.names[id as AvatarId]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <button
          type="button"
          className={`av-initials ${!selected ? "is-active" : ""}`}
          onClick={() => setSelected("")}
          aria-pressed={!selected}
        >
          <span className="av-initials-face">{initials}</span>
          {tx.initials}
          {!selected && <Check size={13} strokeWidth={3} />}
        </button>

        {error && <p className="av-error">{error}</p>}

        <div className="av-actions">
          <button type="button" className="av-btn" onClick={() => setOpen(false)} disabled={saving}>
            {tx.cancel}
          </button>
          <button type="button" className="av-btn av-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? tx.saving : tx.save}
          </button>
        </div>
      </div>
      <style>{CSS}</style>
    </div>
  );

  return (
    <div className="st-avatar-wrap">
      <button
        type="button"
        className="av-trigger"
        onClick={() => setOpen(true)}
        title={tx.change}
        aria-label={tx.change}
        style={{ padding: 0, margin: 0, border: "none", background: "none", cursor: "pointer", display: "block", borderRadius: 18 }}
      >
        {avatarPreview ? (
          <img src={avatarPreview} className="st-avatar-lg" alt="avatar" />
        ) : (
          <div className="st-avatar-lg-placeholder">{initials}</div>
        )}
      </button>

      <button
        type="button"
        className="st-avatar-edit"
        title={tx.change}
        aria-label={tx.change}
        onClick={() => setOpen(true)}
        style={{ background: "var(--gold)", border: "2px solid var(--bg2)", padding: 0, margin: 0 }}
      >
        <Camera size={11} strokeWidth={2.2} />
      </button>

      {mounted && modal ? createPortal(modal, document.body) : null}
    </div>
  );
}

const CSS = `
.av-overlay { position:fixed; inset:0; z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; background:rgba(12,11,9,0.55); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); animation:avFade .2s ease; font-family:var(--sans, 'Inter', system-ui, sans-serif); }
@keyframes avFade { from{opacity:0} to{opacity:1} }
@keyframes avPop { from{opacity:0; transform:translateY(10px) scale(.97)} to{opacity:1; transform:none} }
.av-modal { position:relative; width:min(640px, 100%); max-height:calc(100dvh - 40px); overflow-y:auto; box-sizing:border-box; padding:34px 32px 26px; border-radius:26px; background:var(--bg, #F4F0E8); border:1px solid var(--border, rgba(43,38,32,.12)); box-shadow:0 40px 100px rgba(0,0,0,0.45); text-align:center; color:var(--cream, #2B2620); animation:avPop .28s cubic-bezier(0.22,1,0.36,1); }
.av-modal * { box-sizing:border-box; }
.av-modal p { margin:0; }
.av-modal button { font:inherit; }
.av-modal button.av-close { position:absolute; top:16px; right:16px; width:36px; height:36px; display:flex; align-items:center; justify-content:center; border-radius:50%; border:1px solid var(--border); background:none; color:var(--muted); cursor:pointer; transition:color .2s, border-color .2s; }
.av-modal button.av-close:hover { color:var(--cream); border-color:var(--gold); }

.av-preview { width:88px; height:88px; margin:0 auto 14px; border-radius:50%; overflow:hidden; border:3px solid var(--gold, #C9A86A); box-shadow:0 12px 30px rgba(0,0,0,0.22); background:var(--bg2); display:flex; align-items:center; justify-content:center; font-family:var(--serif); font-size:38px; color:var(--cream); }
.av-preview img { width:100%; height:100%; object-fit:cover; display:block; }
.av-title { font-family:var(--serif, Georgia, serif); font-size:28px; font-weight:400; letter-spacing:-0.01em; color:var(--cream); }
.av-sub { margin-top:6px !important; font-size:13px; color:var(--muted); }

.av-group { margin-top:22px; }
.av-group-label { font-size:9px; font-weight:800; letter-spacing:0.26em; text-transform:uppercase; color:var(--gold); text-align:left; padding-left:6px; margin-bottom:6px !important; }
.av-grid { display:grid; grid-template-columns:repeat(5, 1fr); gap:6px; }
.av-modal button.av-initials { display:inline-flex; align-items:center; gap:10px; margin-top:16px; padding:6px 16px 6px 6px; border-radius:999px; border:1px dashed color-mix(in srgb, var(--cream) 28%, transparent); background:none; color:var(--muted); font-size:11.5px; font-weight:700; letter-spacing:0.04em; cursor:pointer; transition:all .2s; }
.av-modal button.av-initials:hover { color:var(--cream); border-color:var(--gold); }
.av-modal button.av-initials.is-active { color:var(--cream); border-style:solid; border-color:var(--gold); background:color-mix(in srgb, var(--gold) 12%, transparent); }
.av-modal button.av-initials svg { color:var(--gold); }
.av-initials-face { width:28px; height:28px; border-radius:50%; background:var(--bg2); display:flex; align-items:center; justify-content:center; font-family:var(--serif); font-size:15px; color:var(--cream); }
.av-modal button.av-opt { display:flex; flex-direction:column; align-items:center; gap:9px; padding:10px 4px 8px; border:none; border-radius:16px; background:none; cursor:pointer; color:var(--muted); transition:background .2s, color .2s; }
.av-modal button.av-opt:hover { background:color-mix(in srgb, var(--border) 55%, transparent); color:var(--cream); }
.av-opt-img { position:relative; width:76px; height:76px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 0 0 2px transparent, 0 6px 16px rgba(0,0,0,0.18); transition:box-shadow .2s, transform .25s cubic-bezier(0.22,1,0.36,1); }
.av-opt-img img { width:100%; height:100%; border-radius:50%; object-fit:cover; display:block; }
.av-modal button.av-opt:hover .av-opt-img { transform:translateY(-2px); }
.av-modal button.av-opt.is-active .av-opt-img { box-shadow:0 0 0 3px var(--bg), 0 0 0 5px var(--gold), 0 8px 20px rgba(0,0,0,0.22); }
.av-modal button.av-opt.is-active { color:var(--cream); }
.av-opt-initials { background:var(--bg2); border:1.5px dashed color-mix(in srgb, var(--cream) 30%, transparent); font-family:var(--serif); font-size:26px; color:var(--cream); }
.av-check { position:absolute; right:-2px; bottom:-2px; width:22px; height:22px; border-radius:50%; background:var(--gold); color:#1A150C; display:flex; align-items:center; justify-content:center; border:2px solid var(--bg); }
.av-opt-label { font-size:10.5px; font-weight:700; letter-spacing:0.06em; line-height:1.25; }

.av-error { margin-top:10px !important; font-size:12px; color:#d07070; }
.av-actions { display:flex; justify-content:center; gap:10px; margin-top:20px; }
.av-modal button.av-btn { height:42px; padding:0 22px; border-radius:999px; border:1px solid var(--border); background:none; color:var(--muted); font-size:11px; font-weight:800; letter-spacing:0.12em; text-transform:uppercase; cursor:pointer; transition:all .2s; }
.av-modal button.av-btn:hover { color:var(--cream); border-color:var(--cream); }
.av-modal button.av-btn-primary { background:var(--gold); border-color:var(--gold); color:#1A150C; }
.av-modal button.av-btn-primary:hover { background:#d8b978; color:#1A150C; border-color:#d8b978; }
.av-modal button:disabled { opacity:.6; cursor:default; }

@media (max-width:620px) {
  .av-modal { padding:30px 18px 22px; }
  .av-grid { gap:2px; }
  .av-modal button.av-opt { padding:8px 0 6px; gap:7px; }
  .av-opt-img { width:52px; height:52px; }
  .av-opt-label { font-size:9px; letter-spacing:0.02em; }
  .av-preview { width:72px; height:72px; }
  .av-title { font-size:24px; }
}
`;