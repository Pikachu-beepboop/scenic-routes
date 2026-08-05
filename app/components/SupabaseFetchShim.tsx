"use client";

import { useEffect } from "react";

export default function SupabaseFetchShim() {
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) return;

    let originalFetch = window.fetch.bind(window);

    try {
      const supabaseHost = new URL(supabaseUrl).hostname;

      window.fetch = async (input: RequestInfo, init?: RequestInit) => {
        try {
          const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
          if (url.includes(supabaseHost)) {
            init = init ?? {};
            const headers = new Headers(init.headers ?? {});
            // ensure apikey header is set to ANON key (not a JWT)
            if (!headers.has("apikey")) headers.set("apikey", anonKey);
            init.headers = headers;
          }
        } catch (e) {
          // ignore and continue with original fetch
        }
        return originalFetch(input, init);
      };
    } catch (e) {
      // malformed SUPABASE_URL or other error — don't patch
    }

    return () => {
      try {
        window.fetch = originalFetch;
      } catch {}
    };
  }, []);

  return null;
}
