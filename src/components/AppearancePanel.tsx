/**
 * Appearance panel — the Alltra v3 theme + accent picker, ported to the journal.
 * A right-docked drawer with the six themes (Light / Dark / Onyx / Amber / Iris
 * / Slate) as live mini-mockups, and the 15 interface accent colors. Selecting
 * a card writes data-theme / data-accent on <html> (handled by the host), so the
 * whole app restyles instantly.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Check } from "lucide-react";

export type ThemeName = "light" | "dark" | "onyx" | "amber" | "iris" | "slate";
export type AccentName =
  | "alltra" | "indigo" | "purple" | "pink" | "rose" | "red" | "ruby"
  | "orange" | "peach" | "gold" | "lime" | "green" | "teal" | "sky" | "platinum";

type Preview = {
  bg: string; window: string; bar: string; sidebar: string; surface3: string;
  hairline: string; accent: string; dim: string; dot: string; tileShadow: string;
  isLight: boolean;
};

const THEMES: { id: ThemeName; label: string; c: Preview }[] = [
  {
    id: "light", label: "Light",
    c: {
      bg: "radial-gradient(ellipse at 22% 20%, rgba(255,255,255,0.7) 0%, transparent 62%), linear-gradient(135deg, #FFFFFF 0%, #F4F6F8 45%, #DFE3E9 100%)",
      window: "#F7F7F8", bar: "#FEFEFE", sidebar: "#FEFEFE", surface3: "rgba(0,0,0,0.08)",
      hairline: "#E4E7EB", accent: "#1A75FF", dim: "#9CA0A8", dot: "rgba(90,97,107,0.5)",
      tileShadow: "0 1px 3px rgba(16,24,40,0.12), inset 0 1px 0 rgba(255,255,255,0.6)", isLight: true,
    },
  },
  {
    id: "dark", label: "Dark",
    c: {
      bg: "radial-gradient(ellipse at 50% 32%, #131416 0%, #0A0B0C 62%)",
      window: "#0A0B0C", bar: "#131416", sidebar: "#131416", surface3: "rgba(255,255,255,0.08)",
      hairline: "#1D2023", accent: "#1A75FF", dim: "#696F79", dot: "rgba(166,173,184,0.5)",
      tileShadow: "0 1px 3px rgba(0,0,0,0.5), inset 0 0.5px 0 rgba(255,255,255,0.06)", isLight: false,
    },
  },
  {
    id: "onyx", label: "Onyx",
    c: {
      bg: "radial-gradient(ellipse at 22% 18%, rgba(90,90,90,0.7) 0%, transparent 60%), radial-gradient(ellipse at 50% 95%, rgba(0,0,0,0.92) 0%, transparent 55%), linear-gradient(135deg, #484848 0%, #1A1A1A 35%, #0A0A0A 55%, #000000 100%)",
      window: "#000000", bar: "#080808", sidebar: "#080808", surface3: "rgba(255,255,255,0.08)",
      hairline: "#1A1A1A", accent: "#0EA5E9", dim: "#696F79", dot: "rgba(166,173,184,0.45)",
      tileShadow: "0 1px 3px rgba(0,0,0,0.7), inset 0 0.5px 0 rgba(255,255,255,0.06)", isLight: false,
    },
  },
  {
    id: "amber", label: "Amber",
    c: {
      bg: "radial-gradient(ellipse at 22% 20%, rgba(255,155,128,0.55) 0%, transparent 64%), radial-gradient(ellipse at 80% 28%, #FFD98C 0%, transparent 64%), linear-gradient(135deg, #FFF4DA 0%, #FFD489 40%, #FFA968 80%, #FF9460 100%)",
      window: "#0B0A08", bar: "#161513", sidebar: "#161513", surface3: "rgba(255,255,255,0.08)",
      hairline: "#201E1A", accent: "#F0B100", dim: "#726D64", dot: "rgba(167,162,155,0.5)",
      tileShadow: "0 1px 3px rgba(0,0,0,0.5), inset 0 0.5px 0 rgba(255,255,255,0.05)", isLight: false,
    },
  },
  {
    id: "iris", label: "Iris",
    c: {
      bg: "radial-gradient(ellipse at 22% 22%, #6366F1 0%, transparent 55%), radial-gradient(ellipse at 82% 30%, #4F46E5 0%, transparent 60%), linear-gradient(135deg, #08070F 0%, #1A1547 40%, #2E2585 80%, #3B33A6 100%)",
      window: "#0A0A0D", bar: "#151519", sidebar: "#151519", surface3: "rgba(255,255,255,0.08)",
      hairline: "#1E1E25", accent: "#6366F1", dim: "#6D6C75", dot: "rgba(161,160,171,0.5)",
      tileShadow: "0 1px 3px rgba(0,0,0,0.5), inset 0 0.5px 0 rgba(255,255,255,0.06)", isLight: false,
    },
  },
  {
    id: "slate", label: "Slate",
    c: {
      bg: "radial-gradient(ellipse at 25% 25%, #A7F3D0 0%, transparent 55%), radial-gradient(ellipse at 75% 75%, #34D399 0%, transparent 60%), linear-gradient(135deg, #EAFBF3 0%, #8DEFC4 40%, #10B981 80%, #059669 100%)",
      window: "#D6DAE0", bar: "#EAEBF0", sidebar: "#EAEBF0", surface3: "rgba(0,0,0,0.08)",
      hairline: "#DDDFE6", accent: "#10B981", dim: "#8E93A2", dot: "rgba(75,80,94,0.5)",
      tileShadow: "0 1px 3px rgba(16,24,40,0.12), inset 0 1px 0 rgba(255,255,255,0.6)", isLight: true,
    },
  },
];

const ACCENTS: { name: AccentName; label: string; hex: string }[] = [
  { name: "alltra", label: "Alltra", hex: "#0066FF" },
  { name: "indigo", label: "Indigo", hex: "#4338CA" },
  { name: "purple", label: "Purple", hex: "#A855F7" },
  { name: "pink", label: "Pink", hex: "#EC4899" },
  { name: "rose", label: "Rose", hex: "#F43F5E" },
  { name: "red", label: "Red", hex: "#EF4444" },
  { name: "ruby", label: "Ruby", hex: "#BE123C" },
  { name: "orange", label: "Orange", hex: "#F97316" },
  { name: "peach", label: "Peach", hex: "#FB923C" },
  { name: "gold", label: "Gold", hex: "#D4A017" },
  { name: "lime", label: "Lime", hex: "#84CC16" },
  { name: "green", label: "Green", hex: "#22C55E" },
  { name: "teal", label: "Teal", hex: "#14B8A6" },
  { name: "sky", label: "Sky", hex: "#0EA5E9" },
  { name: "platinum", label: "Platinum", hex: "#71717A" },
];

/* One theme preview card — a static mini app-mockup painted in the theme's real
   surfaces, with an accent title line. Selected → accent ring. */
function ThemeCard({
  t, selected, onSelect,
}: {
  t: (typeof THEMES)[number]; selected: boolean; onSelect: () => void;
}) {
  const { c } = t;
  const line = (w: string, h: number, bg: string, extra: object = {}) => (
    <div style={{ width: w, height: h, borderRadius: 2, background: bg, ...extra }} />
  );
  return (
    <button onClick={onSelect} className="group flex flex-col items-center gap-2">
      <div
        style={{
          position: "relative", width: "100%", aspectRatio: "16 / 10",
          borderRadius: 12, background: c.bg, overflow: "hidden",
          border: selected ? "2px solid var(--alltra-brand)" : "1px solid var(--border-3)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
      >
        {/* window */}
        <div
          style={{
            position: "absolute", top: "14%", left: "10%", width: "calc(90% + 2px)",
            height: "calc(86% + 2px)", borderRadius: "8px 0 8px 8px", background: c.window,
            overflow: "hidden",
            border: c.isLight ? "1px solid rgba(0,0,0,0.12)" : "1px solid rgba(255,255,255,0.12)",
            boxShadow: c.isLight
              ? "0 8px 24px rgba(0,0,0,0.14)"
              : "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          {/* titlebar */}
          <div style={{ height: "16%", background: c.bar, borderBottom: `1px solid ${c.hairline}`, display: "flex", alignItems: "center", gap: 3, paddingLeft: 7 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: c.dot }} />
            ))}
          </div>
          <div style={{ display: "flex", height: "84%" }}>
            {/* sidebar */}
            <div style={{ width: "26%", background: c.sidebar, borderRight: `1px solid ${c.hairline}`, padding: "5px 4px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {[0.66, 0.54, 0.7, 0.58].map((w, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 3, padding: "1.5px 2px", borderRadius: 2, background: i === 1 ? c.surface3 : "transparent", border: `0.5px solid ${i === 1 ? c.hairline : "transparent"}` }}>
                    <div style={{ width: 6, height: 6, flexShrink: 0, borderRadius: 2, background: c.surface3, border: `0.5px solid ${c.hairline}` }} />
                    {line(`${w * 100}%`, 3, c.dim)}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "1.5px 2px" }}>
                <div style={{ width: 9, height: 9, flexShrink: 0, borderRadius: "50%", background: c.surface3, border: `0.5px solid ${c.hairline}` }} />
                {line("52%", 3, c.dim)}
              </div>
            </div>
            {/* content */}
            <div style={{ flex: 1, padding: "6px 7px", display: "flex", flexDirection: "column", gap: 5, minHeight: 0 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {line("42%", 4, c.accent)}
                {line("24%", 2.5, c.dim)}
              </div>
              <div style={{ height: "38%", display: "flex", gap: 5 }}>
                {[1, 1.5].map((g, i) => (
                  <div key={i} style={{ flex: g, minWidth: 0, borderRadius: 3, background: c.surface3, border: `1px solid ${c.hairline}`, boxShadow: c.tileShadow, padding: 4, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    {line(i === 1 ? "32%" : "46%", 2, c.dim)}
                    {i === 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {line("62%", 4, c.dim)}
                        {line("38%", 2, c.dim)}
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 1.5, height: 10 }}>
                        {[0.45, 0.7, 0.5, 0.85, 0.6, 0.78, 0.55].map((h, bi) => (
                          <div key={bi} style={{ width: 2, height: `${h * 100}%`, borderRadius: 0.5, background: c.dim }} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, opacity: 0.42 }}>
                {[0.9, 0.62, 0.78].map((w, i) => (
                  <div key={i} style={{ width: `${w * 100}%`, height: 2.5, borderRadius: 2, background: c.dim }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <span
        className="text-[13px]"
        style={{ color: selected ? "var(--text-primary)" : "var(--text-muted)", fontWeight: selected ? 600 : 500 }}
      >
        {t.label}
      </span>
    </button>
  );
}

/* One accent swatch — a mini UI tinted with the accent hex. */
function AccentSwatch({
  a, selected, onSelect,
}: {
  a: (typeof ACCENTS)[number]; selected: boolean; onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="flex flex-col items-center gap-2 rounded-xl p-3 transition-transform hover:-translate-y-0.5"
      style={{
        background: "var(--alpha-4)",
        border: selected ? "2px solid var(--alltra-brand)" : "1px solid var(--border-3)",
      }}
    >
      <div
        style={{
          width: "100%", aspectRatio: "16 / 10", background: "var(--alpha-6)",
          borderRadius: 8, padding: 8, display: "flex", flexDirection: "column", gap: 4,
        }}
      >
        <div style={{ display: "flex", gap: 3, marginBottom: 2 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--text-tertiary)", opacity: 0.4 }} />
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: a.hex, flexShrink: 0 }} />
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: a.hex, opacity: 0.85 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: a.hex, opacity: 0.55, flexShrink: 0 }} />
          <div style={{ width: "50%", height: 3, borderRadius: 2, background: "var(--text-tertiary)", opacity: 0.3 }} />
        </div>
      </div>
      <span
        className="text-[12px]"
        style={{ color: selected ? "var(--text-primary)" : "var(--text-muted)", fontWeight: selected ? 600 : 500 }}
      >
        {a.label}
      </span>
    </button>
  );
}

export function AppearancePanel({
  open, onClose, theme, accent, onSelectTheme, onSelectAccent,
}: {
  open: boolean;
  onClose: () => void;
  theme: ThemeName;
  accent: AccentName;
  onSelectTheme: (t: ThemeName) => void;
  onSelectAccent: (a: AccentName) => void;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
  }, [open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[640]" style={{ fontFamily: "var(--font-geist-sans)" }}>
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
        style={{ opacity: shown ? 1 : 0, transition: "opacity 0.25s ease" }}
      />
      <aside
        className="absolute right-0 top-0 flex h-full w-full max-w-[520px] flex-col border-l border-border bg-elevated shadow-lg"
        style={{
          transform: shown ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.28s cubic-bezier(0.22,0.61,0.36,1)",
        }}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-5">
            <span className="text-[15px] font-semibold tracking-tight text-text-muted">Profile</span>
            <span className="relative text-[15px] font-semibold tracking-tight text-text">
              Appearance
              <span className="absolute -bottom-[17px] left-0 h-0.5 w-full rounded-full bg-[var(--alltra-brand)]" />
            </span>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-text-muted transition-colors hover:bg-[var(--hover-overlay)] hover:text-text"
          >
            <X size={18} />
          </button>
        </div>

        {/* body */}
        <div className="hide-scrollbar flex-1 overflow-y-auto p-6">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-4 text-[14px] font-semibold text-text">Appearance</h3>
            <div className="grid grid-cols-3 gap-4">
              {THEMES.map((t) => (
                <ThemeCard
                  key={t.id}
                  t={t}
                  selected={theme === t.id}
                  onSelect={() => onSelectTheme(t.id)}
                />
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-4 text-[14px] font-semibold text-text">Interface Accent Colors</h3>
            <div className="grid grid-cols-4 gap-3">
              {ACCENTS.map((a) => (
                <AccentSwatch
                  key={a.name}
                  a={a}
                  selected={accent === a.name}
                  onSelect={() => onSelectAccent(a.name)}
                />
              ))}
            </div>
          </section>

          <div className="mt-4 flex items-center gap-1.5 px-1 text-[12px] text-text-faint">
            <Check size={13} /> Theme &amp; accent are saved and applied instantly.
          </div>
        </div>
      </aside>
    </div>,
    document.body
  );
}

