"use client";

import { useEffect, useState } from "react";
import { ScheduleFields } from "@/components/ScheduleFields";
import { apiFetch, ApiError } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import type { WorkSchedule } from "@/types";

export default function WorkSchedulePage() {
  const { t } = useLang();
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
      setError(err instanceof ApiError && err.status === 400 ? t("sched.invalid") : t("common.somethingWrong"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="ms-center">{t("common.loading")}</div>;

  return (
    <div>
      <div className="ms-ph">
        <div>
          <div className="ms-ph-title">{t("sched.title")}</div>
          <p className="ms-ph-sub">{t("sched.sub")}</p>
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
        {saved && <p className="ms-banner success" style={{ marginTop: 16 }}>{t("common.saved")}</p>}
        <div className="ms-form-actions">
          <button type="submit" className="ms-btn primary" disabled={saving}>{saving ? t("common.saving") : t("common.save")}</button>
        </div>
      </form>
    </div>
  );
}
