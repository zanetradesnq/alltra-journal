/**
 * JournalStats — a live performance block computed from the trade store (the same
 * store the trade tables publish into). Three variants: "summary" (win rate,
 * net P&L, profit factor, avg win/loss), "monthly" (per-month breakdown) and
 * "winloss" (W/L/BE split + bar). It subscribes to the store, so numbers update
 * as you log/edit trades. Falls back to the sample trades when nothing's logged
 * yet (flagged with a "sample" chip) so the block never renders empty.
 *
 * Front-end prototype: at transfer, point the store at the real Alltra trade API.
 */
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarRange, PieChart } from "lucide-react";
import type { Trade } from "../trades";
import { MOCK_TRADES } from "../trades";
import { allTrades, subscribeTrades } from "../tradeStore";

type Variant = "summary" | "monthly" | "winloss";

/* ── stat maths ────────────────────────────────────────────────────────────── */
interface Summary {
  n: number;
  wins: number;
  losses: number;
  be: number;
  net: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  pf: number;
  best: number;
  worst: number;
}
function summarize(trades: Trade[]): Summary {
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const be = trades.filter((t) => t.pnl === 0);
  const grossW = wins.reduce((s, t) => s + t.pnl, 0);
  const grossL = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const decided = wins.length + losses.length;
  return {
    n: trades.length,
    wins: wins.length,
    losses: losses.length,
    be: be.length,
    net: trades.reduce((s, t) => s + t.pnl, 0),
    winRate: decided ? wins.length / decided : 0,
    avgWin: wins.length ? grossW / wins.length : 0,
    avgLoss: losses.length ? grossL / losses.length : 0,
    pf: grossL ? grossW / grossL : grossW > 0 ? Infinity : 0,
    best: trades.length ? Math.max(...trades.map((t) => t.pnl)) : 0,
    worst: trades.length ? Math.min(...trades.map((t) => t.pnl)) : 0,
  };
}

interface MonthRow {
  key: string;
  label: string;
  count: number;
  net: number;
  winRate: number;
}
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function byMonth(trades: Trade[]): MonthRow[] {
  const map = new Map<string, Trade[]>();
  for (const t of trades) {
    const d = new Date(t.date);
    const key = Number.isNaN(d.getTime())
      ? "—"
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const arr = map.get(key) ?? [];
    arr.push(t);
    map.set(key, arr);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, ts]) => {
      const wins = ts.filter((t) => t.pnl > 0).length;
      const losses = ts.filter((t) => t.pnl < 0).length;
      const [y, m] = key.split("-");
      const label = key === "—" ? "Undated" : `${MONTHS[Number(m) - 1]} ${y}`;
      return {
        key,
        label,
        count: ts.length,
        net: ts.reduce((s, t) => s + t.pnl, 0),
        winRate: wins + losses ? wins / (wins + losses) : 0,
      };
    });
}

/* ── formatting ────────────────────────────────────────────────────────────── */
const money = (n: number): string =>
  (n >= 0 ? "+" : "−") + Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
const pct = (n: number): string => `${Math.round(n * 100)}%`;
const pf = (n: number): string => (n === Infinity ? "∞" : n.toFixed(2));
const tone = (n: number): string => (n > 0 ? "jstat-up" : n < 0 ? "jstat-down" : "");

/* ── the node view ─────────────────────────────────────────────────────────── */
function useTrades(): { trades: Trade[]; sample: boolean } {
  const [, bump] = useState(0);
  useEffect(() => subscribeTrades(() => bump((n) => n + 1)), []);
  const live = allTrades();
  return live.length ? { trades: live, sample: false } : { trades: MOCK_TRADES, sample: true };
}

function StatTile({ label, value, t }: { label: string; value: string; t?: string }) {
  return (
    <div className="jstat-tile">
      <span className="jstat-tile-label">{label}</span>
      <span className={"jstat-tile-value " + (t ?? "")}>{value}</span>
    </div>
  );
}

function JournalStatsView({ node }: NodeViewProps) {
  const variant = (node.attrs.variant as Variant) ?? "summary";
  const { trades, sample } = useTrades();
  const s = useMemo(() => summarize(trades), [trades]);
  const months = useMemo(() => (variant === "monthly" ? byMonth(trades) : []), [trades, variant]);

  const head = (icon: React.ReactNode, title: string) => (
    <div className="jstat-head">
      {icon}
      <span className="jstat-title">{title}</span>
      {sample && <span className="jstat-sample">sample</span>}
      <span className="jstat-count">{s.n} trades</span>
    </div>
  );

  const total = Math.max(1, s.wins + s.losses + s.be);
  const seg = (x: number) => `${(x / total) * 100}%`;

  return (
    <NodeViewWrapper className="jstat-wrap" contentEditable={false}>
      <div className="jstat">
        {variant === "summary" && (
          <>
            {head(<BarChart3 size={15} className="jstat-ico" />, "Performance")}
            <div className="jstat-grid">
              <StatTile label="Win rate" value={pct(s.winRate)} />
              <StatTile label="Net P&L" value={money(s.net)} t={tone(s.net)} />
              <StatTile label="Profit factor" value={pf(s.pf)} />
              <StatTile label="Avg win" value={money(s.avgWin)} t="jstat-up" />
              <StatTile label="Avg loss" value={money(-s.avgLoss)} t="jstat-down" />
              <StatTile label="Best / Worst" value={`${money(s.best)} / ${money(s.worst)}`} />
            </div>
          </>
        )}

        {variant === "winloss" && (
          <>
            {head(<PieChart size={15} className="jstat-ico" />, "Win / Loss / Break-even")}
            <div className="jstat-bar">
              <span className="jstat-seg jstat-seg-win" style={{ width: seg(s.wins) }} />
              <span className="jstat-seg jstat-seg-loss" style={{ width: seg(s.losses) }} />
              <span className="jstat-seg jstat-seg-be" style={{ width: seg(s.be) }} />
            </div>
            <div className="jstat-legend">
              <span>
                <i className="jstat-dot jstat-seg-win" /> Wins {s.wins} · {pct(s.winRate)}
              </span>
              <span>
                <i className="jstat-dot jstat-seg-loss" /> Losses {s.losses}
              </span>
              <span>
                <i className="jstat-dot jstat-seg-be" /> Break-even {s.be}
              </span>
            </div>
          </>
        )}

        {variant === "monthly" && (
          <>
            {head(<CalendarRange size={15} className="jstat-ico" />, "Monthly performance")}
            <div className="jstat-rows">
              <div className="jstat-row jstat-row-head">
                <span>Month</span>
                <span className="jstat-num">Trades</span>
                <span className="jstat-num">Net P&L</span>
                <span className="jstat-num">Win rate</span>
              </div>
              {months.map((m) => (
                <div key={m.key} className="jstat-row">
                  <span>{m.label}</span>
                  <span className="jstat-num">{m.count}</span>
                  <span className={"jstat-num " + tone(m.net)}>{money(m.net)}</span>
                  <span className="jstat-num">{pct(m.winRate)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}

/* ── the node + command ────────────────────────────────────────────────────── */
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    journalStats: {
      /** Insert a live stats block. variant: summary (default) · monthly · winloss. */
      insertJournalStats: (variant?: Variant) => ReturnType;
    };
  }
}

export const JournalStats = Node.create({
  name: "journalStats",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      variant: {
        default: "summary",
        parseHTML: (el) => el.getAttribute("data-variant") || "summary",
        renderHTML: (attrs) => ({ "data-variant": (attrs.variant as string) || "summary" }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="journal-stats"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "journal-stats" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(JournalStatsView);
  },

  addCommands() {
    return {
      insertJournalStats:
        (variant) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { variant: variant ?? "summary" },
          }),
    };
  },
});
