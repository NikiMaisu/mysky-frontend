export type CalendarView = "day" | "week" | "month";

export const DOW_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DOW_MINI = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const dow = (x.getDay() + 6) % 7; // Monday = 0
  return addDays(x, -dow);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** First cell of a 6-week month grid (Monday on/just before the 1st). */
export function monthGridStart(monthAnchor: Date): Date {
  return startOfWeek(startOfMonth(monthAnchor));
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Local YYYY-MM-DD key (matches the backend's Tbilisi day buckets for a Tbilisi browser). */
export function dateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fmtMonthYear(d: Date, locale = "en-GB"): string {
  return d.toLocaleDateString(locale, { month: "long", year: "numeric" });
}

export function fmtRange(from: Date, to: Date, locale = "en-GB"): string {
  const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
  const f = from.toLocaleDateString(locale, { day: "numeric", month: "short" });
  const t = to.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
  if (isSameDay(from, to)) return from.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return sameMonth ? `${from.getDate()}–${t}` : `${f} – ${t}`;
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** Visible [from, to) for a view, as Date objects at local midnight boundaries. */
export function viewRange(view: CalendarView, anchor: Date): { from: Date; to: Date } {
  if (view === "day") {
    const from = startOfDay(anchor);
    return { from, to: addDays(from, 1) };
  }
  if (view === "week") {
    const from = startOfWeek(anchor);
    return { from, to: addDays(from, 7) };
  }
  const from = monthGridStart(anchor);
  return { from, to: addDays(from, 42) };
}

export function daysBetween(from: Date, to: Date): Date[] {
  const out: Date[] = [];
  for (let d = new Date(from); d < to; d = addDays(d, 1)) out.push(new Date(d));
  return out;
}
