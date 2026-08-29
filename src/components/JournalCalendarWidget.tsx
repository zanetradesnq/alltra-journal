/**
 * Journal calendar — month grid, ported from the Alltra design and adapted for
 * this app: no trades (metrics ignored by the grid), fixed green accent for the
 * "journaled" shading, this app's tokens, and a single click that opens the
 * date's entry via onOpenJournal. Self-contained card (title + month nav + grid).
 *
 * Dropped from the original (per the port notes): WidgetDropdown (no dashboard
 * chrome), useHoverTooltip (cosmetic — replaced by a title attr), and the
 * trade-coupled JournalDayModal (single click opens the entry directly).
 */
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Info, ChevronLeft, ChevronRight } from "lucide-react";
import { JournalCalendarDayTile } from "./JournalCalendarDayTile";

export interface JournalDayData {
  text: string;
  hasJournal: boolean;
  qualityScore?: number;
  wordCount: number;
  metrics: {
    netPL: number;
    trades: number;
    winRate: number | null;
    profitFactor: number | null;
  };
}

// fixed accent for journaled-day shading — Alltra brand blue
const METRIC_COLOR = "#0066ff";
const metricAlpha = (a: number) => `rgba(0,102,255,${String(a)})`;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const keyOf = (d: Date) =>
  `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;

const sameDay = (a: Date | null, b: Date) =>
  !!a &&
  a.getDate() === b.getDate() &&
  a.getMonth() === b.getMonth() &&
  a.getFullYear() === b.getFullYear();

/* ── month/year jump popover ─────────────────────────────────────────────── */
function CalendarMonthPicker({
  currentMonth,
  currentYear,
  onSelect,
  onClose,
}: {
  currentMonth: number;
  currentYear: number;
  onSelect: (month: number, year: number) => void;
  onClose: () => void;
}) {
  const [year, setYear] = useState(currentYear);
  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        top: 44,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        width: 256,
        padding: 12,
        borderRadius: 10,
        background: "var(--surface-2)",
        border: "1px solid var(--border-3)",
        boxShadow: "var(--shadow-lg)",
        fontFamily: "var(--font-geist-sans)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <button
          onClick={() => setYear((y) => y - 1)}
          className="grid h-7 w-7 place-items-center rounded-md text-text-muted transition-colors hover:bg-[var(--hover-overlay)] hover:text-text"
        >
          <ChevronLeft size={15} />
        </button>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)" }}>
          {year}
        </span>
        <button
          onClick={() => setYear((y) => y + 1)}
          className="grid h-7 w-7 place-items-center rounded-md text-text-muted transition-colors hover:bg-[var(--hover-overlay)] hover:text-text"
        >
          <ChevronRight size={15} />
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {MONTHS_SHORT.map((m, i) => {
          const active = i === currentMonth && year === currentYear;
          return (
            <button
              key={m}
              onClick={() => {
                onSelect(i, year);
                onClose();
              }}
              style={{
                padding: "8px 0",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: active ? 600 : 500,
                border: "none",
                cursor: "pointer",
                background: active ? "var(--alpha-8)" : "transparent",
                color: active ? "var(--text-primary)" : "var(--text-muted)",
                transition: "background-color 0.12s",
                fontFamily: "var(--font-geist-sans)",
              }}
            >
              {m}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── the calendar ────────────────────────────────────────────────────────── */
export function JournalCalendarWidget({
  journalData,
  onOpenJournal,
  initialDate,
}: {
  journalData: Map<string, JournalDayData>;
  onOpenJournal: (date: Date) => void;
  initialDate?: Date;
}) {
  const today = new Date();
  const [view, setView] = useState(() => {
    const d = initialDate ?? today;
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [fading, setFading] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // pad to whole weeks (5 or 6 rows) so the last week never clips
  const days = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const start = new Date(view.y, view.m, 1 - first.getDay());
    const cells: Date[] = [];
    const lastDay = new Date(view.y, view.m + 1, 0).getDate();
    const total = first.getDay() + lastDay;
    const count = total <= 35 ? 35 : 42;
    for (let i = 0; i < count; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push(d);
    }
    return cells;
  }, [view]);
  const weekRows = days.length / 7;

  const isToday = (d: Date) => sameDay(today, d);

  const step = (delta: number) => {
    if (fading) return;
    setFading(true);
    setTimeout(() => {
      setView((v) => {
        const m = v.m + delta;
        if (m < 0) return { y: v.y - 1, m: 11 };
        if (m > 11) return { y: v.y + 1, m: 0 };
        return { y: v.y, m };
      });
      setFading(false);
    }, 140);
  };

  const navBtn: CSSProperties = {
    background: "transparent",
    border: "none",
    color: "var(--text-tertiary)",
    cursor: "pointer",
    padding: 8,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    transition: "all 0.15s ease",
  };

  return (
    <div
      style={{
        background: "var(--surface-2)",
        borderRadius: 14,
        padding: isMobile ? 16 : 20,
        position: "relative",
        boxShadow: "var(--shadow-sm)",
        border: "1px solid var(--border-3)",
        display: "flex",
        flexDirection: "column",
        height: isMobile ? "auto" : 700,
        overflow: "hidden",
        fontFamily: "var(--font-geist-sans)",
      }}
    >
      {/* title */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            color: "var(--text-secondary)",
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            lineHeight: 1,
          }}
        >
          Journal Calendar
        </span>
        <span
          title="Calendar view of your journal entries"
          style={{ display: "inline-flex", cursor: "help" }}
        >
          <Info size={14} style={{ color: "var(--text-tertiary)" }} />
        </span>
      </div>

      {/* month nav */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "20px 0",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => step(-1)} style={navBtn} title="Previous month">
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setPickerOpen((o) => !o)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-primary)",
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              cursor: "pointer",
              padding: "8px 12px",
              borderRadius: 8,
              minWidth: 150,
              textAlign: "center",
              transition: "background-color 0.15s",
            }}
          >
            {MONTHS[view.m]} {view.y}
          </button>
          <button onClick={() => step(1)} style={navBtn} title="Next month">
            <ChevronRight size={16} />
          </button>
        </div>
        {pickerOpen && (
          <>
            <div
              onMouseDown={() => setPickerOpen(false)}
              style={{ position: "fixed", inset: 0, zIndex: 99 }}
            />
            <CalendarMonthPicker
              currentMonth={view.m}
              currentYear={view.y}
              onSelect={(m, y) => setView({ y, m })}
              onClose={() => setPickerOpen(false)}
            />
          </>
        )}
      </div>

      {/* grid */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {/* weekday headers */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: isMobile ? 4 : 8,
            marginBottom: isMobile ? 8 : 12,
          }}
        >
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              style={{
                fontSize: isMobile ? 8 : 9,
                fontWeight: 500,
                letterSpacing: "0.05em",
                color: "var(--text-tertiary)",
                textAlign: "center",
                opacity: 0.5,
              }}
            >
              {w}
            </div>
          ))}
        </div>

        {/* day cells */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gridTemplateRows: isMobile
              ? `repeat(${String(weekRows)}, minmax(56px, auto))`
              : `repeat(${String(weekRows)}, minmax(0, 1fr))`,
            gap: isMobile ? 4 : 8,
            opacity: fading ? 0.5 : 1,
            transition: "opacity 0.14s ease",
          }}
        >
          {days.map((date, i) => {
            const data = journalData.get(keyOf(date));
            return (
              <JournalCalendarDayTile
                key={i}
                date={date}
                isCurrentMonth={date.getMonth() === view.m}
                isToday={isToday(date)}
                isSelected={false}
                hasJournal={data?.hasJournal ?? false}
                qualityScore={data?.qualityScore}
                journalPreview={data?.text}
                wordCount={data?.wordCount}
                metricColor={METRIC_COLOR}
                metricAlpha={metricAlpha}
                onClick={() => onOpenJournal(date)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
