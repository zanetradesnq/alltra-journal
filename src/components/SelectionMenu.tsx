/**
 * Selection-only AI menu — the floating popup that follows a non-empty text
 * selection (Actions: translate / copy / search · Rewrite via AI). Shared by the
 * journal editor and the Notes editor. `zIndex` lets a caller stack it above a
 * modal (the Notes composer) when needed.
 */
import { useRef } from "react";
import type { ReactNode, MouseEvent as ReactMouseEvent } from "react";
import { Languages, Copy, Globe, SpellCheck, RefreshCw, Zap } from "lucide-react";
import type { AiAction } from "../ai/rewrite";
import { useFlipPosition } from "../lib/popover";

export type MenuState = { x: number; y: number; text: string } | null;

export function SelectionMenu({
  menu,
  onAI,
  onClose,
  zIndex = 300,
}: {
  menu: MenuState;
  onAI: (action: AiAction) => void;
  onClose: () => void;
  zIndex?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // open above the selection; flip below only when there's no room above; center
  const pos = useFlipPosition(
    !!menu,
    () => (menu ? { left: menu.x, top: menu.y } : null),
    ref,
    { prefer: "above", align: "center", gap: 8 }
  );
  if (!menu) return null;

  const run = (fn: () => void) => (e: ReactMouseEvent) => {
    e.preventDefault();
    fn();
    onClose();
  };

  const item = (icon: ReactNode, label: ReactNode, fn: () => void) => (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={run(fn)}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-left text-[13px] text-text transition-colors hover:bg-card-hover"
    >
      <span className="text-text-muted">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );

  const snippet =
    menu.text.length > 16 ? menu.text.slice(0, 16) + "…" : menu.text;

  return (
    <div
      ref={ref}
      style={{
        left: pos?.x ?? menu.x,
        top: pos?.y ?? menu.y,
        opacity: pos ? 1 : 0,
        pointerEvents: pos ? "auto" : "none",
        zIndex,
      }}
      className="fixed w-[252px] rounded-2xl border border-border bg-elevated p-1.5 shadow-lg"
      onMouseDown={(e) => e.preventDefault()}
    >
      <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold tracking-tight text-text-faint">
        Actions
      </p>
      {item(<Languages size={15} />, "Translate it", () => onAI("translate"))}
      {item(<Copy size={15} />, "Copy the text", () =>
        navigator.clipboard?.writeText(menu.text)
      )}
      {item(
        <Globe size={15} className="text-[#4285f4]" />,
        <>
          Search Google for{" "}
          <span className="text-text-muted">“{snippet}”</span>
        </>,
        () =>
          window.open(
            "https://www.google.com/search?q=" + encodeURIComponent(menu.text),
            "_blank"
          )
      )}

      <div className="my-1.5 border-t border-border" />

      <div className="flex items-center gap-1.5 px-2.5 pb-1 pt-0.5">
        <span className="text-[11px] font-semibold tracking-tight text-text-faint">
          Rewrite
        </span>
        <span className="rounded-md bg-accent-soft px-1.5 py-px text-[9px] font-semibold text-text-muted">
          AI
        </span>
      </div>
      {item(<SpellCheck size={15} />, "Fix Grammar", () => onAI("grammar"))}
      {item(<RefreshCw size={15} />, "Rewrite in Positive tone", () =>
        onAI("positive")
      )}
      {item(<Zap size={15} />, "Make it punchier", () => onAI("punchier"))}
    </div>
  );
}

