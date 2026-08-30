/**
 * Icon — an inline atom holding either an emoji/symbol glyph OR a lucide icon
 * inside a soft colored box (Alltra-style badge). Inserted from the block menu's
 * "Edit icon" / the /emoji command. Clicking it opens the picker to swap. Atom,
 * so the caret flows around it.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { EmojiIconPicker, type IconSel } from "../components/EmojiIconPicker";
import { ICON_SET, iconColor } from "../iconSet";
import { useFlipPosition } from "../lib/popover";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    iconNode: {
      insertIcon: (sel?: IconSel) => ReturnType;
    };
  }
}

function IconView({ node, updateAttributes, editor, deleteNode }: NodeViewProps) {
  const glyph = (node.attrs.glyph as string) || "";
  const iconName = (node.attrs.iconName as string | null) || null;
  const colorKey = (node.attrs.color as string | null) || null;
  const isEmpty = !glyph && !iconName;
  const [open, setOpen] = useState(false);
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

  // inserted empty (the /emoji command) → pop the picker open so you choose
  useEffect(() => {
    if (isEmpty && !autoOpened.current) {
      autoOpened.current = true;
      openPicker();
    }
  }, [isEmpty]);

  // Dismissing without choosing removes the unfilled icon (so a lingering empty
  // node can't re-pop its picker and trap focus) and hands focus back to the doc.
  const emptyRef = useRef(true);
  emptyRef.current = isEmpty;
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
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const Lucide = iconName ? ICON_SET[iconName] : null;
  const col = iconColor(colorKey);

  let content;
  if (Lucide) {
    content = (
      <span
        className="jicon-box"
        style={{ background: col.bg, color: col.fg }}
      >
        <Lucide size="0.9em" />
      </span>
    );
  } else if (glyph) {
    content = glyph;
  } else {
    content = "🙂"; // placeholder until picked
  }

  return (
    <NodeViewWrapper
      as="span"
      ref={ref}
      className="jicon"
      contentEditable={false}
      title="Click to swap"
      onClick={openPicker}
    >
      {content}
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
              width: 248,
            }}
            className="rounded-xl border border-border bg-elevated p-2.5 shadow-lg"
          >
            <EmojiIconPicker
              onPick={(sel) => {
                updateAttributes({
                  glyph: sel.glyph ?? "",
                  iconName: sel.icon ?? null,
                  color: sel.color ?? null,
                });
                setOpen(false);
                editor.commands.focus();
              }}
            />
          </div>,
          document.body
        )}
    </NodeViewWrapper>
  );
}

export const IconNode = Node.create({
  name: "icon",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      glyph: {
        default: "",
        // fall back to textContent for older emoji-icon nodes (no data-glyph)
        parseHTML: (el) =>
          el.getAttribute("data-glyph") ||
          (el.getAttribute("data-icon") ? "" : el.textContent || ""),
        renderHTML: (attrs) => (attrs.glyph ? { "data-glyph": attrs.glyph } : {}),
      },
      iconName: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-icon") || null,
        renderHTML: (attrs) =>
          attrs.iconName ? { "data-icon": attrs.iconName } : {},
      },
      color: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-color") || null,
        renderHTML: (attrs) => (attrs.color ? { "data-color": attrs.color } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="icon"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    // serialize the visible glyph (emoji) as text; boxed icons are restored from
    // data-icon / data-color via the node view
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-type": "icon", class: "jicon" }),
      (node.attrs.glyph as string) || "",
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(IconView);
  },

  addCommands() {
    return {
      insertIcon:
        (sel = {}) =>
        ({ chain }) =>
          chain()
            .insertContent([
              {
                type: this.name,
                attrs: {
                  glyph: sel.glyph ?? "",
                  iconName: sel.icon ?? null,
                  color: sel.color ?? null,
                },
              },
              { type: "text", text: " " },
            ])
            .run(),
    };
  },
});
