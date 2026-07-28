"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { translations, type TranslationKey } from "@/lib/translations";

export type Language = "en" | "de" | "ru";

interface LanguageContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  /** Übersetzt einen Key in die aktuell gewählte Sprache. Fällt auf Englisch
   *  zurück, falls für die aktuelle Sprache (noch) keine Übersetzung existiert. */
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  t: (key) => translations[key]?.en ?? key,
});

const STORAGE_KEY = "language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "de" || saved === "ru") {
      setLangState(saved);
    }
  }, []);

  const setLang = (l: Language) => {
    setLangState(l);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, l);
    }
  };

  const t = (key: TranslationKey) => translations[key]?.[lang] ?? translations[key]?.en ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}