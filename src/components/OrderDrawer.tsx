"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime, formatGel, formatMinutes, statusTag } from "@/lib/orders";
import { useLang } from "@/lib/i18n";
import type { Order } from "@/types";

export function OrderDrawer({ orderId, onClose }: { orderId: number | null; onClose: () => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { t } = useLang();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (orderId == null) return;
    setLoading(true);
    apiFetch<Order>(`/orders/${orderId}`)
      .then(setOrder)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => {
    if (orderId == null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [orderId, onClose]);

  const open = orderId != null;

  return (
    <>
      <div className={"ms-scrim" + (open ? " open" : "")} onClick={onClose} />
      <div className={"ms-drawer" + (open ? " open" : "")} role="dialog" aria-hidden={!open}>
        <div className="ms-drawer-head">
          <span className="title">{order ? t("form.orderNum", { n: order.orderNumber }) : ""}</span>
          <button type="button" className="ms-x" onClick={onClose} aria-label={t("common.close")}>×</button>
        </div>

        <div className="ms-drawer-body">
          {!order && loading ? (
            <p className="muted" style={{ fontSize: 13 }}>{t("common.loading")}</p>
          ) : order ? (
            <>
              <span className={"ms-detail-status " + statusTag(order.status)}>
                <span className="dot" />{t(`status.${order.status}`)}
              </span>
              <div className="ms-detail-client">{order.clientName}</div>
              {(order.address || order.clientPhone) && (
                <div className="ms-detail-sub">
                  {[order.address, order.clientPhone].filter(Boolean).join(" · ")}
                </div>
              )}

              <div className="ms-detail-grid">
                <div className="ms-kv"><div className="k">{t("form.start")}</div><div className="v">{formatDateTime(order.startAt)}</div></div>
                <div className="ms-kv"><div className="k">{t("form.finish")}</div><div className="v">{formatDateTime(order.finishAt)}</div></div>
                <div className="ms-kv"><div className="k">{t("form.team")}</div><div className="v">{order.teamName ?? "—"}</div></div>
                <div className="ms-kv"><div className="k">{t("form.estTime")}</div><div className="v num">{formatMinutes(order.totalMinutes)}</div></div>
                {isAdmin && (
                  <div className="ms-kv"><div className="k">{t("form.totalCost")}</div><div className="v num">{formatGel(order.totalCost)}</div></div>
                )}
              </div>

              {order.materials.length > 0 && (
                <div className="ms-detail-section">
                  <h4>{t("form.materialArea")}</h4>
                  <div className="ms-extras-list">
                    {order.materials.map((m, i) => (
                      <div className="row" key={i}><span>{m.name}</span><span className="qty">{m.squareMeters} m²</span></div>
                    ))}
                  </div>
                </div>
              )}

              {order.fixtures.length > 0 && (
                <div className="ms-detail-section">
                  <h4>{t("form.fixtures")}</h4>
                  <div className="ms-extras-list">
                    {order.fixtures.map((f, i) => (
                      <div className="row" key={i}><span>{f.name}</span><span className="qty">×{f.quantity}</span></div>
                    ))}
                  </div>
                </div>
              )}

              {order.addons.length > 0 && (
                <div className="ms-detail-section">
                  <h4>{t("form.addons")}</h4>
                  <div className="ms-extras-list">
                    {order.addons.map((a, i) => (
                      <div className="row" key={i}><span>{a.name}</span><span className="qty">×{a.quantity}</span></div>
                    ))}
                  </div>
                </div>
              )}

              {order.notes && (
                <div className="ms-detail-section">
                  <h4>{t("form.notes")}</h4>
                  <p className="notes">{order.notes}</p>
                </div>
              )}
            </>
          ) : null}
        </div>

        <div className="ms-drawer-foot">
          {isAdmin && (
            <button
              type="button"
              className="ms-btn primary"
              disabled={!order}
              onClick={() => order && router.push(`/orders/${order.id}/edit`)}
            >
              {t("common.edit")}
            </button>
          )}
          <button type="button" className="ms-btn" onClick={onClose}>{t("common.close")}</button>
        </div>
      </div>
    </>
  );
}
