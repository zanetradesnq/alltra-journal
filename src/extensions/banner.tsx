/**
 * Banner — a gradient header at the TOP of the journal entry. An atom block that
 * bleeds to the paper edges. Click it to open the "ALLTRA BANNERS" picker: pick
 * one of 18 gradients, upload an image, or remove the banner.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { Upload, Trash2 } from "lucide-react";
import { BANNERS } from "../banners";
import { useAppearance } from "../hooks/useAppearance";
import { useFlipPosition } from "../lib/popover";
import { storeImage, useImageSrc } from "../imageStore";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    banner: {
      insertBanner: () => ReturnType;
    };
  }
}

function bgFor(idx: number, image: string | null, dark: boolean) {
  if (image) return { backgroundImage: `url(${image})` };
  const b = BANNERS[idx] ?? BANNERS[0];
  return { backgroundImage: dark ? b.dark : b.light };
}

function BannerView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const idx = (node.attrs.colorIndex as number) ?? 0;
  const image = (node.attrs.image as string | null) ?? null;
  const resolvedImage = useImageSrc(image) ?? null; // idb:// → object URL
  const dark = useAppearance() === "dark";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  // flip above when near the viewport bottom; clamp on-screen; measured size
  const pos = useFlipPosition(
    open,
    () => {
      const r = ref.current?.getBoundingClientRect();
      return r && r.width > 0 ? { left: r.left + 20, top: r.top, bottom: r.bottom } : null;
    },
    popRef,
    { prefer: "below", gap: 6 }
  );

  const openPicker = () => setOpen(true);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as unknown as HTMLElement;
      if (!popRef.current?.contains(t) && !ref.current?.contains(t))
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

  const upload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      // the cover goes to IndexedDB; the node keeps an idb:// reference
      void storeImage(file).then((ref) => {
        updateAttributes({ image: ref });
        setOpen(false);
      });
    };
    input.click();
  };

  return (
    <NodeViewWrapper
      as="div"
      ref={ref}
      className="jbanner"
      contentEditable={false}
      title="Click to change banner"
      onClick={openPicker}
      style={{
        ...bgFor(idx, resolvedImage, dark),
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
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
              width: 312,
              fontFamily: '"Inter", system-ui, sans-serif',
            }}
            className="rounded-xl border border-border bg-elevated p-3 shadow-lg"
          >
            <p className="mb-2 px-0.5 text-[10px] font-semibold tracking-wide text-text-faint">
              Alltra banners
            </p>
            <div className="grid grid-cols-6 gap-2">
              {BANNERS.map((b, i) => {
                const sel = i === idx && !image;
                return (
                  <button
                    key={b.name}
                    title={b.name}
                    onClick={() =>
                      updateAttributes({ colorIndex: i, image: null })
                    }
                    className={
                      "h-9 w-full rounded-lg border transition-transform hover:scale-105 " +
                      (sel
                        ? "border-transparent ring-2 ring-[var(--alltra-brand)] ring-offset-1 ring-offset-[var(--bg-elevated)]"
                        : "border-border")
                    }
                    style={{
                      backgroundImage: dark ? b.dark : b.light,
                      backgroundSize: "cover",
                    }}
                  />
                );
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={upload}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-2 text-[12.5px] font-medium text-text shadow-sm transition-colors hover:bg-card-hover"
              >
                <Upload size={14} /> Upload image
              </button>
              <button
                onClick={() => deleteNode()}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-2 text-[12.5px] font-medium text-[var(--danger)] shadow-sm transition-colors hover:bg-card-hover"
              >
                <Trash2 size={14} /> Remove
              </button>
            </div>
          </div>,
          document.body
        )}
    </NodeViewWrapper>
  );
}

export const Banner = Node.create({
  name: "banner",
  group: "block",
  atom: true,
  selectable: false,
  draggable: false,

  addAttributes() {
    return {
      colorIndex: {
        default: 0,
        parseHTML: (el) => Number(el.getAttribute("data-color-index")) || 0,
        renderHTML: (attrs) => ({ "data-color-index": String(attrs.colorIndex) }),
      },
      image: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-image") || null,
        renderHTML: (attrs) => (attrs.image ? { "data-image": attrs.image } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="banner"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "banner", class: "jbanner" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BannerView);
  },

  addCommands() {
    return {
      // insert (once) at the very TOP of the document — the head of the journal
      insertBanner:
        () =>
        ({ chain, state }) => {
          if (state.doc.firstChild?.type.name === this.name) return false;
          return chain()
            .insertContentAt(0, { type: this.name, attrs: { colorIndex: 0 } })
            .run();
        },
    };
  },
});
