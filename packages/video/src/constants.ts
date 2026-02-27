export const FPS = 30;

// Transition duration between slides (frames)
export const TRANSITION_FRAMES = 15;

// Slide durations in frames
export const INTRO_DURATION = 3 * FPS;       // 90
export const SUMMARY_DURATION = 4 * FPS;     // 120
export const INDICATOR_DURATION = 5 * FPS;   // 150
export const SUGGESTIONS_DURATION = 4 * FPS; // 120
export const OUTRO_DURATION = 3 * FPS;       // 90

// Video dimensions (9:16 portrait for mobile)
export const COMP_WIDTH = 1080;
export const COMP_HEIGHT = 1920;

// Color palette (health/medical theme)
export const COLORS = {
  bgTop: "#EFF6FF",       // blue-50
  bgBottom: "#F0FDF4",    // green-50
  primary: "#0284C7",     // sky-600
  primaryLight: "#E0F2FE", // sky-100
  normal: "#16A34A",      // green-600
  normalBg: "#DCFCE7",    // green-100
  high: "#DC2626",        // red-600
  highBg: "#FEE2E2",      // red-100
  low: "#D97706",         // amber-600
  lowBg: "#FEF3C7",       // amber-100
  dark: "#0F172A",        // slate-900
  mid: "#334155",         // slate-700
  muted: "#64748B",       // slate-500
  white: "#FFFFFF",
  cardBg: "rgba(255, 255, 255, 0.92)",
} as const;

// Font family – CJK fallback chain
export const FONT_FAMILY =
  "'PingFang SC', 'Hiragino Sans GB', 'Noto Sans SC', 'Microsoft YaHei', sans-serif";

export const REPORT_TYPE_LABELS: Record<string, string> = {
  BLOOD_ROUTINE: "血常规",
  BIOCHEMISTRY: "生化检查",
  PHYSICAL_EXAM: "体检总报告",
};

export const STATUS_LABELS: Record<string, string> = {
  normal: "正常",
  high: "偏高",
  low: "偏低",
};
