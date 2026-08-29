/**
 * Tag — a small colored inline pill (e.g. "Notes", "Review Doc"). It's an atom
 * node, so the caret flows around it (you can type right after it / add another
 * tag — no getting stuck inside). Click the pill to open a small menu: rename it
 * and pick its background color. Carries its own fixed size so the editor's
 * Size / Line controls don't distort it.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useFlipPosition } from "../lib/popover";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tag: {
      insertTag: (color?: string) => ReturnType;
    };
  }
}

const TAG_COLORS = [
  "green",
  "blue",
  "purple",
  "orange",
  "pink",
  "amber",
] as const;

const SWATCH: Record<string, string> = {
  green: "#1f9d57",
  blue: "#2f6fdb",
  purple: "#8b51e0",
  orange: "#d9730d",
  pink: "#c14c8a",
  amber: "#cf9410",
};

let tagColorIdx = 0;
const nextColor = () => {
  const c = TAG_COLORS[tagColorIdx % TAG_COLORS.length];
  tagColorIdx += 1;
  return c;
};

function TagView({ node, updateAttributes }: NodeViewProps) {
  const name = (node.attrs.name as string) || "Tag";
  const color = (node.attrs.color as string) || "green";
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(name);
  const pillRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  // flip above when near the viewport bottom; clamp on-screen; measured size
  const pos = useFlipPosition(
    open,
    () => {
      const r = pillRef.current?.getBoundingClientRect();
      return r && r.width > 0 ? r : null;
    },
    popRef,
    { prefer: "below", gap: 6 }
  );

  const openMenu = () => {
    setDraft(node.attrs.name as string);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as unknown as HTMLElement;
      if (!popRef.current?.contains(t) && !pillRef.current?.contains(t))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const commitName = () => updateAttributes({ name: draft.trim() || "Tag" });

  return (
    <NodeViewWrapper
      as="span"
      ref={pillRef}
      className="jtag"
      data-color={color}
      contentEditable={false}
      onClick={openMenu}
    >
      {name}
      {open &&
        createPortal(
          <div
            ref={popRef}
            style={{
              position: "fixed",
              left: pos?.x ?? 0,
              top: pos?.y ?? 0,
              opacity: pos ? 1 : 0,
              pointerEvents: pos ? "auto" : "none",
              zIndex: 9000,
              width: 200,
            }}
            className="rounded-xl border border-border bg-elevated p-2.5 shadow-lg"
          >
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  commitName();
                  setOpen(false);
                }
              }}
              placeholder="Tag name"
              className="mb-2.5 w-full rounded-md border border-border bg-card px-2 py-1.5 text-[12.5px] text-text outline-none placeholder:text-text-faint"
            />
            <p className="mb-1.5 px-0.5 text-[10px] font-medium tracking-wide text-text-faint">
              Background color
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  title={c}
                  onClick={() => updateAttributes({ color: c })}
                  className={
                    "h-6 w-6 rounded-full transition-transform hover:scale-110 " +
                    (c === color
                      ? "ring-2 ring-text ring-offset-1 ring-offset-[var(--bg-elevated)]"
                      : "")
                  }
                  style={{ background: SWATCH[c] }}
                />
              ))}
            </div>
          </div>,
          document.body
        )}
    </NodeViewWrapper>
  );
}

export const Tag = Node.create({
  name: "tag",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      name: {
        default: "Tag",
        parseHTML: (el) => el.textContent || "Tag",
        renderHTML: () => ({}),
      },
      color: {
        default: "green",
        parseHTML: (el) => el.getAttribute("data-color") || "green",
        renderHTML: (attrs) => ({ "data-color": attrs.color }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="tag"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-type": "tag", class: "jtag" }),
      (node.attrs.name as string) || "Tag",
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TagView);
  },

  addCommands() {
    return {
      insertTag:
        (color) =>
        ({ chain }) =>
          chain()
            .insertContent([
              {
                type: this.name,
                attrs: { color: color ?? nextColor(), name: "Tag" },
              },
              { type: "text", text: " " },
            ])
            .run(),
    };
  },
});
