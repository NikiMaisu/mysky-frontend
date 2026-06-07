"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { addDays, fmtMonthYear, startOfMonth } from "@/lib/calendar";
import { formatGel, formatMinutes, statusTag } from "@/lib/orders";
import { useLang } from "@/lib/i18n";
import type { BrigadeReport, CalendarOrder, WorkerReport } from "@/types";

export default function ReportsPage() {
  const { t, lang } = useLang();
  const locale = lang === "ka" ? "ka-GE" : "en-GB";

  const [anchor, setAnchor] = useState<Date>(() => startOfMonth(new Date()));
  const [brigades, setBrigades] = useState<BrigadeReport[]>([]);
  const [workers, setWorkers] = useState<WorkerReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [rowOrders, setRowOrders] = useState<CalendarOrder[]>([]);

  const from = anchor;
  const to = useMemo(() => startOfMonth(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1)), [anchor]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setExpanded(null);
    const q = `from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
    try {
      const [b, w] = await Promise.all([
        apiFetch<BrigadeReport[]>(`/reports/brigades?${q}`),
        apiFetch<WorkerReport[]>(`/reports/workers?${q}`),
      ]);
      setBrigades(b);
      setWorkers(w);
    } catch (e) {
      setError(e instanceof ApiError ? t("common.failedLoadCode", { code: e.status }) : t("common.failedLoad"));
    } finally {
      setLoading(false);
    }
  }, [from, to, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleBrigade(teamId: number) {
    if (expanded === teamId) {
      setExpanded(null);
      return;
    }
    setExpanded(teamId);
    setRowOrders([]);
    const q = `teamId=${teamId}&from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
    try {
      setRowOrders(await apiFetch<CalendarOrder[]>(`/calendar?${q}`));
    } catch {
      setRowOrders([]);
    }
  }

  function navigate(delta: number) {
    setAnchor((a) => startOfMonth(new Date(a.getFullYear(), a.getMonth() + delta, 1)));
  }

  return (
    <div>
      <div className="ms-header" style={{ padding: "0 0 16px" }}>
        <div>
          <div className="ms-h-title">{t("rep.title")}</div>
          <div className="ms-h-date">{fmtMonthYear(anchor, locale)}</div>
        </div>
        <div className="ms-h-nav">
          <button onClick={() => navigate(-1)} aria-label="Previous">‹</button>
          <button className="today-btn" onClick={() => setAnchor(startOfMonth(new Date()))}>{t("cal.today")}</button>
          <button onClick={() => navigate(1)} aria-label="Next">›</button>
        </div>
      </div>

      {error && <p className="ms-banner error" style={{ marginBottom: 16 }}>{error}</p>}
      {loading && <p className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>{t("common.loading")}</p>}

      <h2 className="ms-panel-title" style={{ marginBottom: 10 }}>{t("rep.brigades")}</h2>
      <div className="ms-table-wrap" style={{ marginBottom: 28 }}>
        <table className="ms-table">
          <thead>
            <tr>
              <th>{t("set.name")}</th>
              <th className="num" style={{ textAlign: "right" }}>{t("rep.colOrders")}</th>
              <th className="num" style={{ textAlign: "right" }}>{t("rep.colHours")}</th>
              <th className="num" style={{ textAlign: "right" }}>{t("rep.colM2")}</th>
              <th className="num" style={{ textAlign: "right" }}>{t("rep.colRevenue")}</th>
            </tr>
          </thead>
          <tbody>
            {!loading && brigades.length === 0 ? (
              <tr><td colSpan={5} className="empty">{t("rep.noData")}</td></tr>
            ) : (
              brigades.map((b) => (
                <Fragment key={b.teamId}>
                  <tr style={{ cursor: "pointer" }} onClick={() => toggleBrigade(b.teamId)}>
                    <td style={{ fontWeight: 500 }}>{expanded === b.teamId ? "▾ " : "▸ "}{b.teamName ?? "—"}</td>
                    <td className="num" style={{ textAlign: "right" }}>{b.orderCount}</td>
                    <td className="num" style={{ textAlign: "right" }}>{formatMinutes(b.totalMinutes)}</td>
                    <td className="num" style={{ textAlign: "right" }}>{Math.round(b.totalSquareMeters).toLocaleString()}</td>
                    <td className="num" style={{ textAlign: "right" }}>{formatGel(b.totalCost)}</td>
                  </tr>
                  {expanded === b.teamId && (
                    <tr>
                      <td colSpan={5} style={{ background: "var(--surface-2)" }}>
                        {rowOrders.length === 0 ? (
                          <span className="muted" style={{ fontSize: 12.5 }}>{t("rep.noData")}</span>
                        ) : (
                          <div className="ms-upcoming">
                            {rowOrders.map((o) => (
                              <Link key={o.id} href={`/orders/${o.id}/edit`} className="ms-upcoming-row">
                                <span className="who">
                                  <div className="name">#{o.orderNumber} · {o.clientName}</div>
                                  <div className="when">{new Date(o.startAt).toLocaleString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                                </span>
                                <span className={"ms-detail-status " + statusTag(o.status)} style={{ flexShrink: 0 }}>
                                  <span className="dot" />{t(`status.${o.status}`)}
                                </span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 className="ms-panel-title" style={{ marginBottom: 4 }}>{t("rep.workers")}</h2>
      <p className="muted" style={{ fontSize: 11.5, margin: "0 0 10px" }}>{t("rep.workerNote")}</p>
      <div className="ms-table-wrap">
        <table className="ms-table">
          <thead>
            <tr>
              <th>{t("set.name")}</th>
              <th className="num" style={{ textAlign: "right" }}>{t("rep.colOrders")}</th>
              <th className="num" style={{ textAlign: "right" }}>{t("rep.colHours")}</th>
              <th className="num" style={{ textAlign: "right" }}>{t("rep.colM2")}</th>
            </tr>
          </thead>
          <tbody>
            {!loading && workers.length === 0 ? (
              <tr><td colSpan={4} className="empty">{t("rep.noData")}</td></tr>
            ) : (
              workers.map((w) => (
                <tr key={w.workerId}>
                  <td style={{ fontWeight: 500 }}>{w.name}</td>
                  <td className="num" style={{ textAlign: "right" }}>{w.orderCount}</td>
                  <td className="num" style={{ textAlign: "right" }}>{formatMinutes(w.totalMinutes)}</td>
                  <td className="num" style={{ textAlign: "right" }}>{Math.round(w.totalSquareMeters).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
