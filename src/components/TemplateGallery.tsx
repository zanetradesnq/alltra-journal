/**
 * Template gallery — a "Select a template" modal. Grid of cards, each showing a
 * scaled live preview of the template content, its name, and a pin (star) to
 * favorite it (favorites surface in the side palette). Clicking a card applies
 * the template to the current entry.
 */
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Star, X, Plus, Trash2 } from "lucide-react";
import { type JournalTemplate } from "../templates";

export function TemplateGallery({
  templates,
  favorites,
  onToggleFavorite,
  onApply,
  onCreate,
  onDelete,
  onClose,
}: {
  templates: JournalTemplate[];
  favorites: Set<string>;
  onToggleFavorite: (id: string, fav: boolean) => void;
  onApply: (t: JournalTemplate) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      onMouseDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "rgba(0,0,0,0.32)",
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="hide-scrollbar flex w-full max-w-[900px] flex-col rounded-2xl border border-border bg-[var(--surface-1)] shadow-lg"
        style={{ maxHeight: "86vh", fontFamily: "var(--font-geist-sans)" }}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight text-text">
              Select a template
            </h2>
            <p className="mt-0.5 text-[12.5px] text-text-muted">
              Start an entry from a ready-made layout. Star one to pin it.
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-text-muted transition-colors hover:bg-[var(--hover-overlay)] hover:text-text"
          >
            <X size={18} />
          </button>
        </div>

        {/* grid */}
        <div className="hide-scrollbar grid grid-cols-2 gap-4 overflow-y-auto p-6 sm:grid-cols-3 lg:grid-cols-4">
          {/* create-your-own tile */}
          <div className="flex flex-col">
            <button
              onClick={onCreate}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--alltra-brand)] bg-[rgba(0,102,255,0.04)] text-[var(--alltra-brand)] transition-colors hover:bg-[rgba(0,102,255,0.08)]"
              style={{ height: 190 }}
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--alltra-brand)] text-white">
                <Plus size={18} />
              </span>
              <span className="text-[13px] font-semibold">Custom template</span>
            </button>
            <div className="mt-2 px-0.5">
              <p className="text-[13px] font-medium text-text">Create your own</p>
              <p className="truncate text-[11.5px] text-text-faint">
                Build it in the editor
              </p>
            </div>
          </div>

          {templates.map((t) => {
            const fav = favorites.has(t.id);
            const isCustom = t.id.startsWith("custom-");
            return (
              <div key={t.id} className="group flex flex-col">
                <button
                  onClick={() => onApply(t)}
                  className="relative overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  style={{ height: 190 }}
                >
                  {/* accent strip */}
                  <span
                    className="block h-1.5 w-full"
                    style={{ background: t.accent }}
                  />
                  {/* scaled live preview */}
                  <div className="relative h-[172px] overflow-hidden bg-[var(--surface-2)] px-3 pt-2">
                    <div
                      className="journal pointer-events-none"
                      style={{
                        width: 250,
                        transform: "scale(0.42)",
                        transformOrigin: "top left",
                        ["--ed-size" as string]: "14px",
                        ["--ed-lh" as string]: "20px",
                        ["--ed-font" as string]:
                          '"Inter", system-ui, sans-serif',
                        color: "var(--text-primary)",
                      }}
                      dangerouslySetInnerHTML={{ __html: t.html }}
                    />
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[var(--surface-2)] to-transparent" />
                  </div>
                  {/* star */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(t.id, !fav);
                    }}
                    title={fav ? "Unpin template" : "Pin template"}
                    className="absolute right-2 top-3 grid h-7 w-7 place-items-center rounded-md bg-[var(--surface-1)]/90 text-text-muted shadow-sm transition-colors hover:text-text"
                    style={{ color: fav ? "var(--alltra-brand)" : undefined }}
                  >
                    <Star size={14} fill={fav ? "currentColor" : "none"} strokeWidth={1.9} />
                  </button>
                  {/* delete (custom templates only) */}
                  {isCustom && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(t.id);
                      }}
                      title="Delete template"
                      className="absolute left-2 top-3 grid h-7 w-7 place-items-center rounded-md bg-[var(--surface-1)]/90 text-text-muted shadow-sm transition-colors hover:text-[var(--warning)]"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </button>
                <div className="mt-2 px-0.5">
                  <p className="text-[13px] font-medium text-text">{t.name}</p>
                  <p className="truncate text-[11.5px] text-text-faint">
                    {t.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}

