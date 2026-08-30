/**
 * The "/" slash-command registry — the single source of truth for what typing
 * "/" offers. Pure data + a filter. Each command's run(editor, range) deletes
 * the "/query" range and applies the block via editor.chain() — the same
 * commands the side panel / bubble toolbar drive, so blocks round-trip
 * identically. Adapted for TipTap v2 + the journal's installed extensions.
 */
import {
  TextIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  QuoteIcon,
  CalloutIcon,
  CodeIcon,
  DividerIcon,
  BulletedIcon,
  NumberedIcon,
  ChecklistIcon,
  TodoIcon,
  ToggleIcon,
  TableColumnsIcon,
  TableRowsIcon,
  AlignCenterIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikeIcon,
  ImageIcon,
  LinkIcon,
  EmojiIcon,
  DateIcon,
  TagIcon,
  BannerIcon,
  PageLinkIcon,
  TradeLinkIcon,
  type EditorIcon,
} from "../editorIcons";
import type { Editor, Range } from "@tiptap/core";
import { HORIZONTAL_TABLE_HTML, VERTICAL_TABLE_HTML } from "../templates";

export interface SlashCommand {
  id: string;
  title: string;
  description: string;
  /** Extra match terms beyond the title (so "h1"/"bullet"/"todo" find them). */
  aliases: string[];
  /** Section header label in the menu. */
  group: string;
  icon: EditorIcon;
  /** How a pinned/toolbar quick-action runs it: "format" applies to the current
   *  block; "insert" drops a new block (gets a fresh empty line first). */
  pinKind: "format" | "insert";
  /** Delete the slash range, then apply the block at the cursor. */
  run: (editor: Editor, range: Range) => void;
}

/** Open the OS file picker and hand back the chosen image as a data URL. */
function pickImageFile(onPick: (src: string) => void): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onPick(reader.result as string);
    reader.readAsDataURL(file);
  };
  input.click();
}

/**
 * Run a block/format command. Only strips the "/query" text when there's a real
 * range to delete (the slash path, from < to). On the pinned path the range is
 * a collapsed cursor — we DON'T delete, so the user's highlighted selection is
 * preserved and the format (e.g. Heading 1) converts the selected block in place.
 */
function applyAt(
  editor: Editor,
  range: Range,
  apply: (chain: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>
): void {
  const chain = editor.chain().focus();
  if (range.from !== range.to) {
    // slash path: strip the "/query" (this also collapses the selection)
    chain.deleteRange(range);
  } else {
    // pinned path: collapse the highlighted selection to a cursor in the block.
    // setNode/setBlockType is reliable on a collapsed cursor but mangles inline
    // marks (and drops the block change) on a non-empty marked selection — so we
    // mirror the slash path. Block transforms convert the whole block anyway.
    chain.setTextSelection(range.from);
  }
  apply(chain).run();
}

/**
 * Toggle an inline mark (bold/italic/underline/strike). Unlike applyAt this does
 * NOT collapse the selection: on the pinned path the editor's live selection is
 * the user's restored highlight, so the mark toggles across it. On the slash path
 * it strips the "/query" first (the toggle then just arms the next character).
 */
function applyMark(
  editor: Editor,
  range: Range,
  apply: (chain: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>
): void {
  const chain = editor.chain().focus();
  if (range.from !== range.to) chain.deleteRange(range); // slash path: drop query
  apply(chain).run();
}

/**
 * Commands already represented by the Text Editor panel's controls (Bold,
 * Italic, Underline, Strike, Alignment). These are NOT separately pinnable —
 * no star in the "/" menu and skipped in the Pinned section — so they can't be
 * duplicated.
 */
export const PANEL_COMMAND_IDS = new Set([
  "bold",
  "italic",
  "underline",
]);

export const SLASH_COMMANDS: SlashCommand[] = [
  // ── Basic blocks ──────────────────────────────────────────────────────
  {
    id: "text",
    title: "Text",
    description: "Plain paragraph",
    aliases: ["paragraph", "p", "body", "plain"],
    group: "Basic blocks",
    icon: TextIcon,
    pinKind: "format",
    run: (e, r) => applyAt(e, r, (c) => c.setParagraph()),
  },
  {
    id: "heading-1",
    title: "Heading 1",
    description: "Large section heading",
    aliases: ["h1", "title", "big"],
    group: "Basic blocks",
    icon: Heading1Icon,
    pinKind: "format",
    run: (e, r) => applyAt(e, r, (c) => c.setNode("heading", { level: 1 })),
  },
  {
    id: "heading-2",
    title: "Heading 2",
    description: "Medium section heading",
    aliases: ["h2", "subtitle"],
    group: "Basic blocks",
    icon: Heading2Icon,
    pinKind: "format",
    run: (e, r) => applyAt(e, r, (c) => c.setNode("heading", { level: 2 })),
  },
  {
    id: "heading-3",
    title: "Heading 3",
    description: "Small section heading",
    aliases: ["h3"],
    group: "Basic blocks",
    icon: Heading3Icon,
    pinKind: "format",
    run: (e, r) => applyAt(e, r, (c) => c.setNode("heading", { level: 3 })),
  },
  {
    id: "quote",
    title: "Quote",
    description: "Capture a quote",
    aliases: ["quote", "blockquote", "citation"],
    group: "Basic blocks",
    icon: QuoteIcon,
    pinKind: "format",
    // blockquote can't wrap a list item directly (its content spec needs a
    // leading paragraph) — lift out of the list first, exactly like the
    // setNode fallback that makes headings work inside lists
    run: (e, r) =>
      applyAt(e, r, (c) =>
        c
          .command(({ can, commands }) =>
            e.isActive("blockquote") || can().wrapIn("blockquote")
              ? true
              : commands.clearNodes()
          )
          .toggleBlockquote()
      ),
  },
  {
    id: "callout",
    title: "Callout",
    description: "Colored box to pin a key insight",
    aliases: ["callout", "aside", "note", "insight", "highlight", "box", "tip"],
    group: "Basic blocks",
    icon: CalloutIcon,
    // "format" so the pinned action wraps the current selection instead of
    // dropping a fresh empty block beside it
    pinKind: "format",
    run: (e, r) => {
      // only strip the "/query" text (from<to); for a pinned click the range is
      // collapsed (from===to) — leave the user's real selection intact so the
      // callout can wrap it
      const chain = e.chain().focus();
      if (r.from !== r.to) chain.deleteRange(r);
      chain.insertCallout().run();
    },
  },
  {
    id: "code-block",
    title: "Code",
    description: "A monospace code block",
    aliases: ["code", "snippet", "monospace", "pre", "codeblock"],
    group: "Basic blocks",
    icon: CodeIcon,
    pinKind: "format",
    run: (e, r) => applyAt(e, r, (c) => c.toggleCodeBlock()),
  },
  {
    id: "divider",
    title: "Divider",
    description: "Visually divide blocks",
    aliases: ["divider", "hr", "rule", "line", "separator"],
    group: "Basic blocks",
    icon: DividerIcon,
    pinKind: "insert",
    run: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run(),
  },

  // ── Lists ─────────────────────────────────────────────────────────────
  {
    id: "bullet-list",
    title: "Bulleted list",
    description: "A simple bulleted list",
    aliases: ["unordered", "ul", "bullet", "list"],
    group: "Lists",
    icon: BulletedIcon,
    pinKind: "format",
    run: (e, r) => applyAt(e, r, (c) => c.toggleBulletList()),
  },
  {
    id: "numbered-list",
    title: "Numbered list",
    description: "A list with ordering",
    aliases: ["ordered", "ol", "number"],
    group: "Lists",
    icon: NumberedIcon,
    pinKind: "format",
    run: (e, r) => applyAt(e, r, (c) => c.toggleOrderedList()),
  },
  {
    id: "checklist",
    title: "Checklist",
    description: "Checked items strike through",
    aliases: ["checklist", "check list", "checkboxes", "checkbox", "tick"],
    group: "Lists",
    icon: ChecklistIcon,
    pinKind: "format",
    // Convert to a checklist WITHOUT toggling an existing task list off (which
    // would delete it); only create the list if we're not already in one.
    run: (e, r) => {
      const c = e.chain().focus().deleteRange(r);
      if (!e.isActive("taskList")) c.toggleTaskList();
      c.setChecklistVariant().run();
    },
  },
  {
    id: "todo-list",
    title: "To-do list",
    description: "Track tasks with checkboxes",
    aliases: ["todo", "task", "checkbox", "check"],
    group: "Lists",
    icon: TodoIcon,
    pinKind: "format",
    // Plain to-do: keep/convert an existing task list and clear the checklist
    // variant, instead of blindly toggling (which destroys a checklist list).
    run: (e, r) => {
      const c = e.chain().focus().deleteRange(r);
      if (!e.isActive("taskList")) c.toggleTaskList();
      c.unsetChecklistVariant().run();
    },
  },
  {
    id: "toggle-list",
    title: "Toggle list",
    description: "Collapsible section",
    aliases: ["toggle", "collapse", "details", "accordion", "fold"],
    group: "Lists",
    icon: ToggleIcon,
    pinKind: "insert",
    run: (e, r) => e.chain().focus().deleteRange(r).insertToggle().run(),
  },

  // ── Content table ─────────────────────────────────────────────────────
  {
    id: "content-table-horizontal",
    title: "Horizontal content table",
    description: "Notion-style grid — columns across",
    aliases: [
      "table",
      "content table",
      "grid",
      "horizontal",
      "database",
      "columns",
    ],
    group: "Content table",
    icon: TableColumnsIcon,
    pinKind: "insert",
    run: (e, r) =>
      e.chain().focus().deleteRange(r).insertContent(HORIZONTAL_TABLE_HTML).run(),
  },
  {
    id: "content-table-vertical",
    title: "Vertical content table",
    description: "Label–value list — fields down the left",
    aliases: [
      "table",
      "content table",
      "grid",
      "vertical",
      "key value",
      "properties",
      "rows",
    ],
    group: "Content table",
    icon: TableRowsIcon,
    pinKind: "insert",
    run: (e, r) =>
      e.chain().focus().deleteRange(r).insertContent(VERTICAL_TABLE_HTML).run(),
  },
  {
    id: "trade-table",
    title: "Trade table",
    description: "A trade log with coloured tags, P&L sums & screenshot attachments",
    aliases: ["trade", "trades", "log", "trade log", "journal table", "database", "tracker"],
    group: "Content table",
    icon: TradeLinkIcon,
    pinKind: "insert",
    run: (e, r) => e.chain().focus().deleteRange(r).insertTradeTable("trade").run(),
  },
  {
    id: "survey-table",
    title: "Self-assessment survey",
    description: "A post-session survey — questions you rate Yes / Somewhat / No",
    aliases: ["survey", "self assessment", "review", "questions", "reflection", "discipline"],
    group: "Content table",
    icon: ChecklistIcon,
    pinKind: "insert",
    run: (e, r) => e.chain().focus().deleteRange(r).insertTradeTable("survey").run(),
  },
  {
    id: "weekly-review-table",
    title: "Weekly review",
    description: "One row per week — trades, P&L, emotion, grade & the lesson",
    aliases: ["weekly", "week", "recap", "performance", "review table"],
    group: "Content table",
    icon: DateIcon,
    pinKind: "insert",
    run: (e, r) => e.chain().focus().deleteRange(r).insertTradeTable("weekly").run(),
  },
  {
    id: "checklist-table",
    title: "Pre-trade checklist",
    description: "Tick each rule before you take a trade",
    aliases: ["checklist", "pre trade", "rules", "before trade", "confluence"],
    group: "Content table",
    icon: TodoIcon,
    pinKind: "insert",
    run: (e, r) => e.chain().focus().deleteRange(r).insertTradeTable("checklist").run(),
  },

  // ── Performance (live stats from your logged trades + a mistakes log) ──────
  {
    id: "stats-summary",
    title: "Performance stats",
    description: "Live win rate, net P&L & profit factor from your logged trades",
    aliases: ["statistics", "stats", "performance", "summary", "metrics", "kpi", "win rate"],
    group: "Performance",
    icon: TradeLinkIcon,
    pinKind: "insert",
    run: (e, r) => e.chain().focus().deleteRange(r).insertJournalStats("summary").run(),
  },
  {
    id: "stats-monthly",
    title: "Monthly performance",
    description: "Net P&L, trades & win rate broken down by month",
    aliases: ["monthly", "month", "breakdown", "by month", "monthly performance"],
    group: "Performance",
    icon: DateIcon,
    pinKind: "insert",
    run: (e, r) => e.chain().focus().deleteRange(r).insertJournalStats("monthly").run(),
  },
  {
    id: "stats-winloss",
    title: "Win / Loss / BE",
    description: "A win–loss–breakeven split bar from your trades",
    aliases: ["winloss", "win loss", "wl", "breakeven", "be", "split", "win rate bar"],
    group: "Performance",
    icon: TableColumnsIcon,
    pinKind: "insert",
    run: (e, r) => e.chain().focus().deleteRange(r).insertJournalStats("winloss").run(),
  },
  {
    id: "mistakes-table",
    title: "Mistakes / filter",
    description: "Log recurring mistakes, tag the cause & capture the fix",
    aliases: ["mistakes", "errors", "filter", "leaks", "lessons", "mistake log"],
    group: "Performance",
    icon: TodoIcon,
    pinKind: "insert",
    run: (e, r) => e.chain().focus().deleteRange(r).insertTradeTable("mistakes").run(),
  },

  // ── Align ─────────────────────────────────────────────────────────────
  {
    id: "alignment",
    title: "Alignment",
    description: "Cycle: left → center → right",
    aliases: [
      "align",
      "alignment",
      "left",
      "center",
      "centre",
      "middle",
      "right",
      "text align",
    ],
    group: "Align",
    icon: AlignCenterIcon,
    pinKind: "format",
    // one button cycles the block's alignment each time it's run
    run: (e, r) => {
      const order = ["left", "center", "right"] as const;
      const cur = order.find((a) => e.isActive({ textAlign: a })) ?? "left";
      const next = order[(order.indexOf(cur) + 1) % order.length];
      applyAt(e, r, (c) => c.setTextAlign(next));
    },
  },

  // ── Formatting ────────────────────────────────────────────────────────
  {
    id: "bold",
    title: "Bold",
    description: "Bold text",
    aliases: ["bold", "strong", "b"],
    group: "Formatting",
    icon: BoldIcon,
    pinKind: "format",
    run: (e, r) => applyMark(e, r, (c) => c.toggleBold()),
  },
  {
    id: "italic",
    title: "Italic",
    description: "Italic text",
    aliases: ["italic", "emphasis", "i"],
    group: "Formatting",
    icon: ItalicIcon,
    pinKind: "format",
    run: (e, r) => applyMark(e, r, (c) => c.toggleItalic()),
  },
  {
    id: "underline",
    title: "Underline",
    description: "Underline text",
    aliases: ["underline", "u"],
    group: "Formatting",
    icon: UnderlineIcon,
    pinKind: "format",
    run: (e, r) => applyMark(e, r, (c) => c.toggleUnderline()),
  },
  {
    id: "strikethrough",
    title: "Strikethrough",
    description: "Strike through text",
    aliases: ["strikethrough", "strike", "s"],
    group: "Formatting",
    icon: StrikeIcon,
    pinKind: "format",
    run: (e, r) => applyMark(e, r, (c) => c.toggleStrike()),
  },

  // ── Insert ────────────────────────────────────────────────────────────
  {
    id: "image",
    title: "Image",
    description: "Upload an image from your device",
    aliases: ["image", "photo", "picture", "img", "media", "upload"],
    group: "Insert",
    icon: ImageIcon,
    pinKind: "insert",
    run: (e, r) => {
      e.chain().focus().deleteRange(r).run(); // clear the "/image" text first
      pickImageFile((src) => e.chain().focus().setImage({ src }).run());
    },
  },
  {
    id: "link",
    title: "Link",
    description: "Insert a link",
    aliases: ["link", "url", "href", "anchor"],
    group: "Insert",
    icon: LinkIcon,
    pinKind: "insert",
    run: (e, r) => {
      const url = window.prompt("Link URL");
      const chain = e.chain().focus().deleteRange(r);
      // insert as a text node + link mark (not an HTML string) so URLs with
      // <, &, entities etc. survive verbatim instead of being HTML-parsed
      if (url)
        chain.insertContent({
          type: "text",
          text: url,
          marks: [{ type: "link", attrs: { href: url } }],
        });
      chain.run();
    },
  },
  {
    id: "emoji",
    title: "Emoji",
    description: "Pick an emoji or icon",
    aliases: ["emoji", "smiley", "emoticon", "icon", "symbol"],
    group: "Insert",
    icon: EmojiIcon,
    // inline node → "format" so it inserts at the cursor; opens the picker
    pinKind: "format",
    run: (e, r) => e.chain().focus().deleteRange(r).insertIcon().run(),
  },
  {
    id: "date",
    title: "Date",
    description: "Insert today's date and time",
    aliases: ["date", "today", "now", "time", "timestamp", "datetime"],
    group: "Insert",
    icon: DateIcon,
    pinKind: "insert",
    run: (e, r) =>
      e.chain().focus().deleteRange(r).insertContent(nowStamp()).run(),
  },
  {
    id: "tag",
    title: "Tag",
    description: "Insert a colored tag pill",
    aliases: ["tag", "label", "chip", "pill", "badge"],
    group: "Insert",
    icon: TagIcon,
    // inline pill → "format" so the pinned button inserts it at the cursor
    // (next to other tags) instead of dropping it onto a new line
    pinKind: "format",
    run: (e, r) => e.chain().focus().deleteRange(r).insertTag().run(),
  },
  {
    id: "banner",
    title: "Banner",
    description: "Add a gradient banner to the top",
    aliases: ["banner", "header", "cover", "gradient", "hero", "top"],
    group: "Insert",
    icon: BannerIcon,
    // inserts at the top of the doc, not at the cursor → "format" so the pinned
    // button doesn't drop a stray paragraph first
    pinKind: "format",
    run: (e, r) => e.chain().focus().deleteRange(r).insertBanner().run(),
  },
  {
    id: "page-link",
    title: "Link to page",
    description: "Reference another journal entry",
    aliases: ["link", "page", "reference", "ref", "backlink", "mention", "journal"],
    group: "Insert",
    icon: PageLinkIcon,
    pinKind: "format",
    run: (e, r) => e.chain().focus().deleteRange(r).insertPageLink().run(),
  },
  {
    id: "trade-link",
    title: "Link to trade",
    description: "Reference a trade from your dashboard",
    aliases: ["trade", "link trade", "position", "fill", "order", "ticket"],
    group: "Insert",
    icon: TradeLinkIcon,
    pinKind: "format",
    run: (e, r) => e.chain().focus().deleteRange(r).insertTradeLink().run(),
  },
];

/** Today's date + time, e.g. "6/24/2026 10:23 am". */
function nowStamp(): string {
  const d = new Date();
  const date = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  const mins = String(d.getMinutes()).padStart(2, "0");
  const ampm = d.getHours() >= 12 ? "pm" : "am";
  let h = d.getHours() % 12;
  if (h === 0) h = 12;
  return `${date} ${h}:${mins} ${ampm}`;
}

/**
 * Run a command from a pinned quick-action — there's no slash range to delete,
 * so pass an empty range at the cursor. "insert" commands get a fresh empty
 * paragraph first when the current block has content (mirrors the slash path);
 * "format" commands apply to the current block.
 */
export function runFavoriteCommand(editor: Editor, command: SlashCommand): void {
  if (command.pinKind === "insert") {
    const sel = editor.state.selection;
    const $from = sel.$from;
    // a selected block atom (image, trade table, stats…): $from.after() throws
    // at depth 0 and the insert would then REPLACE the selected node — put the
    // fresh paragraph after the node instead, so the insert lands below it
    const selNode = (sel as unknown as { node?: { isBlock?: boolean } }).node;
    if (selNode?.isBlock) {
      const after = sel.to;
      editor
        .chain()
        .focus()
        .insertContentAt(after, { type: "paragraph" })
        .setTextSelection(after + 1)
        .run();
    } else {
      const isEmpty =
        sel.empty && $from.parent.isTextblock && $from.parent.content.size === 0;
      if (!isEmpty) {
        try {
          const after = $from.after();
          editor
            .chain()
            .focus()
            .insertContentAt(after, { type: "paragraph" })
            .setTextSelection(after + 1)
            .run();
        } catch {
          editor.chain().focus().run();
        }
      }
    }
  }
  const pos = editor.state.selection.from;
  command.run(editor, { from: pos, to: pos });
}

/**
 * Filter-as-you-type. Case-insensitive match on title OR any alias; empty query
 * returns everything in order. Title-prefix ranks above alias-prefix above
 * substring, so "h" surfaces "Heading 1" near the top, not buried.
 */
export function filterCommands(
  commands: SlashCommand[],
  query: string
): SlashCommand[] {
  const q = query.trim().toLowerCase();
  if (q === "") return commands;
  const scored = commands
    .map((cmd) => {
      const title = cmd.title.toLowerCase();
      let score = -1;
      if (title.startsWith(q)) score = 3;
      else if (cmd.aliases.some((a) => a.toLowerCase().startsWith(q))) score = 2;
      else if (title.includes(q) || cmd.aliases.some((a) => a.includes(q)))
        score = 1;
      return { cmd, score };
    })
    .filter((x) => x.score > 0);
  scored.sort((a, b) => b.score - a.score);
  // keep each group contiguous (ordered by its best match) — the menu renders a
  // header whenever the group CHANGES, so interleaved groups repeat headers.
  // The overall best match still leads: its group comes first, it first within.
  const groupOrder: string[] = [];
  for (const { cmd } of scored)
    if (!groupOrder.includes(cmd.group)) groupOrder.push(cmd.group);
  return groupOrder.flatMap((g) =>
    scored.filter((x) => x.cmd.group === g).map((x) => x.cmd)
  );
}
