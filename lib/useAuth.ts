"use client";

// Zentraler Auth-State für die gesamte App.
//
// Vorher hat jede Seite ihren eigenen supabase.auth.getSession() + eigenen
// onAuthStateChange-Listener gehalten. Das hatte drei Probleme:
//   1. jede Seite konnte auf einem hängenden Session-Refresh eigenständig
//      festhängen (schwarzer Screen / "Loading routes...")
//   2. nach dem Zurück-Button (bfcache) wurde der Auth-State nie neu geprüft —
//      die Seite kam mit einem längst ungültigen User zurück
//   3. mehrere parallele getSession()-Aufrufe konkurrieren um denselben
//      Auth-Lock und verlängern das Problem
//
// Hier gibt es genau einen Listener, genau eine laufende Session-Prüfung und
// einen garantierten Fallback auf "ausgeloggt".

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  supabase,
  getSessionSafe,
  clearStoredAuthTokens,
  withTimeout,
  AUTH_RESET_EVENT,
} from "./supabase";

export type AuthState = {
  user: User | null;
  /** true, solange der Auth-State beim ersten Laden noch geklärt wird */
  loading: boolean;
};

const LOGGED_OUT: AuthState = { user: null, loading: false };

let state: AuthState = { user: null, loading: true };
const subscribers = new Set<(next: AuthState) => void>();
let started = false;
let pending: Promise<void> | null = null;

function publish(next: AuthState) {
  // Nur bei einer echten Änderung neu rendern. Supabase feuert TOKEN_REFRESHED
  // regelmäßig im Hintergrund — ohne diesen Vergleich würde jede Seite dabei
  // ihre Daten neu laden.
  const changed =
    next.user?.id !== state.user?.id ||
    next.user?.email !== state.user?.email ||
    next.loading !== state.loading;

  state = next;
  if (!changed) return;

  subscribers.forEach((notify) => notify(state));
}

/** Prüft den Auth-State neu — mehrfache Aufrufe teilen sich einen Durchlauf. */
export function refreshAuth(): Promise<void> {
  if (pending) return pending;

  pending = (async () => {
    // 6s: kurz genug, dass niemand vor einem Spinner festhängt, lang genug für
    // einen normalen Token-Refresh auf langsamer Verbindung.
    const { session } = await getSessionSafe(6000);
    publish({ user: session?.user ?? null, loading: false });
  })()
    .catch(() => {
      // getSessionSafe wirft nicht — aber selbst dann bleibt die App nicht im
      // Loading-Zustand hängen.
      publish(LOGGED_OUT);
    })
    .finally(() => {
      pending = null;
    });

  return pending;
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;

  void refreshAuth();

  supabase.auth.onAuthStateChange((event, session) => {
    // WICHTIG: hier drin niemals awaiten oder Supabase-Queries starten —
    // supabase-js hält währenddessen den Auth-Lock, ein Query darin kann die
    // komplette App verklemmen. setTimeout(0) bringt uns sicher aus dem
    // Callback-Stack heraus.
    setTimeout(() => {
      if (event === "SIGNED_OUT") {
        // Reste (inkl. gechunkter Keys) wegräumen, damit beim nächsten Laden
        // garantiert kein halber Token mehr eingelesen wird.
        clearStoredAuthTokens();
        publish(LOGGED_OUT);
        return;
      }
      publish({ user: session?.user ?? null, loading: false });
    }, 0);
  });

  // Zurück-Button / bfcache: die Seite wird aus dem Cache wiederhergestellt,
  // ohne dass React neu mountet. Ohne diese Prüfung behält die Seite den alten
  // (evtl. längst ungültigen) Auth-State.
  window.addEventListener("pageshow", (event) => {
    if ((event as PageTransitionEvent).persisted) void refreshAuth();
  });

  // Tab wieder im Vordergrund -> Session gegenprüfen. Heilt auch den Fall, in
  // dem getSessionSafe() vorher nur wegen eines Timeouts auf "ausgeloggt"
  // zurückgefallen ist.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void refreshAuth();
  });

  // Harter Reset aus lib/supabase.ts -> UI sofort auf ausgeloggt schalten.
  window.addEventListener(AUTH_RESET_EVENT, () => publish(LOGGED_OUT));
}

/**
 * Logout, der nicht hängen bleiben kann: schlägt signOut fehl oder antwortet
 * der Server nicht, wird die Session trotzdem lokal verworfen.
 */
export async function signOutSafe() {
  try {
    await withTimeout(supabase.auth.signOut(), 5000);
  } catch (err) {
    console.error("signOut failed, falling back to local reset:", err);
  } finally {
    clearStoredAuthTokens();
    publish(LOGGED_OUT);
  }
}

export function useAuth(): AuthState {
  // Bewusst mit dem SSR-Snapshot starten (kein User, loading), damit Server-
  // und erstes Client-Rendering identisch sind.
  const [snapshot, setSnapshot] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    start();
    setSnapshot(state);
    subscribers.add(setSnapshot);
    return () => {
      subscribers.delete(setSnapshot);
    };
  }, []);

  return snapshot;
}
