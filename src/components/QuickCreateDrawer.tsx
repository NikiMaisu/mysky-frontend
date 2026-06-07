"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { ORDER_STATUSES, fromLocalInput, toLocalInput } from "@/lib/orders";
import { useLang } from "@/lib/i18n";
import type { Material, OrderRequest, OrderStatus, Team } from "@/types";

export function QuickCreateDrawer({
  range,
  onClose,
  onCreated,
}: {
  range: { start: Date; end: Date | null } | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const router = useRouter();
  const { t } = useLang();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [clientName, setClientName] = useState("");
  const [teamId, setTeamId] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [sqm, setSqm] = useState("");
  const [status, setStatus] = useState<OrderStatus>("SCHEDULED");
  const [startVal, setStartVal] = useState("");
  const [endVal, setEndVal] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = range != null;

  useEffect(() => {
    apiFetch<Material[]>("/materials").then(setMaterials).catch(() => {});
    apiFetch<Team[]>("/teams").then(setTeams).catch(() => {});
  }, []);

  useEffect(() => {
    if (!range) return;
    setStartVal(toLocalInput(range.start.toISOString()));
    setEndVal(range.end ? toLocalInput(range.end.toISOString()) : "");
    setClientName("");
    setTeamId("");
    setMaterialId("");
    setSqm("");
    setStatus("SCHEDULED");
    setError(null);
  }, [range]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function params(): string {
    const qs = new URLSearchParams();
    if (startVal) qs.set("start", fromLocalInput(startVal));
    if (endVal) qs.set("end", fromLocalInput(endVal));
    if (clientName) qs.set("client", clientName);
    if (teamId) qs.set("team", teamId);
    if (materialId) qs.set("material", materialId);
    if (sqm) qs.set("sqm", sqm);
    qs.set("status", status);
    return qs.toString();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!materialId) {
      setError(t("form.errPickMaterial"));
      return;
    }
    setSaving(true);
    setError(null);
    const payload: OrderRequest = {
      clientName,
      startAt: fromLocalInput(startVal),
      finishOverridden: !!endVal,
      finishAt: endVal ? fromLocalInput(endVal) : null,
      teamId: teamId ? Number(teamId) : null,
      materialId: Number(materialId),
      squareMeters: Number(sqm) || 0,
      graniteEnabled: false,
      status,
      fixtures: [],
      addons: [],
    };
    try {
      await apiFetch("/orders", { method: "POST", body: payload });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 400 ? t("form.errCheck") : t("form.errSave"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className={"ms-scrim" + (open ? " open" : "")} onClick={onClose} />
      <div className={"ms-drawer" + (open ? " open" : "")} role="dialog" aria-hidden={!open}>
        <div className="ms-drawer-head">
          <span className="title">{t("quick.title")}</span>
          <button type="button" className="ms-x" onClick={onClose} aria-label={t("common.close")}>×</button>
        </div>

        <form id="quick-create" onSubmit={onSubmit} className="ms-drawer-body">
          <div className="ms-field">
            <span className="ms-label">{t("form.clientName")}</span>
            <input className="ms-input" required value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </div>
          <div className="ms-form-grid">
            <div className="ms-field" style={{ marginBottom: 0 }}>
              <span className="ms-label">{t("form.start")}</span>
              <input type="datetime-local" className="ms-input" required value={startVal} onChange={(e) => setStartVal(e.target.value)} />
            </div>
            <div className="ms-field" style={{ marginBottom: 0 }}>
              <span className="ms-label">{t("form.finish")}</span>
              <input type="datetime-local" className="ms-input" value={endVal} onChange={(e) => setEndVal(e.target.value)} />
            </div>
          </div>
          <div className="ms-field">
            <span className="ms-label">{t("form.team")}</span>
            <select className="ms-select" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">{t("form.unassigned")}</option>
              {teams.map((tm) => (
                <option key={tm.id} value={tm.id}>{tm.name}</option>
              ))}
            </select>
          </div>
          <div className="ms-form-grid">
            <div className="ms-field" style={{ marginBottom: 0 }}>
              <span className="ms-label">{t("form.material")}</span>
              <select className="ms-select" required value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
                <option value="">{t("common.select")}</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="ms-field" style={{ marginBottom: 0 }}>
              <span className="ms-label">{t("form.area")}</span>
              <input type="number" step="0.01" min="0" className="ms-input" value={sqm} onChange={(e) => setSqm(e.target.value)} />
            </div>
          </div>
          <div className="ms-field" style={{ marginBottom: 0 }}>
            <span className="ms-label">{t("orders.status")}</span>
            <div className="ms-seg" style={{ flexWrap: "wrap" }}>
              {ORDER_STATUSES.map((s) => (
                <button type="button" key={s} className={status === s ? "on" : ""} onClick={() => setStatus(s)}>
                  {t(`status.${s}`)}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="ms-banner error" style={{ marginTop: 14 }}>{error}</p>}
        </form>

        <div className="ms-drawer-foot">
          <button type="submit" form="quick-create" className="ms-btn primary" disabled={saving}>
            {saving ? t("common.saving") : t("form.createOrder")}
          </button>
          <button type="button" className="ms-btn" onClick={() => router.push(`/orders/new?${params()}`)}>
            {t("quick.moreDetails")}
          </button>
        </div>
      </div>
    </>
  );
}
