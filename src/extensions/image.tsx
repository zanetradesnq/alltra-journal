/**
 * ResizableImage — the stock TipTap Image, upgraded with a React NodeView so
 * images (a) spawn at a sane size instead of their full natural width, (b) can
 * be dragged to resize smoothly (live DOM width during the drag, one committed
 * transaction on release), and (c) are clearly selectable/deletable: click to
 * select (ring + handles), then Backspace/Delete or the corner button removes it.
 */
import { useEffect, useRef } from "react";
import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { Trash2 } from "lucide-react";

const MIN_W = 80; // never smaller than this — "not too small"
const SPAWN_MAX = 440; // default cap so a photo doesn't fill the page

function ImageView({
  node,
  updateAttributes,
  selected,
  editor,
  getPos,
  deleteNode,
}: NodeViewProps) {
  const width = (node.attrs.width as number | null) ?? null;
  const boxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  // teardown for an in-flight resize drag; runs on unmount too, so deleting the
  // image mid-drag doesn't leak the document pointermove/pointerup listeners.
  const cleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanupRef.current?.(), []);

  // First load with no saved width → spawn at min(natural, cap, container).
  const settleSize = () => {
    if (width != null || !imgRef.current) return;
    const natural = imgRef.current.naturalWidth || SPAWN_MAX;
    const container = boxRef.current?.parentElement?.clientWidth ?? 640;
    updateAttributes({ width: Math.round(Math.min(natural, SPAWN_MAX, container)) });
  };
  useEffect(() => {
    if (imgRef.current?.complete) settleSize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = () => {
    const pos = typeof getPos === "function" ? getPos() : null;
    // focus the editor too, else a NodeSelection on a contentEditable=false
    // image never receives the Backspace/Delete keystroke.
    if (typeof pos === "number") editor.chain().focus().setNodeSelection(pos).run();
  };

  const startResize = (e: React.PointerEvent, side: "left" | "right") => {
    e.preventDefault();
    e.stopPropagation();
    select();
    const box = boxRef.current;
    const startX = e.clientX;
    const startW = box?.offsetWidth ?? width ?? SPAWN_MAX;
    const container = box?.parentElement?.clientWidth ?? 9999;
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const next = Math.max(
        MIN_W,
        Math.min(startW + (side === "left" ? -dx : dx), container)
      );
      if (box) box.style.width = `${next}px`; // live — no transaction per move
    };
    const teardown = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      cleanupRef.current = null;
    };
    const onUp = () => {
      teardown();
      if (box) updateAttributes({ width: Math.round(box.offsetWidth) }); // commit once
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    cleanupRef.current = teardown; // let an unmount mid-drag clean these up
  };

  const handle = (side: "left" | "right") => (
    <span
      onPointerDown={(e) => startResize(e, side)}
      style={{
        position: "absolute",
        top: "50%",
        [side]: -5,
        transform: "translateY(-50%)",
        width: 9,
        height: 42,
        maxHeight: "55%",
        borderRadius: 6,
        background: "var(--alltra-brand)",
        border: "2px solid var(--bg-elevated)",
        cursor: "ew-resize",
        zIndex: 2,
        touchAction: "none",
      }}
    />
  );

  return (
    <NodeViewWrapper
      as="div"
      className="jimage"
      style={{ margin: "6px 0", lineHeight: 0 }}
    >
      <div
        ref={boxRef}
        onClick={select}
        contentEditable={false}
        style={{
          position: "relative",
          display: "inline-block",
          verticalAlign: "top",
          width: width ? `${width}px` : "min(440px, 100%)",
          maxWidth: "100%",
          borderRadius: 10,
          outline: selected
            ? "2px solid var(--alltra-brand)"
            : "2px solid transparent",
          outlineOffset: 2,
          transition: "outline-color 120ms ease",
          cursor: "pointer",
        }}
      >
        <img
          ref={imgRef}
          src={node.attrs.src as string}
          alt={(node.attrs.alt as string) || ""}
          title={(node.attrs.title as string) || ""}
          onLoad={settleSize}
          draggable={false}
          style={{
            display: "block",
            width: width ? "100%" : "auto",
            maxWidth: "100%",
            height: "auto",
            borderRadius: 10,
          }}
        />
        {selected && (
          <>
            {handle("left")}
            {handle("right")}
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteNode();
              }}
              title="Delete image"
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                zIndex: 3,
                width: 26,
                height: 26,
                display: "grid",
                placeItems: "center",
                borderRadius: 7,
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                color: "var(--text)",
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
              }}
            >
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => {
          const raw =
            el.getAttribute("width") || (el as HTMLElement).style?.width || "";
          const n = parseInt(String(raw), 10);
          return Number.isFinite(n) ? n : null;
        },
        renderHTML: (attrs) =>
          attrs.width
            ? { width: attrs.width, style: `width: ${attrs.width}px` }
            : {},
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});
