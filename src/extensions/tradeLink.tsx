/**
 * TradeLink — an inline chip that references a trade (e.g. link a journal note
 * to the exact trade where the mistake happened). Mirrors PageLink: inserting
 * one opens a trade picker; a filled chip shows the symbol + P&L and (at
 * transfer) opens that trade in the dashboard. PROTOTYPE: trades are mocked and
 * onOpen is a no-op until the Alltra dashboard is wired in.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { Search } from "lucide-react";
import { TradeLinkIcon } from "../editorIcons";
import { useFlipPosition } from "../lib/popover";

export interface TradeRef {
  id: string;
  symbol: string;
  side: "long" | "short";
  pnl: number;
  date: string;
  account: string;
}
export interface TradeLinkOptions {
  getTrades: () => TradeRef[];
  onOpen: (tradeId: string) => void;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tradeLink: {
      insertTradeLink: () => ReturnType;
    };
  }
}

const POS = "var(--success)";
const NEG = "var(--danger)";
const money = (n: number) => `${n >= 0 ? "+" : "−"}$${Math.abs(n).toFixed(2)}`;

/* trade dates arrive as YYYY-MM-DD from the store contract, but v3 trade
   tables publish display strings ("Aug 24, 2026 09:46") — parse both. */
function parseTradeDate(dateStr: string): Date {
  const iso = new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(iso.getTime()) ? new Date(dateStr) : iso;
}

function dateLabel(dateStr: string): string {
  const d = parseTradeDate(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function dayName(dateStr: string): string {
  const d = parseTradeDate(dateStr);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", { weekday: "long" });
}

// Given a table column's header label, derive the value from the linked trade.
// Returns null for columns we don't recognize (e.g. "Model") so they're left
// for the user to fill in.
function valueForColumn(rawLabel: string, trade: TradeRef): string | null {
  const l = rawLabel.trim().toLowerCase();
  if (!l) return null;
  if (/\bday\b|weekday/.test(l)) return dayName(trade.date);
  if (/\bdate\b/.test(l)) return dateLabel(trade.date);
  if (l === "l/s" || /\bside\b|direction|long|short/.test(l))
    return trade.side === "long" ? "Long" : "Short";
  if (l === "w/l" || /\bwin\b|\bloss\b|result|outcome/.test(l))
    return trade.pnl >= 0 ? "Win" : "Loss";
  if (/symbol|ticker|instrument/.test(l)) return trade.symbol;
  if (/p&l|pnl|p\/l|profit/.test(l)) return money(trade.pnl);
  if (/account/.test(l)) return trade.account;
  return null;
}

// When a trade is linked inside a content table, fill the OTHER empty cells that
// belong to the same record from the trade — matching each by its label. Handles
// both table orientations:
//   • horizontal — labels across the top row, one record per row
//   • vertical   — labels down the left column, one record per table
// Only ever writes into empty cells (never overwrites what you've typed). No-op
// outside a table. Mutates `tr`; positions come from the pre-edit `state.doc`
// (the setNodeMarkup that fills the chip doesn't shift positions).
function autofillTradeRow(
  tr: Transaction,
  state: EditorState,
  tradeLinkPos: number,
  trade: TradeRef
): void {
  const $pos = state.doc.resolve(tradeLinkPos);
  let rowDepth = -1;
  let tableDepth = -1;
  let cellDepth = -1;
  for (let d = $pos.depth; d >= 0; d--) {
    const name = $pos.node(d).type.name;
    if (cellDepth < 0 && (name === "tableCell" || name === "tableHeader"))
      cellDepth = d;
    if (rowDepth < 0 && name === "tableRow") rowDepth = d;
    if (name === "table") {
      tableDepth = d;
      break;
    }
  }
  if (rowDepth < 0 || tableDepth < 0 || cellDepth < 0) return;

  const table = $pos.node(tableDepth);
  const chipRow = $pos.index(tableDepth); // row index within the table
  const chipCol = $pos.index(rowDepth); // cell index within the row

  // walk every cell → its label text, emptiness, and caret position inside it
  const grid: Record<string, { at: number; empty: boolean; label: string }> = {};
  let rowPos = $pos.start(tableDepth); // position before the first row
  table.forEach((row, _ro, r) => {
    let cellPos = rowPos + 1; // inside the row, before the first cell
    row.forEach((cell, _co, c) => {
      grid[`${r},${c}`] = {
        at: cellPos + 2, // into the cell (+1) then its paragraph (+1)
        empty: cell.textContent.trim().length === 0,
        label: cell.textContent,
      };
      cellPos += cell.nodeSize;
    });
    rowPos += row.nodeSize;
  });

  // vertical = the chip's row leads with a header cell and the chip is a value
  // (not the label column itself)
  const vertical =
    table.child(chipRow).child(0).type.name === "tableHeader" && chipCol > 0;

  const inserts: { at: number; text: string }[] = [];
  if (vertical) {
    // each OTHER row: label in col 0, target value in the chip's column
    for (let r = 0; r < table.childCount; r++) {
      if (r === chipRow) continue;
      const label = grid[`${r},0`];
      const target = grid[`${r},${chipCol}`];
      if (!label || !target || !target.empty) continue;
      const val = valueForColumn(label.label, trade);
      if (val) inserts.push({ at: target.at, text: val });
    }
  } else {
    if (chipRow === 0) return; // the chip sits in the header row itself
    // each OTHER column: label in header row 0, target in the chip's row
    table.child(0).forEach((_hCell, _o, c) => {
      if (c === chipCol) return;
      const label = grid[`0,${c}`];
      const target = grid[`${chipRow},${c}`];
      if (!label || !target || !target.empty) return;
      const val = valueForColumn(label.label, trade);
      if (val) inserts.push({ at: target.at, text: val });
    });
  }

  // apply right-to-left so earlier insert positions stay valid
  inserts.sort((a, b) => b.at - a.at);
  for (const ins of inserts) tr.insertText(ins.text, ins.at);
}

function TradeLinkView({ node, updateAttributes, extension, editor, deleteNode, getPos }: NodeViewProps) {
  const tradeId = (node.attrs.tradeId as string | null) ?? null;
  const symbol = (node.attrs.symbol as string) || "";
  const pnl = node.attrs.pnl as number | null;
  const opts = extension.options as TradeLinkOptions;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const autoOpened = useRef(false);

  // flip above when near the viewport bottom; clamp on-screen; measured size
  const pos = useFlipPosition(
    open,
    () => {
      const r = ref.current?.getBoundingClientRect();
      return r && r.width > 0 ? r : null;
    },
    popRef,
    { prefer: "below", gap: 6 }
  );

  const openPicker = () => setOpen(true);

  useEffect(() => {
    if (!tradeId && !autoOpened.current) {
      autoOpened.current = true;
      openPicker();
    }
  }, [tradeId]);

  // Dismissing without choosing removes the unfilled chip (so a lingering empty
  // node can't re-pop its picker and trap focus) and hands focus back to the doc.
  const emptyRef = useRef(true);
  emptyRef.current = !tradeId;
  const close = () => {
    setOpen(false);
    if (emptyRef.current) deleteNode();
    editor.commands.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as unknown as HTMLElement;
      if (!popRef.current?.contains(t) && !ref.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onClick = () => {
    if (tradeId) opts.onOpen(tradeId);
    else openPicker();
  };

  // fill the chip AND, if it lives in a content table, auto-populate that row's
  // other columns (Day / Date / L·S / W·L / Symbol / P&L / Account) from the trade
  const pickTrade = (t: TradeRef) => {
    const pos = typeof getPos === "function" ? getPos() : null;
    if (pos == null) {
      updateAttributes({ tradeId: t.id, symbol: t.symbol, pnl: t.pnl });
    } else {
      editor
        .chain()
        .focus()
        .command(({ tr, state }) => {
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            tradeId: t.id,
            symbol: t.symbol,
            pnl: t.pnl,
          });
          autofillTradeRow(tr, state, pos, t);
          return true;
        })
        .run();
    }
    setOpen(false);
  };

  const q = query.trim().toLowerCase();
  const trades = opts
    .getTrades()
    .filter(
      (t) =>
        !q ||
        `${t.symbol} ${t.account} ${dateLabel(t.date)}`
          .toLowerCase()
          .includes(q)
    );

  return (
    <NodeViewWrapper
      as="span"
      ref={ref}
      className="jtradelink"
      data-empty={tradeId ? "false" : "true"}
      contentEditable={false}
      title={
        tradeId ? "Open trade (connects to the dashboard at launch)" : "Choose a trade"
      }
      onClick={onClick}
    >
      <TradeLinkIcon size={12} />
      {tradeId ? (
        <>
          {symbol}{" "}
          <span style={{ color: (pnl ?? 0) >= 0 ? POS : NEG, fontWeight: 600 }}>
            {money(pnl ?? 0)}
          </span>
        </>
      ) : (
        "Link trade…"
      )}
      {open &&
        createPortal(
          <div
            ref={popRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              left: pos?.x ?? 0,
              top: pos?.y ?? 0,
              opacity: pos ? 1 : 0,
              pointerEvents: pos ? "auto" : "none",
              zIndex: 9000,
              width: 290,
              fontFamily: '"Inter", system-ui, sans-serif',
            }}
            className="rounded-xl border border-border bg-elevated p-2 shadow-lg"
          >
            <div className="mb-1 flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5">
              <Search size={13} className="text-text-faint" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Link a trade…"
                className="w-full bg-transparent text-[12.5px] text-text outline-none placeholder:text-text-faint"
              />
            </div>
            <p className="px-1 pb-1 text-[10px] font-medium tracking-wide text-text-faint">
              Recent trades · demo
            </p>
            <div className="hide-scrollbar max-h-[260px] overflow-y-auto">
              {trades.length === 0 ? (
                <p className="px-2 py-3 text-[12px] text-text-faint">
                  No trades to link.
                </p>
              ) : (
                trades.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => pickTrade(t)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[var(--hover-overlay)]"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-card text-text-muted">
                      <TradeLinkIcon size={14} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-semibold text-text">
                        {t.symbol}{" "}
                        <span className="text-[11px] font-normal text-text-faint">
                          {t.side} · {dateLabel(t.date)} · {t.account}
                        </span>
                      </span>
                    </span>
                    <span
                      className="shrink-0 text-[12.5px] font-semibold"
                      style={{ color: t.pnl >= 0 ? POS : NEG }}
                    >
                      {money(t.pnl)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </NodeViewWrapper>
  );
}

export const TradeLink = Node.create<TradeLinkOptions>({
  name: "tradeLink",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return {
      getTrades: () => [],
      onOpen: () => {},
    };
  },

  addAttributes() {
    return {
      tradeId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-trade-id") || null,
        renderHTML: (attrs) =>
          attrs.tradeId ? { "data-trade-id": attrs.tradeId } : {},
      },
      symbol: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-symbol") || "",
        renderHTML: (attrs) =>
          attrs.symbol ? { "data-symbol": attrs.symbol } : {},
      },
      pnl: {
        default: null,
        parseHTML: (el) => {
          const v = el.getAttribute("data-pnl");
          return v == null ? null : Number(v);
        },
        renderHTML: (attrs) =>
          attrs.pnl == null ? {} : { "data-pnl": String(attrs.pnl) },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="tradeLink"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "tradeLink",
        class: "jtradelink",
      }),
      `↗ ${(node.attrs.symbol as string) || "trade"}`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TradeLinkView);
  },

  addCommands() {
    return {
      insertTradeLink:
        () =>
        ({ chain }) =>
          chain()
            .insertContent([
              { type: this.name },
              { type: "text", text: " " },
            ])
            .run(),
    };
  },
});
