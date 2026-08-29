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
} from "lucide-react";
import type { Trade } from "../trades";
import { setTableTrades } from "../tradeStore";

/* ── model ─────────────────────────────────────────────────────────────────── */
type ColType = "text" | "num" | "date" | "select" | "url" | "img";
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
];

/* ── default schema — Aayan's MFF-Phase-1 trade log ────────────────────────────── */
function defaultData(): TableData {
  const col = (name: string, type: ColType, extra: Partial<Column> = {}): Column => ({
    id: uid(),
    name,
    type,
    ...extra,
  });
  const columns: Column[] = [
    col("Date", "date", { width: 190 }),
    col("Pair", "text", { width: 90 }),
    col("Trade report", "url", { width: 130 }),
    col("Lots", "num", { width: 70, sum: true }),
    col("Type", "select", {
      width: 90,
      options: [
        { label: "LONG", color: "green" },
        { label: "SHORT", color: "red" },
      ],
    }),
    col("Entry", "num", { width: 90 }),
    col("Setup", "text", { width: 150 }),
    col("Timeframe", "text", { width: 110 }),
    col("Stoploss", "num", { width: 90 }),
    col("Exit avg", "num", { width: 90 }),
    col("Exit logic", "select", {
      width: 100,
      options: [
        { label: "TP hit", color: "green" },
        { label: "SL Hit", color: "red" },
        { label: "TSL Hit", color: "gray" },
        { label: "other", color: "purple" },
      ],
    }),
    col("Net P&L", "num", { width: 90, sum: true }),
    col("ROI", "text", { width: 80 }),
    col("Rules followed", "select", {
      width: 120,
      options: [
        { label: "YES", color: "green" },
        { label: "NO", color: "red" },
      ],
    }),
    col("Money mgmt", "select", {
      width: 110,
      options: [
        { label: "YES", color: "green" },
        { label: "NO", color: "red" },
      ],
    }),
    col("Risk", "select", {
      width: 90,
      options: [
        { label: "FULL", color: "purple" },
        { label: "HALF", color: "blue" },
      ],
    }),
    col("Screenshots", "img", { width: 140 }),
  ];
  // one example row so the block reads as a real trade + shows the tags
  const c = columns;
  const sample: Row = {
    id: uid(),
    cells: {
      [c[0].id]: "10/07/2023 2:15 AM → 2:30 AM",
      [c[1].id]: "XAUUSD",
      [c[2].id]: "",
      [c[3].id]: "0.17",
      [c[4].id]: "LONG",
      [c[5].id]: "1920.18",
      [c[6].id]: "Rejection from level",
      [c[7].id]: "5 min, 15 min",
      [c[8].id]: "1918.91",
      [c[9].id]: "1923.18",
      [c[10].id]: "TP hit",
      [c[11].id]: "50.5",
      [c[12].id]: "+1%",
      [c[13].id]: "YES",
      [c[14].id]: "YES",
      [c[15].id]: "FULL",
      [c[16].id]: [],
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
}: {
  value: string;
  type: ColType;
  onCommit: (v: string) => void;
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
  // non-focused, non-empty cells render a truncating display span — inputs can't
  // ellipsis, so a long value like "1920.18" clips mid-glyph in a narrow column.
  // Click swaps to the editable input (Notion's exact behaviour).
  if (!editing && value !== "") {
    return (
      <div className={"tt-val" + (isNum ? " tt-num" : "")} title={value} onClick={() => setEditing(true)}>
        {value}
      </div>
    );
  }
  return (
    <input
      className={"tt-input" + (isNum ? " tt-num" : "")}
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

/* ── the node view ─────────────────────────────────────────────────────────────── */
function TradeTableView({ node, updateAttributes }: NodeViewProps) {
  const [data, setData] = useState<TableData>(() => parseData(node.attrs.data));
  const [expanded, setExpanded] = useState(false);
  const [colMenu, setColMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  const commit = (next: TableData) => {
    setData(next);
    updateAttributes({ data: JSON.stringify(next) });
    if (next.addLabel === "trade" && next.id) setTableTrades(next.id, mapTrades(next));
  };
  // publish this trade table's rows to the store on mount, so "Link to trade" sees them
  useEffect(() => {
    if (data.addLabel === "trade" && data.id) setTableTrades(data.id, mapTrades(data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const setCell = (rowId: string, colId: string, val: Cell) =>
    commit({
      ...data,
      rows: data.rows.map((r) => (r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: val } } : r)),
    });
  const addRow = () => commit({ ...data, rows: [...data.rows, blankRow(data.columns)] });
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

  const table = (
    <>
      <div className="tt-scroll">
        <table className="tt">
          <thead>
            <tr>
              <th className="tt-th tt-th-grip" />
              {data.columns.map((c) => (
                <th
                  key={c.id}
                  className={"tt-th tt-th-btn" + (c.type === "num" ? " tt-th-num" : "")}
                  style={{ minWidth: c.width, width: c.width }}
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    setColMenu({ id: c.id, x: r.left, y: r.bottom + 4 });
                  }}
                >
                  {c.name}
                </th>
              ))}
              <th className="tt-th tt-th-add">
                <button type="button" className="tt-addcol" title="Add column" onClick={addColumn}>
                  <Plus size={14} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.id} className="tt-tr">
                <td className="tt-td tt-td-grip">
                  <button type="button" className="tt-del" title="Delete row" onClick={() => delRow(r.id)}>
                    <Trash2 size={12} />
                  </button>
                  <GripVertical size={12} className="tt-grip" />
                </td>
                {data.columns.map((c) => (
                  <td key={c.id} className="tt-td" style={{ minWidth: c.width, width: c.width }}>
                    {c.type === "select" ? (
                      <SelectCell
                        value={String(r.cells[c.id] ?? "")}
                        options={c.options ?? []}
                        onChange={(v) => setCell(r.id, c.id, v)}
                        onAddOption={(label) => addOptionAndSelect(r.id, c.id, label)}
                      />
                    ) : c.type === "img" ? (
                      <ImageCell
                        value={Array.isArray(r.cells[c.id]) ? (r.cells[c.id] as string[]) : []}
                        onChange={(v) => setCell(r.id, c.id, v)}
                      />
                    ) : (
                      <TextCell value={String(r.cells[c.id] ?? "")} type={c.type} onCommit={(v) => setCell(r.id, c.id, v)} />
                    )}
                  </td>
                ))}
                <td className="tt-td tt-td-add" />
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="tt-foot">
              <td className="tt-td tt-td-grip" />
              {data.columns.map((c, i) => (
                <td key={c.id} className="tt-td tt-foot-cell">
                  {i === 0 ? (
                    <span className="tt-count">
                      {data.rows.length} {data.rows.length === 1 ? "row" : "rows"}
                    </span>
                  ) : c.sum ? (
                    <span className="tt-sum">
                      <span style={{ color: "var(--text-faint)" }}>Σ</span>{" "}
                      {data.rows.reduce((s, r) => s + num(r.cells[c.id]), 0).toFixed(2)}
                    </span>
                  ) : null}
                </td>
              ))}
              <td className="tt-td tt-td-add" />
            </tr>
          </tfoot>
        </table>
      </div>
      <button type="button" className="tt-addrow" onClick={addRow}>
        <Plus size={13} /> New {data.addLabel ?? "row"}
      </button>
    </>
  );

  const col = colMenu ? data.columns.find((c) => c.id === colMenu.id) : undefined;

  return (
    <NodeViewWrapper className="tt-wrap" contentEditable={false}>
      <div className="tt-bar">
        <button type="button" className="tt-expand" title="Open full screen" onClick={() => setExpanded(true)}>
          <Maximize2 size={13} /> Expand
        </button>
      </div>
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
