/**
 * JournalCover — the banner rendered as PAGE CHROME (a full-width cover), not an
 * editor block, so it can bleed to the content-area edges (nav / top bar / panel)
 * while the rounded paper card stays below it — Notion's cover behaviour. It reads
 * the banner node's attrs and edits them through the passed callbacks (which drive
 * the editor's banner node); the in-editor banner node is hidden.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Upload, Trash2 } from "lucide-react";
import { BANNERS } from "../banners";
import { useAppearance } from "../hooks/useAppearance";

function bgFor(idx: number, image: string | null, dark: boolean) {
  if (image) return { backgroundImage: `url(${image})` };
  const b = BANNERS[idx] ?? BANNERS[0];
  return { backgroundImage: dark ? b.dark : b.light };
}

export interface JournalCoverProps {
  colorIndex: number;
  image: string | null;
  onSelect: (colorIndex: number, image: string | null) => void;
  onRemove: () => void;
}

export function JournalCover({ colorIndex, image, onSelect, onRemove }: JournalCoverProps) {
  const dark = useAppearance() === "dark";
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos({ x: r.left + 24, y: r.bottom - 8 });
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!popRef.current?.contains(t) && !ref.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
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
      const reader = new FileReader();
      reader.onload = () => {
        onSelect(colorIndex, reader.result as string);
        setOpen(false);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <div
      ref={ref}
      className="jcover"
      title="Click to change cover"
      onClick={() => setOpen(true)}
      style={{ ...bgFor(colorIndex, image, dark), backgroundSize: "cover", backgroundPosition: "center" }}
    >
      {open &&
        pos &&
        createPortal(
          <div
            ref={popRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              left: pos.x,
              top: pos.y,
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
                const sel = i === colorIndex && !image;
                return (
                  <button
                    key={b.name}
                    type="button"
                    title={b.name}
                    onClick={() => {
                      onSelect(i, null);
                      setOpen(false);
                    }}
                    className={
                      "h-9 w-full rounded-lg border transition-transform hover:scale-105 " +
                      (sel
                        ? "border-transparent ring-2 ring-[var(--alltra-brand)] ring-offset-1 ring-offset-[var(--bg-elevated)]"
                        : "border-border")
                    }
                    style={{ backgroundImage: dark ? b.dark : b.light, backgroundSize: "cover" }}
                  />
                );
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={upload}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-2 text-[12.5px] font-medium text-text shadow-sm transition-colors hover:bg-card-hover"
              >
                <Upload size={14} /> Upload image
              </button>
              <button
                type="button"
                onClick={() => {
                  onRemove();
                  setOpen(false);
                }}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-2 text-[12.5px] font-medium text-[var(--danger)] shadow-sm transition-colors hover:bg-card-hover"
              >
                <Trash2 size={14} /> Remove
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
