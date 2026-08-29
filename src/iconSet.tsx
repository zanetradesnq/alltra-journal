/**
 * Boxed-icon set for the "Icons" tab — a curated list of lucide icons that get
 * rendered inside a soft colored rounded box (like the Alltra entry badge).
 * Shared by the picker and the icon node view.
 */
import {
  Home,
  Star,
  Heart,
  Flag,
  Bell,
  Bookmark,
  Calendar,
  CheckCircle2,
  Target,
  Zap,
  Flame,
  Lightbulb,
  Rocket,
  Trophy,
  Coffee,
  Music,
  Camera,
  MapPin,
  Tag,
  Folder,
  Clock,
  Sparkles,
  ThumbsUp,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

export const ICON_SET: Record<string, LucideIcon> = {
  home: Home,
  star: Star,
  heart: Heart,
  flag: Flag,
  bell: Bell,
  bookmark: Bookmark,
  calendar: Calendar,
  check: CheckCircle2,
  target: Target,
  zap: Zap,
  flame: Flame,
  bulb: Lightbulb,
  rocket: Rocket,
  trophy: Trophy,
  coffee: Coffee,
  music: Music,
  camera: Camera,
  pin: MapPin,
  tag: Tag,
  folder: Folder,
  clock: Clock,
  sparkles: Sparkles,
  thumbsup: ThumbsUp,
  alert: AlertTriangle,
};

export const ICON_NAMES = Object.keys(ICON_SET);

export interface IconColor {
  key: string;
  bg: string;
  fg: string;
}
export const ICON_COLORS: IconColor[] = [
  { key: "orange", bg: "rgba(249,115,22,0.16)", fg: "#d9730d" },
  { key: "blue", bg: "rgba(0,102,255,0.14)", fg: "#0066ff" },
  { key: "green", bg: "rgba(34,197,94,0.16)", fg: "#16a34a" },
  { key: "purple", bg: "rgba(139,92,246,0.16)", fg: "#7c3aed" },
  { key: "pink", bg: "rgba(236,72,153,0.16)", fg: "#db2777" },
  { key: "amber", bg: "rgba(234,179,8,0.18)", fg: "#ca8a04" },
  { key: "red", bg: "rgba(239,68,68,0.16)", fg: "#dc2626" },
  { key: "gray", bg: "rgba(120,120,120,0.14)", fg: "#6b6b73" },
];

export const iconColor = (key: string | null | undefined): IconColor =>
  ICON_COLORS.find((c) => c.key === key) ?? ICON_COLORS[0];
