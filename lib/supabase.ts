import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

declare global {
  // eslint-disable-next-line no-var
  var __supabaseClient: SupabaseClient | undefined;
}

export const supabase =
  globalThis.__supabaseClient ??
  (globalThis.__supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }));

function getProjectRef(url: string): string {
  try {
    return new URL(url).hostname.split(".")[0];
  } catch {
    return "";
  }
}
const AUTH_STORAGE_KEY = `sb-${getProjectRef(supabaseUrl)}-auth-token`;

export function clearCorruptedSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // localStorage evtl. nicht verfügbar (Privacy-Mode etc.) — ignorieren
  }
}

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

export async function getSessionSafe(ms = 8000) {
  try {
    const { data, error } = await withTimeout(supabase.auth.getSession(), ms);
    if (error) {
      clearCorruptedSession();
      return { session: null, error };
    }
    return { session: data.session, error: null };
  } catch (err) {
    clearCorruptedSession();
    return { session: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}