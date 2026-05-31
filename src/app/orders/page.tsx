"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { ORDER_STATUSES, formatDateTime, formatGel, statusLabel, statusTag } from "@/lib/orders";
import type { Order, OrderStatus } from "@/types";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<OrderStatus | "">("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = status ? `?status=${status}` : "";
      setOrders(await apiFetch<Order[]>(`/orders${query}`));
    } catch (e) {
      setError(e instanceof ApiError ? `Failed to load (${e.status})` : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="ms-ph">
        <div>
          <div className="ms-ph-title">Orders</div>
          <p className="ms-ph-sub">All jobs, newest scheduling first. Create and edit are admin-only.</p>
        </div>
        <Link href="/orders/new" className="ms-btn accent" style={{ flexShrink: 0 }}>
          New order
        </Link>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <span className="ms-label" style={{ marginRight: 2 }}>Status</span>
        <div className="ms-seg" style={{ flexWrap: "wrap" }}>
          <button type="button" className={status === "" ? "on" : ""} onClick={() => setStatus("")}>All</button>
          {ORDER_STATUSES.map((s) => (
            <button key={s} type="button" className={status === s ? "on" : ""} onClick={() => setStatus(s)}>
              {statusLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="ms-banner error" style={{ marginBottom: 16 }}>{error}</p>}

      <div className="ms-table-wrap">
        <table className="ms-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Client</th>
              <th>Start</th>
              <th>Team</th>
              <th>Status</th>
              <th className="num" style={{ textAlign: "right" }}>Total</th>
              <th className="actions" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="loading">Loading…</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} className="empty">No orders yet.</td></tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id}>
                  <td className="mono muted">{o.orderNumber}</td>
                  <td style={{ fontWeight: 500 }}>{o.clientName}</td>
                  <td className="num">{formatDateTime(o.startAt)}</td>
                  <td className="muted">{o.teamName ?? "—"}</td>
                  <td>
                    <span className={"ms-detail-status " + statusTag(o.status)}>
                      <span className="dot" />{statusLabel(o.status)}
                    </span>
                  </td>
                  <td className="num" style={{ textAlign: "right" }}>{formatGel(o.totalCost)}</td>
                  <td className="actions">
                    <Link href={`/orders/${o.id}/edit`} className="ms-link">Open</Link>
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
