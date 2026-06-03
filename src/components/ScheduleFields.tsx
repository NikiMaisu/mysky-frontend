"use client";

import { DAY_LABELS } from "@/lib/schedule";

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
  return (
    <>
      <div className="ms-field">
        <span className="ms-label">Working days</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {DAY_LABELS.map((label, i) => (
            <button
              type="button"
              key={label}
              onClick={() => onToggleDay(i)}
              className={"ms-btn sm" + (days[i] ? " primary" : "")}
              style={{ minWidth: 46, justifyContent: "center" }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="ms-form-grid">
        <div className="ms-field" style={{ marginBottom: 0 }}>
          <span className="ms-label">Start time</span>
          <input type="time" className="ms-input" value={start} onChange={(e) => onStart(e.target.value)} />
        </div>
        <div className="ms-field" style={{ marginBottom: 0 }}>
          <span className="ms-label">End time</span>
          <input type="time" className="ms-input" value={end} onChange={(e) => onEnd(e.target.value)} />
        </div>
      </div>
    </>
  );
}
