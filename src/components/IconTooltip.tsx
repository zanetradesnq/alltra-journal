import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";

interface IconTooltipProps {
  label: string;
  isVisible: boolean;
  position?: "right" | "top" | "bottom";
  offset?: number;
  buttonRef: RefObject<HTMLElement>;
}

/**
 * Minimal hover tooltip used by the app chrome (matches the Alltra IconTooltip
 * contract: label / isVisible / position / offset / buttonRef).
 */
export function IconTooltip({
  label,
  isVisible,
  position = "right",
  offset = 8,
  buttonRef,
}: IconTooltipProps) {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null
  );

  useLayoutEffect(() => {
    if (!isVisible || !buttonRef.current) return;
    const r = buttonRef.current.getBoundingClientRect();
    if (position === "right")
      setCoords({ top: r.top + r.height / 2, left: r.right + offset });
    else if (position === "bottom")
      setCoords({ top: r.bottom + offset, left: r.left + r.width / 2 });
    else setCoords({ top: r.top - offset, left: r.left + r.width / 2 });
  }, [isVisible, position, offset, buttonRef]);

  if (!isVisible || !coords) return null;

  const transform =
    position === "right"
      ? "translateY(-50%)"
      : position === "bottom"
      ? "translate(-50%, 0)"
      : "translate(-50%, -100%)";

  return (
    <div
      style={{
        position: "fixed",
        top: coords.top,
        left: coords.left,
        transform,
        zIndex: 1200,
        background: "var(--surface-4)",
        color: "var(--text-primary)",
        border: "1px solid var(--border-3)",
        boxShadow: "var(--shadow-sm)",
        borderRadius: "var(--radius-md)",
        padding: "5px 9px",
        fontSize: 11.5,
        fontWeight: 500,
        fontFamily: "var(--font-geist-sans)",
        whiteSpace: "nowrap",
        pointerEvents: "none",
      }}
    >
      {label}
    </div>
  );
}
