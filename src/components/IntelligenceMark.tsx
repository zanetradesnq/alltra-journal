import type { JSX } from "react";

/**
 * The Alltra Intelligence mark — the product's own logo (two Alltra-derived
 * strokes + the counter dot), not a generic sparkle.
 *
 * Copied byte-for-byte from the Alltra app
 * (apps/alltra/src/features/site/components/landing/intelligence/IntelligenceMark.tsx,
 * itself a copy of `AIPanelIcon` in product-ui's app-marks). The viewBox is
 * hand-cut tight to the artwork. fill="currentColor", so every mount colours
 * it with the surrounding text colour. If the mark changes upstream, re-copy
 * the three shapes.
 */
export function IntelligenceMark({
  size,
  className = "",
}: {
  readonly size: number;
  readonly className?: string;
}): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="52.487 62.014 415.972 415.972"
      fill="currentColor"
      className={className}
      style={{ display: "block" }}
    >
      <polygon points="431.16,269.977 279.732,269.977 204.017,72.411 355.445,72.411" />
      <polygon points="128.202,270.018 52.487,467.585 203.915,467.585 279.631,270.018" />
      <ellipse cx="389.508" cy="383.899" rx="78.951" ry="83.683" />
    </svg>
  );
}

export default IntelligenceMark;
