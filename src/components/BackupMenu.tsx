/**
 * BackupMenu — the top-bar "Backup" button: download a full backup, export
 * Markdown, or restore from a backup file (replace / merge). A quiet dot on the
 * button nags when the journal has content and hasn't been backed up in a week.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, FileText, Upload, ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";
import {
  exportBackup,
  exportMarkdown,
  parseBackup,
  restoreBackup,
  lastBackupAge,
  type BackupFile,
  type MdEntry,
  type RestoreMode,
} from "../backup";
import { decodeImages } from "../imageStore";

const WEEK = 7 * 24 * 60 * 60 * 1000;

export function BackupMenu({
  entries,
  hasContent,
}: {
  /** lazy — only read when the user exports Markdown */
  entries: () => MdEntry[];
  hasContent: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<{ file: BackupFile; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const age = lastBackupAge();
  const nag = hasContent && (age === null || age > WEEK);

  useEffect(() => {
    if (!open) return;
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ x: r.right, y: r.bottom + 6 });
    const close = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest?.("[data-backup-menu]") && t !== btnRef.current && !btnRef.current?.contains(t))
        setOpen(false);
    };
    document.addEventListener("mousedown", close, true);
    return () => document.removeEventListener("mousedown", close, true);
  }, [open]);

  const run = async (label: string, fn: () => Promise<void>) => {
    setOpen(false);
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setOpen(false);
    setError(null);
    f.text()
      .then((text) => setPending({ file: parseBackup(text), name: f.name }))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Couldn't read that file."));
  };

  const restore = (mode: RestoreMode) => {
    if (!pending) return;
    const file = pending.file;
    setPending(null);
    void run(mode === "replace" ? "Restoring…" : "Merging…", async () => {
      // phase 1 — decode, touching nothing: a corrupt image shows the error
      // dialog and the journal is untouched (no reload)
      const blobs = await decodeImages(file.images);
      // phase 2 — write: after this point ALWAYS rehydrate from whatever
      // storage now holds, or the old journal in memory would autosave over
      // the restored one
      try {
        await restoreBackup(file, mode, blobs);
      } finally {
        window.location.reload();
      }
    });
  };

  const fileEntries = (() => {
    try {
      const raw = pending?.file.localStorage["alltra-journal-v1"];
      const n = raw ? (JSON.parse(raw) as { pages?: string[] }).pages?.length ?? 0 : 0;
      return n;
    } catch {
      return 0;
    }
  })();

  return (
    <>
      <button
        ref={btnRef}
        title={nag ? "Back up your journal — it only lives in this browser" : "Backup & export"}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-8 w-8 place-items-center rounded-[8px] text-text-muted transition-colors hover:bg-[var(--hover-overlay)] hover:text-text"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
        {nag && !busy && (
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--warning)]" />
        )}
      </button>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onPick} />

      {open &&
        pos &&
        createPortal(
          <div
            data-backup-menu
            className="tpp-menu"
            style={{ left: Math.max(8, Math.min(pos.x - 232, window.innerWidth - 240)), top: pos.y, width: 232 }}
          >
            <button type="button" className="tpp-menu__row" onClick={() => void run("Backing up…", exportBackup)}>
              <Download size={14} /> Download backup
              <span className="tpp-menu__note">.json</span>
            </button>
            <button
              type="button"
              className="tpp-menu__row"
              onClick={() => void run("Exporting…", async () => exportMarkdown(entries()))}
            >
              <FileText size={14} /> Export as Markdown
              <span className="tpp-menu__note">.md</span>
            </button>
            <div className="tpp-menu__sep" />
            <button type="button" className="tpp-menu__row" onClick={() => fileRef.current?.click()}>
              <Upload size={14} /> Restore from backup…
            </button>
            <div className="px-2 pb-1 pt-1.5 text-[10.5px] leading-snug text-text-faint">
              {age === null
                ? "Never backed up. The journal lives only in this browser."
                : `Last backup ${Math.max(1, Math.round(age / 86400000))}d ago.`}
            </div>
          </div>,
          document.body,
        )}

      {(pending || error) &&
        createPortal(
          <div
            className="fixed inset-0 z-[700] flex items-center justify-center bg-black/45 p-4"
            onMouseDown={() => {
              setPending(null);
              setError(null);
            }}
          >
            <div
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full max-w-[440px] rounded-2xl border border-border bg-elevated p-5 shadow-xl"
            >
              {error ? (
                <>
                  <div className="mb-2 flex items-center gap-2 text-[14px] font-semibold text-text">
                    <AlertTriangle size={16} className="text-[var(--warning)]" /> Couldn't restore
                  </div>
                  <p className="text-[13px] leading-relaxed text-text-muted">{error}</p>
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => setError(null)}
                      className="rounded-lg border border-border bg-card px-3.5 py-2 text-[13px] font-medium text-text shadow-sm hover:bg-card-hover"
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : pending ? (
                <>
                  <div className="mb-1 text-[15px] font-semibold text-text">Restore from backup</div>
                  <p className="text-[12.5px] leading-relaxed text-text-muted">
                    <span className="font-medium text-text">{pending.name}</span> · {fileEntries}{" "}
                    {fileEntries === 1 ? "entry" : "entries"} ·{" "}
                    {Object.keys(pending.file.images).length} screenshots · exported{" "}
                    {new Date(pending.file.exportedAt).toLocaleString()}
                  </p>
                  <div className="mt-4 grid gap-2">
                    <button
                      onClick={() => restore("merge")}
                      className="rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm transition-colors hover:bg-card-hover"
                    >
                      <div className="text-[13.5px] font-semibold text-text">Merge into this journal</div>
                      <div className="mt-0.5 text-[12px] text-text-muted">
                        Adds the file's entries, notes, trades and templates. Nothing here is removed;
                        exact duplicates are skipped.
                      </div>
                    </button>
                    <button
                      onClick={() => restore("replace")}
                      className="rounded-xl border border-[rgba(240,78,94,0.35)] bg-card px-4 py-3 text-left shadow-sm transition-colors hover:bg-card-hover"
                    >
                      <div className="text-[13.5px] font-semibold text-[var(--danger)]">Replace everything</div>
                      <div className="mt-0.5 text-[12px] text-text-muted">
                        Wipes this browser's journal and restores the file exactly. Download a backup
                        first if anything here matters.
                      </div>
                    </button>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => setPending(null)}
                      className="rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-text-muted hover:text-text"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
