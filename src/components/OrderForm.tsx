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
  statusLabel,
  toLocalInput,
} from "@/lib/orders";
import { computeFinish, resolveSchedule, workdayMinutes } from "@/lib/schedule";
import type { Addon, Fixture, GraniteConfig, Material, Order, OrderRequest, OrderStatus, Team, TimeUnit, WorkSchedule } from "@/types";

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

export function OrderForm({ initial }: { initial?: Order }) {
  const router = useRouter();
  const editing = !!initial;

  const [materials, setMaterials] = useState<Material[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [granite, setGranite] = useState<GraniteConfig | null>(null);
  const [workSchedule, setWorkSchedule] = useState<WorkSchedule | null>(null);
  const [refLoading, setRefLoading] = useState(true);

  const [clientName, setClientName] = useState(initial?.clientName ?? "");
  const [clientPhone, setClientPhone] = useState(initial?.clientPhone ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [startAt, setStartAt] = useState(toLocalInput(initial?.startAt) || toLocalInput(new Date().toISOString()));
  const [teamId, setTeamId] = useState(initial?.teamId ? String(initial.teamId) : "");
  const [materialId, setMaterialId] = useState(initial?.materialId ? String(initial.materialId) : "");
  const [squareMeters, setSquareMeters] = useState(initial ? String(initial.squareMeters) : "");
  const [graniteEnabled, setGraniteEnabled] = useState(initial?.graniteEnabled ?? false);
  const [perimeter, setPerimeter] = useState(initial?.perimeter != null ? String(initial.perimeter) : "");
  const [flatValue, setFlatValue] = useState(initial ? String(initial.flatAddedMinutes) : "0");
  const [flatUnit, setFlatUnit] = useState<TimeUnit>("MINUTES");
  const [customEnd, setCustomEnd] = useState(initial?.finishOverridden ?? false);
  const [endValue, setEndValue] = useState(initial?.finishOverridden ? toLocalInput(initial.finishAt) : "");
  const [status, setStatus] = useState<OrderStatus>(initial?.status ?? "QUOTED");
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
        const [m, f, a, t, g, ws] = await Promise.all([
          apiFetch<Material[]>("/materials"),
          apiFetch<Fixture[]>("/fixtures"),
          apiFetch<Addon[]>("/addons"),
          apiFetch<Team[]>("/teams"),
          apiFetch<GraniteConfig>("/granite"),
          apiFetch<WorkSchedule>("/work-schedule"),
        ]);
        setMaterials(m);
        setFixtures(f);
        setAddons(a);
        setTeams(t);
        setGranite(g);
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
    const sqm = Number(squareMeters) || 0;
    const material = materials.find((m) => m.id === Number(materialId));
    let minutes = 0;
    let cost = 0;
    const rows: { label: string; cost: number }[] = [];

    if (material) {
      const mc = material.pricePerM2 * sqm;
      minutes += material.timePerM2Minutes * sqm;
      cost += mc;
      rows.push({ label: `${material.name} · ${sqm} m²`, cost: mc });
    }
    if (graniteEnabled && granite) {
      const p = Number(perimeter) || 0;
      const gc = granite.pricePerMeter * p;
      minutes += granite.timePerMeterMinutes * p;
      cost += gc;
      rows.push({ label: `Granite · ${p} m`, cost: gc });
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
  }, [squareMeters, materialId, materials, graniteEnabled, granite, perimeter, fixtureLines, fixtures, addonLines, addons, flatMinutes]);

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
    if (!materialId) {
      setError("Pick a material.");
      return;
    }
    if (graniteEnabled && !perimeter) {
      setError("Perimeter is required when granite is enabled.");
      return;
    }
    if (customEnd && !endValue) {
      setError("Set a custom end time or turn the override off.");
      return;
    }
    setSaving(true);

    const payload: OrderRequest = {
      clientName,
      clientPhone: clientPhone || undefined,
      address: address || undefined,
      startAt: fromLocalInput(startAt),
      finishOverridden: customEnd,
      finishAt: customEnd ? fromLocalInput(endValue) : null,
      teamId: teamId ? Number(teamId) : null,
      materialId: Number(materialId),
      squareMeters: Number(squareMeters) || 0,
      graniteEnabled,
      perimeter: graniteEnabled ? Number(perimeter) || 0 : null,
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
      setError(err instanceof ApiError && err.status === 400 ? "Please check the highlighted fields." : "Failed to save the order.");
    } finally {
      setSaving(false);
    }
  }

  async function onCancelOrder() {
    if (!initial) return;
    if (!confirm(`Cancel order #${initial.orderNumber}?`)) return;
    try {
      await apiFetch(`/orders/${initial.id}`, { method: "DELETE" });
      router.push("/orders");
      router.refresh();
    } catch {
      setError("Failed to cancel the order.");
    }
  }

  if (refLoading) return <div className="ms-center">Loading…</div>;

  const shownFinish = customEnd && endValue ? new Date(endValue) : recommendedFinish;

  return (
    <form onSubmit={onSubmit}>
      <div className="ms-ph">
        <div>
          <div className="ms-ph-title">{editing ? `Order #${initial!.orderNumber}` : "New order"}</div>
          <p className="ms-ph-sub">{editing ? "Edit details — totals recalculate on save." : "Fill in the job; the summary updates live."}</p>
        </div>
      </div>

      {error && <p className="ms-banner error" style={{ marginBottom: 16 }}>{error}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 24, alignItems: "start" }} className="ms-order-grid">
        <div>
          <div className="ms-card ms-form-panel">
            <h2>Client</h2>
            <div className="ms-field">
              <span className="ms-label">Client name</span>
              <input className="ms-input" required value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div className="ms-form-grid">
              <div className="ms-field" style={{ marginBottom: 0 }}>
                <span className="ms-label">Phone</span>
                <input className="ms-input" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
              </div>
              <div className="ms-field" style={{ marginBottom: 0 }}>
                <span className="ms-label">Address</span>
                <input className="ms-input" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="ms-card ms-form-panel">
            <h2>Scheduling</h2>
            <div className="ms-form-grid">
              <div className="ms-field" style={{ marginBottom: 0 }}>
                <span className="ms-label">Start</span>
                <input type="datetime-local" className="ms-input" required value={startAt} onChange={(e) => setStartAt(e.target.value)} />
              </div>
              <div className="ms-field" style={{ marginBottom: 0 }}>
                <span className="ms-label">Team / brigade</span>
                <select className="ms-select" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                  <option value="">Unassigned</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}{t.schedule ? " (custom hours)" : ""}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="ms-field" style={{ marginTop: 14, marginBottom: 0 }}>
              <span className="ms-label">Status</span>
              <div className="ms-seg" style={{ flexWrap: "wrap" }}>
                {ORDER_STATUSES.map((s) => (
                  <button type="button" key={s} className={status === s ? "on" : ""} onClick={() => setStatus(s)}>
                    {statusLabel(s)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="ms-card ms-form-panel">
            <h2>Material &amp; area</h2>
            <div className="ms-form-grid">
              <div className="ms-field" style={{ marginBottom: 0 }}>
                <span className="ms-label">Material</span>
                <select className="ms-select" required value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
                  <option value="">Select…</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="ms-field" style={{ marginBottom: 0 }}>
                <span className="ms-label">Area (m²)</span>
                <input type="number" step="0.01" min="0" className="ms-input" required value={squareMeters} onChange={(e) => setSquareMeters(e.target.value)} />
              </div>
            </div>
            <label className="ms-checkline" style={{ marginTop: 14 }}>
              <input type="checkbox" checked={graniteEnabled} onChange={(e) => setGraniteEnabled(e.target.checked)} />
              Granite perimeter
            </label>
            {graniteEnabled && (
              <div className="ms-field" style={{ marginTop: 10, marginBottom: 0, maxWidth: 220 }}>
                <span className="ms-label">Perimeter (m)</span>
                <input type="number" step="0.01" min="0" className="ms-input" value={perimeter} onChange={(e) => setPerimeter(e.target.value)} />
              </div>
            )}
          </div>

          <LineEditor
            title="Lighting fixtures"
            lines={fixtureLines}
            options={fixtures.map((f) => ({ id: f.id, label: f.name }))}
            onChange={(key, patch) => setLine(setFixtureLines, key, patch)}
            onAdd={() => setFixtureLines((l) => [...l, { key: newKey(), refId: "", quantity: "1" }])}
            onRemove={(key) => setFixtureLines((l) => l.filter((x) => x.key !== key))}
          />

          <LineEditor
            title="Add-ons"
            lines={addonLines}
            options={addons.map((a) => ({ id: a.id, label: a.name }))}
            onChange={(key, patch) => setLine(setAddonLines, key, patch)}
            onAdd={() => setAddonLines((l) => [...l, { key: newKey(), refId: "", quantity: "1" }])}
            onRemove={(key) => setAddonLines((l) => l.filter((x) => x.key !== key))}
          />

          <div className="ms-card ms-form-panel">
            <h2>Extra time &amp; notes</h2>
            <div className="ms-field">
              <span className="ms-label">Flat added time</span>
              <div className="ms-line-row" style={{ gridTemplateColumns: "1fr 130px", maxWidth: 320 }}>
                <input type="number" step="0.5" min="0" className="ms-input" value={flatValue} onChange={(e) => setFlatValue(e.target.value)} />
                <select className="ms-select" value={flatUnit} onChange={(e) => setFlatUnit(e.target.value as TimeUnit)}>
                  <option value="MINUTES">minutes</option>
                  <option value="HOURS">hours</option>
                  <option value="DAYS">days</option>
                </select>
              </div>
              {flatUnit === "DAYS" && (
                <span className="muted" style={{ fontSize: 11, marginTop: 4 }}>1 day = {Math.round(workdayMin)} min (this schedule&apos;s workday)</span>
              )}
            </div>
            <div className="ms-field" style={{ marginBottom: 0 }}>
              <span className="ms-label">Notes</span>
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
              <div className="ms-calc-row"><span className="lbl">Pick a material to start</span><span /></div>
            )}
            <div className="ms-calc-total">
              <div>
                <div className="lbl">Total cost</div>
                <div className="big">{formatGel(calc.cost)}</div>
              </div>
            </div>
            <div className="ms-calc-row" style={{ marginTop: 6 }}>
              <span className="lbl">Est. work time</span>
              <span>{formatMinutes(calc.minutes)}</span>
            </div>
            {recommendedFinish && (
              <div className="ms-calc-row">
                <span className="lbl">Recommended finish</span>
                <span>{formatDateTime(recommendedFinish.toISOString())}</span>
              </div>
            )}

            <label className="ms-checkline" style={{ marginTop: 12 }}>
              <input type="checkbox" checked={customEnd} onChange={(e) => toggleCustomEnd(e.target.checked)} />
              Set a custom end time
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
                <span className="lbl">{customEnd ? "End (custom)" : "Finish"}</span>
                <span>{formatDateTime(shownFinish.toISOString())}</span>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
            <button type="submit" className="ms-btn primary" disabled={saving} style={{ justifyContent: "center" }}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create order"}
            </button>
            {editing && status !== "CANCELLED" && (
              <button type="button" className="ms-btn danger" onClick={onCancelOrder} style={{ justifyContent: "center" }}>
                Cancel order
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
}: {
  title: string;
  lines: LineState[];
  options: { id: number; label: string }[];
  onChange: (key: string, patch: Partial<LineState>) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
}) {
  return (
    <div className="ms-card ms-form-panel">
      <h2>{title}</h2>
      <div className="ms-extras">
        {lines.length === 0 && <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>None added.</p>}
        {lines.map((l) => (
          <div className="ms-line-row" key={l.key}>
            <select className="ms-select" value={l.refId} onChange={(e) => onChange(l.key, { refId: e.target.value })}>
              <option value="">Select…</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            <input type="number" step="0.01" min="0" className="ms-input" value={l.quantity} onChange={(e) => onChange(l.key, { quantity: e.target.value })} placeholder="Qty" />
            <button type="button" className="ms-line-remove" onClick={() => onRemove(l.key)} aria-label="Remove">×</button>
          </div>
        ))}
      </div>
      <button type="button" className="ms-extra-add" onClick={onAdd}>+ Add</button>
    </div>
  );
}
