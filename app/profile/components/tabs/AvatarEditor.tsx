"use client";

import { useState, useRef, useEffect } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Camera, Upload, Trash2, X } from "lucide-react";
import { supabase } from "../../../../lib/supabase";
import { useLanguage } from "../../../LanguageContext";
import { getCroppedImageBlob, type CroppedAreaPixels } from "../../../../lib/cropImage";

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
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CroppedAreaPixels | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside — same pattern as the country selector
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setConfirmRemove(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow choosing the same file again later
    if (!file) return;
    setError("");
    setRawImageSrc(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setMenuOpen(false);
  }

  async function handleConfirmCrop() {
    if (!rawImageSrc || !croppedAreaPixels || !userId) return;
    setSaving(true);
    setError("");
    try {
      const blob = await getCroppedImageBlob(rawImageSrc, croppedAreaPixels);
      const fileName = `${userId}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("Avatars")
        .upload(fileName, blob, { upsert: true, contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("Avatars").getPublicUrl(fileName);
      // cache-bust so the browser doesn't keep showing the previous photo
      // (the filename itself stays the same on every re-upload)
      const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: dbError } = await supabase
        .from("profiles")
        .update({ avatar_url: newUrl, updated_at: new Date().toISOString() })
        .eq("id", userId);
      if (dbError) throw dbError;

      onAvatarUpdated(newUrl);
      setRawImageSrc(null);
    } catch (err: any) {
      setError(err?.message || t("profile.avatar.uploadError"));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!userId) return;
    setSaving(true);
    setError("");
    try {
      const fileName = `${userId}.jpg`;
      await supabase.storage.from("Avatars").remove([fileName]);

      const { error: dbError } = await supabase
        .from("profiles")
        .update({ avatar_url: "", updated_at: new Date().toISOString() })
        .eq("id", userId);
      if (dbError) throw dbError;

      onAvatarUpdated("");
    } catch (err: any) {
      setError(err?.message || t("profile.avatar.removeError"));
    } finally {
      setSaving(false);
      setConfirmRemove(false);
      setMenuOpen(false);
    }
  }

  return (
    <div className="st-avatar-wrap" ref={wrapRef}>
      {avatarPreview ? (
        <img src={avatarPreview} className="st-avatar-lg" alt="avatar" />
      ) : (
        <div className="st-avatar-lg-placeholder">{initials}</div>
      )}

      <button
        type="button"
        className="st-avatar-edit"
        title={t("profile.avatar.change")}
        onClick={() => {
          setMenuOpen((v) => !v);
          setConfirmRemove(false);
        }}
        style={{ background: "var(--gold)", border: "2px solid var(--bg2)", padding: 0, margin: 0 }}
      >
        <Camera size={11} strokeWidth={2.2} />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChosen}
        style={{ display: "none" }}
      />

      {menuOpen && (
        <div className="st-avatar-menu">
          <button type="button" className="st-avatar-menu-item" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} strokeWidth={1.8} />
            {t("profile.avatar.upload")}
          </button>

          {avatarPreview && !confirmRemove && (
            <button
              type="button"
              className="st-avatar-menu-item st-avatar-menu-item-danger"
              onClick={() => setConfirmRemove(true)}
            >
              <Trash2 size={14} strokeWidth={1.8} />
              {t("profile.avatar.remove")}
            </button>
          )}

          {confirmRemove && (
            <div className="st-avatar-menu-confirm">
              <p>{t("profile.avatar.confirmRemove")}</p>
              <div className="st-avatar-menu-confirm-actions">
                <button type="button" onClick={() => setConfirmRemove(false)} disabled={saving}>
                  {t("profile.avatar.cancel")}
                </button>
                <button
                  type="button"
                  className="st-avatar-menu-item-danger"
                  onClick={handleRemove}
                  disabled={saving}
                >
                  {saving ? t("common.saving") : t("profile.avatar.remove")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {rawImageSrc && (
        <div className="st-crop-overlay">
          <div className="st-crop-modal">
            <div className="st-crop-modal-head">
              <p>{t("profile.avatar.adjust")}</p>
              <button type="button" onClick={() => setRawImageSrc(null)} disabled={saving}>
                <X size={18} strokeWidth={1.8} />
              </button>
            </div>

            <div className="st-crop-area">
              <Cropper
                image={rawImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, areaPixels: Area) => setCroppedAreaPixels(areaPixels)}
              />
            </div>

            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="st-crop-zoom-slider"
            />

            {error && <p className="st-error">{error}</p>}

            <div className="st-crop-modal-actions">
              <button type="button" className="st-btn" onClick={() => setRawImageSrc(null)} disabled={saving}>
                {t("profile.avatar.cancel")}
              </button>
              <button type="button" className="st-btn st-btn-primary" onClick={handleConfirmCrop} disabled={saving}>
                {saving ? t("common.saving") : t("profile.avatar.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}