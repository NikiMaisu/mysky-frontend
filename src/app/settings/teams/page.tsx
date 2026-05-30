"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { Team, Worker } from "@/types";

type Mode = { kind: "closed" } | { kind: "new" } | { kind: "edit"; id: number };

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>({ kind: "closed" });
  const [name, setName] = useState("");
  const [memberIds, setMemberIds] = useState<Set<number>>(new Set());
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

  function openNew() {
    setName("");
    setMemberIds(new Set());
    setFormError(null);
    setMode({ kind: "new" });
  }

  function openEdit(team: Team) {
    setName(team.name);
    setMemberIds(new Set(team.members.map((m) => m.id)));
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
    const body = { name, memberIds: [...memberIds] };
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
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Teams</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Brigades assigned to orders. Membership can change without affecting past orders.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="shrink-0 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Add new
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {mode.kind !== "closed" && (
        <form
          onSubmit={onSubmit}
          className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {mode.kind === "new" ? "New team" : "Edit team"}
          </h2>
          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Name</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full max-w-sm rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </label>

          <div className="mb-4">
            <span className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Members</span>
            {workers.length === 0 ? (
              <p className="text-sm text-zinc-500">No workers yet — add some on the Workers page.</p>
            ) : (
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {workers.map((w) => (
                  <label key={w.id} className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
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

          {formError && (
            <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {formError}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition disabled:opacity-60 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setMode({ kind: "closed" })}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Members</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {loading ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-zinc-500">Loading…</td>
              </tr>
            ) : teams.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-zinc-500">No teams yet.</td>
              </tr>
            ) : (
              teams.map((team) => (
                <tr key={team.id} className="bg-white dark:bg-zinc-950">
                  <td className="px-4 py-2 text-zinc-900 dark:text-zinc-100">{team.name}</td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                    {team.members.length === 0
                      ? "—"
                      : team.members.map((m) => m.name).join(", ")}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(team)}
                      className="mr-3 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(team)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
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
