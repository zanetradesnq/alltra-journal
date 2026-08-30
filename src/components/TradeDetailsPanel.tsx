/**
 * TradeDetailsPanel — the trade, expanded. A right-side sheet (ported from the
 * Alltra desktop's TradeDetailsPanel anatomy): identity head (mark · ticker ·
 * direction · status · account), the hero P&L, the setup chart, then the
 * trade-stats list — the table row's cells grouped exactly like the grid's
 * column groups — and the way back: "Go to entry", the day this trade was
 * written up. Opens from the grid's kebab / symbol mark, trade-link chips and
 * the stats blocks. Read-only here; editing stays in the table.
 */
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ArrowUpRight, Star } from "lucide-react";
import type { TradeRowHit } from "../App";
import type { Trade } from "../trades";
import { useImageSrc } from "../imageStore";

const CHIP_HUES = [
  "#2b7fff", "#8e51ff", "#00b8db", "#00bc7d", "#fe9a00",
  "#f6339a", "#00bba7", "#615fff", "#ff2056", "#00a6f4",
];
function chipHue(symbol: string): string {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) >>> 0;
  return CHIP_HUES[h % CHIP_HUES.length];
}
const STATUS_KEY: Record<string, string> = {
  win: "win", loss: "loss", breakeven: "breakeven", be: "breakeven", open: "open",
};
const numOf = (v: unknown): number => {
  const n = Number.parseFloat(String(v ?? "").replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown): string => (Array.isArray(v) ? "" : String(v ?? "")).trim();

function Img({ src, className, onClick }: { src: string; className?: string; onClick?: () => void }) {
  const url = useImageSrc(src);
  return <img src={url} alt="" className={className} onClick={onClick} loading="lazy" />;
}

export function TradeDetailsPanel({
  tradeId,
  hit,
  trade,
  entryDate,
  onClose,
  onGoToEntry,
}: {
  tradeId: string;
  /** the full table row (null when the table is gone) */
  hit: TradeRowHit | null;
  /** the store's summary (null when the trade isn't logged any more) */
  trade: Trade | null;
  entryDate: string | null;
  onClose: () => void;
  onGoToEntry: (index: number) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cols = hit?.columns ?? [];
  const cell = (re: RegExp, type?: string) => {
    const c = cols.find((cc) => re.test(cc.name) && (!type || cc.type === type));
    return c ? hit?.row.cells[c.id] : undefined;
  };
  const symbol = (str(cell(/symbol|pair/i)) || trade?.symbol || "—").toUpperCase();
  const account = str(cell(/^account$/i)) || trade?.account || "";
  const direction = str(cell(/direction|type|side/i, "select")) || (trade ? (trade.side === "long" ? "Long" : "Short") : "");
  const statusRaw = str(cell(/status/i, "select"));
  const status = STATUS_KEY[statusRaw.toLowerCase()];
  const pnlRaw = cell(/p&l|pnl|profit/i, "num");
  const pnlNum = pnlRaw !== undefined ? numOf(pnlRaw) : (trade?.pnl ?? 0);
  const pnlText =
    pnlRaw !== undefined && str(pnlRaw) !== ""
      ? str(pnlRaw)
      : trade
        ? `${trade.pnl < 0 ? "−" : ""}$${Math.abs(trade.pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : "—";
  const tone = pnlNum > 0 ? "profit" : pnlNum < 0 ? "loss" : undefined;
  const hue = chipHue(symbol);
  const imgs = cols.filter((c) => c.type === "img").flatMap((c) => {
    const v = hit?.row.cells[c.id];
    return Array.isArray(v) ? (v as string[]) : [];
  });

  // the stats list — every column, grouped like the grid (identity/hero
  // columns already shown above are skipped)
  const shownRe = /symbol|pair|^account$|direction|status|p&l|pnl|profit/i;
  const groups: { label: string; rows: { name: string; node: React.ReactNode }[] }[] = [];
  for (const c of cols) {
    if (shownRe.test(c.name) || c.type === "img") continue;
    const v = hit?.row.cells[c.id];
    const s = str(v);
    let node: React.ReactNode = s || "—";
    if (c.type === "select" && s) {
      const opt = c.options?.find((o) => o.label === s);
      node = (
        <span className="tdp-pill" data-color={opt?.color ?? "gray"}>
          {s}
        </span>
      );
    } else if (c.type === "rating") {
      const n = Math.max(0, Math.min(5, Number.parseInt(s, 10) || 0));
      node = (
        <span className="tdp-rating">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} size={14} fill={i <= n ? "currentColor" : "none"} className={i <= n ? "tdp-star--on" : ""} />
          ))}
        </span>
      );
    } else if (/mfe/i.test(c.name) && s) node = <span className="tdp-tone" data-tone="profit">{s}</span>;
    else if (/mae/i.test(c.name) && s) node = <span className="tdp-tone" data-tone="loss">{s}</span>;
    else if (c.type === "url" && /^https?:\/\//i.test(s))
      node = (
        <a href={s} target="_blank" rel="noreferrer" className="tdp-link">
          Open link <ArrowUpRight size={12} />
        </a>
      );
    const label = c.group ?? "Details";
    let g = groups.find((x) => x.label === label);
    if (!g) {
      g = { label, rows: [] };
      groups.push(g);
    }
    g.rows.push({ name: c.name, node });
  }

  return createPortal(
    <div className="tdp-scrim" onMouseDown={onClose}>
      <aside className="tdp" role="dialog" aria-label="Trade details" onMouseDown={(e) => e.stopPropagation()}>
        <header className="tdp-head">
          <span className="tdp-head__title">Trade details</span>
          <span className="tdp-context">
            {entryDate ? entryDate : hit?.entryIndex === -1 ? "Logged in Notes" : ""}
          </span>
          <button type="button" className="tdp-close" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </header>

        <div className="tdp-body">
          {!hit && !trade ? (
            <div className="tdp-empty">
              This trade isn't in the journal any more — its table was deleted or the row removed.
            </div>
          ) : (
            <>
              {/* identity + hero */}
              <section className="tdp-identity">
                <div className="tdp-identity__head">
                  <div className="tdp-identity__row">
                    <span
                      className="tdp-logo"
                      style={{ background: `color-mix(in srgb, ${hue} 14%, transparent)`, color: hue }}
                    >
                      {symbol.slice(0, 2)}
                    </span>
                    <span className="tdp-identity__ticker">{symbol}</span>
                    {direction && <span className="tdp-dir">{direction}</span>}
                    {status && (
                      <span className="tdp-status" data-status={status}>
                        {statusRaw}
                      </span>
                    )}
                  </div>
                  {account && (
                    <span className="tdp-account-chip">
                      <span
                        className="tdp-account-chip__broker"
                        style={{ background: `color-mix(in srgb, ${chipHue(account)} 14%, transparent)`, color: chipHue(account) }}
                      >
                        {account.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="tdp-account-chip__name">{account}</span>
                    </span>
                  )}
                </div>
                <div className="tdp-hero">
                  <span className="tdp-stat__label">Net P&L</span>
                  <span className="tdp-hero__pnl" data-tone={tone}>
                    {pnlText}
                  </span>
                </div>
              </section>

              {/* setup chart */}
              <section className="tdp-chartupload">
                {imgs.length > 0 ? (
                  <div className="tdp-chartupload__filled">
                    <Img src={imgs[0]} className="tdp-chartupload__img" />
                    {imgs.length > 1 && <span className="tdp-chartupload__more">+{imgs.length - 1} more</span>}
                  </div>
                ) : (
                  <div className="tdp-chartupload__zone">No setup chart — attach screenshots in the table's Chart cell.</div>
                )}
              </section>

              {/* trade stats — the row, grouped like the grid */}
              <section className="tdp-stats">
                {groups.map((g) => (
                  <div key={g.label} className="tdp-stats__group">
                    <div className="tdp-stats__grouplabel">{g.label}</div>
                    {g.rows.map((r) => (
                      <div key={r.name} className="tdp-statrow">
                        <span className="tdp-stat__label">{r.name}</span>
                        <span className="tdp-stat__value">{r.node}</span>
                      </div>
                    ))}
                  </div>
                ))}
                {groups.length === 0 && hit && <div className="tdp-empty">No further columns on this trade.</div>}
              </section>
            </>
          )}
        </div>

        <footer className="tdp-foot">
          <span className="tdp-foot__id">#{tradeId.slice(0, 7)}</span>
          {hit && hit.entryIndex >= 0 ? (
            <button type="button" className="tdp-goto" onClick={() => onGoToEntry(hit.entryIndex)}>
              Go to entry <ArrowUpRight size={14} />
            </button>
          ) : (
            <span className="tdp-foot__note">
              {hit ? "Lives in a note" : "Entry unavailable"}
            </span>
          )}
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
