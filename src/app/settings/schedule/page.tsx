"use client";

import { useEffect, useState } from "react";
import { ScheduleFields } from "@/components/ScheduleFields";
import { apiFetch, ApiError } from "@/lib/api";
import type { WorkSchedule } from "@/types";

export default function WorkSchedulePage() {
  const [days, setDays] = useState<boolean[]>([true, true, true, true, true, true, false]);
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("18:00");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const s = await apiFetch<WorkSchedule>("/work-schedule");
        setDays(s.days);
        setStart(s.start.slice(0, 5));
        setEnd(s.end.slice(0, 5));
      } catch {
        setError("Failed to load the work schedule.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await apiFetch("/work-schedule", { method: "PUT", body: { days, start, end } });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 400 ? "Pick at least one day and an end time after the start." : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="ms-center">Loading…</div>;

  return (
    <div>
      <div className="ms-ph">
        <div>
          <div className="ms-ph-title">Work schedule</div>
          <p className="ms-ph-sub">
            Company-wide working days and hours. Jobs are scheduled within these hours and roll over to the
            next working day when they don&apos;t fit. Teams can override this on the Teams page.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="ms-card ms-form-panel" style={{ maxWidth: 520 }}>
        <ScheduleFields
          days={days}
          start={start}
          end={end}
          onToggleDay={(i) => setDays((d) => d.map((v, idx) => (idx === i ? !v : v)))}
          onStart={setStart}
          onEnd={setEnd}
        />
        {error && <p className="ms-banner error" style={{ marginTop: 16 }}>{error}</p>}
        {saved && <p className="ms-banner success" style={{ marginTop: 16 }}>Saved.</p>}
        <div className="ms-form-actions">
          <button type="submit" className="ms-btn primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </div>
  );
}
