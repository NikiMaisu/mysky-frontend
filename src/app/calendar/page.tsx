"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarMonthGrid, CalendarTimeGrid } from "@/components/CalendarViews";
import { OrderDrawer } from "@/components/OrderDrawer";
import { QuickCreateDrawer } from "@/components/QuickCreateDrawer";
import { apiFetch, ApiError } from "@/lib/api";
import {
  type CalendarView,
  addDays,
  dateKey,
  daysBetween,
  fmtMonthYear,
  fmtRange,
  monthGridStart,
  startOfDay,
  startOfMonth,
  startOfWeek,
  viewRange,
} from "@/lib/calendar";
import { resolveSchedule } from "@/lib/schedule";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import type { CalendarOrder, DayAvailability, Team, WorkSchedule } from "@/types";

export default function CalendarPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { t, lang } = useLang();
  const locale = lang === "ka" ? "ka-GE" : "en-GB";
  const [view, setView] = useState<CalendarView>("week");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createRange, setCreateRange] = useState<{ start: Date; end: Date | null } | null>(null);
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()));
  const today = useMemo(() => startOfDay(new Date()), []);

  const [orders, setOrders] = useState<CalendarOrder[]>([]);
  const [avail, setAvail] = useState<DayAvailability[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [globalSchedule, setGlobalSchedule] = useState<WorkSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { from, to } = useMemo(() => viewRange(view, anchor), [view, anchor]);

  useEffect(() => {
    void (async () => {
      try {
        const [t, ws] = await Promise.all([
          apiFetch<Team[]>("/teams"),
          apiFetch<WorkSchedule>("/work-schedule"),
        ]);
        setTeams(t);
        setGlobalSchedule(ws);
      } catch {
        /* surfaced via the range load */
      }
    })();
  }, []);

  const scheduleFor = useCallback(
    (teamId: number | null): WorkSchedule => {
      const team = teamId ? teams.find((t) => t.id === teamId) ?? null : null;
      return resolveSchedule(team, globalSchedule!);
    },
    [teams, globalSchedule],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const q = `from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
    try {
      const [o, a] = await Promise.all([
        apiFetch<CalendarOrder[]>(`/calendar?${q}`),
        apiFetch<DayAvailability[]>(`/calendar/availability?${q}`),
      ]);
      setOrders(o);
      setAvail(a);
    } catch (e) {
      setError(e instanceof ApiError ? t("common.failedLoadCode", { code: e.status }) : t("common.failedLoad"));
    } finally {
      setLoading(false);
    }
  }, [from, to, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const availByDay = useMemo(() => {
    const m = new Map<string, DayAvailability>();
    for (const a of avail) m.set(a.date, a);
    return m;
  }, [avail]);

  const days = useMemo(() => {
    if (view === "day") return [startOfDay(anchor)];
    if (view === "week") return daysBetween(startOfWeek(anchor), addDays(startOfWeek(anchor), 7));
    return [];
  }, [view, anchor]);

  const monthCells = useMemo(
    () => (view === "month" ? daysBetween(monthGridStart(anchor), addDays(monthGridStart(anchor), 42)) : []),
    [view, anchor],
  );

  function navigate(delta: number) {
    if (view === "day") setAnchor((a) => addDays(a, delta));
    else if (view === "week") setAnchor((a) => addDays(a, 7 * delta));
    else setAnchor((a) => startOfMonth(new Date(a.getFullYear(), a.getMonth() + delta, 1)));
  }

  function pickDayFromMonth(d: Date) {
    setAnchor(startOfDay(d));
    setView("day");
  }

  function startCreate(start: Date, end: Date | null) {
    setCreateRange({ start, end });
  }

  const label =
    view === "month" ? fmtMonthYear(anchor, locale) : view === "week" ? fmtRange(startOfWeek(anchor), addDays(startOfWeek(anchor), 6), locale) : fmtRange(anchor, anchor, locale);

  const dayAvail = view === "day" ? availByDay.get(dateKey(startOfDay(anchor))) : undefined;

  return (
    <div>
      <div className="ms-header" style={{ padding: "0 0 16px" }}>
        <div>
          <div className="ms-h-title">{t("cal.title")}</div>
          <div className="ms-h-date">{label}</div>
        </div>
        <div className="ms-h-nav">
          <button onClick={() => navigate(-1)} aria-label="Previous">‹</button>
          <button className="today-btn" onClick={() => setAnchor(today)}>{t("cal.today")}</button>
          <button onClick={() => navigate(1)} aria-label="Next">›</button>
        </div>
        <input
          type="date"
          className="ms-input"
          style={{ width: "auto" }}
          value={dateKey(anchor)}
          onChange={(e) => e.target.value && setAnchor(startOfDay(new Date(e.target.value)))}
        />
        <div className="ms-h-spacer" />
        <div className="ms-view-switch">
          {(["day", "week", "month"] as CalendarView[]).map((v) => (
            <button key={v} className={view === v ? "on" : ""} onClick={() => setView(v)}>
              {t(`cal.${v}`)}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="ms-banner error" style={{ marginBottom: 16 }}>{error}</p>}
      {loading && <p className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>{t("common.loading")}</p>}

      {view === "day" && (
        <>
          <div className="ms-cal-freebar" style={{ borderRadius: "var(--r-lg) var(--r-lg) 0 0", border: "1px solid var(--border)", borderBottom: 0 }}>
            <span className="lbl">{t("cal.freeToday")}</span>
            {!dayAvail || dayAvail.freeTeams.length === 0 ? (
              <span className="ms-free-none">{dayAvail ? t("cal.fullyBooked") : t("cal.noTeams")}</span>
            ) : (
              dayAvail.freeTeams.map((team) => <span key={team.id} className="ms-free-chip">{team.name}</span>)
            )}
          </div>
          {globalSchedule && (
            <CalendarTimeGrid days={days} today={today} orders={orders} scheduleFor={scheduleFor} availByDay={availByDay} onPickOrder={setSelectedId} onCreateRange={isAdmin ? startCreate : undefined} />
          )}
        </>
      )}

      {view === "week" && globalSchedule && (
        <CalendarTimeGrid days={days} today={today} orders={orders} scheduleFor={scheduleFor} availByDay={availByDay} onPickOrder={setSelectedId} onCreateRange={isAdmin ? startCreate : undefined} />
      )}

      {view === "month" && globalSchedule && (
        <CalendarMonthGrid
          monthAnchor={anchor}
          cells={monthCells}
          today={today}
          orders={orders}
          scheduleFor={scheduleFor}
          availByDay={availByDay}
          onPickDay={pickDayFromMonth}
          onPickOrder={setSelectedId}
        />
      )}

      <OrderDrawer orderId={selectedId} onClose={() => setSelectedId(null)} />
      {isAdmin && <QuickCreateDrawer range={createRange} onClose={() => setCreateRange(null)} onCreated={load} />}
    </div>
  );
}
