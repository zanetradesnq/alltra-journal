/**
 * PageLink — an inline chip that references another journal entry (e.g. link
 * last week's journal to today's because the trade/mistake repeated). Inserting
 * one opens a picker of your entries; clicking a filled chip navigates to that
 * entry. Navigation + the entry list come from the extension options, wired in
 * App (so the node stays decoupled from the journal's state).
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { ArrowUpRight, FileText, Search } from "lucide-react";
import { useFlipPosition } from "../lib/popover";

export interface PageLinkEntry {
  index: number;
  date: string;
  title: string;
  snippet: string;
  label: string;
}
export interface PageLinkOptions {
  getEntries: () => PageLinkEntry[];
  onOpen: (date: string, title: string) => void;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageLink: {
      insertPageLink: () => ReturnType;
    };
  }
}

function dateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function PageLinkView({ node, updateAttributes, extension, editor, deleteNode }: NodeViewProps) {
  const date = (node.attrs.date as string | null) ?? null;
  const title = (node.attrs.title as string) || "";
  const opts = extension.options as PageLinkOptions;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const autoOpened = useRef(false);

  // flip above when near the viewport bottom; clamp on-screen; measured size
  const pos = useFlipPosition(
    open,
    () => {
      const r = ref.current?.getBoundingClientRect();
      return r && r.width > 0 ? r : null;
    },
    popRef,
    { prefer: "below", gap: 6 }
  );

  const openPicker = () => setOpen(true);

  // freshly inserted (no target yet) → open the picker once
  useEffect(() => {
    if (!date && !autoOpened.current) {
      autoOpened.current = true;
      openPicker();
    }
  }, [date]);

  // Dismissing without choosing removes the unfilled chip (so a lingering empty
  // node can't re-pop its picker and trap focus) and hands focus back to the doc.
  const emptyRef = useRef(true);
  emptyRef.current = !date;
  const close = () => {
    setOpen(false);
    if (emptyRef.current) deleteNode();
    editor.commands.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as unknown as HTMLElement;
      if (!popRef.current?.contains(t) && !ref.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onClick = () => {
    if (date) opts.onOpen(date, title);
    else openPicker();
  };

  const q = query.trim().toLowerCase();
  const entries = opts
    .getEntries()
    .filter(
      (e) =>
        !q ||
        `${e.label} ${e.title} ${e.snippet}`.toLowerCase().includes(q)
    );

  const label = date
    ? `${dateLabel(date)}${title ? ` · ${title}` : ""}`
    : "Link page…";

  return (
    <NodeViewWrapper
      as="span"
      ref={ref}
      className="jpagelink"
      data-empty={date ? "false" : "true"}
      contentEditable={false}
      title={date ? "Open linked entry" : "Choose an entry to link"}
      onClick={onClick}
    >
      <ArrowUpRight size={13} /> {label}
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
              width: 264,
              fontFamily: '"Inter", system-ui, sans-serif',
            }}
            className="rounded-xl border border-border bg-elevated p-2 shadow-lg"
          >
            <div className="mb-1 flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5">
              <Search size={13} className="text-text-faint" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Link a journal entry…"
                className="w-full bg-transparent text-[12.5px] text-text outline-none placeholder:text-text-faint"
              />
            </div>
            <div className="hide-scrollbar max-h-[260px] overflow-y-auto">
              {entries.length === 0 ? (
                <p className="px-2 py-3 text-[12px] text-text-faint">
                  No entries to link.
                </p>
              ) : (
                entries.map((e) => (
                  <button
                    key={`${e.date}-${String(e.index)}`}
                    onClick={() => {
                      updateAttributes({ date: e.date, title: e.title });
                      setOpen(false);
                      editor.commands.focus();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[var(--hover-overlay)]"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-card text-text-muted">
                      <FileText size={14} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-medium text-text">
                        {dateLabel(e.date)}
                      </span>
                      <span className="block truncate text-[11.5px] text-text-faint">
                        {e.title || e.snippet || "Untitled"}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </NodeViewWrapper>
  );
}

export const PageLink = Node.create<PageLinkOptions>({
  name: "pageLink",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return {
      getEntries: () => [],
      onOpen: () => {},
    };
  },

  addAttributes() {
    return {
      date: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-date") || null,
        renderHTML: (attrs) => (attrs.date ? { "data-date": attrs.date } : {}),
      },
      title: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-title") || "",
        renderHTML: (attrs) =>
          attrs.title ? { "data-title": attrs.title } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="pageLink"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "pageLink",
        class: "jpagelink",
      }),
      `↗ ${(node.attrs.date as string) ?? "page"}`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageLinkView);
  },

  addCommands() {
    return {
      insertPageLink:
        () =>
        ({ chain }) =>
          chain()
            .insertContent([
              { type: this.name },
              { type: "text", text: " " },
            ])
            .run(),
    };
  },
});
