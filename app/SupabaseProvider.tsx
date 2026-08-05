// app/SupabaseProvider.tsx
"use client";

import React, { useState, useEffect, createContext, useContext } from "react";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import type { Session, SupabaseClient } from "@supabase/supabase-js";

type SupabaseContextValue = {
  supabase: SupabaseClient | null;
  session: Session | null;
};

const SupabaseContext = createContext<SupabaseContextValue>({
  supabase: null,
  session: null,
});

export function useSupabase() {
  return useContext(SupabaseContext);
}

export default function SupabaseProvider({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession: Session | null;
}) {
  // createBrowserClient требует supabaseUrl и anonKey в вашей версии — передаём из env
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
    )
  );

  const [session, setSession] = useState<Session | null>(initialSession ?? null);

  useEffect(() => {
    let mounted = true;

    async function syncSessionToServer(event?: string, s?: Session | null) {
      try {
        const payload = {
          event: event ?? (s ? "SIGNED_IN" : "SIGNED_OUT"),
          session: s ?? null,
        };
        await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (e) {
        console.warn("Failed to sync session to server:", e);
      }
    }

    // При монтировании получаем клиентскую сессию и синхронизируем (полезно после redirect)
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const clientSession = data.session ?? null;
        if (!mounted) return;
        setSession(clientSession);
        await syncSessionToServer(clientSession ? "SIGNED_IN" : "SIGNED_OUT", clientSession);
      } catch (e) {
        console.warn("getSession failed:", e);
      }
    })();

    // Подписываемся на изменения аутентификации
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      const newSession = s ?? null;
      setSession(newSession);
      // fire-and-forget синхронизация
      syncSessionToServer(event, newSession);
    });

    const subscription = (data as any)?.subscription;

    return () => {
      mounted = false;
      try {
        subscription?.unsubscribe?.();
      } catch {
        // ignore
      }
    };
  }, [supabase]);

  return (
    <SupabaseContext.Provider value={{ supabase, session }}>
      {children}
    </SupabaseContext.Provider>
  );
}