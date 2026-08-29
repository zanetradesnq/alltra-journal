/**
 * Floating toolbar for content tables. Appears centered just above the table
 * whenever the caret is inside one, and drives TipTap's table commands so the
 * grid can actually grow and shrink — add / delete a row or column, or drop the
 * whole table. Portaled to <body>; repositions on edits, scroll and resize.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { Plus, Minus, Trash2 } from "lucide-react";
import { placePopover } from "../lib/popover";

export function TableMenu({ editor }: { editor: Editor | null }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      if (!editor.isEditable || !editor.isActive("table")) {
        setPos(null);
        return;
      }
      try {
        const { from } = editor.state.selection;
        const at = editor.view.domAtPos(from).node as Node;
        const start =
          at.nodeType === 1 ? (at as HTMLElement) : at.parentElement;
        const table = start?.closest("table");
        // offsetParent is null when the editor view is display:none (the user
        // navigated to Calendar/Notes/Reports while the caret sat in a table) —
        // don't strand the toolbar over a hidden editor.
        if (!table || !(table as HTMLElement).offsetParent) {
          setPos(null);
          return;
        }
        const r = table.getBoundingClientRect();
        // sit above the table (flip below if it's scrolled past the top chrome),
        // centered on it, clamped on-screen — measured toolbar size
        const w = popRef.current?.offsetWidth ?? 220;
        const h = popRef.current?.offsetHeight ?? 34;
        setPos(placePopover(r, w, h, { prefer: "above", align: "center", gap: 8 }));
      } catch {
        setPos(null);
      }
    };
    update();
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [editor]);

  if (!pos || !editor) return null;

  const iconBtn = (
    icon: React.ReactNode,
    title: string,
    fn: () => void,
    danger = false
  ) => (
    <button
      title={title}
      aria-label={title}
      // mousedown only holds the caret in the cell; click executes (fires for
      // keyboard too — each command re-focuses the editor).
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => fn()}
      className={
        "grid h-6 w-6 place-items-center rounded-md text-text-muted transition-colors " +
        (danger
          ? "hover:bg-[var(--warning-bg)] hover:text-[var(--warning)]"
          : "hover:bg-[var(--hover-overlay)] hover:text-text")
      }
    >
      {icon}
    </button>
  );

  const label = (t: string) => (
    <span className="px-1 text-[11px] font-medium text-text-faint">{t}</span>
  );
  const divider = <span className="mx-0.5 h-4 w-px bg-border" />;

  return createPortal(
    <div
      ref={popRef}
      style={{
        position: "fixed",
        top: pos.y,
        left: pos.x,
        zIndex: 500,
        fontFamily: "var(--font-geist-sans)",
      }}
      className="flex items-center gap-0.5 rounded-lg border border-border bg-elevated p-1 shadow-lg"
    >
      {label("Row")}
      {iconBtn(<Minus size={14} />, "Delete row", () =>
        editor.chain().focus().deleteRow().run()
      )}
      {iconBtn(<Plus size={14} />, "Add row below", () =>
        editor.chain().focus().addRowAfter().run()
      )}
      {divider}
      {label("Col")}
      {iconBtn(<Minus size={14} />, "Delete column", () =>
        editor.chain().focus().deleteColumn().run()
      )}
      {iconBtn(<Plus size={14} />, "Add column right", () =>
        editor.chain().focus().addColumnAfter().run()
      )}
      {divider}
      {iconBtn(
        <Trash2 size={14} />,
        "Delete table",
        () => editor.chain().focus().deleteTable().run(),
        true
      )}
    </div>,
    document.body
  );
}

