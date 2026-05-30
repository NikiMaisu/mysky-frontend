"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { GraniteConfig } from "@/types";

export default function GranitePage() {
  const [price, setPrice] = useState("");
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const config = await apiFetch<GraniteConfig>("/granite");
        setPrice(String(config.pricePerMeter));
        setTime(String(config.timePerMeterMinutes));
      } catch {
        setError("Failed to load granite config.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await apiFetch("/granite", {
        method: "PUT",
        body: { pricePerMeter: Number(price), timePerMeterMinutes: Number(time) },
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError && e.status === 400 ? "Check the values." : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Granite</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Global granite rates. When granite is enabled on an order, these apply to its perimeter.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="max-w-md rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Price per linear meter (₾)
          </span>
          <input
            type="number"
            step="0.01"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Time per linear meter (minutes)
          </span>
          <input
            type="number"
            step="0.01"
            required
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </label>

        {error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}
        {saved && (
          <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
            Saved.
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition disabled:opacity-60 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
