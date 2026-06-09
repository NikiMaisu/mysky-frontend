"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { addDays, dateKey, startOfDay } from "@/lib/calendar";
import { formatDateTime, statusTag } from "@/lib/orders";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import type { DayAvailability, Order } from "@/types";

export default function Home() {
  const { user, loading } = useAuth();
  const { t, lang } = useLang();

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

  if (loading) return <main className="ms-page"><div className="ms-center">{t("common.loading")}</div></main>;
  if (!user) return <main className="ms-page"><div className="ms-center">{t("dash.notSignedIn")}</div></main>;

  const monthLabel = new Date().toLocaleDateString(lang === "ka" ? "ka-GE" : "en-GB", { month: "long", year: "numeric" });

  return (
    <main className="ms-page">
      <div className="ms-page-body">
        <div className="ms-ph">
          <div>
            <div className="ms-ph-title">{t("dash.welcome", { name: user.name })}</div>
            <p className="ms-ph-sub">{isAdmin ? t("dash.subtitle", { month: monthLabel }) : t("dash.signedIn")}</p>
          </div>
        </div>

        {!isAdmin && (
          <div className="ms-card" style={{ padding: 24, maxWidth: 520 }}>
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>{t("dash.workerNote")}</p>
          </div>
        )}

        {isAdmin && (
          <>
            <div className="ms-quick">
              <Link href="/orders/new" className="ms-btn accent">{t("nav.newOrder")}</Link>
              <Link href="/calendar" className="ms-btn">{t("nav.schedule")}</Link>
              <Link href="/orders" className="ms-btn">{t("nav.orders")}</Link>
              <Link href="/reports" className="ms-btn">{t("nav.reports")}</Link>
              <Link href="/settings" className="ms-btn">{t("nav.configuration")}</Link>
            </div>

            <div className="ms-dash-grid">
              <div className="ms-stats">
                <div className="ms-card ms-stat">
                  <div className="label">{t("dash.ordersThisMonth")}</div>
                  <div className="value">{stats ? stats.count : "—"}</div>
                  <div className="sub">{stats ? t("dash.activeDone", { active: stats.active, done: stats.completed }) : ""}</div>
                </div>
                <div className="ms-card ms-stat">
                  <div className="label">{t("dash.m2ThisMonth")}</div>
                  <div className="value">{stats ? Math.round(stats.sqm).toLocaleString() : "—"}</div>
                  <div className="sub">{t("dash.installedArea")}</div>
                </div>
                <div className="ms-card ms-stat">
                  <div className="label">{t("dash.revenueThisMonth")}</div>
                  <div className="value">{stats ? `${Math.round(stats.revenue).toLocaleString(lang === "ka" ? "ka-GE" : "en-GB")} ₾` : "—"}</div>
                  <div className="sub">{t("dash.nonCancelled")}</div>
                </div>
                <div className="ms-card ms-stat">
                  <div className="label">{t("dash.completed")}</div>
                  <div className="value">{stats ? stats.completed : "—"}</div>
                  <div className="sub">{t("dash.thisMonth")}</div>
                </div>
              </div>

              <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="ms-card" style={{ padding: 16 }}>
                  <p className="ms-panel-title">{t("dash.freeToday")}</p>
                  {!freeToday ? (
                    <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>—</p>
                  ) : freeToday.freeTeams.length === 0 ? (
                    <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>{t("dash.everyoneBooked")}</p>
                  ) : (
                    <div className="ms-cal-free" style={{ marginTop: 0 }}>
                      {freeToday.freeTeams.map((team) => <span key={team.id} className="ms-free-chip">{team.name}</span>)}
                    </div>
                  )}
                </div>

                <div className="ms-card" style={{ padding: 16 }}>
                  <p className="ms-panel-title">{t("dash.upcoming")}</p>
                  {upcoming.length === 0 ? (
                    <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>{t("dash.nothingAhead")}</p>
                  ) : (
                    <div className="ms-upcoming">
                      {upcoming.map((o) => (
                        <Link key={o.id} href={`/orders/${o.id}/edit`} className="ms-upcoming-row">
                          <span className="who">
                            <div className="name">{o.clientName}</div>
                            <div className="when">{formatDateTime(o.startAt)}{o.teamName ? ` · ${o.teamName}` : ""}</div>
                          </span>
                          <span className={"ms-detail-status " + statusTag(o.status)} style={{ flexShrink: 0 }}>
                            <span className="dot" />{t(`status.${o.status}`)}
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
