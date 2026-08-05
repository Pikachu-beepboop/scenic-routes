// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { UnitProvider } from "./UnitContext";
import { LanguageProvider } from "./LanguageContext";
import CookieBanner from "./components/CookieBanner";

import SupabaseProvider from "./SupabaseProvider"; // client component
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Scenic Routes",
  description: "Curating the world's most breathtaking driving routes.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Получаем RequestCookies для текущего запроса
  const nextCookies = await cookies();

  // Адаптер, реализующий методы get / set / remove, которые ожидает auth-helpers
  const cookieHandler = {
    get(name: string) {
      const c = nextCookies.get(name);
      return c ? c.value : undefined;
    },
    // В server component nextCookies.set доступен и принимает { name, value, ...opts }
    set(name: string, value: string, options?: Record<string, any>) {
      const cookie: Record<string, any> = { name, value };
      if (options) {
        if (options.maxAge !== undefined) cookie.maxAge = options.maxAge;
        if (options.path !== undefined) cookie.path = options.path;
        if (options.domain !== undefined) cookie.domain = options.domain;
        if (options.httpOnly !== undefined) cookie.httpOnly = options.httpOnly;
        if (options.secure !== undefined) cookie.secure = options.secure;
        if (options.sameSite !== undefined) cookie.sameSite = options.sameSite;
        if (options.expires !== undefined) {
          cookie.expires =
            typeof options.expires === "string" ? new Date(options.expires) : options.expires;
        }
      }
      try {
        // Request/Response cookies.set принимает объект
        (nextCookies as any).set(cookie);
      } catch (err) {
        // fallback: попытаться установить с maxAge:0 (но обычно set есть)
        console.warn("nextCookies.set failed:", err);
      }
    },
    remove(name: string) {
      try {
        if ((nextCookies as any).delete) {
          (nextCookies as any).delete(name);
          return;
        }
        // fallback
        (nextCookies as any).set({ name, value: "", maxAge: 0 });
      } catch (err) {
        console.warn("Failed to remove cookie:", err);
      }
    },
  };

  // Берём URL/KEY (локально можно использовать NEXT_PUBLIC_* в качестве fallback)
  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) as string;
  const supabaseKey = (process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string;

  // Создаём server client, передаём адаптер cookies
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: cookieHandler as any,
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
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