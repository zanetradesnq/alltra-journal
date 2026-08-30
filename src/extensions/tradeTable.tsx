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
} from "lucide-react";
import type { Trade } from "../trades";
import { setTableTrades } from "../tradeStore";

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

/* ── default schema — the v3 Trades-page log (Alltra desktop design), grouped ──── */
function defaultData(): TableData {
  const col = (name: string, type: ColType, extra: Partial<Column> = {}): Column => ({
    id: uid(),
    name,
    type,
    ...extra,
  });
  const columns: Column[] = [
    // Trade info — identity of the trade
    col("Pair", "text", { width: 120, group: "Trade info" }),
    col("Type", "select", {
      width: 96,
      group: "Trade info",
      options: [
        { label: "Long", color: "green" },
        { label: "Short", color: "red" },
      ],
    }),
    col("Status", "select", {
      width: 110,
      group: "Trade info",
      options: [
        { label: "Win", color: "green" },
        { label: "Loss", color: "red" },
        { label: "Breakeven", color: "gray" },
        { label: "Open", color: "blue" },
      ],
    }),
    col("Setup", "text", { width: 150, group: "Trade info" }),
    // Performance — the money
    col("Net P&L", "num", { width: 110, sum: true, group: "Performance" }),
    col("ROI", "text", { width: 80, group: "Performance" }),
    col("Lots", "num", { width: 80, sum: true, group: "Performance" }),
    // Prices
    col("Entry", "num", { width: 100, group: "Prices" }),
    col("Stoploss", "num", { width: 100, group: "Prices" }),
    col("Exit avg", "num", { width: 100, group: "Prices" }),
    col("Exit logic", "select", {
      width: 100,
      group: "Prices",
      options: [
        { label: "TP hit", color: "green" },
        { label: "SL Hit", color: "red" },
        { label: "TSL Hit", color: "gray" },
        { label: "other", color: "purple" },
      ],
    }),
    // Dates
    col("Date", "date", { width: 190, group: "Dates" }),
    col("Timeframe", "text", { width: 110, group: "Dates" }),
    // Metrics
    col("Rating", "rating", { width: 130, group: "Metrics" }),
    // Meta — discipline + evidence
    col("Rules followed", "select", { width: 120, group: "Meta", options: YES_NO }),
    col("Money mgmt", "select", { width: 110, group: "Meta", options: YES_NO }),
    col("Risk", "select", {
      width: 90,
      group: "Meta",
      options: [
        { label: "FULL", color: "purple" },
        { label: "HALF", color: "blue" },
      ],
    }),
    col("Trade report", "url", { width: 130, group: "Meta" }),
    col("Screenshots", "img", { width: 140, group: "Meta" }),
  ];
  // one example row so the block reads as a real trade + shows the tags
  const c = columns;
  const sample: Row = {
    id: uid(),
    cells: {
      [c[0].id]: "XAUUSD",
      [c[1].id]: "Long",
      [c[2].id]: "Win",
      [c[3].id]: "Rejection from level",
      [c[4].id]: "50.5",
      [c[5].id]: "+1%",
      [c[6].id]: "0.17",
      [c[7].id]: "1920.18",
      [c[8].id]: "1918.91",
      [c[9].id]: "1923.18",
      [c[10].id]: "TP hit",
      [c[11].id]: "10/07/2023 2:15 AM → 2:30 AM",
      [c[12].id]: "5 min, 15 min",
      [c[13].id]: "4",
      [c[14].id]: "YES",
      [c[15].id]: "YES",
      [c[16].id]: "FULL",
      [c[17].id]: "",
      [c[18].id]: [],
    },
  };
  return { columns, rows: [sample], addLabel: "trade", id: uid() };
}

/** Map a trade-table's rows to Trade objects for the store (columns matched by name). */
function mapTrades(data: TableData): Trade[] {
  const find = (...names: string[]): string =>
    data.columns.find((c) => names.some((n) => c.name.toLowerCase().includes(n)))?.id ?? "";
  const dateC = find("date");
  const pairC = find("pair", "symbol");
  const typeC = find("type", "side");
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
}: {
  value: string;
  options: SelectOpt[];
  onChange: (v: string) => void;
  onAddOption?: (label: string) => void;
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
      if (!t.closest?.("[data-tt-pop]") && t !== btnRef.current) setOpen(false);
    };
    document.addEventListener("mousedown", close, true);
    return () => document.removeEventListener("mousedown", close, true);
  }, [open]);
  return (
    <>
      <button ref={btnRef} type="button" className="tt-tag-btn" onClick={() => setOpen((o) => !o)}>
        {opt ? (
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

/* ── an image-attachment cell (Aayan's "click and attach images to a trade") ───── */
function ImageCell({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (files.length === 0) return;
    Promise.all(
      files.map(
        (f) =>
          new Promise<string>((res) => {
            const r = new FileReader();
            r.onload = () => res(typeof r.result === "string" ? r.result : "");
            r.readAsDataURL(f);
          }),
      ),
    ).then((urls) => onChange([...value, ...urls.filter(Boolean)]));
  };
  return (
    <div className="tt-imgs">
      {value.map((src, i) => (
        <span key={i} className="tt-thumb">
          <img src={src} alt="" onClick={() => setLightbox(src)} />
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
            <img src={lightbox} alt="" />
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

  const commit = (next: TableData) => {
    setData(next);
    updateAttributes({ data: JSON.stringify(next) });
    if (next.addLabel === "trade" && next.id) setTableTrades(next.id, mapTrades(next));
  };
  // publish this trade table's rows to the store on mount, so "Link to trade" sees them
  useEffect(() => {
    // template HTML arrives without an id (tradeTableHTML strips it) and
    // parseData mints one — commit it to the node NOW, or every remount mints
    // a new key and re-publishes the same rows as duplicate phantom trades
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
    if (!hadId) updateAttributes({ data: JSON.stringify(data) });
    if (data.addLabel === "trade" && data.id) setTableTrades(data.id, mapTrades(data));
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
                            {data.rows.reduce((s, r) => s + num(r.cells[c.id]), 0).toFixed(2)}
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

  return (
    <NodeViewWrapper className="tt-wrap" contentEditable={false}>
      {!expanded && table}
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
            <div className="tt-overlay-body">{table}</div>
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
