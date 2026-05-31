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
    return <div className="ms-center">Loading…</div>;
  }

  return (
    <div>
      <div className="ms-ph">
        <div>
          <div className="ms-ph-title">Granite</div>
          <p className="ms-ph-sub">
            Global granite rates. When granite is enabled on an order, these apply to its perimeter.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="ms-card ms-form-panel" style={{ maxWidth: 440 }}>
        <div className="ms-field">
          <span className="ms-label">Price per linear meter (₾)</span>
          <input
            type="number"
            step="0.01"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="ms-input"
          />
        </div>
        <div className="ms-field">
          <span className="ms-label">Time per linear meter (minutes)</span>
          <input
            type="number"
            step="0.01"
            required
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="ms-input"
          />
        </div>

        {error && <p className="ms-banner error" style={{ marginBottom: 14 }}>{error}</p>}
        {saved && <p className="ms-banner success" style={{ marginBottom: 14 }}>Saved.</p>}

        <button type="submit" disabled={saving} className="ms-btn primary">
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
