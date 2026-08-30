/**
 * imageStore — screenshots live in IndexedDB, not in the document.
 *
 * Images used to ride inside entry HTML as base64 data URLs, which put every
 * pasted chart against localStorage's ~5 MB TOTAL ceiling (a week of
 * TradingView screenshots). Now an image is written to IndexedDB once and the
 * document only carries a tiny `idb://<id>` reference; node views resolve the
 * reference to an object URL at render time (`useImageSrc`). Legacy data URLs
 * keep working untouched — `resolveImage` passes anything else straight through.
 *
 * Large uploads are downscaled (max 2000px, JPEG) before storage so a 4 MB
 * phone photo doesn't cost 4 MB per copy. Orphaned blobs are pruned on persist
 * (`pruneImages`) against every idb:// reference still present in the journal.
 */
import { useEffect, useState } from "react";

const DB_NAME = "alltra-journal-images";
const STORE = "images";
export const IDB_PREFIX = "idb://";

let dbPromise: Promise<IDBDatabase> | null = null;
function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexedDB open failed"));
  });
  return dbPromise;
}

const uid = (): string => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/* ── downscale — big screenshots become ≤2000px JPEGs; small ones stay as-is ── */
const BIG = 600 * 1024;
const MAX_EDGE = 2000;
async function downscale(blob: Blob): Promise<Blob> {
  if (blob.size <= BIG || typeof createImageBitmap !== "function") return blob;
  try {
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return blob;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const out = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.86));
    return out && out.size < blob.size ? out : blob;
  } catch {
    return blob;
  }
}

/* every blob written THIS session is protected from pruning: an undo can bring
   a deleted image back at any time, and a persist can fire in the gap between
   the blob landing and its reference reaching the document. Pruning therefore
   runs once at startup (undo history doesn't survive a reload) — see App. */
const sessionIds = new Set<string>();

/** Store an image blob; resolves to its `idb://<id>` reference. */
export async function storeImage(blob: Blob): Promise<string> {
  const data = await downscale(blob);
  const db = await openDb();
  const id = uid();
  sessionIds.add(id);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(data, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("indexedDB write failed"));
  });
  return IDB_PREFIX + id;
}

/** Store a data URL (legacy producers) → `idb://` reference. */
export async function storeDataUrl(dataUrl: string): Promise<string> {
  const res = await fetch(dataUrl);
  return storeImage(await res.blob());
}

/* ── resolve — idb:// → object URL (cached per id); anything else passes through */
const urlCache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();
export async function resolveImage(src: string): Promise<string> {
  if (!src.startsWith(IDB_PREFIX)) return src;
  const id = src.slice(IDB_PREFIX.length);
  const cached = urlCache.get(id);
  if (cached) return cached;
  const inflight = pending.get(id);
  if (inflight) return inflight;
  const p = (async () => {
    const db = await openDb();
    const blob = await new Promise<Blob | undefined>((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result as Blob | undefined);
      req.onerror = () => reject(req.error ?? new Error("indexedDB read failed"));
    });
    const url = blob ? URL.createObjectURL(blob) : "";
    urlCache.set(id, url);
    pending.delete(id);
    return url;
  })();
  pending.set(id, p);
  return p;
}

/** React hook: the displayable URL for an image src (idb:// resolved async). */
export function useImageSrc(src: string | null | undefined): string | undefined {
  const isRef = !!src && src.startsWith(IDB_PREFIX);
  const [resolved, setResolved] = useState<string | undefined>(() =>
    isRef ? urlCache.get(src.slice(IDB_PREFIX.length)) : (src ?? undefined),
  );
  useEffect(() => {
    let alive = true;
    if (!src) {
      setResolved(undefined);
      return;
    }
    if (!src.startsWith(IDB_PREFIX)) {
      setResolved(src);
      return;
    }
    resolveImage(src).then((u) => {
      if (alive) setResolved(u || undefined);
    });
    return () => {
      alive = false;
    };
  }, [src]);
  return resolved;
}

/** Every idb:// id referenced anywhere in the given HTML/JSON strings. */
export function collectImageIds(texts: string[]): Set<string> {
  const ids = new Set<string>();
  const re = /idb:\/\/([a-z0-9]+)/g;
  for (const t of texts) {
    if (!t) continue;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t)) !== null) ids.add(m[1]);
  }
  return ids;
}

/** Delete blobs no document references any more. Call ONCE at startup, never
 *  per persist: a deleted image must survive for Ctrl+Z, and a paste's blob
 *  exists briefly before its reference does. */
export async function pruneImages(keep: Set<string>): Promise<void> {
  try {
    const db = await openDb();
    const keys = await new Promise<string[]>((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).getAllKeys();
      req.onsuccess = () => resolve(req.result as string[]);
      req.onerror = () => reject(req.error ?? new Error("indexedDB keys failed"));
    });
    const stale = keys.filter((k) => !keep.has(k) && !sessionIds.has(k));
    if (stale.length === 0) return;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      stale.forEach((k) => tx.objectStore(STORE).delete(k));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("indexedDB delete failed"));
    });
    stale.forEach((k) => {
      const u = urlCache.get(k);
      if (u) URL.revokeObjectURL(u);
      urlCache.delete(k);
    });
  } catch {
    /* pruning is best-effort */
  }
}

/* ── paste / drop — screenshots straight into the editor (ProseMirror props) ── */
import type { EditorView } from "@tiptap/pm/view";

function insertImageAt(view: EditorView, src: string, pos: number | null): void {
  const type = view.state.schema.nodes.image;
  if (!type) return;
  const node = type.create({ src });
  const tr = view.state.tr;
  if (pos === null) tr.replaceSelectionWith(node);
  else tr.insert(pos, node);
  view.dispatch(tr.scrollIntoView());
}

const imageFiles = (list: FileList | null | undefined): File[] =>
  Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));

/**
 * editorProps for any TipTap editor with an `image` node: Ctrl+V a screenshot
 * or drop image files → stored in IndexedDB, inserted as `idb://` images.
 */
export const imagePasteProps = {
  handlePaste(view: EditorView, event: ClipboardEvent): boolean {
    // Excel/Word put a PNG rendition beside real text — when there IS text,
    // let the default paste handle it (a copied screenshot carries no text)
    if ((event.clipboardData?.getData("text/plain") ?? "").trim()) return false;
    const files = imageFiles(event.clipboardData?.files);
    if (files.length === 0) return false;
    event.preventDefault();
    void (async () => {
      for (const f of files) insertImageAt(view, await storeImage(f), null);
    })();
    return true;
  },
  handleDrop(view: EditorView, event: DragEvent, _slice: unknown, moved: boolean): boolean {
    if (moved) return false;
    const files = imageFiles(event.dataTransfer?.files);
    if (files.length === 0) return false;
    event.preventDefault();
    const at = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? null;
    void (async () => {
      let pos = at;
      for (const f of files) {
        const src = await storeImage(f);
        insertImageAt(view, src, pos);
        if (pos !== null) pos += 1;
      }
    })();
    return true;
  },
};
