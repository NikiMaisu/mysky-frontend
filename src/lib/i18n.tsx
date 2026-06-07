"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { translations, type Lang } from "@/lib/translations";

const STORAGE_KEY = "mysky_lang";

interface LanguageState {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageState | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Always start "en" so the server and first client render match; switch after mount.
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "ka") setLangState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const entry = translations[key];
      let s = entry ? entry[lang] ?? entry.en : key;
      if (vars) {
        for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(String(vars[k]));
      }
      return s;
    },
    [lang],
  );

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export function useLang(): LanguageState {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used inside <LanguageProvider>");
  return ctx;
}
