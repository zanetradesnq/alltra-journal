/**
 * Daily Performance widget — ported from the Alltra journal (empty-state branch).
 * Card shell (title + info + dropdown) with the metric-tile grid. Standalone:
 * no JournalContext / performance-colors — renders the "—" placeholders since
 * this journal has no trade data.
 */
import { useState } from "react";
import type { CSSProperties } from "react";
import {
  Info,
  GripVertical,
  Maximize2,
  Trash2,
  MoreHorizontal,
  X,
} from "lucide-react";

const SECONDARY = "var(--text-secondary)";
const PRIMARY = "var(--text-primary)";
const POSITIVE = "var(--alltra-brand)"; // positive P&L → brand blue

function MetricCard({
  label,
  value,
  color,
  isEmphasized = false,
  isCompact = false,
}: {
  label: string;
  value: string;
  color: string;
  isEmphasized?: boolean;
  isCompact?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--alpha-4)",
        borderRadius: isCompact ? 8 : 10,
        padding: isCompact ? "12px 8px" : "16px 12px",
        display: "flex",
        flexDirection: "column",
        gap: isCompact ? 4 : 6,
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-geist-sans)",
        height: isCompact ? 58 : 66,
      }}
    >
      <div
        style={{
          color: "var(--text-tertiary)",
          fontSize: isCompact ? 9 : 10,
          letterSpacing: "-0.01em",
          opacity: 0.6,
          textAlign: "center",
          fontFamily: "var(--font-geist-sans)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          color,
          fontSize: isEmphasized ? 20 : isCompact ? 15 : 16,
          fontWeight: isEmphasized ? 600 : 500,
          letterSpacing: "-0.02em",
          textAlign: "center",
          fontFamily: "var(--font-geist-sans)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function WidgetDropdown({
  onRemove,
  onExpand,
}: {
  onRemove?: () => void;
  onExpand?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const options = [
    { label: "Move Widget", icon: GripVertical, onClick: () => {} },
    { label: "Expand View", icon: Maximize2, onClick: onExpand },
    { label: "Remove Widget", icon: Trash2, onClick: onRemove },
  ];
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Options"
        className="grid h-7 w-7 place-items-center rounded-md text-text-faint transition-colors hover:bg-[var(--hover-overlay)] hover:text-text"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-[290]"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-9 z-[300] w-44 rounded-xl border border-border bg-elevated p-1.5 shadow-lg">
            {options.map((o) => (
              <button
                key={o.label}
                onClick={() => {
                  o.onClick?.();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-text transition-colors hover:bg-card-hover"
              >
                <o.icon size={15} className="text-text-muted" />
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const grid = (cols: number): CSSProperties => ({
  display: "grid",
  gridTemplateColumns: `repeat(${cols}, 1fr)`,
  gap: 8,
});

export function DailyPerformance({
  onRemove,
  className = "",
}: {
  onRemove?: () => void;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      {expanded && <ExpandedDay onClose={() => setExpanded(false)} />}
      <div
        className={
          "flex flex-col rounded-[20px] border border-border bg-card shadow-sm " +
          className
        }
        style={{ padding: 20 }}
      >
      {/* Title row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 20,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: "var(--text-primary)",
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            lineHeight: 1,
            fontFamily: "var(--font-geist-sans)",
          }}
        >
          Daily Performance
        </span>
        <Info
          size={14}
          className="cursor-pointer text-text-faint transition-colors hover:text-text-muted"
          aria-label="Your trading performance for this day"
        />
        <div style={{ marginLeft: "auto" }}>
          <WidgetDropdown onRemove={onRemove} onExpand={() => setExpanded(true)} />
        </div>
      </div>

      {/* Metric tiles — mock day */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={grid(2)}>
          <MetricCard label="Net P&L" value="+$154.52" color={POSITIVE} isEmphasized />
          <MetricCard label="Total Trades" value="2" color={PRIMARY} />
        </div>
        <div style={grid(3)}>
          <MetricCard label="Trades Won" value="2" color={PRIMARY} isCompact />
          <MetricCard label="Trades Lost" value="0" color={PRIMARY} isCompact />
          <MetricCard label="Win Rate" value="100.0%" color={PRIMARY} isCompact />
        </div>
        <div style={grid(2)}>
          <MetricCard label="Buys" value="0" color={PRIMARY} isCompact />
          <MetricCard label="Sells" value="2" color={PRIMARY} isCompact />
        </div>
        <div style={grid(2)}>
          <MetricCard label="Largest Win" value="+$81.76" color={POSITIVE} isCompact />
          <MetricCard label="Largest Loss" value="+$72.76" color={POSITIVE} isCompact />
        </div>
      </div>
      </div>
    </>
  );
}

/* ── expanded "Expand View" popup — full day breakdown + accounts ────────── */

const ACCOUNTS: {
  name: string;
  full: string;
  trades: number;
  pnl: string;
  active: boolean;
}[] = [
  { name: "TST", full: "Topstep", trades: 1, pnl: "+$81.76", active: true },
  { name: "MFU", full: "My Funded Futures", trades: 1, pnl: "+$72.76", active: true },
  { name: "TPT", full: "Take Profit Trader", trades: 0, pnl: "—", active: false },
  { name: "APX", full: "Apex Trader Funding", trades: 0, pnl: "—", active: false },
];

function AccountRow({
  name,
  full,
  trades,
  pnl,
  active,
}: (typeof ACCOUNTS)[number]) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderRadius: 10,
        border: "1px solid var(--border)",
        background: "var(--alpha-4)",
        padding: "11px 14px",
        fontFamily: "var(--font-geist-sans)",
      }}
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          height: 34,
          width: 34,
          flexShrink: 0,
          borderRadius: 9,
          background: "var(--hover-overlay-medium)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.02em",
          color: "var(--text-secondary)",
        }}
      >
        {name}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
          {full}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
          {trades} {trades === 1 ? "trade" : "trades"}
        </div>
      </div>
      <span
        style={{
          marginLeft: "auto",
          fontSize: 13.5,
          fontWeight: 600,
          color: active ? POSITIVE : "var(--text-tertiary)",
        }}
      >
        {pnl}
      </span>
    </div>
  );
}

function ExpandedDay({ onClose }: { onClose: () => void }) {
  return (
    <div
      onMouseDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "rgba(0,0,0,0.3)",
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="hide-scrollbar"
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          maxWidth: 680,
          maxHeight: "88vh",
          overflow: "hidden",
          borderRadius: 20,
          border: "1px solid var(--border)",
          background: "var(--surface-1)",
          boxShadow: "var(--shadow-lg)",
          fontFamily: "var(--font-geist-sans)",
        }}
      >
        {/* header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 22px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
              Daily Performance
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              June 24, 2026
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-text-muted transition-colors hover:bg-[var(--hover-overlay)] hover:text-text"
          >
            <X size={18} />
          </button>
        </div>

        {/* body */}
        <div className="hide-scrollbar" style={{ overflowY: "auto", padding: 22 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={grid(4)}>
              <MetricCard label="Net P&L" value="+$154.52" color={POSITIVE} isEmphasized />
              <MetricCard label="Total Trades" value="2" color={PRIMARY} />
              <MetricCard label="Win Rate" value="100.0%" color={PRIMARY} />
              <MetricCard label="Profit Factor" value="—" color={SECONDARY} />
            </div>
            <div style={grid(3)}>
              <MetricCard label="Trades Won" value="2" color={PRIMARY} isCompact />
              <MetricCard label="Trades Lost" value="0" color={PRIMARY} isCompact />
              <MetricCard label="Avg Time" value="28m" color={PRIMARY} isCompact />
            </div>
            <div style={grid(2)}>
              <MetricCard label="Buys" value="0" color={PRIMARY} isCompact />
              <MetricCard label="Sells" value="2" color={PRIMARY} isCompact />
            </div>
            <div style={grid(2)}>
              <MetricCard label="Largest Win" value="+$81.76" color={POSITIVE} isCompact />
              <MetricCard label="Largest Loss" value="+$72.76" color={POSITIVE} isCompact />
            </div>
            <div style={grid(2)}>
              <MetricCard label="Avg Win" value="+$77.26" color={POSITIVE} isCompact />
              <MetricCard label="Avg Loss" value="—" color={SECONDARY} isCompact />
            </div>
          </div>

          {/* accounts */}
          <div
            style={{
              marginTop: 22,
              marginBottom: 10,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
                  color: "var(--text-tertiary)",
            }}
          >
            Accounts
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ACCOUNTS.map((a) => (
              <AccountRow key={a.full} {...a} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
