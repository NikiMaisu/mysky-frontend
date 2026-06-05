"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { addDays, dateKey, startOfDay } from "@/lib/calendar";
import { formatDateTime, formatGel, statusLabel, statusTag } from "@/lib/orders";
import { useAuth } from "@/lib/auth";
import type { DayAvailability, Order } from "@/types";

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

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [freeToday, setFreeToday] = useState<DayAvailability | null>(null);

  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (!isAdmin) return;
    const today = startOfDay(new Date());
    const q = `from=${encodeURIComponent(today.toISOString())}&to=${encodeURIComponent(addDays(today, 1).toISOString())}`;
    void (async () => {
      try {
        const [o, avail] = await Promise.all([
          apiFetch<Order[]>("/orders"),
          apiFetch<DayAvailability[]>(`/calendar/availability?${q}`),
        ]);
        setOrders(o);
        setFreeToday(avail.find((a) => a.date === dateKey(today)) ?? avail[0] ?? null);
      } catch {
        setOrders([]);
      }
    })();
  }, [isAdmin]);

  const stats = useMemo(() => {
    if (!orders) return null;
    const now = new Date();
    const inMonth = (iso: string) => {
      const d = new Date(iso);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };
    const month = orders.filter((o) => inMonth(o.startAt) && o.status !== "CANCELLED");
    return {
      count: month.length,
      sqm: month.reduce((s, o) => s + o.squareMeters, 0),
      revenue: month.reduce((s, o) => s + o.totalCost, 0),
      completed: month.filter((o) => o.status === "DONE").length,
      active: month.filter((o) => o.status !== "DONE").length,
    };
  }, [orders]);

  const upcoming = useMemo(() => {
    if (!orders) return [];
    const now = Date.now();
    return orders
      .filter((o) => o.status !== "CANCELLED" && o.status !== "DONE" && new Date(o.startAt).getTime() >= now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 6);
  }, [orders]);

  if (loading) return <main className="ms-page"><div className="ms-center">Loading…</div></main>;
  if (!user) return <main className="ms-page"><div className="ms-center">Not signed in.</div></main>;

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const monthLabel = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });

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
        <button type="button" onClick={handleLogout} className="ms-btn sm">Sign out</button>
      </div>

      <div className="ms-page-body">
        <div className="ms-ph">
          <div>
            <div className="ms-ph-title">Welcome, {user.name}</div>
            <p className="ms-ph-sub">{isAdmin ? `Here's how ${monthLabel} is shaping up.` : "You're signed in."}</p>
          </div>
        </div>

        {!isAdmin && (
          <div className="ms-card" style={{ padding: 24, maxWidth: 520 }}>
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>Your schedule and jobs will appear here.</p>
          </div>
        )}

        {isAdmin && (
          <>
            <div className="ms-quick">
              <Link href="/orders/new" className="ms-btn accent">New order</Link>
              <Link href="/calendar" className="ms-btn">Schedule</Link>
              <Link href="/orders" className="ms-btn">Orders</Link>
              <Link href="/settings" className="ms-btn">Configuration</Link>
            </div>

            <div className="ms-dash-grid">
              <div className="ms-stats">
                <div className="ms-card ms-stat">
                  <div className="label">Orders this month</div>
                  <div className="value">{stats ? stats.count : "—"}</div>
                  <div className="sub">{stats ? `${stats.active} active · ${stats.completed} done` : ""}</div>
                </div>
                <div className="ms-card ms-stat">
                  <div className="label">m² this month</div>
                  <div className="value">{stats ? Math.round(stats.sqm).toLocaleString() : "—"}</div>
                  <div className="sub">installed area</div>
                </div>
                <div className="ms-card ms-stat">
                  <div className="label">Revenue this month</div>
                  <div className="value">{stats ? formatGel(stats.revenue) : "—"}</div>
                  <div className="sub">non-cancelled</div>
                </div>
                <div className="ms-card ms-stat">
                  <div className="label">Completed</div>
                  <div className="value">{stats ? stats.completed : "—"}</div>
                  <div className="sub">this month</div>
                </div>
              </div>

              <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="ms-card" style={{ padding: 16 }}>
                  <p className="ms-panel-title">Free today</p>
                  {!freeToday ? (
                    <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>—</p>
                  ) : freeToday.freeTeams.length === 0 ? (
                    <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>Everyone&apos;s booked.</p>
                  ) : (
                    <div className="ms-cal-free" style={{ marginTop: 0 }}>
                      {freeToday.freeTeams.map((t) => <span key={t.id} className="ms-free-chip">{t.name}</span>)}
                    </div>
                  )}
                </div>

                <div className="ms-card" style={{ padding: 16 }}>
                  <p className="ms-panel-title">Upcoming</p>
                  {upcoming.length === 0 ? (
                    <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>Nothing scheduled ahead.</p>
                  ) : (
                    <div className="ms-upcoming">
                      {upcoming.map((o) => (
                        <Link key={o.id} href={`/orders/${o.id}/edit`} className="ms-upcoming-row">
                          <span className="who">
                            <div className="name">{o.clientName}</div>
                            <div className="when">{formatDateTime(o.startAt)}{o.teamName ? ` · ${o.teamName}` : ""}</div>
                          </span>
                          <span className={"ms-detail-status " + statusTag(o.status)} style={{ flexShrink: 0 }}>
                            <span className="dot" />{statusLabel(o.status)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
