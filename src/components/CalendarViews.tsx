"use client";

import { DOW_SHORT, dateKey, fmtTime, isSameDay } from "@/lib/calendar";
import { daySegment } from "@/lib/schedule";
import type { CalendarOrder, DayAvailability, WorkSchedule } from "@/types";

const HOUR_START = 7;
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

function FreeChips({ avail }: { avail?: DayAvailability }) {
  if (!avail) return null;
  if (avail.freeTeams.length === 0) {
    return <div className="ms-cal-free"><span className="ms-free-none">Fully booked</span></div>;
  }
  return (
    <>
      <div className="ms-cal-free-label">Free</div>
      <div className="ms-cal-free">
        {avail.freeTeams.map((t) => (
          <span key={t.id} className="ms-free-chip">{t.name}</span>
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
}: {
  days: Date[];
  today: Date;
  orders: CalendarOrder[];
  scheduleFor: ScheduleFor;
  availByDay: Map<string, DayAvailability>;
  onPickOrder: (id: number) => void;
}) {
  const cols = days.length;
  const hours: number[] = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) hours.push(h);

  return (
    <div className="ms-cal-wrap" style={{ ["--cols" as string]: cols }}>
      <div className="ms-cal-days">
        <div className="ms-cal-tzcell">GMT+4</div>
        {days.map((d, i) => (
          <div key={i} className={"ms-cal-daycell" + (isSameDay(d, today) ? " today" : "")}>
            <span className="dow">{DOW_SHORT[(d.getDay() + 6) % 7]}</span>
            <span className="num">{d.getDate()}</span>
            <FreeChips avail={availByDay.get(dateKey(d))} />
          </div>
        ))}
      </div>

      <div className="ms-cal-body">
        <div className="ms-cal-grid" style={{ position: "relative" }}>
          {hours.map((h, hi) => (
            <div key={"r" + h} style={{ display: "contents" }}>
              <div className="ms-cal-hour-label">{String(h).padStart(2, "0")}:00</div>
              {days.map((d, di) => (
                <div key={`c${hi}-${di}`} className={"ms-cal-cell" + (isSameDay(d, today) ? " today-col" : "")} />
              ))}
            </div>
          ))}

          {days.map((d, di) =>
            orders.map((o) => {
              const seg = daySegment(o.startAt, o.finishAt, d, scheduleFor(o.teamId));
              if (!seg) return null;
              const startH = Math.max(HOUR_START, Math.min(hourOf(seg.start), HOUR_END + 1));
              const endH = Math.max(startH + 0.25, Math.min(hourOf(seg.end), HOUR_END + 1));
              const top = (startH - HOUR_START) * HOUR_PX;
              const height = Math.min((endH - startH) * HOUR_PX - 4, GRID_HEIGHT - top);
              const compact = endH - startH < 1.5;
              return (
                <div
                  key={`${o.id}-${di}`}
                  className={`ms-event status-${STATUS_SUFFIX[o.status] ?? "scheduled"}${compact ? " compact" : ""}`}
                  style={{
                    position: "absolute",
                    top,
                    height,
                    left: `calc(64px + (100% - 64px) / ${cols} * ${di} + 4px)`,
                    width: `calc((100% - 64px) / ${cols} - 8px)`,
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
            }),
          )}
        </div>
      </div>
    </div>
  );
}

const MONTH_DOWS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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
  return (
    <div className="ms-month-wrap">
      <div className="ms-month-dows">
        {MONTH_DOWS.map((d) => <div key={d}>{d}</div>)}
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
                <div className="ms-month-free">{avail.freeTeams.map((t) => t.name).join(", ")}</div>
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
              {dayOrders.length > 3 && <div className="ms-month-more">+{dayOrders.length - 3} more</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
