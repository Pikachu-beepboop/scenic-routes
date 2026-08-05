import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Auth-Optionen jetzt explizit statt implizit (Supabase-Defaults entsprechen
// zwar denselben Werten, aber so ist an einer Stelle sichtbar/dokumentiert,
// dass die Session bewusst in localStorage persistiert wird).
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Der Key, unter dem Supabase-JS die Session im localStorage ablegt.
// Format: sb-<project-ref>-auth-token
function getProjectRef(url: string): string {
  try {
    return new URL(url).hostname.split(".")[0];
  } catch {
    return "";
  }
}
const AUTH_STORAGE_KEY = `sb-${getProjectRef(supabaseUrl)}-auth-token`;

/**
 * Entfernt einen (potenziell korrupten) Session-Eintrag aus dem localStorage.
 * Wird aufgerufen, wenn ein Auth-/DB-Call hängt oder mit einem Auth-Fehler
 * fehlschlägt, damit nachfolgende Aufrufe nicht erneut an derselben kaputten
 * Session hängen bleiben.
 */
export function clearCorruptedSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // localStorage evtl. nicht verfügbar (Privacy-Mode etc.) — ignorieren
  }
}

/**
 * Wrappt ein beliebiges Supabase-Promise (Query oder Auth-Call) mit einem
 * Timeout. Löst der interne Session-Refresh von Supabase nicht sauber auf
 * (z.B. wegen eines ungültigen Refresh-Tokens), würde der Call sonst für
 * immer hängen. Nach `ms` Millisekunden wird stattdessen mit einem Fehler
 * abgebrochen, sodass die aufrufende Stelle in einen definierten
 * Fehler-/Fallback-Zustand wechseln kann statt ewig zu laden.
 */
export function withTimeout<T>(promise: PromiseLike<T>, ms = 8000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Supabase request timed out after ${ms}ms`));
    }, ms);

    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * Robuster Ersatz für `supabase.auth.getSession()`.
 * - Läuft nie unendlich (Timeout nach `ms`).
 * - Räumt bei Timeout oder Fehler automatisch den localStorage-Key auf,
 *   damit ein korrupter Token nicht bei jedem weiteren Aufruf erneut hängt.
 * - Gibt IMMER ein Ergebnisobjekt zurück, nie eine Exception nach oben.
 */
export async function getSessionSafe(ms = 8000) {
  try {
    const { data, error } = await withTimeout(supabase.auth.getSession(), ms);
    if (error) {
      clearCorruptedSession();
      return { session: null, error };
    }
    return { session: data.session, error: null };
  } catch (err) {
    // Timeout oder unerwarteter Fehler beim internen Token-Refresh
    clearCorruptedSession();
    return { session: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}