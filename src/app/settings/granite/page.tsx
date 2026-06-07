"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import type { GraniteConfig } from "@/types";

export default function GranitePage() {
  const { t } = useLang();
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
        setError(t("common.failedLoad"));
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
      setError(e instanceof ApiError && e.status === 400 ? t("common.checkFields") : t("common.somethingWrong"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="ms-center">{t("common.loading")}</div>;
  }

  return (
    <div>
      <div className="ms-ph">
        <div>
          <div className="ms-ph-title">{t("sched.granite.title")}</div>
          <p className="ms-ph-sub">{t("sched.granite.sub")}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="ms-card ms-form-panel" style={{ maxWidth: 440 }}>
        <div className="ms-field">
          <span className="ms-label">{t("sched.granite.price")}</span>
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
          <span className="ms-label">{t("sched.granite.time")}</span>
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
        {saved && <p className="ms-banner success" style={{ marginBottom: 14 }}>{t("common.saved")}</p>}

        <button type="submit" disabled={saving} className="ms-btn primary">
          {saving ? t("common.saving") : t("common.save")}
        </button>
      </form>
    </div>
  );
}
