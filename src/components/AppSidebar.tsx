import React, { useState, useRef } from "react";
import { IconTooltip } from "./IconTooltip";
import { useAppearance } from "../hooks/useAppearance";
import { OPTIMIZER_ENABLED } from "../config/featureLocks";

export const APP_SIDEBAR_WIDTH = 64;

const TRACKER_PATHS = {
  p1: "M0 2.80329V8.36894H5.60066V13.9696H11.2013V5.59441V2.80329H8.40914H0Z",
  p2: "M8.4075 0.000786317L11.1766 2.76933L14 5.59224V0.000786317H8.4075Z",
};

const OPTIMIZER_PATHS = {
  p1: "M6.9358 0.758937V7.52394C6.9358 7.77144 6.8158 7.99644 6.6133 8.13894L1.2058 11.9264C0.7633 12.2339 0.1333 11.9939 0.0357999 11.4614C-0.0767001 10.8164 0.0733 10.0589 0.5233 9.24144L2.8633 5.03394L5.0683 1.06644C5.2408 0.758937 5.4283 0.488937 5.6233 0.256437C6.0733 -0.268563 6.9358 0.0689371 6.9358 0.758937Z",
  p2: "M13.7925 11.9264L8.385 8.13894C8.1825 7.99644 8.0625 7.77144 8.0625 7.52394V0.758937C8.0625 0.0689371 8.925 -0.268563 9.375 0.256437C9.57 0.488937 9.7575 0.758937 9.93 1.06644L12.135 5.03394L14.475 9.24144C14.925 10.0589 15.075 10.8164 14.9625 11.4614C14.865 11.9939 14.235 12.2339 13.7925 11.9264Z",
  p3: "M2.44074 12.1948L7.05324 9.11984C7.30074 8.95484 7.70574 8.95484 7.95324 9.11984L12.5657 12.1948C13.7882 13.0123 13.5857 13.6798 12.1157 13.6798H2.88324C1.42074 13.6723 1.21824 13.0048 2.44074 12.1948Z",
};

function TrackerIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 13.9988 13.971" fill="none" style={{ display: "block" }}>
      <path d={TRACKER_PATHS.p1} fill="url(#tr_g0)" />
      <path d={TRACKER_PATHS.p2} fill="url(#tr_g1)" />
      <defs>
        <linearGradient id="tr_g0" gradientUnits="userSpaceOnUse" x1="11.0949" x2="0.113718" y1="2.80329" y2="13.9768">
          <stop stopColor="#990000" /><stop offset="1" stopColor="#FF3B3B" />
        </linearGradient>
        <linearGradient id="tr_g1" gradientUnits="userSpaceOnUse" x1="13.9469" x2="8.44786" y1="0.000785887" y2="5.57966">
          <stop stopColor="#990000" /><stop offset="1" stopColor="#FF3B3B" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function OptimizerIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14.9983 13.6798" fill="none" style={{ display: "block" }}>
      <path d={OPTIMIZER_PATHS.p1} fill="url(#op_g0)" />
      <path d={OPTIMIZER_PATHS.p2} fill="url(#op_g1)" />
      <path d={OPTIMIZER_PATHS.p3} fill="url(#op_g2)" />
      <defs>
        <linearGradient id="op_g0" gradientUnits="userSpaceOnUse" x1="3.4679" x2="3.4679" y1="0" y2="12.0623">
          <stop stopColor="#FFB020" /><stop offset="1" stopColor="#E06500" />
        </linearGradient>
        <linearGradient id="op_g1" gradientUnits="userSpaceOnUse" x1="11.5304" x2="11.5304" y1="0" y2="12.0623">
          <stop stopColor="#FFB020" /><stop offset="1" stopColor="#E06500" />
        </linearGradient>
        <linearGradient id="op_g2" gradientUnits="userSpaceOnUse" x1="7.50292" x2="7.50292" y1="8.99609" y2="13.6798">
          <stop stopColor="#FFB020" /><stop offset="1" stopColor="#E06500" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function ResourcesIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 17" fill="none" style={{ display: "block" }}>
      <path d="M7 0C7 0 14 6.443 14 10.2C14 12.0035 13.2625 13.7331 11.9497 15.0083C10.637 16.2836 8.85652 17 7 17C5.14348 17 3.36301 16.2836 2.05025 15.0083C0.737498 13.7331 0 12.0035 0 10.2C0 8.925 0.79625 7.3525 1.855 5.8225C2.03213 6.41248 2.42263 6.92048 2.95466 7.25301C3.48669 7.58555 4.12444 7.72024 4.75058 7.63232C5.37671 7.54439 5.94909 7.23976 6.36239 6.77447C6.7757 6.30919 7.00212 5.71456 7 5.1V0ZM5.25 0C4.55381 0 3.88613 0.26866 3.39384 0.746878C2.90156 1.2251 2.625 1.8737 2.625 2.55C2.625 3.2263 2.90156 3.8749 3.39384 4.35312C3.88613 4.83134 4.55381 5.1 5.25 5.1V0Z" fill="url(#res_g0)" />
      <defs>
        <linearGradient id="res_g0" x1="7" y1="0" x2="7" y2="17" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34D399" /><stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function AIPanelIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: "block" }}>
      <path d="M12.4444 0C11.8364 2.19733 11.0533 2.948 8.88889 3.55556C11.0533 4.16311 11.8364 4.91378 12.4444 7.11111C13.0524 4.91378 13.8356 4.16311 16 3.55556C13.8356 2.948 13.0524 2.19733 12.4444 0ZM6.22222 3.55556C5.15778 7.40044 3.78844 8.71467 0 9.77778C3.78844 10.8409 5.15778 12.1551 6.22222 16C7.28667 12.1551 8.656 10.8409 12.4444 9.77778C8.656 8.71467 7.28667 7.40044 6.22222 3.55556Z" fill="url(#ai_g0)" />
      <defs>
        <linearGradient id="ai_g0" x1="8" y1="0" x2="8" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A855F7" /><stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function AffiliateIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: "block" }}>
      <line x1="5.85" y1="9.05" x2="10.15" y2="11.95" stroke="url(#aff_g0)" strokeWidth="1.7" strokeLinecap="round" />
      <line x1="10.15" y1="4.05" x2="5.85" y2="6.95" stroke="url(#aff_g0)" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="3" r="2.6" fill="url(#aff_g0)" />
      <circle cx="12" cy="13" r="2.6" fill="url(#aff_g0)" />
      <circle cx="4" cy="8" r="2.6" fill="url(#aff_g0)" />
      <defs>
        <linearGradient id="aff_g0" x1="8" y1="0" x2="8" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3B9EFF" /><stop offset="1" stopColor="#0066FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const APPS = [
  { id: "tracker" as const, label: "Tracker", icon: (s: number) => <TrackerIcon size={s} /> },
  { id: "ai-panel" as const, label: "Alltra Intelligence", icon: (s: number) => <AIPanelIcon size={s} /> },
  { id: "affiliate" as const, label: "Affiliate", icon: (s: number) => <AffiliateIcon size={s} /> },
  { id: "optimizer" as const, label: "Optimizer", icon: (s: number) => <OptimizerIcon size={s} />, comingSoon: !OPTIMIZER_ENABLED },
  { id: "resources" as const, label: "Resources", icon: (s: number) => <ResourcesIcon size={s} />, comingSoon: true },
];

interface AppSidebarProps {
  currentApp: string;
  onSwitchApp: (app: string) => void;
  mobileOpen?: boolean;
}

export function AppSidebar({ currentApp, onSwitchApp, mobileOpen = false }: AppSidebarProps) {
  const appearance = useAppearance();
  const [hovered, setHovered] = useState<string | null>(null);
  const appRefs = useRef<Record<string, React.RefObject<HTMLButtonElement>>>({
    tracker: React.createRef<HTMLButtonElement>(),
    "ai-panel": React.createRef<HTMLButtonElement>(),
    affiliate: React.createRef<HTMLButtonElement>(),
    optimizer: React.createRef<HTMLButtonElement>(),
    resources: React.createRef<HTMLButtonElement>(),
  });

  const visibleApps = APPS;

  const iconBtn = (active: boolean, isHov: boolean): React.CSSProperties => ({
    width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
    borderRadius: 10,
    border: active ? (appearance === "light" ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(255,255,255,0.1)") : "none",
    cursor: "pointer",
    backgroundColor: active ? "var(--hover-overlay-medium)" : isHov ? "var(--hover-overlay-medium)" : "var(--hover-overlay)",
    boxShadow: "none", transition: "background-color 0ms",
    position: "relative", overflow: "hidden", color: "var(--text-primary)",
  });

  return (
    <div style={{
      position: "fixed", left: 0, top: 0, bottom: 0,
      width: APP_SIDEBAR_WIDTH,
      backgroundColor: "var(--surface-2)",
      borderRight: "1px solid var(--border-2)",
      zIndex: mobileOpen ? 1005 : 140, display: "flex", flexDirection: "column",
      alignItems: "center", paddingTop: 14, gap: 10,
    }}>
      {visibleApps.map((app) => {
        const ref = appRefs.current[app.id];
        const isActive = currentApp === app.id;
        const isHov = hovered === app.id;
        return (
          <div key={app.id} style={{ position: "relative", marginBottom: app.comingSoon ? 4 : 0 }}>
            {app.comingSoon && (
              <span style={{
                position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)",
                fontSize: 6.5, fontFamily: "var(--font-geist-sans)", fontWeight: 600,
                letterSpacing: "0.04em", color: "var(--text-tertiary)",
                whiteSpace: "nowrap", pointerEvents: "none", lineHeight: 1, opacity: 0.7, zIndex: 2,
              }}>
                Soon
              </span>
            )}
            <button
              ref={ref as React.RefObject<HTMLButtonElement>}
              onClick={() => { if (!app.comingSoon) onSwitchApp(app.id); }}
              onMouseEnter={() => setHovered(app.id)}
              onMouseLeave={() => setHovered(null)}
              title={app.comingSoon ? `${app.label} — Coming Soon` : app.label}
              style={{ ...iconBtn(isActive, !app.comingSoon && isHov), ...(app.comingSoon ? { cursor: "default", opacity: 0.35 } : {}) }}
            >
              <span style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: isActive ? 1 : 0.5,
                filter: isActive ? "none" : (appearance === "light" ? "grayscale(100%) brightness(0)" : "grayscale(100%) brightness(10)"),
                transition: "opacity 0.2s ease, filter 0.2s ease",
              }}>
                {app.icon(isActive ? 16 : 18)}
              </span>
            </button>
            <IconTooltip label={app.comingSoon ? `${app.label} · Coming Soon` : app.label} isVisible={isHov} position="right" offset={8} buttonRef={ref as React.RefObject<HTMLElement>} />
          </div>
        );
      })}
      <div style={{ height: 12, flexShrink: 0 }} />
    </div>
  );
}
