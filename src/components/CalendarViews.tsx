"use client";

import { useEffect, useRef, useState } from "react";
import { dateKey, fmtTime, isSameDay } from "@/lib/calendar";
import { daySegment } from "@/lib/schedule";
import { useLang } from "@/lib/i18n";
import type { CalendarOrder, DayAvailability, WorkSchedule } from "@/types";

const HOUR_START = 8;
const HOUR_END = 20;
const HOUR_PX = 60;
const GRID_HEIGHT = (HOUR_END - HOUR_START + 1) * HOUR_PX;

const STATUS_SUFFIX: Record<string, string> = {
  QUOTED: "quoted",
  SCHEDULED: "scheduled",
  IN_PROGRESS: "progress",
  DONE: "done",
  CANCELLED: "quoted",
};

type ScheduleFor = (teamId: number | null) => WorkSchedule;

function hourOf(d: Date): number {
  return d.getHours() + d.getMinutes() / 60;
}

interface Laid {
  o: CalendarOrder;
  seg: { start: Date; end: Date };
  lane: number;
  lanes: number;
}

/**
 * Side-by-side layout for a day's segments: overlapping jobs share the column
 * width instead of stacking. Each gets a lane index and the lane count of its
 * overlapping cluster (interval-graph column packing).
 */
function layoutLanes(items: { o: CalendarOrder; seg: { start: Date; end: Date } }[]): Laid[] {
  const sorted = [...items].sort(
    (a, b) => a.seg.start.getTime() - b.seg.start.getTime() || a.seg.end.getTime() - b.seg.end.getTime(),
  );
  const result: Laid[] = [];
  let cluster: Laid[] = [];
  let columnEnds: number[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    const lanes = columnEnds.length || 1;
    for (const e of cluster) e.lanes = lanes;
    cluster = [];
    columnEnds = [];
    clusterEnd = -Infinity;
  };

  for (const it of sorted) {
    const s = it.seg.start.getTime();
    const e = it.seg.end.getTime();
    if (cluster.length && s >= clusterEnd) flush();
    let lane = columnEnds.findIndex((end) => end <= s);
    if (lane === -1) {
      lane = columnEnds.length;
      columnEnds.push(e);
    } else {
      columnEnds[lane] = e;
    }
    const laid: Laid = { ...it, lane, lanes: 1 };
    cluster.push(laid);
    result.push(laid);
    clusterEnd = Math.max(clusterEnd, e);
  }
  flush();
  return result;
}

function FreeChips({ avail }: { avail?: DayAvailability }) {
  const { t } = useLang();
  if (!avail) return null;
  if (avail.freeTeams.length === 0) {
    return <div className="ms-cal-free"><span className="ms-free-none">{t("cal.fullyBooked")}</span></div>;
  }
  return (
    <>
      <div className="ms-cal-free-label">{t("cal.free")}</div>
      <div className="ms-cal-free">
        {avail.freeTeams.map((team) => (
          <span key={team.id} className="ms-free-chip">{team.name}</span>
        ))}
      </div>
    </>
  );
}

export function CalendarTimeGrid({
  days,
  today,
  orders,
  scheduleFor,
  availByDay,
  onPickOrder,
  onCreateRange,
}: {
  days: Date[];
  today: Date;
  orders: CalendarOrder[];
  scheduleFor: ScheduleFor;
  availByDay: Map<string, DayAvailability>;
  onPickOrder: (id: number) => void;
  onCreateRange?: (start: Date, end: Date | null) => void;
}) {
  const { t } = useLang();
  const cols = days.length;
  const hours: number[] = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) hours.push(h);

  const gridRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [sel, setSel] = useState<{ di: number; a: number; b: number } | null>(null);
  const SNAP = 15;
  const MAX_MIN = (HOUR_END - HOUR_START + 1) * 60;

  function yToMin(clientY: number): number {
    const rect = gridRef.current!.getBoundingClientRect();
    const min = Math.round((clientY - rect.top) / HOUR_PX * 60 / SNAP) * SNAP;
    return Math.max(0, Math.min(min, MAX_MIN));
  }
  function rawX(clientX: number): number {
    const rect = gridRef.current!.getBoundingClientRect();
    return clientX - rect.left - 64;
  }
  function xToDay(clientX: number): number {
    const rect = gridRef.current!.getBoundingClientRect();
    const colW = (rect.width - 64) / cols;
    return Math.max(0, Math.min(cols - 1, Math.floor(rawX(clientX) / colW)));
  }
  function minToDate(day: Date, min: number): Date {
    const d = new Date(day);
    d.setHours(HOUR_START, 0, 0, 0);
    d.setMinutes(d.getMinutes() + min);
    return d;
  }

  function onGridMouseDown(e: React.MouseEvent) {
    if (!onCreateRange || e.button !== 0) return;
    if ((e.target as HTMLElement).closest(".ms-event")) return; // clicking a job opens it
    if (rawX(e.clientX) < 0) return; // hour gutter
    dragging.current = true;
    const di = xToDay(e.clientX);
    const m = yToMin(e.clientY);
    setSel({ di, a: m, b: m });
    e.preventDefault();
  }

  useEffect(() => {
    if (!onCreateRange) return;
    function move(e: MouseEvent) {
      if (!dragging.current) return;
      setSel((s) => (s ? { ...s, b: yToMin(e.clientY) } : s));
    }
    function up() {
      if (!dragging.current) return;
      dragging.current = false;
      setSel((s) => {
        if (s) {
          const a = Math.min(s.a, s.b);
          const b = Math.max(s.a, s.b);
          // Only a real drag-selected area starts creation; a plain click does nothing.
          if (b - a >= SNAP) {
            const day = days[s.di];
            onCreateRange!(minToDate(day, a), minToDate(day, b));
          }
        }
        return null;
      });
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cols, days, onCreateRange]);

  return (
    <div className="ms-cal-wrap" style={{ ["--cols" as string]: cols }}>
      <div className="ms-cal-days">
        <div className="ms-cal-tzcell">GMT+4</div>
        {days.map((d, i) => (
          <div key={i} className={"ms-cal-daycell" + (isSameDay(d, today) ? " today" : "")}>
            <span className="dow">{t(`dow.${(d.getDay() + 6) % 7}`)}</span>
            <span className="num">{d.getDate()}</span>
            <FreeChips avail={availByDay.get(dateKey(d))} />
          </div>
        ))}
      </div>

      <div className="ms-cal-body">
        <div
          className="ms-cal-grid"
          ref={gridRef}
          onMouseDown={onGridMouseDown}
          style={{ position: "relative", cursor: onCreateRange ? "crosshair" : "default" }}
        >
          {hours.map((h, hi) => (
            <div key={"r" + h} style={{ display: "contents" }}>
              <div className="ms-cal-hour-label">{String(h).padStart(2, "0")}:00</div>
              {days.map((d, di) => (
                <div key={`c${hi}-${di}`} className={"ms-cal-cell" + (isSameDay(d, today) ? " today-col" : "")} />
              ))}
            </div>
          ))}

          {days.map((d, di) => {
            const items = orders
              .map((o) => ({ o, seg: daySegment(o.startAt, o.finishAt, d, scheduleFor(o.teamId)) }))
              .filter((x): x is { o: CalendarOrder; seg: { start: Date; end: Date } } => x.seg !== null);
            return layoutLanes(items).map(({ o, seg, lane, lanes }) => {
              const startH = Math.max(HOUR_START, Math.min(hourOf(seg.start), HOUR_END + 1));
              const endH = Math.max(startH + 0.25, Math.min(hourOf(seg.end), HOUR_END + 1));
              const top = (startH - HOUR_START) * HOUR_PX;
              const height = Math.min((endH - startH) * HOUR_PX - 4, GRID_HEIGHT - top);
              const compact = endH - startH < 1.5 || lanes > 2;
              return (
                <div
                  key={`${o.id}-${di}`}
                  className={`ms-event status-${STATUS_SUFFIX[o.status] ?? "scheduled"}${compact ? " compact" : ""}`}
                  style={{
                    position: "absolute",
                    top,
                    height,
                    left: `calc(64px + (100% - 64px) * ${di} / ${cols} + (100% - 64px) / ${cols} * ${lane} / ${lanes} + 2px)`,
                    width: `calc((100% - 64px) / ${cols} / ${lanes} - 4px)`,
                  }}
                  onClick={() => onPickOrder(o.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="ms-event-client">{o.clientName}</div>
                  <div className="ms-event-meta">
                    <span>{fmtTime(seg.start.toISOString())}–{fmtTime(seg.end.toISOString())}</span>
                  </div>
                  {o.teamName && (
                    <div className="ms-event-foot">
                      <div className="ms-event-crew"><span className="dot" />{o.teamName}</div>
                    </div>
                  )}
                </div>
              );
            });
          })}

          {sel && (() => {
            const a = Math.min(sel.a, sel.b);
            const b = Math.max(sel.a, sel.b);
            const top = (a / 60) * HOUR_PX;
            const height = Math.max(10, ((b - a) / 60) * HOUR_PX);
            return (
              <div
                className="ms-cal-select"
                style={{
                  position: "absolute",
                  top,
                  height,
                  left: `calc(64px + (100% - 64px) * ${sel.di} / ${cols} + 2px)`,
                  width: `calc((100% - 64px) / ${cols} - 4px)`,
                }}
              >
                {b - a >= 30 && (
                  <span className="ms-cal-select-lbl">
                    {fmtTime(minToDate(days[sel.di], a).toISOString())}–{fmtTime(minToDate(days[sel.di], b).toISOString())}
                  </span>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

export function CalendarMonthGrid({
  monthAnchor,
  cells,
  today,
  orders,
  scheduleFor,
  availByDay,
  onPickDay,
  onPickOrder,
}: {
  monthAnchor: Date;
  cells: Date[];
  today: Date;
  orders: CalendarOrder[];
  scheduleFor: ScheduleFor;
  availByDay: Map<string, DayAvailability>;
  onPickDay: (d: Date) => void;
  onPickOrder: (id: number) => void;
}) {
  const { t } = useLang();
  return (
    <div className="ms-month-wrap">
      <div className="ms-month-dows">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => <div key={i}>{t(`dowFull.${i}`)}</div>)}
      </div>
      <div className="ms-month-grid">
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === monthAnchor.getMonth();
          const isToday = isSameDay(d, today);
          const dayOrders = orders
            .map((o) => ({ o, seg: daySegment(o.startAt, o.finishAt, d, scheduleFor(o.teamId)) }))
            .filter((x) => x.seg)
            .sort((a, b) => a.seg!.start.getTime() - b.seg!.start.getTime());
          const avail = availByDay.get(dateKey(d));
          const total = avail ? avail.freeTeams.length + avail.busyTeams.length : 0;
          let busyClass = "";
          if (avail && total > 0) {
            busyClass = avail.busyTeams.length === 0 ? "free" : avail.freeTeams.length === 0 ? "full" : "some";
          }
          return (
            <div
              key={i}
              className={"ms-month-cell clickable" + (inMonth ? "" : " out") + (isToday ? " today" : "")}
              onClick={() => onPickDay(d)}
            >
              <div className="ms-month-headrow">
                <div className="ms-month-num">{d.getDate()}</div>
                {busyClass && <span className={"ms-busydot " + busyClass} title={busyClass} />}
              </div>
              {avail && avail.freeTeams.length > 0 && total > 0 && (
                <div className="ms-month-free" title={avail.freeTeams.map((t) => t.name).join(", ")}>
                  {avail.freeTeams.map((t) => t.name).join(", ")}
                </div>
              )}
              {dayOrders.slice(0, 3).map(({ o, seg }) => (
                <div
                  key={o.id}
                  className={"ms-month-pill status-" + (STATUS_SUFFIX[o.status] ?? "scheduled")}
                  title={o.clientName}
                  onClick={(e) => { e.stopPropagation(); onPickOrder(o.id); }}
                >
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, opacity: 0.75, marginRight: 6 }}>
                    {fmtTime(seg!.start.toISOString())}
                  </span>
                  {o.clientName}
                </div>
              ))}
              {dayOrders.length > 3 && <div className="ms-month-more">{t("cal.more", { n: dayOrders.length - 3 })}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
