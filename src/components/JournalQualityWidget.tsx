/**
 * Journal Quality Rating — top-right home widget, cloned from the Alltra design.
 * A semicircular gauge of the journaled-day rate over a 7/30/90-day window, a
 * stat row (journaled · missed · avg quality), a period toggle, and a "Pending
 * Journals" sub-card listing recent days that still need an entry. All values
 * are computed from the real entries in journalData.
 */
import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import type { JournalDayData } from "./JournalCalendarWidget";

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

const PERIODS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
];

/* ── semicircular gauge ──────────────────────────────────────────────────── */
function Gauge({ percent, journaled, total }: { percent: number; journaled: number; total: number }) {
  // 180° arc, r=84, centered at (100,100); length = π·r
  const len = Math.PI * 84;
  const offset = len * (1 - Math.max(0, Math.min(1, percent)));
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 340, margin: "0 auto" }}>
      <svg viewBox="0 0 200 118" style={{ width: "100%", display: "block" }}>
        <defs>
          <linearGradient id="jq-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(0,102,255,0.4)" />
            <stop offset="100%" stopColor="var(--alltra-brand)" />
          </linearGradient>
        </defs>
        <path
          d="M 16 100 A 84 84 0 0 1 184 100"
          fill="none"
          stroke="var(--alpha-8)"
          strokeWidth={15}
          strokeLinecap="round"
        />
        <path
          d="M 16 100 A 84 84 0 0 1 184 100"
          fill="none"
          stroke="url(#jq-grad)"
          strokeWidth={15}
          strokeLinecap="round"
          strokeDasharray={len}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      {/* center readout */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "48%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 38,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "var(--text-primary)",
            lineHeight: 1,
          }}
        >
          {Math.round(percent * 100)}%
        </span>
        <span style={{ fontSize: 12.5, color: "var(--text-tertiary)", marginTop: 6 }}>
          {journaled} / {total} days journaled
        </span>
      </div>
      {/* end labels */}
      <span
        style={{
          position: "absolute",
          left: "5%",
          bottom: "2%",
          fontSize: 10.5,
          color: "var(--text-tertiary)",
          opacity: 0.6,
        }}
      >
        0%
      </span>
      <span
        style={{
          position: "absolute",
          right: "5%",
          bottom: "2%",
          fontSize: 10.5,
          color: "var(--text-tertiary)",
          opacity: 0.6,
        }}
      >
        100%
      </span>
    </div>
  );
}

export function JournalQualityWidget({
  journalData,
  onOpen,
}: {
  journalData: Map<string, JournalDayData>;
  onOpen: (date: Date) => void;
}) {
  const [periodIdx, setPeriodIdx] = useState(1); // 30D default
  const days = PERIODS[periodIdx].days;

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let journaled = 0;
    let qSum = 0;
    let qCount = 0;
    const pending: Date[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const data = journalData.get(keyOf(d));
      if (data?.hasJournal) {
        journaled++;
        if (data.qualityScore != null) {
          qSum += data.qualityScore;
          qCount++;
        }
      } else if (i > 0) {
        // past day with no entry → pending (skip today itself)
        pending.push(d);
      }
    }
    const percent = days > 0 ? journaled / days : 0;
    const avgQuality = qCount > 0 ? qSum / qCount : null;
    return {
      journaled,
      missed: days - journaled,
      percent,
      avgQuality,
      pending: pending.slice(0, 4),
    };
  }, [journalData, days]);

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
          Journal Quality Rating
        </span>
        <Info size={14} style={{ color: "var(--text-tertiary)", cursor: "help" }} />
      </div>

      {/* gauge */}
      <div style={{ margin: "22px 0 10px" }}>
        <Gauge percent={stats.percent} journaled={stats.journaled} total={days} />
      </div>

      {/* stat row + period toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginTop: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "var(--text-tertiary)",
            flexWrap: "wrap",
          }}
        >
          <span>
            Journaled{" "}
            <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
              {stats.journaled}
            </span>
          </span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>
            Missed{" "}
            <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
              {stats.missed}
            </span>
          </span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>
            Avg quality{" "}
            <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
              {stats.avgQuality != null ? stats.avgQuality.toFixed(1) : "—"} / 7
            </span>
          </span>
        </div>
        <div
          style={{
            display: "flex",
            gap: 2,
            padding: 3,
            borderRadius: 9,
            background: "var(--alpha-4)",
          }}
        >
          {PERIODS.map((p, i) => {
            const active = i === periodIdx;
            return (
              <button
                key={p.label}
                onClick={() => setPeriodIdx(i)}
                style={{
                  padding: "5px 11px",
                  borderRadius: 7,
                  fontSize: 11.5,
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  background: active ? "var(--surface-2)" : "transparent",
                  color: active ? "var(--text-primary)" : "var(--text-tertiary)",
                  boxShadow: active ? "var(--shadow-sm)" : "none",
                  transition: "all 0.15s ease",
                  fontFamily: "var(--font-geist-sans)",
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* pending journals */}
      <div
        style={{
          marginTop: "auto",
          paddingTop: 18,
        }}
      >
      <div
        style={{
          background: "var(--alpha-4)",
          borderRadius: 10,
          padding: 14,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-secondary)",
            marginBottom: 10,
          }}
        >
          Pending Journals
        </div>
        {stats.pending.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {stats.pending.map((d) => (
              <button
                key={keyOf(d)}
                onClick={() => onOpen(d)}
                style={{
                  padding: "7px 12px",
                  borderRadius: 9,
                  fontSize: 12.5,
                  fontWeight: 500,
                  cursor: "pointer",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border-3)",
                  color: "var(--text-secondary)",
                  transition: "all 0.15s ease",
                  fontFamily: "var(--font-geist-sans)",
                }}
              >
                {MONTHS_SHORT[d.getMonth()]} {d.getDate()}
              </button>
            ))}
          </div>
        ) : (
          <span style={{ fontSize: 12.5, color: "var(--text-tertiary)" }}>
            All caught up — no pending entries.
          </span>
        )}
      </div>
      </div>
    </div>
  );
}

export default JournalQualityWidget;
