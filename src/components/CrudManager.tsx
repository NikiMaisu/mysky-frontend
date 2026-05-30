"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { apiFetch, ApiError } from "@/lib/api";

export type FieldType = "text" | "number" | "email" | "password" | "select";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  step?: string;
  required?: boolean;
  hintOnEdit?: string;
  skipIfEmpty?: boolean;
}

export interface ColumnDef<T> {
  header: string;
  cell: (row: T) => ReactNode;
}

interface CrudManagerProps<T> {
  title: string;
  description?: string;
  path: string;
  columns: ColumnDef<T>[];
  fields: FieldDef[];
  emptyForm: Record<string, string>;
  toForm: (row: T) => Record<string, string>;
  rowLabel: (row: T) => string;
}

type Mode = { kind: "closed" } | { kind: "new" } | { kind: "edit"; id: number };

export function CrudManager<T extends { id: number }>({
  title,
  description,
  path,
  columns,
  fields,
  emptyForm,
  toForm,
  rowLabel,
}: CrudManagerProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: "closed" });
  const [form, setForm] = useState<Record<string, string>>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await apiFetch<T[]>(path));
    } catch (e) {
      setError(e instanceof ApiError ? `Failed to load (${e.status})` : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void load();
  }, [load]);

  function openNew() {
    setForm(emptyForm);
    setFormError(null);
    setMode({ kind: "new" });
  }

  function openEdit(row: T) {
    setForm(toForm(row));
    setFormError(null);
    setMode({ kind: "edit", id: row.id });
  }

  function buildPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    for (const field of fields) {
      const raw = form[field.name] ?? "";
      if (field.skipIfEmpty && raw.trim() === "") continue;
      payload[field.name] = field.type === "number" ? Number(raw) : raw;
    }
    return payload;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (mode.kind === "new") {
        await apiFetch(path, { method: "POST", body: buildPayload() });
      } else if (mode.kind === "edit") {
        await apiFetch(`${path}/${mode.id}`, { method: "PUT", body: buildPayload() });
      }
      setMode({ kind: "closed" });
      await load();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setFormError("That value conflicts with an existing record.");
      } else if (e instanceof ApiError && e.status === 400) {
        setFormError("Please check the fields and try again.");
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(row: T) {
    if (!confirm(`Delete "${rowLabel(row)}"?`)) return;
    try {
      await apiFetch(`${path}/${row.id}`, { method: "DELETE" });
      await load();
    } catch {
      setError("Failed to delete.");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{title}</h1>
          {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
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
            {mode.kind === "new" ? "New entry" : "Edit entry"}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <label key={field.name} className="block">
                <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {field.label}
                </span>
                {field.type === "select" ? (
                  <select
                    value={form[field.name] ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, [field.name]: e.target.value }))}
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                  >
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    step={field.step}
                    required={field.required !== false && !(mode.kind === "edit" && field.skipIfEmpty)}
                    value={form[field.name] ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, [field.name]: e.target.value }))}
                    placeholder={mode.kind === "edit" ? field.hintOnEdit : undefined}
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                )}
              </label>
            ))}
          </div>
          {formError && (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {formError}
            </p>
          )}
          <div className="mt-4 flex gap-2">
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
              {columns.map((col) => (
                <th key={col.header} className="px-4 py-2 font-medium">
                  {col.header}
                </th>
              ))}
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-6 text-center text-zinc-500">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-6 text-center text-zinc-500">
                  Nothing here yet.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="bg-white dark:bg-zinc-950">
                  {columns.map((col) => (
                    <td key={col.header} className="px-4 py-2 text-zinc-900 dark:text-zinc-100">
                      {col.cell(row)}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      className="mr-3 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(row)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Delete
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
