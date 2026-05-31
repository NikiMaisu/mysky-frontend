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
import type { Addon, Fixture, GraniteConfig, Material, Order, OrderRequest, OrderStatus, Team } from "@/types";

interface LineState {
  key: string;
  refId: string; // fixtureId or addonId, "" when unselected
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

  // reference data
  const [materials, setMaterials] = useState<Material[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [granite, setGranite] = useState<GraniteConfig | null>(null);
  const [refLoading, setRefLoading] = useState(true);

  // form state
  const [clientName, setClientName] = useState(initial?.clientName ?? "");
  const [clientPhone, setClientPhone] = useState(initial?.clientPhone ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [startAt, setStartAt] = useState(toLocalInput(initial?.startAt) || toLocalInput(new Date().toISOString()));
  const [teamId, setTeamId] = useState(initial?.teamId ? String(initial.teamId) : "");
  const [materialId, setMaterialId] = useState(initial?.materialId ? String(initial.materialId) : "");
  const [squareMeters, setSquareMeters] = useState(initial ? String(initial.squareMeters) : "");
  const [graniteEnabled, setGraniteEnabled] = useState(initial?.graniteEnabled ?? false);
  const [perimeter, setPerimeter] = useState(initial?.perimeter != null ? String(initial.perimeter) : "");
  const [flatAdded, setFlatAdded] = useState(initial ? String(initial.flatAddedMinutes) : "0");
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
        const [m, f, a, t, g] = await Promise.all([
          apiFetch<Material[]>("/materials"),
          apiFetch<Fixture[]>("/fixtures"),
          apiFetch<Addon[]>("/addons"),
          apiFetch<Team[]>("/teams"),
          apiFetch<GraniteConfig>("/granite"),
        ]);
        setMaterials(m);
        setFixtures(f);
        setAddons(a);
        setTeams(t);
        setGranite(g);
      } catch {
        setError("Failed to load reference data.");
      } finally {
        setRefLoading(false);
      }
    })();
  }, []);

  // ---- live calculation (mirrors OrderCalculationService) ----
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
    minutes += Number(flatAdded) || 0;

    return { minutes: Math.round(minutes), cost, rows };
  }, [squareMeters, materialId, materials, graniteEnabled, granite, perimeter, fixtureLines, fixtures, addonLines, addons, flatAdded]);

  const finishPreview = useMemo(() => {
    if (!startAt) return null;
    const d = new Date(startAt);
    d.setMinutes(d.getMinutes() + calc.minutes);
    return d.toISOString();
  }, [startAt, calc.minutes]);

  function setLine(setter: typeof setFixtureLines, key: string, patch: Partial<LineState>) {
    setter((lines) => lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
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
    setSaving(true);

    const payload: OrderRequest = {
      clientName,
      clientPhone: clientPhone || undefined,
      address: address || undefined,
      startAt: fromLocalInput(startAt),
      teamId: teamId ? Number(teamId) : null,
      materialId: Number(materialId),
      squareMeters: Number(squareMeters) || 0,
      graniteEnabled,
      perimeter: graniteEnabled ? Number(perimeter) || 0 : null,
      flatAddedMinutes: Number(flatAdded) || 0,
      status,
      notes: notes || undefined,
      fixtures: fixtureLines
        .filter((l) => l.refId)
        .map((l) => ({ fixtureId: Number(l.refId), quantity: Number(l.quantity) || 0 })),
      addons: addonLines
        .filter((l) => l.refId)
        .map((l) => ({ addonId: Number(l.refId), quantity: Number(l.quantity) || 0 })),
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
      setError(
        err instanceof ApiError && err.status === 400
          ? "Please check the highlighted fields."
          : "Failed to save the order.",
      );
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
          {/* Client */}
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

          {/* Scheduling */}
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
                    <option key={t.id} value={t.id}>{t.name}</option>
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

          {/* Material & area */}
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

          {/* Fixtures */}
          <LineEditor
            title="Lighting fixtures"
            lines={fixtureLines}
            options={fixtures.map((f) => ({ id: f.id, label: f.name }))}
            onChange={(key, patch) => setLine(setFixtureLines, key, patch)}
            onAdd={() => setFixtureLines((l) => [...l, { key: newKey(), refId: "", quantity: "1" }])}
            onRemove={(key) => setFixtureLines((l) => l.filter((x) => x.key !== key))}
          />

          {/* Add-ons */}
          <LineEditor
            title="Add-ons"
            lines={addonLines}
            options={addons.map((a) => ({ id: a.id, label: a.name }))}
            onChange={(key, patch) => setLine(setAddonLines, key, patch)}
            onAdd={() => setAddonLines((l) => [...l, { key: newKey(), refId: "", quantity: "1" }])}
            onRemove={(key) => setAddonLines((l) => l.filter((x) => x.key !== key))}
          />

          {/* Extras */}
          <div className="ms-card ms-form-panel">
            <h2>Extra time &amp; notes</h2>
            <div className="ms-field" style={{ maxWidth: 220 }}>
              <span className="ms-label">Flat added time (min)</span>
              <input type="number" step="1" min="0" className="ms-input" value={flatAdded} onChange={(e) => setFlatAdded(e.target.value)} />
            </div>
            <div className="ms-field" style={{ marginBottom: 0 }}>
              <span className="ms-label">Notes</span>
              <textarea className="ms-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Summary */}
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
              <span className="lbl">Est. time</span>
              <span>{formatMinutes(calc.minutes)}</span>
            </div>
            {finishPreview && (
              <div className="ms-calc-row">
                <span className="lbl">Finish</span>
                <span>{formatDateTime(finishPreview)}</span>
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
            <input
              type="number"
              step="0.01"
              min="0"
              className="ms-input"
              value={l.quantity}
              onChange={(e) => onChange(l.key, { quantity: e.target.value })}
              placeholder="Qty"
            />
            <button type="button" className="ms-line-remove" onClick={() => onRemove(l.key)} aria-label="Remove">×</button>
          </div>
        ))}
      </div>
      <button type="button" className="ms-extra-add" onClick={onAdd}>+ Add</button>
    </div>
  );
}
