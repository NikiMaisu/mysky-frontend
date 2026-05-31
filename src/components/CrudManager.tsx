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
      <div className="ms-ph">
        <div>
          <div className="ms-ph-title">{title}</div>
          {description && <p className="ms-ph-sub">{description}</p>}
        </div>
        <button type="button" onClick={openNew} className="ms-btn accent" style={{ flexShrink: 0 }}>
          Add new
        </button>
      </div>

      {error && <p className="ms-banner error" style={{ marginBottom: 16 }}>{error}</p>}

      {mode.kind !== "closed" && (
        <form onSubmit={onSubmit} className="ms-card ms-form-panel">
          <h2>{mode.kind === "new" ? "New entry" : "Edit entry"}</h2>
          <div className="ms-form-grid">
            {fields.map((field) => (
              <div key={field.name} className="ms-field" style={{ marginBottom: 0 }}>
                <span className="ms-label">{field.label}</span>
                {field.type === "select" ? (
                  <select
                    value={form[field.name] ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, [field.name]: e.target.value }))}
                    className="ms-select"
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
                    className="ms-input"
                  />
                )}
              </div>
            ))}
          </div>
          {formError && <p className="ms-banner error" style={{ marginTop: 16 }}>{formError}</p>}
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
              {columns.map((col) => (
                <th key={col.header}>{col.header}</th>
              ))}
              <th className="actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} className="loading">Loading…</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="empty">Nothing here yet.</td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id}>
                  {columns.map((col) => (
                    <td key={col.header}>{col.cell(row)}</td>
                  ))}
                  <td className="actions">
                    <button type="button" onClick={() => openEdit(row)} className="ms-link">
                      Edit
                    </button>
                    <button type="button" onClick={() => onDelete(row)} className="ms-link danger">
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
