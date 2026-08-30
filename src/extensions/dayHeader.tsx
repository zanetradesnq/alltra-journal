/**
 * DayHeader — the per-day trading summary strip at the top of an entry: the
 * Tradezella/Edgewonk "day header". Net P&L · trades · win rate are COMPUTED
 * live from the trades that belong to this day — the trade tables logged on
 * this page (by table id) plus any store trade dated the same day — and the
 * strip also captures the day's psychology: mood before / during / after the
 * session (1–5), whether the rules were followed, and a letter grade.
 *
 * The captured values ride in the node's attrs, so they persist with the
 * entry, survive trash/restore, and feed the Emotions trend widget (which
 * scans every entry's header). Auto-inserted on every new entry; `/day` adds
 * one to older entries.
 */
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import type { Trade } from "../trades";
import { allTrades, subscribeTrades, tradesByTable } from "../tradeStore";

export interface DayHeaderOptions {
  /** The current entry's date key (YYYY-MM-DD). */
  getDate: () => string;
}

export type MoodPhase = "before" | "during" | "after";
export const MOOD_LEVELS = [
  { n: 1, glyph: "😖", label: "Tilted" },
  { n: 2, glyph: "😕", label: "Uneasy" },
  { n: 3, glyph: "😐", label: "Neutral" },
  { n: 4, glyph: "🙂", label: "Focused" },
  { n: 5, glyph: "😄", label: "Confident" },
] as const;
const RULES = ["yes", "partial", "no"] as const;
const GRADES = ["A", "B", "C", "D"] as const;

/* ── which day does a trade belong to? — the store carries several date
   shapes ("2026-06-24", "Aug 24, 2026 09:46", "10/07/2023 2:15 AM → 2:30 AM") */
export function tradeDayKey(t: Trade): string {
  const raw = String(t.date).split("→")[0].trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* the trades that belong to THIS page: its own trade tables ∪ same-day trades */
function tradesForDay(tableIds: Set<string>, dayKey: string): Trade[] {
  const byTable = tradesByTable();
  const seen = new Set<string>();
  const out: Trade[] = [];
  const push = (t: Trade) => {
    if (seen.has(t.id)) return;
    seen.add(t.id);
    out.push(t);
  };
  tableIds.forEach((id) => (byTable[id] ?? []).forEach(push));
  if (dayKey) allTrades().forEach((t) => tradeDayKey(t) === dayKey && push(t));
  return out;
}

const money = (n: number): string =>
  n === 0
    ? "0"
    : (n > 0 ? "+" : "−") + "$" + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function DayHeaderView({ node, editor, updateAttributes }: NodeViewProps) {
  const opts = editor.extensionManager.extensions.find((e) => e.name === "dayHeader")
    ?.options as DayHeaderOptions | undefined;
  const dayKey = opts?.getDate() ?? "";
  const [, bump] = useState(0);
  useEffect(() => subscribeTrades(() => bump((n) => n + 1)), []);
  // trade tables on this page — ids live in each table node's data JSON
  const tableIds = new Set<string>();
  editor.state.doc.descendants((n) => {
    if (n.type.name === "tradeTable") {
      try {
        const id = (JSON.parse(String(n.attrs.data || "{}")) as { id?: string }).id;
        if (id) tableIds.add(id);
      } catch {
        /* ignore */
      }
    }
    return true;
  });
  const trades = tradesForDay(tableIds, dayKey);
  const wins = trades.filter((t) => t.pnl > 0).length;
  const losses = trades.filter((t) => t.pnl < 0).length;
  const net = trades.reduce((s, t) => s + t.pnl, 0);
  const decided = wins + losses;
  const winRate = decided ? Math.round((wins / decided) * 100) : null;

  const mood = (phase: MoodPhase): number => Number(node.attrs[phase] ?? 0) || 0;
  const setMood = (phase: MoodPhase, n: number) =>
    updateAttributes({ [phase]: mood(phase) === n ? 0 : n });
  const rules = String(node.attrs.rules ?? "");
  const grade = String(node.attrs.grade ?? "");

  const tone = net > 0 ? "jday-up" : net < 0 ? "jday-down" : "";

  return (
    <NodeViewWrapper className="jday-wrap" contentEditable={false}>
      <div className="jday">
        <div className="jday-head">
          <BarChart3 size={14} className="jday-ico" />
          <span className="jday-title">Day summary</span>
          <span className="jday-date">{dayKey || "—"}</span>
        </div>

        {/* computed — from this page's tables + same-day trades */}
        <div className="jday-stats">
          <div className="jday-stat">
            <span className="jday-stat-label">Net P&L</span>
            <span className={"jday-stat-value " + tone}>{trades.length ? money(net) : "—"}</span>
          </div>
          <div className="jday-stat">
            <span className="jday-stat-label">Trades</span>
            <span className="jday-stat-value">{trades.length || "—"}</span>
          </div>
          <div className="jday-stat">
            <span className="jday-stat-label">Win rate</span>
            <span className="jday-stat-value">{winRate === null ? "—" : `${String(winRate)}%`}</span>
          </div>
          <div className="jday-stat">
            <span className="jday-stat-label">W / L</span>
            <span className="jday-stat-value">
              {trades.length ? (
                <>
                  <span className="jday-up">{wins}</span>
                  <span className="jday-sep"> / </span>
                  <span className="jday-down">{losses}</span>
                </>
              ) : (
                "—"
              )}
            </span>
          </div>
        </div>

        {/* captured — the psychology of the day */}
        <div className="jday-capture">
          <div className="jday-moods">
            {(["before", "during", "after"] as const).map((phase) => (
              <div key={phase} className="jday-mood">
                <span className="jday-mood-label">
                  {phase === "before" ? "Before" : phase === "during" ? "During" : "After"}
                </span>
                <div className="jday-mood-dots" role="radiogroup" aria-label={`Mood ${phase} the session`}>
                  {MOOD_LEVELS.map((lvl) => (
                    <button
                      key={lvl.n}
                      type="button"
                      role="radio"
                      aria-checked={mood(phase) === lvl.n}
                      className={"jday-dot" + (mood(phase) === lvl.n ? " jday-dot--on" : "")}
                      title={lvl.label}
                      onClick={() => setMood(phase, lvl.n)}
                    >
                      {lvl.glyph}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="jday-controls">
            <div className="jday-control">
              <span className="jday-mood-label">Rules followed</span>
              <div className="jday-seg">
                {RULES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    data-on={rules === r ? "" : undefined}
                    data-kind={r}
                    onClick={() => updateAttributes({ rules: rules === r ? "" : r })}
                  >
                    {r === "yes" ? "Yes" : r === "partial" ? "Partial" : "No"}
                  </button>
                ))}
              </div>
            </div>
            <div className="jday-control">
              <span className="jday-mood-label">Grade</span>
              <div className="jday-seg">
                {GRADES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    data-on={grade === g ? "" : undefined}
                    onClick={() => updateAttributes({ grade: grade === g ? "" : g })}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        {trades.length === 0 && (
          <div className="jday-hint">Log trades in a /trade table on this page and the numbers fill in live.</div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dayHeader: {
      /** Insert the day summary at the top of the entry (no-op if one exists). */
      insertDayHeader: () => ReturnType;
    };
  }
}

/** Editor HTML for a fresh, empty day header (new entries start with one). */
export const DAY_HEADER_HTML = '<div data-type="day-header"></div>';

const numAttr = (name: string) => ({
  default: 0,
  parseHTML: (el: HTMLElement) => Number(el.getAttribute(`data-${name}`) ?? 0) || 0,
  renderHTML: (attrs: Record<string, unknown>) =>
    attrs[name] ? { [`data-${name}`]: String(attrs[name]) } : {},
});
const strAttr = (name: string) => ({
  default: "",
  parseHTML: (el: HTMLElement) => el.getAttribute(`data-${name}`) ?? "",
  renderHTML: (attrs: Record<string, unknown>) =>
    attrs[name] ? { [`data-${name}`]: String(attrs[name]) } : {},
});

export const DayHeader = Node.create<DayHeaderOptions>({
  name: "dayHeader",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addOptions() {
    return { getDate: () => "" };
  },

  addAttributes() {
    return {
      before: numAttr("before"),
      during: numAttr("during"),
      after: numAttr("after"),
      rules: strAttr("rules"),
      grade: strAttr("grade"),
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="day-header"]' }];
  },
  renderHTML({ HTMLAttributes, node }) {
    // data-filled marks a header the trader actually touched — the commit gate
    // (hasMeaningfulContent) counts those, so a blank auto-inserted header on an
    // untouched new entry still lets the entry be discarded
    const filled =
      Number(node.attrs.before) || Number(node.attrs.during) || Number(node.attrs.after) ||
      node.attrs.rules || node.attrs.grade;
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "day-header", ...(filled ? { "data-filled": "1" } : {}) }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DayHeaderView);
  },

  addCommands() {
    return {
      insertDayHeader:
        () =>
        ({ state, commands }) => {
          let exists = false;
          state.doc.descendants((n) => {
            if (n.type.name === "dayHeader") exists = true;
            return !exists;
          });
          if (exists) return true;
          // below a leading banner (the cover stays first), else at the very top
          const first = state.doc.firstChild;
          const pos = first && first.type.name === "banner" ? first.nodeSize : 0;
          return commands.insertContentAt(pos, { type: this.name });
        },
    };
  },
});

/* ── read the captured values back out of saved HTML (for the trend widget) ── */
export interface DayHeaderData {
  before: number;
  during: number;
  after: number;
  rules: string;
  grade: string;
}
export function parseDayHeader(html: string): DayHeaderData | null {
  if (!html.includes('data-type="day-header"')) return null;
  const el = document.createElement("div");
  el.innerHTML = html;
  const n = el.querySelector('[data-type="day-header"]');
  if (!n) return null;
  const num = (k: string) => Number(n.getAttribute(`data-${k}`) ?? 0) || 0;
  return {
    before: num("before"),
    during: num("during"),
    after: num("after"),
    rules: n.getAttribute("data-rules") ?? "",
    grade: n.getAttribute("data-grade") ?? "",
  };
}
