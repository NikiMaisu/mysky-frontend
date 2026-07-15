"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { ORDER_STATUSES, formatDateTime, formatGel, statusTag } from "@/lib/orders";
import { useLang } from "@/lib/i18n";
import type { Order, OrderStatus, Team } from "@/types";

export default function OrdersPage() {
  const { t } = useLang();
  const [orders, setOrders] = useState<Order[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [teamId, setTeamId] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    apiFetch<Team[]>("/teams").then(setTeams).catch(() => {});
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  function buildParams(extra: Record<string, string> = {}): URLSearchParams {
    const qs = new URLSearchParams(extra);
    if (status) qs.set("status", status);
    if (teamId) qs.set("teamId", teamId);
    if (debouncedQ) qs.set("q", debouncedQ);
    if (from) qs.set("from", new Date(from).toISOString());
    if (to) {
      const end = new Date(to);
      end.setDate(end.getDate() + 1); // inclusive of the chosen end day
      qs.set("to", end.toISOString());
    }
    return qs;
  }

  function downloadExport(format: "csv" | "xlsx") {
    const qs = buildParams({ format });
    const a = document.createElement("a");
    a.href = `/api/orders/export?${qs.toString()}`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildParams().toString();
      setOrders(await apiFetch<Order[]>(`/orders${qs ? `?${qs}` : ""}`));
    } catch (e) {
      setError(e instanceof ApiError ? t("common.failedLoadCode", { code: e.status }) : t("common.failedLoad"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, teamId, debouncedQ, from, to, t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="ms-ph">
        <div>
          <div className="ms-ph-title">{t("orders.title")}</div>
          <p className="ms-ph-sub">{t("orders.subtitle")}</p>
        </div>
        <Link href="/orders/new" className="ms-btn accent" style={{ flexShrink: 0 }}>
          {t("nav.newOrder")}
        </Link>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="search"
          className="ms-input"
          style={{ width: 260 }}
          placeholder={t("orders.searchPlaceholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="ms-select" style={{ width: "auto" }} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          <option value="">{t("orders.allTeams")}</option>
          {teams.map((tm) => (
            <option key={tm.id} value={tm.id}>{tm.name}</option>
          ))}
        </select>
        <label className="row-flex" style={{ gap: 4, fontSize: 12 }}>
          <span className="muted">{t("exp.from")}</span>
          <input type="date" className="ms-input" style={{ width: "auto" }} value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="row-flex" style={{ gap: 4, fontSize: 12 }}>
          <span className="muted">{t("exp.to")}</span>
          <input type="date" className="ms-input" style={{ width: "auto" }} value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <span className="ms-label" style={{ marginRight: 2 }}>{t("orders.status")}</span>
        <div className="ms-seg" style={{ flexWrap: "wrap" }}>
          <button type="button" className={status === "" ? "on" : ""} onClick={() => setStatus("")}>{t("orders.all")}</button>
          {ORDER_STATUSES.map((s) => (
            <button key={s} type="button" className={status === s ? "on" : ""} onClick={() => setStatus(s)}>
              {t(`status.${s}`)}
            </button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <span className="ms-label" style={{ marginRight: 2 }}>{t("exp.export")}</span>
        <button type="button" className="ms-btn sm" onClick={() => downloadExport("csv")}>{t("exp.csv")}</button>
        <button type="button" className="ms-btn sm" onClick={() => downloadExport("xlsx")}>{t("exp.excel")}</button>
      </div>

      {error && <p className="ms-banner error" style={{ marginBottom: 16 }}>{error}</p>}

      <div className="ms-table-wrap">
        <table className="ms-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{t("orders.colClient")}</th>
              <th>{t("orders.colStart")}</th>
              <th>{t("orders.colTeam")}</th>
              <th>{t("orders.status")}</th>
              <th className="num" style={{ textAlign: "right" }}>{t("orders.colTotal")}</th>
              <th className="actions" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="loading">{t("common.loading")}</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} className="empty">{t("orders.none")}</td></tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id}>
                  <td className="mono muted">{o.orderNumber}</td>
                  <td style={{ fontWeight: 500 }}>{o.clientName}</td>
                  <td className="num">{formatDateTime(o.startAt)}</td>
                  <td className="muted">{o.teamName ?? "—"}</td>
                  <td>
                    <span className={"ms-detail-status " + statusTag(o.status)}>
                      <span className="dot" />{t(`status.${o.status}`)}
                    </span>
                  </td>
                  <td className="num" style={{ textAlign: "right" }}>{formatGel(o.totalCost)}</td>
                  <td className="actions">
                    <Link href={`/orders/${o.id}/edit`} className="ms-link">{t("common.open")}</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
