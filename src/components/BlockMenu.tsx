/**
 * Block action menu — the Notion-style popover that opens from a block's hover
 * handle inside the journal paper. Sections (separated by rules):
 *   1. Turn into (the command center) · Color (text + background) · Edit icon
 *   2. Copy · Duplicate · Delete
 *   3. Ask AI
 * "Turn into", "Color" and "Edit icon" open fly-out panels to the side.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/core";
import { placeSide, useFlipPosition } from "../lib/popover";
import {
  Search,
  Repeat2,
  Paintbrush,
  Smile,
  Copy as CopyIcon,
  CopyPlus,
  Trash2,
  Sparkles,
  ChevronRight,
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  ListTodo,
  Quote,
  Code,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import { SLASH_COMMANDS } from "../slash/commands";
import { EmojiIconPicker, type IconSel } from "./EmojiIconPicker";

/* ── turn-into list (the command center, block types only) ───────────────── */
const TURN_INTO: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "text", label: "Text", icon: Type },
  { id: "heading-1", label: "Heading 1", icon: Heading1 },
  { id: "heading-2", label: "Heading 2", icon: Heading2 },
  { id: "heading-3", label: "Heading 3", icon: Heading3 },
  { id: "bullet-list", label: "Bulleted list", icon: List },
  { id: "numbered-list", label: "Numbered list", icon: ListOrdered },
  { id: "todo-list", label: "To-do list", icon: ListChecks },
  { id: "checklist", label: "Checklist", icon: ListTodo },
  { id: "toggle-list", label: "Toggle list", icon: ChevronRight },
  { id: "quote", label: "Quote", icon: Quote },
  { id: "code-block", label: "Code", icon: Code },
  { id: "callout", label: "Callout", icon: Lightbulb },
];

/* ── color palettes ──────────────────────────────────────────────────────── */
const TEXT_COLORS: { name: string; value: string | null }[] = [
  { name: "Default", value: null },
  { name: "Gray", value: "#9b9a97" },
  { name: "Brown", value: "#a3724f" },
  { name: "Orange", value: "#d9730d" },
  { name: "Yellow", value: "#cb912f" },
  { name: "Green", value: "#448361" },
  { name: "Blue", value: "#337ea9" },
  { name: "Purple", value: "#9065b0" },
  { name: "Pink", value: "#c14c8a" },
  { name: "Red", value: "#d44c47" },
];
const BG_COLORS: { name: string; value: string | null }[] = [
  { name: "Default", value: null },
  { name: "Gray", value: "rgba(155,154,151,0.22)" },
  { name: "Brown", value: "rgba(163,114,79,0.20)" },
  { name: "Orange", value: "rgba(217,115,13,0.18)" },
  { name: "Yellow", value: "rgba(203,145,47,0.22)" },
  { name: "Green", value: "rgba(68,131,97,0.20)" },
  { name: "Blue", value: "rgba(51,126,169,0.20)" },
  { name: "Purple", value: "rgba(144,101,176,0.20)" },
  { name: "Pink", value: "rgba(193,76,138,0.20)" },
  { name: "Red", value: "rgba(212,76,71,0.20)" },
];

type PanelProps = {
  editor: Editor;
  pos: number;
  anchor: { x: number; top: number; bottom: number };
  onClose: () => void;
  onAskAI?: (pos: number) => void;
};

export function BlockMenu({ editor, pos, anchor, onClose, onAskAI }: PanelProps) {
  const [query, setQuery] = useState("");
  const [flyout, setFlyout] = useState<null | "turn" | "color" | "icon">(null);
  const ref = useRef<HTMLDivElement>(null);

  // close on outside click / Escape
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // the block this menu acts on
  const node = editor.state.doc.nodeAt(pos);
  const blockLabel = useMemo(() => {
    const name = node?.type.name ?? "block";
    return name === "paragraph"
      ? "Text"
      : name.charAt(0).toUpperCase() + name.slice(1);
  }, [node]);

  // ── helpers ──────────────────────────────────────────────────────────────
  const blockRange = () => {
    const n = editor.state.doc.nodeAt(pos);
    if (!n) return null;
    return { from: pos + 1, to: pos + n.nodeSize - 1 };
  };

  const runTurnInto = (id: string) => {
    const cmd = SLASH_COMMANDS.find((c) => c.id === id);
    if (!cmd) return;
    // callout wraps the block's content, so it needs a live (non-collapsed)
    // selection over the block — run it directly
    if (id === "callout") {
      const r = blockRange();
      if (r) editor.chain().focus().setTextSelection(r).insertCallout().run();
      onClose();
      return;
    }
    editor.chain().focus().setTextSelection(pos + 1).run();
    const at = editor.state.selection.from;
    cmd.run(editor, { from: at, to: at }); // empty range → no deletion
    onClose();
  };

  // text color: paint the block's text with the textStyle color mark — the same
  // reliable mechanism as the selection bubble, so existing text actually recolors
  // (a block-level `color` style only inherits, which the inner spans can defeat)
  const applyTextColor = (value: string | null) => {
    const r = blockRange();
    if (r) {
      const chain = editor.chain().focus().setTextSelection(r);
      if (value) chain.setTextColor(value);
      else chain.unsetTextColor();
      chain.run();
    }
    onClose();
  };

  // background: a whole-block tint via the bg node attribute. try/catch guards
  // nodes that don't support the attr.
  const applyBgColor = (value: string | null) => {
    editor
      .chain()
      .focus()
      .command(({ tr }) => {
        try {
          tr.setNodeAttribute(pos, "bg", value);
          return true;
        } catch {
          return false;
        }
      })
      .run();
    onClose();
  };

  const insertGlyph = (sel: IconSel) => {
    // insert a clickable icon node at the block start (click it later to swap)
    editor
      .chain()
      .focus()
      .setTextSelection(pos + 1)
      .insertIcon(sel)
      .run();
    onClose();
  };

  const copyBlock = () => {
    const n = editor.state.doc.nodeAt(pos);
    if (n) void navigator.clipboard?.writeText(n.textContent);
    onClose();
  };
  const duplicateBlock = () => {
    const n = editor.state.doc.nodeAt(pos);
    if (n)
      editor
        .chain()
        .focus()
        .insertContentAt(pos + n.nodeSize, n.toJSON())
        .run();
    onClose();
  };
  const deleteBlock = () => {
    const n = editor.state.doc.nodeAt(pos);
    if (n)
      editor
        .chain()
        .focus()
        .deleteRange({ from: pos, to: pos + n.nodeSize })
        .run();
    onClose();
  };
  const askAI = () => {
    // hand off to the host → it selects the block's text and shows the AI menu
    if (onAskAI) onAskAI(pos);
    else {
      const r = blockRange();
      if (r) editor.chain().focus().setTextSelection(r).run();
    }
    onClose();
  };

  // ── action rows (filtered by the search box) ──────────────────────────────
  const q = query.trim().toLowerCase();
  const show = (label: string) => !q || label.toLowerCase().includes(q);

  // position: flip above when near the viewport bottom, clamp on-screen, using
  // the menu's REAL measured height (re-places when the search filter changes it)
  const W = 248;
  const menuPos = useFlipPosition(
    true,
    () => ({ left: anchor.x, top: anchor.top, bottom: anchor.bottom }),
    ref,
    { prefer: "below", gap: 6 }
  );

  const row =
    "flex w-full items-center gap-2.5 rounded-lg px-2 py-[7px] text-left text-[13px] text-text transition-colors hover:bg-[var(--hover-overlay)]";
  const sep = "my-1.5 border-t border-border";

  return createPortal(
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: menuPos?.x ?? anchor.x,
        top: menuPos?.y ?? anchor.top,
        opacity: menuPos ? 1 : 0,
        width: W,
        zIndex: 9000,
      }}
      className="rounded-xl border border-border bg-elevated p-1.5 shadow-lg"
    >
      {/* search */}
      <div className="mb-1 flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5">
        <Search size={13} className="text-text-faint" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search actions..."
          className="w-full bg-transparent text-[12.5px] text-text outline-none placeholder:text-text-faint"
        />
      </div>

      <p className="px-2 py-1 text-[11px] font-medium tracking-wide text-text-faint">
        {blockLabel}
      </p>

      {/* group 1 — turn into / color / edit icon */}
      {show("Turn into") && (
        <button
          className={row + " justify-between"}
          onMouseEnter={() => setFlyout("turn")}
          onClick={() => setFlyout(flyout === "turn" ? null : "turn")}
        >
          <span className="flex items-center gap-2.5">
            <Repeat2 size={15} className="text-text-muted" /> Turn into
          </span>
          <ChevronRight size={14} className="text-text-faint" />
        </button>
      )}
      {show("Color") && (
        <button
          className={row + " justify-between"}
          onMouseEnter={() => setFlyout("color")}
          onClick={() => setFlyout(flyout === "color" ? null : "color")}
        >
          <span className="flex items-center gap-2.5">
            <Paintbrush size={15} className="text-text-muted" /> Color
          </span>
          <ChevronRight size={14} className="text-text-faint" />
        </button>
      )}
      {show("Edit icon") && (
        <button
          className={row}
          onMouseEnter={() => setFlyout("icon")}
          onClick={() => setFlyout(flyout === "icon" ? null : "icon")}
        >
          <Smile size={15} className="text-text-muted" /> Edit icon
        </button>
      )}

      <div className={sep} />

      {/* group 2 — copy / duplicate / delete */}
      {show("Copy") && (
        <button className={row} onClick={copyBlock}>
          <CopyIcon size={15} className="text-text-muted" /> Copy
        </button>
      )}
      {show("Duplicate") && (
        <button className={row} onClick={duplicateBlock}>
          <CopyPlus size={15} className="text-text-muted" /> Duplicate
        </button>
      )}
      {show("Delete") && (
        <button className={row + " hover:text-[var(--warning)]"} onClick={deleteBlock}>
          <Trash2 size={15} className="text-text-muted group-hover:text-[var(--warning)]" /> Delete
        </button>
      )}

      <div className={sep} />

      {/* group 3 — ask ai */}
      {show("Ask AI") && (
        <button
          className={row + " text-[var(--alltra-brand)]"}
          onClick={askAI}
        >
          <Sparkles size={15} /> Ask AI
        </button>
      )}

      {/* ── fly-outs ──────────────────────────────────────────────────────── */}
      {flyout === "turn" && (
        <Flyout onClose={() => setFlyout(null)} anchorRef={ref}>
          {TURN_INTO.map((t) => {
            const Icon = t.icon;
            const active = turnActive(editor, t.id);
            return (
              <button key={t.id} className={row + " justify-between"} onClick={() => runTurnInto(t.id)}>
                <span className="flex items-center gap-2.5">
                  <Icon size={15} className="text-text-muted" /> {t.label}
                </span>
                {active && <span className="text-[12px] text-text-muted">✓</span>}
              </button>
            );
          })}
        </Flyout>
      )}

      {flyout === "color" && (
        <Flyout onClose={() => setFlyout(null)} anchorRef={ref} wide>
          <p className="px-2 py-1 text-[11px] font-medium tracking-wide text-text-faint">
            Text color
          </p>
          {TEXT_COLORS.map((c) => (
            <button key={c.name} className={row} onClick={() => applyTextColor(c.value)}>
              <span
                className="grid h-[18px] w-[18px] place-items-center rounded border border-border text-[12px] font-semibold"
                style={{ color: c.value ?? "var(--text-primary)" }}
              >
                A
              </span>
              {c.name} text
            </button>
          ))}
          <div className={sep} />
          <p className="px-2 py-1 text-[11px] font-medium tracking-wide text-text-faint">
            Background
          </p>
          {BG_COLORS.map((c) => (
            <button key={c.name} className={row} onClick={() => applyBgColor(c.value)}>
              <span
                className="h-[18px] w-[18px] rounded border border-border"
                style={{ background: c.value ?? "transparent" }}
              />
              {c.name} background
            </button>
          ))}
        </Flyout>
      )}

      {flyout === "icon" && (
        <Flyout onClose={() => setFlyout(null)} anchorRef={ref} wide>
          <EmojiIconPicker onPick={insertGlyph} />
        </Flyout>
      )}
    </div>,
    document.body
  );
}

/* Whether a turn-into option is the block's current type. Uses editor.isActive
 * (which walks the ancestor chain) so list containers + the checklist/to-do
 * variant distinction resolve correctly. */
function turnActive(editor: Editor, id: string): boolean {
  switch (id) {
    case "text":
      return editor.isActive("paragraph");
    case "heading-1":
      return editor.isActive("heading", { level: 1 });
    case "heading-2":
      return editor.isActive("heading", { level: 2 });
    case "heading-3":
      return editor.isActive("heading", { level: 3 });
    case "bullet-list":
      return editor.isActive("bulletList");
    case "numbered-list":
      return editor.isActive("orderedList");
    case "checklist":
      return editor.isActive("taskList", { variant: "checklist" });
    case "todo-list":
      return (
        editor.isActive("taskList") &&
        !editor.isActive("taskList", { variant: "checklist" })
      );
    case "toggle-list":
      return editor.isActive("toggle");
    case "quote":
      return editor.isActive("blockquote");
    case "code-block":
      return editor.isActive("codeBlock");
    case "callout":
      return editor.isActive("callout");
    default:
      return false;
  }
}

/* ── side fly-out panel ──────────────────────────────────────────────────── */
function Flyout({
  children,
  anchorRef,
  wide,
}: {
  children: ReactNode;
  onClose?: () => void;
  anchorRef: RefObject<HTMLDivElement | null>;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    const place = () => {
      const a = anchorRef.current?.getBoundingClientRect();
      const el = ref.current;
      if (!a || !el) return;
      const r = el.getBoundingClientRect();
      setPos(placeSide(a, r.width, r.height, { gap: 4 }));
    };
    place();
    const ro = new ResizeObserver(place);
    if (ref.current) ro.observe(ref.current);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchorRef]);
  return (
    <div
      ref={ref}
      className="hide-scrollbar rounded-xl border border-border bg-elevated p-1.5 shadow-lg"
      style={{
        position: "fixed",
        left: pos?.x ?? 0,
        top: pos?.y ?? 0,
        opacity: pos ? 1 : 0,
        pointerEvents: pos ? "auto" : "none",
        width: wide ? 220 : 196,
        maxHeight: "min(420px, 80vh)",
        overflowY: "auto",
        zIndex: 9001,
      }}
    >
      {children}
    </div>
  );
}

/* ── emoji / icon picker ─────────────────────────────────────────────────── */
export default BlockMenu;
