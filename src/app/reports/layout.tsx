"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";

export default function ReportsLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useLang();

  if (loading) {
    return <main className="ms-page"><div className="ms-center">{t("common.loading")}</div></main>;
  }
  if (!user || user.role !== "ADMIN") {
    return <main className="ms-page"><div className="ms-center">{t("rep.adminOnly")}</div></main>;
  }

  return (
    <main className="ms-page">
      <div className="ms-page-body">{children}</div>
    </main>
  );
}
