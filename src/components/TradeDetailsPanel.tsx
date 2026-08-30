/**
 * TradeDetailsPanel — the trade, expanded. A 1:1 port of the Alltra desktop's
 * TradeDetailsPanel anatomy (features/product-ui/pages/TradeDetailsPanel @
 * design/alltra-v2): a right-anchored 768px drawer (bottom sheet ≤768px) with
 * an 80px tabs-only header (Overview · Notes & tags), a surface-1 panel that
 * lifts surface-2 cards — the headline card (identity row · hero P&L · 16:9
 * setup chart · action row) and the Trade-stats card (Performance · Prices ·
 * Dates · Metrics groups of 40px hairline rows, with the rating, R-bar and
 * MFE/MAE excursion widget rows). Rebound to the journal's editable table
 * row: figures come from the row's cells; editing stays in the table, so the
 * action row's unbacked ops render disabled with their reason (never hidden).
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Star, Maximize2, RotateCw, Trash2, Copy, ArrowLeftRight, Pencil, Paperclip } from "lucide-react";
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
/* "Aug 24, 2026 09:46" → "Aug 24, 2026 · 09:46" (the panel's date grammar) */
const dateDot = (v: string): string => {
  const m = /^(.*?)\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)$/.exec(v.trim());
  return m ? `${m[1]} · ${m[2]}` : v;
};
const money = (n: number): string =>
  `${n < 0 ? "−" : "+"}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Img({ src, className, alt }: { src: string; className?: string; alt: string }) {
  const url = useImageSrc(src);
  return <img src={url} alt={alt} className={className} loading="lazy" />;
}

/* a 40px secondary icon button; unbacked → disabled with its reason as title */
function IconBtn({
  label,
  reason,
  onClick,
  danger,
  glass,
  children,
}: {
  label: string;
  reason?: string;
  onClick?: () => void;
  danger?: boolean;
  glass?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={"tdp-iconbtn" + (danger ? " tdp-iconbtn--danger" : "") + (glass ? " tdp-iconbtn--glass" : "")}
      aria-label={label}
      title={reason ?? label}
      disabled={!!reason}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

const NOT_YET = {
  transfer: "Transferring a trade between accounts isn't available yet.",
  duplicate: "Duplicate this trade from its row's ⋯ menu in the table.",
  delete: "Delete this trade from its row's ⋯ menu in the table.",
  replace: "Replace screenshots in the table's Chart cell.",
  remove: "Remove screenshots in the table's Chart cell.",
  rate: "Rate this trade in the table's Rating cell.",
};

type Tab = "overview" | "notes";

export function TradeDetailsPanel({
  tradeId,
  hit,
  trade,
  entryDate,
  entryText,
  onClose,
  onGoToEntry,
}: {
  tradeId: string;
  /** the full table row (null when the table is gone) */
  hit: TradeRowHit | null;
  /** the store's summary (null when the trade isn't logged any more) */
  trade: Trade | null;
  entryDate: string | null;
  /** the entry's plain text (the "notes" behind this trade) */
  entryText: string;
  onClose: () => void;
  onGoToEntry: (index: number) => void;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [lightbox, setLightbox] = useState(false);
  const [closing, setClosing] = useState(false);
  // the slide-out timer lives in a ref: a repeat close is ignored, and an
  // unmount (a NEW trade opened mid-slide-out remounts via key) cancels it so
  // the stale timer can't null the new trade's id
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  // keyboard focus enters the dialog on open (the opener — a menu row — has
  // unmounted, so focus would otherwise drop to <body> behind the scrim)
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  // Escape: bubble phase, and respect keys something ABOVE us (Spotlight)
  // already consumed — a capture listener would close the drawer under it
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      if (lightbox) setLightbox(false);
      else close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox]);

  const close = () => {
    if (closing) return;
    setClosing(true);
    timer.current = window.setTimeout(onClose, 200); // mounted through its 200ms slide-out
  };

  /* ── resolve the row into the panel's vocabulary ─────────────────────── */
  const cols = hit?.columns ?? [];
  const col = (re: RegExp, type?: string) => cols.find((c) => re.test(c.name) && (!type || c.type === type));
  const val = (re: RegExp, type?: string) => {
    const c = col(re, type);
    return c ? hit?.row.cells[c.id] : undefined;
  };
  const symbol = (str(val(/symbol|pair/i)) || trade?.symbol || "—").toUpperCase();
  const account = str(val(/^account$/i)) || trade?.account || "";
  const direction = str(val(/direction|type|side/i, "select")) || (trade ? (trade.side === "long" ? "Long" : "Short") : "");
  const statusRaw = str(val(/status/i, "select"));
  const status = STATUS_KEY[statusRaw.toLowerCase()];
  const pnlRaw = val(/p&l|pnl|profit/i, "num");
  const pnlNum = pnlRaw !== undefined && str(pnlRaw) !== "" ? numOf(pnlRaw) : (trade?.pnl ?? 0);
  const hasPnl = (pnlRaw !== undefined && str(pnlRaw) !== "") || !!trade;
  const pnlText = hasPnl ? (str(pnlRaw) || money(pnlNum)) : "—";
  const pnlTone = !hasPnl ? undefined : pnlNum > 0 ? "profit" : pnlNum < 0 ? "loss" : undefined;
  const hue = chipHue(symbol);
  const imgs = cols.filter((c) => c.type === "img").flatMap((c) => {
    const v = hit?.row.cells[c.id];
    return Array.isArray(v) ? (v as string[]) : [];
  });
  const tags = str(val(/^tags$/i, "text"))
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const mfe = str(val(/^mfe$/i));
  const mae = str(val(/^mae$/i));
  const rating = Math.max(0, Math.min(5, Number.parseInt(str(val(/rating/i, "rating")), 10) || 0));
  const rmul = str(val(/r-multiple/i));
  const rmulNum = Number.parseFloat(rmul.replace(/[^0-9.+-]/g, ""));

  /* the stats card — the row's cells grouped like the grid, identity + the
     widget-rendered metrics excluded from the scalar rows */
  const identityRe = /symbol|pair|^account$|direction|status/i;
  const widgetRe = /^mfe$|^mae$|rating|r-multiple|^tags$/i;
  const ORDER = ["Performance", "Prices", "Dates", "Metrics"];
  const groups = new Map<string, { label: string; value: React.ReactNode; tone?: string }[]>();
  for (const c of cols) {
    if (identityRe.test(c.name) || c.type === "img" || widgetRe.test(c.name)) continue;
    const s = str(hit?.row.cells[c.id]);
    const g = c.group && c.group !== "Trade info" && c.group !== "Meta" ? c.group : "Details";
    let value: React.ReactNode = s || "—";
    let tone: string | undefined = s ? undefined : "muted";
    if (c.type === "date" && s) value = dateDot(s);
    if (/p&l|pnl|profit/i.test(c.name) && s) tone = numOf(s) > 0 ? "profit" : numOf(s) < 0 ? "loss" : undefined;
    if (c.type === "select" && s) {
      const opt = c.options?.find((o) => o.label === s);
      value = (
        <span className="tdp-pill" data-color={opt?.color ?? "gray"}>
          {s}
        </span>
      );
    }
    if (c.type === "url" && /^https?:\/\//i.test(s))
      value = (
        <a className="tdp-linkval" href={s} target="_blank" rel="noreferrer">
          Open link
        </a>
      );
    (groups.get(g) ?? groups.set(g, []).get(g)!).push({ label: c.name, value, tone });
  }
  const hasMetricsWidgets = rating > 0 || rmul !== "" || mfe !== "" || mae !== "";
  // the Metrics columns are ALL widget-rendered, so the group never appears in
  // the scalar map — slot the synthetic section at its ORDER position (an
  // append would drop the widgets below misc "Details" rows)
  const groupKeys = [
    ...ORDER.filter((g) => groups.has(g) || (g === "Metrics" && hasMetricsWidgets)),
    ...[...groups.keys()].filter((g) => !ORDER.includes(g)),
  ];

  const fav = Math.abs(numOf(mfe));
  const adv = Math.abs(numOf(mae));
  const scale = Math.max(fav, adv, 1);

  const StatRow = ({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) => (
    <div className="tdp-statrow">
      <span className="tdp-stat__label">{label}</span>
      <span className="tdp-stat__value" data-tone={tone}>
        {value}
      </span>
    </div>
  );

  const goto = hit && hit.entryIndex >= 0 ? () => onGoToEntry(hit.entryIndex) : undefined;

  return createPortal(
    <div className="tdp-scrim" data-state={closing ? "close" : "open"} onMouseDown={close}>
      <aside
        ref={dialogRef}
        tabIndex={-1}
        className="tdp"
        data-state={closing ? "close" : "open"}
        role="dialog"
        aria-modal="true"
        aria-label={`${symbol} trade details`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* header — tabs + close, no title */}
        <header className="tdp-header">
          <div className="tdp-tabs" role="tablist" aria-label="Trade details view">
            {(["overview", "notes"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                data-on={tab === t ? "" : undefined}
                className="tdp-tab"
                onClick={() => setTab(t)}
              >
                {t === "overview" ? "Overview" : "Notes & tags"}
              </button>
            ))}
          </div>
          <button type="button" className="tdp-close" aria-label="Close" onClick={close}>
            <X size={16} />
          </button>
        </header>

        <div className="tdp-body">
          <div className="tdp-stack">
            {!hit && !trade ? (
              <section className="tdp-card">
                <p className="tdp-muted">
                  This trade isn't in the journal any more — its table was deleted or the row removed.
                </p>
              </section>
            ) : tab === "overview" ? (
              <>
                {/* ── headline card ───────────────────────────────────────── */}
                <section className="tdp-card">
                  <div className="tdp-identity__head">
                    <span className="tdp-identity__row">
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
                      {account && (
                        <span className="tdp-account-chip">
                          <span
                            className="tdp-account-chip__mark"
                            style={{ background: `color-mix(in srgb, ${chipHue(account)} 14%, transparent)`, color: chipHue(account) }}
                          >
                            {account.slice(0, 1).toUpperCase()}
                          </span>
                          <span className="tdp-account-chip__name">
                            <span className="tdp-account-chip__broker">Journal</span>
                            <span aria-hidden="true"> · </span>
                            {account}
                          </span>
                        </span>
                      )}
                    </span>
                    <div className="tdp-hero">
                      <span className="tdp-hero__pnl" data-tone={pnlTone}>
                        {pnlText}
                      </span>
                    </div>
                  </div>

                  {/* setup chart — constant 16:9 footprint */}
                  <div className="tdp-chartupload">
                    {imgs.length > 0 ? (
                      <div className="tdp-chartupload__filled">
                        <Img src={imgs[0]} className="tdp-chartupload__img" alt={`${symbol} setup chart`} />
                        <span className="tdp-chartupload__overlay">
                          <IconBtn label="View full screen" glass onClick={() => setLightbox(true)}>
                            <Maximize2 size={16} />
                          </IconBtn>
                          <IconBtn label="Replace chart" glass reason={NOT_YET.replace}>
                            <RotateCw size={16} />
                          </IconBtn>
                          <IconBtn label="Remove chart" glass danger reason={NOT_YET.remove}>
                            <Trash2 size={16} />
                          </IconBtn>
                        </span>
                        {imgs.length > 1 && <span className="tdp-chartupload__more">+{imgs.length - 1} more</span>}
                      </div>
                    ) : (
                      <div className="tdp-dropzone" title="Attach screenshots in the table's Chart cell">
                        <span className="tdp-dropzone__glyph">
                          <Paperclip size={22} />
                        </span>
                        <span className="tdp-dropzone__label">No setup chart</span>
                        <span className="tdp-dropzone__hint">Attach screenshots in the table's Chart cell</span>
                      </div>
                    )}
                  </div>

                  {/* action row — every op renders; unbacked ones say why */}
                  <div className="tdp-card-actions">
                    <IconBtn label="Transfer trade" reason={NOT_YET.transfer}>
                      <ArrowLeftRight size={16} />
                    </IconBtn>
                    <IconBtn label="Duplicate trade" reason={NOT_YET.duplicate}>
                      <Copy size={16} />
                    </IconBtn>
                    <IconBtn label="Delete trade" danger reason={NOT_YET.delete}>
                      <Trash2 size={16} />
                    </IconBtn>
                    <button
                      type="button"
                      className="tdp-primary tdp-card-actions__edit"
                      disabled={!goto}
                      title={goto ? "Open the entry — edit any cell in its table" : "This trade's entry is unavailable"}
                      onClick={goto}
                    >
                      <Pencil size={16} /> Edit in entry
                    </button>
                  </div>
                </section>

                {/* ── trade-stats card ────────────────────────────────────── */}
                <section className="tdp-card tdp-stats">
                  {groupKeys.map((g) => (
                    <div key={g} className="tdp-stats__group">
                      <h3 className="tdp-stats__grouplabel">{g}</h3>
                      {(groups.get(g) ?? []).map((r) => (
                        <StatRow key={r.label} label={r.label} value={r.value} tone={r.tone} />
                      ))}
                      {g === "Metrics" && hasMetricsWidgets && (
                        <>
                          <div className="tdp-statrow tdp-statrow--widget">
                            <span className="tdp-stat__label">Rating</span>
                            <div className="tdp-rating" title={NOT_YET.rate}>
                              {[1, 2, 3, 4, 5].map((n) => (
                                <span key={n} className="tdp-star" data-filled={n <= rating ? "" : undefined}>
                                  <Star size={20} fill={n <= rating ? "currentColor" : "none"} />
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="tdp-statrow tdp-statrow--widget">
                            <span className="tdp-stat__label">R-multiple</span>
                            {rmul !== "" && Number.isFinite(rmulNum) ? (
                              <span className="tdp-rbar">
                                <span className="tdp-rbar__track" aria-hidden="true">
                                  <span
                                    className="tdp-rbar__fill"
                                    data-tone={rmulNum >= 0 ? "profit" : "loss"}
                                    style={{ width: `${String((Math.min(Math.abs(rmulNum), 4) / 4) * 100)}%` }}
                                  />
                                </span>
                                <span className="tdp-rbar__label">{rmul}</span>
                              </span>
                            ) : (
                              <span className="tdp-stat__value" data-tone="muted">
                                —
                              </span>
                            )}
                          </div>
                          {(mfe !== "" || mae !== "") && (
                            <div className="tdp-excursion-block">
                              <div className="tdp-excursion-legend">
                                <div className="tdp-stat">
                                  <span className="tdp-stat__label">MFE</span>
                                  <span className="tdp-stat__value">{mfe || "—"}</span>
                                </div>
                                <div className="tdp-stat">
                                  <span className="tdp-stat__label">MAE</span>
                                  <span className="tdp-stat__value">{mae || "—"}</span>
                                </div>
                              </div>
                              <div
                                className="tdp-excursion"
                                role="img"
                                aria-label={`Excursion range: ${mae || "—"} adverse to ${mfe || "—"} favorable`}
                              >
                                <span className="tdp-excursion__track" aria-hidden="true">
                                  <span
                                    className="tdp-excursion__seg tdp-excursion__seg--adverse"
                                    style={{ width: `${String((adv / scale) * 50)}%` }}
                                  />
                                  <span
                                    className="tdp-excursion__seg tdp-excursion__seg--favorable"
                                    style={{ width: `${String((fav / scale) * 50)}%` }}
                                  />
                                  <span className="tdp-excursion__axis" />
                                </span>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                  {groupKeys.length === 0 && <p className="tdp-muted">No further columns on this trade.</p>}
                </section>
              </>
            ) : (
              <>
                <p className="tdp-context">
                  {symbol}
                  {entryDate ? ` · ${entryDate}` : ""}
                </p>
                {/* tags card */}
                <section className="tdp-card">
                  <div className="tdp-cardhead">
                    <span className="tdp-cardhead__lead">
                      <h3 className="tdp-card__title">Tags</h3>
                      <span className="tdp-cardhead__count">{tags.length}</span>
                    </span>
                    <button
                      type="button"
                      className="tdp-managelink"
                      disabled={!goto}
                      title={goto ? "Edit the Tags cell in the entry's table" : "Entry unavailable"}
                      onClick={goto}
                    >
                      Manage
                    </button>
                  </div>
                  {tags.length > 0 ? (
                    <div className="tdp-tagrow">
                      {tags.map((t) => (
                        <span key={t} className="tdp-tagpill">
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="tdp-tagsempty">No tags on this trade — add them in the table's Tags cell.</p>
                  )}
                </section>
                {/* notes card — the entry this trade lives in */}
                <section className="tdp-card">
                  <div className="tdp-cardhead">
                    <span className="tdp-cardhead__lead">
                      <h3 className="tdp-card__title">Notes</h3>
                    </span>
                    <button
                      type="button"
                      className="tdp-managelink"
                      disabled={!goto}
                      title={goto ? "Open the entry" : "Entry unavailable"}
                      onClick={goto}
                    >
                      Open entry
                    </button>
                  </div>
                  {entryText ? (
                    <p className="tdp-notes">{entryText.length > 700 ? `${entryText.slice(0, 700)}…` : entryText}</p>
                  ) : (
                    <p className="tdp-tagsempty">
                      {hit?.entryIndex === -1
                        ? "This trade was logged in a note."
                        : "Nothing written about this trade yet — the entry is empty."}
                    </p>
                  )}
                </section>
              </>
            )}
          </div>
          <p className="tdp-idline">#{tradeId.slice(0, 7)}</p>
        </div>
      </aside>

      {lightbox && imgs.length > 0 && (
        <div className="tdp-lightbox" onMouseDown={(e) => e.stopPropagation()} onClick={() => setLightbox(false)}>
          <Img src={imgs[0]} className="tdp-lightbox__img" alt={`${symbol} setup chart`} />
          <button
            type="button"
            className="tdp-lightbox__close"
            aria-label="Close"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(false);
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}
