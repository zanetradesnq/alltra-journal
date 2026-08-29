/**
 * The "/" command palette popup. Filter-driven, grouped list with full keyboard
 * nav — ArrowUp/Down move + wrap, Enter inserts, click-to-insert. The TipTap
 * Suggestion plugin forwards keydown through the imperative onKeyDown handle.
 */
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { CSSProperties } from "react";
import { Star } from "lucide-react";
import type { SlashCommand } from "./commands";
import { PANEL_COMMAND_IDS } from "./commands";

export interface SlashCommandMenuHandle {
  /** Returns true when the key was consumed by the menu. */
  onKeyDown: (event: KeyboardEvent) => boolean;
}

interface SlashCommandMenuProps {
  items: SlashCommand[];
  command: (item: SlashCommand) => void;
  /** The user's currently-favorited command ids (seed). */
  favoriteIds?: string[];
  /** Toggle a command's favorite (does NOT select/insert it). */
  onToggleFavorite?: (commandId: string, favorite: boolean) => void;
}

export const SlashCommandMenu = forwardRef<
  SlashCommandMenuHandle,
  SlashCommandMenuProps
>(({ items, command, favoriteIds = [], onToggleFavorite }, ref) => {
  const [selected, setSelected] = useState(0);
  const [favSet, setFavSet] = useState<Set<string>>(() => new Set(favoriteIds));
  const listRef = useRef<HTMLDivElement>(null);

  const toggleStar = (id: string): void => {
    const on = favSet.has(id);
    onToggleFavorite?.(id, !on);
    setFavSet((prev) => {
      const next = new Set(prev);
      if (on) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Reset selection whenever the filtered set changes (new query).
  useEffect(() => setSelected(0), [items]);

  // Keep the selected row in view as the user arrows through.
  useLayoutEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-slash-index="${String(selected)}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const pick = (index: number): void => {
    const item = items[index];
    if (item) command(item);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: (event: KeyboardEvent): boolean => {
      if (items.length === 0) return false;
      if (event.key === "ArrowUp") {
        setSelected((s) => (s + items.length - 1) % items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelected((s) => (s + 1) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        pick(selected);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div style={shellStyle}>
        <div
          style={{
            padding: "10px 12px",
            fontSize: 13,
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-geist-sans)",
          }}
        >
          No matching blocks
        </div>
      </div>
    );
  }

  // Section headers: render a group label the first time a group appears.
  let lastGroup: string | null = null;

  return (
    <div style={shellStyle} ref={listRef} role="listbox" aria-label="Insert block">
      {items.map((item, index) => {
        const Icon = item.icon;
        const isSelected = index === selected;
        const showGroup = item.group !== lastGroup;
        lastGroup = item.group;
        return (
          <div key={`${item.id}-${String(index)}`}>
            {showGroup && (
              <div
                style={{
                  padding: "8px 10px 4px",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-geist-sans)",
                }}
              >
                {item.group}
              </div>
            )}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                borderRadius: 8,
                background: isSelected ? "var(--alpha-8)" : "transparent",
                transition: "background-color 0.08s",
              }}
            >
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                data-slash-index={index}
                onMouseEnter={() => setSelected(index)}
                // Mouse down (not click) so the editor selection isn't lost first.
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(index);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flex: 1,
                  minWidth: 0,
                  padding: "7px 8px",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  textAlign: "left",
                  background: "transparent",
                  fontFamily: "var(--font-geist-sans)",
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 7,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--surface-3)",
                    border: "1px solid var(--border-3)",
                  }}
                >
                  {Icon && (
                    <Icon size={15} style={{ color: "var(--text-secondary)" }} />
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.description}
                  </div>
                </div>
              </button>
              {/* commands already in the Text Editor panel aren't pinnable */}
              {!PANEL_COMMAND_IDS.has(item.id) && (
                <button
                  type="button"
                  aria-label={
                    favSet.has(item.id)
                      ? `Unfavorite ${item.title}`
                      : `Favorite ${item.title}`
                  }
                  aria-pressed={favSet.has(item.id)}
                  title="Pin to side panel"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleStar(item.id);
                  }}
                  style={{
                    flexShrink: 0,
                    width: 28,
                    height: 28,
                    marginRight: 6,
                    borderRadius: 6,
                    border: "none",
                    background: "transparent",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: favSet.has(item.id)
                      ? "var(--alltra-brand)"
                      : "var(--text-tertiary)",
                  }}
                >
                  <Star
                    size={14}
                    strokeWidth={1.9}
                    fill={favSet.has(item.id) ? "currentColor" : "none"}
                  />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

SlashCommandMenu.displayName = "SlashCommandMenu";

const shellStyle: CSSProperties = {
  width: 290,
  maxHeight: 340,
  overflowY: "auto",
  padding: 6,
  background: "var(--surface-2)",
  border: "1px solid var(--border-2)",
  borderRadius: 10,
  boxShadow: "var(--shadow-lg)",
};
