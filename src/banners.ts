/**
 * Profile-banner gradients (Alltra "ALLTRA BANNERS" palette) — completely
 * independent from the interface theme colors. Each banner has a dark + light
 * gradient variant, an accent color, and an optional metallic shimmer flag.
 * Selected by index (0–17), stored on the banner node.
 */
export interface BannerStyle {
  name: string;
  dark: string;
  light: string;
  accent: string;
  metallic?: boolean;
}

export const BANNERS: BannerStyle[] = [
  {
    name: "Alltra",
    accent: "rgba(0,102,255,0.4)",
    dark: "radial-gradient(ellipse at 25% 20%, rgba(58,141,255,0.5) 0%, transparent 55%), radial-gradient(ellipse at 75% 85%, rgba(0,47,120,0.6) 0%, transparent 50%), linear-gradient(135deg, #001F5C 0%, #0047B3 25%, #0066FF 50%, #3A8DFF 75%, #7AB8FF 100%)",
    light: "radial-gradient(ellipse at 25% 20%, rgba(58,141,255,0.4) 0%, transparent 55%), radial-gradient(ellipse at 75% 85%, rgba(0,82,204,0.3) 0%, transparent 50%), linear-gradient(135deg, #3385FF 0%, #0066FF 40%, #3A8DFF 70%, #7AB8FF 100%)",
  },
  {
    name: "Sky",
    accent: "rgba(14,165,233,0.4)",
    dark: "radial-gradient(ellipse at 65% 15%, rgba(125,211,252,0.45) 0%, transparent 50%), radial-gradient(ellipse at 20% 90%, rgba(3,105,161,0.5) 0%, transparent 55%), linear-gradient(150deg, #023E6B 0%, #0369A1 25%, #38BDF8 55%, #7DD3FC 80%, #BAE6FD 100%)",
    light: "radial-gradient(ellipse at 65% 15%, rgba(125,211,252,0.35) 0%, transparent 50%), linear-gradient(150deg, #38BDF8 0%, #0EA5E9 40%, #7DD3FC 75%, #BAE6FD 100%)",
  },
  {
    name: "Teal",
    accent: "rgba(20,184,166,0.4)",
    dark: "radial-gradient(ellipse at 35% 15%, rgba(94,234,212,0.4) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(17,94,89,0.6) 0%, transparent 55%), linear-gradient(140deg, #0A3D38 0%, #115E59 20%, #14B8A6 50%, #5EEAD4 78%, #99F6E4 100%)",
    light: "radial-gradient(ellipse at 35% 15%, rgba(94,234,212,0.3) 0%, transparent 50%), linear-gradient(140deg, #2DD4BF 0%, #14B8A6 40%, #5EEAD4 75%, #99F6E4 100%)",
  },
  {
    name: "Green",
    accent: "rgba(34,197,94,0.4)",
    dark: "radial-gradient(ellipse at 70% 25%, rgba(134,239,172,0.4) 0%, transparent 50%), radial-gradient(ellipse at 20% 80%, rgba(22,101,52,0.6) 0%, transparent 55%), linear-gradient(145deg, #0A3622 0%, #166534 22%, #22C55E 50%, #86EFAC 78%, #BBF7D0 100%)",
    light: "radial-gradient(ellipse at 70% 25%, rgba(134,239,172,0.3) 0%, transparent 50%), linear-gradient(145deg, #4ADE80 0%, #22C55E 40%, #86EFAC 75%, #BBF7D0 100%)",
  },
  {
    name: "Lime",
    accent: "rgba(132,204,22,0.4)",
    dark: "radial-gradient(ellipse at 40% 20%, rgba(190,242,100,0.45) 0%, transparent 50%), radial-gradient(ellipse at 75% 85%, rgba(77,124,15,0.5) 0%, transparent 55%), linear-gradient(135deg, #2D5A08 0%, #4D7C0F 25%, #84CC16 50%, #BEF264 78%, #D9F99D 100%)",
    light: "radial-gradient(ellipse at 40% 20%, rgba(190,242,100,0.3) 0%, transparent 50%), linear-gradient(135deg, #A3E635 0%, #84CC16 40%, #BEF264 75%, #D9F99D 100%)",
  },
  {
    name: "Gold",
    accent: "rgba(212,160,23,0.4)",
    metallic: true,
    dark: "radial-gradient(ellipse at 30% 20%, rgba(253,230,138,0.5) 0%, transparent 45%), radial-gradient(ellipse at 80% 75%, rgba(120,53,15,0.5) 0%, transparent 55%), linear-gradient(140deg, #713F12 0%, #A16207 20%, #CA8A04 40%, #EAB308 60%, #FDE68A 82%, #FEF9C3 100%)",
    light: "radial-gradient(ellipse at 30% 20%, rgba(253,230,138,0.4) 0%, transparent 45%), linear-gradient(140deg, #EAB308 0%, #CA8A04 35%, #FDE68A 70%, #FEF9C3 100%)",
  },
  {
    name: "Orange",
    accent: "rgba(249,115,22,0.4)",
    dark: "radial-gradient(ellipse at 75% 20%, rgba(253,186,116,0.45) 0%, transparent 50%), radial-gradient(ellipse at 15% 85%, rgba(154,52,18,0.5) 0%, transparent 55%), linear-gradient(135deg, #7C2D12 0%, #C2410C 22%, #F97316 50%, #FDBA74 78%, #FED7AA 100%)",
    light: "radial-gradient(ellipse at 75% 20%, rgba(253,186,116,0.3) 0%, transparent 50%), linear-gradient(135deg, #FB923C 0%, #F97316 40%, #FDBA74 75%, #FED7AA 100%)",
  },
  {
    name: "Red",
    accent: "rgba(239,68,68,0.4)",
    dark: "radial-gradient(ellipse at 45% 20%, rgba(252,165,165,0.4) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(127,29,29,0.55) 0%, transparent 55%), linear-gradient(140deg, #640A0A 0%, #991B1B 22%, #EF4444 50%, #FCA5A5 78%, #FEE2E2 100%)",
    light: "radial-gradient(ellipse at 45% 20%, rgba(252,165,165,0.3) 0%, transparent 50%), linear-gradient(140deg, #F87171 0%, #EF4444 40%, #FCA5A5 75%, #FEE2E2 100%)",
  },
  {
    name: "Rose",
    accent: "rgba(244,63,94,0.4)",
    dark: "radial-gradient(ellipse at 20% 70%, rgba(251,113,133,0.45) 0%, transparent 50%), radial-gradient(ellipse at 85% 25%, rgba(136,19,55,0.5) 0%, transparent 55%), linear-gradient(145deg, #4C0519 0%, #881337 22%, #E11D48 48%, #FB7185 75%, #FECDD3 100%)",
    light: "radial-gradient(ellipse at 20% 70%, rgba(251,113,133,0.3) 0%, transparent 50%), linear-gradient(145deg, #FB7185 0%, #F43F5E 40%, #FDA4AF 75%, #FECDD3 100%)",
  },
  {
    name: "Pink",
    accent: "rgba(236,72,153,0.4)",
    dark: "radial-gradient(ellipse at 65% 20%, rgba(244,114,182,0.45) 0%, transparent 50%), radial-gradient(ellipse at 25% 85%, rgba(157,23,77,0.5) 0%, transparent 55%), linear-gradient(135deg, #500724 0%, #9D174D 22%, #EC4899 50%, #F472B6 75%, #FBCFE8 100%)",
    light: "radial-gradient(ellipse at 65% 20%, rgba(244,114,182,0.3) 0%, transparent 50%), linear-gradient(135deg, #F472B6 0%, #EC4899 40%, #F9A8D4 75%, #FBCFE8 100%)",
  },
  {
    name: "Purple",
    accent: "rgba(168,85,247,0.4)",
    dark: "radial-gradient(ellipse at 25% 65%, rgba(192,132,252,0.45) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(88,28,135,0.55) 0%, transparent 55%), linear-gradient(140deg, #3B0764 0%, #6D28D9 25%, #A855F7 50%, #C084FC 75%, #E9D5FF 100%)",
    light: "radial-gradient(ellipse at 25% 65%, rgba(192,132,252,0.3) 0%, transparent 50%), linear-gradient(140deg, #C084FC 0%, #A855F7 40%, #D8B4FE 75%, #E9D5FF 100%)",
  },
  {
    name: "Ruby",
    accent: "rgba(190,18,60,0.4)",
    dark: "radial-gradient(ellipse at 50% 15%, rgba(255,107,107,0.5) 0%, transparent 50%), radial-gradient(ellipse at 25% 85%, rgba(80,7,20,0.6) 0%, transparent 55%), linear-gradient(135deg, #500714 0%, #7A0C1F 20%, #C1121F 42%, #FF3C3C 65%, #FF6B6B 85%, #FFB3B3 100%)",
    light: "radial-gradient(ellipse at 50% 15%, rgba(255,107,107,0.35) 0%, transparent 50%), linear-gradient(135deg, #E11D48 0%, #C1121F 35%, #FF3C3C 65%, #FF6B6B 85%, #FFB3B3 100%)",
  },
  {
    name: "Onyx",
    accent: "rgba(60,60,60,0.3)",
    dark: "linear-gradient(135deg, #111111 0%, #1C1C1C 30%, #2A2A2A 55%, #1C1C1C 80%, #111111 100%)",
    light: "linear-gradient(135deg, #1E1E1E 0%, #2E2E2E 35%, #3D3D3D 60%, #2E2E2E 85%, #1E1E1E 100%)",
  },
  {
    name: "Indigo",
    accent: "rgba(67,56,202,0.4)",
    dark: "radial-gradient(ellipse at 80% 15%, rgba(139,92,246,0.45) 0%, transparent 50%), radial-gradient(ellipse at 15% 85%, rgba(49,46,129,0.55) 0%, transparent 55%), linear-gradient(135deg, #1E1B4B 0%, #3730A3 25%, #6366F1 50%, #8B5CF6 75%, #C4B5FD 100%)",
    light: "radial-gradient(ellipse at 80% 15%, rgba(139,92,246,0.3) 0%, transparent 50%), linear-gradient(135deg, #6366F1 0%, #4338CA 35%, #8B5CF6 70%, #C4B5FD 100%)",
  },
  {
    name: "Platinum",
    accent: "rgba(113,113,122,0.5)",
    metallic: true,
    dark: "radial-gradient(ellipse at 35% 25%, rgba(255,255,255,0.2) 0%, transparent 50%), radial-gradient(ellipse at 75% 80%, rgba(30,30,30,0.5) 0%, transparent 55%), linear-gradient(140deg, #18181B 0%, #3F3F46 22%, #71717A 48%, #A1A1AA 72%, #D4D4D8 90%, #E4E4E7 100%)",
    light: "radial-gradient(ellipse at 35% 25%, rgba(255,255,255,0.25) 0%, transparent 50%), linear-gradient(140deg, #A1A1AA 0%, #71717A 35%, #D4D4D8 70%, #E4E4E7 100%)",
  },
  {
    name: "Aurora",
    accent: "rgba(52,211,153,0.4)",
    dark: "radial-gradient(ellipse at 15% 30%, rgba(56,189,248,0.45) 0%, transparent 45%), radial-gradient(ellipse at 50% 70%, rgba(52,211,153,0.4) 0%, transparent 45%), radial-gradient(ellipse at 85% 25%, rgba(168,85,247,0.4) 0%, transparent 45%), linear-gradient(135deg, #0C4A6E 0%, #0EA5E9 20%, #34D399 45%, #A855F7 75%, #7C3AED 100%)",
    light: "radial-gradient(ellipse at 15% 30%, rgba(56,189,248,0.3) 0%, transparent 45%), radial-gradient(ellipse at 50% 70%, rgba(52,211,153,0.25) 0%, transparent 45%), linear-gradient(135deg, #38BDF8 0%, #34D399 40%, #A855F7 75%, #7C3AED 100%)",
  },
  {
    name: "Ember",
    accent: "rgba(249,115,22,0.45)",
    dark: "radial-gradient(ellipse at 50% 80%, rgba(251,191,36,0.5) 0%, transparent 45%), radial-gradient(ellipse at 30% 20%, rgba(220,38,38,0.45) 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, rgba(124,45,18,0.5) 0%, transparent 50%), linear-gradient(160deg, #450A0A 0%, #991B1B 20%, #DC2626 40%, #F97316 65%, #FBBF24 88%, #FDE68A 100%)",
    light: "radial-gradient(ellipse at 50% 80%, rgba(251,191,36,0.35) 0%, transparent 45%), radial-gradient(ellipse at 30% 20%, rgba(220,38,38,0.3) 0%, transparent 50%), linear-gradient(160deg, #EF4444 0%, #F97316 40%, #FBBF24 75%, #FDE68A 100%)",
  },
  {
    name: "Midnight",
    accent: "rgba(30,58,138,0.45)",
    dark: "radial-gradient(ellipse at 60% 20%, rgba(30,58,138,0.6) 0%, transparent 50%), radial-gradient(ellipse at 25% 80%, rgba(8,145,178,0.3) 0%, transparent 50%), radial-gradient(ellipse at 85% 75%, rgba(15,23,42,0.5) 0%, transparent 50%), linear-gradient(145deg, #020617 0%, #0F172A 20%, #1E3A8A 48%, #1E40AF 65%, #0891B2 90%, #22D3EE 100%)",
    light: "radial-gradient(ellipse at 60% 20%, rgba(30,58,138,0.35) 0%, transparent 50%), radial-gradient(ellipse at 25% 80%, rgba(8,145,178,0.25) 0%, transparent 50%), linear-gradient(145deg, #1E3A8A 0%, #1E40AF 35%, #0891B2 70%, #22D3EE 100%)",
  },
];
