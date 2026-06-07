"use client";

import { useLang } from "@/lib/i18n";

export function LanguageToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="ms-lang">
      <button type="button" className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</button>
      <button type="button" className={lang === "ka" ? "on" : ""} onClick={() => setLang("ka")}>ქარ</button>
    </div>
  );
}
