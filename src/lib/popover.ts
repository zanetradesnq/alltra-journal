/**
 * Shared popover placement — one source of truth for every floating layer in the
 * app (block menu, selection bubble, table toolbar, slash menu, and the inline
 * node pickers). Goals:
 *   • prefer a side (below / above) but FLIP when there isn't room in the viewport
 *   • always clamp fully on-screen (never clipped at an edge)
 * Coordinates are viewport-relative, matching `position: fixed` + getBoundingClientRect.
 */
import {
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

export interface AnchorRect {
  left: number;
  top: number;
  right?: number; // defaults to left (point anchors)
  bottom?: number; // defaults to top (point anchors)
}

export interface PlaceOpts {
  gap?: number; // px between anchor edge and popover (default 6)
  margin?: number; // min px from any viewport edge (default 8)
  prefer?: "below" | "above"; // preferred vertical side (default "below")
  align?: "left" | "center" | "right"; // horizontal align to the anchor (default "left")
}

/** Compute a flipped + clamped {x,y} top-left corner for a popover of popW×popH. */
export function placePopover(
  anchor: AnchorRect,
  popW: number,
  popH: number,
  opts: PlaceOpts = {}
): { x: number; y: number } {
  const gap = opts.gap ?? 6;
  const margin = opts.margin ?? 8;
  const prefer = opts.prefer ?? "below";
  const align = opts.align ?? "left";
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const right = anchor.right ?? anchor.left;
  const bottom = anchor.bottom ?? anchor.top;

  // ── vertical: below vs above, whichever the anchor leaves room for ──
  const belowTop = bottom + gap;
  const aboveTop = anchor.top - gap - popH;
  const spaceBelow = vh - bottom - gap - margin; // max popH that fits below
  const spaceAbove = anchor.top - gap - margin; // max popH that fits above
  let y: number;
  if (prefer === "below") {
    y = popH <= spaceBelow || spaceBelow >= spaceAbove ? belowTop : aboveTop;
  } else {
    y = popH <= spaceAbove || spaceAbove >= spaceBelow ? aboveTop : belowTop;
  }
  y = Math.max(margin, Math.min(y, vh - popH - margin));

  // ── horizontal: align to anchor, then clamp ──
  let x: number;
  if (align === "center") x = (anchor.left + right) / 2 - popW / 2;
  else if (align === "right") x = right - popW;
  else x = anchor.left;
  x = Math.max(margin, Math.min(x, vw - popW - margin));

  return { x, y };
}

/** Place a side fly-out: prefer to the right of the anchor, flip left if no room. */
export function placeSide(
  anchor: AnchorRect,
  popW: number,
  popH: number,
  opts: { gap?: number; margin?: number } = {}
): { x: number; y: number } {
  const gap = opts.gap ?? 4;
  const margin = opts.margin ?? 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const right = anchor.right ?? anchor.left;
  let x = right + gap;
  if (x + popW > vw - margin) x = anchor.left - gap - popW; // flip to the left
  x = Math.max(margin, Math.min(x, vw - popW - margin));
  let y = anchor.top;
  y = Math.max(margin, Math.min(y, vh - popH - margin));
  return { x, y };
}

/**
 * Self-measuring placement hook. Renders decisions from the popover's REAL size
 * (via a ResizeObserver, so dynamic content — filtered lists, opening fly-outs —
 * re-places automatically) and re-runs on scroll/resize. Returns null until the
 * first measurement; callers gate visibility on that to avoid a mis-placed flash.
 */
export function useFlipPosition(
  open: boolean,
  getAnchor: () => AnchorRect | null,
  popRef: RefObject<HTMLElement | null>,
  opts?: PlaceOpts
): { x: number; y: number } | null {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const getAnchorRef = useRef(getAnchor);
  getAnchorRef.current = getAnchor;
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    let raf = 0;
    const place = () => {
      const el = popRef.current;
      const anchor = getAnchorRef.current();
      if (!el || !anchor) {
        raf = requestAnimationFrame(place);
        return;
      }
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) {
        raf = requestAnimationFrame(place);
        return;
      }
      const next = placePopover(anchor, r.width, r.height, optsRef.current);
      setPos((prev) =>
        prev && prev.x === next.x && prev.y === next.y ? prev : next
      );
    };
    place();
    const ro = new ResizeObserver(place);
    if (popRef.current) ro.observe(popRef.current);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return pos;
}
