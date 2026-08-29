/**
 * EditorColorPills — the Colors section of the editor customization panel
 * (ported from the Alltra desktop EditorCustomizationPanel): three stadium
 * pills (Text / Highlight / Badge), each opening a grid of the 15 Interface
 * accents + "Remove color". Applies to the editor's current selection via the
 * same commands the right-click menu uses (setTextColor / setBgColor / setBadge),
 * so Highlight is a low-alpha wash and Badge a solid fill (mutually exclusive).
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Ban } from "lucide-react";
import type { Editor } from "@tiptap/core";
import { useFlipPosition } from "../lib/popover";
import { ACCENT_PALETTE, washOf } from "../editorColors";

type Role = "text" | "highlight" | "badge";

const ROLES: readonly { role: Role; label: string }[] = [
  { role: "text", label: "Text" },
  { role: "highlight", label: "Highlight" },
  { role: "badge", label: "Badge" },
];

/** The colour currently applied to the selection for this role (for the pill's dot), or null. */
function currentColor(editor: Editor | null, role: Role): string | null {
  if (editor === null) return null;
  const mark = role === "text" ? "textStyle" : role === "highlight" ? "bgColor" : "badge";
  const value = editor.getAttributes(mark).color;
  return typeof value === "string" && value !== "" ? value : null;
}

function applyColor(editor: Editor, role: Role, hex: string): void {
  if (role === "text") editor.chain().focus().setTextColor(hex).run();
  else if (role === "highlight") editor.chain().focus().unsetBadge().setBgColor(washOf(hex)).run();
  else editor.chain().focus().unsetBgColor().setBadge(hex).run();
}
function removeColor(editor: Editor, role: Role): void {
  if (role === "text") editor.chain().focus().unsetTextColor().run();
  else if (role === "highlight") editor.chain().focus().unsetBgColor().run();
  else editor.chain().focus().unsetBadge().run();
}

function ColorPill({
  role,
  label,
  editor,
  open,
  onToggle,
  onClose,
}: {
  role: Role;
  label: string;
  editor: Editor | null;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const cur = currentColor(editor, role);
  const pos = useFlipPosition(
    open,
    () => {
      const r = btnRef.current?.getBoundingClientRect();
      return r ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom } : null;
    },
    popRef,
    { prefer: "below", align: "left", gap: 6 },
  );

  const apply = (hex: string): void => {
    if (editor) applyColor(editor, role, hex);
    onClose();
  };
  const remove = (): void => {
    if (editor) removeColor(editor, role);
    onClose();
  };

  return (
    <>
      <button ref={btnRef} type="button" className="color-pill" data-color-ui onClick={onToggle}>
        {cur !== null ? (
          <span className="color-pill-dot" style={{ background: cur }} aria-hidden="true" />
        ) : (
          <span className="color-pill-none" aria-hidden="true">
            <Ban size={16} />
          </span>
        )}
        <span className="color-pill-label">{label}</span>
        <ChevronDown size={14} className="color-pill-chev" />
      </button>
      {open &&
        createPortal(
          <div
            ref={popRef}
            data-color-ui
            className="color-pop"
            style={{ left: pos?.x ?? 0, top: pos?.y ?? 0, visibility: pos ? "visible" : "hidden" }}
          >
            <div className="color-grid" role="listbox" aria-label={`${label} colors`}>
              {ACCENT_PALETTE.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="color-swatch"
                  style={{ background: c.hex }}
                  title={c.name}
                  aria-label={c.name}
                  onClick={() => apply(c.hex)}
                />
              ))}
            </div>
            <button type="button" className="color-remove" onClick={remove}>
              <Ban size={15} /> Remove color
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}

export function EditorColorPills({ editor }: { editor: Editor | null }) {
  const [open, setOpen] = useState<Role | null>(null);

  // Outside-click closes the open popover (checks the pills + portalled panels).
  useEffect(() => {
    if (open === null) return undefined;
    const onDown = (e: MouseEvent): void => {
      const t = e.target as Node;
      const inside = Array.from(document.querySelectorAll("[data-color-ui]")).some((n) => n.contains(t));
      if (!inside) setOpen(null);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="flex gap-2.5">
      {ROLES.map(({ role, label }) => (
        <ColorPill
          key={role}
          role={role}
          label={label}
          editor={editor}
          open={open === role}
          onToggle={() => setOpen((o) => (o === role ? null : role))}
          onClose={() => setOpen(null)}
        />
      ))}
    </div>
  );
}

export default EditorColorPills;
