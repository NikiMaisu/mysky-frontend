"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";

const NAV = [
  { href: "/settings/materials", key: "set.materials" },
  { href: "/settings/fixtures", key: "set.fixtures" },
  { href: "/settings/addons", key: "set.addons" },
  { href: "/settings/granite", key: "set.granite" },
  { href: "/settings/workers", key: "set.workers" },
  { href: "/settings/teams", key: "set.teams" },
  { href: "/settings/schedule", key: "set.schedule" },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useLang();
  const pathname = usePathname();

  if (loading) {
    return <main className="ms-page"><div className="ms-center">{t("common.loading")}</div></main>;
  }

  if (!user || user.role !== "ADMIN") {
    return <main className="ms-page"><div className="ms-center">{t("set.adminOnly")}</div></main>;
  }

  return (
    <main className="ms-page">
      <div className="ms-page-body">
        <div className="ms-settings">
          <nav className="ms-settings-nav">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={"ms-navlink" + (pathname === item.href ? " active" : "")}
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>
          <div className="ms-settings-content">{children}</div>
        </div>
      </div>
    </main>
  );
}
