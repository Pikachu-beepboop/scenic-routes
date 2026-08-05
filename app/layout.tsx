// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { UnitProvider } from "./UnitContext";
import { LanguageProvider } from "./LanguageContext";
import CookieBanner from "./components/CookieBanner";

import SupabaseProvider from "./SupabaseProvider";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Scenic Routes",
  description: "Curating the world's most breathtaking driving routes.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Получаем RequestCookies для текущего запроса (await важно)
  const nextCookies = (await cookies()) as any;

  // Адаптер cookie: умеет читать мульти-кусочные cookie name.0, name.1, ...
  const cookieHandler = {
    get(name: string) {
      // сначала пробуем основной
      const main = nextCookies.get(name);
      if (main) return main.value;

      // иначе пробуем собрать куски name.0..name.N
      const parts: string[] = [];
      for (let i = 0; i < 40; i++) {
        const p = nextCookies.get(`${name}.${i}`);
        if (!p) break;
        parts.push(p.value);
      }
      if (parts.length) return parts.join("");
      return undefined;
    },
    set(name: string, value: string, options?: Record<string, any>) {
      try {
        nextCookies.set({ name, value, ...(options ?? {}) });
      } catch (err) {
        console.warn("nextCookies.set failed:", err);
      }
    },
    remove(name: string) {
      try {
        if (typeof nextCookies.delete === "function") {
          nextCookies.delete(name);
        } else {
          nextCookies.set({ name, value: "", maxAge: 0 });
        }
      } catch (err) {
        console.warn("Failed to remove cookie:", err);
      }
    },
  };

  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) as string;
  const supabaseKey = (process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string;

  const supabase = createServerClient(supabaseUrl, supabaseKey, { cookies: cookieHandler as any });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SupabaseProvider initialSession={session ?? null}>
          <ThemeProvider>
            <UnitProvider>
              <LanguageProvider>
                {children}
                <CookieBanner />
              </LanguageProvider>
            </UnitProvider>
          </ThemeProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
