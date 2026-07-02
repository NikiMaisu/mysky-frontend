"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import {
  ORDER_STATUSES,
  formatGel,
  formatMinutes,
  formatDateTime,
  fromLocalInput,
  toLocalInput,
} from "@/lib/orders";
import { computeFinish, resolveSchedule, workdayMinutes } from "@/lib/schedule";
import { useLang } from "@/lib/i18n";
import type { Addon, Fixture, Material, Order, OrderRequest, OrderStatus, Team, TimeUnit, WorkSchedule } from "@/types";

interface LineState {
  key: string;
  refId: string;
  quantity: string;
}

let keySeq = 0;
const newKey = () => `k${keySeq++}`;

function toLineState(refId: number | null, quantity: number): LineState {
  return { key: newKey(), refId: refId == null ? "" : String(refId), quantity: String(quantity) };
}

export function OrderForm({
  initial,
  defaultStart,
  defaultEnd,
  defaultClient,
  defaultTeamId,
  defaultMaterialId,
  defaultSquareMeters,
  defaultStatus,
}: {
  initial?: Order;
  defaultStart?: string;
  defaultEnd?: string;
  defaultClient?: string;
  defaultTeamId?: string;
  defaultMaterialId?: string;
  defaultSquareMeters?: string;
  defaultStatus?: OrderStatus;
}) {
  const router = useRouter();
  const { t } = useLang();
  const editing = !!initial;

  const [materials, setMaterials] = useState<Material[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [workSchedule, setWorkSchedule] = useState<WorkSchedule | null>(null);
  const [refLoading, setRefLoading] = useState(true);

  const [orderNumber, setOrderNumber] = useState(initial ? String(initial.orderNumber) : "");
  const [clientName, setClientName] = useState(initial?.clientName ?? defaultClient ?? "");
  const [clientPhone, setClientPhone] = useState(initial?.clientPhone ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [startAt, setStartAt] = useState(
    toLocalInput(initial?.startAt) || toLocalInput(defaultStart) || toLocalInput(new Date().toISOString()),
  );
  const [teamId, setTeamId] = useState(initial?.teamId ? String(initial.teamId) : defaultTeamId ?? "");
  const [materialLines, setMaterialLines] = useState<LineState[]>(() => {
    if (initial) return initial.materials.map((m) => toLineState(m.materialId, Number(m.squareMeters)));
    if (defaultMaterialId) {
      return [{ key: newKey(), refId: defaultMaterialId, quantity: defaultSquareMeters ?? "" }];
    }
    return [];
  });
  const [flatValue, setFlatValue] = useState(initial ? String(initial.flatAddedMinutes) : "0");
  const [flatUnit, setFlatUnit] = useState<TimeUnit>("MINUTES");
  const [customEnd, setCustomEnd] = useState(initial?.finishOverridden ?? (!initial && !!defaultEnd));
  const [endValue, setEndValue] = useState(
    initial?.finishOverridden ? toLocalInput(initial.finishAt) : !initial && defaultEnd ? toLocalInput(defaultEnd) : "",
  );
  const [status, setStatus] = useState<OrderStatus>(initial?.status ?? defaultStatus ?? "QUOTED");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [fixtureLines, setFixtureLines] = useState<LineState[]>(
    initial?.fixtures.map((f) => toLineState(f.fixtureId, f.quantity)) ?? [],
  );
  const [addonLines, setAddonLines] = useState<LineState[]>(
    initial?.addons.map((a) => toLineState(a.addonId, a.quantity)) ?? [],
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [m, f, a, t, ws] = await Promise.all([
          apiFetch<Material[]>("/materials"),
          apiFetch<Fixture[]>("/fixtures"),
          apiFetch<Addon[]>("/addons"),
          apiFetch<Team[]>("/teams"),
          apiFetch<WorkSchedule>("/work-schedule"),
        ]);
        setMaterials(m);
        setFixtures(f);
        setAddons(a);
        setTeams(t);
        setWorkSchedule(ws);
      } catch {
        setError("Failed to load reference data.");
      } finally {
        setRefLoading(false);
      }
    })();
  }, []);

  // schedule resolution: team override (if assigned) else global
  const schedule = useMemo(() => {
    if (!workSchedule) return null;
    const team = teams.find((t) => t.id === Number(teamId)) ?? null;
    return resolveSchedule(team, workSchedule);
  }, [teams, teamId, workSchedule]);

  const workdayMin = schedule ? workdayMinutes(schedule) : 480;

  const flatMinutes = useMemo(() => {
    const v = Number(flatValue) || 0;
    return flatUnit === "MINUTES" ? v : flatUnit === "HOURS" ? v * 60 : v * workdayMin;
  }, [flatValue, flatUnit, workdayMin]);

  const calc = useMemo(() => {
    let minutes = 0;
    let cost = 0;
    const rows: { label: string; cost: number }[] = [];

    for (const l of materialLines) {
      const mat = materials.find((m) => m.id === Number(l.refId));
      if (!mat) continue;
      const sqm = Number(l.quantity) || 0;
      const mc = mat.pricePerM2 * sqm;
      minutes += mat.timePerM2Minutes * sqm;
      cost += mc;
      rows.push({ label: `${mat.name} · ${sqm} m²`, cost: mc });
    }
    for (const l of fixtureLines) {
      const fx = fixtures.find((f) => f.id === Number(l.refId));
      if (!fx) continue;
      const q = Number(l.quantity) || 0;
      const lc = fx.cost * q;
      minutes += fx.installTimeMinutes * q;
      cost += lc;
      rows.push({ label: `${fx.name} ×${q}`, cost: lc });
    }
    for (const l of addonLines) {
      const ad = addons.find((a) => a.id === Number(l.refId));
      if (!ad) continue;
      const q = Number(l.quantity) || 0;
      const lc = ad.cost * q;
      minutes += ad.installTimeMinutes * q;
      cost += lc;
      rows.push({ label: `${ad.name} ×${q}`, cost: lc });
    }
    minutes += flatMinutes;

    return { minutes: Math.round(minutes), cost, rows };
  }, [materialLines, materials, fixtureLines, fixtures, addonLines, addons, flatMinutes]);

  const recommendedFinish = useMemo(
    () => (schedule && startAt ? computeFinish(startAt, calc.minutes, schedule) : null),
    [schedule, startAt, calc.minutes],
  );

  function setLine(setter: typeof setFixtureLines, key: string, patch: Partial<LineState>) {
    setter((lines) => lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function toggleCustomEnd(on: boolean) {
    setCustomEnd(on);
    if (on && !endValue && recommendedFinish) setEndValue(toLocalInput(recommendedFinish.toISOString()));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (customEnd && !endValue) {
      setError(t("form.errCustomEnd"));
      return;
    }
    setSaving(true);

    const payload: OrderRequest = {
      orderNumber: orderNumber ? Number(orderNumber) : null,
      clientName,
      clientPhone: clientPhone || undefined,
      address: address || undefined,
      startAt: fromLocalInput(startAt),
      finishOverridden: customEnd,
      finishAt: customEnd ? fromLocalInput(endValue) : null,
      teamId: teamId ? Number(teamId) : null,
      materials: materialLines
        .filter((l) => l.refId)
        .map((l) => ({ materialId: Number(l.refId), squareMeters: Number(l.quantity) || 0 })),
      graniteEnabled: false,
      perimeter: null,
      flatAddedValue: Number(flatValue) || 0,
      flatAddedUnit: flatUnit,
      status,
      notes: notes || undefined,
      fixtures: fixtureLines.filter((l) => l.refId).map((l) => ({ fixtureId: Number(l.refId), quantity: Number(l.quantity) || 0 })),
      addons: addonLines.filter((l) => l.refId).map((l) => ({ addonId: Number(l.refId), quantity: Number(l.quantity) || 0 })),
    };

    try {
      if (editing) {
        await apiFetch(`/orders/${initial!.id}`, { method: "PUT", body: payload });
      } else {
        await apiFetch("/orders", { method: "POST", body: payload });
      }
      router.push("/orders");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 400 ? t("form.errCheck") : t("form.errSave"));
    } finally {
      setSaving(false);
    }
  }

  async function onCancelOrder() {
    if (!initial) return;
    if (!confirm(t("form.confirmCancel", { n: initial.orderNumber }))) return;
    try {
      await apiFetch(`/orders/${initial.id}`, { method: "DELETE" });
      router.push("/orders");
      router.refresh();
    } catch {
      setError(t("form.errCancel"));
    }
  }

  if (refLoading) return <div className="ms-center">{t("common.loading")}</div>;

  const shownFinish = customEnd && endValue ? new Date(endValue) : recommendedFinish;

  return (
    <form onSubmit={onSubmit}>
      <div className="ms-ph">
        <div>
          <div className="ms-ph-title">{editing ? t("form.orderNum", { n: initial!.orderNumber }) : t("nav.newOrder")}</div>
          <p className="ms-ph-sub">{editing ? t("form.editSub") : t("form.newSub")}</p>
        </div>
      </div>

      {error && <p className="ms-banner error" style={{ marginBottom: 16 }}>{error}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 24, alignItems: "start" }} className="ms-order-grid">
        <div>
          <div className="ms-card ms-form-panel">
            <h2>{t("form.client")}</h2>
            <div className="ms-form-grid">
              <div className="ms-field" style={{ marginBottom: 0 }}>
                <span className="ms-label">{t("form.clientName")}</span>
                <input className="ms-input" required value={clientName} onChange={(e) => setClientName(e.target.value)} />
              </div>
              <div className="ms-field" style={{ marginBottom: 0 }}>
                <span className="ms-label">{t("form.orderNumber")}</span>
                <input
                  type="number"
                  className="ms-input"
                  placeholder={t("form.orderNumberAuto")}
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                />
              </div>
            </div>
            <div className="ms-form-grid">
              <div className="ms-field" style={{ marginBottom: 0 }}>
                <span className="ms-label">{t("form.phone")}</span>
                <input className="ms-input" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
              </div>
              <div className="ms-field" style={{ marginBottom: 0 }}>
                <span className="ms-label">{t("form.address")}</span>
                <input className="ms-input" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="ms-card ms-form-panel">
            <h2>{t("form.scheduling")}</h2>
            <div className="ms-form-grid">
              <div className="ms-field" style={{ marginBottom: 0 }}>
                <span className="ms-label">{t("form.start")}</span>
                <input type="datetime-local" className="ms-input" required value={startAt} onChange={(e) => setStartAt(e.target.value)} />
              </div>
              <div className="ms-field" style={{ marginBottom: 0 }}>
                <span className="ms-label">{t("form.team")}</span>
                <select className="ms-select" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                  <option value="">{t("form.unassigned")}</option>
                  {teams.map((tm) => (
                    <option key={tm.id} value={tm.id}>{tm.name}{tm.schedule ? t("form.customHours") : ""}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="ms-field" style={{ marginTop: 14, marginBottom: 0 }}>
              <span className="ms-label">{t("orders.status")}</span>
              <div className="ms-seg" style={{ flexWrap: "wrap" }}>
                {ORDER_STATUSES.map((s) => (
                  <button type="button" key={s} className={status === s ? "on" : ""} onClick={() => setStatus(s)}>
                    {t(`status.${s}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <LineEditor
            title={t("form.materialArea")}
            lines={materialLines}
            options={materials.map((m) => ({ id: m.id, label: m.name }))}
            onChange={(key, patch) => setLine(setMaterialLines, key, patch)}
            onAdd={() => setMaterialLines((l) => [...l, { key: newKey(), refId: "", quantity: "" }])}
            onRemove={(key) => setMaterialLines((l) => l.filter((x) => x.key !== key))}
            quantityPlaceholder={t("form.area")}
          />

          <LineEditor
            title={t("form.fixtures")}
            lines={fixtureLines}
            options={fixtures.map((f) => ({ id: f.id, label: f.name }))}
            onChange={(key, patch) => setLine(setFixtureLines, key, patch)}
            onAdd={() => setFixtureLines((l) => [...l, { key: newKey(), refId: "", quantity: "1" }])}
            onRemove={(key) => setFixtureLines((l) => l.filter((x) => x.key !== key))}
          />

          <LineEditor
            title={t("form.addons")}
            lines={addonLines}
            options={addons.map((a) => ({ id: a.id, label: a.name }))}
            onChange={(key, patch) => setLine(setAddonLines, key, patch)}
            onAdd={() => setAddonLines((l) => [...l, { key: newKey(), refId: "", quantity: "1" }])}
            onRemove={(key) => setAddonLines((l) => l.filter((x) => x.key !== key))}
          />

          <div className="ms-card ms-form-panel">
            <h2>{t("form.extra")}</h2>
            <div className="ms-field">
              <span className="ms-label">{t("form.flatAdded")}</span>
              <div className="ms-line-row" style={{ gridTemplateColumns: "1fr 130px", maxWidth: 320 }}>
                <input type="number" step="0.5" min="0" className="ms-input" value={flatValue} onChange={(e) => setFlatValue(e.target.value)} />
                <select className="ms-select" value={flatUnit} onChange={(e) => setFlatUnit(e.target.value as TimeUnit)}>
                  <option value="MINUTES">{t("form.unit.minutes")}</option>
                  <option value="HOURS">{t("form.unit.hours")}</option>
                  <option value="DAYS">{t("form.unit.days")}</option>
                </select>
              </div>
              {flatUnit === "DAYS" && (
                <span className="muted" style={{ fontSize: 11, marginTop: 4 }}>{t("form.dayHint", { min: Math.round(workdayMin) })}</span>
              )}
            </div>
            <div className="ms-field" style={{ marginBottom: 0 }}>
              <span className="ms-label">{t("form.notes")}</span>
              <textarea className="ms-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        </div>

        <aside style={{ position: "sticky", top: 28 }}>
          <div className="ms-calc">
            {calc.rows.map((r, i) => (
              <div className="ms-calc-row" key={i}>
                <span className="lbl">{r.label}</span>
                <span>{formatGel(r.cost)}</span>
              </div>
            ))}
            {calc.rows.length === 0 && (
              <div className="ms-calc-row"><span className="lbl">{t("form.pickMaterialHint")}</span><span /></div>
            )}
            <div className="ms-calc-total">
              <div>
                <div className="lbl">{t("form.totalCost")}</div>
                <div className="big">{formatGel(calc.cost)}</div>
              </div>
            </div>
            <div className="ms-calc-row" style={{ marginTop: 6 }}>
              <span className="lbl">{t("form.estTime")}</span>
              <span>{formatMinutes(calc.minutes)}</span>
            </div>
            {recommendedFinish && (
              <div className="ms-calc-row">
                <span className="lbl">{t("form.recommendedFinish")}</span>
                <span>{formatDateTime(recommendedFinish.toISOString())}</span>
              </div>
            )}

            <label className="ms-checkline" style={{ marginTop: 12 }}>
              <input type="checkbox" checked={customEnd} onChange={(e) => toggleCustomEnd(e.target.checked)} />
              {t("form.customEnd")}
            </label>
            {customEnd && (
              <input
                type="datetime-local"
                className="ms-input"
                style={{ marginTop: 8 }}
                value={endValue}
                onChange={(e) => setEndValue(e.target.value)}
              />
            )}
            {shownFinish && (
              <div className="ms-calc-row" style={{ marginTop: 8 }}>
                <span className="lbl">{customEnd ? t("form.endCustom") : t("form.finish")}</span>
                <span>{formatDateTime(shownFinish.toISOString())}</span>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
            <button type="submit" className="ms-btn primary" disabled={saving} style={{ justifyContent: "center" }}>
              {saving ? t("common.saving") : editing ? t("form.saveChanges") : t("form.createOrder")}
            </button>
            {editing && status !== "CANCELLED" && (
              <button type="button" className="ms-btn danger" onClick={onCancelOrder} style={{ justifyContent: "center" }}>
                {t("form.cancelOrder")}
              </button>
            )}
          </div>
        </aside>
      </div>
    </form>
  );
}

function LineEditor({
  title,
  lines,
  options,
  onChange,
  onAdd,
  onRemove,
  quantityPlaceholder,
}: {
  title: string;
  lines: LineState[];
  options: { id: number; label: string }[];
  onChange: (key: string, patch: Partial<LineState>) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
  quantityPlaceholder?: string;
}) {
  const { t } = useLang();
  return (
    <div className="ms-card ms-form-panel">
      <h2>{title}</h2>
      <div className="ms-extras">
        {lines.length === 0 && <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>{t("common.none")}</p>}
        {lines.map((l) => (
          <div className="ms-line-row" key={l.key}>
            <select className="ms-select" value={l.refId} onChange={(e) => onChange(l.key, { refId: e.target.value })}>
              <option value="">{t("common.select")}</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            <input
              type="number"
              step="0.01"
              min="0"
              className="ms-input"
              value={l.quantity}
              onChange={(e) => onChange(l.key, { quantity: e.target.value })}
              placeholder={quantityPlaceholder ?? t("form.qty")}
            />
            <button type="button" className="ms-line-remove" onClick={() => onRemove(l.key)} aria-label="Remove">×</button>
          </div>
        ))}
      </div>
      <button type="button" className="ms-extra-add" onClick={onAdd}>{t("common.add")}</button>
    </div>
  );
}
