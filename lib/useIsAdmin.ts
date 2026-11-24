"use client";

// NEU: Admin-Status aus der Datenbank statt aus NEXT_PUBLIC_ADMIN_EMAILS.
//
// Fragt die Supabase-Funktion public.is_admin() ab (siehe Migration
// supabase/migrations/20261124220000_admins_table_and_storage_lockdown.sql).
// Das ist nur für die Anzeige (Admin-Link, Admin-Seite) – der eigentliche
// Schutz liegt in den RLS-Policies der Datenbank. Wer den Browser manipuliert,
// sieht höchstens die leere Admin-Seite, kann aber nichts ändern.
//
// Das Ergebnis wird pro User-ID zwischengespeichert, damit nicht jede Seite
// und jedes Menü einzeln nachfragt.

import { useEffect, useState } from "react";
import { supabase, withTimeout } from "./supabase";
import { useAuth } from "./useAuth";

const cache = new Map<string, boolean>();
const inflight = new Map<string, Promise<boolean>>();

/** Fragt die Datenbank, ob der aktuell eingeloggte Nutzer Admin ist. Fehler → false. */
export async function checkIsAdmin(userId?: string | null): Promise<boolean> {
  if (!userId) return false;
  const cached = cache.get(userId);
  if (cached !== undefined) return cached;

  let pending = inflight.get(userId);
  if (!pending) {
    pending = (async () => {
      try {
        const { data, error } = await withTimeout(supabase.rpc("is_admin"), 8000);
        const result = !error && data === true;
        // Nur echte Antworten merken – bei Fehler/Timeout beim nächsten Mal erneut fragen
        if (!error) cache.set(userId, result);
        return result;
      } catch {
        return false;
      } finally {
        inflight.delete(userId);
      }
    })();
    inflight.set(userId, pending);
  }
  return pending;
}

/**
 * true, sobald feststeht, dass der eingeloggte Nutzer Admin ist.
 * `checked` ist false, solange Login-Status oder Datenbank-Antwort noch fehlen
 * (wichtig für die Admin-Seite, damit sie nicht zu früh umleitet).
 */
export function useIsAdmin(): { isAdmin: boolean; checked: boolean } {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const [result, setResult] = useState<{ userId: string | null; isAdmin: boolean } | null>(null);

  useEffect(() => {
    if (loading || !userId) return;
    let active = true;
    checkIsAdmin(userId).then((isAdmin) => {
      if (active) setResult({ userId, isAdmin });
    });
    return () => {
      active = false;
    };
  }, [userId, loading]);

  if (loading) return { isAdmin: false, checked: false };
  if (!userId) return { isAdmin: false, checked: true };
  if (result?.userId === userId) return { isAdmin: result.isAdmin, checked: true };
  const cached = cache.get(userId);
  if (cached !== undefined) return { isAdmin: cached, checked: true };
  return { isAdmin: false, checked: false };
}