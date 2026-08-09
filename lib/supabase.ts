import { createClient, type Session } from "@supabase/supabase-js";

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

// localStorage-Key von Supabase (Default-Schema: sb-<project-ref>-auth-token)
const PROJECT_REF = new URL(supabaseUrl).hostname.split(".")[0];
export const AUTH_STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;

// Event, das bei einem Auth-Reset gefeuert wird. lib/useAuth.ts hört darauf und
// fällt sofort auf den ausgeloggten Zustand zurück — auch dann, wenn der
// interne Auth-State von supabase-js selbst hängt und kein SIGNED_OUT liefert.
export const AUTH_RESET_EVENT = "sr:auth-reset";

/**
 * Auth-Client: hält die Session, refresht Tokens, feuert Auth-Events.
 * Wird ausschließlich für Auth + für Queries auf User-eigene Daten benutzt.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: AUTH_STORAGE_KEY,
  },
});

/**
 * Public-Client für öffentlich lesbare Daten (routes, countries, durations,
 * featured routes ...).
 *
 * WARUM ein zweiter Client: jeder Request des Auth-Clients holt sich vorher via
 * getSession() den Access-Token und wartet dabei auf den Auth-Lock. Hängt der
 * Token-Refresh (abgelaufener/korrupter Token), hängen ALLE Queries mit — auch
 * die, die gar keinen Login brauchen. Genau das hat bisher Explore ("Loading
 * routes...") und die Homepage (Fallback-Routen statt Supabase) lahmgelegt.
 *
 * Dieser Client hat eine eigene storageKey (= eigener Lock), speichert keine
 * Session und refresht nichts. Er kann deshalb nie auf den Auth-State warten.
 */
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: `${AUTH_STORAGE_KEY}-public`,
  },
});

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

/** Liest einen (ggf. auf .0/.1/... gechunkten) Storage-Eintrag zusammen. */
function readChunkedItem(store: Storage, key: string): string | null {
  const direct = store.getItem(key);
  if (direct !== null) return direct;

  let combined = "";
  for (let i = 0; ; i++) {
    const part = store.getItem(`${key}.${i}`);
    if (part === null) break;
    combined += part;
  }
  return combined === "" ? null : combined;
}

/**
 * Liest die gespeicherte Session direkt aus dem Storage — ohne supabase-js und
 * damit ohne Auth-Lock. Wird nur benutzt, um zu entscheiden, ob ein Timeout ein
 * echt kaputter Token war oder nur ein Netzwerk-Aussetzer.
 */
function decodeStoredValue(raw: string): string {
  if (!raw.startsWith("base64-")) return raw;

  // supabase-js speichert base64url — atob() kann damit nicht direkt umgehen.
  let b64 = raw.slice("base64-".length).replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) b64 += "=";

  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function readStoredSession(): { expires_at?: number } | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = readChunkedItem(window.localStorage, AUTH_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(decodeStoredValue(raw));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    // Nicht parsebar = definitiv korrupt.
    return null;
  }
}

/** true, wenn im Storage gar kein oder ein abgelaufener/kaputter Token liegt. */
function storedSessionIsUnusable(): boolean {
  const stored = readStoredSession();
  if (!stored || typeof stored.expires_at !== "number") return true;
  return stored.expires_at * 1000 <= Date.now();
}

/**
 * Entfernt alle Auth-Token-Keys aus local- und sessionStorage.
 *
 * GEÄNDERT: vorher wurde nur der Basis-Key gelöscht. supabase-js legt größere
 * Sessions aber gechunkt als "<key>.0", "<key>.1" ... ab — die blieben liegen
 * und wurden beim nächsten Laden wieder eingelesen. Genau deshalb half bisher
 * nur ein manueller Re-Login.
 */
export function clearStoredAuthTokens() {
  if (typeof window === "undefined") return;

  const isAuthKey = (key: string) =>
    key === AUTH_STORAGE_KEY ||
    key.startsWith(`${AUTH_STORAGE_KEY}.`) ||
    /^sb-.+-auth-token(\.\d+)?$/.test(key);

  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      const keys: string[] = [];
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i);
        if (key && isAuthKey(key)) keys.push(key);
      }
      keys.forEach((key) => store.removeItem(key));
    } catch {
      // Storage nicht verfügbar (Private Mode o.ä.) — ignorieren
    }
  }
}

let resetInFlight: Promise<void> | null = null;

/**
 * Sauberer, vollständiger Fallback auf den ausgeloggten Zustand.
 *
 * 1. lokaler signOut (räumt den In-Memory-State von supabase-js auf und feuert
 *    SIGNED_OUT) — mit Timeout, damit ein hängender Auth-Lock uns nicht selbst
 *    blockiert
 * 2. alle Token-Keys (inkl. Chunks) aus dem Storage werfen
 * 3. AUTH_RESET_EVENT feuern, damit die UI garantiert umschaltet, selbst wenn
 *    supabase-js kein Event mehr liefert
 *
 * Wird NUR bei einem echten Auth-Fehler bzw. nachweislich unbrauchbarem Token
 * aufgerufen — nicht mehr bei jedem fehlgeschlagenen Query. Vorher hat ein
 * simpler Netzwerk-Aussetzer eine völlig gültige Session gelöscht; das war der
 * ungewollte Logout nach dem Browser-Zurück-Button.
 */
export function resetAuthState(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (resetInFlight) return resetInFlight;

  resetInFlight = (async () => {
    try {
      await withTimeout(supabase.auth.signOut({ scope: "local" }), 3000);
    } catch {
      // egal warum das schiefging — der harte Reset unten greift trotzdem
    } finally {
      clearStoredAuthTokens();
      try {
        window.dispatchEvent(new Event(AUTH_RESET_EVENT));
      } catch {
        // ignorieren
      }
      resetInFlight = null;
    }
  })();

  return resetInFlight;
}

/**
 * Unterscheidet "Token ist ungültig" von "Netzwerk/Timeout".
 * Nur der erste Fall rechtfertigt es, die Session zu verwerfen.
 */
export function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const err = error as { name?: string; status?: number; message?: string; code?: string };
  if (err.name === "AuthApiError" || err.name === "AuthSessionMissingError") return true;
  if (err.status === 401 || err.status === 403) return true;

  const haystack = `${err.code ?? ""} ${err.message ?? ""}`.toLowerCase();
  return (
    haystack.includes("refresh token") ||
    haystack.includes("refresh_token") ||
    haystack.includes("jwt expired") ||
    haystack.includes("invalid claim") ||
    haystack.includes("session_not_found") ||
    haystack.includes("session missing") ||
    haystack.includes("bad_jwt") ||
    haystack.includes("token is expired")
  );
}

export type SafeSessionResult = {
  session: Session | null;
  error: Error | null;
  /** true = wir konnten den Auth-State nicht klären (Timeout), Token bleibt liegen */
  degraded: boolean;
};

/**
 * Sichere Variante von supabase.auth.getSession(): liefert garantiert nach
 * spätestens `ms` ein Ergebnis und fällt im Zweifel sauber auf "ausgeloggt"
 * zurück, statt die aufrufende Seite hängen zu lassen.
 */
export async function getSessionSafe(ms = 8000): Promise<SafeSessionResult> {
  try {
    const { data, error } = await withTimeout(supabase.auth.getSession(), ms);

    if (error) {
      if (isAuthError(error)) await resetAuthState();
      return { session: null, error, degraded: !isAuthError(error) };
    }

    return { session: data.session, error: null, degraded: false };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));

    // Echter Auth-Fehler ODER hängender Refresh auf einem abgelaufenen/kaputten
    // Token -> Session verwerfen, damit der nächste Aufruf nicht wieder hängt.
    // Reines Netzwerk-Timeout auf einer noch gültigen Session -> Token behalten,
    // die Seite rendert solange nur den ausgeloggten Zustand und heilt sich
    // selbst, sobald der nächste Refresh durchgeht.
    if (isAuthError(error) || storedSessionIsUnusable()) {
      await resetAuthState();
      return { session: null, error, degraded: false };
    }

    console.warn("getSessionSafe: konnte Auth-State nicht klären:", error.message);
    return { session: null, error, degraded: true };
  }
}

/**
 * Wrapper für Queries auf User-eigene Daten: liefert bei Fehler/Timeout `null`
 * statt zu werfen und verwirft die Session standardmäßig nur bei einem echten
 * Auth-Fehler.
 *
 * GEÄNDERT: neue Option `resetOnAuthError` (Default: true). Ein 401/403 auf
 * einer einzelnen, nicht-kritischen Query bedeutet nicht zwingend, dass die
 * Session kaputt ist — direkt nach einem OAuth-Redirect + Hard-Refresh kann
 * der Access-Token noch nicht vollständig aus dem Storage geladen sein, obwohl
 * die Session an sich gültig ist. Für solche Queries (z.B. Cookie-Consent-Read
 * in cookieConsent.ts) kann der Aufrufer `resetOnAuthError: false` setzen,
 * damit ein einzelner fehlgeschlagener Request nicht den kompletten Nutzer
 * ausloggt.
 */
export async function safeQuery<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: PromiseLike<{ data: any; error: any }>,
  label: string,
  ms = 8000,
  options: { resetOnAuthError?: boolean } = {}
): Promise<T | null> {
  const { resetOnAuthError = true } = options;

  try {
    const { data, error } = await withTimeout(query, ms);
    if (error) {
      console.error(`${label} failed:`, error);
      if (resetOnAuthError && isAuthError(error)) await resetAuthState();
      return null;
    }
    return (data ?? null) as T | null;
  } catch (err) {
    console.error(`${label} failed:`, err);
    if (resetOnAuthError && isAuthError(err)) await resetAuthState();
    return null;
  }
}