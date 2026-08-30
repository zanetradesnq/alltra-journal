/**
 * Spotlight — the ⌘K command palette. One box, four kinds of result:
 *   · entries   — full-text over title, body and tags, with a highlighted snippet
 *   · notes     — the Notes board, same search
 *   · commands  — any "/" command, run at the cursor (editor view only)
 *   · tags      — `#tag` filters entries carrying that tag; a bare "#" lists
 *                 every tag with counts, and clicking a tag pill in an entry
 *                 opens the palette pre-filtered
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Search, StickyNote, Hash, CornerDownLeft } from "lucide-react";
import { filterCommands, type SlashCommand } from "../slash/commands";

export interface SearchEntry {
  index: number;
  title: string;
  date: string;
  text: string;
  tags: string[];
}
export interface SearchNote {
  id: string;
  title: string;
  text: string;
}

/** Tag names inside an entry's saved HTML (the tag pill's text). */
export function extractTags(html: string): string[] {
  if (!html.includes('data-type="tag"')) return [];
  const out: string[] = [];
  const re = /<span[^>]*data-type="tag"[^>]*>([^<]*)<\/span>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const name = m[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .trim();
    if (name && !out.includes(name)) out.push(name);
  }
  return out;
}

type Item =
  | { kind: "entry"; key: string; entry: SearchEntry }
  | { kind: "note"; key: string; note: SearchNote }
  | { kind: "command"; key: string; cmd: SlashCommand };

const SECTION: Record<Item["kind"], string> = { command: "Commands", entry: "Entries", note: "Notes" };

export function Spotlight({
  entries,
  notes,
  commands,
  initialQuery = "",
  onPickEntry,
  onPickNote,
  onRunCommand,
  onClose,
}: {
  entries: SearchEntry[];
  notes: SearchNote[];
  /** null = not in the editor, commands can't run */
  commands: SlashCommand[] | null;
  initialQuery?: string;
  onPickEntry: (index: number) => void;
  onPickNote: (id: string) => void;
  onRunCommand: (cmd: SlashCommand) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState(initialQuery);
  const [sel, setSel] = useState(0);
  const ql = q.trim().toLowerCase();
  const tagMode = ql.startsWith("#");
  const tagQ = tagMode ? ql.slice(1).trim() : "";

  // every tag across the journal, with counts (for the "#" browser + chips)
  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    entries.forEach((e) => e.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [entries]);

  const items: Item[] = useMemo(() => {
    if (tagMode) {
      const hits = entries.filter((e) => e.tags.some((t) => t.toLowerCase().includes(tagQ)));
      return hits.map((e) => ({ kind: "entry", key: `e${String(e.index)}`, entry: e }));
    }
    const cmds =
      commands && ql
        ? filterCommands(commands, ql).slice(0, 5).map((cmd): Item => ({ kind: "command", key: `c${cmd.id}`, cmd }))
        : [];
    const ents = (ql
      ? entries.filter(
          (e) =>
            e.title.toLowerCase().includes(ql) ||
            e.text.toLowerCase().includes(ql) ||
            e.tags.some((t) => t.toLowerCase().includes(ql)),
        )
      : entries
    ).map((e): Item => ({ kind: "entry", key: `e${String(e.index)}`, entry: e }));
    const nts = (ql
      ? notes.filter((n) => n.title.toLowerCase().includes(ql) || n.text.toLowerCase().includes(ql))
      : []
    ).map((n): Item => ({ kind: "note", key: `n${n.id}`, note: n }));
    return [...cmds, ...ents, ...nts];
  }, [entries, notes, commands, ql, tagMode, tagQ]);

  useEffect(() => setSel(0), [q]);
  const listRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${String(sel)}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  const pick = (it: Item) => {
    if (it.kind === "entry") onPickEntry(it.entry.index);
    else if (it.kind === "note") onPickNote(it.note.id);
    else onRunCommand(it.cmd);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(items.length - 1, s + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(0, s - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[sel]) pick(items[sel]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const snippet = (text: string) => {
    const needle = tagMode ? "" : ql;
    if (!needle) return text.slice(0, 90) || "";
    const i = text.toLowerCase().indexOf(needle);
    if (i < 0) return text.slice(0, 90);
    const start = Math.max(0, i - 28);
    return (
      <>
        {start > 0 ? "…" : ""}
        {text.slice(start, i)}
        <mark className="rounded bg-[rgba(0,102,255,0.18)] text-text">{text.slice(i, i + needle.length)}</mark>
        {text.slice(i + needle.length, i + needle.length + 52)}…
      </>
    );
  };

  const TagChip = ({ name, count, active }: { name: string; count?: number; active?: boolean }) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => setQ(`#${name}`)}
      className={
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors " +
        (active
          ? "bg-[rgba(var(--alltra-brand-rgb),0.16)] text-[var(--alltra-brand)]"
          : "bg-[var(--hover-overlay)] text-text-muted hover:bg-[var(--hover-overlay-medium)] hover:text-text")
      }
    >
      <Hash size={10} />
      {name}
      {count !== undefined && <span className="text-text-faint">{count}</span>}
    </button>
  );

  let lastKind: Item["kind"] | null = null;

  return (
    <div
      className="fixed inset-0 z-[400] flex items-start justify-center bg-black/30 p-6 pt-[12vh]"
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="flex max-h-[64vh] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl border border-border bg-elevated shadow-lg"
      >
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          {tagMode ? <Hash size={17} className="text-[var(--alltra-brand)]" /> : <Search size={17} className="text-text-faint" />}
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder={commands ? "Search entries, notes, #tags — or type a command…" : "Search entries, notes, #tags…"}
            className="flex-1 bg-transparent text-[14px] text-text outline-none placeholder:text-text-faint"
          />
          <kbd className="rounded border border-border bg-[var(--surface-3)] px-1.5 py-0.5 text-[10px] text-text-faint">
            Esc
          </kbd>
        </div>

        {/* tag browser — bare "#" or an empty query surfaces the journal's tags */}
        {allTags.length > 0 && (ql === "" || (tagMode && tagQ === "")) && (
          <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2.5">
            {allTags.slice(0, 14).map(([name, count]) => (
              <TagChip key={name} name={name} count={count} />
            ))}
          </div>
        )}

        <div ref={listRef} className="flex-1 overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="px-3 py-10 text-center text-[13px] text-text-faint">
              {tagMode ? `No entries tagged “${tagQ}”.` : "Nothing matches."}
            </p>
          ) : (
            items.map((it, idx) => {
              const showHead = it.kind !== lastKind;
              lastKind = it.kind;
              const active = idx === sel;
              const rowCls =
                "flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-colors " +
                (active ? "bg-accent-soft" : "hover:bg-[var(--hover-overlay)]");
              return (
                <div key={it.key}>
                  {showHead && (
                    <div className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wider text-text-faint">
                      {SECTION[it.kind]}
                    </div>
                  )}
                  {it.kind === "entry" && (
                    <button data-idx={idx} onMouseEnter={() => setSel(idx)} onClick={() => pick(it)} className={rowCls}>
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13.5px] font-medium text-text">{it.entry.title || "Untitled"}</span>
                        {it.entry.tags.length > 0 && (
                          <span className="flex shrink-0 items-center gap-1">
                            {it.entry.tags.slice(0, 3).map((t) => (
                              <TagChip key={t} name={t} active={tagMode && t.toLowerCase().includes(tagQ)} />
                            ))}
                          </span>
                        )}
                        <span className="ml-auto shrink-0 text-[11px] text-text-faint">{it.entry.date}</span>
                      </div>
                      <span className="block truncate text-[12px] text-text-muted">
                        {it.entry.text ? snippet(it.entry.text) : "No text — attachments or a day summary"}
                      </span>
                    </button>
                  )}
                  {it.kind === "note" && (
                    <button data-idx={idx} onMouseEnter={() => setSel(idx)} onClick={() => pick(it)} className={rowCls}>
                      <div className="flex items-center gap-2">
                        <StickyNote size={13} className="shrink-0 text-text-faint" />
                        <span className="truncate text-[13.5px] font-medium text-text">{it.note.title || "Untitled note"}</span>
                      </div>
                      <span className="block truncate pl-[21px] text-[12px] text-text-muted">
                        {it.note.text ? snippet(it.note.text) : "Empty note"}
                      </span>
                    </button>
                  )}
                  {it.kind === "command" && (
                    <button
                      data-idx={idx}
                      onMouseEnter={() => setSel(idx)}
                      onClick={() => pick(it)}
                      className={rowCls.replace("flex-col", "flex-row items-center gap-3")}
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-[var(--surface-3)] text-text-muted">
                        <it.cmd.icon size={14} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium text-text">{it.cmd.title}</span>
                        <span className="block truncate text-[12px] text-text-muted">{it.cmd.description}</span>
                      </span>
                      {active && <CornerDownLeft size={13} className="shrink-0 text-text-faint" />}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
