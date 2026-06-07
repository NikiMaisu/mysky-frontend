"use client";

import { useLang } from "@/lib/i18n";

export function ScheduleFields({
  days,
  start,
  end,
  onToggleDay,
  onStart,
  onEnd,
}: {
  days: boolean[];
  start: string;
  end: string;
  onToggleDay: (index: number) => void;
  onStart: (v: string) => void;
  onEnd: (v: string) => void;
}) {
  const { t } = useLang();
  return (
    <>
      <div className="ms-field">
        <span className="ms-label">{t("sched.days")}</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <button
              type="button"
              key={i}
              onClick={() => onToggleDay(i)}
              className={"ms-btn sm" + (days[i] ? " primary" : "")}
              style={{ minWidth: 46, justifyContent: "center" }}
            >
              {t(`dow.${i}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="ms-form-grid">
        <div className="ms-field" style={{ marginBottom: 0 }}>
          <span className="ms-label">{t("sched.start")}</span>
          <input type="time" className="ms-input" value={start} onChange={(e) => onStart(e.target.value)} />
        </div>
        <div className="ms-field" style={{ marginBottom: 0 }}>
          <span className="ms-label">{t("sched.end")}</span>
          <input type="time" className="ms-input" value={end} onChange={(e) => onEnd(e.target.value)} />
        </div>
      </div>
    </>
  );
}
