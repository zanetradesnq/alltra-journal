/**
 * Notes — a separate, lightweight space from the journal. Quick captures that
 * live as colorful cards on a masonry board. Empty state greets you with a
 * "Start a note" button; clicking it (or "New note") opens a popup composer with
 * an optional title, body, tags, and a card color → Save. Click a card to edit.
 * Everything persists to localStorage, independent of journal entries.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Plus,
  Search,
  X,
  StickyNote,
  Trash2,
  Loader2,
  MoreVertical,
  Pencil,
  Star,
} from "lucide-react";
import { SelectionMenu, type MenuState } from "./SelectionMenu";
import { aiTransform, type AiAction } from "../ai/rewrite";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExt from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { ResizableImage } from "../extensions/image";
import { imagePasteProps, resolveImage, IDB_PREFIX } from "../imageStore";
import TextStyle from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { FontSize } from "../extensions/fontSize";
import { LetterSpacing } from "../extensions/letterSpacing";
import { Callout } from "../extensions/callout";
import { Toggle } from "../extensions/toggle";
import { TextColor, BgColor, BlockStyle } from "../extensions/color";
import { Tag } from "../extensions/tag";
import { IconNode } from "../extensions/iconNode";
import { Banner } from "../extensions/banner";
import { PageLink, type PageLinkEntry } from "../extensions/pageLink";
import { TradeLink } from "../extensions/tradeLink";
import { TradeTable } from "../extensions/tradeTable";
import { JournalStats } from "../extensions/journalStats";
import { TrailingNode } from "../extensions/trailingNode";
import { DayHeader } from "../extensions/dayHeader";
import { ListExit } from "../extensions/listExit";
import { TaskListVariant } from "../extensions/taskListVariant";
import { SlashCommand, type SlashFavorites } from "../slash/SlashCommand";
import { MOCK_TRADES } from "../trades";
import { allTrades } from "../tradeStore";

/** Journal wiring handed down from App so notes share pins + page links. */
export interface NotesJournalWiring {
  favorites?: SlashFavorites;
  pageLinks?: {
    getEntries: () => PageLinkEntry[];
    onOpen: (date: string, title: string) => void;
  };
}

export interface Note {
  id: string;
  title: string;
  body: string;
  tags: string[];
  color: string; // NOTE_COLORS key
  updatedAt: number;
  favorite?: boolean;
}

const NOTES_KEY = "alltra-journal-notes";

const NOTE_COLORS: { key: string; card: string; head: string }[] = [
  { key: "neutral", card: "var(--surface-1)", head: "var(--text-primary)" },
  { key: "pink", card: "#fcebf2", head: "#c14c8a" },
  { key: "blue", card: "#eaf1fd", head: "#3a6fd0" },
  { key: "green", card: "#eaf6ec", head: "#2f9255" },
  { key: "amber", card: "#fdf3e2", head: "#bd8412" },
  { key: "purple", card: "#f2ebfb", head: "#8b51e0" },
];
const colorCard = (key: string) =>
  NOTE_COLORS.find((c) => c.key === key)?.card ?? "var(--surface-1)";
// the title color — a saturated version of the card tint (matches the bg)
const headColor = (key: string) =>
  NOTE_COLORS.find((c) => c.key === key)?.head ?? "var(--text-primary)";

// stable color per tag label, so the same tag always looks the same
const TAG_PALETTE = [
  { bg: "rgba(31,157,87,0.14)", fg: "#1f9d57" },
  { bg: "rgba(0,102,255,0.12)", fg: "#2f6fdb" },
  { bg: "rgba(139,81,224,0.14)", fg: "#8b51e0" },
  { bg: "rgba(207,148,16,0.16)", fg: "#cf9410" },
  { bg: "rgba(193,76,138,0.14)", fg: "#c14c8a" },
];
function tagStyle(label: string) {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  return TAG_PALETTE[h % TAG_PALETTE.length];
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// plain-text from a note's HTML (used to decide if it's empty)
function stripHtml(html: string): string {
  if (!html) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || "").trim();
}
// a note with only a pasted screenshot (or banner / table) is still a note
const hasContent = (html: string): boolean =>
  stripHtml(html).length > 0 || /<img\b|data-type="(banner|trade-table)"/.test(html);

function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (raw) return JSON.parse(raw) as Note[];
  } catch {
    /* ignore */
  }
  return [];
}

/** Every saved note's rich-HTML body — the journal's trade-store pruner scans
 *  these too, so a trade table living in a NOTE isn't treated as deleted. */
export function noteBodies(): string[] {
  return loadNotes().map((n) => n.body || "");
}

/** Notes as searchable rows for the ⌘K palette. */
export function noteSummaries(): { id: string; title: string; text: string }[] {
  return loadNotes().map((n) => ({ id: n.id, title: n.title, text: stripHtml(n.body) }));
}

export function NotesPage({
  onBack,
  favorites,
  pageLinks,
  openNoteId,
  onOpened,
}: {
  onBack: () => void;
  /** deep-link from the ⌘K palette: open this note's composer on arrival */
  openNoteId?: string | null;
  onOpened?: () => void;
} & NotesJournalWiring) {
  const [notes, setNotes] = useState<Note[]>(loadNotes);
  const [query, setQuery] = useState("");
  const [composer, setComposer] = useState<Note | null>(null);
  useEffect(() => {
    if (!openNoteId) return;
    // never clobber an open composer's unsaved draft with a deep-link
    if (composer) {
      onOpened?.();
      return;
    }
    const n = notes.find((x) => x.id === openNoteId);
    if (n) setComposer(n);
    onOpened?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNoteId]);
  // per-card kebab (⋮) menu — which note, and where to anchor it
  const [cardMenu, setCardMenu] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    } catch {
      /* ignore */
    }
  }, [notes]);

  const isExisting = composer ? notes.some((n) => n.id === composer.id) : false;

  const save = (note: Note) => {
    setNotes((prev) =>
      prev.some((n) => n.id === note.id)
        ? prev.map((n) => (n.id === note.id ? note : n))
        : [note, ...prev]
    );
    setComposer(null);
  };
  // save + write localStorage SYNCHRONOUSLY — used when a page-link click
  // navigates away in the same React batch: this page unmounts before the
  // persist effect runs, so the async path would silently drop the edits
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const saveNow = (note: Note) => {
    const prev = notesRef.current;
    const next = prev.some((n) => n.id === note.id)
      ? prev.map((n) => (n.id === note.id ? note : n))
      : [note, ...prev];
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setNotes(next);
  };
  const remove = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setComposer(null);
  };
  const toggleFavorite = (id: string) =>
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, favorite: !n.favorite } : n))
    );
  const openCardMenu = (id: string, anchor: HTMLElement) => {
    const r = anchor.getBoundingClientRect();
    setCardMenu({ id, x: r.right, y: r.bottom + 4 });
  };
  const menuNote = cardMenu
    ? notes.find((n) => n.id === cardMenu.id) ?? null
    : null;
  const startNew = () =>
    setComposer({
      id: newId(),
      title: "",
      body: "",
      tags: [],
      color: "neutral",
      updatedAt: Date.now(),
    });

  const q = query.trim().toLowerCase();
  const filtered = q
    ? notes.filter((n) =>
        `${n.title} ${stripHtml(n.body)} ${n.tags.join(" ")}`
          .toLowerCase()
          .includes(q)
      )
    : notes;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-[var(--panel-bg)]">
      <div className="w-full px-7 py-7">
        {/* header */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button
            onClick={onBack}
            className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-text-muted shadow-sm transition-colors hover:bg-card-hover hover:text-text"
            title="Back to home"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-text">
              Notes
            </h1>
            <p className="mt-0.5 text-[13px] text-text-muted">
              {notes.length === 0
                ? "Quick captures, separate from your journal."
                : `${notes.length} note${notes.length === 1 ? "" : "s"}`}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
              <Search size={14} className="text-text-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a note"
                className="w-[180px] bg-transparent text-[13px] text-text outline-none placeholder:text-text-faint"
              />
            </div>
            <button
              onClick={startNew}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--alltra-brand)] px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              <Plus size={15} /> New note
            </button>
          </div>
        </div>

        {/* empty state / board */}
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--hover-overlay)] text-text-muted">
              <StickyNote size={26} />
            </div>
            <h2 className="text-[18px] font-semibold text-text">No notes yet</h2>
            <p className="mt-1 max-w-[320px] text-[13.5px] leading-relaxed text-text-muted">
              Thoughts, lists, and ideas live here — quick and separate from your
              journal.
            </p>
            <button
              onClick={startNew}
              className="mt-5 flex items-center gap-2 rounded-lg bg-[var(--alltra-brand)] px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              <Plus size={16} /> Start a note
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-[13.5px] text-text-muted">
            No notes match “{query}”.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((n) => (
              <NoteCard
                key={n.id}
                note={n}
                onEdit={() => setComposer(n)}
                onMenu={(anchor) => openCardMenu(n.id, anchor)}
                menuOpen={cardMenu?.id === n.id}
              />
            ))}
          </div>
        )}
      </div>

      {composer &&
        createPortal(
          <Composer
            // remount per note: the composer seeds its title/body state from
            // `note` once, so switching notes without a key would save note A's
            // text under note B's id
            key={composer.id}
            note={composer}
            onSave={save}
            onCancel={() => setComposer(null)}
            onDelete={isExisting ? () => remove(composer.id) : undefined}
            onSaveNow={saveNow}
            favorites={favorites}
            pageLinks={pageLinks}
          />,
          document.body
        )}

      {/* per-card action menu (Edit · Favorite · Delete) */}
      {cardMenu &&
        menuNote &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[600]"
              onClick={() => setCardMenu(null)}
            />
            <div
              style={{
                position: "fixed",
                left: Math.max(8, cardMenu.x - 176),
                top: cardMenu.y,
                width: 176,
              }}
              className="z-[601] rounded-xl border border-border bg-elevated p-1.5 shadow-lg"
            >
              <button
                onClick={() => {
                  setComposer(menuNote);
                  setCardMenu(null);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] text-text transition-colors hover:bg-[var(--hover-overlay)]"
              >
                <Pencil size={14} className="text-text-muted" /> Edit
              </button>
              <button
                onClick={() => {
                  toggleFavorite(cardMenu.id);
                  setCardMenu(null);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] text-text transition-colors hover:bg-[var(--hover-overlay)]"
              >
                <Star
                  size={14}
                  className={menuNote.favorite ? "text-amber-500" : "text-text-muted"}
                  fill={menuNote.favorite ? "currentColor" : "none"}
                />{" "}
                {menuNote.favorite ? "Unfavorite" : "Favorite"}
              </button>
              <button
                onClick={() => {
                  remove(cardMenu.id);
                  setCardMenu(null);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] text-text transition-colors hover:bg-[var(--hover-overlay)] hover:text-[var(--warning)]"
              >
                <Trash2 size={14} className="text-text-muted" /> Delete
              </button>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}

/* ── a single note card on the board ──────────────────────────────────────── */
function NoteCard({
  note,
  onEdit,
  onMenu,
  menuOpen,
}: {
  note: Note;
  onEdit: () => void;
  onMenu: (anchor: HTMLElement) => void;
  menuOpen?: boolean;
}) {
  const hasBody = hasContent(note.body);
  // the read-only preview is raw HTML — idb:// refs are neutralised to data-idb
  // BEFORE they hit the DOM (no broken-image flash / unknown-scheme errors),
  // then resolved to object URLs once mounted
  const bodyRef = useRef<HTMLDivElement>(null);
  const previewHtml = useMemo(
    () =>
      note.body.replace(
        /<img\b([^>]*?)\ssrc="(idb:\/\/[^"]+)"/g,
        '<img$1 data-idb="$2"',
      ),
    [note.body],
  );
  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLImageElement>("img[data-idb]").forEach((img) => {
      const ref = img.getAttribute("data-idb") ?? "";
      if (ref.startsWith(IDB_PREFIX))
        void resolveImage(ref).then((u) => {
          if (u) img.src = u;
        });
    });
  }, [previewHtml]);
  return (
    <div
      onClick={onEdit}
      style={{ background: colorCard(note.color) }}
      className="group relative flex h-[360px] w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border p-5 text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onMenu(e.currentTarget);
        }}
        className={
          "absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-lg text-text-faint transition hover:bg-[var(--hover-overlay)] hover:text-text " +
          (menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100")
        }
        title="More actions"
      >
        <MoreVertical size={15} />
      </button>

      {/* header — stays on the colored area, above the white text box */}
      {note.title && (
        <h3
          style={{ color: headColor(note.color) }}
          className="mb-2.5 line-clamp-2 shrink-0 px-0.5 pr-7 text-[20px] font-semibold leading-tight"
        >
          {note.favorite && (
            <Star
              size={16}
              fill="currentColor"
              className="mr-1.5 inline align-[-2px] text-amber-500"
            />
          )}
          {note.title}
        </h3>
      )}
      {(hasBody || note.tags.length > 0) && (
        <div className="note-paper flex min-h-0 flex-1 flex-col">
          {/* tags — inside the white box, above the body */}
          {note.tags.length > 0 && (
            <div className="mb-2.5 flex shrink-0 flex-wrap gap-1.5">
              {note.tags.map((t) => {
                const s = tagStyle(t);
                return (
                  <span
                    key={t}
                    style={{ background: s.bg, color: s.fg }}
                    className="rounded-md px-1.5 py-0.5 text-[11px] font-medium"
                  >
                    {t}
                  </span>
                );
              })}
            </div>
          )}
          {hasBody && (
            <div
              ref={bodyRef}
              className="note-card-body journal note-rich min-h-0 flex-1"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ── rich-text body editor (same "/" command menu as the journal) ─────────── */
function NoteEditor({
  initialHtml,
  onChange,
  favorites,
  pageLinks,
}: {
  initialHtml: string;
  onChange: (html: string) => void;
} & NotesJournalWiring) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExt,
      Link.configure({ openOnClick: false, autolink: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      // the journal's image node (resizable, idb:// + legacy base64 aware)
      ResizableImage,
      Placeholder.configure({
        showOnlyCurrent: true,
        placeholder: ({ node }) =>
          node.type.name === "heading"
            ? "Heading"
            : "Write your note, or type / for commands",
      }),
      TextStyle,
      TextColor,
      BgColor,
      BlockStyle,
      FontFamily,
      FontSize,
      LetterSpacing,
      TaskListVariant,
      TaskItem.configure({ nested: true }),
      // the slash menu offers every registered command — the schema must back
      // ALL of them here too, or picking one throws / silently mangles content
      Table.configure({ resizable: true, allowTableNodeSelection: true }),
      TableRow,
      TableHeader,
      TableCell,
      Callout,
      Toggle,
      Tag,
      TradeTable,
      JournalStats,
      IconNode,
      Banner,
      DayHeader, // so /day never throws here (a note has no date — stats stay blank)
      TrailingNode,
      PageLink.configure({
        getEntries: pageLinks ? pageLinks.getEntries : () => [],
        onOpen: pageLinks ? pageLinks.onOpen : () => {},
      }),
      TradeLink.configure({
        getTrades: () => (allTrades().length ? allTrades() : MOCK_TRADES),
        onOpen: (id) => window.dispatchEvent(new CustomEvent("alltra:trade", { detail: { id } })),
      }),
      ListExit,
      SlashCommand.configure(
        favorites ? { favorites } : {}
      ),
    ],
    content: initialHtml || "",
    autofocus: "end",
    editorProps: {
      attributes: { class: "pm", spellcheck: "false" },
      ...imagePasteProps, // paste / drop screenshots here too
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // floating AI/selection menu — same as the journal, scoped to this editor
  const hostRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<MenuState>(null);
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => {
    function onChange() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return setMenu(null);
      const range = sel.getRangeAt(0);
      const host = hostRef.current;
      if (!host || !host.contains(range.commonAncestorContainer))
        return setMenu(null);
      const r = range.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return setMenu(null);
      setMenu({ x: r.left + r.width / 2, y: r.top - 8, text: sel.toString() });
    }
    document.addEventListener("selectionchange", onChange);
    return () => document.removeEventListener("selectionchange", onChange);
  }, []);

  const runAI = async (action: AiAction) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, " ").trim();
    if (!text) return;
    setMenu(null);
    setAiBusy(true);
    try {
      const result = await aiTransform(action, text);
      if (result)
        editor.chain().focus().insertContentAt({ from, to }, result).run();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "AI request failed.");
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div ref={hostRef}>
      <EditorContent editor={editor} className="journal note-rich" />
      {/* render above the composer modal (z-600) */}
      <SelectionMenu
        menu={menu}
        onAI={runAI}
        onClose={() => setMenu(null)}
        zIndex={700}
      />
      {aiBusy &&
        createPortal(
          <div className="fixed left-1/2 top-5 z-[800] flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-elevated px-4 py-2 text-[13px] font-medium text-text shadow-lg">
            <Loader2 size={15} className="animate-spin text-[var(--alltra-brand)]" />
            Rewriting with AI…
          </div>,
          document.body
        )}
    </div>
  );
}

/* ── the popup composer (new + edit) ──────────────────────────────────────── */
function Composer({
  note,
  onSave,
  onCancel,
  onDelete,
  onSaveNow,
  favorites,
  pageLinks,
}: {
  note: Note;
  onSave: (n: Note) => void;
  onCancel: () => void;
  onDelete?: () => void;
  /** Synchronous save (writes localStorage immediately) for navigate-away paths. */
  onSaveNow?: (n: Note) => void;
} & NotesJournalWiring) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [tags, setTags] = useState<string[]>(note.tags);
  const [color, setColor] = useState(note.color);
  const [tagInput, setTagInput] = useState("");

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };
  const canSave = title.trim().length > 0 || hasContent(body);
  const commit = () =>
    onSave({
      ...note,
      title: title.trim(),
      body, // rich HTML from the editor
      tags,
      color,
      updatedAt: Date.now(),
    });

  // opening a page link navigates to the journal, unmounting this modal in the
  // SAME React batch — state-based saving would be discarded before the persist
  // effect runs, so build the latest note via a ref and save synchronously.
  const noteNowRef = useRef<() => Note>(() => note);
  noteNowRef.current = () => ({
    ...note,
    title: title.trim(),
    body,
    tags,
    color,
    updatedAt: Date.now(),
  });
  const pageLinksForEditor = pageLinks
    ? {
        getEntries: pageLinks.getEntries,
        onOpen: (date: string, linkTitle: string) => {
          onSaveNow?.(noteNowRef.current());
          pageLinks.onOpen(date, linkTitle);
        },
      }
    : undefined;

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={onCancel}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{ background: colorCard(color) }}
        className="max-h-[92vh] w-full max-w-[780px] overflow-y-auto rounded-2xl border border-border p-7 shadow-xl"
      >
        {/* color swatches + close */}
        <div className="mb-3 flex items-center gap-2">
          {NOTE_COLORS.map((c) => (
            <button
              key={c.key}
              onClick={() => setColor(c.key)}
              title={c.key}
              style={{
                background: c.card,
                borderColor:
                  color === c.key ? "var(--text-primary)" : "var(--border)",
              }}
              className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
            />
          ))}
          <button
            onClick={onCancel}
            className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-text-faint transition-colors hover:bg-[var(--hover-overlay)] hover:text-text"
          >
            <X size={16} />
          </button>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          style={{ color: headColor(color) }}
          className="w-full bg-transparent text-[21px] font-semibold outline-none placeholder:text-text-faint"
        />
        <div className="note-paper mt-3">
          <NoteEditor
            initialHtml={note.body}
            onChange={setBody}
            favorites={favorites}
            pageLinks={pageLinksForEditor}
          />

          {/* tags — inside the white box */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[rgba(0,0,0,0.07)] pt-3">
          {tags.map((t) => {
            const s = tagStyle(t);
            return (
              <span
                key={t}
                style={{ background: s.bg, color: s.fg }}
                className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
              >
                {t}
                <button
                  onClick={() => setTags(tags.filter((x) => x !== t))}
                  className="transition-opacity hover:opacity-70"
                >
                  <X size={11} />
                </button>
              </span>
            );
          })}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              } else if (e.key === "Backspace" && !tagInput && tags.length) {
                setTags(tags.slice(0, -1));
              }
            }}
            onBlur={addTag}
            placeholder={tags.length ? "Add tag…" : "Add tags…"}
            className="min-w-[90px] flex-1 bg-transparent text-[12.5px] text-text outline-none placeholder:text-text-faint"
          />
          </div>
        </div>

        {/* footer */}
        <div className="mt-4 flex items-center justify-between">
          {onDelete ? (
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium text-text-muted transition-colors hover:bg-[var(--hover-overlay)] hover:text-[var(--warning)]"
            >
              <Trash2 size={14} /> Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="rounded-lg border border-border bg-card px-3.5 py-2 text-[13px] font-medium text-text-muted shadow-sm transition-colors hover:bg-card-hover hover:text-text"
            >
              Cancel
            </button>
            <button
              onClick={commit}
              disabled={!canSave}
              className="rounded-lg bg-[var(--alltra-brand)] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

