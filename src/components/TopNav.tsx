"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

export function TopNav() {
  const { user, logout } = useAuth();
  const { t } = useLang();
  const pathname = usePathname();
  const router = useRouter();

  if (!user || pathname === "/login") return null;

  const isAdmin = user.role === "ADMIN";
  const links = isAdmin
    ? [
        { href: "/", label: t("nav.dashboard"), match: (p: string) => p === "/" },
        { href: "/calendar", label: t("nav.schedule"), match: (p: string) => p.startsWith("/calendar") },
        { href: "/orders", label: t("nav.orders"), match: (p: string) => p.startsWith("/orders") },
        { href: "/settings", label: t("nav.configuration"), match: (p: string) => p.startsWith("/settings") },
      ]
    : [
        { href: "/", label: t("nav.dashboard"), match: (p: string) => p === "/" },
        { href: "/calendar", label: t("nav.schedule"), match: (p: string) => p.startsWith("/calendar") },
      ];

  const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <header className="ms-topnav">
      <Link href="/" className="ms-brand" style={{ textDecoration: "none" }}>
        <BrandMark />
        <span className="ms-brand-name">MySky</span>
      </Link>
      <nav className="ms-nav">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={l.match(pathname) ? "active" : ""}>
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="spacer" />
      <LanguageToggle />
      <span className="ms-pill">{t(`role.${user.role.toLowerCase()}`)}</span>
      <div className="ms-rail-avatar" title={user.name}>{initials}</div>
      <button type="button" onClick={handleLogout} className="ms-btn sm">{t("common.signOut")}</button>
    </header>
  );
}
