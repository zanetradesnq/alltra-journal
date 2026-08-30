/**
 * backup — the journal's insurance policy while it's browser-only.
 *
 * A backup is ONE self-contained JSON file: every `alltra-journal-*`
 * localStorage key (entries, notes, trade store, templates, pins, appearance)
 * plus every IndexedDB screenshot packed as base64. Restore either REPLACES the
 * journal with the file or MERGES the file's entries/notes/trades into what's
 * here (skipping exact duplicates). A Markdown export renders every entry as
 * readable text for use outside the app.
 */
import { exportImages, decodeImages, writeImages, clearImages, type ImageDump } from "./imageStore";

export const BACKUP_FORMAT = "alltra-journal-backup";
export const LAST_BACKUP_KEY = "alltra-journal-last-backup";
const PREFIX = "alltra-journal-";

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: 1;
  exportedAt: string;
  localStorage: Record<string, string>;
  images: ImageDump;
}

const stamp = (d = new Date()): string =>
  `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function download(name: string, data: string, type: string): void {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function readStorage(): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX) && k !== LAST_BACKUP_KEY) out[k] = localStorage.getItem(k) ?? "";
  }
  return out;
}

/* ── export ─────────────────────────────────────────────────────────────── */
export async function exportBackup(): Promise<void> {
  const file: BackupFile = {
    format: BACKUP_FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    localStorage: readStorage(),
    images: await exportImages(),
  };
  download(`alltra-journal-backup-${stamp()}.json`, JSON.stringify(file), "application/json");
  try {
    localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/** ms since the last backup, or null if never. */
export function lastBackupAge(): number | null {
  const raw = localStorage.getItem(LAST_BACKUP_KEY);
  const t = raw ? Number(raw) : NaN;
  return Number.isFinite(t) ? Date.now() - t : null;
}

/* ── import ─────────────────────────────────────────────────────────────── */
export type RestoreMode = "replace" | "merge";

export function parseBackup(text: string): BackupFile {
  const data = JSON.parse(text) as Partial<BackupFile>;
  if (data.format !== BACKUP_FORMAT || typeof data.localStorage !== "object" || !data.localStorage)
    throw new Error("That file isn't an Alltra Journal backup.");
  return { ...data, images: data.images ?? {}, version: 1 } as BackupFile;
}

interface EntriesPayload {
  pages: string[];
  dates: string[];
  titles?: string[];
  trash?: unknown[];
  [k: string]: unknown;
}
const parseJson = <T,>(raw: string | null | undefined, fallback: T): T => {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

/** Merge two entries payloads: append the file's pages that aren't already
 *  present (same date + same HTML = duplicate). Titles ride along in parallel. */
function mergeEntries(current: EntriesPayload, incoming: EntriesPayload): EntriesPayload {
  const seen = new Set(current.pages.map((p, i) => `${current.dates[i] ?? ""}
${p}`));
  const pages = [...current.pages];
  const dates = [...current.dates];
  const titles = [...(current.titles ?? [])];
  while (titles.length < pages.length) titles.push("");
  incoming.pages.forEach((p, i) => {
    const key = `${incoming.dates[i] ?? ""}
${p}`;
    if (seen.has(key) || !p.trim()) return;
    seen.add(key);
    pages.push(p);
    dates.push(incoming.dates[i] ?? dates[dates.length - 1] ?? "");
    titles.push(incoming.titles?.[i] ?? "");
  });
  const trash = [...(current.trash ?? []), ...(incoming.trash ?? [])];
  return { ...current, pages, dates, titles, trash };
}

/** Union arrays of `{id}` records by id (current wins). */
function mergeById<T extends { id?: string }>(current: T[], incoming: T[]): T[] {
  const ids = new Set(current.map((x) => x.id));
  return [...current, ...incoming.filter((x) => x.id && !ids.has(x.id))];
}

/**
 * Apply a backup. Resolves when storage is written — the caller reloads the
 * page so every store rehydrates from scratch.
 */
export async function restoreBackup(file: BackupFile, mode: RestoreMode): Promise<void> {
  // decode every image FIRST — a corrupt blob must fail before storage is touched
  const blobs = await decodeImages(file.images);
  if (mode === "replace") {
    Object.keys(readStorage()).forEach((k) => localStorage.removeItem(k));
    await clearImages();
    Object.entries(file.localStorage).forEach(([k, v]) => localStorage.setItem(k, v));
    try {
      await writeImages(blobs);
    } catch {
      /* entries are restored; a partial screenshot write mustn't undo that */
    }
    return;
  }
  // merge — entries, notes, trade store, custom templates and pins union;
  // appearance/settings keep the current values
  const cur = readStorage();
  const inc = file.localStorage;
  const next: Record<string, string> = { ...cur };

  const curEntries = parseJson<EntriesPayload | null>(cur[`${PREFIX}v1`], null);
  const incEntries = parseJson<EntriesPayload | null>(inc[`${PREFIX}v1`], null);
  if (incEntries?.pages) {
    next[`${PREFIX}v1`] = JSON.stringify(
      curEntries?.pages ? mergeEntries(curEntries, incEntries) : incEntries,
    );
  }
  for (const key of [`${PREFIX}notes`, `${PREFIX}custom-templates`]) {
    const a = parseJson<{ id?: string }[]>(cur[key], []);
    const b = parseJson<{ id?: string }[]>(inc[key], []);
    if (b.length) next[key] = JSON.stringify(mergeById(a, b));
  }
  {
    const key = `${PREFIX}trade-store`;
    const a = parseJson<Record<string, unknown>>(cur[key], {});
    const b = parseJson<Record<string, unknown>>(inc[key], {});
    next[key] = JSON.stringify({ ...b, ...a }); // current tables win on id clash
  }
  {
    const key = `${PREFIX}favorites`;
    const a = parseJson<string[]>(cur[key], []);
    const b = parseJson<string[]>(inc[key], []);
    next[key] = JSON.stringify([...a, ...b.filter((id) => !a.includes(id))]);
  }
  Object.entries(next).forEach(([k, v]) => localStorage.setItem(k, v));
  try {
    await writeImages(blobs);
  } catch {
    /* see above */
  }
}

/* ── Markdown export ─────────────────────────────────────────────────────── */
export interface MdEntry {
  date: string;
  title: string;
  html: string;
}

function inlineMd(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as HTMLElement;
  const kids = () => Array.from(el.childNodes).map(inlineMd).join("");
  const type = el.getAttribute("data-type");
  if (type === "tag") return `#${(el.textContent ?? "tag").trim().replace(/\s+/g, "-")}`;
  if (type === "icon") return el.textContent ?? "";
  // the link nodes serialize camelCase data-types (pageLink / tradeLink)
  if (type === "pageLink" || type === "page-link")
    return `[[${el.getAttribute("data-title") || el.getAttribute("data-date") || "entry"}]]`;
  if (type === "tradeLink" || type === "trade-link") {
    const sym = el.getAttribute("data-symbol") ?? "trade";
    const pnl = el.getAttribute("data-pnl");
    return `**${sym}**${pnl ? ` (${pnl})` : ""}`;
  }
  switch (el.tagName) {
    case "STRONG":
    case "B":
      return `**${kids()}**`;
    case "EM":
    case "I":
      return `*${kids()}*`;
    case "S":
    case "DEL":
      return `~~${kids()}~~`;
    case "CODE":
      return `\`${el.textContent ?? ""}\``;
    case "U":
      return kids();
    case "A":
      return `[${kids()}](${el.getAttribute("href") ?? ""})`;
    case "BR":
      return "  \n";
    case "IMG": {
      const src = el.getAttribute("src") ?? "";
      return src.startsWith("idb://") || src.startsWith("data:") ? "![screenshot](attached image)" : `![](${src})`;
    }
    default:
      return kids();
  }
}

function blockMd(el: Element, depth = 0): string {
  const type = el.getAttribute("data-type");
  const pad = "  ".repeat(depth);
  const inner = () => Array.from(el.childNodes).map(inlineMd).join("").trim();
  const children = () =>
    Array.from(el.children)
      .map((c) => blockMd(c, depth))
      .filter(Boolean)
      .join("\n");
  if (type === "banner" || type === "journal-stats") return "";
  if (type === "day-header") {
    const g = (k: string) => el.getAttribute(`data-${k}`);
    const bits = [
      g("before") && `Mood before: ${g("before")}/5`,
      g("during") && `Mood during: ${g("during")}/5`,
      g("after") && `Mood after: ${g("after")}/5`,
      g("rules") && `Rules followed: ${g("rules")}`,
      g("grade") && `Grade: ${g("grade")}`,
    ].filter(Boolean);
    return bits.length ? `> ${bits.join(" · ")}` : "";
  }
  if (type === "callout") return children().split("\n").map((l) => `> ${l}`).join("\n");
  if (type === "toggle") {
    const [head, ...rest] = Array.from(el.children);
    const title = head ? inlineMd(head).trim() : "Toggle";
    const body = rest.map((c) => blockMd(c, depth)).filter(Boolean).join("\n");
    return `<details><summary>${title}</summary>\n\n${body}\n\n</details>`;
  }
  if (type === "trade-table") {
    try {
      const data = JSON.parse(el.getAttribute("data-rows") ?? "{}") as {
        columns?: { id: string; name: string; type: string }[];
        rows?: { cells: Record<string, unknown> }[];
      };
      const cols = data.columns ?? [];
      if (!cols.length) return "";
      const cell = (v: unknown) => (Array.isArray(v) ? (v.length ? `${String(v.length)} image(s)` : "") : String(v ?? ""));
      const lines = [
        `| ${cols.map((c) => c.name).join(" | ")} |`,
        `| ${cols.map(() => "---").join(" | ")} |`,
        ...(data.rows ?? []).map((r) => `| ${cols.map((c) => cell(r.cells[c.id]).replace(/\|/g, "\\|")).join(" | ")} |`),
      ];
      return lines.join("\n");
    } catch {
      return "";
    }
  }
  switch (el.tagName) {
    case "H1":
      return `# ${inner()}`;
    case "H2":
      return `## ${inner()}`;
    case "H3":
      return `### ${inner()}`;
    case "P":
      return inner() ? `${pad}${inner()}` : "";
    case "HR":
      return "---";
    case "BLOCKQUOTE":
      return children().split("\n").map((l) => `> ${l}`).join("\n");
    case "PRE":
      return "```\n" + (el.textContent ?? "") + "\n```";
    case "UL":
    case "OL": {
      const ordered = el.tagName === "OL";
      const isTask = el.getAttribute("data-type") === "taskList";
      return Array.from(el.children)
        .map((li, i) => {
          const checked = li.getAttribute("data-checked") === "true";
          const marker = isTask ? `- [${checked ? "x" : " "}]` : ordered ? `${String(i + 1)}.` : "-";
          // TaskItem wraps its content: <label><input/></label><div><p>…</p><ul>…</ul></div>
          // — unwrap the <div> so nested lists split out, and drop the <label>
          const parts = Array.from(li.childNodes).flatMap((n) =>
            n instanceof Element && n.tagName === "DIV"
              ? Array.from(n.childNodes)
              : n instanceof Element && n.tagName === "LABEL"
                ? []
                : [n],
          );
          const text = parts
            .filter((n) => !(n instanceof Element) || !/^(UL|OL)$/.test(n.tagName))
            .map((n) => (n instanceof Element && n.tagName === "P" ? inlineMd(n) : inlineMd(n)))
            .join("")
            .trim();
          const nested = parts
            .filter((n): n is Element => n instanceof Element && /^(UL|OL)$/.test(n.tagName))
            .map((n) => blockMd(n, depth + 1))
            .join("\n");
          return `${pad}${marker} ${text}${nested ? `\n${nested}` : ""}`;
        })
        .join("\n");
    }
    case "TABLE": {
      const rows = Array.from(el.querySelectorAll("tr"));
      if (!rows.length) return "";
      const cells = (tr: Element) => Array.from(tr.children).map((td) => inlineMd(td).replace(/\|/g, "\\|").trim());
      const head = cells(rows[0]);
      return [
        `| ${head.join(" | ")} |`,
        `| ${head.map(() => "---").join(" | ")} |`,
        ...rows.slice(1).map((r) => `| ${cells(r).join(" | ")} |`),
      ].join("\n");
    }
    case "IMG":
      return inlineMd(el);
    case "DIV":
      return children();
    default:
      return inner();
  }
}

export function htmlToMarkdown(html: string): string {
  const root = document.createElement("div");
  root.innerHTML = html;
  return Array.from(root.children)
    .map((c) => blockMd(c))
    .filter(Boolean)
    .join("\n\n");
}

/** One .md with every entry, newest first, as `## Date — Title` sections. */
export function exportMarkdown(entries: MdEntry[]): void {
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const body = sorted
    .map((e) => {
      const title = e.title.trim() || "Untitled";
      return `## ${e.date} — ${title}\n\n${htmlToMarkdown(e.html) || "_(empty)_"}`;
    })
    .join("\n\n---\n\n");
  download(`alltra-journal-${stamp()}.md`, `# Alltra Journal\n\nExported ${new Date().toLocaleString()}\n\n${body}\n`, "text/markdown");
}
