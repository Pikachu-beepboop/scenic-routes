// lib/cookieConsent.ts
//
// Zentrale Logik für Cookie-Consent:
// - Gäste (kein Account):        nur localStorage, geräte-/browserlokal
// - Eingeloggte User:            Supabase-Tabelle "cookie_consents",
//                                 geräteübergreifend
// - Login nach Guest-Entscheidung: einmaliger Sync von localStorage -> Supabase
//
// WICHTIG: Passe den Import-Pfad zu "../lib/supabase" an deine tatsächliche
// Projektstruktur an (in HomePage.tsx wird er z.B. so importiert).

import { supabase, safeQuery, withTimeout } from "./supabase";

export type CookieConsent = {
  necessary: true;
  googleMaps: boolean;
};

const STORAGE_KEY = "sr_cookie_consent";

export function getLocalConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (typeof parsed?.googleMaps !== "boolean") return null;

    return { necessary: true, googleMaps: parsed.googleMaps };
  } catch {
    return null;
  }
}

export function setLocalConsent(consent: CookieConsent) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ googleMaps: consent.googleMaps })
  );
}

// GEÄNDERT: läuft über safeQuery() mit resetOnAuthError: false. Vorher hat ein
// 401 auf diesen Read (z.B. weil der Access-Token direkt nach einem
// OAuth-Redirect + Hard-Refresh auf /profile noch nicht vollständig geladen
// war, obwohl die Session an sich gültig ist) einen kompletten Auth-Reset
// ausgelöst -> ungewollter Logout + Redirect zur Homepage. Ein fehlgeschlagener
// Consent-Read rechtfertigt das nicht: im schlimmsten Fall zeigt die App das
// Cookie-Banner nochmal an, statt den User auszuloggen.
export async function getSupabaseConsent(
  userId: string
): Promise<CookieConsent | null> {
  const data = await safeQuery<{ google_maps: boolean }>(
    supabase
      .from("cookie_consents")
      .select("google_maps")
      .eq("user_id", userId)
      .maybeSingle(),
    "getSupabaseConsent",
    8000,
    { resetOnAuthError: false }
  );

  if (!data) return null;

  return { necessary: true, googleMaps: data.google_maps };
}

export async function saveSupabaseConsent(
  userId: string,
  consent: CookieConsent
) {
  try {
    await withTimeout(
      supabase.from("cookie_consents").upsert({
        user_id: userId,
        necessary: true,
        google_maps: consent.googleMaps,
      })
    );
  } catch (err) {
    console.error("saveSupabaseConsent failed:", err);
  }
}

// Wird beim Login aufgerufen: prüft ob es bereits eine Supabase-Entscheidung
// gibt. Falls nicht, aber es existiert eine lokale (Guest-)Entscheidung, wird
// diese einmalig nach Supabase übernommen.
export async function migrateLocalConsentToSupabase(userId: string) {
  const existing = await getSupabaseConsent(userId);
  if (existing) return existing;

  const local = getLocalConsent();
  if (!local) return null;

  await saveSupabaseConsent(userId, local);
  return local;
}

// Speichert eine Entscheidung konsistent an beiden Orten (falls eingeloggt).
export async function persistConsent(
  consent: CookieConsent,
  userId: string | null
) {
  setLocalConsent(consent);
  if (userId) {
    await saveSupabaseConsent(userId, consent);
  }
}