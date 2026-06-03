"use client";

import { useCallback, useEffect, useState } from "react";
import { ScheduleFields } from "@/components/ScheduleFields";
import { apiFetch, ApiError } from "@/lib/api";
import type { Team, Worker } from "@/types";

const DEFAULT_DAYS = [true, true, true, true, true, true, false];

type Mode = { kind: "closed" } | { kind: "new" } | { kind: "edit"; id: number };

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>({ kind: "closed" });
  const [name, setName] = useState("");
  const [memberIds, setMemberIds] = useState<Set<number>>(new Set());
  const [hasOverride, setHasOverride] = useState(false);
  const [days, setDays] = useState<boolean[]>(DEFAULT_DAYS);
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("18:00");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, w] = await Promise.all([
        apiFetch<Team[]>("/teams"),
        apiFetch<Worker[]>("/workers"),
      ]);
      setTeams(t);
      setWorkers(w);
    } catch (e) {
      setError(e instanceof ApiError ? `Failed to load (${e.status})` : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function resetSchedule(team?: Team) {
    if (team?.schedule) {
      setHasOverride(true);
      setDays(team.schedule.days);
      setStart(team.schedule.start.slice(0, 5));
      setEnd(team.schedule.end.slice(0, 5));
    } else {
      setHasOverride(false);
      setDays(DEFAULT_DAYS);
      setStart("10:00");
      setEnd("18:00");
    }
  }

  function openNew() {
    setName("");
    setMemberIds(new Set());
    resetSchedule();
    setFormError(null);
    setMode({ kind: "new" });
  }

  function openEdit(team: Team) {
    setName(team.name);
    setMemberIds(new Set(team.members.map((m) => m.id)));
    resetSchedule(team);
    setFormError(null);
    setMode({ kind: "edit", id: team.id });
  }

  function toggleMember(id: number) {
    setMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    const body = {
      name,
      memberIds: [...memberIds],
      schedule: hasOverride ? { days, start, end } : null,
    };
    try {
      if (mode.kind === "new") {
        await apiFetch("/teams", { method: "POST", body });
      } else if (mode.kind === "edit") {
        await apiFetch(`/teams/${mode.id}`, { method: "PUT", body });
      }
      setMode({ kind: "closed" });
      await load();
    } catch {
      setFormError("Failed to save team.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(team: Team) {
    if (!confirm(`Dissolve team "${team.name}"?`)) return;
    try {
      await apiFetch(`/teams/${team.id}`, { method: "DELETE" });
      await load();
    } catch {
      setError("Failed to delete team.");
    }
  }

  return (
    <div>
      <div className="ms-ph">
        <div>
          <div className="ms-ph-title">Teams</div>
          <p className="ms-ph-sub">
            Brigades assigned to orders. Membership can change without affecting past orders.
          </p>
        </div>
        <button type="button" onClick={openNew} className="ms-btn accent" style={{ flexShrink: 0 }}>
          Add new
        </button>
      </div>

      {error && <p className="ms-banner error" style={{ marginBottom: 16 }}>{error}</p>}

      {mode.kind !== "closed" && (
        <form onSubmit={onSubmit} className="ms-card ms-form-panel">
          <h2>{mode.kind === "new" ? "New team" : "Edit team"}</h2>
          <div className="ms-field">
            <span className="ms-label">Name</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="ms-input"
              style={{ maxWidth: 360 }}
            />
          </div>

          <div className="ms-field">
            <span className="ms-label">Members</span>
            {workers.length === 0 ? (
              <p className="muted" style={{ fontSize: 12.5 }}>No workers yet — add some on the Workers page.</p>
            ) : (
              <div className="ms-check-grid">
                {workers.map((w) => (
                  <label key={w.id} className="ms-check">
                    <input
                      type="checkbox"
                      checked={memberIds.has(w.id)}
                      onChange={() => toggleMember(w.id)}
                    />
                    {w.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="ms-field">
            <label className="ms-checkline">
              <input type="checkbox" checked={hasOverride} onChange={(e) => setHasOverride(e.target.checked)} />
              Custom schedule for this team
            </label>
            <span className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
              {hasOverride ? "This team uses the hours below instead of the company schedule." : "Inherits the company-wide work schedule."}
            </span>
          </div>
          {hasOverride && (
            <ScheduleFields
              days={days}
              start={start}
              end={end}
              onToggleDay={(i) => setDays((d) => d.map((v, idx) => (idx === i ? !v : v)))}
              onStart={setStart}
              onEnd={setEnd}
            />
          )}

          {formError && <p className="ms-banner error" style={{ marginTop: 4, marginBottom: 4 }}>{formError}</p>}

          <div className="ms-form-actions">
            <button type="submit" disabled={saving} className="ms-btn primary">
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setMode({ kind: "closed" })} className="ms-btn">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="ms-table-wrap">
        <table className="ms-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Members</th>
              <th className="actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="loading">Loading…</td></tr>
            ) : teams.length === 0 ? (
              <tr><td colSpan={3} className="empty">No teams yet.</td></tr>
            ) : (
              teams.map((team) => (
                <tr key={team.id}>
                  <td>{team.name}</td>
                  <td className="muted">
                    {team.members.length === 0 ? "—" : team.members.map((m) => m.name).join(", ")}
                  </td>
                  <td className="actions">
                    <button type="button" onClick={() => openEdit(team)} className="ms-link">
                      Edit
                    </button>
                    <button type="button" onClick={() => onDelete(team)} className="ms-link danger">
                      Dissolve
                    </button>
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
