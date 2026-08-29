/**
 * EditorContextMenu — the Notion/Docs-grade RIGHT-CLICK command surface for the
 * journal editor, ported from the Alltra desktop app's EditorContextMenu. A
 * `contextmenu` listener kills the native menu and opens a point-anchored nested
 * menu with selection-aware items + flyout submenus (Format / Turn into / colour /
 * Align / Insert). Every action reuses the SAME editor commands the toolbar and
 * "/" menu use — no forked logic. With no selection the caret is first dropped at
 * the click so block actions target the clicked block.
 *
 * Icons are the desktop set: stroke at rest, SOLID when the format/block is active
 * (menuIcons' dual glyphs). Styling rides the journal's own tokens so it matches
 * the rounded paper editor in both light and dark.
 */
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/core";
import { ChevronRight } from "lucide-react";
import { placePopover, placeSide } from "../lib/popover";
import { ACCENT_PALETTE, washOf } from "../editorColors";
import {
  MenuBold,
  MenuItalic,
  MenuUnderline,
  MenuStrike,
  MenuParagraph,
  MenuHeading1,
  MenuHeading2,
  MenuHeading3,
  MenuBulleted,
  MenuNumbered,
  MenuChecklist,
  MenuQuote,
  MenuCode,
  MenuCallout,
  MenuToggle,
  MenuAlignLeft,
  MenuAlignCenter,
  MenuAlignRight,
  MenuLink,
  MenuClear,
  MenuCopy,
  MenuPaste,
  MenuDelete,
  MenuAdd,
  MenuImage,
  MenuDivider,
  MenuTag,
  MenuDate,
  MenuTextColor,
  MenuHighlight,
  MenuBadge,
  MenuRemove,
  type MenuIcon,
} from "../menuIcons";

/* ── platform-aware shortcut hints ──────────────────────────────────────────── */
const IS_MAC =
  typeof navigator !== "undefined" && /Mac|iP(hone|ad|od)/.test(navigator.platform || navigator.userAgent);
const MOD = IS_MAC ? "⌘" : "Ctrl";
const SHIFT = IS_MAC ? "⇧" : "Shift";
const ALT = IS_MAC ? "⌥" : "Alt";
const sc = (...parts: string[]): string => parts.join(IS_MAC ? "" : "+");

/* ── nested-menu primitives ─────────────────────────────────────────────────── */

interface MenuCtx {
  openId: string | null;
  setOpenId: (id: string | null) => void;
  close: () => void;
}
const Ctx = createContext<MenuCtx>({ openId: null, setOpenId: () => {}, close: () => {} });
const useMenu = (): MenuCtx => useContext(Ctx);

/** The floating menu surface (root or submenu panel). */
function MenuSurface({
  style,
  panelRef,
  onMouseEnter,
  children,
}: {
  style: CSSProperties;
  panelRef?: (el: HTMLDivElement | null) => void;
  onMouseEnter?: () => void;
  children: ReactNode;
}) {
  return (
    <div
      ref={panelRef}
      data-ctx-menu
      className="ctx-menu"
      style={style}
      onMouseEnter={onMouseEnter}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  active,
  shortcut,
  destructive,
  disabled,
  children,
  onSelect,
}: {
  icon?: MenuIcon;
  active?: boolean;
  shortcut?: string;
  destructive?: boolean;
  disabled?: boolean;
  children: ReactNode;
  onSelect: () => void;
}) {
  const { setOpenId, close } = useMenu();
  return (
    <button
      type="button"
      className={"ctx-row" + (destructive ? " ctx-row--danger" : "")}
      data-active={active ? "true" : undefined}
      disabled={disabled}
      onMouseEnter={() => setOpenId(null)}
      onClick={() => {
        if (disabled) return;
        onSelect();
        close();
      }}
    >
      {Icon !== undefined && (
        <span className="ctx-ico">
          <Icon size={16} active={active} />
        </span>
      )}
      <span className="ctx-label">{children}</span>
      {shortcut !== undefined && <span className="ctx-shortcut">{shortcut}</span>}
    </button>
  );
}

/** A colour-swatch item (the accent picker rows). */
function SwatchItem({ hex, onSelect, children }: { hex: string; onSelect: () => void; children: ReactNode }) {
  const { setOpenId, close } = useMenu();
  return (
    <button
      type="button"
      className="ctx-row"
      onMouseEnter={() => setOpenId(null)}
      onClick={() => {
        onSelect();
        close();
      }}
    >
      <span className="ctx-swatch" style={{ background: hex }} aria-hidden="true" />
      <span className="ctx-label">{children}</span>
    </button>
  );
}

function MenuSep() {
  return <div className="ctx-sep" role="separator" />;
}

function MenuSubmenu({
  id,
  icon: Icon,
  label,
  children,
}: {
  id: string;
  icon: MenuIcon;
  label: string;
  children: ReactNode;
}) {
  const { openId, setOpenId } = useMenu();
  const open = openId === id;
  const rowRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    let raf = 0;
    const place = () => {
      const row = rowRef.current;
      const panel = panelRef.current;
      if (!row || !panel) {
        raf = requestAnimationFrame(place);
        return;
      }
      const r = panel.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) {
        raf = requestAnimationFrame(place);
        return;
      }
      const rr = row.getBoundingClientRect();
      const next = placeSide({ left: rr.left, top: rr.top - 5, right: rr.right }, r.width, r.height);
      setPos((prev) => (prev && prev.x === next.x && prev.y === next.y ? prev : next));
    };
    place();
    return () => cancelAnimationFrame(raf);
  }, [open]);

  return (
    <>
      <button
        type="button"
        ref={rowRef}
        className="ctx-row"
        data-open={open ? "true" : undefined}
        onMouseEnter={() => setOpenId(id)}
      >
        <span className="ctx-ico">
          <Icon size={16} />
        </span>
        <span className="ctx-label">{label}</span>
        <ChevronRight size={14} className="ctx-chevron" />
      </button>
      {open &&
        createPortal(
          <MenuSurface
            panelRef={(el) => (panelRef.current = el)}
            onMouseEnter={() => setOpenId(id)}
            style={{
              left: pos?.x ?? -9999,
              top: pos?.y ?? -9999,
              visibility: pos ? "visible" : "hidden",
            }}
          >
            {children}
          </MenuSurface>,
          document.body,
        )}
    </>
  );
}

/* ── block transforms + alignments (reuse the toolbar commands) ─────────────── */
interface BlockTransform {
  label: string;
  icon: MenuIcon;
  isActive: (e: Editor) => boolean;
  run: (e: Editor) => void;
  shortcut?: string;
}
const checklistRun = (e: Editor): void => {
  if (e.isActive("taskList")) {
    e.chain().focus().toggleTaskList().run();
    return;
  }
  e.chain().focus().toggleTaskList().setChecklistVariant().run();
};
const BLOCK_TRANSFORMS: readonly BlockTransform[] = [
  { label: "Paragraph", icon: MenuParagraph, isActive: (e) => e.isActive("paragraph"), run: (e) => e.chain().focus().setParagraph().run() },
  { label: "Heading 1", icon: MenuHeading1, isActive: (e) => e.isActive("heading", { level: 1 }), run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: "Heading 2", icon: MenuHeading2, isActive: (e) => e.isActive("heading", { level: 2 }), run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: "Heading 3", icon: MenuHeading3, isActive: (e) => e.isActive("heading", { level: 3 }), run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: "Bulleted list", icon: MenuBulleted, isActive: (e) => e.isActive("bulletList"), run: (e) => e.chain().focus().toggleBulletList().run(), shortcut: sc(MOD, SHIFT, "8") },
  { label: "Numbered list", icon: MenuNumbered, isActive: (e) => e.isActive("orderedList"), run: (e) => e.chain().focus().toggleOrderedList().run(), shortcut: sc(MOD, SHIFT, "7") },
  { label: "Checklist", icon: MenuChecklist, isActive: (e) => e.isActive("taskList"), run: checklistRun, shortcut: sc(MOD, SHIFT, "9") },
  { label: "Quote", icon: MenuQuote, isActive: (e) => e.isActive("blockquote"), run: (e) => e.chain().focus().toggleBlockquote().run(), shortcut: sc(MOD, SHIFT, "B") },
  { label: "Code block", icon: MenuCode, isActive: (e) => e.isActive("codeBlock"), run: (e) => e.chain().focus().toggleCodeBlock().run(), shortcut: sc(MOD, ALT, "C") },
  { label: "Callout", icon: MenuCallout, isActive: (e) => e.isActive("callout"), run: (e) => e.chain().focus().insertCallout().run() },
  { label: "Toggle", icon: MenuToggle, isActive: () => false, run: (e) => e.chain().focus().insertToggle().run() },
];
const ALIGNMENTS = [
  { label: "Left", icon: MenuAlignLeft, value: "left" as const, shortcut: sc(MOD, SHIFT, "L") },
  { label: "Center", icon: MenuAlignCenter, value: "center" as const, shortcut: sc(MOD, SHIFT, "E") },
  { label: "Right", icon: MenuAlignRight, value: "right" as const, shortcut: sc(MOD, SHIFT, "R") },
];

interface MenuState {
  x: number;
  y: number;
  hasSelection: boolean;
}

export function EditorContextMenu({ editor }: { editor: Editor | null }) {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  // Attach the contextmenu listener to the editor DOM.
  useEffect(() => {
    if (editor === null) return undefined;
    const dom = editor.view.dom as HTMLElement;
    const onContextMenu = (event: MouseEvent): void => {
      if (!editor.isEditable) return;
      event.preventDefault();
      const x = event.clientX;
      const y = event.clientY;
      const hadSelection = !editor.state.selection.empty;
      if (!hadSelection) {
        const hit = editor.view.posAtCoords({ left: x, top: y });
        if (hit !== null) editor.chain().setTextSelection(hit.pos).run();
      }
      setOpenId(null);
      setMenu({ x, y, hasSelection: hadSelection });
    };
    dom.addEventListener("contextmenu", onContextMenu);
    return () => {
      dom.removeEventListener("contextmenu", onContextMenu);
      setMenu(null);
    };
  }, [editor]);

  const close = (): void => {
    setMenu(null);
    setOpenId(null);
  };

  // Place the root menu at the click, flipped + clamped on screen.
  useLayoutEffect(() => {
    if (menu === null) {
      setPos(null);
      return;
    }
    let raf = 0;
    const place = () => {
      const el = rootRef.current;
      if (!el) {
        raf = requestAnimationFrame(place);
        return;
      }
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) {
        raf = requestAnimationFrame(place);
        return;
      }
      setPos(placePopover({ left: menu.x, top: menu.y }, r.width, r.height, { prefer: "below", align: "left", gap: 2 }));
    };
    place();
    return () => cancelAnimationFrame(raf);
  }, [menu]);

  // Outside-click + Escape close (checks every [data-ctx-menu] surface, incl. submenus).
  useEffect(() => {
    if (menu === null) return undefined;
    const onDown = (e: MouseEvent): void => {
      const t = e.target as Node;
      const inMenu = Array.from(document.querySelectorAll("[data-ctx-menu]")).some((n) => n.contains(t));
      if (!inMenu) close();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu]);

  if (editor === null) return null;
  const ed = editor;

  /* ── command helpers ──────────────────────────────────────────────────────── */
  const currentAlign = ALIGNMENTS.find((a) => ed.isActive({ textAlign: a.value }))?.value ?? "left";
  const linkLabel = ed.isActive("link") ? "Edit link" : "Insert link";

  const insertLink = (): void => {
    const prev = (ed.getAttributes("link").href as string | undefined) ?? "";
    const url = window.prompt("Link URL", prev);
    if (url === null) return;
    if (url === "") {
      ed.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    ed.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };
  const insertDate = (): void => {
    ed.chain().focus().insertContent(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })).run();
  };
  const openImage = (): void => fileInputRef.current?.click();
  const onImagePicked = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file === undefined || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") ed.chain().focus().setImage({ src: reader.result }).run();
    };
    reader.readAsDataURL(file);
  };

  const duplicateBlock = (): void => {
    const { $from } = ed.state.selection;
    if ($from.depth < 1) return;
    const json = $from.node(1).toJSON();
    ed.chain().focus().insertContentAt($from.after(1), json).run();
  };
  const deleteBlock = (): void => {
    const { $from } = ed.state.selection;
    if ($from.depth < 1) return;
    if (ed.state.doc.childCount <= 1) ed.chain().focus().clearContent().run();
    else ed.chain().focus().deleteRange({ from: $from.before(1), to: $from.after(1) }).run();
  };
  const copySelection = (): void => {
    ed.commands.focus();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    if (!ok && typeof navigator !== "undefined" && navigator.clipboard !== undefined) {
      const { from, to } = ed.state.selection;
      void navigator.clipboard.writeText(ed.state.doc.textBetween(from, to, "\n"));
    }
  };
  const pasteHere = (): void => {
    if (typeof navigator === "undefined" || navigator.clipboard === undefined) return;
    void navigator.clipboard
      .readText()
      .then((text) => {
        if (text !== "") ed.chain().focus().insertContent(text).run();
      })
      .catch(() => {});
  };

  /* ── colour submenus (Text / Highlight / Badge share the accent palette) ────── */
  const colorSubmenu = (
    id: string,
    label: string,
    icon: MenuIcon,
    apply: (hex: string) => void,
    remove: () => void,
  ): ReactNode => (
    <MenuSubmenu id={id} icon={icon} label={label}>
      {ACCENT_PALETTE.map((c) => (
        <SwatchItem key={c.id} hex={c.hex} onSelect={() => apply(c.hex)}>
          {c.name}
        </SwatchItem>
      ))}
      <MenuSep />
      <MenuItem icon={MenuRemove} onSelect={remove}>
        Remove
      </MenuItem>
    </MenuSubmenu>
  );

  const formatSubmenu = (
    <MenuSubmenu id="format" icon={MenuBold} label="Format">
      <MenuItem icon={MenuBold} active={ed.isActive("bold")} shortcut={sc(MOD, "B")} onSelect={() => ed.chain().focus().toggleBold().run()}>
        Bold
      </MenuItem>
      <MenuItem icon={MenuItalic} active={ed.isActive("italic")} shortcut={sc(MOD, "I")} onSelect={() => ed.chain().focus().toggleItalic().run()}>
        Italic
      </MenuItem>
      <MenuItem icon={MenuUnderline} active={ed.isActive("underline")} shortcut={sc(MOD, "U")} onSelect={() => ed.chain().focus().toggleUnderline().run()}>
        Underline
      </MenuItem>
      <MenuItem icon={MenuStrike} active={ed.isActive("strike")} shortcut={sc(MOD, SHIFT, "S")} onSelect={() => ed.chain().focus().toggleStrike().run()}>
        Strikethrough
      </MenuItem>
    </MenuSubmenu>
  );
  const turnIntoSubmenu = (
    <MenuSubmenu id="turn" icon={MenuParagraph} label="Turn into">
      {BLOCK_TRANSFORMS.map((t) => (
        <MenuItem key={t.label} icon={t.icon} active={t.isActive(ed)} shortcut={t.shortcut} onSelect={() => t.run(ed)}>
          {t.label}
        </MenuItem>
      ))}
    </MenuSubmenu>
  );
  const alignSubmenu = (
    <MenuSubmenu id="align" icon={MenuAlignLeft} label="Align">
      {ALIGNMENTS.map((a) => (
        <MenuItem key={a.value} icon={a.icon} active={currentAlign === a.value} shortcut={a.shortcut} onSelect={() => ed.chain().focus().setTextAlign(a.value).run()}>
          {a.label}
        </MenuItem>
      ))}
    </MenuSubmenu>
  );
  const insertSubmenu = (
    <MenuSubmenu id="insert" icon={MenuAdd} label="Insert">
      <MenuItem icon={MenuLink} shortcut={sc(MOD, "K")} onSelect={insertLink}>
        Link
      </MenuItem>
      <MenuItem icon={MenuImage} onSelect={openImage}>
        Image
      </MenuItem>
      <MenuItem icon={MenuDivider} onSelect={() => ed.chain().focus().setHorizontalRule().run()}>
        Divider
      </MenuItem>
      <MenuItem icon={MenuTag} onSelect={() => ed.chain().focus().insertTag().run()}>
        Tag
      </MenuItem>
      <MenuItem icon={MenuDate} onSelect={insertDate}>
        Date
      </MenuItem>
    </MenuSubmenu>
  );
  const deleteItem = (
    <MenuItem icon={MenuDelete} destructive onSelect={deleteBlock}>
      Delete
    </MenuItem>
  );

  return (
    <>
      {menu !== null &&
        createPortal(
          <Ctx.Provider value={{ openId, setOpenId, close }}>
            <MenuSurface
              panelRef={(el) => (rootRef.current = el)}
              style={{ left: pos?.x ?? menu.x, top: pos?.y ?? menu.y, visibility: pos ? "visible" : "hidden" }}
            >
              {menu.hasSelection ? (
                <>
                  {formatSubmenu}
                  {turnIntoSubmenu}
                  {colorSubmenu("textcolor", "Text color", MenuTextColor, (hex) => ed.chain().focus().setTextColor(hex).run(), () => ed.chain().focus().unsetTextColor().run())}
                  {colorSubmenu("highlight", "Highlight", MenuHighlight, (hex) => ed.chain().focus().unsetBadge().setBgColor(washOf(hex)).run(), () => ed.chain().focus().unsetBgColor().run())}
                  {colorSubmenu("badge", "Badge", MenuBadge, (hex) => ed.chain().focus().unsetBgColor().setBadge(hex).run(), () => ed.chain().focus().unsetBadge().run())}
                  {alignSubmenu}
                  <MenuSep />
                  <MenuItem icon={MenuLink} shortcut={sc(MOD, "K")} onSelect={insertLink}>
                    {linkLabel}
                  </MenuItem>
                  <MenuItem icon={MenuClear} onSelect={() => ed.chain().focus().unsetAllMarks().clearNodes().run()}>
                    Clear formatting
                  </MenuItem>
                  <MenuItem icon={MenuCopy} shortcut={sc(MOD, "C")} onSelect={copySelection}>
                    Copy
                  </MenuItem>
                  <MenuItem icon={MenuPaste} shortcut={sc(MOD, "V")} onSelect={pasteHere}>
                    Paste
                  </MenuItem>
                  <MenuSep />
                  {deleteItem}
                </>
              ) : (
                <>
                  {insertSubmenu}
                  <MenuSep />
                  {turnIntoSubmenu}
                  {alignSubmenu}
                  <MenuSep />
                  <MenuItem icon={MenuCopy} onSelect={duplicateBlock}>
                    Duplicate
                  </MenuItem>
                  <MenuItem icon={MenuPaste} shortcut={sc(MOD, "V")} onSelect={pasteHere}>
                    Paste
                  </MenuItem>
                  <MenuSep />
                  {deleteItem}
                </>
              )}
            </MenuSurface>
          </Ctx.Provider>,
          document.body,
        )}
      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onImagePicked} />
    </>
  );
}

export default EditorContextMenu;
