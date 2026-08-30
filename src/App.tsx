import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode, PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExt from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { ResizableImage } from "./extensions/image";
import Placeholder from "@tiptap/extension-placeholder";
import TextStyle from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { FontSize } from "./extensions/fontSize";
import { LetterSpacing } from "./extensions/letterSpacing";
import { Callout } from "./extensions/callout";
import { Toggle } from "./extensions/toggle";
import { TextColor, BgColor, BlockStyle } from "./extensions/color";
import { Badge } from "./extensions/badge";
import { Tag } from "./extensions/tag";
import { IconNode } from "./extensions/iconNode";
import { Banner } from "./extensions/banner";
import { PageLink, type PageLinkEntry } from "./extensions/pageLink";
import { TradeLink } from "./extensions/tradeLink";
import { TradeTable, tradeTableHTML } from "./extensions/tradeTable";
import { JournalStats, journalStatsHTML } from "./extensions/journalStats";
import { MOCK_TRADES } from "./trades";
import { allTrades, pruneTrades } from "./tradeStore";
import { imagePasteProps, pruneImages, collectImageIds, resolveImage, IDB_PREFIX } from "./imageStore";
import { htmlToMarkdown } from "./backup";
import { DayHeader, DAY_HEADER_HTML } from "./extensions/dayHeader";
import { EmotionsWidget } from "./components/EmotionsWidget";
import { BackupMenu } from "./components/BackupMenu";
import { ListExit } from "./extensions/listExit";
import { TaskListVariant } from "./extensions/taskListVariant";
import { BlockDim, setDimmedBlock, clearDimmedBlock } from "./extensions/blockDim";
import { TrailingNode } from "./extensions/trailingNode";
import { SlashCommand } from "./slash/SlashCommand";
import {
  SLASH_COMMANDS,
  runFavoriteCommand,
  PANEL_COMMAND_IDS,
} from "./slash/commands";
import { aiTransform, type AiAction } from "./ai/rewrite";
import {  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Palette,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Copy,
  Download,
  FileText,
  Printer,
  GripVertical,
  LayoutTemplate,
  Loader2,  Pencil,
  Maximize2,
  Menu,
  Minimize2,
  Plus,
  PanelLeft,
  PanelRight,
  RotateCcw,
  Sun,
  Trash2,
  X,
  Search,  Share2,  Sparkles,
  Star,
  StickyNote,
  MoreVertical,
} from "lucide-react";
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  TextIcon,
  LineSpacingIcon,
  LetterSpacingIcon,
} from "./editorIcons";
import { AppSidebar, APP_SIDEBAR_WIDTH } from "./components/AppSidebar";
import { DailyPerformance } from "./components/DailyPerformance";
import {
  JournalCalendarWidget,
  type JournalDayData,
} from "./components/JournalCalendarWidget";
import { TodaysJournalWidget } from "./components/TodaysJournalWidget";
import { JournalQualityWidget } from "./components/JournalQualityWidget";
import { BlockMenu } from "./components/BlockMenu";
import { JournalByline, TITLE_MAX } from "./components/JournalByline";
import { NotesPage, noteBodies, noteSummaries } from "./components/NotesPage";
import { Spotlight, extractTags } from "./components/Spotlight";
import { TradeDetailsPanel } from "./components/TradeDetailsPanel";
import { SelectionMenu, type MenuState } from "./components/SelectionMenu";
import { EditorContextMenu } from "./components/EditorContextMenu";
import { TemplateGallery } from "./components/TemplateGallery";
import { TableMenu } from "./components/TableMenu";
import {
  AppearancePanel,
  type ThemeName,
  type AccentName,
} from "./components/AppearancePanel";
import {
  AlltraSideNav,
  RAIL_WIDTH_EXPANDED,
  RAIL_WIDTH_COLLAPSED,
} from "./components/AlltraSideNav";
import { NikkiPanel } from "./components/NikkiPanel";
import { IntelligenceMark } from "./components/IntelligenceMark";
import { TEMPLATES, type JournalTemplate } from "./templates";

/* ── config ──────────────────────────────────────────────────────────────── */

const FONTS = [
  { label: "Inter", value: '"Inter", system-ui, sans-serif' },
  { label: "Georgia", value: 'Georgia, "Times New Roman", serif' },
  { label: "Mono", value: 'ui-monospace, "SF Mono", Consolas, monospace' },
];

// Size  → font-size 13px..22px   Spacing → line-height 1.4..2.2
const sizePx = (v: number) => `${(13 + v * 9).toFixed(1)}px`;
const lineHeight = (v: number) => 1.4 + v * 0.8;
// letter spacing (tracking): v 0→1 maps -0.04em (tight) … +0.12em (wide);
// v 0.25 = 0em. Default 0.2 ≈ -0.01em (Alltra's standard tight tracking).
const trackingEm = (v: number) => `${((v - 0.25) * 0.16).toFixed(3)}em`;

// journal entries — each is one "page" in the book. Edits persist while flipping.
const PAGES: string[] = [
  `<h1>The New Beginning..</h1>
<h2>Introduction</h2>
<p>A quick fox slipped across the dewy field, <strong>leaving faint tracks</strong> in the early light as the world around it slowly stirred awake. The air smelled clean, carrying with it the soft hush of last night's rain, and the hum of insects rose like an orchestra tuning up for the day.</p>
<p>The fox paused beside a shallow pool, its <strong>reflection trembling</strong> with every ripple, then darted on as if chasing something only it could see. The scene was quiet yet alive, a small reminder that even the simplest movements could stitch together the <strong>rhythm of a morning.</strong></p>
<h2>Daily Routine</h2>
<p>The fox's day is <strong>filled with small yet meaningful</strong> moments. From hunting for food to resting in the shade, each habit keeps it alert and thriving.</p>
<ul><li>Roaming the meadow at first light</li><li>Hunting along the quiet hedgerows</li><li>Resting beneath the old oak</li><li>Staying watchful as the dusk settles</li></ul>`,
  `<h1>Morning pages</h1>
<p>Three pages, longhand, before the day asks anything of me. No editing, no stopping — just the <strong>clearing of the mind</strong> onto the sheet.</p>
<h2>Today</h2>
<p>Slept well. The light came in soft and grey. I want to keep things simple: write, walk, read, repeat.</p>`,
  `<h1>Field notes — June</h1>
<h2>Observations</h2>
<p>The hedgerows are thick now, loud with sparrows at dawn. I counted four foxes this week along the old track.</p>
<ul><li>Dawn chorus peaks around 5:10</li><li>Wildflowers opening on the south bank</li><li>River running low after the dry spell</li></ul>`,
  ``,
];

const STORAGE_KEY = "alltra-journal-v1";
const APPEARANCE_KEY = "alltra-journal-appearance";
const ACCENT_KEY = "alltra-journal-accent";
const THEME_NAMES = ["light", "dark", "onyx", "amber", "iris", "slate"] as const;
const FAVORITES_KEY = "alltra-journal-favorites";
const TEMPLATE_FAVS_KEY = "alltra-journal-template-favs";
const CUSTOM_TEMPLATES_KEY = "alltra-journal-custom-templates";
const DEFAULT_DATE = "2026-06-24";
// The AI assistant's name. At transfer this reads the user's custom name;
// defaults to the product's own "Alltra Intelligence".
const ASSISTANT_NAME = "Alltra Intelligence";

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function loadTemplateFavs(): string[] {
  try {
    const raw = localStorage.getItem(TEMPLATE_FAVS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function loadCustomTemplates(): JournalTemplate[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
    return raw ? (JSON.parse(raw) as JournalTemplate[]) : [];
  } catch {
    return [];
  }
}

/**
 * The assembled "Trading Journal 2026" template — a Notion/Bionics-style notebook
 * in one page: a trade log, live performance stats, a weekly review, a pre-trade
 * checklist and a mistakes log. Built from the real presets so the schemas stay
 * in one place. The stats blocks read the live trade store, so they populate as
 * trades are logged into the table above.
 */
const ic = (emoji: string) => `<span data-type="icon" class="jicon">${emoji}</span>`;
const TRADING_JOURNAL_TEMPLATE: JournalTemplate = {
  id: "trading-journal-2026",
  name: "Trading Journal 2026",
  description: "Full notebook — trade log, live stats, weekly review, checklist & mistakes",
  accent: "#0066ff",
  html:
    `<h2>${ic("📓")} Trading Journal 2026</h2>` +
    `<p>Your complete trading notebook — log every trade, watch your stats update live, review each week, run the checklist before you enter, and learn from your mistakes.</p>` +
    `<hr>` +
    `<h3>${ic("📈")} Daily Trade Log</h3>` +
    `<p>One row per trade — entry, exit, setup, tags and screenshots. Everything you log here feeds the stats below.</p>` +
    tradeTableHTML("trade") +
    `<h3>${ic("📊")} Performance</h3>` +
    `<p>Live from your logged trades.</p>` +
    journalStatsHTML("summary") +
    journalStatsHTML("winloss") +
    journalStatsHTML("monthly") +
    `<h3>${ic("🗓️")} Weekly Review</h3>` +
    `<p>Close out each week — the numbers, the emotion, the grade and the lesson.</p>` +
    tradeTableHTML("weekly") +
    `<h3>${ic("✅")} Pre-trade Checklist</h3>` +
    `<p>Tick every rule before you take a trade.</p>` +
    tradeTableHTML("checklist") +
    `<h3>${ic("🔧")} Mistakes / Filter</h3>` +
    `<p>Log recurring mistakes, tag the cause, and capture the fix so you stop repeating them.</p>` +
    tradeTableHTML("mistakes"),
};

type TrashItem = {
  html: string;
  title: string;
  date: string;
  /** the byline (chrome) title, restored with the entry (older items lack it) */
  entryTitle?: string;
};

type Saved = {
  pages: string[];
  dates: string[];
  /** per-entry editable chrome title (parallel to pages; "" = fall back to derived). */
  titles?: string[];
  /** epoch ms of the last save, for the byline's "Last updated" stamp. */
  updatedAt?: number;
  trash?: TrashItem[];
  page: number;
  theme: number;
  font: number;
  sizeV: number;
  spacingV: number;
  trackingV?: number;
  align: number;
};

function loadSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

// pull a sidebar label out of a page's HTML: prefer the first heading, else the
// first block's text — block-separated so a heading/cell never fuses into the
// next block ("Content table" not "Content tableA tidy label…").
function deriveTitle(html: string): string {
  const el = document.createElement("div");
  el.innerHTML = html;
  const heading = el.querySelector("h1,h2,h3")?.textContent?.trim();
  if (heading) return heading.slice(0, 42);
  el.querySelectorAll("p,li,td,th,blockquote,pre").forEach((n) => n.append(" "));
  const text = (el.textContent || "").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, 42) : "Untitled";
}

// flatten a page's HTML to plain text (for search)
function htmlToText(html: string): string {
  const el = document.createElement("div");
  el.innerHTML = html;
  // separate block elements so a heading doesn't fuse into the next block
  // ("Content table" + "A tidy label" → "Content table A tidy label", not "…tableA…")
  el.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li,td,th,blockquote,pre").forEach(
    (n) => n.append(" ")
  );
  return (el.textContent || "").replace(/\s+/g, " ").trim();
}

// does an entry have real content (beyond an empty doc)? — the commit gate.
// Text counts, but so do content atoms that serialize with no text (an image,
// a banner, a table, a stats block) — an image-only entry is a real entry.
function hasMeaningfulContent(html: string): boolean {
  if (htmlToText(html).length > 0) return true;
  const el = document.createElement("div");
  el.innerHTML = html;
  return !!el.querySelector(
    'img[src], table, [data-type="banner"], [data-type="trade-table"], [data-type="journal-stats"], [data-type="pageLink"], [data-type="tradeLink"], [data-type="day-header"][data-filled]'
  );
}


// saved custom templates' HTML — they can reference idb:// screenshots too
function customTemplateBodies(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
    if (raw) return (JSON.parse(raw) as { html?: string }[]).map((t) => t.html ?? "");
  } catch {
    /* ignore */
  }
  return [];
}

/* ── trade lookup — the FULL row behind a trade id, and the entry it lives on ── */
export interface TradeRowHit {
  tableId: string;
  entryIndex: number; // -1 when the table lives in a note or is gone
  columns: { id: string; name: string; type: string; group?: string; options?: { label: string; color: string }[] }[];
  row: { id: string; cells: Record<string, unknown> };
}
function findTradeRow(tradeId: string, pages: string[], extra: string[] = []): TradeRowHit | null {
  const el = document.createElement("div");
  const scan = (html: string, entryIndex: number): TradeRowHit | null => {
    if (!html.includes(tradeId)) return null;
    el.innerHTML = html;
    for (const n of Array.from(el.querySelectorAll('[data-type="trade-table"]'))) {
      try {
        const data = JSON.parse(n.getAttribute("data-rows") || "{}") as {
          id?: string;
          columns?: TradeRowHit["columns"];
          rows?: TradeRowHit["row"][];
        };
        const row = data.rows?.find((r) => r.id === tradeId);
        if (row && data.columns) return { tableId: data.id ?? "", entryIndex, columns: data.columns, row };
      } catch {
        /* skip */
      }
    }
    return null;
  };
  for (let i = 0; i < pages.length; i++) {
    const hit = scan(pages[i], i);
    if (hit) return hit;
  }
  for (const html of extra) {
    const hit = scan(html, -1);
    if (hit) return hit;
  }
  return null;
}

// the print window's document shell (body = the entry HTML, images pre-resolved)
const PRINT_SHELL = (title: string, body: string): string =>
  `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>` +
  `<style>` +
  `body{font-family:Inter,system-ui,sans-serif;color:#1f2024;max-width:680px;margin:48px auto;padding:0 24px;line-height:1.7}` +
  `h1{font-size:1.9rem;letter-spacing:-0.02em;margin:0 0 1rem}` +
  `h2{font-size:1.15rem;margin:1.6rem 0 .4rem}h3{font-size:1rem;margin:1.2rem 0 .3rem}` +
  `blockquote{border-left:3px solid #ddd;padding-left:1rem;color:#555;margin:.6rem 0}` +
  `pre{background:#f5f5f5;padding:.8rem 1rem;border-radius:8px;overflow:auto}` +
  `code{background:#f0f0f0;padding:.1em .35em;border-radius:4px;font-size:.9em}` +
  `pre code{background:none;padding:0}` +
  `ul[data-type=taskList]{list-style:none;padding-left:.2rem}` +
  `ul[data-type=taskList] li{display:flex;gap:.5rem;align-items:flex-start}` +
  `table{border-collapse:collapse;width:100%;margin:.8rem 0;font-size:.95em}` +
  `th,td{border:1px solid #ddd;padding:6px 10px;text-align:left;vertical-align:top}` +
  `th{background:#f5f5f5;font-weight:600}` +
  `div[data-type=callout]{display:flex;gap:.6rem;padding:.7rem .9rem;border-radius:8px;background:#f4f4f5;border:1px solid #e6e6e6;margin:.6rem 0}` +
  `span[data-type=tag]{display:inline-block;padding:.05em .5em;border-radius:999px;background:#eee;font-size:.85em;margin:0 .1em}` +
  `div[data-type=toggle][data-open=false] > *:not(:first-child){display:none}` +
  `span[data-type=icon]{display:inline}` +
  `img{max-width:100%}` +
  `</style></head><body>${body}</body></html>`;

// every trade-table id present in the given HTML payloads (for store pruning)
function collectTradeTableIds(htmls: string[]): Set<string> {
  const ids = new Set<string>();
  const el = document.createElement("div");
  for (const html of htmls) {
    if (!html || !html.includes("trade-table")) continue;
    el.innerHTML = html;
    el.querySelectorAll('[data-type="trade-table"]').forEach((n) => {
      try {
        const data = JSON.parse(n.getAttribute("data-rows") || "{}") as {
          id?: string;
        };
        if (data.id) ids.add(data.id);
      } catch {
        /* unparseable table — leave its store entry alone by adding nothing */
      }
    });
  }
  return ids;
}

// "Today" / "Yesterday" / "Jun 23" for a YYYY-MM-DD date row label
function fmtDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}


// the byline stamp — "3:19 PM" for a save today, "Jun 18, 3:19 PM" any other day
function updatedStamp(ms: number): string {
  const d = new Date(ms);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const clock = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return sameDay ? clock : `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${clock}`;
}

// each theme carries an accent AND a font, so swatches change the whole feel
const THEMES = [
  { name: "Slate", accent: "#1f2024", font: 0, bg: "bg-white", fg: "text-[#1f2024]" },
  { name: "Blue", accent: "#0066ff", font: 0, bg: "bg-[#eef4ff]", fg: "text-[#0066ff]" },
  { name: "Green", accent: "#1f9d57", font: 1, bg: "bg-[#eefaf0]", fg: "text-[#1f9d57]" },
  { name: "Amber", accent: "#cf9410", font: 1, bg: "bg-[#fff7e6]", fg: "text-[#cf9410]" },
  {
    name: "Violet",
    accent: "#8b51e0",
    font: 2,
    bg: "bg-gradient-to-br from-[#f1e9ff] to-[#ffe9f3]",
    fg: "text-[#8b51e0]",
  },
];

/* ── small building blocks ───────────────────────────────────────────────── */

function ChromeBtn({
  children,
  onClick,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-[8px] text-text-muted transition-colors hover:bg-[var(--hover-overlay)] hover:text-text"
    >
      {children}
    </button>
  );
}

/* circle / square icon control with the label beneath it (reference style) */
function Control({
  icon,
  label,
  onClick,
  onMouseDown,
  shape = "square",
  active = false,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  onMouseDown?: () => void;
  shape?: "square" | "circle";
  active?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          onMouseDown?.();
        }}
        onClick={onClick}
        title={label}
        className={
          "grid h-[62px] place-items-center shadow-sm transition-colors " +
          (shape === "circle" ? "aspect-square rounded-full " : "w-full rounded-2xl ") +
          (active
            ? "border border-[var(--alltra-brand)] bg-[rgba(var(--alltra-brand-rgb),0.08)] text-[var(--alltra-brand)]"
            : "bg-[var(--hover-overlay)] text-text-muted hover:bg-[var(--hover-overlay-medium)] hover:text-text")
        }
      >
        {icon}
      </button>
      <span
        className={
          "text-[12px] font-medium " +
          (active ? "text-[var(--alltra-brand)]" : "text-text-muted")
        }
      >
        {label}
      </span>
    </div>
  );
}

/* Pinned grid — iOS-style reordering. While dragging, the DOM order stays put;
   the dragged pill floats under the cursor and the other pills glide to their
   new slots purely via CSS transforms snapshotted at drag-start (no reflow, no
   FLIP measurement races → smooth and never out of bounds). Tap = run command. */
function PinnedGrid({
  ids,
  editor,
  pinnedSelRef,
  onReorder,
}: {
  ids: string[];
  editor: Editor | null;
  pinnedSelRef: {
    current: { from: number; to: number; node?: boolean } | null;
  };
  onReorder: (next: string[]) => void;
}) {
  // favorites that actually render (skip Text-Editor-panel dupes + unknown ids)
  const renderIds = ids.filter(
    (id) =>
      !PANEL_COMMAND_IDS.has(id) && !!SLASH_COMMANDS.find((c) => c.id === id)?.icon
  );
  const key = renderIds.join(",");

  // `order` is stable for the whole drag — it only changes on commit/resync
  const [order, setOrder] = useState<string[]>(renderIds);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState(0); // target slot under the cursor
  const [ptr, setPtr] = useState({ x: 0, y: 0 }); // floating pill top-left
  const [dragW, setDragW] = useState(0);

  const wrapRefs = useRef<Record<string, HTMLElement | null>>({});
  const drag = useRef<{
    id: string;
    dragIndex: number;
    grab: { x: number; y: number };
    start: { x: number; y: number };
    started: boolean;
    // viewport positions of every slot, snapshotted once when the drag starts
    rects: { left: number; top: number; w: number; h: number }[];
  } | null>(null);

  // resync to favorites whenever the pinned set changes and we're not dragging
  useEffect(() => {
    if (!drag.current) setOrder(renderIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const begin = (e: ReactPointerEvent<HTMLElement>, id: string) => {
    // capture the editor selection up-front so a plain tap still runs the
    // command exactly where the caret was
    if (editor) {
      const sel = editor.state.selection;
      // remember a block NodeSelection (image, table…) as such — restoring it
      // as a TextSelection would make insert commands REPLACE the node
      const node = (sel as unknown as { node?: { isBlock?: boolean } }).node;
      pinnedSelRef.current = { from: sel.from, to: sel.to, node: !!node?.isBlock };
    }
    const el = wrapRefs.current[id];
    if (!el) return;
    const r = el.getBoundingClientRect();
    drag.current = {
      id,
      dragIndex: order.indexOf(id),
      grab: { x: e.clientX - r.left, y: e.clientY - r.top },
      start: { x: e.clientX, y: e.clientY },
      started: false,
      rects: [],
    };
    setDragW(r.width);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const move = (e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    if (!d.started) {
      // small threshold so a tap isn't read as a drag
      if (Math.hypot(e.clientX - d.start.x, e.clientY - d.start.y) < 5) return;
      d.started = true;
      // snapshot stable slot geometry NOW, before any transform is applied
      d.rects = order.map((pid) => {
        const r = wrapRefs.current[pid]!.getBoundingClientRect();
        return { left: r.left, top: r.top, w: r.width, h: r.height };
      });
      setDragId(d.id);
      setOverIndex(d.dragIndex);
    }
    setPtr({ x: e.clientX - d.grab.x, y: e.clientY - d.grab.y });
    // target slot = the one whose center is nearest the cursor
    let nearest = d.dragIndex;
    let best = Infinity;
    d.rects.forEach((rc, i) => {
      const dist = Math.hypot(
        e.clientX - (rc.left + rc.w / 2),
        e.clientY - (rc.top + rc.h / 2)
      );
      if (dist < best) {
        best = dist;
        nearest = i;
      }
    });
    if (nearest !== overIndex) setOverIndex(nearest);
  };

  const end = (e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    if (d.started) {
      // commit: move the dragged id from its slot to the hovered slot
      const next = [...order];
      const [moved] = next.splice(d.dragIndex, 1);
      next.splice(overIndex, 0, moved);
      setOrder(next); // transforms clear (dragId null) → snaps to final, no flash
      setDragId(null);
      onReorder(next);
    } else if (editor) {
      // a tap → run the command at the captured selection
      const cmd = SLASH_COMMANDS.find((c) => c.id === d.id);
      if (cmd) {
        const sel = pinnedSelRef.current;
        if (sel && sel.to <= editor.state.doc.content.size) {
          if (sel.node) editor.commands.setNodeSelection(sel.from);
          else editor.commands.setTextSelection(sel);
        }
        runFavoriteCommand(editor, cmd);
      }
    }
  };

  // while dragging, which visual slot should the pill at original index i occupy?
  const slotOf = (i: number) => {
    const d = drag.current;
    if (!d) return i;
    const from = d.dragIndex;
    if (i === from) return i; // the dragged pill itself (invisible placeholder)
    if (from < overIndex) return i > from && i <= overIndex ? i - 1 : i;
    if (from > overIndex) return i >= overIndex && i < from ? i + 1 : i;
    return i;
  };

  const dragCmd = dragId ? SLASH_COMMANDS.find((c) => c.id === dragId) : null;
  const DragIcon = dragCmd?.icon;
  const rects = drag.current?.rects;

  return (
    <>
      <div className="grid grid-cols-5 gap-2.5">
        {order.map((id, i) => {
          const cmd = SLASH_COMMANDS.find((c) => c.id === id);
          const Icon = cmd?.icon;
          if (!cmd || !Icon) return null;
          const isDragged = dragId === id;
          // translate the pill from its home slot to its target slot
          let transform = "";
          if (dragId && rects && !isDragged) {
            const home = rects[i];
            const targ = rects[slotOf(i)];
            if (home && targ)
              transform = `translate(${targ.left - home.left}px, ${
                targ.top - home.top
              }px)`;
          }
          return (
            <div
              key={id}
              ref={(el) => (wrapRefs.current[id] = el)}
              onPointerDown={(e) => begin(e, id)}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
              style={{
                transform,
                // animate only while a drag is active; snap instantly otherwise
                transition: dragId
                  ? "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)"
                  : "none",
                zIndex: isDragged ? 1 : 2,
              }}
              className={
                "flex cursor-grab touch-none select-none flex-col items-center gap-1.5 active:cursor-grabbing " +
                (isDragged ? "opacity-0" : "")
              }
            >
              <div className="grid aspect-square h-[62px] place-items-center rounded-full bg-[var(--hover-overlay)] text-text-muted shadow-sm transition-colors hover:bg-[var(--hover-overlay-medium)] hover:text-text">
                <Icon size={17} />
              </div>
              <span className="text-[12px] font-medium text-text-muted">
                {cmd.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* the pill that floats under the finger while dragging */}
      {dragId &&
        DragIcon &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: ptr.x,
              top: ptr.y,
              width: dragW,
              zIndex: 9999,
              pointerEvents: "none",
            }}
            className="flex flex-col items-center gap-1.5"
          >
            <div
              style={{ transform: "scale(1.06)" }}
              className="grid aspect-square h-[62px] w-[62px] place-items-center rounded-full border border-[var(--alltra-brand)] bg-[var(--hover-overlay-medium)] text-[var(--alltra-brand)] shadow-xl"
            >
              <DragIcon size={17} />
            </div>
            <span className="text-[12px] font-medium text-text-muted">
              {dragCmd?.title}
            </span>
          </div>,
          document.body
        )}
    </>
  );
}

/* Apple Control-Center style vertical slider — drag up/down to fill */
function VSlider({
  value,
  onChange,
  icon,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  icon: ReactNode;
  label: string;
}) {
  const set = (el: HTMLElement, clientY: number) => {
    const r = el.getBoundingClientRect();
    onChange(Math.min(1, Math.max(0, 1 - (clientY - r.top) / r.height)));
  };
  return (
    <div className="flex h-full flex-1 flex-col items-center gap-1.5">
      <div
        role="slider"
        aria-valuenow={Math.round(value * 100)}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          set(e.currentTarget, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) set(e.currentTarget, e.clientY);
        }}
        className="relative w-full flex-1 cursor-ns-resize select-none overflow-hidden rounded-[24px] bg-[var(--surface-3)] shadow-sm"
      >
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 bg-[var(--hover-overlay-medium)]"
          style={{ height: `${value * 100}%` }}
        />
        <span className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center text-text-muted">
          {icon}
        </span>
      </div>
      <span className="text-[11px] font-medium text-text-muted">{label}</span>
    </div>
  );
}

/* selection-only AI menu lives in ./components/SelectionMenu (shared with Notes) */

/* ── nav drawer (slide / expand-collapse) — the EnhancedLeftSidebar slot ─── */

interface NavEntry {
  index: number;
  date: string;
  label: string;
  title: string;
  snippet: string;
}

function NavDrawer({
  entries,
  page,
  expanded,
  onSelect,
  onRename,
  onDelete,
  onNew,
  newDisabled = false,
  onSearch,
  onOpenCalendar,
  onOpenNotes,
  onOpenTrash,
  trashCount,
  onToggleExpanded,
  onClose,
  active,
  onFavorite,
  favoriteIds,
  className = "",
}: {
  entries: NavEntry[];
  page: number;
  expanded: boolean;
  onSelect: (i: number) => void;
  onRename: (i: number, name: string) => void;
  onDelete: (i: number) => void;
  onNew: () => void;
  newDisabled?: boolean;
  onSearch: () => void;
  onOpenCalendar: () => void;
  onOpenNotes?: () => void;
  onOpenTrash: () => void;
  trashCount: number;
  onToggleExpanded?: () => void;
  onClose?: () => void;
  active?: "calendar" | "notes";
  onFavorite?: (i: number) => void;
  favoriteIds?: Set<number>;
  className?: string;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  // tree-menu expand/collapse — Today open, Daily Journal collapsed by default
  const [openToday, setOpenToday] = useState(true);
  const [openDaily, setOpenDaily] = useState(false);
  // per-row kebab (⋮) action menu — which entry, and where to anchor it
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const openRowMenu = (i: number, btn: HTMLElement) => {
    const r = btn.getBoundingClientRect();
    setMenuPos({ x: r.right, y: r.bottom + 4 });
    setMenuFor(i);
  };
  const startRename = (i: number) => {
    setEditing(i);
    setDraft(entries.find((e) => e.index === i)?.title || "");
  };
  const commit = () => {
    if (editing !== null) onRename(editing, draft);
    setEditing(null);
  };

  // one entry row — `kind` controls the two lines:
  //  · "today"  → title/first-line on top, snippet below (no redundant "Today")
  //  · "dated"  → the month-date label on top, title/snippet below
  const renderRow = (e: NavEntry, kind: "today" | "dated") => {
    if (editing === e.index) {
      return (
        <input
          key={e.index}
          autoFocus
          value={draft}
          onChange={(ev) => setDraft(ev.target.value)}
          onBlur={commit}
          onKeyDown={(ev) => {
            if (ev.key === "Enter") commit();
            if (ev.key === "Escape") setEditing(null);
          }}
          className="w-full rounded-lg border border-[var(--alltra-brand)] bg-card px-3 py-1.5 text-[12.5px] text-text outline-none"
        />
      );
    }
    const titleLine =
      kind === "today" ? e.title || e.snippet || "Untitled" : e.label;
    const subLine =
      kind === "today"
        ? e.title
          ? e.snippet
          : ""
        : e.title || e.snippet || "Untitled";
    return (
      <div
        key={e.index}
        className={
          "group relative flex items-center rounded-md transition-colors " +
          (e.index === page
            ? "bg-accent-soft"
            : "hover:bg-[var(--hover-overlay)]")
        }
      >
        <button
          onClick={() => onSelect(e.index)}
          className="min-w-0 flex-1 px-3 py-2 pr-12 text-left"
        >
          <div
            className={
              "flex items-center truncate text-[12px] font-semibold " +
              (e.index === page ? "text-text" : "text-text-muted")
            }
          >
            {favoriteIds?.has(e.index) && (
              <Star
                size={11}
                fill="currentColor"
                className="mr-1 shrink-0 text-amber-500"
              />
            )}
            <span className="min-w-0 truncate">{titleLine}</span>
          </div>
          {subLine && (
            <div className="truncate text-[12px] text-text-faint">{subLine}</div>
          )}
        </button>
        <button
          title="More actions"
          onClick={(ev) => {
            ev.stopPropagation();
            openRowMenu(e.index, ev.currentTarget);
          }}
          className={
            "absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-text-faint transition-colors hover:bg-[var(--hover-overlay-medium)] hover:text-text " +
            (menuFor === e.index ? "opacity-100" : "opacity-0 group-hover:opacity-100")
          }
        >
          <MoreVertical size={14} />
        </button>
      </div>
    );
  };

  const todayEntries = entries.filter((e) => e.label === "Today");
  const datedEntries = entries.filter((e) => e.label !== "Today");

  // one collapsible tree group (icon · label · count · chevron, indented kids)
  const treeNode = (
    Icon: typeof Sun,
    label: string,
    open: boolean,
    toggle: () => void,
    rows: NavEntry[],
    kind: "today" | "dated"
  ) => (
    <section>
      <button
        onClick={toggle}
        className="group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[var(--hover-overlay)]"
      >
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-border bg-card text-text-muted">
          <Icon size={13} />
        </span>
        <span className="flex-1 text-[12.5px] font-medium text-text">{label}</span>
        <span className="rounded-md bg-[var(--hover-overlay-medium)] px-1.5 text-[10px] font-semibold tabular-nums text-text-muted">
          {rows.length}
        </span>
        <ChevronDown
          size={14}
          className={
            "text-text-faint transition-transform duration-200 ease-in-out " +
            (open ? "rotate-0" : "-rotate-90")
          }
        />
      </button>
      {/* animated collapse: grid 0fr→1fr transitions height smoothly */}
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-in-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="ml-[19px] mt-0.5 flex flex-col gap-0.5 border-l border-border pl-2">
            {rows.map((e) => renderRow(e, kind))}
          </div>
        </div>
      </div>
    </section>
  );

  const shell: CSSProperties = {
    background: "var(--surface-2)",
    borderRight: "1px solid var(--border-2)",
    transition: "width 0.22s cubic-bezier(0.22,0.61,0.36,1)",
  };

  // ── collapsed icon rail ──────────────────────────────────────────────────
  if (!expanded) {
    const railBtn =
      "grid h-9 w-9 place-items-center rounded-lg text-text-muted transition-colors hover:bg-[var(--hover-overlay-medium)] hover:text-text";
    return (
      <aside
        className={"flex shrink-0 flex-col items-center gap-1.5 overflow-hidden py-4 " + className}
        style={{ ...shell, width: 58 }}
      >
        <button onClick={onToggleExpanded} title="Expand" className={railBtn}>
          <ChevronRight size={18} />
        </button>
        <div className="my-1 h-px w-6 bg-border" />
        <button
          onClick={onNew}
          disabled={newDisabled}
          title={newDisabled ? "10 entries max per day" : "New entry"}
          className={railBtn + " disabled:opacity-30"}
        >
          <Plus size={18} />
        </button>
        <button onClick={onSearch} title="Search (⌘K)" className={railBtn}>
          <Search size={17} />
        </button>
        <button onClick={onOpenCalendar} title="Calendar" className={railBtn}>
          <CalendarDays size={17} />
        </button>
        <div className="flex-1" />
        <button onClick={onOpenTrash} title="Trash" className={"relative " + railBtn}>
          <Trash2 size={17} />
          {trashCount > 0 && (
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--warning)]" />
          )}
        </button>
        <span className="mt-1 grid h-8 w-8 place-items-center rounded-full bg-[var(--alltra-brand)] text-[12px] font-semibold text-white">
          H
        </span>
      </aside>
    );
  }

  // ── expanded drawer ──────────────────────────────────────────────────────
  return (
    <aside
      className={"flex shrink-0 flex-col overflow-hidden px-3.5 py-4 " + className}
      style={{ ...shell, width: 268 }}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="text-[12px] font-semibold tracking-wide text-text-faint">
          Journal
        </span>
        <button
          onClick={onClose ?? onToggleExpanded}
          title={onClose ? "Close" : "Collapse"}
          className="grid h-7 w-7 place-items-center rounded-md text-text-muted transition-colors hover:bg-[var(--hover-overlay)] hover:text-text"
        >
          {onClose ? <X size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <button
        onClick={onSearch}
        className="mb-2.5 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-sm transition-colors hover:bg-card-hover"
      >
        <Search size={15} className="text-text-faint" />
        <span className="flex-1 text-left text-[12.5px] text-text-muted">Search</span>
        <kbd className="rounded border border-border bg-[var(--surface-3)] px-1.5 py-px text-[10px] text-text-faint">
          ⌘K
        </kbd>
      </button>

      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={onNew}
        disabled={newDisabled}
        title={newDisabled ? "10 entries max per day" : "New entry"}
        className="mb-2.5 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-[13px] font-medium text-text shadow-sm transition-colors hover:bg-card-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-card"
      >
        <Plus size={15} /> {newDisabled ? "Day full (10/10)" : "New entry"}
      </button>

      <button
        onClick={onOpenCalendar}
        className={
          "flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors " +
          (active === "calendar"
            ? "bg-accent-soft font-medium text-text"
            : "text-text-muted hover:bg-[var(--hover-overlay)] hover:text-text")
        }
      >
        <CalendarDays size={15} /> Calendar
      </button>

      <button
        onClick={onOpenNotes}
        className={
          "flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors " +
          (active === "notes"
            ? "bg-accent-soft font-medium text-text"
            : "text-text-muted hover:bg-[var(--hover-overlay)] hover:text-text")
        }
      >
        <StickyNote size={15} /> Notes
      </button>

      <div className="mb-3 border-t border-border" />

      <div className="hide-scrollbar -mx-1 flex flex-1 flex-col overflow-y-auto px-1">
        {entries.length === 0 ? (
          <p className="px-2 py-3 text-[12px] text-text-faint">No entries yet.</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {todayEntries.length > 0 &&
              treeNode(
                Sun,
                "Today",
                openToday,
                () => setOpenToday((o) => !o),
                todayEntries,
                "today"
              )}
            {datedEntries.length > 0 &&
              treeNode(
                FileText,
                "Daily Journal",
                openDaily,
                () => setOpenDaily((o) => !o),
                datedEntries,
                "dated"
              )}
          </div>
        )}
      </div>

      <button
        onClick={onOpenTrash}
        className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-text-faint transition-colors hover:bg-[var(--hover-overlay)] hover:text-text-muted"
      >
        <Trash2 size={14} /> Trash
        {trashCount > 0 && (
          <span className="ml-auto rounded-full bg-[var(--hover-overlay-medium)] px-1.5 text-[10px] font-semibold text-text-muted">
            {trashCount}
          </span>
        )}
      </button>

      <div className="mt-2 flex items-center gap-2.5 border-t border-border px-2 pt-3">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--alltra-brand)] text-[12px] font-semibold text-white">
          H
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[12.5px] font-medium text-text">Hussein</p>
          <p className="truncate text-[11px] text-text-faint">@hussein</p>
        </div>
        <span className="ml-auto h-2 w-2 rounded-full bg-[var(--success)]" />
      </div>

      {/* per-row action menu (Edit name · Favorite · Delete) */}
      {menuFor !== null &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[600]"
              onClick={() => setMenuFor(null)}
            />
            <div
              style={{
                position: "fixed",
                left: Math.max(8, menuPos.x - 172),
                top: menuPos.y,
                width: 172,
              }}
              className="z-[601] rounded-xl border border-border bg-elevated p-1.5 shadow-lg"
            >
              <button
                onClick={() => {
                  startRename(menuFor);
                  setMenuFor(null);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] text-text transition-colors hover:bg-[var(--hover-overlay)]"
              >
                <Pencil size={14} className="text-text-muted" /> Edit name
              </button>
              {onFavorite && (
                <button
                  onClick={() => {
                    onFavorite(menuFor);
                    setMenuFor(null);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] text-text transition-colors hover:bg-[var(--hover-overlay)]"
                >
                  <Star
                    size={14}
                    className={
                      favoriteIds?.has(menuFor)
                        ? "text-amber-500"
                        : "text-text-muted"
                    }
                    fill={favoriteIds?.has(menuFor) ? "currentColor" : "none"}
                  />{" "}
                  {favoriteIds?.has(menuFor) ? "Unfavorite" : "Favorite"}
                </button>
              )}
              <button
                onClick={() => {
                  onDelete(menuFor);
                  setMenuFor(null);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] text-text transition-colors hover:bg-[var(--hover-overlay)] hover:text-[var(--warning)]"
              >
                <Trash2 size={14} className="text-text-muted" /> Delete
              </button>
            </div>
          </>,
          document.body
        )}
    </aside>
  );
}

/* ── trash modal ─────────────────────────────────────────────────────────── */

function TrashModal({
  trash,
  onRestore,
  onDeleteForever,
  onEmpty,
  onClose,
}: {
  trash: TrashItem[];
  onRestore: (i: number) => void;
  onDeleteForever: (i: number) => void;
  onEmpty: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/30 p-6"
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="flex max-h-[70vh] w-full max-w-[460px] flex-col overflow-hidden rounded-2xl border border-border bg-elevated shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-text">
            <Trash2 size={16} /> Trash
            <span className="text-text-faint">{trash.length}</span>
          </h2>
          <div className="flex items-center gap-1">
            {trash.length > 0 && (
              <button
                onClick={onEmpty}
                className="rounded-md px-2 py-1 text-[12px] font-medium text-text-muted transition-colors hover:bg-[var(--hover-overlay)] hover:text-[var(--warning)]"
              >
                Empty
              </button>
            )}
            <button
              onClick={onClose}
              className="grid h-7 w-7 place-items-center rounded-md text-text-muted transition-colors hover:bg-[var(--hover-overlay)] hover:text-text"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {trash.length === 0 ? (
            <p className="px-3 py-10 text-center text-[13px] text-text-faint">
              Trash is empty.
            </p>
          ) : (
            trash.map((it, i) => (
              <div
                key={i}
                className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[var(--hover-overlay)]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-text">
                    {it.title || "Untitled"}
                  </p>
                  <p className="text-[11px] text-text-faint">{it.date}</p>
                </div>
                <button
                  title="Restore"
                  onClick={() => onRestore(i)}
                  className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[12px] text-text-muted shadow-sm transition-colors hover:bg-card-hover hover:text-text"
                >
                  <RotateCcw size={13} /> Restore
                </button>
                <button
                  title="Delete forever"
                  onClick={() => onDeleteForever(i)}
                  className="grid h-7 w-7 place-items-center rounded-md text-text-faint transition-colors hover:bg-[var(--hover-overlay-medium)] hover:text-[var(--warning)]"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ── share / export menu ─────────────────────────────────────────────────── */

function ShareMenu({
  onCopyMarkdown,
  onDownloadMarkdown,
  onCopyText,
  onPrint,
}: {
  onCopyMarkdown: () => void;
  onDownloadMarkdown: () => void;
  onCopyText: () => void;
  onPrint: () => void;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  const pick = (fn: () => void) => () => {
    fn();
    setOpen(false);
  };
  const item = (icon: ReactNode, label: string, fn: () => void) => (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={pick(fn)}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-text transition-colors hover:bg-card-hover"
    >
      <span className="text-text-muted">{icon}</span>
      {label}
    </button>
  );

  return (
    <div className="relative">
      <button
        title="Share & export"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        className={
          "grid h-8 w-8 place-items-center rounded-[8px] transition-colors hover:bg-[var(--hover-overlay)] hover:text-text " +
          (open ? "bg-[var(--hover-overlay)] text-text" : "text-text-muted")
        }
      >
        <Share2 size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[290]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-[300] w-60 rounded-xl border border-border bg-elevated p-1.5 shadow-lg">
            <p className="px-2.5 pb-1 pt-1 text-[11px] font-semibold tracking-tight text-text-faint">
              Export this entry
            </p>
            {item(<FileText size={15} />, "Copy as Markdown", onCopyMarkdown)}
            {item(<Download size={15} />, "Download .md", onDownloadMarkdown)}
            {item(<Copy size={15} />, "Copy as plain text", onCopyText)}
            <div className="my-1 border-t border-border" />
            {item(<Printer size={15} />, "Print / Save as PDF", onPrint)}
          </div>
        </>
      )}
    </div>
  );
}

/* ── app ─────────────────────────────────────────────────────────────────── */

export default function App() {
  const paperRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<MenuState>(null);
  const [currentApp, setCurrentApp] = useState("tracker");
  // block hover-handle (the ⠿ grip) + the block action menu it opens
  const [blockHandle, setBlockHandle] = useState<
    { top: number; left: number; pos: number } | null
  >(null);
  const [blockMenu, setBlockMenu] = useState<
    { x: number; top: number; bottom: number; pos: number } | null
  >(null);

  // hydrate once from localStorage (falls back to the seed pages)
  const [boot] = useState(loadSaved);

  const [theme, setTheme] = useState(boot?.theme ?? 0);
  const [font, setFont] = useState(boot?.font ?? 0);
  const [sizeV, setSizeV] = useState(boot?.sizeV ?? 0.4);
  const [spacingV, setSpacingV] = useState(boot?.spacingV ?? 0.5);
  const [trackingV, setTrackingV] = useState(boot?.trackingV ?? 0.2);
  const [align] = useState(boot?.align ?? 0);

  // book pages — content lives in pagesRef; titles/page drive the surrounding UI
  const pagesRef = useRef<string[]>(
    boot?.pages?.length ? boot.pages : [...PAGES]
  );
  const [page, setPage] = useState(
    boot ? Math.min(boot.page ?? 0, pagesRef.current.length - 1) : 0
  );
  const [dir, setDir] = useState<"next" | "prev">("next");
  const [titles, setTitles] = useState<string[]>(() =>
    pagesRef.current.map(deriveTitle)
  );
  const [dates, setDates] = useState<string[]>(() =>
    boot?.dates?.length === pagesRef.current.length
      ? boot.dates
      : pagesRef.current.map(() => DEFAULT_DATE)
  );
  // per-entry editable chrome title (byline), parallel to pages; "" = none
  const [entryTitles, setEntryTitles] = useState<string[]>(() =>
    boot?.titles?.length === pagesRef.current.length
      ? boot.titles
      : pagesRef.current.map(() => "")
  );
  const entryTitlesRef = useRef(entryTitles);
  entryTitlesRef.current = entryTitles;
  // last-save time for the byline "Last updated" stamp
  const [updatedAt, setUpdatedAt] = useState<number>(() => boot?.updatedAt ?? Date.now());
  const [trash, setTrash] = useState<TrashItem[]>(() => boot?.trash ?? []);
  const [trashOpen, setTrashOpen] = useState(false);
  // the trade details panel — opened from trade-link chips, the trade grid's
  // kebab / symbol mark (window "alltra:trade" event) and the stats blocks
  const [tradeDetailId, setTradeDetailId] = useState<string | null>(null);
  useEffect(() => {
    const onEvt = (e: Event) => {
      const id = (e as CustomEvent<{ id?: string }>).detail?.id;
      if (id) setTradeDetailId(id);
    };
    window.addEventListener("alltra:trade", onEvt);
    return () => window.removeEventListener("alltra:trade", onEvt);
  }, []);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  // pre-filled query ("#tag" from a tag pill) + a note to open after a pick
  const [spotlightQuery, setSpotlightQuery] = useState("");
  const [spotNoteId, setSpotNoteId] = useState<string | null>(null);
  const closeSpotlight = () => {
    setSpotlightOpen(false);
    setSpotlightQuery("");
  };
  const [aiBusy, setAiBusy] = useState(false);
  // VIEW state is in-memory (NOT localStorage) → fresh load always lands on the
  // calendar home; in-session navigation keeps you in the editor at your entry.
  const [view, setView] = useState<"calendar" | "editor" | "notes">("calendar");
  const [showDailyPerf, setShowDailyPerf] = useState(true);
  const [navOpen, setNavOpen] = useState(false); // mobile left-nav drawer
  const [panelOpen, setPanelOpen] = useState(false); // mobile right-widgets drawer
  const [rightCollapsed, setRightCollapsed] = useState(false); // desktop collapse
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  // favorited journal entries (by page index) — toggled from the row kebab menu
  const [favEntries, setFavEntries] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem("alltra-journal-fav-entries");
      if (raw) return new Set<number>(JSON.parse(raw) as number[]);
    } catch {
      /* ignore */
    }
    return new Set<number>();
  });
  const toggleFavEntry = (i: number) => {
    setFavEntries((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      try {
        localStorage.setItem(
          "alltra-journal-fav-entries",
          JSON.stringify([...next])
        );
      } catch {
        /* ignore */
      }
      return next;
    });
  };
  // entries marked "logged" (draft → complete), by page index — mirrors favEntries
  const [loggedEntries, setLoggedEntries] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem("alltra-journal-logged-entries");
      if (raw) return new Set<number>(JSON.parse(raw) as number[]);
    } catch {
      /* ignore */
    }
    return new Set<number>();
  });
  const toggleLoggedEntry = (i: number) => {
    setLoggedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      try {
        localStorage.setItem(
          "alltra-journal-logged-entries",
          JSON.stringify([...next])
        );
      } catch {
        /* ignore */
      }
      return next;
    });
  };
  // Both entry sets are keyed by page index; shift them when entry `removed` is
  // spliced out so favorites/logged stay pinned to the right entries.
  const reindexEntrySetsOnDelete = (removed: number) => {
    const shift = (s: Set<number>): Set<number> => {
      const n = new Set<number>();
      s.forEach((x) => {
        if (x !== removed) n.add(x > removed ? x - 1 : x);
      });
      return n;
    };
    setFavEntries((prev) => {
      const n = shift(prev);
      try {
        localStorage.setItem("alltra-journal-fav-entries", JSON.stringify([...n]));
      } catch {
        /* ignore */
      }
      return n;
    });
    setLoggedEntries((prev) => {
      const n = shift(prev);
      try {
        localStorage.setItem("alltra-journal-logged-entries", JSON.stringify([...n]));
      } catch {
        /* ignore */
      }
      return n;
    });
  };
  const [templateFavs, setTemplateFavs] = useState<string[]>(loadTemplateFavs);
  const [customTemplates, setCustomTemplates] =
    useState<JournalTemplate[]>(loadCustomTemplates);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  // custom-template authoring (build a template inline in the editor, then Save)
  const [authoring, setAuthoring] = useState(false);
  const [draftName, setDraftName] = useState("");
  const authoringRef = useRef(false);
  authoringRef.current = authoring;
  const [nikkiOpen, setNikkiOpen] = useState(false); // mock AI panel
  const [isSaved, setIsSaved] = useState(true);
  // localStorage write failed (quota / private mode) — surfaced instead of a fake "Saved"
  const [saveError, setSaveError] = useState(false);
  const saveTimer = useRef<number | undefined>(undefined);
  // a provisional entry (last index) is open but NOT yet persisted — it commits
  // when real content is typed, and is discarded if left empty.
  const [provisionalIndex, setProvisionalIndexState] = useState<number | null>(
    null
  );

  // appearance (v3): theme (6) + accent (15) → <html data-theme / data-accent>
  const [uiTheme, setUiTheme] = useState<ThemeName>(() => {
    const t = localStorage.getItem(APPEARANCE_KEY);
    return (THEME_NAMES as readonly string[]).includes(t ?? "")
      ? (t as ThemeName)
      : "light";
  });
  const [accent, setAccent] = useState<AccentName>(
    () => (localStorage.getItem(ACCENT_KEY) as AccentName) || "alltra"
  );
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  // Alltra v3 chrome: which section is active + a preview overlay for the
  // Tracker sections the journal doesn't implement (Performance/Emotions/Trades).
  const [previewSection, setPreviewSection] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // full-page "focus" mode — hide both side panels + the paper card and render
  // the entry as an edge-to-edge Notion-style document (Expand button / ESC).
  const [focusMode, setFocusMode] = useState(false);
  // while in full-page mode, a top-left hamburger "peeks" the nav back in so you
  // can still browse the journal without leaving the full page (Notion-style).
  const [navPeek, setNavPeek] = useState(false);
  // same idea for the right editor/widgets panel while in full-page mode.
  const [panelPeek, setPanelPeek] = useState(false);
  // a banner as the first node becomes a full-bleed cover; the byline then floats
  // BELOW it (Notion-style). Track it + the byline's height (to clear the body).
  const [hasBanner, setHasBanner] = useState(false);
  const [bylineH, setBylineH] = useState(0);
  const bylineRef = useRef<HTMLElement>(null);
  // Below md the section sidebar is hidden (its .alltra-sidenav CSS media query
  // handles display); the content margin must drop to just the rail width.
  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const on = () => setIsMobile(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  // The highlighted sidebar section follows the real view (Calendar home ↔
  // Journal editor / Notes), overridden by a preview section when one is open.
  const activeSection =
    previewSection ??
    (view === "calendar" ? "calendar" : view === "notes" ? "notes" : "journal");
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", uiTheme);
    root.setAttribute("data-accent", accent);
    localStorage.setItem(APPEARANCE_KEY, uiTheme);
    localStorage.setItem(ACCENT_KEY, accent);
  }, [uiTheme, accent]);

  // selection captured the instant a pinned button is pressed (mouse-down, before
  // the click can disturb it) — the genuine cursor/highlight, whichever it is.
  // restored before the command runs so it lands exactly where you were.
  const pinnedSelRef = useRef<{
    from: number;
    to: number;
    node?: boolean;
  } | null>(null);

  // refs mirror state so TipTap's long-lived callbacks never read stale values
  const pageRef = useRef(page);
  pageRef.current = page;
  // live entry list + navigation for the PageLink node (set later in render)
  const navEntriesRef = useRef<PageLinkEntry[]>([]);
  const openPageLinkRef = useRef<(date: string, title: string) => void>(
    () => {}
  );
  const settingsRef = useRef({ theme, font, sizeV, spacingV, trackingV, align });
  settingsRef.current = { theme, font, sizeV, spacingV, trackingV, align };
  const datesRef = useRef(dates);
  datesRef.current = dates;
  const trashRef = useRef(trash);
  trashRef.current = trash;
  const favoritesRef = useRef(favorites);
  favoritesRef.current = favorites;
  const provisionalRef = useRef<number | null>(null);
  const setProvisional = (idx: number | null) => {
    provisionalRef.current = idx;
    setProvisionalIndexState(idx);
  };

  const toggleFavorite = (id: string, fav: boolean) => {
    setFavorites((prev) => {
      const next = fav
        ? [id, ...prev.filter((x) => x !== id)] // newest pin first (top)
        : prev.filter((x) => x !== id);
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  // commit a drag-reordered pinned list; keep any hidden (non-rendered) ids last
  const reorderFavorites = (nextRender: string[]) => {
    setFavorites((prev) => {
      const hidden = prev.filter((id) => !nextRender.includes(id));
      const next = [...nextRender, ...hidden];
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };


  const savePersist = () => {
    const p = pageRef.current;
    if (editor) pagesRef.current[p] = editor.getHTML();
    setTitles((t) => {
      const n = [...t];
      n[p] = deriveTitle(pagesRef.current[p] ?? "");
      return n;
    });
    // never write an empty provisional entry to storage (it's transient)
    let pages = pagesRef.current;
    let savedDates = datesRef.current;
    let savedTitles = entryTitlesRef.current;
    let savePage = p;
    const pi = provisionalRef.current;
    if (pi !== null && !hasMeaningfulContent(pagesRef.current[pi] ?? "")) {
      pages = pagesRef.current.slice(0, pi);
      savedDates = datesRef.current.slice(0, pi);
      savedTitles = entryTitlesRef.current.slice(0, pi);
      if (savePage >= pi) savePage = Math.max(0, pi - 1);
    }
    const now = Date.now();
    setUpdatedAt(now);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          pages,
          dates: savedDates,
          titles: savedTitles,
          updatedAt: now,
          trash: trashRef.current,
          page: savePage,
          ...settingsRef.current,
        } satisfies Saved)
      );
      setIsSaved(true);
      setSaveError(false);
    } catch {
      // quota / private-mode: the write FAILED — say so instead of "Saved"
      setSaveError(true);
    }
    // drop trade-store entries whose table no longer exists in any page, trash
    // item, or saved note (a deleted trade table otherwise feeds stats +
    // "Link to trade" forever)
    pruneTrades(
      collectTradeTableIds([
        ...pages,
        ...trashRef.current.map((t) => t.html),
        ...noteBodies(),
      ])
    );
    // (IndexedDB screenshots are pruned once at startup, never here — a deleted
    // image must survive for Ctrl+Z, see the mount effect below the editor)
  };

  const schedulePersist = () => {
    setIsSaved(false);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(savePersist, 500);
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExt,
      Link.configure({ openOnClick: false, autolink: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      ResizableImage,
      Placeholder.configure({
        showOnlyCurrent: true,
        placeholder: ({ node }) =>
          node.type.name === "heading"
            ? "Heading"
            : "Type / for commands",
      }),
      TextStyle,
      TextColor,
      BgColor,
      Badge,
      BlockStyle,
      FontFamily,
      FontSize,
      LetterSpacing,
      TaskListVariant,
      BlockDim,
      TaskItem.configure({ nested: true }),
      // Notion-style content tables (the "content table" templates + /table command)
      Table.configure({ resizable: true, allowTableNodeSelection: true }),
      TableRow,
      TableHeader,
      TableCell,
      Callout,
      Toggle,
      // a tag pill's menu offers "Find entries with this tag" → ⌘K in #tag mode
      Tag.configure({
        onSearchTag: (name) => {
          setSpotlightQuery(`#${name}`);
          setSpotlightOpen(true);
        },
      }),
      TradeTable,
      JournalStats,
      IconNode,
      Banner,
      // the per-day summary strip — computed from this entry's date + tables
      DayHeader.configure({
        getDate: () => datesRef.current[pageRef.current] ?? "",
      }),
      // always keep a typeable empty paragraph after the last block (atom blocks
      // like the trade table would otherwise trap the cursor at the doc's end)
      TrailingNode,
      PageLink.configure({
        getEntries: () => navEntriesRef.current,
        onOpen: (date, title) => openPageLinkRef.current(date, title),
      }),
      TradeLink.configure({
        // PROTOTYPE: mock trades; at transfer swap for the real dashboard source
        // real trades logged in trade tables, falling back to samples when none exist yet
        getTrades: () => {
          const t = allTrades();
          return t.length ? t : MOCK_TRADES;
        },
        onOpen: (id) => setTradeDetailId(id),
      }),
      ListExit,
      SlashCommand.configure({
        favorites: {
          getIds: () => favoritesRef.current,
          onToggle: toggleFavorite,
        },
      }),
    ],
    content: pagesRef.current[page],
    editorProps: {
      attributes: { class: "pm", spellcheck: "false" },
      // Ctrl+V a screenshot / drop image files → IndexedDB-backed image nodes
      ...imagePasteProps,
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setHasBanner(editor.state.doc.firstChild?.type.name === "banner");
      pagesRef.current[pageRef.current] = html;      // a provisional entry becomes a real, persisted one the moment it has content
      if (
        provisionalRef.current !== null &&
        provisionalRef.current === pageRef.current &&
        hasMeaningfulContent(html)
      ) {
        setProvisional(null);
      }
      schedulePersist();
    },
  });

  // Startup garbage collection for IndexedDB screenshots: drop blobs nothing
  // references any more (pages, trash, notes, custom templates). Once, at boot —
  // undo history doesn't survive a reload and nothing is mid-insert yet.
  useEffect(() => {
    void pruneImages(
      collectImageIds([
        ...pagesRef.current,
        ...trashRef.current.map((t) => t.html),
        ...noteBodies(),
        ...customTemplateBodies(),
      ])
    );
  }, []);

  // The day header shows the entry's date + same-day trades. Editing the date
  // in the top bar changes no node, so the React node view wouldn't re-render —
  // touch the header node (history-free) so it picks up the new date.
  useEffect(() => {
    if (!editor) return;
    editor.commands.command(({ tr, state }) => {
      let hit = false;
      state.doc.descendants((n, pos) => {
        if (hit) return false;
        if (n.type.name === "dayHeader") {
          tr.setNodeMarkup(pos, undefined, { ...n.attrs }).setMeta("addToHistory", false);
          hit = true;
        }
        return !hit;
      });
      return hit;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dates[page], editor]);

  // Resolve the open provisional (always the last entry): clear the flag if it
  // now has content (commit), or drop it from the arrays if it's still empty.
  const discardProvisional = () => {
    const pi = provisionalRef.current;
    if (pi === null) return;
    // a template draft is never a journal entry — drop it and exit authoring
    if (authoringRef.current) {
      forceRemoveProvisional();
      setAuthoring(false);
      return;
    }
    const html =
      pi === page && editor ? editor.getHTML() : pagesRef.current[pi] ?? "";
    if (hasMeaningfulContent(html)) {
      setProvisional(null); // it's real now — keep it
      return;
    }
    pagesRef.current.splice(pi, 1); // empty → remove the transient entry
    setTitles((t) => t.slice(0, pi));
    setDates((d) => d.slice(0, pi));
    setEntryTitles((t) => t.slice(0, pi));
    setProvisional(null);
  };

  // remove the open provisional page outright (even if it has content) — used by
  // the template-draft flow, which must never leave a journal entry behind
  function forceRemoveProvisional() {
    const pi = provisionalRef.current;
    if (pi === null) return;
    pagesRef.current.splice(pi, 1);
    setTitles((t) => t.slice(0, pi));
    setDates((d) => d.slice(0, pi));
    setEntryTitles((t) => t.slice(0, pi));
    setProvisional(null);
    setPage((p) => Math.max(0, Math.min(p, pagesRef.current.length - 1)));
  }

  const goTo = (target: number) => {
    const clamped = Math.min(pagesRef.current.length - 1, Math.max(0, target));
    if (clamped === page) return;
    if (editor) {
      const html = editor.getHTML();
      pagesRef.current[page] = html;
      setTitles((t) => {
        const n = [...t];
        n[page] = deriveTitle(html);
        return n;
      });
    }
    discardProvisional(); // leaving an empty provisional → discard it
    setDir(clamped > page ? "next" : "prev");
    setPage(clamped);
    schedulePersist();
  };

  // all page indices that share a given page's date, in order (one "day")
  const daySiblingsOf = (idx: number): number[] => {
    const key = dates[idx];
    if (key == null) return [idx];
    return dates
      .map((d, i) => (d === key ? i : -1))
      .filter((i) => i >= 0)
      .sort((a, b) => a - b);
  };

  // flip within the current day's entries only (arrows / ←→ stay inside one date)
  const goDay = (delta: number) => {
    const sib = daySiblingsOf(page);
    const pos = sib.indexOf(page);
    const t = pos + delta;
    if (t < 0 || t >= sib.length) return;
    goTo(sib[t]);
  };

  // open a fresh PROVISIONAL entry for the given date — not persisted until typed
  // every new ENTRY opens with its day summary strip + a paragraph to type in
  // (an untouched strip doesn't count as content, so a blank draft is still
  // discarded). Template drafts pass "" — a template canvas starts empty.
  const startProvisional = (dateKey: string, initial: string = DAY_HEADER_HTML + "<p></p>") => {
    if (editor) pagesRef.current[page] = editor.getHTML();
    const prevPage = pageRef.current;
    discardProvisional(); // drop any existing empty provisional first
    pagesRef.current.push(initial);
    const idx = pagesRef.current.length - 1;
    // discarding an empty provisional at the SAME index makes setPage a no-op —
    // sync the editor to the new initial content explicitly
    if (idx === prevPage && editor) {
      editor.commands.setContent(initial, false);
      setHasBanner(editor.state.doc.firstChild?.type.name === "banner");
    }
    setTitles((t) => [...t, "Untitled"]);
    setEntryTitles((t) => [...t, ""]);
    setDates((d) => [...d, dateKey]);
    setProvisional(idx);
    setDir("next");
    setPage(idx);
    // intentionally NO schedulePersist — provisional stays out of storage
  };

  // a new entry belongs to the day you're currently on; cap at 10 saved/day
  const DAY_MAX = 10;
  // count only entries with real content toward the per-day cap (matches the
  // visible entry list, which also excludes empty/committed-then-emptied pages)
  const savedOnDay = (key: string) =>
    dates.filter(
      (d, i) =>
        d === key &&
        i !== provisionalRef.current &&
        hasMeaningfulContent(pagesRef.current[i] ?? "")
    ).length;
  const newEntry = () => {
    const key = dates[page] ?? DEFAULT_DATE;
    if (savedOnDay(key) >= DAY_MAX) return; // day is full — ignore further new entries
    startProvisional(key);
  };
  const dayIsFull = savedOnDay(dates[page] ?? DEFAULT_DATE) >= DAY_MAX;

  // move an entry to the trash (restorable); never leaves the book empty
  const deleteEntry = (i: number) => {
    if (editor && i === page) pagesRef.current[i] = editor.getHTML();
    // deleting the provisional clears the flag; deleting before it shifts it down
    if (provisionalRef.current !== null) {
      if (i === provisionalRef.current) setProvisional(null);
      else if (i < provisionalRef.current) setProvisional(provisionalRef.current - 1);
    }
    const html = pagesRef.current[i] ?? "";
    const item: TrashItem = {
      html,
      title: entryTitles[i]?.trim() || titles[i] || "Untitled",
      date: dates[i] ?? DEFAULT_DATE,
      entryTitle: entryTitles[i] ?? "",
    };
    pagesRef.current.splice(i, 1);
    reindexEntrySetsOnDelete(i); // keep favorites/logged pinned to the right entries
    let nextDates = dates.filter((_, idx) => idx !== i);
    if (pagesRef.current.length === 0) {
      pagesRef.current.push("");
      nextDates = [DEFAULT_DATE];
    }
    // never trash a blank, never-written draft
    if (hasMeaningfulContent(html)) setTrash((tr) => [item, ...tr]);
    setTitles(pagesRef.current.map(deriveTitle));
    setEntryTitles((t) => {
      const n = t.filter((_, idx) => idx !== i);
      while (n.length < pagesRef.current.length) n.push(""); // parallel to a refilled page
      return n;
    });
    setDates(nextDates);

    const target =
      i < page ? page - 1 : Math.min(page, pagesRef.current.length - 1);
    setDir("prev");
    if (target === page) {
      if (editor) {
        editor.commands.setContent(pagesRef.current[target] ?? "", false);
        // the flip effect never runs on a same-index swap — sync cover mode too
        setHasBanner(editor.state.doc.firstChild?.type.name === "banner");
      }
    } else {
      setPage(target);
    }
    schedulePersist();
  };

  // rename = the byline (chrome) title — every display point prefers it, so
  // writing an <h1> into the body (the old mechanism) silently did nothing
  // for titled entries and mutated content the user never asked to change
  const renameEntry = (i: number, name: string) => {
    const clean = (name.trim() || "Untitled").slice(0, TITLE_MAX);
    setEntryTitles((t) => {
      const n = [...t];
      n[i] = clean;
      return n;
    });
    schedulePersist();
  };

  const restoreEntry = (ti: number) => {
    const item = trash[ti];
    if (!item) return;
    if (editor) pagesRef.current[page] = editor.getHTML();
    const prevLen = pagesRef.current.length;
    // commit/drop any open provisional first so it stays the LAST entry (the
    // invariant savePersist's slice relies on) after we append the restored one
    discardProvisional();
    pagesRef.current.push(item.html);
    setDates((d) => [...d, item.date]);
    setTitles(pagesRef.current.map(deriveTitle));
    setEntryTitles((t) => [...t, item.entryTitle ?? ""]);
    setTrash((tr) => tr.filter((_, idx) => idx !== ti));
    setDir("next");
    const target = pagesRef.current.length - 1;
    if (target === page && pagesRef.current.length === prevLen) {
      // an empty provisional was discarded and the restored entry reused its
      // index — setPage is a no-op, so sync the editor here or the stale
      // empty page would overwrite the restored content on the next keystroke
      if (editor) {
        editor.commands.setContent(item.html, false);
        setHasBanner(editor.state.doc.firstChild?.type.name === "banner");
      }
    } else {
      setPage(target);
    }
    schedulePersist();
  };

  const deleteForever = (ti: number) => {
    setTrash((tr) => tr.filter((_, idx) => idx !== ti));
    schedulePersist();
  };

  const emptyTrash = () => {
    setTrash([]);
    schedulePersist();
  };

  // swap the editor's content on every page flip + replay the swipe animation
  useLayoutEffect(() => {
    if (!editor) return;
    editor.commands.setContent(pagesRef.current[page] ?? "", false);
    setHasBanner(editor.state.doc.firstChild?.type.name === "banner");
    const el = paperRef.current;
    if (el) {
      el.classList.remove("page-next", "page-prev");
      void el.offsetWidth; // force reflow so the animation replays
      el.classList.add(dir === "next" ? "page-next" : "page-prev");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, editor]);

  // persist when a setting changes (skip the very first run)
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    schedulePersist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, font, sizeV, spacingV, trackingV, align]);

  // Selecting text opens nothing (right-click opens the context menu; the hover
  // grip opens the block menu). This listener only CLOSES the AI rewrite menu
  // once the selection collapses — it never opens it.
  useEffect(() => {
    function onSelChange() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) setMenu(null);
    }
    document.addEventListener("selectionchange", onSelChange);
    return () => document.removeEventListener("selectionchange", onSelChange);
  }, []);

  // ←/→ flip pages — only when not typing (Alt+arrow flips even while editing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (editor?.isFocused && !e.altKey) return; // let the caret move
      e.preventDefault();
      goDay(e.key === "ArrowRight" ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, page, dates]);

  const openSpotlight = () => {
    if (editor) pagesRef.current[page] = editor.getHTML();
    setSpotlightOpen(true);
  };

  // AI selection actions — transform the highlighted text via Claude, then replace it
  const runAI = async (action: AiAction) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, " ").trim();
    if (!text) return;
    setMenu(null);
    setAiBusy(true);
    try {
      const result = await aiTransform(action, text);
      if (result) editor.chain().focus().insertContentAt({ from, to }, result).run();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "AI request failed.");
    } finally {
      setAiBusy(false);
    }
  };

  // ── two-state navigation (calendar home ⇄ editor) ──────────────────────────
  const goCalendar = () => {
    if (editor) pagesRef.current[page] = editor.getHTML();
    setView("calendar"); // STATE 1
  };
  const goEditor = () => setView("editor"); // STATE 2 at the current/last entry
  const goNotes = () => {
    if (editor) pagesRef.current[page] = editor.getHTML();
    setView("notes"); // STATE 3 — the separate Notes space
  };

  // Build the calendar's data Map from this app's stored entries (date → info).
  const buildJournalData = (): Map<string, JournalDayData> => {
    const map = new Map<string, JournalDayData>();
    pagesRef.current.forEach((html, i) => {
      const dateStr = dates[i];
      if (!dateStr) return;
      const text = htmlToText(html).trim();
      const wc = text ? text.split(/\s+/).length : 0;
      // atoms count: an image-only / table-only / filled-header entry IS a journal day
      const hasJournal = text.length > 0 || hasMeaningfulContent(html);
      const prev = map.get(dateStr);
      if (prev) {
        map.set(dateStr, {
          ...prev,
          text: prev.text || text.slice(0, 140),
          hasJournal: prev.hasJournal || hasJournal,
          wordCount: prev.wordCount + wc,
        });
      } else {
        map.set(dateStr, {
          text: text.slice(0, 140),
          hasJournal,
          wordCount: wc,
          metrics: { netPL: 0, trades: 0, winRate: null, profitFactor: null },
        });
      }
    });
    return map;
  };

  // Click a day → open that date's entry, else a provisional (unsaved) one.
  const openDateEntry = (d: Date) => {
    const key = `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
    setView("editor"); // go to STATE 2
    const idx = dates.findIndex((x) => x === key);
    // already on the provisional for this date → nothing to do
    if (idx >= 0 && idx === provisionalRef.current) return;
    if (idx >= 0) {
      goTo(idx); // open the existing (real) entry
      return;
    }
    // no entry for that date → open a provisional, persisted only once typed
    startProvisional(key);
  };

  // ── export / share ──────────────────────────────────────────────────────
  // Markdown conversion lives in backup.ts (htmlToMarkdown) — it understands
  // every journal node (trade tables, day headers, idb:// images, tags…)

  const currentHtml = () => {
    if (editor) pagesRef.current[page] = editor.getHTML();
    return pagesRef.current[page] ?? "";
  };
  const fileSlug = () =>
    (titles[page] || "entry").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "") ||
    "entry";

  const copyMarkdown = () =>
    navigator.clipboard?.writeText(htmlToMarkdown(currentHtml()));
  const copyText = () => navigator.clipboard?.writeText(htmlToText(currentHtml()));
  const downloadMarkdown = () => {
    const blob = new Blob([htmlToMarkdown(currentHtml())], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileSlug()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const printEntry = () => {
    void (async () => {
      // resolve idb:// screenshots to blob URLs BEFORE writing — the print
      // window has no script to read IndexedDB, so raw refs render broken
      const holder = document.createElement("div");
      holder.innerHTML = currentHtml();
      const imgs = Array.from(holder.querySelectorAll<HTMLImageElement>("img"));
      await Promise.all(
        imgs.map(async (img) => {
          const src = img.getAttribute("src") ?? "";
          if (src.startsWith(IDB_PREFIX)) {
            const url = await resolveImage(src).catch(() => "");
            if (url) img.setAttribute("src", url);
            else img.remove();
          }
        })
      );
      const w = window.open("", "_blank", "width=820,height=1040");
      if (!w) return;
      const title = titles[page] || "Entry";
      w.document.write(PRINT_SHELL(title, holder.innerHTML));
      w.document.close();
      w.focus();
      // wait for the images to actually load in the child before printing
      const childImgs = Array.from(w.document.images);
      await Promise.all(
        childImgs.map(
          (im) =>
            new Promise<void>((res) => {
              if (im.complete) return res();
              im.onload = () => res();
              im.onerror = () => res();
            })
        )
      );
      w.print();
    })();
  };

  // ⌘K / Ctrl+K opens spotlight search (so does the trade grid's ⌘K chip, via
  // a window event — it lives inside a TipTap node view with no App access)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSpotlight();
      }
    };
    const onEvt = () => openSpotlight();
    window.addEventListener("keydown", onKey);
    window.addEventListener("alltra:spotlight", onEvt);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("alltra:spotlight", onEvt);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, page]);

  // ESC leaves full-page focus mode
  useEffect(() => {
    if (!focusMode) {
      setNavPeek(false); // leaving full page → drop the peeks
      setPanelPeek(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      // a popup that consumed Escape (slash menu, block/context menu, banner
      // picker — all preventDefault/stopPropagation) must not ALSO exit focus
      if (e.key === "Escape" && !e.defaultPrevented) setFocusMode(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusMode]);

  // measure the byline height so the body can clear it when it floats over a banner
  useEffect(() => {
    const el = bylineRef.current;
    if (!el) {
      setBylineH(0);
      return;
    }
    const ro = new ResizeObserver(() => setBylineH(el.offsetHeight));
    ro.observe(el);
    setBylineH(el.offsetHeight);
    return () => ro.disconnect();
  }, [hasBanner, view, previewSection, page]);

  // formatting commands routed through TipTap
  const toggle = {
    bold: () => editor?.chain().focus().toggleBold().run(),
    italic: () => editor?.chain().focus().toggleItalic().run(),
    underline: () => editor?.chain().focus().toggleUnderline().run(),
    strike: () => editor?.chain().focus().toggleStrike().run(),
    bullets: () => editor?.chain().focus().toggleBulletList().run(),
    emoji: () => editor?.chain().focus().insertContent("😊").run(),
  };
  const undo = () => editor?.chain().focus().undo().run();
  const redo = () => editor?.chain().focus().redo().run();

  // ── templates ─────────────────────────────────────────────────────────────
  // user-made templates come first, then the built-ins
  const allTemplates: JournalTemplate[] = [
    TRADING_JOURNAL_TEMPLATE,
    ...customTemplates,
    ...TEMPLATES,
  ];

  const applyTemplate = (t: JournalTemplate) => {
    if (!editor) return;
    // a template's leading heading is its TITLE — it belongs in the byline's
    // title slot, not duplicated as the first body block. Extract it (skipping
    // a leading banner, which stays in the body), fill the entry title when
    // it's still blank, and insert the remainder.
    const el = document.createElement("div");
    el.innerHTML = t.html;
    let first = el.firstElementChild;
    if (first?.getAttribute("data-type") === "banner")
      first = first.nextElementSibling;
    let html = t.html;
    if (first && /^H[1-3]$/.test(first.tagName)) {
      const headerText = (first.textContent || "").replace(/\s+/g, " ").trim();
      if (headerText) {
        first.remove();
        html = el.innerHTML;
        const p = pageRef.current;
        setEntryTitles((prev) => {
          if (prev[p]?.trim()) return prev; // never clobber a user-typed title
          const n = [...prev];
          n[p] = headerText.slice(0, TITLE_MAX);
          return n;
        });
      }
    }
    editor.chain().focus().insertContent(html).run();
    setTemplatesOpen(false);
  };

  // enter the inline authoring loadout: a blank editor + the normal controls
  const startCustomTemplate = () => {
    setTemplatesOpen(false);
    setView("editor");
    startProvisional(dates[page] ?? DEFAULT_DATE, ""); // blank, in-memory draft
    setDraftName("");
    setAuthoring(true);
  };
  const saveCustomTemplate = () => {
    if (!editor) return;
    const html = editor.getHTML();
    const t: JournalTemplate = {
      id: `custom-${String(Date.now())}`,
      name: draftName.trim() || "My template",
      description: "Custom template",
      accent: "#0066ff",
      html,
    };
    setCustomTemplates((prev) => {
      const next = [t, ...prev];
      try {
        localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
    toggleTemplateFav(t.id, true); // surface it in the palette Templates section
    setAuthoring(false);
    forceRemoveProvisional();
    setView("calendar");
  };
  const cancelCustomTemplate = () => {
    setAuthoring(false);
    forceRemoveProvisional();
    setView("calendar");
  };
  const deleteCustomTemplate = (id: string) => {
    setCustomTemplates((prev) => {
      const next = prev.filter((t) => t.id !== id);
      try {
        localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
    toggleTemplateFav(id, false);
  };
  const toggleTemplateFav = (id: string, fav: boolean) => {
    setTemplateFavs((prev) => {
      const next = fav
        ? [id, ...prev.filter((x) => x !== id)]
        : prev.filter((x) => x !== id);
      try {
        localStorage.setItem(TEMPLATE_FAVS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };
  const favTemplates = templateFavs
    .map((id) => allTemplates.find((t) => t.id === id))
    .filter((t): t is JournalTemplate => !!t);

  // applied as CSS vars on the paper; the .ProseMirror editable reads them so
  // font/size/spacing reliably hit the text (not just the wrapper).
  const editorStyle = {
    ["--ed-font"]: FONTS[font].value,
    ["--ed-size"]: sizePx(sizeV),
    // px (not unitless) so the Line slider controls spacing on its own and the
    // Size slider doesn't drag line spacing along with the font size
    ["--ed-lh"]: `${(lineHeight(spacingV) * 18).toFixed(1)}px`,
    ["--ed-ls"]: trackingEm(trackingV),
  } as CSSProperties;

  // font + size apply to the selection (TipTap marks); with nothing selected they
  // set the whole-doc default. Controls reflect the selection when there is one.
  const ts = editor?.getAttributes("textStyle") ?? {};
  const hasSelection = !!editor && !editor.state.selection.empty;
  const selFontIdx = FONTS.findIndex((f) => f.value === ts.fontFamily);
  const displayFontIdx = selFontIdx >= 0 ? selFontIdx : font;
  const selSizeV =
    typeof ts.fontSize === "string"
      ? Math.min(1, Math.max(0, (parseFloat(ts.fontSize) - 13) / 9))
      : null;
  const displaySizeV = hasSelection && selSizeV != null ? selSizeV : sizeV;
  const selTrackingV =
    typeof ts.letterSpacing === "string"
      ? Math.min(1, Math.max(0, parseFloat(ts.letterSpacing) / 0.16 + 0.25))
      : null;
  const displayTrackingV =
    hasSelection && selTrackingV != null ? selTrackingV : trackingV;

  const pickFont = (i: number) => {
    if (hasSelection)
      editor?.chain().focus().setFontFamily(FONTS[i].value).run();
    else setFont(i);
  };
  const pickSize = (v: number) => {
    if (hasSelection) editor?.chain().focus().setFontSize(sizePx(v)).run();
    else setSizeV(v);
  };
  const pickTracking = (v: number) => {
    if (hasSelection)
      editor?.chain().focus().setLetterSpacing(trackingEm(v)).run();
    else setTrackingV(v);
  };

  // track the block under the cursor → position the ⠿ hover handle.
  // targets the most specific block: each list ITEM (not the whole list), each
  // top-level paragraph/heading, or a callout as a whole.
  // block drag-to-reorder: a blue insertion line + a ghost that follows the cursor
  const [dragLine, setDragLine] = useState<{ left: number; width: number; top: number } | null>(null);
  const [dragGhost, setDragGhost] = useState<{ label: string; x: number; y: number } | null>(null);
  const draggingRef = useRef(false); // true while a block is being dragged
  const justDraggedRef = useRef(false); // suppresses the grip's click-to-open after a drag

  const onPaperMove = (e: React.MouseEvent) => {
    if (!editor || blockMenu || draggingRef.current) return;
    const found = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
    if (!found) return; // keep the current handle (avoids flicker over the grip)
    const $pos = editor.state.doc.resolve(found.pos);
    // tables are driven by TableMenu, not the block grip — never grab one
    for (let d = $pos.depth; d >= 1; d--) {
      if ($pos.node(d).type.name === "table") {
        setBlockHandle(null);
        return;
      }
    }
    const LISTS = new Set(["bulletList", "orderedList", "taskList"]);
    let target = -1;
    for (let d = $pos.depth; d >= 1; d--) {
      const parent = $pos.node(d - 1);
      if (parent.type.name === "doc" || LISTS.has(parent.type.name)) {
        target = $pos.before(d);
        break;
      }
    }
    if (target < 0) return;
    const dom = editor.view.nodeDOM(target);
    if (!(dom instanceof HTMLElement)) return;
    const rect = dom.getBoundingClientRect();
    // anchor the grip to the text column's left edge (not the block's), so it
    // sits in the gutter and never overlaps a bullet / number / checkbox
    const pmLeft = (editor.view.dom as HTMLElement).getBoundingClientRect().left;
    // vertical center of the block's FIRST line (line-height is taller than the
    // glyphs, so the text sits lower than the block top) → grip lines up with it
    const cs = getComputedStyle(dom);
    const lh = parseFloat(cs.lineHeight);
    const lineH = Number.isFinite(lh) ? lh : rect.height;
    const padTop = parseFloat(cs.paddingTop) || 0;
    const center = rect.top + padTop + lineH / 2;
    setBlockHandle((prev) =>
      prev && prev.pos === target
        ? prev
        : { top: center, left: pmLeft, pos: target }
    );
  };
  const blockHandleElRef = useRef<HTMLButtonElement | null>(null);
  const onPaperLeave = (e: React.MouseEvent) => {
    if (blockMenu) return;
    const rt = e.relatedTarget as Node | null;
    // moving onto the grip itself shouldn't dismiss it
    if (rt && blockHandleElRef.current?.contains(rt)) return;
    setBlockHandle(null);
  };

  // ── block drag-to-reorder ─────────────────────────────────────────────────
  // Find the top-level block gap nearest a Y coord: the position to insert at +
  // where to paint the blue line (top of the target block, or the doc's bottom).
  const computeDrop = (clientY: number): { pos: number; lineTop: number; left: number; width: number } | null => {
    if (!editor) return null;
    const view = editor.view;
    const doc = view.state.doc;
    const pmRect = (view.dom as HTMLElement).getBoundingClientRect();
    let pos = doc.content.size;
    let lineTop = pmRect.bottom - 1;
    let lastBottom = pmRect.top;
    let done = false;
    doc.forEach((_node, offset) => {
      if (done) return;
      const dom = view.nodeDOM(offset);
      if (!(dom instanceof HTMLElement)) return;
      const r = dom.getBoundingClientRect();
      if (clientY < (r.top + r.bottom) / 2) {
        pos = offset;
        lineTop = r.top - 1;
        done = true;
      } else {
        lastBottom = r.bottom;
      }
    });
    if (!done) lineTop = lastBottom - 1;
    return { pos, lineTop, left: pmRect.left, width: pmRect.width };
  };
  // Move the block at `from` to the top-level position `to` (delete + reinsert,
  // mapping the target through the deletion so it lands where the line showed).
  const moveBlock = (from: number, to: number) => {
    if (!editor) return;
    const view = editor.view;
    const node = view.state.doc.nodeAt(from);
    if (!node) return;
    const size = node.nodeSize;
    if (to > from && to < from + size) return; // dropped onto itself → no-op
    let tr = view.state.tr.delete(from, from + size);
    const at = tr.mapping.map(to);
    tr = tr.insert(at, node);
    view.dispatch(tr);
    view.focus();
    schedulePersist();
  };
  const startBlockDrag = (e: React.PointerEvent) => {
    if (!blockHandle || !editor) return;
    e.preventDefault();
    const from = blockHandle.pos;
    const node = editor.state.doc.nodeAt(from);
    const label = (node?.textContent || node?.type.name || "Block").trim().slice(0, 64) || "Empty block";
    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;
    let dropPos: number | null = null;
    const onMove = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - startX, ev.clientY - startY) < 4) return;
      if (!moved) {
        moved = true;
        draggingRef.current = true;
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
        // fade the block being lifted so the ghost reads as "the moving copy".
        // done via a PM node decoration — mutating the node's DOM directly gets
        // reverted by ProseMirror's own DOM observer.
        setDimmedBlock(editor.view, from);
      }
      // the ghost trails the cursor a touch (rAF-smooth via the browser's own paint)
      setDragGhost({ label, x: ev.clientX, y: ev.clientY });
      const d = computeDrop(ev.clientY);
      if (d) {
        dropPos = d.pos;
        setDragLine({ left: d.left, width: d.width, top: d.lineTop });
      }
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      clearDimmedBlock(editor.view);
      setDragLine(null);
      setDragGhost(null);
      draggingRef.current = false;
      if (moved) {
        justDraggedRef.current = true; // suppress the grip's click-to-open
        if (dropPos !== null) moveBlock(from, dropPos);
        setBlockHandle(null);
      }
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    // a cancelled pointer (alt-tab, browser gesture) must also end the drag —
    // otherwise the lifted block stays dimmed forever
    document.addEventListener("pointercancel", onUp);
  };

  // Selecting/highlighting text no longer opens any menu (nothing shows on
  // highlight). The block action menu is reached from the hover grip; the
  // right-click context menu handles selection commands.

  // block menu "Ask AI" → select the block's text and show the AI rewrite menu
  const showAIForBlock = (pos: number) => {
    if (!editor) return;
    const node = editor.state.doc.nodeAt(pos);
    if (!node) return;
    const from = pos + 1;
    const to = pos + node.nodeSize - 1;
    if (to <= from) return;
    editor.chain().focus().setTextSelection({ from, to }).run();
    setBlockMenu(null);
    requestAnimationFrame(() => {
      const sel = window.getSelection();
      let x = window.innerWidth / 2;
      let y = 140;
      if (sel && sel.rangeCount) {
        const r = sel.getRangeAt(0).getBoundingClientRect();
        if (r.width || r.height) {
          x = r.left + r.width / 2;
          y = r.top - 8;
        }
      }
      const text = editor.state.doc.textBetween(from, to, " ");
      setMenu({ x, y, text });
    });
  };

  // entries as date rows for the drawer — only days with real content, newest first
  const navEntries: NavEntry[] = dates
    .map((date, i) => ({
      index: i,
      date,
      text: htmlToText(pagesRef.current[i] ?? ""),
    }))
    // text-empty entries still count when they hold real atoms (image, banner…)
    .filter(
      (e) =>
        e.index !== provisionalIndex &&
        (e.text.length > 0 || hasMeaningfulContent(pagesRef.current[e.index] ?? ""))
    )
    .sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : b.index - a.index
    )
    .map((e) => ({
      index: e.index,
      date: e.date,
      label: fmtDateLabel(e.date),
      // the chrome title (byline) wins — template headers live there now
      title: entryTitles[e.index]?.trim() || titles[e.index] || "",
      snippet:
        e.text.slice(0, 70) ||
        ((pagesRef.current[e.index] ?? "").includes('data-filled="1"')
          ? "Day summary"
          : "Image / attachment"),
    }));

  // current day's pages, for the book arrows + the "n / m" page count
  const daySiblings = daySiblingsOf(page);
  const dayPos = daySiblings.indexOf(page);
  const realSiblings = daySiblings.filter((i) => i !== provisionalIndex);
  const realPos = realSiblings.indexOf(page);

  // wire the PageLink node to the live entry list + navigation
  navEntriesRef.current = navEntries;
  openPageLinkRef.current = (date: string, title: string) => {
    // match on the same title navEntries exposes (chrome title first)
    let idx = dates.findIndex(
      (d, i) =>
        d === date &&
        (entryTitles[i]?.trim() || titles[i] || "") === title &&
        i !== provisionalIndex
    );
    if (idx < 0) idx = dates.findIndex((d) => d === date);
    if (idx < 0) return;
    if (view !== "editor") setView("editor");
    goTo(idx);
  };

  return (
    <div
      className="flex h-screen flex-col"
      style={
        {
          ["--accent" as string]: THEMES[theme].accent,
          background: "var(--panel-bg)",
        } as CSSProperties
      }
    >
      <SelectionMenu menu={menu} onAI={runAI} onClose={() => setMenu(null)} />
      <EditorContextMenu editor={editor} />
      {blockMenu && editor && (
        <BlockMenu
          editor={editor}
          pos={blockMenu.pos}
          anchor={{ x: blockMenu.x, top: blockMenu.top, bottom: blockMenu.bottom }}
          onAskAI={showAIForBlock}
          onClose={() => {
            setBlockMenu(null);
            setBlockHandle(null);
          }}
        />
      )}
      {templatesOpen && (
        <TemplateGallery
          templates={allTemplates}
          favorites={new Set(templateFavs)}
          onToggleFavorite={toggleTemplateFav}
          onApply={applyTemplate}
          onCreate={startCustomTemplate}
          onDelete={deleteCustomTemplate}
          onClose={() => setTemplatesOpen(false)}
        />
      )}
      <NikkiPanel
        open={nikkiOpen}
        onClose={() => setNikkiOpen(false)}
        assistantName={ASSISTANT_NAME}
      />
      <AppearancePanel
        open={appearanceOpen}
        onClose={() => setAppearanceOpen(false)}
        theme={uiTheme}
        accent={accent}
        onSelectTheme={setUiTheme}
        onSelectAccent={setAccent}
      />
      {aiBusy && (
        <div className="fixed left-1/2 top-5 z-[500] flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-elevated px-4 py-2 text-[13px] font-medium text-text shadow-lg">
          <Loader2 size={15} className="animate-spin text-[var(--alltra-brand)]" />
          Rewriting with AI…
        </div>
      )}
      {trashOpen && (
        <TrashModal
          trash={trash}
          onRestore={restoreEntry}
          onDeleteForever={deleteForever}
          onEmpty={emptyTrash}
          onClose={() => setTrashOpen(false)}
        />
      )}
      {tradeDetailId && (() => {
        const hit = findTradeRow(tradeDetailId, pagesRef.current, noteBodies());
        const trade = allTrades().find((t) => t.id === tradeDetailId) ?? MOCK_TRADES.find((t) => t.id === tradeDetailId) ?? null;
        return (
          <TradeDetailsPanel
            // keyed per trade: opening another trade remounts a fresh panel
            // (own tab/lightbox state) instead of reusing one mid-slide-out
            key={tradeDetailId}
            tradeId={tradeDetailId}
            hit={hit}
            trade={trade}
            entryDate={hit && hit.entryIndex >= 0 ? (dates[hit.entryIndex] ?? null) : null}
            entryText={hit && hit.entryIndex >= 0 ? htmlToText(pagesRef.current[hit.entryIndex] ?? "") : ""}
            // id-aware: a stale close from a previous panel never nulls a newer trade
            onClose={() => setTradeDetailId((cur) => (cur === tradeDetailId ? null : cur))}
            onGoToEntry={(i) => {
              setTradeDetailId(null);
              if (view !== "editor") setView("editor");
              goTo(i);
            }}
          />
        );
      })()}
      {spotlightOpen && (
        <Spotlight
          entries={titles
            .map((t, i) => ({
              index: i,
              title: entryTitles[i]?.trim() || t || "Untitled",
              date: dates[i] ?? "",
              text: htmlToText(pagesRef.current[i] ?? ""),
              tags: extractTags(pagesRef.current[i] ?? ""),
            }))
            .filter(
              (e) =>
                e.index !== provisionalIndex &&
                hasMeaningfulContent(pagesRef.current[e.index] ?? "")
            )}
          notes={noteSummaries()}
          commands={view === "editor" && editor ? SLASH_COMMANDS : null}
          initialQuery={spotlightQuery}
          onPickEntry={(i) => {
            if (view !== "editor") setView("editor");
            goTo(i);
            closeSpotlight();
          }}
          onPickNote={(id) => {
            setSpotNoteId(id);
            goNotes();
            closeSpotlight();
          }}
          onRunCommand={(cmd) => {
            closeSpotlight();
            if (editor) {
              editor.commands.focus();
              runFavoriteCommand(editor, cmd);
            }
          }}
          onClose={closeSpotlight}
        />
      )}
      {(!focusMode || navPeek) && (
        <AppSidebar
          currentApp={currentApp}
          onSwitchApp={setCurrentApp}
          mobileOpen={navOpen}
        />
      )}

      {/* Alltra v3 section sidebar (right of the 64px app rail). Shown normally;
          in full-page mode it's brought back on demand by the top-left hamburger. */}
      {(!focusMode || navPeek) && (
      <AlltraSideNav
        section={activeSection}
        onSelect={(id) => {
          if (id === "journal") {
            setPreviewSection(null);
            goEditor();
          } else if (id === "calendar") {
            setPreviewSection(null);
            goCalendar();
          } else {
            setPreviewSection(id);
          }
        }}
        onSearch={openSpotlight}
        collapsed={!focusMode && sidebarCollapsed}
        onToggleCollapse={() =>
          focusMode ? setNavPeek(false) : setSidebarCollapsed((c) => !c)
        }
        journal={{
          entries: navEntries,
          currentPage: page,
          onSelectEntry: (i) => {
            setPreviewSection(null);
            goEditor();
            goTo(i);
          },
          onNewEntry: () => {
            setPreviewSection(null);
            goEditor();
            newEntry();
          },
          onOpenNotes: () => {
            setPreviewSection(null);
            goNotes();
          },
          newDisabled: dayIsFull,
        }}
      />
      )}

      {/* everything to the right of the app rail + section sidebar */}
      <div
        className="relative flex h-screen flex-col"
        style={{
          marginLeft: focusMode
            ? navPeek
              ? APP_SIDEBAR_WIDTH + RAIL_WIDTH_EXPANDED
              : 0
            : isMobile
              ? APP_SIDEBAR_WIDTH
              : APP_SIDEBAR_WIDTH +
                (sidebarCollapsed ? RAIL_WIDTH_COLLAPSED : RAIL_WIDTH_EXPANDED),
          transition: "margin-left 0.24s cubic-bezier(0.22,0.61,0.36,1)",
        }}
      >
        {/* ── primary top bar (TopNavbar) ───────────────────────────────── */}
        <header
          className="flex items-center gap-3 px-4"
          style={{
            height: 52,
            background: "var(--surface-2)",
            borderBottom: "1px solid var(--border-2)",
          }}
        >
          {authoring ? (
            /* template-authoring mode — occupies the whole bar (was the secondary row) */
            <div className="flex w-full items-center gap-3">
              <LayoutTemplate size={15} className="text-[var(--alltra-brand)]" />
              <span className="text-[13.5px] font-semibold text-text">New template</span>
              <input
                autoFocus
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Template name"
                className="w-[220px] rounded-md border border-border bg-card px-2.5 py-1 text-[13px] text-text outline-none placeholder:text-text-faint focus:border-[var(--alltra-brand)]"
              />
              <span className="hidden text-[12px] text-text-faint lg:inline">
                Build it below with the editor &amp; controls, then save.
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={cancelCustomTemplate}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium text-text-muted shadow-sm transition-colors hover:bg-card-hover hover:text-text"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCustomTemplate}
                  className="flex items-center gap-1.5 rounded-lg bg-[var(--alltra-brand)] px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                >
                  <Sparkles size={14} /> Save template
                </button>
              </div>
            </div>
          ) : (
            <>
          {/* mobile nav toggle */}
          <button
            onClick={() => setNavOpen((o) => !o)}
            title="Menu"
            className="grid h-7 w-7 place-items-center rounded-md bg-text text-[var(--surface-1)] md:hidden"
          >
            <PanelLeft size={15} />
          </button>

          {/* full-page mode: a hamburger that peeks the nav back in so you can
              still browse the journal without leaving the full page */}
          {focusMode && (
            <button
              onClick={() => setNavPeek((p) => !p)}
              title={navPeek ? "Hide sidebar" : "Show sidebar"}
              className="hidden h-8 w-8 place-items-center rounded-[8px] text-text-muted transition-colors hover:bg-[var(--hover-overlay)] hover:text-text md:grid"
            >
              <Menu size={17} />
            </button>
          )}

          {/* left — breadcrumb (Journal ▸ entry) */}
          <div className="flex min-w-0 items-center gap-1.5 text-[13px]">
            <span className="hidden items-center gap-1.5 sm:flex">
              <button
                onClick={goEditor}
                className="font-medium text-text-muted transition-colors hover:text-text"
              >
                Journal
              </button>
              <ChevronRight size={14} className="shrink-0 text-text-faint" />
            </span>
            <span className="max-w-[420px] truncate font-semibold text-text">
              {view === "editor"
                ? entryTitles[page]?.trim() || titles[page] || "Untitled"
                : previewSection
                  ? previewSection.charAt(0).toUpperCase() + previewSection.slice(1)
                  : view === "calendar"
                    ? "Calendar"
                    : view === "notes"
                      ? "Notes"
                      : "Journal"}
            </span>
          </div>

          {/* entry date + Beta pill (merged in from the old secondary bar) */}
          {view === "editor" && !previewSection && (
            <div className="hidden items-center gap-2 sm:flex">
              <span className="h-4 w-px bg-[var(--border-2)]" />
              <input
                type="date"
                value={dates[page] ?? DEFAULT_DATE}
                onChange={(e) => {
                  setDates((d) => {
                    const n = [...d];
                    n[page] = e.target.value;
                    return n;
                  });
                  schedulePersist();
                }}
                className="rounded-md bg-transparent px-1 py-0.5 text-[12.5px] text-text-muted outline-none transition-colors hover:bg-[var(--hover-overlay)] focus:bg-[var(--hover-overlay)]"
              />
              <span className="rounded bg-[var(--hover-overlay-medium)] px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-text-faint">
                Beta
              </span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {/* save status + undo/redo (merged in from the old secondary bar) */}
            {view === "editor" && !previewSection && (
              <>
                <span
                  className={
                    "flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors " +
                    (isSaved && !saveError
                      ? "bg-[var(--hover-overlay)] text-text-muted"
                      : "bg-[var(--warning-bg)] text-[var(--warning)]")
                  }
                  title={
                    saveError
                      ? "localStorage is full or unavailable — remove or shrink large images to save"
                      : undefined
                  }
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background:
                        isSaved && !saveError ? "#22c55e" : "var(--warning)",
                    }}
                  />
                  {saveError
                    ? "Couldn't save — storage full"
                    : isSaved
                      ? "Saved"
                      : "Saving…"}
                </span>
                <ChromeBtn title="Undo" onClick={undo}>
                  <ArrowLeft size={15} />
                </ChromeBtn>
                <ChromeBtn title="Redo" onClick={redo}>
                  <ArrowRight size={15} />
                </ChromeBtn>
                <BackupMenu
                  hasContent={pagesRef.current.some((h) => hasMeaningfulContent(h))}
                  entries={() =>
                    pagesRef.current
                      .map((html, i) => ({
                        date: dates[i] ?? "",
                        title: entryTitles[i]?.trim() || titles[i] || "",
                        html,
                      }))
                      .filter((e, i) => i !== provisionalIndex && hasMeaningfulContent(e.html))
                  }
                />
                <span className="mx-0.5 h-4 w-px bg-[var(--border-2)]" />
              </>
            )}
            {/* entry-scoped controls — only while an entry is actually visible */}
            {view === "editor" && !previewSection && (
              <>
                {/* draft / logged pill */}
                <span
                  className="rounded-[8px] px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    color: loggedEntries.has(page)
                      ? "var(--success)"
                      : "var(--text-muted)",
                    background: loggedEntries.has(page)
                      ? "color-mix(in srgb, var(--success) 16%, transparent)"
                      : "var(--alpha-6)",
                  }}
                >
                  {loggedEntries.has(page) ? "Logged" : "Draft"}
                </span>
                {/* mark as logged / reopen */}
                <button
                  onClick={() => toggleLoggedEntry(page)}
                  className="hidden items-center gap-1.5 rounded-[8px] border border-border bg-card px-2.5 py-1.5 text-[12px] font-medium text-text shadow-sm transition-colors hover:bg-card-hover sm:flex"
                >
                  {loggedEntries.has(page) ? (
                    <>
                      <Pencil size={14} /> Reopen
                    </>
                  ) : (
                    <>
                      <Check size={14} /> Mark as logged
                    </>
                  )}
                </button>
                {/* delete entry */}
                <button
                  onClick={() => deleteEntry(page)}
                  title="Delete entry"
                  className="grid h-8 w-8 place-items-center rounded-[8px] border border-border bg-card text-text-muted shadow-sm transition-colors hover:bg-card-hover hover:text-[var(--warning)]"
                >
                  <Trash2 size={15} />
                </button>
                {/* full-page focus mode toggle */}
                <button
                  onClick={() => setFocusMode((f) => !f)}
                  title={focusMode ? "Exit full page (Esc)" : "Full page"}
                  className="grid h-8 w-8 place-items-center rounded-[8px] border border-border bg-card text-text-muted shadow-sm transition-colors hover:bg-card-hover hover:text-text"
                >
                  {focusMode ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>
                {/* right editor/widgets panel toggle (Notion-style; desktop).
                    In full-page mode it peeks the panel in; otherwise collapses it. */}
                {(() => {
                  const panelShown = focusMode ? panelPeek : !rightCollapsed;
                  return (
                    <button
                      onClick={() =>
                        focusMode ? setPanelPeek((p) => !p) : setRightCollapsed((c) => !c)
                      }
                      title={panelShown ? "Hide side panel" : "Show side panel"}
                      className={
                        "hidden h-8 w-8 place-items-center rounded-[8px] border shadow-sm transition-colors lg:grid " +
                        (panelShown
                          ? "border-[color-mix(in_srgb,var(--alltra-brand)_35%,transparent)] bg-[color-mix(in_srgb,var(--alltra-brand)_16%,transparent)] text-[var(--alltra-brand)]"
                          : "border-border bg-card text-text-muted hover:bg-card-hover hover:text-text")
                      }
                    >
                      <PanelRight size={15} />
                    </button>
                  );
                })()}
              </>
            )}
            <ShareMenu
              onCopyMarkdown={copyMarkdown}
              onDownloadMarkdown={downloadMarkdown}
              onCopyText={copyText}
              onPrint={printEntry}
            />
            {/* notes + trash — desktop only (mobile reaches them via the nav drawer) */}
            <span className="hidden md:contents">
              <ChromeBtn title="Notes" onClick={goNotes}>
                <StickyNote size={16} />
              </ChromeBtn>
              <button
                onClick={() => setTrashOpen(true)}
                title="Trash"
                className="relative grid h-8 w-8 place-items-center rounded-[8px] text-text-muted transition-colors hover:bg-[var(--hover-overlay)] hover:text-text"
              >
                <Trash2 size={16} />
                {trash.length > 0 && (
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--warning)]" />
                )}
              </button>
            </span>
            {/* appearance */}
            <ChromeBtn title="Appearance" onClick={() => setAppearanceOpen(true)}>
              <Palette size={16} />
            </ChromeBtn>
            {/* widgets panel opener (mobile/tablet) */}
            <button
              onClick={() => setPanelOpen(true)}
              title="Panel"
              className="grid h-8 w-8 place-items-center rounded-[8px] text-text-muted transition-colors hover:bg-[var(--hover-overlay)] hover:text-text lg:hidden"
            >
              <PanelRight size={16} />
            </button>
            {/* new entry — always lands on the editor; disabled when the day is full */}
            <button
              onClick={() => {
                setPreviewSection(null);
                goEditor();
                newEntry();
              }}
              disabled={dayIsFull}
              title={dayIsFull ? "10 entries max per day" : "New entry"}
              className="grid h-8 w-8 place-items-center rounded-[8px] bg-[var(--alltra-brand)] text-[var(--on-brand)] shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:opacity-40"
            >
              <Plus size={16} />
            </button>
            {/* accounts — decorative in this single-user app, so a static chip
                (tinted with the theme accent to match the brand controls) */}
            <span className="hidden items-center gap-1.5 rounded-[8px] border border-[color-mix(in_srgb,var(--alltra-brand)_35%,transparent)] bg-[color-mix(in_srgb,var(--alltra-brand)_16%,transparent)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--alltra-brand)] md:inline-flex">
              Accounts · 1
            </span>
            {/* avatar → appearance */}
            <button
              onClick={() => setAppearanceOpen(true)}
              aria-label="Appearance"
              title="Appearance"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--alltra-brand)] text-[12px] font-semibold text-[var(--on-brand)]"
            >
              H
            </button>
          </div>
            </>
          )}
        </header>

        {/* Mobile nav drawer — hoisted out of the editor container so the "Menu"
            button works on every view (calendar / notes / editor). md:hidden. */}
        {navOpen && (
          <>
            <div
              className="fixed inset-0 z-[455] bg-black/30 md:hidden"
              onClick={() => setNavOpen(false)}
            />
            <NavDrawer
              className="nav-slide-in fixed bottom-0 left-[64px] top-0 z-[460] flex shadow-lg md:hidden"
              entries={navEntries}
              page={page}
              expanded
              onClose={() => setNavOpen(false)}
              onSelect={(i) => {
                goTo(i);
                setNavOpen(false);
              }}
              onNew={() => {
                newEntry();
                setNavOpen(false);
              }}
              newDisabled={dayIsFull}
              onSearch={() => {
                openSpotlight();
                setNavOpen(false);
              }}
              onRename={renameEntry}
              onDelete={deleteEntry}
              trashCount={trash.length}
              onOpenTrash={() => {
                setTrashOpen(true);
                setNavOpen(false);
              }}
              onOpenCalendar={() => {
                goCalendar();
                setNavOpen(false);
              }}
              onOpenNotes={() => {
                goNotes();
                setNavOpen(false);
              }}
              onFavorite={toggleFavEntry}
              favoriteIds={favEntries}
            />
          </>
        )}

        {/* Preview placeholder for Alltra sections the journal doesn't implement */}
        {previewSection && (
          <div
            className="absolute inset-x-0 bottom-0 z-[120] flex flex-col items-center justify-center gap-3 px-6 text-center"
            style={{ top: 52, background: "var(--panel-bg)" }}
          >
            <span
              className="grid h-16 w-16 place-items-center rounded-2xl text-white"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, var(--alltra-brand) 0%, var(--accent-hover) 100%)",
              }}
            >
              <Sparkles size={26} />
            </span>
            <h2 className="text-[19px] font-semibold tracking-tight text-text">
              {previewSection.charAt(0).toUpperCase() + previewSection.slice(1)}
            </h2>
            <p className="max-w-sm text-[13px] leading-relaxed text-text-muted">
              This Alltra section isn&apos;t wired into your journal yet — it&apos;s
              here so you can preview the full v3 layout.
            </p>
            <button
              onClick={() => {
                setPreviewSection(null);
                goEditor();
              }}
              className="mt-1 rounded-lg bg-[var(--alltra-brand)] px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            >
              Back to Journal
            </button>
          </div>
        )}

        {/* STATE 2 — editor + drawer + right controls (kept mounted; hidden on calendar home) */}
        <div
          className="flex flex-1 overflow-hidden"
          style={{ display: view === "editor" ? "flex" : "none" }}
        >
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* canvas — editor paper + right widget float together on the soft canvas */}
            <div className={"flex flex-1 overflow-hidden bg-[var(--panel-bg)] " + (focusMode ? "gap-0 p-0" : "gap-6 p-6")}>
              <main className="flex flex-1 justify-center overflow-hidden">
                <div className={"flex h-full w-full flex-col items-center " + (focusMode ? "max-w-none" : "max-w-[1500px] pb-5")}>
                  {/* the sheet fills the width; the prev/next arrows float over its
                      side padding so the paper (and its banner) reach the edges */}
                  <div className="relative flex h-full w-full items-center">
                    {!focusMode && (
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => goDay(-1)}
                      disabled={
                        page === provisionalIndex ? dayPos <= 0 : realPos <= 0
                      }
                      title="Previous entry (this day)"
                      className="absolute left-2 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-border bg-card text-text-muted shadow-sm transition-colors hover:bg-card-hover hover:text-text disabled:opacity-30 disabled:hover:bg-card"
                    >
                      <ChevronLeft size={19} />
                    </button>
                    )}

                    {/* paper stack — a sheet inside a stack of sheets */}
                    <div className="paper-stack relative h-full w-full min-w-0">
                      {!focusMode && <div className="stack-sheet s2" />}
                      {!focusMode && <div className="stack-sheet s1" />}
                      <div
                        ref={paperRef}
                        className={
                          "journal relative z-10 flex h-full w-full flex-col overflow-hidden text-text " +
                          (focusMode
                            ? "bg-transparent"
                            : "rounded-[20px] border border-border bg-[var(--surface-2)] shadow-md")
                        }
                        style={editorStyle}
                      >
                        <div
                          className={
                            "hide-scrollbar flex-1 overflow-y-auto journal-scroll " +
                            (focusMode ? "journal-focus-scroll" : "px-20 py-16") +
                            (hasBanner ? " has-banner" : "")
                          }
                          style={hasBanner ? ({ "--byline-h": `${bylineH}px` } as React.CSSProperties) : undefined}
                          onMouseMove={onPaperMove}
                          onMouseLeave={onPaperLeave}
                        >
                          {view === "editor" && !previewSection && (
                            <JournalByline
                              ref={bylineRef}
                              name="Hussein"
                              initial="H"
                              status={
                                saveError
                                  ? "Couldn't save — storage full"
                                  : isSaved
                                    ? `Last updated at ${updatedStamp(updatedAt)}`
                                    : "Saving…"
                              }
                              title={entryTitles[page] ?? ""}
                              placeholder={titles[page] || "Untitled"}
                              onTitleChange={(v) => {
                                setEntryTitles((t) => {
                                  const n = [...t];
                                  n[page] = v;
                                  return n;
                                });
                                schedulePersist();
                              }}
                            />
                          )}
                          <EditorContent editor={editor} />
                          {view === "editor" && <TableMenu editor={editor} />}
                        </div>
                        {/* hover handle — portaled to <body> so its fixed
                            position resolves to the viewport (the paper-stack's
                            `perspective` would otherwise contain it) */}
                        {blockHandle &&
                          !blockMenu &&
                          createPortal(
                            <button
                              ref={blockHandleElRef}
                              // keep the editor focused / selection intact when
                              // opening the menu — otherwise selection-dependent
                              // actions (Ask AI, etc.) see an empty selection
                              onMouseDown={(e) => e.preventDefault()}
                              onPointerDown={startBlockDrag}
                              style={{
                                position: "fixed",
                                top: blockHandle.top - 12, // grip is 24px → center on the line
                                left: blockHandle.left - 30,
                                zIndex: 50,
                              }}
                              onMouseLeave={(e) => {
                                const rt = e.relatedTarget as Node | null;
                                if (!rt || !paperRef.current?.contains(rt))
                                  setBlockHandle(null);
                              }}
                              onClick={() => {
                                // a drag just ended → swallow this click (don't open the menu)
                                if (justDraggedRef.current) {
                                  justDraggedRef.current = false;
                                  return;
                                }
                                setBlockMenu({
                                  x: blockHandle.left - 30,
                                  top: blockHandle.top,
                                  bottom: blockHandle.top + 24,
                                  pos: blockHandle.pos,
                                });
                              }}
                              title="Drag to move · click for actions"
                              className="grid h-6 w-6 cursor-grab place-items-center rounded-md text-text-faint transition-colors hover:bg-[var(--hover-overlay)] hover:text-text active:cursor-grabbing"
                            >
                              <GripVertical size={15} />
                            </button>,
                            document.body
                          )}
                        {/* block-reorder drop indicator — a blue insertion line that
                            smoothly slides between drop positions */}
                        {dragLine &&
                          createPortal(
                            <div
                              className="drag-line"
                              style={{ left: dragLine.left, top: dragLine.top, width: dragLine.width }}
                            />,
                            document.body
                          )}
                        {/* the lifted block's ghost, trailing the cursor */}
                        {dragGhost &&
                          createPortal(
                            <div className="drag-ghost" style={{ left: dragGhost.x + 16, top: dragGhost.y - 12 }}>
                              {dragGhost.label}
                            </div>,
                            document.body
                          )}
                        <span className="pointer-events-none absolute bottom-3.5 right-6 text-[12px] font-medium tabular-nums text-text-faint">
                          {provisionalIndex !== null && page === provisionalIndex
                            ? realSiblings.length > 0
                              ? `New · ${realSiblings.length + 1} / ${realSiblings.length + 1}`
                              : "New"
                            : `${realPos + 1} / ${realSiblings.length}`}
                        </span>
                      </div>
                    </div>

                    {!focusMode && (
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => goDay(1)}
                      disabled={
                        page === provisionalIndex
                          ? true
                          : realPos >= realSiblings.length - 1
                      }
                      title="Next entry (this day)"
                      className="absolute right-2 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-border bg-card text-text-muted shadow-sm transition-colors hover:bg-card-hover hover:text-text disabled:opacity-30 disabled:hover:bg-card"
                    >
                      <ChevronRight size={19} />
                    </button>
                    )}
                  </div>
                </div>
              </main>

              {panelOpen && (
                <div
                  className="fixed inset-0 z-[455] bg-black/30 lg:hidden"
                  onClick={() => setPanelOpen(false)}
                />
              )}
              {/* the right panel is shown/hidden from the top-bar panel toggle */}
              {/* right side — inline widgets on lg+, slide-over drawer below lg
                  (fully hidden in full-page focus mode) */}
              <div
                className={
                  // shown = normal:!collapsed / full-page:peeked. Always in the DOM so
                  // width+opacity animate it in smoothly (no display:none jump). Flush
                  // (no bottom pad) in full-page so it reads as an edge side panel.
                  "relative flex min-h-0 shrink-0 flex-col gap-6 " +
                  (focusMode ? "" : "pb-5 ") +
                  "lg:relative lg:h-full lg:transition-[width,opacity] lg:duration-200 lg:ease-out " +
                  ((focusMode ? panelPeek : !rightCollapsed)
                    ? focusMode
                      ? "lg:w-[440px] xl:w-[520px] "
                      : "lg:w-[420px] xl:w-[560px] 2xl:w-[621px] "
                    : "lg:w-0 lg:overflow-hidden lg:opacity-0 ") +
                  "max-lg:fixed max-lg:right-0 max-lg:top-[100px] max-lg:bottom-0 max-lg:z-[460] max-lg:w-[621px] max-lg:max-w-[94vw] max-lg:overflow-y-auto max-lg:bg-[var(--panel-bg)] max-lg:p-4 max-lg:shadow-lg max-lg:transition-transform " +
                  (panelOpen ? "max-lg:translate-x-0" : "max-lg:translate-x-full")
                }
              >
              {/* collapse button — top-right of the panel (desktop only) */}
              <button
                onClick={() => (focusMode ? setPanelPeek(false) : setRightCollapsed(true))}
                title="Collapse panel"
                className="absolute right-4 top-5 z-30 hidden h-8 w-8 place-items-center rounded-lg border border-border bg-card text-text-muted shadow-sm transition-colors hover:bg-card-hover hover:text-text lg:grid"
              >
                <PanelRight size={16} />
              </button>
              {/* Daily Performance widget — temporarily hidden from the UI.
                  Restore by switching `false` back to `showDailyPerf`. */}
              {false && showDailyPerf && (
                <DailyPerformance
                  className="shrink-0"
                  onRemove={() => setShowDailyPerf(false)}
                />
              )}
              <aside
                className={
                  "hide-scrollbar flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto bg-card px-8 py-7 " +
                  (focusMode
                    ? "border-l border-border" // full-page: flush edge panel, no rounding
                    : "rounded-[20px] border border-border shadow-sm")
                }
              >
            {/* theme style — always first */}
            <section>
              <h3 className="mb-4 text-[15px] font-semibold tracking-tight text-text">
                Theme Style
              </h3>
              <div className="grid grid-cols-5 gap-2.5">
                {THEMES.map((t, i) => (
                  <button
                    key={t.name}
                    onClick={() => {
                      setTheme(i);
                      setFont(t.font);
                    }}
                    title={`${t.name} · ${FONTS[t.font].label}`}
                    className={`relative grid h-[72px] place-items-center rounded-2xl border shadow-sm ${t.bg} ${
                      theme === i ? "border-border-strong" : "border-border"
                    }`}
                  >
                    <span
                      className={`text-xl font-semibold ${t.fg}`}
                      style={{ fontFamily: FONTS[t.font].value }}
                    >
                      Aa
                    </span>
                    {theme === i && (
                      <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-text text-[var(--surface-1)]">
                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M2.5 6.2 4.8 8.5 9.5 3.5"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>

            <div className="border-t border-dashed border-border" />

            {/* text editor */}
            <section>
              <h3 className="mb-4 text-[15px] font-semibold tracking-tight text-text">
                Text Editor
              </h3>
              <div className="flex gap-2.5">
                {/* left: font card + bold/italic/underline */}
                <div className="flex flex-1 flex-col gap-2.5">
                  <div className="flex flex-col rounded-2xl bg-[var(--hover-overlay)] p-4">
                    <span
                      className="text-3xl font-semibold text-text"
                      style={{ fontFamily: FONTS[displayFontIdx].value }}
                    >
                      Aa
                    </span>
                    <div className="my-3.5 border-t border-border" />
                    <span className="text-[12px] font-medium text-text-muted">
                      Customize font
                    </span>
                    <div className="relative mt-1 flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-[var(--hover-overlay-medium)]">
                      <span className="text-[13px] text-text">
                        {FONTS[displayFontIdx].label}
                      </span>
                      <ChevronsUpDown size={13} className="text-text-faint" />
                      <select
                        value={displayFontIdx}
                        onChange={(e) => pickFont(Number(e.target.value))}
                        className="absolute inset-0 cursor-pointer opacity-0"
                      >
                        {FONTS.map((f, i) => (
                          <option key={f.label} value={i}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <Control
                      shape="circle"
                      icon={<BoldIcon size={17} />}
                      label="Bold"
                      onClick={toggle.bold}
                      active={!!editor?.isActive("bold")}
                    />
                    <Control
                      shape="circle"
                      icon={<ItalicIcon size={17} />}
                      label="Italic"
                      onClick={toggle.italic}
                      active={!!editor?.isActive("italic")}
                    />
                    <Control
                      shape="circle"
                      icon={<UnderlineIcon size={17} />}
                      label="Underline"
                      onClick={toggle.underline}
                      active={!!editor?.isActive("underline")}
                    />
                  </div>
                </div>

                {/* right: Alltra Intelligence AI button (full width, above the
                    pills) + Size / Line / Letter drag sliders */}
                <div className="flex flex-1 flex-col gap-2.5">
                  <button
                    onClick={() => setNikkiOpen(true)}
                    title={ASSISTANT_NAME}
                    className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-[var(--alltra-brand)] bg-[rgba(var(--alltra-brand-rgb),0.06)] px-3 py-3 text-[13px] font-semibold text-[var(--alltra-brand)] shadow-sm transition-colors hover:bg-[rgba(var(--alltra-brand-rgb),0.1)]"
                  >
                    <IntelligenceMark size={15} /> {ASSISTANT_NAME}
                  </button>

                  <div className="flex flex-1 gap-2.5">
                    <div className="flex flex-1">
                      <VSlider
                        value={displaySizeV}
                        onChange={pickSize}
                        icon={<TextIcon size={17} />}
                        label="Size"
                      />
                    </div>
                    <div className="flex flex-1">
                      <VSlider
                        value={spacingV}
                        onChange={setSpacingV}
                        icon={<LineSpacingIcon size={17} />}
                        label="Line"
                      />
                    </div>
                    <div className="flex flex-1">
                      <VSlider
                        value={displayTrackingV}
                        onChange={pickTracking}
                        icon={<LetterSpacingIcon size={17} />}
                        label="Letter"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="border-t border-dashed border-border" />

            {/* emotions — the mood trend across every entry's day summary */}
            <section>
              <h3 className="mb-4 text-[15px] font-semibold tracking-tight text-text">
                Emotions
              </h3>
              <EmotionsWidget
                pages={pagesRef.current}
                dates={dates}
                exclude={provisionalIndex}
                stamp={updatedAt}
              />
            </section>

            {/* pinned — slash commands starred from the "/" menu; newest on top */}
            <section>
              <h3 className="mb-4 text-[15px] font-semibold tracking-tight text-text">
                Pinned
              </h3>
              {favorites.length > 0 ? (
                <PinnedGrid
                  ids={favorites}
                  editor={editor}
                  pinnedSelRef={pinnedSelRef}
                  onReorder={reorderFavorites}
                />
              ) : (
                <p className="text-[12.5px] leading-relaxed text-text-muted">
                  Pin commands from the{" "}
                  <span className="font-medium text-text">/</span> menu and
                  they&apos;ll show up here.
                </p>
              )}
            </section>

            <div className="border-t border-dashed border-border" />

            {/* templates — favorited ones surface here; browse opens the gallery */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[15px] font-semibold tracking-tight text-text">
                  Templates
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={startCustomTemplate}
                    className="flex items-center gap-1.5 rounded-lg border border-[var(--alltra-brand)] bg-[rgba(var(--alltra-brand-rgb),0.06)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--alltra-brand)] shadow-sm transition-colors hover:bg-[rgba(var(--alltra-brand-rgb),0.1)]"
                  >
                    <Plus size={14} /> New
                  </button>
                  <button
                    onClick={() => setTemplatesOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[12px] font-medium text-text shadow-sm transition-colors hover:bg-card-hover"
                  >
                    <LayoutTemplate size={14} /> Browse
                  </button>
                </div>
              </div>
              {favTemplates.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {favTemplates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => applyTemplate(t)}
                      title={t.description}
                      className="flex items-center gap-2 overflow-hidden rounded-lg border border-border bg-card px-2.5 py-2 text-left shadow-sm transition-colors hover:bg-card-hover"
                    >
                      <span
                        className="h-6 w-1.5 shrink-0 rounded-full"
                        style={{ background: t.accent }}
                      />
                      <span className="truncate text-[12.5px] font-medium text-text">
                        {t.name}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[12.5px] leading-relaxed text-text-muted">
                  Star a template in{" "}
                  <button
                    onClick={() => setTemplatesOpen(true)}
                    className="font-medium text-[var(--alltra-brand)] hover:underline"
                  >
                    Browse
                  </button>{" "}
                  to pin it here.
                </p>
              )}
            </section>
              </aside>
              </div>
            </div>
          </div>
        </div>

        {/* STATE 1 — calendar home (the landing view) */}
        {view === "calendar" && (
          <div className="flex flex-1 flex-col overflow-y-auto bg-[var(--panel-bg)]">
            <div className="mx-auto w-full max-w-[1640px] px-8 py-8">
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <h1 className="text-[22px] font-semibold tracking-tight text-text">
                    Your journal
                  </h1>
                  <p className="mt-1 text-[13.5px] text-text-muted">
                    Pick a day to open or start an entry.
                  </p>
                </div>
                <button
                  onClick={goEditor}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-[13px] font-medium text-text shadow-sm transition-colors hover:bg-card-hover"
                >
                  Open editor <ArrowRight size={15} />
                </button>
              </div>

              {/* top row — Today's Journal + Journal Quality Rating */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.55fr_1fr]">
                <TodaysJournalWidget
                  journalData={buildJournalData()}
                  onOpen={openDateEntry}
                />
                <JournalQualityWidget
                  journalData={buildJournalData()}
                  onOpen={openDateEntry}
                />
              </div>

              {/* bottom — full-width Journal Calendar */}
              <div className="mt-5">
                <JournalCalendarWidget
                  journalData={buildJournalData()}
                  onOpenJournal={openDateEntry}
                  initialDate={
                    dates[page] ? new Date(`${dates[page]}T00:00:00`) : undefined
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* STATE 3 — Notes (a separate space from the journal) — same left nav
            drawer as the editor, content to the right */}
        {view === "notes" && (
          <div className="flex flex-1 overflow-hidden">
            <NotesPage
              onBack={goCalendar}
              openNoteId={spotNoteId}
              onOpened={() => setSpotNoteId(null)}
              favorites={{
                getIds: () => favoritesRef.current,
                onToggle: toggleFavorite,
              }}
              pageLinks={{
                getEntries: () => navEntriesRef.current,
                onOpen: (date, title) => openPageLinkRef.current(date, title),
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
