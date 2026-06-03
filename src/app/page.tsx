"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

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

export default function Home() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <main className="ms-page"><div className="ms-center">Loading…</div></main>;
  }

  if (!user) {
    return <main className="ms-page"><div className="ms-center">Not signed in.</div></main>;
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <main className="ms-page">
      <div className="ms-page-bar">
        <div className="ms-brand">
          <BrandMark />
          <span className="ms-brand-name">MySky</span>
        </div>
        <div className="spacer" />
        <span className="ms-pill">{user.role.toLowerCase()}</span>
        <div className="ms-rail-avatar" title={user.name}>{initials}</div>
      </div>

      <div className="ms-page-body">
        <div className="ms-card" style={{ padding: 28, maxWidth: 560 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)", margin: 0 }}>
            Welcome, {user.name}
          </h1>
          <p style={{ fontSize: 13, color: "var(--mute)", marginTop: 6 }}>
            Signed in as {user.email}
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 22, flexWrap: "wrap" }}>
            {user.role === "ADMIN" && (
              <Link href="/calendar" className="ms-btn accent">Schedule</Link>
            )}
            {user.role === "ADMIN" && (
              <Link href="/orders" className="ms-btn">Orders</Link>
            )}
            {user.role === "ADMIN" && (
              <Link href="/settings" className="ms-btn">Configuration</Link>
            )}
            <button type="button" onClick={handleLogout} className="ms-btn">Sign out</button>
          </div>
        </div>
      </div>
    </main>
  );
}
