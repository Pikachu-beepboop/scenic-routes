import { createClient } from "@supabase/supabase-js";

// Environment-Variablen lesen
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Klare Fehlermeldungen statt "supabaseUrl is required"
if (!supabaseUrl) {
  throw new Error(
    "Missing environment variable: NEXT_PUBLIC_SUPABASE_URL"
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

// Supabase Client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// localStorage-Key von Supabase
const AUTH_STORAGE_KEY = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;

/**
 * Entfernt eine beschädigte Session aus dem localStorage.
 */
export function clearCorruptedSession() {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // ignorieren
  }
}

/**
 * Führt ein Promise mit Timeout aus.
 */
export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms = 8000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Supabase request timed out after ${ms}ms`));
    }, ms);

    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Sichere Variante von supabase.auth.getSession()
 */
export async function getSessionSafe(ms = 8000) {
  try {
    const { data, error } = await withTimeout(
      supabase.auth.getSession(),
      ms
    );

    if (error) {
      clearCorruptedSession();
      return {
        session: null,
        error,
      };
    }

    return {
      session: data.session,
      error: null,
    };
  } catch (err) {
    clearCorruptedSession();

    return {
      session: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}