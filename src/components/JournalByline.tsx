/**
 * JournalByline — the document header that sits above the journal body: a quiet
 * byline (avatar · name · last-updated) and a large, optional editable title
 * ("Untitled" when blank). Ported from the Alltra desktop's JournalStarter — the
 * title is CHROME persisted alongside the entry, not a doc heading node, so the
 * body stays clean. The <textarea> auto-grows so a long title wraps instead of
 * running off the paper.
 */
import { forwardRef, useLayoutEffect, useRef } from "react";

/** Hard cap on the entry title — long enough for a real title, short enough
 *  that the breadcrumb/nav rows stay sane. Shared with template application. */
export const TITLE_MAX = 100;

export interface JournalBylineProps {
  name: string;
  initial: string;
  avatarUrl?: string | undefined;
  /** the byline's right half — "Last updated at 3:19 PM" / "Saving…". */
  status: string;
  title: string;
  /** shown when the title is blank — the content-derived title, else "Untitled". */
  placeholder?: string;
  onTitleChange: (next: string) => void;
}

export const JournalByline = forwardRef<HTMLElement, JournalBylineProps>(function JournalByline(
  { name, initial, avatarUrl, status, title, placeholder = "Untitled", onTitleChange },
  ref,
) {
  // auto-grow the title textarea to its content height (it's rows=1 by default)
  const titleRef = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (el === null) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  return (
    <header ref={ref} className="jbyline">
      <div className="jbyline-meta">
        {avatarUrl ? (
          <img className="jbyline-avatar" src={avatarUrl} alt="" />
        ) : (
          <span className="jbyline-avatar jbyline-avatar-initial">{initial}</span>
        )}
        <span className="jbyline-name">{name}</span>
        <span className="jbyline-sep" aria-hidden="true">
          ·
        </span>
        <span className="jbyline-status">{status}</span>
      </div>
      <textarea
        ref={titleRef}
        className="jbyline-title"
        rows={1}
        maxLength={TITLE_MAX}
        value={title}
        placeholder={placeholder}
        aria-label="Journal title"
        spellCheck={false}
        // slice too: maxLength doesn't clamp a programmatic value, and paste
        // near the limit can otherwise land a full unclamped string in state
        onChange={(event) => onTitleChange(event.target.value.slice(0, TITLE_MAX))}
      />
    </header>
  );
});
