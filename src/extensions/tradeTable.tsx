/**
 * TradeTable — a real, editable trading-journal database block (the Notion-style
 * trade log Aayan asked for). One block = one table of trades. Columns are typed
 * (text · number · date · select-with-coloured-tags · link · IMAGE attachments),
 * rows are add/deletable, and a footer sums the numeric columns + counts rows.
 *
 * The whole table state (columns + rows, incl. base64 image attachments) rides in
 * the node's `data` attribute as JSON, so it serialises with the entry and
 * round-trips through the editor. Editing is driven by local React state and
 * committed back to the node on every change (front-end prototype — a real backend
 * + image hosting is the transfer task; base64 is fine for now).
 */
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  X,
  ImagePlus,
  Link2,
  Trash2,
  GripVertical,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Search,
  Star,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  MoreHorizontal,
  CalendarDays,
  List,
  LayoutGrid,
  Filter,
  Columns3,
  Copy,
  Eye,
} from "lucide-react";
import type { Trade } from "../trades";
import { setTableTrades } from "../tradeStore";
import { storeImage, useImageSrc } from "../imageStore";

/* ── model ─────────────────────────────────────────────────────────────────── */
type ColType = "text" | "num" | "date" | "select" | "url" | "img" | "rating";
interface SelectOpt {
  readonly label: string;
  readonly color: string;
}
interface Column {
  id: string;
  name: string;
  type: ColType;
  options?: SelectOpt[];
  sum?: boolean;
  width?: number;
  /** v3 column-group label (Trade info / Performance / …). Contiguous runs of
   *  the same group render one collapsible group-header cell above them; absent
   *  on legacy tables → no group tier renders (fully backward compatible). */
  group?: string;
}
type Cell = string | string[] | null; // text/num/date/url/select = string; img = string[]
interface Row {
  id: string;
  cells: Record<string, Cell>;
}
interface TableData {
  columns: Column[];
  rows: Row[];
  /** singular noun for the add-row button ("trade" → "+ New trade"). */
  addLabel?: string;
  /** stable id — trade tables publish their rows to the trade store under it. */
  id?: string;
}

/* ── tag palette (Notion-style washed pills; readable on light + dark) ─────────── */
const TAG: Record<string, { bg: string; fg: string }> = {
  green: { bg: "rgba(52,199,89,0.16)", fg: "#2ea043" },
  red: { bg: "rgba(255,69,58,0.16)", fg: "#e5484d" },
  gray: { bg: "rgba(142,142,147,0.20)", fg: "#8b8b92" },
  purple: { bg: "rgba(175,82,222,0.18)", fg: "#a24bd8" },
  blue: { bg: "rgba(10,110,240,0.18)", fg: "#3b82f6" },
  orange: { bg: "rgba(255,149,0,0.16)", fg: "#d9730d" },
};
const TAG_KEYS = Object.keys(TAG);
const uid = (): string => Math.random().toString(36).slice(2, 9);

const COL_TYPES: { type: ColType; label: string }[] = [
  { type: "text", label: "Text" },
  { type: "num", label: "Number" },
  { type: "date", label: "Date" },
  { type: "select", label: "Tag" },
  { type: "url", label: "Link" },
  { type: "img", label: "Image" },
  { type: "rating", label: "Rating" },
];

/* ── v3 symbol chip — auto-hue avatar tile, stable per symbol (Alltra v3) ────── */
const CHIP_HUES = [
  "#2b7fff", "#8e51ff", "#00b8db", "#00bc7d", "#fe9a00",
  "#f6339a", "#00bba7", "#615fff", "#ff2056", "#00a6f4",
];
function chipHue(symbol: string): string {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) >>> 0;
  return CHIP_HUES[h % CHIP_HUES.length];
}

/* ── default schema — the v3 Trades-page table, ported 1:1 from the Alltra
   desktop's TradesPagePreview column registry (groups, order, mins). ─────────── */
function defaultData(): TableData {
  const col = (name: string, type: ColType, extra: Partial<Column> = {}): Column => ({
    id: uid(),
    name,
    type,
    ...extra,
  });
  const columns: Column[] = [
    // Trade info (pinned — never collapses)
    col("Symbol", "text", { width: 112, group: "Trade info" }),
    col("Account", "text", { width: 152, group: "Trade info" }),
    col("Direction", "select", {
      width: 96,
      group: "Trade info",
      options: [
        { label: "Long", color: "gray" },
        { label: "Short", color: "gray" },
      ],
    }),
    col("Status", "select", {
      width: 112,
      group: "Trade info",
      options: [
        { label: "Win", color: "green" },
        { label: "Loss", color: "red" },
        { label: "Breakeven", color: "gray" },
        { label: "Open", color: "blue" },
      ],
    }),
    // Performance (primary: Net P&L)
    col("Net P&L", "num", { width: 112, sum: true, group: "Performance" }),
    col("ROI", "text", { width: 80, group: "Performance" }),
    // Prices (primary: Entry)
    col("Entry", "num", { width: 112, group: "Prices" }),
    col("Exit", "num", { width: 112, group: "Prices" }),
    // Dates (primary: Entry date)
    col("Entry date", "date", { width: 112, group: "Dates" }),
    col("Exit date", "date", { width: 112, group: "Dates" }),
    col("Duration", "text", { width: 88, group: "Dates" }),
    // Metrics (primary: Rating)
    col("Rating", "rating", { width: 152, group: "Metrics" }),
    col("R-multiple", "text", { width: 128, group: "Metrics" }),
    col("MFE", "num", { width: 112, group: "Metrics" }),
    col("MAE", "num", { width: 112, group: "Metrics" }),
    // Meta (primary: Tags)
    col("Tags", "text", { width: 184, group: "Meta" }),
    col("Chart", "img", { width: 96, group: "Meta" }),
  ];
  const mk = (vals: (string | string[])[]): Row => {
    const cells: Record<string, Cell> = {};
    columns.forEach((cc, i) => (cells[cc.id] = vals[i] ?? (cc.type === "img" ? [] : "")));
    return { id: uid(), cells };
  };
  // mock rows mirroring the v3 Trades page until the real feed lands
  const rows: Row[] = [
    mk(["NQ", "husseinalmayyahi", "Long", "Win", "$4,520.00", "—", "$29,021.00", "$29,134.00", "Aug 24, 2026 09:46", "Aug 24, 2026 10:06", "20m", "4", "+2.4R", "$960.00", "-$120.00", "breakout", []]),
    mk(["MNQ", "husseinalmayyahi", "Short", "Win", "$152.00", "—", "$29,123.00", "$29,101.00", "Aug 21, 2026 09:03", "Aug 21, 2026 09:14", "11m", "3", "+0.8R", "$210.00", "-$45.00", "scalp", []]),
    mk(["NQ", "husseinalmayyahi", "Short", "Win", "$3,240.00", "—", "$28,731.00", "$28,650.00", "Aug 20, 2026 05:06", "Aug 20, 2026 10:03", "4h 57m", "5", "+3.1R", "$3,400.00", "-$300.00", "swing", []]),
    mk(["NQ", "husseinalmayyahi", "Short", "Loss", "-$700.00", "—", "$28,732.00", "$28,739.00", "Aug 13, 2026 08:03", "Aug 13, 2026 10:13", "2h 10m", "2", "-1.0R", "$150.00", "-$780.00", "faded", []]),
    mk(["NQ", "husseinalmayyahi", "Long", "Loss", "-$280.00", "—", "$29,900.00", "$29,893.00", "Aug 10, 2026 08:12", "Aug 10, 2026 11:03", "2h 51m", "2", "-0.4R", "$95.00", "-$310.00", "chop", []]),
    mk(["NQ", "husseinalmayyahi", "Long", "Win", "$6,800.00", "—", "$28,922.00", "$28,990.00", "Aug 7, 2026 09:04", "Aug 7, 2026 10:16", "1h 12m", "5", "+4.0R", "$7,000.00", "-$200.00", "breakout, A+", []]),
    mk(["NQ", "husseinalmayyahi", "Short", "Win", "$6,700.00", "—", "$28,888.00", "$28,821.00", "Aug 5, 2026 10:00", "Aug 5, 2026 11:04", "1h 04m", "4", "+3.6R", "$6,900.00", "-$260.00", "news", []]),
  ];
  return { columns, rows, addLabel: "trade", id: uid() };
}

/** Map a trade-table's rows to Trade objects for the store (columns matched by name). */
function mapTrades(data: TableData): Trade[] {
  const find = (...names: string[]): string =>
    data.columns.find((c) => names.some((n) => c.name.toLowerCase().includes(n)))?.id ?? "";
  const dateC = find("date");
  const pairC = find("pair", "symbol");
  const typeC = find("type", "side", "direction");
  const pnlC = find("p&l", "pnl", "profit", "p/l");
  return data.rows.flatMap((r) => {
    const symbol = String(r.cells[pairC] ?? "").trim();
    const pnlRaw = String(r.cells[pnlC] ?? "").trim();
    const date = String(r.cells[dateC] ?? "").trim();
    if (!symbol && !pnlRaw && !date) return []; // skip blank rows
    const side: "long" | "short" = String(r.cells[typeC] ?? "").toLowerCase().includes("short") ? "short" : "long";
    const pnl = Number.parseFloat(pnlRaw.replace(/[^0-9.+-]/g, "")) || 0;
    return [{ id: r.id, symbol: symbol || "Trade", side, pnl, date, account: "Journal" }];
  });
}
function blankRow(columns: Column[]): Row {
  const cells: Record<string, Cell> = {};
  columns.forEach((col) => (cells[col.id] = col.type === "img" ? [] : ""));
  return { id: uid(), cells };
}

function parseData(raw: unknown): TableData {
  if (typeof raw === "string" && raw.length > 0) {
    try {
      const d = JSON.parse(raw) as TableData;
      if (Array.isArray(d.columns) && Array.isArray(d.rows)) {
        if (!d.id) d.id = uid();
        return d;
      }
    } catch {
      /* fall through to default */
    }
  }
  return defaultData();
}

/* ── pre-made table presets (the "some pre-made tables like a survey" ask) ─────── */
type ColDef = [name: string, type: ColType, extra?: Partial<Column>];
function makeTable(cols: ColDef[], rowVals: string[][], addLabel = "row"): TableData {
  const columns: Column[] = cols.map(([name, type, extra]) => ({ id: uid(), name, type, ...extra }));
  const rows: Row[] = (rowVals.length ? rowVals : [[]]).map((vals) => {
    const cells: Record<string, Cell> = {};
    columns.forEach((c, i) => (cells[c.id] = c.type === "img" ? [] : vals[i] ?? ""));
    return { id: uid(), cells };
  });
  return { columns, rows, addLabel };
}
const YES_NO: SelectOpt[] = [
  { label: "YES", color: "green" },
  { label: "NO", color: "red" },
];

/** Trading self-assessment — a survey of questions you answer after a session. */
function surveyData(): TableData {
  return makeTable(
    [
      ["Question", "text", { width: 340 }],
      [
        "Answer",
        "select",
        {
          width: 130,
          options: [
            { label: "Yes", color: "green" },
            { label: "Somewhat", color: "orange" },
            { label: "No", color: "red" },
          ],
        },
      ],
      ["Notes", "text", { width: 320 }],
    ],
    [
      ["Did I follow my trading plan?"],
      ["Did I stick to my risk per trade?"],
      ["Was I patient and waited for A+ setups?"],
      ["Did emotions drive any of my decisions?"],
      ["Did I journal every trade honestly?"],
      ["Would I take these exact trades again?"],
    ],
  );
}

/** Weekly review — one row per week, the metrics + reflection that matter. */
function weeklyData(): TableData {
  return makeTable(
    [
      ["Week", "date", { width: 150 }],
      ["Trades", "num", { width: 80, sum: true }],
      ["Win rate", "text", { width: 90 }],
      ["Net P&L", "num", { width: 100, sum: true }],
      ["Best trade", "text", { width: 170 }],
      ["Biggest mistake", "text", { width: 200 }],
      [
        "Emotion",
        "select",
        {
          width: 120,
          options: [
            { label: "Calm", color: "green" },
            { label: "Confident", color: "blue" },
            { label: "Anxious", color: "orange" },
            { label: "Frustrated", color: "red" },
            { label: "FOMO", color: "purple" },
          ],
        },
      ],
      [
        "Followed plan",
        "select",
        {
          width: 120,
          options: [
            { label: "YES", color: "green" },
            { label: "PARTIAL", color: "orange" },
            { label: "NO", color: "red" },
          ],
        },
      ],
      [
        "Grade",
        "select",
        {
          width: 80,
          options: [
            { label: "A", color: "green" },
            { label: "B", color: "blue" },
            { label: "C", color: "orange" },
            { label: "D", color: "red" },
          ],
        },
      ],
      ["Lesson", "text", { width: 240 }],
    ],
    [[]],
    "week",
  );
}

/** Pre-trade checklist — tick each item before you take a trade. */
function checklistData(): TableData {
  return makeTable(
    [
      ["Checklist item", "text", { width: 340 }],
      ["Done", "select", { width: 100, options: YES_NO }],
      ["Note", "text", { width: 280 }],
    ],
    [
      ["Market structure aligns with my bias"],
      ["Setup matches my playbook"],
      ["Risk is ≤ 1% of the account"],
      ["Stop loss + target defined before entry"],
      ["No high-impact news in the next hour"],
      ["Not revenge trading / chasing / FOMO"],
    ],
    "item",
  );
}

/** Mistakes / filter — log recurring errors, tag the cause, capture the fix. */
function mistakesData(): TableData {
  return makeTable(
    [
      ["Date", "date", { width: 130 }],
      ["Mistake", "text", { width: 260 }],
      [
        "Category",
        "select",
        {
          width: 130,
          options: [
            { label: "Discipline", color: "red" },
            { label: "Risk", color: "orange" },
            { label: "Entry", color: "blue" },
            { label: "Exit", color: "purple" },
            { label: "Psychology", color: "gray" },
          ],
        },
      ],
      ["Fix / lesson", "text", { width: 300 }],
    ],
    [
      ["", "Moved my stop loss further from entry", "Discipline", "Set the stop before entry — never widen it"],
      ["", "Entered before the setup confirmed", "Entry", "Wait for the candle to close"],
    ],
    "mistake",
  );
}

const PRESETS: Record<string, () => TableData> = {
  trade: defaultData,
  survey: surveyData,
  weekly: weeklyData,
  checklist: checklistData,
  mistakes: mistakesData,
};

/**
 * Serialise a preset table to the editor HTML the node parses back (for the
 * assembled "Trading Journal" template). The `id` is stripped so parseData backs
 * a fresh one per application — otherwise two copies would collide in the store.
 */
export function tradeTableHTML(preset = "trade"): string {
  const data = (PRESETS[preset] ?? defaultData)();
  delete data.id;
  const json = JSON.stringify(data)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return `<div data-type="trade-table" data-rows="${json}"></div>`;
}

/* ── a colour-tag select cell ──────────────────────────────────────────────────── */
function SelectCell({
  value,
  options,
  onChange,
  onAddOption,
  renderValue,
}: {
  value: string;
  options: SelectOpt[];
  onChange: (v: string) => void;
  onAddOption?: (label: string) => void;
  /** v3 pill override — rendered instead of the default tag when set. */
  renderValue?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const opt = options.find((o) => o.label === value);
  useEffect(() => {
    if (!open) return;
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ x: r.left, y: r.bottom + 4 });
    const close = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      // containment, not identity — the click lands on the pill/icon INSIDE
      // the trigger, and identity made mousedown close + click reopen
      if (!t.closest?.("[data-tt-pop]") && !btnRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("mousedown", close, true);
    return () => document.removeEventListener("mousedown", close, true);
  }, [open]);
  return (
    <>
      <button ref={btnRef} type="button" className="tt-tag-btn" onClick={() => setOpen((o) => !o)}>
        {renderValue !== undefined && value !== "" ? (
          renderValue
        ) : opt ? (
          <span className="tt-tag" style={{ background: TAG[opt.color]?.bg, color: TAG[opt.color]?.fg }}>
            {opt.label}
          </span>
        ) : (
          <span className="tt-empty" />
        )}
      </button>
      {open &&
        pos &&
        createPortal(
          <div data-tt-pop className="tt-pop" style={{ left: pos.x, top: pos.y }}>
            {options.map((o) => (
              <button
                key={o.label}
                type="button"
                className="tt-pop-row"
                onClick={() => {
                  onChange(o.label);
                  setOpen(false);
                }}
              >
                <span className="tt-tag" style={{ background: TAG[o.color]?.bg, color: TAG[o.color]?.fg }}>
                  {o.label}
                </span>
              </button>
            ))}
            {value !== "" && (
              <button
                type="button"
                className="tt-pop-row tt-pop-clear"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                Clear
              </button>
            )}
            {onAddOption && (
              <button
                type="button"
                className="tt-pop-row tt-pop-add"
                onClick={() => {
                  const label = window.prompt("New tag label")?.trim();
                  if (label) onAddOption(label);
                  setOpen(false);
                }}
              >
                <Plus size={12} /> New option
              </button>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

/* ── the column header menu — rename · retype · move · delete ──────────────────── */
function ColumnMenu({
  col,
  canDelete,
  onRename,
  onType,
  onMove,
  onDelete,
  onClose,
  anchor,
}: {
  col: Column;
  canDelete: boolean;
  onRename: (name: string) => void;
  onType: (type: ColType) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
  onClose: () => void;
  anchor: { x: number; y: number };
}) {
  const [name, setName] = useState(col.name);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest?.("[data-tt-colmenu]")) onClose();
    };
    document.addEventListener("mousedown", close, true);
    return () => document.removeEventListener("mousedown", close, true);
  }, [onClose]);
  return createPortal(
    <div data-tt-colmenu className="tt-colmenu" style={{ left: anchor.x, top: anchor.y }}>
      <input
        className="tt-colmenu-name"
        value={name}
        autoFocus
        onChange={(e) => setName(e.target.value)}
        onBlur={() => onRename(name.trim() || col.name)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") {
            onRename(name.trim() || col.name);
            onClose();
          }
        }}
      />
      <div className="tt-colmenu-types">
        {COL_TYPES.map((t) => (
          <button
            key={t.type}
            type="button"
            className={"tt-colmenu-type" + (col.type === t.type ? " tt-on" : "")}
            onClick={() => onType(t.type)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="tt-colmenu-sep" />
      <button type="button" className="tt-colmenu-row" onClick={() => onMove(-1)}>
        <ChevronLeft size={14} /> Move left
      </button>
      <button type="button" className="tt-colmenu-row" onClick={() => onMove(1)}>
        <ChevronRight size={14} /> Move right
      </button>
      {canDelete && (
        <button type="button" className="tt-colmenu-row tt-colmenu-del" onClick={onDelete}>
          <Trash2 size={13} /> Delete column
        </button>
      )}
    </div>,
    document.body,
  );
}

/* an <img> whose src may be an idb:// reference (resolved to an object URL) */
function ResolvedImg({
  src,
  alt,
  onClick,
}: {
  src: string;
  alt: string;
  onClick?: () => void;
}) {
  const url = useImageSrc(src);
  return <img src={url} alt={alt} onClick={onClick} />;
}

/* ── an image-attachment cell (Aayan's "click and attach images to a trade") ───── */
function ImageCell({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (files.length === 0) return;
    // screenshots go to IndexedDB; the cell keeps only idb:// references
    void Promise.all(files.map((f) => storeImage(f))).then((refs) => onChange([...value, ...refs]));
  };
  return (
    <div className="tt-imgs">
      {value.map((src, i) => (
        <span key={i} className="tt-thumb">
          <ResolvedImg src={src} alt="" onClick={() => setLightbox(src)} />
          <button
            type="button"
            className="tt-thumb-x"
            title="Remove"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <button type="button" className="tt-attach" title="Attach screenshots" onClick={() => fileRef.current?.click()}>
        <ImagePlus size={14} />
      </button>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />
      {lightbox &&
        createPortal(
          <div className="tt-lightbox" onClick={() => setLightbox(null)}>
            <ResolvedImg src={lightbox} alt="" />
          </div>,
          document.body,
        )}
    </div>
  );
}

/* ── a plain editable cell (text / num / date) + url cell ──────────────────────── */
function TextCell({
  value,
  type,
  onCommit,
  tone,
}: {
  value: string;
  type: ColType;
  onCommit: (v: string) => void;
  /** v3 valence color for the display value (Net P&L green/red). */
  tone?: "profit" | "loss" | null;
}) {
  const [v, setV] = useState(value);
  const [editing, setEditing] = useState(false);
  useEffect(() => setV(value), [value]);
  if (type === "url") {
    return (
      <div className="tt-url">
        {/^https?:\/\//i.test(value) ? (
          <a href={value} target="_blank" rel="noreferrer" className="tt-url-link" onClick={(e) => e.stopPropagation()}>
            <Link2 size={12} /> Link
          </a>
        ) : null}
        <input
          className="tt-url-input"
          value={v}
          placeholder=""
          onChange={(e) => setV(e.target.value)}
          onBlur={() => onCommit(v)}
          onKeyDown={(e) => e.stopPropagation()}
        />
      </div>
    );
  }
  const isNum = type === "num";
  const toneClass = tone === "profit" ? " tt-profit" : tone === "loss" ? " tt-loss" : "";
  // non-focused, non-empty cells render a truncating display span — inputs can't
  // ellipsis, so a long value like "1920.18" clips mid-glyph in a narrow column.
  // Click swaps to the editable input (Notion's exact behaviour).
  if (!editing && value !== "") {
    return (
      <div
        className={"tt-val" + (isNum ? " tt-num" : "") + toneClass}
        title={value}
        onClick={() => setEditing(true)}
      >
        {value}
      </div>
    );
  }
  // v3: an empty, non-focused cell shows a quiet em dash ("unknown", not zero);
  // clicking it swaps to the input, exactly like a filled cell
  if (!editing && value === "") {
    return (
      <div className={"tt-val tt-dash" + (isNum ? " tt-num" : "")} onClick={() => setEditing(true)}>
        —
      </div>
    );
  }
  return (
    <input
      className={"tt-input" + (isNum ? " tt-num" : "") + toneClass}
      value={v}
      autoFocus={editing}
      inputMode={isNum ? "decimal" : undefined}
      onFocus={() => setEditing(true)}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        setEditing(false);
        onCommit(v);
      }}
      onKeyDown={(e) => e.stopPropagation()}
    />
  );
}

/* ── v3 rating cell — five interactive stars (hover preview, click to set/clear) ── */
function StarsCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [hover, setHover] = useState(0);
  const set = Math.max(0, Math.min(5, Number.parseInt(value, 10) || 0));
  const shown = hover || set;
  return (
    <div className="tt-stars" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={"tt-star" + (n <= shown ? " tt-star--on" : "")}
          title={`${n} star${n === 1 ? "" : "s"}`}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n === set ? "" : String(n))}
        >
          <Star size={14} fill={n <= shown ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════════
   The v3 Trades-page grid — a 1:1 port of the Alltra desktop's TradesPagePreview
   table (features/product-ui/pages/TradesPagePreview.tsx/.css @ design/alltra-v2):
   CSS grid + subgrid rows, interpolating collapse tracks, two sticky header tiers,
   sort, selection, kebab actions, toolbar and 3-zone footer — rebound to the
   journal's editable TableData model (cells stay click-to-fill, rows auto-log).
   ═══════════════════════════════════════════════════════════════════════════════ */

/* per-column grid weight, keyed by the v3 registry's names; fallback 1 */
const V3_WEIGHT: Record<string, number> = {
  symbol: 1.1, account: 1.2, direction: 0.9, status: 0.8,
  "net p&l": 1.2, roi: 0.8, entry: 0.9, exit: 0.9,
  "entry date": 1.1, "exit date": 1.1, duration: 0.8,
  rating: 0.9, "r-multiple": 0.9, mfe: 0.8, mae: 0.8,
  tags: 1.2, chart: 0.6, notes: 1.6,
};
const v3Weight = (c: Column): number => V3_WEIGHT[c.name.toLowerCase()] ?? 1;
const v3Min = (c: Column): number => c.width ?? 120;
const isNumericCol = (c: Column): boolean =>
  c.type === "num" || /duration|r-multiple/i.test(c.name);
/* the identity/outcome floor — always visible, can't be hidden */
const isLockedCol = (c: Column): boolean => /symbol|pair|status|p&l|pnl/i.test(c.name);
const isSortableCol = (c: Column): boolean =>
  c.type === "num" || c.type === "date" || c.type === "rating" ||
  /symbol|pair|duration|r-multiple/i.test(c.name);

const numOf = (v: Cell): number => {
  const n = Number.parseFloat(String(v ?? "").replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
/* "Aug 24, 2026 09:46" → { date: "Aug 24, 2026", time: "09:46" } */
function splitDateTime(v: string): { date: string; time: string } {
  const m = /^(.*?)\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)$/.exec(v.trim());
  return m ? { date: m[1], time: m[2] } : { date: v, time: "" };
}
const STATUS_KEY: Record<string, string> = {
  win: "win", loss: "loss", breakeven: "breakeven", be: "breakeven", open: "open",
};

/* v3 SelectCheck — a painted 16px checkbox button (role=checkbox) */
function V3Check({
  checked,
  indeterminate,
  label,
  onToggle,
}: {
  checked: boolean;
  indeterminate?: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={label}
      className="tpp-check"
      data-on={checked || indeterminate ? "" : undefined}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      {indeterminate ? <span className="tpp-check__bar" /> : checked ? <Check size={11} strokeWidth={3} /> : null}
    </button>
  );
}

/* v3 RBar — the realized R-multiple 48×4 track + signed label */
function RBar({ value }: { value: string }) {
  const r = Number.parseFloat(value.replace(/[^0-9.+-]/g, ""));
  if (value.trim() === "" || !Number.isFinite(r)) return <span className="tpp-metricval">—</span>;
  const frac = Math.min(Math.abs(r), 4) / 4;
  return (
    <span className="tpp-rbar">
      <span className="tpp-rbar__track">
        <span
          className="tpp-rbar__fill"
          data-tone={r >= 0 ? "profit" : "loss"}
          style={{ width: `${String(frac * 100)}%` }}
        />
      </span>
      <span className="tpp-metricval">{value}</span>
    </span>
  );
}

/* every LIVE table view claims its store id here — a second mount with the
   same id (a duplicated block) is detected and re-minted at mount */
const liveTableIds = new Map<string, symbol>();

/* v3 view state survives the inline↔fullscreen remount via this per-table
   cache (the fullscreen overlay portals the surface, remounting the React
   tree — without the cache every search/sort/selection reset on toggle) */
interface V3ViewState {
  query: string;
  page: number;
  perPage: number;
  collapsed: ReadonlySet<string>;
  hidden: ReadonlySet<string>;
  sort: { colId: string; dir: "asc" | "desc" } | null;
  selected: ReadonlySet<string>;
  view: "table" | "cards";
  filterResult: string;
  filterDir: string;
}
const v3ViewCache = new Map<string, V3ViewState>();

/** Ask the app to open a trade's details panel (node views have no App access). */
export const openTradeDetails = (tradeId: string): void => {
  window.dispatchEvent(new CustomEvent("alltra:trade", { detail: { id: tradeId } }));
};

/* v3 kebab — per-row actions dropdown (portal, bottom-end) */
function RowKebab({
  onView,
  onDuplicate,
  onDelete,
}: {
  onView: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!open) return;
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ x: r.right, y: r.bottom + 4 });
    const close = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest?.("[data-tpp-kebab]") && !btnRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("mousedown", close, true);
    return () => document.removeEventListener("mousedown", close, true);
  }, [open]);
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="tpp-kebab"
        aria-label="Trade actions"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <MoreHorizontal size={16} />
      </button>
      {open &&
        pos &&
        createPortal(
          <div data-tpp-kebab className="tpp-menu" style={{ left: pos.x - 176, top: pos.y }}>
            <button
              type="button"
              className="tpp-menu__row"
              onClick={() => {
                onView();
                setOpen(false);
              }}
            >
              <Eye size={14} /> View details
            </button>
            <button
              type="button"
              className="tpp-menu__row"
              onClick={() => {
                onDuplicate();
                setOpen(false);
              }}
            >
              <Copy size={14} /> Duplicate trade
            </button>
            <div className="tpp-menu__sep" />
            <button
              type="button"
              className="tpp-menu__row tpp-menu__row--danger"
              onClick={() => {
                onDelete();
                setOpen(false);
              }}
            >
              <Trash2 size={14} /> Delete trade
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}

interface V3Props {
  data: TableData;
  setCell: (rowId: string, colId: string, val: Cell) => void;
  addRow: () => void;
  delRow: (rowId: string) => void;
  /** one commit for the whole set — per-id delRow calls would overwrite each other */
  delRows: (ids: ReadonlySet<string>) => void;
  duplicateRow: (rowId: string) => void;
  addColumn: () => void;
  openColMenu: (colId: string, x: number, y: number) => void;
  addOptionAndSelect: (rowId: string, colId: string, label: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
}

function TradeTableV3({
  data,
  setCell,
  addRow,
  delRow,
  delRows,
  duplicateRow,
  addColumn,
  openColMenu,
  addOptionAndSelect,
  expanded,
  onToggleExpand,
}: V3Props) {
  /* view-only state — never persisted into the node; seeded from (and written
     back to) the per-table cache so it survives the fullscreen remount */
  const cached = v3ViewCache.get(data.id ?? "");
  const [query, setQuery] = useState(cached?.query ?? "");
  const [page, setPage] = useState(cached?.page ?? 1);
  const [perPage, setPerPage] = useState(cached?.perPage ?? 25);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => cached?.collapsed ?? new Set());
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => cached?.hidden ?? new Set());
  const [sort, setSort] = useState<{ colId: string; dir: "asc" | "desc" } | null>(cached?.sort ?? null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => cached?.selected ?? new Set());
  const [collapseMotion, setCollapseMotion] = useState(false);
  const [view, setView] = useState<"table" | "cards">(cached?.view ?? "table");
  const [filterResult, setFilterResult] = useState<string>(cached?.filterResult ?? "all");
  const [filterDir, setFilterDir] = useState<string>(cached?.filterDir ?? "all");
  useEffect(() => {
    if (data.id)
      v3ViewCache.set(data.id, { query, page, perPage, collapsed, hidden, sort, selected, view, filterResult, filterDir });
  });
  const [panel, setPanel] = useState<"filters" | "columns" | null>(null);
  const panelBtnRef = useRef<HTMLButtonElement>(null);
  const colsBtnRef = useRef<HTMLButtonElement>(null);
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null);

  /* role columns, resolved by name against the live column list */
  const byName = (re: RegExp) => data.columns.find((c) => re.test(c.name))?.id;
  const symbolCol = data.columns.find((c) => c.type === "text" && /symbol|pair/i.test(c.name))?.id;
  const accountCol = byName(/^account$/i);
  const statusCol = data.columns.find((c) => c.type === "select" && /status/i.test(c.name))?.id;
  const directionCol = data.columns.find(
    (c) => c.type === "select" && /direction|type|side/i.test(c.name),
  )?.id;
  const pnlCol = data.columns.find((c) => c.type === "num" && /p&l|pnl|profit/i.test(c.name))?.id;
  const mfeCol = byName(/^mfe$/i);
  const maeCol = byName(/^mae$/i);
  const rmulCol = byName(/r-multiple/i);
  const tagsCol = data.columns.find((c) => c.type === "text" && /^tags$/i.test(c.name))?.id;

  /* group plans — contiguous runs; a collapsed group keeps its FIRST visible column */
  const liveCols = data.columns.filter((c) => !hidden.has(c.id) || isLockedCol(c));
  const runs: { group: string; cols: Column[]; collapsible: boolean; collapsed: boolean; primary?: string }[] = [];
  for (const c of liveCols) {
    const g = c.group ?? "";
    const last = runs[runs.length - 1];
    if (last && last.group === g) last.cols.push(c);
    else runs.push({ group: g, cols: [c], collapsible: false, collapsed: false });
  }
  for (const run of runs) {
    run.collapsible = run.group !== "" && run.group !== "Trade info" && run.cols.length > 1;
    run.collapsed = run.collapsible && collapsed.has(run.group);
    run.primary = run.cols[0]?.id;
  }
  const collapsedCol = (run: (typeof runs)[number], colId: string): boolean =>
    run.collapsed && colId !== run.primary;

  const toggleGroup = (g: string) => {
    setCollapseMotion(true);
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  };

  /* rows — filter → sort → page */
  const q = query.trim().toLowerCase();
  let rows = data.rows;
  if (q)
    rows = rows.filter((r) =>
      data.columns.some((c) => {
        const v = r.cells[c.id];
        return typeof v === "string" && v.toLowerCase().includes(q);
      }),
    );
  if (filterResult !== "all" && statusCol)
    rows = rows.filter(
      (r) => (STATUS_KEY[String(r.cells[statusCol] ?? "").toLowerCase()] ?? "") === filterResult,
    );
  if (filterDir !== "all" && directionCol)
    rows = rows.filter(
      (r) => String(r.cells[directionCol] ?? "").toLowerCase() === filterDir,
    );
  if (sort) {
    const col = data.columns.find((c) => c.id === sort.colId);
    if (col) {
      const val = (r: Row): number | string => {
        const raw = r.cells[col.id];
        if (col.type === "num" || col.type === "rating" || /duration|r-multiple/i.test(col.name))
          return col.name.toLowerCase() === "duration"
            ? (() => {
                const h = /(\d+)\s*h/.exec(String(raw ?? ""));
                const m = /(\d+)\s*m/.exec(String(raw ?? ""));
                return Number(h?.[1] ?? 0) * 60 + Number(m?.[1] ?? 0);
              })()
            : numOf(raw);
        if (col.type === "date") {
          const t = Date.parse(String(raw ?? ""));
          return Number.isNaN(t) ? 0 : t;
        }
        return String(raw ?? "").toLowerCase();
      };
      const mul = sort.dir === "asc" ? 1 : -1;
      rows = [...rows].sort((a, b) => {
        const va = val(a);
        const vb = val(b);
        return (va < vb ? -1 : va > vb ? 1 : 0) * mul;
      });
    }
  }
  const filtered = rows;
  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, pageCount);
  // write the clamp back — a stale out-of-range page number would resurface
  // (and jump the view) the next time the row count grows
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);
  const pageRows = filtered.slice((safePage - 1) * perPage, safePage * perPage);
  const firstShown = filtered.length === 0 ? 0 : (safePage - 1) * perPage + 1;
  const lastShown = (safePage - 1) * perPage + pageRows.length;

  const cycleSort = (colId: string) =>
    setSort((prev) =>
      prev?.colId !== colId
        ? { colId, dir: "desc" }
        : prev.dir === "desc"
          ? { colId, dir: "asc" }
          : null,
    );

  /* selection */
  const pageIds = pageRows.map((r) => r.id);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someSelected = !allSelected && pageIds.some((id) => selected.has(id));
  // merge with the previous set — replacing it would silently discard rows
  // selected on OTHER pages right before a bulk delete
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /* grid geometry — the state-computed inline styles (ported verbatim) */
  const dataTracks = runs.flatMap((run) =>
    run.cols.map((c) =>
      collapsedCol(run, c.id)
        ? "minmax(0px, 0fr)"
        : `minmax(${String(v3Min(c))}px, ${String(v3Weight(c))}fr)`,
    ),
  );
  const liveMins = runs.reduce(
    (s, run) => s + run.cols.reduce((t, c) => t + (collapsedCol(run, c.id) ? 0 : v3Min(c)), 0),
    0,
  );
  const gridTemplateColumns = ["64px", ...dataTracks, "80px"].join(" ");
  const gridMinWidth = liveMins + 64 + 80;
  const bodyCount = pageRows.length + (pageRows.length === 0 ? 1 : 0);
  // legacy tables (no group fields) skip the tier-1 group row entirely — a
  // blank sticky strip would read as a broken empty header
  const hasGroups = runs.some((r) => r.group !== "");
  const headerTiers = hasGroups ? 2 : 1;
  const gridTemplateRows = `repeat(${String(headerTiers + bodyCount)}, max-content) minmax(0, 1fr)`;
  /* Σ sums for the footer count line (the v3 footer has no sum row) */
  // sums describe the FILTERED set the count line beside them describes
  const sums = data.columns
    .filter((c) => c.sum)
    .map((c) => ({
      name: c.name,
      total: filtered.reduce((s, r) => s + numOf(r.cells[c.id]), 0),
    }));

  const activeFilters = (filterResult !== "all" ? 1 : 0) + (filterDir !== "all" ? 1 : 0);
  const noun = "trade";
  const nounFor = (n: number) => (n === 1 ? noun : `${noun}s`);
  const dateColId = data.columns.find((c) => c.type === "date")?.id;

  // the fresh blank row must be VISIBLE in THIS surface's own view state:
  // clear search/filters/sort and jump to the page the new row lands on
  const addTrade = () => {
    addRow();
    setQuery("");
    setFilterResult("all");
    setFilterDir("all");
    setSort(null);
    setPage(Math.max(1, Math.ceil((data.rows.length + 1) / perPage)));
  };

  const openPanel = (which: "filters" | "columns", ref: { current: HTMLButtonElement | null }) => {
    if (panel === which) {
      setPanel(null);
      return;
    }
    const r = ref.current?.getBoundingClientRect();
    if (r) setPanelPos({ x: r.right, y: r.bottom + 6 });
    setPanel(which);
  };
  useEffect(() => {
    if (!panel) return;
    const close = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest?.("[data-tpp-panel]") && !t.closest?.(".tpp-filterbtn")) setPanel(null);
    };
    document.addEventListener("mousedown", close, true);
    return () => document.removeEventListener("mousedown", close, true);
  }, [panel]);

  /* cell renderer — v3 anatomy over editable journal cells */
  const cell = (r: Row, c: Column) => {
    const raw = r.cells[c.id];
    const str = String(raw ?? "");
    if (c.id === symbolCol) {
      const sym = str.trim().toUpperCase();
      const hue = chipHue(sym || "?");
      return (
        <span className="tpp-symcell">
          {/* the mark is the row's "open details" affordance (the label stays editable) */}
          <button
            type="button"
            className="tpp-logo tpp-logo--btn"
            title="View trade details"
            style={
              sym
                ? { background: `color-mix(in srgb, ${hue} 14%, transparent)`, color: hue }
                : undefined
            }
            onClick={() => openTradeDetails(r.id)}
          >
            {sym.slice(0, 2)}
          </button>
          <span className="tpp-symbol">
            <TextCell value={str} type="text" onCommit={(v) => setCell(r.id, c.id, v)} />
          </span>
        </span>
      );
    }
    if (c.id === accountCol) {
      const hue = chipHue(str || "?");
      return (
        <span className="tpp-account">
          {str.trim() !== "" && (
            <span
              className="tpp-logo"
              style={{ background: `color-mix(in srgb, ${hue} 14%, transparent)`, color: hue }}
            >
              {str.trim().slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="tpp-account__name">
            <TextCell value={str} type="text" onCommit={(v) => setCell(r.id, c.id, v)} />
          </span>
        </span>
      );
    }
    if (c.type === "select") {
      const isStatus = c.id === statusCol;
      const isDir = c.id === directionCol;
      const key = STATUS_KEY[str.toLowerCase()];
      return (
        <SelectCell
          value={str}
          options={c.options ?? []}
          onChange={(v) => setCell(r.id, c.id, v)}
          onAddOption={(label) => addOptionAndSelect(r.id, c.id, label)}
          renderValue={
            isStatus && key ? (
              <span className="tpp-status" data-status={key}>
                {str}
              </span>
            ) : isDir && str !== "" ? (
              <span className="tpp-dir">{str}</span>
            ) : undefined
          }
        />
      );
    }
    if (c.type === "rating")
      return <StarsCell value={str} onChange={(v) => setCell(r.id, c.id, v)} />;
    if (c.type === "img") {
      const imgs = Array.isArray(raw) ? raw : [];
      // ImageCell as-is — the .tpp-chartcell CSS restyles its thumbs to the v3
      // 64×36 chart-thumb look (lightbox + remove + attach all keep working)
      return (
        <span className="tpp-chartcell">
          <ImageCell value={imgs} onChange={(v) => setCell(r.id, c.id, v)} />
        </span>
      );
    }
    if (c.type === "date") {
      const { date, time } = splitDateTime(str);
      if (str.trim() === "")
        return <TextCell value="" type="date" onCommit={(v) => setCell(r.id, c.id, v)} />;
      return <DateEdit value={str} date={date} time={time} onCommit={(v) => setCell(r.id, c.id, v)} />;
    }
    if (c.id === tagsCol && str.trim() !== "") {
      return (
        <InlineEdit
          value={str}
          onCommit={(v) => setCell(r.id, c.id, v)}
          display={
            <span className="tpp-tags">
              {str.split(",").map((t, i) => (
                <span key={`${t}-${String(i)}`} className="tpp-tag-mini">
                  {t.trim()}
                </span>
              ))}
            </span>
          }
        />
      );
    }
    if (c.id === rmulCol) {
      return (
        <InlineEdit
          value={str}
          onCommit={(v) => setCell(r.id, c.id, v)}
          display={<RBar value={str} />}
        />
      );
    }
    const tone =
      c.id === pnlCol
        ? numOf(raw) > 0
          ? ("profit" as const)
          : numOf(raw) < 0
            ? ("loss" as const)
            : null
        : c.id === mfeCol && str.trim() !== ""
          ? ("profit" as const)
          : c.id === maeCol && str.trim() !== ""
            ? ("loss" as const)
            : null;
    return <TextCell value={str} type={c.type} tone={tone} onCommit={(v) => setCell(r.id, c.id, v)} />;
  };

  const pagePills: (number | "…")[] = [];
  if (pageCount <= 7) for (let p = 1; p <= pageCount; p++) pagePills.push(p);
  else {
    pagePills.push(1);
    if (safePage > 3) pagePills.push("…");
    for (let p = Math.max(2, safePage - 1); p <= Math.min(pageCount - 1, safePage + 1); p++) pagePills.push(p);
    if (safePage < pageCount - 2) pagePills.push("…");
    pagePills.push(pageCount);
  }

  return (
    <div className="tpp-container">
      {/* ── toolbar — search · range · view · filters · columns · add ─────── */}
      <div className="tpp-toolbar">
        <div className="tpp-toolbar__search">
          <Search size={15} className="tpp-search__ico" />
          <input
            value={query}
            placeholder="Search trades..."
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            onKeyDown={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="tpp-kbd"
            title="Open search (⌘K)"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => window.dispatchEvent(new CustomEvent("alltra:spotlight"))}
          >
            ⌘K
          </button>
        </div>
        <div className="tpp-toolbar__actions">
          <button
            type="button"
            className="tpp-datefield"
            disabled
            title="Date ranges connect with the live trade feed"
          >
            <span>Select a range</span>
            <CalendarDays size={15} />
          </button>
          <div className="tpp-viewtoggle" role="tablist" aria-label="View">
            <span
              className="tpp-viewtoggle__ind"
              style={{ transform: view === "table" ? "translateX(0)" : "translateX(100%)" }}
            />
            <button
              type="button"
              role="tab"
              aria-selected={view === "table"}
              data-on={view === "table" ? "" : undefined}
              onClick={() => setView("table")}
              title="Table view"
            >
              <List size={16} />
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "cards"}
              data-on={view === "cards" ? "" : undefined}
              onClick={() => setView("cards")}
              title="Card view"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
          <span className="tpp-filterwrap">
            <button
              ref={panelBtnRef}
              type="button"
              className="tpp-filterbtn"
              title="Filters"
              onClick={() => openPanel("filters", panelBtnRef)}
            >
              <Filter size={16} />
            </button>
            {activeFilters > 0 && <span className="tpp-filterbtn__badge">{activeFilters}</span>}
          </span>
          <button
            ref={colsBtnRef}
            type="button"
            className="tpp-filterbtn"
            title="Columns"
            onClick={() => openPanel("columns", colsBtnRef)}
          >
            <Columns3 size={16} />
          </button>
          <button type="button" className="tpp-filterbtn" title={expanded ? "Close full screen" : "Full screen"} onClick={onToggleExpand}>
            {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
          {selected.size > 0 && (
            <button
              type="button"
              className="tpp-bulkdel"
              title={`Delete ${String(selected.size)} selected`}
              onClick={() => {
                delRows(selected); // ONE commit — per-id deletes would overwrite each other
                setSelected(new Set());
              }}
            >
              <Trash2 size={14} /> {selected.size}
            </button>
          )}
          <button type="button" className="tpp-addbtn" onClick={addTrade}>
            <Plus size={16} /> Add Trade
          </button>
        </div>
      </div>

      {view === "table" ? (
        <div
          className="tpp-tableshell"
          style={hasGroups ? undefined : ({ "--tpp-groups-h": "0px" } as CSSProperties)}
        >
          <div className="tpp-tablewrap">
            <div
              className="tpp-grid"
              role="table"
              aria-label="Trades"
              data-collapse-motion={collapseMotion || undefined}
              style={{ gridTemplateColumns, gridTemplateRows, minWidth: gridMinWidth }}
            >
              <div className="tpp-rowgroup" role="rowgroup">
                {/* tier 1 — group headers (only when the schema declares groups) */}
                {hasGroups && (
                <div className="tpp-gr tpp-gr--groups" role="row">
                  <div className="tpp-gcell tpp-col-check" role="columnheader" />
                  {runs.map((run, i) => (
                    <div
                      key={`g${String(i)}`}
                      role="columnheader"
                      aria-colspan={run.cols.length}
                      className="tpp-gcell tpp-group"
                      data-collapsed={run.collapsed || undefined}
                      style={{ gridColumn: `span ${String(run.cols.length)}` }}
                    >
                      {!run.collapsible ? (
                        <span className="tpp-group__static">{run.group}</span>
                      ) : (
                        <button
                          type="button"
                          className="tpp-group__toggle"
                          aria-expanded={!run.collapsed}
                          onClick={() => toggleGroup(run.group)}
                        >
                          <ChevronLeft size={16} className="tpp-group__chevron" />
                          <span className="tpp-group__label">{run.group}</span>
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="tpp-gcell tpp-col-actions" role="columnheader" />
                </div>
                )}
                {/* tier 2 — column headers */}
                <div className="tpp-gr tpp-gr--cols" role="row">
                  <div className="tpp-gcell tpp-col-check" role="columnheader">
                    <V3Check
                      checked={allSelected}
                      indeterminate={someSelected}
                      label="Select all trades"
                      onToggle={toggleAll}
                    />
                  </div>
                  {runs.map((run) =>
                    run.cols.map((c) => {
                      const sortable = isSortableCol(c);
                      const sorted = sort?.colId === c.id;
                      const hiddenCell = collapsedCol(run, c.id);
                      return (
                        <div
                          key={c.id}
                          role="columnheader"
                          className="tpp-gcell tpp-datacell"
                          data-numeric={isNumericCol(c) ? "" : undefined}
                          data-colcollapsed={hiddenCell || undefined}
                          aria-hidden={hiddenCell || undefined}
                          aria-sort={
                            !sortable ? undefined : sorted ? (sort.dir === "asc" ? "ascending" : "descending") : "none"
                          }
                          // right-click any header = manage the column (rename ·
                          // retype · move · delete) — sorting keeps plain click
                          onContextMenu={(e) => {
                            if (hiddenCell) return;
                            e.preventDefault();
                            openColMenu(c.id, e.clientX, e.clientY);
                          }}
                        >
                          <span className="tpp-cellslide">
                            {!sortable ? (
                              <button
                                type="button"
                                className="tpp-sortbtn"
                                title="Column options"
                                disabled={hiddenCell}
                                onClick={(e) => {
                                  const r = e.currentTarget.getBoundingClientRect();
                                  openColMenu(c.id, r.left, r.bottom + 4);
                                }}
                              >
                                {c.name}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="tpp-sortbtn"
                                data-sorted={sorted || undefined}
                                disabled={hiddenCell}
                                onClick={() => cycleSort(c.id)}
                              >
                                {c.name}
                                {sorted ? (
                                  sort.dir === "asc" ? (
                                    <ArrowUp className="tpp-sortbtn__icon" />
                                  ) : (
                                    <ArrowDown className="tpp-sortbtn__icon" />
                                  )
                                ) : (
                                  <ArrowUpDown className="tpp-sortbtn__icon" />
                                )}
                              </button>
                            )}
                          </span>
                        </div>
                      );
                    }),
                  )}
                  <div className="tpp-gcell tpp-col-actions" role="columnheader">
                    <span className="tpp-sr">Actions</span>
                  </div>
                </div>
              </div>
              <div className="tpp-rowgroup" role="rowgroup">
                {pageRows.map((r) => (
                  <div
                    key={r.id}
                    className="tpp-gr tpp-gr--body"
                    role="row"
                    data-selected={selected.has(r.id) ? "" : undefined}
                  >
                    <div className="tpp-gcell tpp-col-check" role="cell">
                      <V3Check
                        checked={selected.has(r.id)}
                        label="Select trade"
                        onToggle={() => toggleRow(r.id)}
                      />
                    </div>
                    {runs.map((run) =>
                      run.cols.map((c) => {
                        const hiddenCell = collapsedCol(run, c.id);
                        return (
                          <div
                            key={c.id}
                            role="cell"
                            className="tpp-gcell tpp-datacell"
                            data-numeric={isNumericCol(c) ? "" : undefined}
                            data-colcollapsed={hiddenCell || undefined}
                            aria-hidden={hiddenCell || undefined}
                          >
                            <span className="tpp-cellslide">{cell(r, c)}</span>
                          </div>
                        );
                      }),
                    )}
                    <div className="tpp-gcell tpp-col-actions" role="cell">
                      <RowKebab
                        onView={() => openTradeDetails(r.id)}
                        onDuplicate={() => duplicateRow(r.id)}
                        onDelete={() => delRow(r.id)}
                      />
                    </div>
                  </div>
                ))}
                {pageRows.length === 0 && (
                  <div className="tpp-gr tpp-gr--body" role="row">
                    <div className="tpp-emptycols" role="cell">
                      {q !== "" || activeFilters > 0
                        ? "No trades match — clear the search or a filter."
                        : "No trades yet — add one with the button above."}
                    </div>
                  </div>
                )}
                {/* filler row — column dividers run to the panel bottom */}
                <div className="tpp-gr tpp-fillrow" role="presentation" aria-hidden="true">
                  <div className="tpp-fillcell" />
                  {runs.map((run) =>
                    run.cols.map((c) => (
                      <div
                        key={c.id}
                        className="tpp-fillcell"
                        data-colcollapsed={collapsedCol(run, c.id) || undefined}
                      />
                    )),
                  )}
                  <div className="tpp-fillcell" />
                </div>
              </div>
            </div>
          </div>
          {hasGroups && <div className="tpp-headrule tpp-headrule--groups" aria-hidden="true" />}
          <div className="tpp-headrule tpp-headrule--cols" aria-hidden="true" />
        </div>
      ) : (
        /* card view — the toggle's second surface */
        <div className="tpp-cards">
          {pageRows.map((r) => {
            const sym = String((symbolCol && r.cells[symbolCol]) ?? "").toUpperCase();
            const hue = chipHue(sym || "?");
            const st = String((statusCol && r.cells[statusCol]) ?? "");
            const key = STATUS_KEY[st.toLowerCase()];
            const pnl = String((pnlCol && r.cells[pnlCol]) ?? "");
            return (
              <div key={r.id} className="tpp-tcard">
                <span
                  className="tpp-logo"
                  style={{ background: `color-mix(in srgb, ${hue} 14%, transparent)`, color: hue }}
                >
                  {sym.slice(0, 2)}
                </span>
                <div className="tpp-tcard__mid">
                  <span className="tpp-symbol">{sym || "—"}</span>
                  <span className="tpp-time">
                    {splitDateTime(String((dateColId && r.cells[dateColId]) ?? "")).date || "—"}
                  </span>
                </div>
                {key && (
                  <span className="tpp-status" data-status={key}>
                    {st}
                  </span>
                )}
                <span
                  className="tpp-pnl"
                  data-tone={numOf(pnl) > 0 ? "profit" : numOf(pnl) < 0 ? "loss" : undefined}
                >
                  {pnl || "—"}
                </span>
              </div>
            );
          })}
          {pageRows.length === 0 && <div className="tpp-emptycols">No trades to show.</div>}
        </div>
      )}

      {/* ── footer — count · pager · rows-per-page ────────────────────────── */}
      <div className="tpp-footer">
        <div className="tpp-foot">
          <span className="tpp-foot__count">
            {filtered.length === 0
              ? "No trades yet"
              : `Showing ${String(firstShown)}–${String(lastShown)} of ${String(filtered.length)} ${nounFor(filtered.length)}`}
            {sums.map((s) => (
              <span key={s.name} className="tpp-foot__sum">
                {" · "}
                {s.name} Σ {s.total.toFixed(2)}
              </span>
            ))}
          </span>
          <div className="tpp-foot__nav">
            <button
              type="button"
              className="tpp-pagebtn"
              disabled={safePage <= 1}
              aria-label="Previous page"
              onClick={() => setPage(safePage - 1)}
            >
              <ChevronLeft size={15} />
            </button>
            {pagePills.map((p, i) =>
              p === "…" ? (
                <span key={`e${String(i)}`} className="tpp-pageellipsis">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  className="tpp-pagenum"
                  data-on={p === safePage ? "" : undefined}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ),
            )}
            <button
              type="button"
              className="tpp-pagebtn"
              disabled={safePage >= pageCount}
              aria-label="Next page"
              onClick={() => setPage(safePage + 1)}
            >
              <ChevronRight size={15} />
            </button>
          </div>
          <label className="tpp-foot__perpage">
            <span>Rows per page</span>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 25, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* filters / columns popovers */}
      {panel &&
        panelPos &&
        createPortal(
          <div
            data-tpp-panel
            className={"tpp-panel " + (panel === "filters" ? "tpp-filters" : "tpp-cols")}
            style={{ left: Math.max(8, panelPos.x - (panel === "filters" ? 300 : 264)), top: panelPos.y }}
          >
            {panel === "filters" ? (
              <div className="tpp-panel__body">
                <div className="tpp-panel__sec">
                  <span className="tpp-panel__label">Result</span>
                  <div className="tpp-seg">
                    {["all", "win", "loss", "breakeven"].map((v) => (
                      <button
                        key={v}
                        type="button"
                        data-on={filterResult === v ? "" : undefined}
                        onClick={() => {
                          setFilterResult(v);
                          setPage(1);
                        }}
                      >
                        {v === "all" ? "All" : v === "breakeven" ? "BE" : v[0].toUpperCase() + v.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="tpp-panel__sec">
                  <span className="tpp-panel__label">Direction</span>
                  <div className="tpp-seg">
                    {["all", "long", "short"].map((v) => (
                      <button
                        key={v}
                        type="button"
                        data-on={filterDir === v ? "" : undefined}
                        onClick={() => {
                          setFilterDir(v);
                          setPage(1);
                        }}
                      >
                        {v[0].toUpperCase() + v.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="tpp-panel__foot">
                  <button
                    type="button"
                    className="tpp-clear"
                    onClick={() => {
                      setFilterResult("all");
                      setFilterDir("all");
                      setPage(1);
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            ) : (
              <div className="tpp-panel__body">
                <div className="tpp-presets">
                  {(["Default", "All", "None"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        if (p === "All" || p === "Default") setHidden(new Set());
                        else
                          setHidden(
                            new Set(data.columns.filter((c) => !isLockedCol(c)).map((c) => c.id)),
                          );
                        setCollapseMotion(false);
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <div className="tpp-cols__list">
                  {data.columns.map((c) => {
                    const locked = isLockedCol(c);
                    const on = !hidden.has(c.id) || locked;
                    return (
                      <label key={c.id} className="tpp-cols__row" data-locked={locked || undefined}>
                        <span>{c.name}</span>
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={locked}
                          onChange={() => {
                            setCollapseMotion(false);
                            setHidden((prev) => {
                              const next = new Set(prev);
                              if (next.has(c.id)) next.delete(c.id);
                              else next.add(c.id);
                              return next;
                            });
                          }}
                        />
                      </label>
                    );
                  })}
                </div>
                <div className="tpp-panel__foot">
                  <button
                    type="button"
                    className="tpp-clear"
                    onClick={() => {
                      addColumn();
                      setPanel(null);
                    }}
                  >
                    + Add column
                  </button>
                </div>
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

/* custom display that swaps to an input on click (journal editing idiom) */
function InlineEdit({
  value,
  display,
  onCommit,
}: {
  value: string;
  display: ReactNode;
  onCommit: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  if (!editing)
    return (
      <span className="tpp-inlineedit" title="Click to edit" onClick={() => setEditing(true)}>
        {display}
      </span>
    );
  return (
    <input
      className="tt-input"
      value={v}
      autoFocus
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        setEditing(false);
        onCommit(v);
      }}
      onKeyDown={(e) => e.stopPropagation()}
    />
  );
}

/* two-line date cell that swaps to an input on click (journal editing idiom) */
function DateEdit({
  value,
  date,
  time,
  onCommit,
}: {
  value: string;
  date: string;
  time: string;
  onCommit: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  if (!editing)
    return (
      <span onClick={() => setEditing(true)}>
        <span className="tpp-date">{date}</span>
        {time !== "" && <span className="tpp-time">{time}</span>}
      </span>
    );
  return (
    <input
      className="tt-input"
      value={v}
      autoFocus
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        setEditing(false);
        onCommit(v);
      }}
      onKeyDown={(e) => e.stopPropagation()}
    />
  );
}

/* ── the node view ─────────────────────────────────────────────────────────────── */
function TradeTableView({ node, updateAttributes }: NodeViewProps) {
  const [data, setData] = useState<TableData>(() => parseData(node.attrs.data));
  const [expanded, setExpanded] = useState(false);
  const [colMenu, setColMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  // v3 chrome — view-only state (never persisted into the node)
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<string>>(() => new Set());

  const lastCommitted = useRef<string>(String(node.attrs.data || ""));
  const commit = (next: TableData) => {
    const json = JSON.stringify(next);
    lastCommitted.current = json;
    setData(next);
    updateAttributes({ data: json });
    if (next.addLabel === "trade" && next.id) setTableTrades(next.id, mapTrades(next));
  };
  // undo/redo (or any external attr change) must re-sync the cached grid —
  // otherwise the visible table silently diverges from the persisted document
  useEffect(() => {
    const raw = String(node.attrs.data || "");
    if (raw && raw !== lastCommitted.current) {
      lastCommitted.current = raw;
      const d = parseData(raw);
      setData(d);
      if (d.addLabel === "trade" && d.id) setTableTrades(d.id, mapTrades(d));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.attrs.data]);
  // publish this trade table's rows to the store on mount, so "Link to trade" sees them
  useEffect(() => {
    // template HTML arrives without an id (tradeTableHTML strips it) and
    // parseData mints one; a DUPLICATED table (copy/paste, block-menu
    // Duplicate, custom templates) arrives with a CLONED id — either way,
    // publishing under a shared key would make two tables clobber each other.
    let hadId = false;
    try {
      const raw = node.attrs.data as unknown;
      hadId =
        typeof raw === "string" &&
        raw.length > 0 &&
        !!(JSON.parse(raw) as { id?: string }).id;
    } catch {
      /* unparseable → treat as missing */
    }
    const me = Symbol("tradeTable");
    const collision = !!data.id && liveTableIds.has(data.id);
    let current = data;
    if (!hadId || collision) {
      current = {
        ...data,
        id: uid(),
        // a cloned table shares ROW ids too — remint so Trade.id stays unique
        rows: collision ? data.rows.map((r) => ({ ...r, id: uid() })) : data.rows,
      };
      const json = JSON.stringify(current);
      lastCommitted.current = json;
      setData(current);
      updateAttributes({ data: json });
    }
    if (current.id) liveTableIds.set(current.id, me);
    if (current.addLabel === "trade" && current.id) setTableTrades(current.id, mapTrades(current));
    return () => {
      if (current.id && liveTableIds.get(current.id) === me) liveTableIds.delete(current.id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const setCell = (rowId: string, colId: string, val: Cell) =>
    commit({
      ...data,
      rows: data.rows.map((r) => (r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: val } } : r)),
    });
  const addRow = () => {
    commit({ ...data, rows: [...data.rows, blankRow(data.columns)] });
    // the fresh blank row must be VISIBLE: a blank row never matches a search
    // query, and it lands on the last page — clear the filter and jump there
    setQuery("");
    setPage(Math.max(1, Math.ceil((data.rows.length + 1) / perPage)));
  };
  const delRow = (rowId: string) => commit({ ...data, rows: data.rows.filter((r) => r.id !== rowId) });
  const delRows = (ids: ReadonlySet<string>) =>
    commit({ ...data, rows: data.rows.filter((r) => !ids.has(r.id)) });
  const duplicateRow = (rowId: string) => {
    const src = data.rows.find((r) => r.id === rowId);
    if (!src) return;
    const i = data.rows.indexOf(src);
    const copy: Row = { id: uid(), cells: { ...src.cells } };
    const rows = [...data.rows];
    rows.splice(i + 1, 0, copy);
    commit({ ...data, rows });
  };

  // ── column operations (add · rename · retype · move · delete · add tag option) ──
  const addColumn = () => {
    const col: Column = { id: uid(), name: "New column", type: "text", width: 150 };
    commit({
      ...data,
      columns: [...data.columns, col],
      rows: data.rows.map((r) => ({ ...r, cells: { ...r.cells, [col.id]: "" } })),
    });
  };
  const renameColumn = (id: string, name: string) =>
    commit({ ...data, columns: data.columns.map((c) => (c.id === id ? { ...c, name } : c)) });
  const retypeColumn = (id: string, type: ColType) =>
    commit({
      ...data,
      columns: data.columns.map((c) =>
        c.id === id
          ? {
              ...c,
              type,
              sum: type === "num" ? c.sum : undefined,
              options:
                type === "select"
                  ? c.options?.length
                    ? c.options
                    : [{ label: "Option 1", color: "green" }]
                  : c.options,
            }
          : c,
      ),
      rows:
        type === "img"
          ? data.rows.map((r) => ({
              ...r,
              cells: { ...r.cells, [id]: Array.isArray(r.cells[id]) ? r.cells[id] : [] },
            }))
          : type === "rating"
            ? data.rows.map((r) => ({
                ...r,
                cells: { ...r.cells, [id]: Array.isArray(r.cells[id]) ? "" : r.cells[id] },
              }))
            : data.rows,
    });
  const delColumn = (id: string) => {
    if (data.columns.length <= 1) return;
    commit({
      ...data,
      columns: data.columns.filter((c) => c.id !== id),
      rows: data.rows.map((r) => {
        const cells = { ...r.cells };
        delete cells[id];
        return { ...r, cells };
      }),
    });
  };
  const moveColumn = (id: string, dir: -1 | 1) => {
    const i = data.columns.findIndex((c) => c.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= data.columns.length) return;
    const cols = [...data.columns];
    [cols[i], cols[j]] = [cols[j], cols[i]];
    commit({ ...data, columns: cols });
  };
  const addOptionAndSelect = (rowId: string, colId: string, label: string) => {
    const col = data.columns.find((c) => c.id === colId);
    if (!col) return;
    const used = new Set((col.options ?? []).map((o) => o.color));
    const color = TAG_KEYS.find((k) => !used.has(k)) ?? TAG_KEYS[(col.options?.length ?? 0) % TAG_KEYS.length];
    commit({
      ...data,
      columns: data.columns.map((c) => (c.id === colId ? { ...c, options: [...(c.options ?? []), { label, color }] } : c)),
      rows: data.rows.map((r) => (r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: label } } : r)),
    });
  };

  const num = (v: Cell): number => {
    const n = Number.parseFloat(String(v ?? "").replace(/[^0-9.+-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  /* ── v3 view model — search · pagination · collapsible column groups ─────── */
  const q = query.trim().toLowerCase();
  const filtered = q
    ? data.rows.filter((r) =>
        data.columns.some((c) => {
          const v = r.cells[c.id];
          return typeof v === "string" && v.toLowerCase().includes(q);
        })
      )
    : data.rows;
  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, pageCount);
  // write the clamp back — a stale out-of-range page number would resurface
  // (and jump the view) the next time the row count grows
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);
  const pageRows = filtered.slice((safePage - 1) * perPage, safePage * perPage);
  const firstShown = filtered.length === 0 ? 0 : (safePage - 1) * perPage + 1;
  const lastShown = (safePage - 1) * perPage + pageRows.length;
  const noun = data.addLabel ?? "row";
  const nounFor = (n: number) => (n === 1 ? noun : `${noun}s`);

  // contiguous same-group column runs — one collapsible group cell per run
  const hasGroups = data.columns.some((c) => c.group);
  const runs: { group: string; cols: Column[] }[] = [];
  for (const c of data.columns) {
    const g = c.group ?? "";
    const last = runs[runs.length - 1];
    if (last && last.group === g) last.cols.push(c);
    else runs.push({ group: g, cols: [c] });
  }
  const isCollapsed = (g: string) => g !== "" && collapsedGroups.has(g);
  const toggleGroup = (g: string) =>
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  const renderedColCount = runs.reduce((s, run) => s + (isCollapsed(run.group) ? 1 : run.cols.length), 0);

  // presentation roles (v3 cell treatments, resolved by column name/type)
  const symbolColId = data.columns.find((c) => c.type === "text" && /pair|symbol/i.test(c.name))?.id;
  const pnlColIds = new Set(
    data.columns.filter((c) => c.type === "num" && /p&l|pnl|profit|p\/l/i.test(c.name)).map((c) => c.id)
  );
  const hasSums = data.columns.some((c) => c.sum);

  const headerCell = (c: Column, tier2: boolean) => (
    <th
      key={c.id}
      className={
        "tt-th tt-th-btn" + (c.type === "num" ? " tt-th-num" : "") + (tier2 ? " tt-th--tier2" : "")
      }
      style={{ minWidth: c.width, width: c.width }}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setColMenu({ id: c.id, x: r.left, y: r.bottom + 4 });
      }}
    >
      {c.name}
    </th>
  );

  const bodyCell = (r: Row, c: Column) => {
    const raw = r.cells[c.id];
    if (c.type === "select")
      return (
        <SelectCell
          value={String(raw ?? "")}
          options={c.options ?? []}
          onChange={(v) => setCell(r.id, c.id, v)}
          onAddOption={(label) => addOptionAndSelect(r.id, c.id, label)}
        />
      );
    if (c.type === "img")
      return (
        <ImageCell
          value={Array.isArray(raw) ? raw : []}
          onChange={(v) => setCell(r.id, c.id, v)}
        />
      );
    if (c.type === "rating")
      return <StarsCell value={String(raw ?? "")} onChange={(v) => setCell(r.id, c.id, v)} />;
    // symbol column — the v3 auto-hue avatar chip beside the editable ticker
    if (c.id === symbolColId) {
      const sym = String(raw ?? "").trim().toUpperCase();
      const hue = chipHue(sym || "?");
      return (
        <span className="tt-symwrap">
          {sym !== "" && (
            <span
              className="tt-symchip"
              style={{ background: `color-mix(in srgb, ${hue} 14%, transparent)`, color: hue }}
            >
              {sym.slice(0, 2)}
            </span>
          )}
          <TextCell value={String(raw ?? "")} type={c.type} onCommit={(v) => setCell(r.id, c.id, v)} />
        </span>
      );
    }
    // valence tone on P&L figures (v3: profit green, loss red, zero calm)
    const tone = pnlColIds.has(c.id)
      ? num(raw) > 0
        ? ("profit" as const)
        : num(raw) < 0
          ? ("loss" as const)
          : null
      : null;
    return (
      <TextCell value={String(raw ?? "")} type={c.type} tone={tone} onCommit={(v) => setCell(r.id, c.id, v)} />
    );
  };

  // window the page pills: all pages when ≤7, else 1 … around current … last
  const pagePills: (number | "…")[] = [];
  if (pageCount <= 7) for (let p = 1; p <= pageCount; p++) pagePills.push(p);
  else {
    pagePills.push(1);
    if (safePage > 3) pagePills.push("…");
    for (let p = Math.max(2, safePage - 1); p <= Math.min(pageCount - 1, safePage + 1); p++) pagePills.push(p);
    if (safePage < pageCount - 2) pagePills.push("…");
    pagePills.push(pageCount);
  }

  const table = (
    <div className="tt-card">
      {/* ── toolbar — search · expand · add (v3 band) ─────────────────────── */}
      <div className="tt-toolbar">
        <div className="tt-search">
          <Search size={13} className="tt-search-ico" />
          <input
            value={query}
            placeholder={`Search ${nounFor(2)}...`}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            onKeyDown={(e) => e.stopPropagation()}
          />
          {query !== "" && (
            <button type="button" className="tt-search-x" title="Clear" onClick={() => setQuery("")}>
              <X size={11} />
            </button>
          )}
        </div>
        <div className="tt-toolbar-actions">
          <button
            type="button"
            className="tt-iconbtn"
            title={expanded ? "Close full screen" : "Open full screen"}
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button type="button" className="tt-primary" onClick={addRow}>
            <Plus size={14} /> Add {noun}
          </button>
        </div>
      </div>

      <div className="tt-scroll">
        <table className="tt">
          <thead>
            {hasGroups && (
              <tr className="tt-gtr">
                <th className="tt-gth tt-th-grip" />
                {runs.map((run, i) =>
                  isCollapsed(run.group) ? (
                    <th key={`g${String(i)}`} className="tt-gth tt-gth--stub">
                      <button
                        type="button"
                        className="tt-gtog"
                        title={`Expand ${run.group}`}
                        onClick={() => toggleGroup(run.group)}
                      >
                        <ChevronRight size={12} />
                      </button>
                    </th>
                  ) : (
                    <th key={`g${String(i)}`} className="tt-gth" colSpan={run.cols.length}>
                      {run.group !== "" && (
                        <button
                          type="button"
                          className="tt-gtog"
                          title={`Collapse ${run.group}`}
                          onClick={() => toggleGroup(run.group)}
                        >
                          <ChevronLeft size={12} />
                          <span>{run.group}</span>
                        </button>
                      )}
                    </th>
                  )
                )}
                <th className="tt-gth tt-th-add" />
              </tr>
            )}
            <tr>
              <th className={"tt-th tt-th-grip" + (hasGroups ? " tt-th--tier2" : "")} />
              {runs.map((run, i) =>
                isCollapsed(run.group) ? (
                  <th key={`s${String(i)}`} className={"tt-th tt-th--stub" + (hasGroups ? " tt-th--tier2" : "")} />
                ) : (
                  run.cols.map((c) => headerCell(c, hasGroups))
                )
              )}
              <th className={"tt-th tt-th-add" + (hasGroups ? " tt-th--tier2" : "")}>
                <button type="button" className="tt-addcol" title="Add column" onClick={addColumn}>
                  <Plus size={14} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r.id} className="tt-tr">
                <td className="tt-td tt-td-grip">
                  <button type="button" className="tt-del" title="Delete row" onClick={() => delRow(r.id)}>
                    <Trash2 size={12} />
                  </button>
                  <GripVertical size={12} className="tt-grip" />
                </td>
                {runs.map((run, i) =>
                  isCollapsed(run.group) ? (
                    <td key={`s${String(i)}`} className="tt-td tt-td--stub" />
                  ) : (
                    run.cols.map((c) => (
                      <td key={c.id} className="tt-td" style={{ minWidth: c.width, width: c.width }}>
                        {bodyCell(r, c)}
                      </td>
                    ))
                  )
                )}
                <td className="tt-td tt-td-add" />
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr className="tt-tr">
                <td className="tt-td tt-emptyrow" colSpan={renderedColCount + 2}>
                  {q !== ""
                    ? `No ${nounFor(2)} match “${query.trim()}”.`
                    : `No ${nounFor(2)} yet — add one below.`}
                </td>
              </tr>
            )}
          </tbody>
          {hasSums && (
            <tfoot>
              <tr className="tt-foot">
                <td className="tt-td tt-td-grip" />
                {runs.map((run, i) =>
                  isCollapsed(run.group) ? (
                    <td key={`s${String(i)}`} className="tt-td tt-foot-cell tt-td--stub" />
                  ) : (
                    run.cols.map((c) => (
                      <td key={c.id} className="tt-td tt-foot-cell">
                        {c.sum ? (
                          <span className="tt-sum">
                            <span style={{ color: "var(--text-faint)" }}>Σ</span>{" "}
                            {filtered.reduce((s, r) => s + num(r.cells[c.id]), 0).toFixed(2)}
                          </span>
                        ) : null}
                      </td>
                    ))
                  )
                )}
                <td className="tt-td tt-td-add" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ── v3 footer band — count · pagination · rows-per-page ───────────── */}
      <div className="tt-footbar">
        <span className="tt-showing">
          {filtered.length === 0
            ? q !== ""
              ? `No ${nounFor(2)} match`
              : `No ${nounFor(2)} yet`
            : `Showing ${String(firstShown)}–${String(lastShown)} of ${String(filtered.length)} ${nounFor(filtered.length)}`}
        </span>
        <div className="tt-pager">
          <button
            type="button"
            className="tt-page-arrow"
            disabled={safePage <= 1}
            title="Previous page"
            onClick={() => setPage(safePage - 1)}
          >
            <ChevronLeft size={14} />
          </button>
          {pagePills.map((p, i) =>
            p === "…" ? (
              <span key={`e${String(i)}`} className="tt-page-ellipsis">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                className={"tt-page" + (p === safePage ? " tt-page--on" : "")}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            )
          )}
          <button
            type="button"
            className="tt-page-arrow"
            disabled={safePage >= pageCount}
            title="Next page"
            onClick={() => setPage(safePage + 1)}
          >
            <ChevronRight size={14} />
          </button>
        </div>
        <label className="tt-perpage">
          <span>Rows per page</span>
          <select
            value={perPage}
            onChange={(e) => {
              setPerPage(Number(e.target.value));
              setPage(1);
            }}
          >
            {[10, 25, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button type="button" className="tt-addrow" onClick={addRow}>
        <Plus size={13} /> New {noun}
      </button>
    </div>
  );

  const col = colMenu ? data.columns.find((c) => c.id === colMenu.id) : undefined;

  // the TRADE preset renders the v3 Trades-page grid; other presets keep the
  // generic editable table shell
  const isV3 = data.addLabel === "trade";
  const v3 = isV3 ? (
    <TradeTableV3
      data={data}
      setCell={setCell}
      addRow={addRow}
      delRow={delRow}
      delRows={delRows}
      duplicateRow={duplicateRow}
      addColumn={addColumn}
      openColMenu={(colId, x, y) => setColMenu({ id: colId, x, y })}
      addOptionAndSelect={addOptionAndSelect}
      expanded={expanded}
      onToggleExpand={() => setExpanded((e) => !e)}
    />
  ) : null;
  const surface = isV3 ? v3 : table;

  return (
    <NodeViewWrapper className="tt-wrap" contentEditable={false}>
      {!expanded && surface}
      {colMenu && col && (
        <ColumnMenu
          col={col}
          canDelete={data.columns.length > 1}
          anchor={{ x: colMenu.x, y: colMenu.y }}
          onRename={(name) => renameColumn(col.id, name)}
          onType={(type) => retypeColumn(col.id, type)}
          onMove={(dir) => {
            moveColumn(col.id, dir);
            setColMenu(null);
          }}
          onDelete={() => {
            delColumn(col.id);
            setColMenu(null);
          }}
          onClose={() => setColMenu(null)}
        />
      )}
      {expanded &&
        createPortal(
          <div className="tt-overlay">
            <div className="tt-overlay-head">
              <span className="tt-overlay-title">
                {data.addLabel === "trade" ? "Trade log" : "Table"} · {data.rows.length} rows
              </span>
              <button type="button" className="tt-overlay-close" onClick={() => setExpanded(false)}>
                <Minimize2 size={14} /> Close
              </button>
            </div>
            <div className="tt-overlay-body">{surface}</div>
          </div>,
          document.body,
        )}
    </NodeViewWrapper>
  );
}

/* ── the node + command ────────────────────────────────────────────────────────── */
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tradeTable: {
      /** Insert a table. `preset` picks a schema: trade (default) · survey · weekly · checklist. */
      insertTradeTable: (preset?: string) => ReturnType;
    };
  }
}

export const TradeTable = Node.create({
  name: "tradeTable",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      data: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-rows") || "",
        renderHTML: (attrs) => (attrs.data ? { "data-rows": attrs.data as string } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="trade-table"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "trade-table" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TradeTableView);
  },

  addCommands() {
    return {
      insertTradeTable:
        (preset) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { data: JSON.stringify((PRESETS[preset ?? "trade"] ?? defaultData)()) },
          }),
    };
  },
});
