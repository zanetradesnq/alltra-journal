/**
 * One day cell in the journal calendar — ported from the Alltra design.
 * Journal-only: consumes hasJournal / qualityScore / journalPreview / wordCount.
 * Journaled days get a green-tinted tile (intensity scales with quality, if any)
 * + a "Journaled" check, an optional quality bar (/7), word count, and a
 * viewport-safe hover tooltip. No trade coupling.
 */
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";

interface JournalDayTileProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasJournal: boolean;
  qualityScore?: number;
  journalPreview?: string;
  wordCount?: number;
  metricColor?: string;
  metricAlpha?: (alpha: number) => string;
  onClick: () => void;
}

function normalizeQuality(raw?: number): number | undefined {
  if (raw == null) return undefined;
  if (raw <= 7) return Math.round((raw / 7) * 10); // 0–7 checklist → 0–10
  if (raw > 10) return Math.round(raw / 10); // legacy 0–100
  return Math.round(raw);
}

function getJournalIntensity(
  _quality: number | undefined,
  hasJournal: boolean,
  metricColor?: string,
  metricAlpha?: (alpha: number) => string
): { bg: string; bgHover: string; dotColor: string } {
  if (!hasJournal || !metricAlpha || !metricColor) {
    return {
      bg: "var(--alpha-4)",
      bgHover: "var(--alpha-6)",
      dotColor: "transparent",
    };
  }
  // uniform faint blue wash; check / bar / label stay vivid brand blue
  return { bg: metricAlpha(0.05), bgHover: metricAlpha(0.1), dotColor: metricColor };
}

export function JournalCalendarDayTile({
  date,
  isCurrentMonth,
  isToday,
  isSelected,
  hasJournal,
  qualityScore,
  journalPreview,
  wordCount,
  metricColor,
  metricAlpha,
  onClick,
}: JournalDayTileProps) {
  const [hovered, setHovered] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<CSSProperties | null>(null);
  const tileRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const rawScore = qualityScore;
  const q10 = normalizeQuality(qualityScore);
  const intensity = getJournalIntensity(q10, hasJournal, metricColor, metricAlpha);

  const opacity = isCurrentMonth ? 1 : 0.3;
  const tileBg = hovered ? intensity.bgHover : intensity.bg;
  const todayBorder = isToday
    ? `1px solid ${hasJournal ? intensity.dotColor : "var(--alpha-15)"}`
    : isSelected
    ? "1px solid var(--alpha-12)"
    : "1px solid transparent";

  useLayoutEffect(() => {
    if (!hovered || !isCurrentMonth || !tileRef.current || !tooltipRef.current) {
      setTooltipStyle(null);
      return;
    }
    const tile = tileRef.current.getBoundingClientRect();
    const tt = tooltipRef.current.getBoundingClientRect();
    const gap = 8;
    let top =
      tile.top - gap - tt.height > 0
        ? tile.top - gap - tt.height
        : tile.bottom + gap;
    let left = tile.left + tile.width / 2 - tt.width / 2;
    if (left < 8) left = 8;
    if (left + tt.width > window.innerWidth - 8)
      left = window.innerWidth - 8 - tt.width;
    if (top < 8) top = 8;
    if (top + tt.height > window.innerHeight - 8)
      top = window.innerHeight - 8 - tt.height;
    setTooltipStyle({ left, top, transform: "none" });
  }, [hovered, isCurrentMonth]);

  const onEnter = useCallback(() => setHovered(true), []);
  const onLeave = useCallback(() => {
    setHovered(false);
    setTooltipStyle(null);
  }, []);

  return (
    <>
      <button
        type="button"
        ref={tileRef}
        onClick={onClick}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        style={{
          background: tileBg,
          border: todayBorder,
          borderRadius: 10,
          padding: 8,
          height: "100%",
          minHeight: 0,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          textAlign: "left",
          gap: 4,
          cursor: "pointer",
          transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
          opacity,
          position: "relative",
          overflow: "hidden",
          userSelect: "none",
          fontFamily: "var(--font-geist-sans)",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: isToday ? 600 : 500,
            color: isToday
              ? hasJournal
                ? intensity.dotColor
                : "var(--text-primary)"
              : "var(--text-secondary)",
            letterSpacing: "-0.01em",
            marginBottom: 2,
          }}
        >
          {date.getDate()}
        </div>

        {hasJournal && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  background: intensity.dotColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Check size={10} color="white" strokeWidth={2.5} />
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: intensity.dotColor,
                  letterSpacing: "-0.01em",
                  whiteSpace: "nowrap",
                }}
              >
                Journaled
              </span>
            </div>

            <div
              style={{
                marginTop: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 3,
                width: "100%",
              }}
            >
              {q10 != null && q10 > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div
                    style={{
                      flex: 1,
                      height: 3,
                      borderRadius: 2,
                      background: "var(--alpha-6)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${String(((rawScore ?? 0) / 7) * 100)}%`,
                        height: "100%",
                        borderRadius: 2,
                        background: intensity.dotColor,
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 500, color: "var(--text-tertiary)", opacity: 0.6 }}>
                    {rawScore ?? 0}/7
                  </span>
                </div>
              )}
              {wordCount != null && wordCount > 0 && (
                <span style={{ fontSize: 9, fontWeight: 400, color: "var(--text-tertiary)", opacity: 0.55 }}>
                  {wordCount} words
                </span>
              )}
            </div>
          </>
        )}
      </button>

      {hovered &&
        isCurrentMonth &&
        createPortal(
          <div
            ref={tooltipRef}
            style={{
              position: "fixed",
              left: tooltipStyle?.left ?? -9999,
              top: tooltipStyle?.top ?? -9999,
              transform: tooltipStyle?.transform ?? "none",
              background: "var(--surface-3)",
              border: "1px solid var(--border-3)",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 11,
              color: "var(--text-primary)",
              whiteSpace: "nowrap",
              boxShadow: "var(--shadow-lg)",
              zIndex: 99999,
              pointerEvents: "none",
              display: "flex",
              flexDirection: "column",
              gap: 3,
              opacity: tooltipStyle ? 1 : 0,
              transition: "opacity 0.1s ease",
              fontFamily: "var(--font-geist-sans)",
              maxWidth: 240,
            }}
          >
            <span style={{ fontWeight: 500, whiteSpace: "normal" }}>
              {hasJournal ? "✓ Journal entry" : "No entry"}
            </span>
            {hasJournal && journalPreview ? (
              <span
                style={{
                  color: "var(--text-secondary)",
                  fontSize: 10,
                  whiteSpace: "normal",
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {journalPreview.slice(0, 90)}
              </span>
            ) : null}
            {hasJournal && wordCount != null && wordCount > 0 && (
              <span style={{ color: "var(--text-tertiary)", fontSize: 10 }}>
                {wordCount} words
              </span>
            )}
            {!hasJournal && (
              <span style={{ color: "var(--text-tertiary)", fontSize: 10 }}>
                Click to start writing
              </span>
            )}
          </div>,
          document.body
        )}
    </>
  );
}

export default JournalCalendarDayTile;
