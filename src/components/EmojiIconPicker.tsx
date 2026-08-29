/**
 * Emoji / Icon picker — shared by the block menu's "Edit icon" flyout and by an
 * inserted icon node's click-to-swap popup. Emoji tab (plain emoji) + Icons tab
 * (a colored box + a lucide icon). onPick receives either { glyph } or
 * { icon, color }.
 */
import { useState } from "react";
import { ICON_NAMES, ICON_SET, ICON_COLORS, iconColor } from "../iconSet";

export type IconSel = { glyph?: string; icon?: string; color?: string };

export const EMOJI_GROUPS: { label: string; items: string[] }[] = [
  {
    label: "Smileys",
    items: ["😀", "😄", "😁", "😅", "😂", "🙂", "😉", "😊", "😍", "😎", "🤔", "😴", "😭", "😡", "🥳", "🤯"],
  },
  {
    label: "Gestures",
    items: ["👍", "👎", "👏", "🙌", "🤝", "👀", "✋", "👉", "💪", "🙏"],
  },
  {
    label: "Objects",
    items: ["🔥", "⭐", "✅", "❌", "⚠️", "💡", "📌", "🔑", "🔒", "📖", "🎯", "🚀", "⚡", "❤️", "💯", "✨"],
  },
  {
    label: "Nature",
    items: ["🌞", "🌙", "🌈", "🌊", "🌱", "🍀", "🌸", "🍂", "❄️", "🔆"],
  },
];

export function EmojiIconPicker({ onPick }: { onPick: (sel: IconSel) => void }) {
  const [tab, setTab] = useState<"emoji" | "icons">("emoji");
  const [filter, setFilter] = useState("");
  const [color, setColor] = useState("orange"); // icon-box color
  const f = filter.trim().toLowerCase();
  const c = iconColor(color);

  return (
    <div className="w-full">
      {/* tabs */}
      <div className="mb-1.5 flex items-center gap-3 border-b border-border px-1 pb-1.5 text-[12.5px]">
        <button
          onClick={() => setTab("emoji")}
          className={
            tab === "emoji"
              ? "font-semibold text-text"
              : "text-text-muted hover:text-text"
          }
        >
          Emoji
        </button>
        <button
          onClick={() => setTab("icons")}
          className={
            tab === "icons"
              ? "font-semibold text-text"
              : "text-text-muted hover:text-text"
          }
        >
          Icons
        </button>
      </div>

      {tab === "emoji" ? (
        <>
          <input
            autoFocus
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter..."
            className="mb-1.5 w-full rounded-md border border-border bg-card px-2 py-1 text-[12px] text-text outline-none placeholder:text-text-faint"
          />
          {EMOJI_GROUPS.map((g) => {
            const items = g.items.filter(() => !f || g.label.toLowerCase().includes(f));
            if (items.length === 0) return null;
            return (
              <div key={g.label} className="mb-1.5">
                <p className="px-1 pb-1 text-[10px] font-medium tracking-wide text-text-faint">
                  {g.label}
                </p>
                <div className="grid grid-cols-7 gap-0.5">
                  {items.map((em, i) => (
                    <button
                      key={g.label + i}
                      onClick={() => onPick({ glyph: em })}
                      className="grid h-7 place-items-center rounded text-[16px] transition-colors hover:bg-[var(--hover-overlay)]"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <>
          {/* box color */}
          <div className="mb-2 flex items-center gap-1.5">
            {ICON_COLORS.map((col) => (
              <button
                key={col.key}
                title={col.key}
                onClick={() => setColor(col.key)}
                className={
                  "h-5 w-5 rounded-md transition-transform hover:scale-110 " +
                  (col.key === color ? "ring-2 ring-text ring-offset-1 ring-offset-[var(--bg-elevated)]" : "")
                }
                style={{ background: col.bg, color: col.fg, border: `1px solid ${col.fg}33` }}
              />
            ))}
          </div>
          {/* icons in the chosen color box */}
          <div className="grid grid-cols-6 gap-1.5">
            {ICON_NAMES.map((name) => {
              const Icon = ICON_SET[name];
              return (
                <button
                  key={name}
                  title={name}
                  onClick={() => onPick({ icon: name, color })}
                  className="grid h-9 place-items-center rounded-lg transition-transform hover:scale-105"
                  style={{ background: c.bg, color: c.fg }}
                >
                  <Icon size={16} />
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default EmojiIconPicker;
