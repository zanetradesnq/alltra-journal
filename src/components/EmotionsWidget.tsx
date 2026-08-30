/**
 * EmotionsWidget — the mood trend across the journal. Every entry's day
 * summary captures mood before / during / after the session (1–5); this reads
 * those values back out of the saved entries and draws the last 14 as grouped
 * bars, with per-phase averages and a one-line read of the pattern.
 */
import { useMemo } from "react";
import { parseDayHeader } from "../extensions/dayHeader";

interface Props {
  pages: string[];
  dates: string[];
  /** the provisional entry index — never counted */
  exclude: number | null;
  /** any value that changes on persist, so the widget re-reads the pages */
  stamp: number;
}

const PHASES = [
  { key: "before", label: "Before", cls: "jemo-bar--before" },
  { key: "during", label: "During", cls: "jemo-bar--during" },
  { key: "after", label: "After", cls: "jemo-bar--after" },
] as const;

const shortDate = (key: string): string => {
  const d = new Date(`${key}T00:00:00`);
  return Number.isNaN(d.getTime()) ? key : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export function EmotionsWidget({ pages, dates, exclude, stamp }: Props) {
  // `pages` is the app's in-place-mutated page array, so its identity never
  // changes — key the (DOM-parsing) scan on the persist stamp instead, or every
  // keystroke would re-parse every entry's HTML
  const rows = useMemo(
    () =>
      pages
        .map((html, i) => ({ i, date: dates[i] ?? "", data: parseDayHeader(html) }))
        .filter(
          (r): r is { i: number; date: string; data: NonNullable<ReturnType<typeof parseDayHeader>> } =>
            r.i !== exclude &&
            r.data !== null &&
            (r.data.before > 0 || r.data.during > 0 || r.data.after > 0),
        )
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.i - b.i))
        .slice(-14),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stamp, dates, exclude],
  );

  if (rows.length === 0) {
    return (
      <p className="jemo-empty">
        Set your mood in an entry's day summary — the trend builds here as you journal.
      </p>
    );
  }

  const avg = (key: (typeof PHASES)[number]["key"]): number | null => {
    const vals = rows.map((r) => r.data[key]).filter((v) => v > 0);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  };
  const aBefore = avg("before");
  const aDuring = avg("during");
  const aAfter = avg("after");

  let insight = "Steady across the session.";
  if (aBefore !== null && aAfter !== null && aAfter > aBefore + 0.4)
    insight = "You finish sessions feeling better than you start.";
  else if (aBefore !== null && aAfter !== null && aAfter < aBefore - 0.4)
    insight = "Sessions are wearing on you — mood drops by the close.";
  else if (
    aDuring !== null &&
    aBefore !== null &&
    aAfter !== null &&
    aDuring < Math.min(aBefore, aAfter) - 0.4
  )
    insight = "Mood dips mid-session — pressure shows up during execution.";

  return (
    <div className="jemo">
      <div className="jemo-chart" role="img" aria-label="Mood trend, last entries">
        {rows.map((r) => (
          <div key={r.i} className="jemo-day" title={shortDate(r.date)}>
            <div className="jemo-bars">
              {PHASES.map((p) => (
                <span
                  key={p.key}
                  className={"jemo-bar " + p.cls}
                  style={{ height: `${String((r.data[p.key] / 5) * 100)}%` }}
                  data-empty={r.data[p.key] === 0 ? "" : undefined}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="jemo-avgs">
        {PHASES.map((p) => {
          const a = p.key === "before" ? aBefore : p.key === "during" ? aDuring : aAfter;
          return (
            <span key={p.key} className="jemo-avg">
              <i className={"jemo-dot " + p.cls} /> {p.label}
              <b>{a === null ? "—" : a.toFixed(1)}</b>
            </span>
          );
        })}
      </div>
      <p className="jemo-insight">{insight}</p>
      <p className="jemo-foot">
        {rows.length} {rows.length === 1 ? "entry" : "entries"} · {shortDate(rows[0].date)} –{" "}
        {shortDate(rows[rows.length - 1].date)}
      </p>
    </div>
  );
}
