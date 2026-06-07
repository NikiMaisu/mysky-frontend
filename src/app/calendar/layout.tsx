"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";

function BrandMark() {
  return (
    <span className="ms-brand-mark" aria-hidden>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M3 8 Q12 4 21 8 L21 18 L3 18 Z" stroke="white" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M3 8 Q12 11 21 8" stroke="white" strokeWidth="1.4" opacity="0.7" />
      </svg>
    </span>
  );
}

export default function CalendarLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useLang();

  if (loading) {
    return <main className="ms-page"><div className="ms-center">{t("common.loading")}</div></main>;
  }
  if (!user || user.role !== "ADMIN") {
    return <main className="ms-page"><div className="ms-center">{t("cal.adminOnly")}</div></main>;
  }

  return (
    <main className="ms-page">
      <div className="ms-page-bar">
        <Link href="/" className="ms-brand" style={{ textDecoration: "none" }}>
          <BrandMark />
          <span className="ms-brand-name">MySky</span>
        </Link>
        <span className="muted" style={{ fontSize: 12 }}>/ {t("cal.title")}</span>
        <div style={{ flex: 1 }} />
        <LanguageToggle />
      </div>
      <div className="ms-page-body" style={{ maxWidth: 1200 }}>{children}</div>
    </main>
  );
}
