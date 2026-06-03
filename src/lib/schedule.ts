import type { Team, WorkSchedule } from "@/types";

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function parseHM(s: string): [number, number] {
  const [h, m] = s.split(":");
  return [Number(h), Number(m)];
}

export function workdayMinutes(s: WorkSchedule): number {
  const [sh, sm] = parseHM(s.start);
  const [eh, em] = parseHM(s.end);
  return eh * 60 + em - (sh * 60 + sm);
}

/** Monday-indexed working-day check for a JS Date. */
export function isWorkingDay(s: WorkSchedule, d: Date): boolean {
  return !!s.days[(d.getDay() + 6) % 7];
}

export function resolveSchedule(team: Team | null | undefined, global: WorkSchedule): WorkSchedule {
  return team?.schedule ?? global;
}

function nextDayStart(d: Date): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function atTime(d: Date, hm: [number, number]): Date {
  const x = new Date(d);
  x.setHours(hm[0], hm[1], 0, 0);
  return x;
}

/** Mirrors the backend WorkScheduleService.computeFinish (business-hours overflow). */
export function computeFinish(startISO: string, totalMinutes: number, s: WorkSchedule): Date {
  let cursor = new Date(startISO);
  if (totalMinutes <= 0 || s.days.every((d) => !d)) return cursor;
  const start = parseHM(s.start);
  const end = parseHM(s.end);
  let remaining = totalMinutes;

  for (let guard = 0; guard < 4000; guard++) {
    if (!isWorkingDay(s, cursor)) {
      cursor = nextDayStart(cursor);
      continue;
    }
    const winStart = atTime(cursor, start);
    const winEnd = atTime(cursor, end);
    if (cursor < winStart) cursor = winStart;
    if (cursor >= winEnd) {
      cursor = nextDayStart(cursor);
      continue;
    }
    const avail = (winEnd.getTime() - cursor.getTime()) / 60000;
    if (remaining <= avail) return new Date(cursor.getTime() + remaining * 60000);
    remaining -= avail;
    cursor = nextDayStart(cursor);
  }
  return cursor;
}

/**
 * The working-hours segment of an order on a given calendar day, or null.
 * (Intersection of [orderStart, orderFinish] with that day's working window.)
 */
export function daySegment(
  orderStartISO: string,
  orderFinishISO: string,
  day: Date,
  s: WorkSchedule,
): { start: Date; end: Date } | null {
  if (!isWorkingDay(s, day)) return null;
  const winStart = atTime(day, parseHM(s.start));
  const winEnd = atTime(day, parseHM(s.end));
  const oStart = new Date(orderStartISO);
  const oFinish = new Date(orderFinishISO);
  const start = oStart > winStart ? oStart : winStart;
  const end = oFinish < winEnd ? oFinish : winEnd;
  if (start >= end) return null;
  return { start, end };
}

/** Pick the nicest unit to display a minute count without losing precision. */
export function splitMinutes(minutes: number, workdayMin: number): { value: number; unit: "MINUTES" | "HOURS" | "DAYS" } {
  if (workdayMin > 0 && minutes % workdayMin === 0) return { value: minutes / workdayMin, unit: "DAYS" };
  if (minutes % 60 === 0) return { value: minutes / 60, unit: "HOURS" };
  return { value: minutes, unit: "MINUTES" };
}
