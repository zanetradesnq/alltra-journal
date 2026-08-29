/**
 * Today's Journal — top-left home widget, cloned from the Alltra design.
 * Day navigator (‹ Weekday · Mon DD ›) + a session label, a 4-tile metric strip
 * (placeholder values — this journal app has no trade data, matching the live
 * Alltra empty state), and a brand-blue CTA card that previews the selected
 * day's entry and opens it in the editor.
 */
import { useState } from "react";
import type { CSSProperties } from "react";
import { Info, ChevronLeft, ChevronRight, CalendarDays, ArrowRight } from "lucide-react";
import type { JournalDayData } from "./JournalCalendarWidget";

const WEEKDAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const keyOf = (d: Date) =>
  `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function relativeLabel(d: Date, today: Date): string {
  const diff = Math.round(
    (startOfDay(d).getTime() - startOfDay(today).getTime()) / 86400000
  );
  if (diff === 0) return "Today · Post-Market";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  return diff < 0 ? `${String(-diff)} days ago` : `In ${String(diff)} days`;
}

function MetricTile({
  label,
  value,
  emphasized,
  color,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
  color: string;
}) {
  return (
    <div
      style={{
        background: "var(--alpha-4)",
        borderRadius: 10,
        padding: "16px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 7,
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-geist-sans)",
      }}
    >
      <span
        style={{
          color: "var(--text-tertiary)",
          fontSize: 10,
          letterSpacing: "0.04em",
          opacity: 0.65,
        }}
      >
        {label}
      </span>
      <span
        style={{
          color,
          fontSize: emphasized ? 19 : 16,
          fontWeight: emphasized ? 600 : 500,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function TodaysJournalWidget({
  journalData,
  onOpen,
}: {
  journalData: Map<string, JournalDayData>;
  onOpen: (date: Date) => void;
}) {
  const today = new Date();
  const [sel, setSel] = useState(() => startOfDay(today));

  const data = journalData.get(keyOf(sel));
  const hasEntry = data?.hasJournal ?? false;

  const stepDay = (delta: number) => {
    const next = new Date(sel);
    next.setDate(sel.getDate() + delta);
    setSel(startOfDay(next));
  };

  const navBtn: CSSProperties = {
    background: "transparent",
    border: "none",
    color: "var(--text-tertiary)",
    cursor: "pointer",
    padding: 6,
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
        border: "1px solid var(--border-3)",
        boxShadow: "var(--shadow-sm)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-geist-sans)",
      }}
    >
      {/* title */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            color: "var(--text-primary)",
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            lineHeight: 1,
          }}
        >
          Today&apos;s Journal
        </span>
        <Info size={14} style={{ color: "var(--text-tertiary)", cursor: "help" }} />
      </div>

      {/* day navigator */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          margin: "18px 0 16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => stepDay(-1)} style={navBtn} title="Previous day">
            <ChevronLeft size={16} />
          </button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "6px 10px",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            <CalendarDays size={14} style={{ color: "var(--text-tertiary)" }} />
            {WEEKDAYS_LONG[sel.getDay()]} · {MONTHS_SHORT[sel.getMonth()]}{" "}
            {sel.getDate()}
          </div>
          <button onClick={() => stepDay(1)} style={navBtn} title="Next day">
            <ChevronRight size={16} />
          </button>
        </div>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)", opacity: 0.7 }}>
          {relativeLabel(sel, today)}
        </span>
      </div>

      {/* metric strip — placeholder (no trade data) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <MetricTile label="Net P&L" value="+$0.00" color="var(--alltra-brand)" emphasized />
        <MetricTile label="Trades" value="0" color="var(--text-primary)" />
        <MetricTile label="Win Rate" value="—" color="var(--text-tertiary)" />
        <MetricTile label="Profit Factor" value="—" color="var(--text-tertiary)" />
      </div>

      {/* brand-blue CTA card */}
      <button
        onClick={() => onOpen(sel)}
        style={{
          textAlign: "left",
          border: "none",
          cursor: "pointer",
          background: "var(--alltra-brand)",
          borderRadius: 14,
          padding: "18px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          color: "#fff",
          fontFamily: "var(--font-geist-sans)",
          boxShadow: "0 6px 20px -8px rgba(0,102,255,0.55)",
        }}
      >
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.08em",
              opacity: 0.85,
          }}
        >
          Today&apos;s Journal
        </span>
        <span
          style={{
            fontSize: 13.5,
            lineHeight: 1.5,
            opacity: 0.95,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {hasEntry && data?.text
            ? data.text
            : "Nothing written yet. Set your intentions, log your mindset, and reflect on the day."}
        </span>
        <span
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {hasEntry ? "Continue Journal" : "Start Journal"}
          <ArrowRight size={15} />
        </span>
      </button>
    </div>
  );
}

