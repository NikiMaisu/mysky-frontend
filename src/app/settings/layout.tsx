"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/settings/materials", label: "Materials" },
  { href: "/settings/fixtures", label: "Lighting fixtures" },
  { href: "/settings/addons", label: "Add-ons" },
  { href: "/settings/granite", label: "Granite" },
  { href: "/settings/workers", label: "Workers" },
  { href: "/settings/teams", label: "Teams" },
  { href: "/settings/schedule", label: "Work schedule" },
];

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

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return <main className="ms-page"><div className="ms-center">Loading…</div></main>;
  }

  if (!user || user.role !== "ADMIN") {
    return <main className="ms-page"><div className="ms-center">Configuration is available to admins only.</div></main>;
  }

  return (
    <main className="ms-page">
      <div className="ms-page-bar">
        <Link href="/" className="ms-brand" style={{ textDecoration: "none" }}>
          <BrandMark />
          <span className="ms-brand-name">MySky</span>
        </Link>
        <span className="muted" style={{ fontSize: 12 }}>/ Configuration</span>
      </div>

      <div className="ms-page-body">
        <div className="ms-settings">
          <nav className="ms-settings-nav">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={"ms-navlink" + (pathname === item.href ? " active" : "")}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ms-settings-content">{children}</div>
        </div>
      </div>
    </main>
  );
}
