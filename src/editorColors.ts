/**
 * The unified editor color palette — the SAME 15-accent Interface palette the
 * Alltra desktop editor's Text / Highlight / Badge / Tag pickers use, so the
 * journal speaks the same color vocabulary. Names + order match the desktop
 * (v2.ACCENT_PALETTE); hex values are the palette base steps (blue-500,
 * indigo-500, purple-500 … slate-400) the accents resolve to.
 */
export interface AccentColor {
  readonly id: string;
  readonly name: string;
  readonly hex: string;
}

export const ACCENT_PALETTE: readonly AccentColor[] = [
  { id: "alltra", name: "Alltra", hex: "#3b82f6" },
  { id: "indigo", name: "Indigo", hex: "#6366f1" },
  { id: "purple", name: "Purple", hex: "#a855f7" },
  { id: "pink", name: "Pink", hex: "#ec4899" },
  { id: "rose", name: "Rose", hex: "#f43f5e" },
  { id: "red", name: "Red", hex: "#ef4444" },
  { id: "ruby", name: "Ruby", hex: "#e11d48" },
  { id: "orange", name: "Orange", hex: "#f97316" },
  { id: "peach", name: "Peach", hex: "#fdba74" },
  { id: "gold", name: "Gold", hex: "#f59e0b" },
  { id: "lime", name: "Lime", hex: "#84cc16" },
  { id: "green", name: "Green", hex: "#22c55e" },
  { id: "teal", name: "Teal", hex: "#14b8a6" },
  { id: "sky", name: "Sky", hex: "#0ea5e9" },
  { id: "platinum", name: "Platinum", hex: "#94a3b8" },
];

/** A low-alpha wash of an accent hex — the Highlight treatment (vs Badge's solid fill). */
export function washOf(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0.24)`;
}
